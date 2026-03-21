import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const cryptoAPI = {
  // Search for cryptos
  searchCrypto: (query) => 
    axios.get(`${API_BASE_URL}/crypto/search`, { params: { q: query } }),
  
  // Get trending cryptos
  getTrending: () =>
    axios.get(`${API_BASE_URL}/crypto/trending`),
  
  // Get crypto data
  getCryptoData: (ids) =>
    axios.get(`${API_BASE_URL}/crypto/data`, { params: { ids } }),
  
  // Get price history
  getPriceHistory: (cryptoId, days = 7) =>
    axios.get(`${API_BASE_URL}/crypto/history/${cryptoId}`, { params: { days } }),
  
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
