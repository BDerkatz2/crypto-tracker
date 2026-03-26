import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const BACKEND_ROOT = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
const COINPAPRIKA_BASE_URL = 'https://api.coinpaprika.com/v1';

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const responseCache = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildCacheKey = (url, config = {}) => {
  const params = new URLSearchParams(config.params || {}).toString();
  return params ? `${url}?${params}` : url;
};

const getCachedData = (key, maxAgeMs) => {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > maxAgeMs) {
    responseCache.delete(key);
    return null;
  }
  return entry.data;
};

const setCachedData = (key, data) => {
  responseCache.set(key, {
    data,
    timestamp: Date.now(),
  });
};

const hasUsableData = (url, data) => {
  if (url.includes('/crypto/history/')) {
    return Array.isArray(data?.prices) && data.prices.length > 0;
  }

  if (url.includes('/crypto/data')) {
    if (Array.isArray(data)) return data.length > 0;
    if (Array.isArray(data?.data)) return data.data.length > 0;
  }

  return false;
};

const isRetryableError = (error) => {
  const status = error?.response?.status;
  // No response usually means transient network/DNS/wake-up issues.
  if (!error?.response) return true;
  return RETRYABLE_STATUS.has(status);
};

const getWithRetry = async (url, config = {}, attempts = 4, cacheMaxAgeMs = 0) => {
  let lastError;
  const cacheKey = buildCacheKey(url, config);

  for (let i = 1; i <= attempts; i += 1) {
    try {
      const response = await axios.get(url, config);
      if (cacheMaxAgeMs > 0 && hasUsableData(url, response.data)) {
        setCachedData(cacheKey, response.data);
      }
      return response;
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || i === attempts) {
        break;
      }

      const waitMs = Math.min(8000, 1000 * (2 ** (i - 1)));
      await sleep(waitMs);
    }
  }

  if (cacheMaxAgeMs > 0) {
    const cachedData = getCachedData(cacheKey, cacheMaxAgeMs);
    if (cachedData) {
      return { data: cachedData, fromCache: true };
    }
  }

  throw lastError;
};

const getWithRetryFromProvider = async (providerCall, attempts = 3) => {
  let lastError;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await providerCall();
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      if ((status && status < 500 && status !== 429) || i === attempts) {
        throw error;
      }
      const waitMs = Math.min(6000, 800 * (2 ** (i - 1)));
      await sleep(waitMs);
    }
  }
  throw lastError;
};

const getCachedOrFetch = async (key, maxAgeMs, fetcher) => {
  const cached = getCachedData(key, maxAgeMs);
  if (cached) {
    return cached;
  }
  const value = await fetcher();
  setCachedData(key, value);
  return value;
};

const normalizePaprikaTicker = (ticker) => ({
  id: ticker?.id,
  symbol: (ticker?.symbol || '').toUpperCase(),
  name: ticker?.name || '',
  current_price: Number(ticker?.quotes?.USD?.price || 0),
  market_cap: Number(ticker?.quotes?.USD?.market_cap || 0),
  price_change_percentage_24h: Number(ticker?.quotes?.USD?.percent_change_24h || 0),
  circulating_supply: Number(ticker?.circulating_supply || 0),
});

const searchPaprikaCurrency = async (query) => {
  const response = await getWithRetryFromProvider(() =>
    axios.get(`${COINPAPRIKA_BASE_URL}/search`, {
      params: { q: query, c: 'currencies', limit: 10 },
      timeout: 25000,
    })
  );
  const currencies = response.data?.currencies || [];
  return currencies.map((coin) => ({
    id: coin.id,
    name: coin.name,
    symbol: (coin.symbol || '').toUpperCase(),
  }));
};

const resolvePaprikaId = async (rawId) => {
  if (!rawId) return null;
  const directId = String(rawId).toLowerCase();
  try {
    await axios.get(`${COINPAPRIKA_BASE_URL}/tickers/${directId}`, { timeout: 12000 });
    return directId;
  } catch (_error) {
    // Fallback: try search using cleaned string.
  }

  const searchQuery = directId.replace(/-\d+$/, '').replace(/-/g, ' ');
  const candidates = await searchPaprikaCurrency(searchQuery);
  if (!candidates.length) return null;
  const exact = candidates.find((c) => c.id === directId || c.id === directId.replace(/-\d+$/, ''));
  return (exact || candidates[0]).id;
};

