import React, { useState, useEffect } from 'react';

export default function InsightsPanel({ userId, portfolio = [] }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadInsights();
  }, [userId, portfolio]);

  const loadInsights = async () => {
    setLoading(true);
    try {
      if (!portfolio.length) {
        setInsights({
          total_value: 0,
          total_invested: 0,
          profit_loss: 0,
          profit_loss_percentage: 0,
          best_performer: null,
          worst_performer: null,
          top_holdings: [],
          diversity_score: 0,
        });
        setError(null);
        return;
      }

      const normalized = portfolio.map((item) => {
        const amount = Number(item.amount || 0);
        const purchasePrice = Number(item.purchase_price || 0);
        const currentPrice = Number(item.current_price || 0);
        const investedValue = Number(item.invested_value ?? amount * purchasePrice);
        const currentValue = Number(item.current_value ?? amount * currentPrice);
        const profitLoss = Number(item.profit_loss ?? currentValue - investedValue);
        const profitLossPercentage = purchasePrice > 0
          ? Number(item.profit_loss_percentage ?? ((currentPrice - purchasePrice) / purchasePrice) * 100)
          : 0;

        return {
          symbol: item.symbol,
          amount,
          purchase_price: purchasePrice,
          current_price: currentPrice,
          invested_value: investedValue,
          current_value: currentValue,
          profit_loss: profitLoss,
          profit_loss_percentage: profitLossPercentage,
        };
      });

      const totalValue = normalized.reduce((sum, item) => sum + item.current_value, 0);
      const totalInvested = normalized.reduce((sum, item) => sum + item.invested_value, 0);
      const profitLoss = totalValue - totalInvested;
      const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
      const bestPerformer = normalized.reduce((best, item) =>
        !best || item.profit_loss_percentage > best.profit_loss_percentage ? item : best, null);
      const worstPerformer = normalized.reduce((worst, item) =>
        !worst || item.profit_loss_percentage < worst.profit_loss_percentage ? item : worst, null);

      const topHoldings = [...normalized]
        .sort((a, b) => b.current_value - a.current_value)
        .slice(0, 5);

      setInsights({
        total_value: Number(totalValue.toFixed(2)),
        total_invested: Number(totalInvested.toFixed(2)),
        profit_loss: Number(profitLoss.toFixed(2)),
        profit_loss_percentage: Number(profitLossPercentage.toFixed(2)),
        best_performer: bestPerformer?.symbol || null,
        worst_performer: worstPerformer?.symbol || null,
        top_holdings: topHoldings,
        diversity_score: Math.min(normalized.length * 15, 100),
      });
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
