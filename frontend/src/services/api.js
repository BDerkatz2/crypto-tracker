import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

async function firstSuccessful(requests) {
  let lastError = null;

  for (const request of requests) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

async function withRetry(request, attempts = 2, delayMs = 1000) {
  let lastError = null;

  for (let i = 0; i < attempts; i += 1) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

export const cryptoAPI = {
  // Search for cryptos
  searchCrypto: (query) => 
    firstSuccessful([
      () => axios.get(`${COINGECKO_BASE}/search`, { params: { query }, timeout: 12000 }),
      () => withRetry(
        () => axios.get(`${API_BASE_URL}/crypto/search`, { params: { q: query }, timeout: 30000 }),
        2,
        1200
      )
    ]),
  
  // Get trending cryptos
  getTrending: () =>
    firstSuccessful([
      () => axios.get(`${COINGECKO_BASE}/search/trending`, { timeout: 12000 }),
      () => withRetry(
        () => axios.get(`${API_BASE_URL}/crypto/trending`, { timeout: 30000 }),
        2,
        1200
      )
    ]),
  
  // Get crypto data with fallback across providers.
  getCryptoData: (ids) =>
    firstSuccessful([
      () => withRetry(
        () => axios.get(`${API_BASE_URL}/crypto/data`, {
          params: { ids },
          timeout: 45000
        }),
        2,
        1500
      ),
      () => axios.get(`${COINGECKO_BASE}/coins/markets`, {
        params: {
          ids,
          vs_currency: 'usd',
          order: 'market_cap_desc',
          sparkline: false,
          price_change_percentage: '24h'
        },
        timeout: 12000
      })
    ]),

  // Get price history with fallback across providers.
  getPriceHistory: (cryptoId, days = 7) =>
    firstSuccessful([
      () => withRetry(
        () => axios.get(`${API_BASE_URL}/crypto/history/${cryptoId}`, {
          params: { days },
          timeout: 45000
        }),
        2,
        1500
      ),
      () => axios.get(`${COINGECKO_BASE}/coins/${cryptoId}/market_chart`, {
        params: { vs_currency: 'usd', days },
        timeout: 12000
      })
    ]),
  
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
