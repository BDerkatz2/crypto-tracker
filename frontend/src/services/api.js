import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const BACKEND_ROOT = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

// Fire-and-forget health ping to wake the Render free-tier backend from sleep.
// Call this as early as possible so it's warm by the time the user picks a coin.
export const pingBackend = () =>
  axios.get(`${BACKEND_ROOT}/health`, { timeout: 60000 }).catch(() => {});

export const cryptoAPI = {
  searchCrypto: (query) =>
    axios.get(`${API_BASE_URL}/crypto/search`, { params: { q: query }, timeout: 60000 }),

  getTrending: () =>
    axios.get(`${API_BASE_URL}/crypto/trending`, { timeout: 60000 }),

  getCryptoData: (ids) =>
    axios.get(`${API_BASE_URL}/crypto/data`, { params: { ids }, timeout: 60000 }),

  getPriceHistory: (cryptoId, days = 7) =>
    axios.get(`${API_BASE_URL}/crypto/history/${cryptoId}`, { params: { days }, timeout: 60000 }),
  
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