const fetchPaprikaTicker = async (id) => {
  const resolvedId = await resolvePaprikaId(id);
  if (!resolvedId) return null;
  const tickerResponse = await getWithRetryFromProvider(() =>
    axios.get(`${COINPAPRIKA_BASE_URL}/tickers/${resolvedId}`, {
      timeout: 25000,
    })
  );
  const ticker = tickerResponse.data;
  if (!ticker?.id) return null;
  return normalizePaprikaTicker(ticker);
};

// Fire-and-forget health ping to wake the Render free-tier backend from sleep.
// Call this as early as possible so it's warm by the time the user picks a coin.
export const pingBackend = () =>
  axios.get(`${BACKEND_ROOT}/health`, { timeout: 60000 }).catch(() => {});

export const cryptoAPI = {
  searchCrypto: async (query) => {
    const cacheKey = `paprika:search:${(query || '').toLowerCase().trim()}`;
    const results = await getCachedOrFetch(cacheKey, 2 * 60 * 1000, () => searchPaprikaCurrency(query));
    return { data: { results, total: results.length } };
  },

  getTrending: async () => {
    const cacheKey = 'paprika:trending';
    const trending = await getCachedOrFetch(cacheKey, 2 * 60 * 1000, async () => {
      const response = await getWithRetryFromProvider(() =>
        axios.get(`${COINPAPRIKA_BASE_URL}/tickers`, {
          params: { quotes: 'USD', limit: 30 },
          timeout: 25000,
        })
      );
      const list = Array.isArray(response.data) ? response.data : [];
      const top = list
        .filter((coin) => coin?.id && coin?.name)
        .sort((a, b) => (Number(a.rank) || 999999) - (Number(b.rank) || 999999))
        .slice(0, 10)
        .map((coin) => ({
          id: coin.id,
          name: coin.name,
          symbol: (coin.symbol || '').toUpperCase(),
          market_cap_rank: Number(coin.rank) || 'N/A',
        }));
      return top;
    });
    return { data: { trending, total: trending.length } };
  },

  getCryptoData: async (ids) => {
    const idList = String(ids || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    const cacheKey = `paprika:data:${idList.sort().join(',')}`;
    const data = await getCachedOrFetch(cacheKey, 5 * 60 * 1000, async () => {
      const items = await Promise.all(idList.map((id) => fetchPaprikaTicker(id)));
      return items.filter(Boolean);
    });
    return { data: { data, total: data.length } };
  },

  getPriceHistory: async (cryptoId, days = 7) => {
    const cacheKey = `paprika:history:${cryptoId}:${days}`;
    const data = await getCachedOrFetch(cacheKey, 30 * 60 * 1000, async () => {
      const resolvedId = await resolvePaprikaId(cryptoId);
      if (!resolvedId) return { prices: [] };

      const end = new Date();
      const start = new Date(end.getTime() - Number(days || 7) * 24 * 60 * 60 * 1000);
      const response = await getWithRetryFromProvider(() =>
        axios.get(`${COINPAPRIKA_BASE_URL}/tickers/${resolvedId}/historical`, {
          params: {
            start: start.toISOString(),
            end: end.toISOString(),
            interval: '1d',
          },
          timeout: 25000,
        })
      );
      const rows = Array.isArray(response.data) ? response.data : [];
      const prices = rows
        .filter((item) => item?.timestamp && item?.price != null)
        .map((item) => [new Date(item.timestamp).getTime(), Number(item.price)]);
      return { prices };
    });
    return { data };
  },
  
  // Watchlist operations
  getWatchlist: (userId) =>
    axios.get(`${API_BASE_URL}/watchlist`, { params: { user_id: userId } }),
  
  addToWatchlist: (userId, data) =>
    axios.post(`${API_BASE_URL}/watchlist`, data, { params: { user_id: userId } }),
  
  removeFromWatchlist: (watchlistId) =>
    axios.delete(`${API_BASE_URL}/watchlist/${watchlistId}`),
  
  // Portfolio operations
  getPortfolio: (userId) =>
    axios.get(`${API_BASE_URL}/portfolio`, { params: { user_id: userId } }),
  
  addToPortfolio: (userId, data) =>
    axios.post(`${API_BASE_URL}/portfolio`, data, { params: { user_id: userId } }),
  
  updatePortfolio: (portfolioId, data) =>
    axios.put(`${API_BASE_URL}/portfolio/${portfolioId}`, data),
  
  deletePortfolio: (portfolioId) =>
    axios.delete(`${API_BASE_URL}/portfolio/${portfolioId}`),
  
  // Insights
  getPortfolioInsights: (userId) =>
    axios.get(`${API_BASE_URL}/insights/portfolio/${userId}`),
  
  getMarketInsights: () =>
    axios.get(`${API_BASE_URL}/insights/market`)
};
