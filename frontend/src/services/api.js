import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const BACKEND_ROOT = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

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

// Fire-and-forget health ping to wake the Render free-tier backend from sleep.
// Call this as early as possible so it's warm by the time the user picks a coin.
export const pingBackend = () =>
  axios.get(`${BACKEND_ROOT}/health`, { timeout: 60000 }).catch(() => {});

export const cryptoAPI = {
  searchCrypto: (query) =>
    getWithRetry(`${API_BASE_URL}/crypto/search`, { params: { q: query }, timeout: 60000 }),

  getTrending: () =>
    getWithRetry(`${API_BASE_URL}/crypto/trending`, { timeout: 60000 }),

  getCryptoData: (ids) =>
    getWithRetry(`${API_BASE_URL}/crypto/data`, { params: { ids }, timeout: 60000 }, 4, 5 * 60 * 1000),

  getPriceHistory: (cryptoId, days = 7) =>
    getWithRetry(`${API_BASE_URL}/crypto/history/${cryptoId}`, { params: { days }, timeout: 60000 }, 4, 30 * 60 * 1000),
  
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
