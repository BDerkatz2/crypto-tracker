import React, { useState, useEffect } from 'react';
import { cryptoAPI } from '../services/api';

export default function CryptoSearch({ onSelectCrypto }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTrending, setShowTrending] = useState(true);

  useEffect(() => {
    if (search.trim()) {
      handleSearch();
    } else {
      setShowTrending(true);
      loadTrending();
    }
  }, [search]);

  const handleSearch = async () => {
    if (!search.trim()) return;
    
    setLoading(true);
    try {
      const response = await cryptoAPI.searchCrypto(search);
      const backendResults = response.data.results;
      const coingeckoResults = response.data.coins;
      const coincapResults = response.data.data;
      const normalizedResults = (backendResults || coingeckoResults || coincapResults || []).map((coin) => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol?.toUpperCase() || ''
      }));

      setResults(normalizedResults);
      setShowTrending(false);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrending = async () => {
    try {
      const response = await cryptoAPI.getTrending();
      const backendTrending = response.data.trending;
      const coingeckoTrending = response.data.coins?.map((entry) => entry.item);
      const coincapTrending = response.data.data;
      const normalizedTrending = (backendTrending || coingeckoTrending || coincapTrending || []).map((coin) => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol?.toUpperCase() || ''
      }));

      setResults(normalizedTrending);
    } catch (error) {
      console.error('Trending error:', error);
    }
  };

  return (
    <div className="w-full">
      <div className="relative">
        <input
          type="text"
          placeholder="Search cryptocurrencies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 transition-all"
        />
        {loading && <span className="absolute right-3 top-3 animate-spin">⌛</span>}
      </div>
      
      {!loading && results.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
            {showTrending ? '🔥 Trending' : '🔍 Results'}
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {results.map((result) => (
              <div
                key={result.id}
                onClick={() => onSelectCrypto(result)}
                className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700/70 hover:border-blue-500/50 transition-all card-hover"
              >
                <div className="font-semibold text-white">{result.name}</div>
                <div className="text-sm text-slate-400">{result.symbol || result.id}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
