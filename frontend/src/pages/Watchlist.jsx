import React, { useState, useEffect } from 'react';
import { cryptoAPI } from '../services/api';

const DEMO_USER_ID = 1;

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    crypto_id: '',
    symbol: ''
  });

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    setLoading(true);
    try {
      const response = await cryptoAPI.getWatchlist(DEMO_USER_ID);
      setWatchlist(response.data);
    } catch (error) {
      console.error('Error loading watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWatchlist = async () => {
    if (!formData.crypto_id || !formData.symbol) {
      alert('Please fill all fields');
      return;
    }

    try {
      await cryptoAPI.addToWatchlist(DEMO_USER_ID, formData);
      setFormData({ crypto_id: '', symbol: '' });
      setShowForm(false);
      loadWatchlist();
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      const detail = error?.response?.data?.detail;
      alert(detail || 'Failed to add to watchlist');
    }
  };

  const handleRemoveFromWatchlist = async (id) => {
    if (window.confirm('Remove from watchlist?')) {
      try {
        await cryptoAPI.removeFromWatchlist(id);
        loadWatchlist();
      } catch (error) {
        console.error('Error removing from watchlist:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 slide-up">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">My Watchlist</h1>
            <p className="text-slate-400">Monitor your favorite cryptocurrencies</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? '✕ Cancel' : '+ Add Crypto'}
          </button>
        </div>

        {/* Add Crypto Form */}
        {showForm && (
          <div className="stat-card mb-6 card-hover border-blue-500/30">
            <h2 className="text-xl font-bold text-white mb-4">Add to Watchlist</h2>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Crypto ID (e.g., bitcoin)"
                value={formData.crypto_id}
                onChange={(e) => setFormData({...formData, crypto_id: e.target.value})}
                className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Symbol (e.g., BTC)"
                value={formData.symbol}
                onChange={(e) => setFormData({...formData, symbol: e.target.value})}
                className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddToWatchlist}
                className="btn-primary"
              >
                + Add
              </button>
            </div>
          </div>
        )}

        {/* Watchlist Items */}
        <div className="stat-card card-hover">
          {loading ? (
            <div className="text-center py-12 text-slate-400">
              <div className="inline-block animate-spin text-2xl mb-2">⌛</div> Loading watchlist...
            </div>
          ) : watchlist.length > 0 ? (
            <div className="space-y-3">
              {watchlist.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:border-blue-500/50 hover:bg-slate-700/50 transition-all card-hover"
                >
                  <div className="flex-1">
                    <div className="font-bold text-lg text-white">{item.symbol}</div>
                    <div className="text-sm text-slate-400">{item.crypto_id}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Added {new Date(item.added_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveFromWatchlist(item.id)}
                    className="text-red-400 hover:text-red-300 font-semibold px-4 py-2 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg">👁️ No items in watchlist</p>
              <p className="text-sm mt-1">Add cryptocurrencies to monitor them</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
