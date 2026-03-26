import React, { useState, useEffect } from 'react';
import InsightsPanel from '../components/InsightsPanel';
import PortfolioAllocation from '../components/PortfolioAllocation';
import { cryptoAPI } from '../services/api';

const DEMO_USER_ID = 1;

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    crypto_id: '',
    symbol: '',
    amount: '',
    purchase_price: '',
    purchase_date: ''
  });

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    setLoading(true);
    try {
      const response = await cryptoAPI.getPortfolio(DEMO_USER_ID);
      const holdings = Array.isArray(response.data) ? response.data : [];

      if (!holdings.length) {
        setPortfolio([]);
        return;
      }

      // Enrich persisted holdings with live prices from the same provider used by Dashboard.
      let priceMap = new Map();
      try {
        const ids = holdings.map((item) => item.crypto_id).filter(Boolean).join(',');
        const pricesResponse = await cryptoAPI.getCryptoData(ids);
        const priceRows = Array.isArray(pricesResponse?.data?.data) ? pricesResponse.data.data : [];
        priceMap = new Map(priceRows.map((row) => [row.id, Number(row.current_price || 0)]));
      } catch (priceError) {
        console.warn('Could not load live portfolio prices, using stored values.', priceError);
      }

      const enriched = holdings.map((item) => {
        const fallbackCurrentPrice = Number(item.current_price || item.purchase_price || 0);
        const currentPrice = Number(priceMap.get(item.crypto_id) || fallbackCurrentPrice);
        const amount = Number(item.amount || 0);
        const purchasePrice = Number(item.purchase_price || 0);
        const investedValue = amount * purchasePrice;
        const currentValue = amount * currentPrice;
        const profitLoss = currentValue - investedValue;
        const profitLossPercentage = purchasePrice > 0
          ? ((currentPrice - purchasePrice) / purchasePrice) * 100
          : 0;

        return {
          ...item,
          current_price: currentPrice,
          invested_value: investedValue,
          current_value: currentValue,
          profit_loss: profitLoss,
          profit_loss_percentage: profitLossPercentage,
        };
      });

      setPortfolio(enriched);
    } catch (error) {
      console.error('Error loading portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPortfolio = async () => {
    if (!formData.crypto_id || !formData.amount || !formData.purchase_price) {
      alert('Please fill all required fields');
      return;
    }

    try {
      await cryptoAPI.addToPortfolio(DEMO_USER_ID, {
        ...formData,
        amount: parseFloat(formData.amount),
        purchase_price: parseFloat(formData.purchase_price),
        purchase_date: new Date(formData.purchase_date).toISOString()
      });
      
      setFormData({
        crypto_id: '',
        symbol: '',
        amount: '',
        purchase_price: '',
        purchase_date: ''
      });
      setShowForm(false);
      loadPortfolio();
    } catch (error) {
      console.error('Error adding to portfolio:', error);
      alert('Failed to add to portfolio');
    }
  };

  const handleDeletePortfolioItem = async (id) => {
    if (window.confirm('Are you sure you want to delete this holding?')) {
      try {
        await cryptoAPI.deletePortfolio(id);
        loadPortfolio();
      } catch (error) {
        console.error('Error deleting portfolio item:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 slide-up">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">My Portfolio</h1>
            <p className="text-slate-400">Track and manage your cryptocurrency holdings</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? '✕ Cancel' : '+ Add Asset'}
          </button>
        </div>

        {/* Add Asset Form */}
        {showForm && (
          <div className="stat-card mb-6 card-hover border-blue-500/30">
            <h2 className="text-xl font-bold text-white mb-4">Add Cryptocurrency Holding</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Crypto ID (e.g., bitcoin)"
                value={formData.crypto_id}
                onChange={(e) => setFormData({...formData, crypto_id: e.target.value})}
                className="px-4 py-2 bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Symbol (e.g., BTC)"
                value={formData.symbol}
                onChange={(e) => setFormData({...formData, symbol: e.target.value})}
                className="px-4 py-2 bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Amount"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                step="0.00000001"
                className="px-4 py-2 bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Purchase Price"
                value={formData.purchase_price}
                onChange={(e) => setFormData({...formData, purchase_price: e.target.value})}
                step="0.01"
                className="px-4 py-2 bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                className="px-4 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddToPortfolio}
                className="btn-primary col-span-1 md:col-span-1"
              >
                + Add Holding
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Portfolio Table */}
          <div className="lg:col-span-2 stat-card card-hover">
            <h2 className="text-2xl font-bold text-white mb-4">Your Holdings</h2>
            {loading ? (
              <div className="text-center py-12 text-slate-400">
                <div className="inline-block animate-spin text-2xl mb-2">⌛</div> Loading portfolio...
              </div>
            ) : portfolio.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-2 text-slate-400 font-semibold uppercase tracking-wide">Asset</th>
                      <th className="text-left py-3 px-2 text-slate-400 font-semibold uppercase tracking-wide">Amount</th>
                      <th className="text-left py-3 px-2 text-slate-400 font-semibold uppercase tracking-wide">Cost</th>
                      <th className="text-left py-3 px-2 text-slate-400 font-semibold uppercase tracking-wide">Value</th>
                      <th className="text-left py-3 px-2 text-slate-400 font-semibold uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map((item) => (
                      <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                        <td className="py-4 px-2 font-semibold text-white">{item.symbol}</td>
                        <td className="py-4 px-2 text-slate-300">{item.amount?.toFixed(8)}</td>
                        <td className="py-4 px-2 text-slate-300">${(item.amount * item.purchase_price)?.toFixed(2)}</td>
                        <td className="py-4 px-2 text-green-400 font-semibold">${item.current_value?.toFixed(2)}</td>
                        <td className="py-4 px-2">
                          <button
                            onClick={() => handleDeletePortfolioItem(item.id)}
                            className="text-red-400 hover:text-red-300 font-semibold transition-colors"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <p className="text-lg">📭 No holdings yet</p>
                <p className="text-sm mt-1">Add your first asset to get started</p>
              </div>
            )}
          </div>

          {/* Insights Sidebar */}
          <div>
            <InsightsPanel userId={DEMO_USER_ID} portfolio={portfolio} />
          </div>
        </div>

        {/* Portfolio Allocation */}
        {portfolio.length > 0 && (
          <div className="mt-6">
            <PortfolioAllocation portfolio={portfolio} />
          </div>
        )}
      </div>
    </div>
  );
}
