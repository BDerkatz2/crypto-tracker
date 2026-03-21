import React, { useState, useEffect } from 'react';
import { cryptoAPI } from '../services/api';

export default function InsightsPanel({ userId }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadInsights();
  }, [userId]);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const response = await cryptoAPI.getPortfolioInsights(userId);
      setInsights(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load insights');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="stat-card text-center py-8">
        <div className="inline-block animate-spin text-2xl mb-2">⌛</div>
        <p className="text-slate-400">Loading insights...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400">
        {error}
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="stat-card text-center py-8 text-slate-400">
        <p>No insights available</p>
      </div>
    );
  }

  const isProfitable = insights.profit_loss >= 0;

  return (
    <div className="w-full space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4">
        <div className="stat-card card-hover">
          <div className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Total Value</div>
          <div className="text-3xl font-bold text-white mt-2">${insights.total_value?.toLocaleString() || '0'}</div>
        </div>

        <div className="stat-card card-hover">
          <div className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Invested</div>
          <div className="text-3xl font-bold text-white mt-2">${insights.total_invested?.toLocaleString() || '0'}</div>
        </div>

        <div className={`stat-card card-hover border-l-4 ${isProfitable ? 'border-l-green-500' : 'border-l-red-500'}`}>
          <div className="text-slate-400 text-sm font-semibold uppercase tracking-wider">P&L</div>
          <div className={`text-3xl font-bold mt-2 ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
            ${Math.abs(insights.profit_loss || 0).toLocaleString()}
          </div>
          <div className={`text-sm mt-1 font-semibold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
            {isProfitable ? '+' : '-'}{Math.abs(insights.profit_loss_percentage || 0).toFixed(2)}%
          </div>
        </div>

        <div className="stat-card card-hover">
          <div className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Diversity Score</div>
          <div className="text-3xl font-bold text-blue-400 mt-2">{insights.diversity_score || 0}</div>
          <div className="w-full bg-slate-700 rounded-full h-2 mt-3">
            <div 
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(insights.diversity_score || 0, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Performers */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-green-900/30 border border-green-500/50 p-4 rounded-lg">
          <div className="text-green-400 text-xs font-semibold uppercase tracking-wider">🚀 Best Performer</div>
          <div className="text-xl font-bold text-green-300 mt-2">
            {insights.best_performer || '—'}
          </div>
        </div>

        <div className="bg-red-900/30 border border-red-500/50 p-4 rounded-lg">
          <div className="text-red-400 text-xs font-semibold uppercase tracking-wider">📉 Worst Performer</div>
          <div className="text-xl font-bold text-red-300 mt-2">
            {insights.worst_performer || '—'}
          </div>
        </div>
      </div>

      {/* Top Holdings */}
      {insights.top_holdings && insights.top_holdings.length > 0 && (
        <div className="stat-card card-hover">
          <h3 className="text-lg font-bold text-white mb-4">Top Holdings</h3>
          <div className="space-y-3">
            {insights.top_holdings.map((holding, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div>
                  <div className="font-semibold text-white">{holding.symbol}</div>
                  <div className="text-xs text-slate-400">
                    {holding.amount?.toFixed(8)} @ ${holding.current_price?.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-white">${holding.current_value?.toLocaleString()}</div>
                  <div className={`text-xs font-semibold ${holding.profit_loss_percentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {holding.profit_loss_percentage >= 0 ? '+' : ''}{holding.profit_loss_percentage?.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
