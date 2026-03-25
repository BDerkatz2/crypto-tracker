import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const BACKEND_ROOT = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
const COINCAP_BASE_URL = 'https://api.coincap.io/v2';

// Fire-and-forget health ping to wake the Render free-tier backend from sleep.
// Call this as early as possible so it's warm by the time the user picks a coin.
export const pingBackend = () =>
  axios.get(`${BACKEND_ROOT}/health`, { timeout: 60000 }).catch(() => {});

function normalizeCoinCapAsset(asset) {
  return {
    id: asset.id,
    name: asset.name,
    symbol: (asset.symbol || '').toUpperCase(),
    current_price: Number(asset.priceUsd || 0),
    market_cap: Number(asset.marketCapUsd || 0),
    price_change_percentage_24h: Number(asset.changePercent24Hr || 0),
    circulating_supply: Number(asset.supply || 0)
  };
}

export const cryptoAPI = {
  searchCrypto: (query) =>
    axios.get(`${COINCAP_BASE_URL}/assets`, {
      params: { search: query, limit: 10 },
      timeout: 20000
    }).catch(() => axios.get(`${API_BASE_URL}/crypto/search`, { params: { q: query }, timeout: 60000 })),

  getTrending: () =>
    axios.get(`${COINCAP_BASE_URL}/assets`, {
      params: { limit: 10 },
      timeout: 20000
    }).catch(() => axios.get(`${API_BASE_URL}/crypto/trending`, { timeout: 60000 })),

  getCryptoData: (ids) =>
    Promise.all(
      String(ids)
        .split(',')
        .map((coinId) => coinId.trim())
        .filter(Boolean)
        .map((coinId) => axios.get(`${COINCAP_BASE_URL}/assets/${coinId}`, { timeout: 20000 }))
    )
      .then((responses) => ({
        data: {
          data: responses
            .map((response) => response.data?.data)
            .filter(Boolean)
            .map(normalizeCoinCapAsset)
        }
      }))
      .catch(() => axios.get(`${API_BASE_URL}/crypto/data`, { params: { ids }, timeout: 60000 })),

  getPriceHistory: (cryptoId, days = 7) =>
    (() => {
      const end = Date.now();
      const start = end - (days * 24 * 60 * 60 * 1000);
      const interval = days <= 1 ? 'm30' : days <= 7 ? 'h1' : days <= 90 ? 'h6' : 'd1';

      return axios.get(`${COINCAP_BASE_URL}/assets/${cryptoId}/history`, {
        params: { interval, start, end },
        timeout: 20000
      }).then((response) => ({
        data: {
          prices: (response.data?.data || []).map((item) => [
            Number(item.time),
            Number(item.priceUsd || 0)
          ])
        }
      }));
    })().catch(() => axios.get(`${API_BASE_URL}/crypto/history/${cryptoId}`, { params: { days }, timeout: 60000 })),
  
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
