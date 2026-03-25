import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cryptoAPI } from '../services/api';

export default function PriceChart({ cryptoId, cryptoName }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slowLoad, setSlowLoad] = useState(false);
  const [period, setPeriod] = useState(7);
  const chartRequestRef = useRef(0);
  const autoRetryRef = useRef(null);

  useEffect(() => {
    return () => {
      if (autoRetryRef.current) {
        clearTimeout(autoRetryRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (cryptoId) {
      loadChartData();
    }
  }, [cryptoId, period]);

  const loadChartData = async () => {
    if (autoRetryRef.current) {
      clearTimeout(autoRetryRef.current);
      autoRetryRef.current = null;
    }

    const requestId = ++chartRequestRef.current;
    setLoading(true);
    setSlowLoad(false);
    setData([]);

    const slowTimer = setTimeout(() => setSlowLoad(true), 5000);

    try {
      const response = await cryptoAPI.getPriceHistory(cryptoId, period);
      clearTimeout(slowTimer);

      if (requestId !== chartRequestRef.current) return;
      
      if (response.data.prices) {
        const formattedData = response.data.prices.map(([timestamp, price]) => ({
          date: new Date(timestamp).toLocaleDateString(),
          price: Number(price.toFixed(2))
        }));
        setData(formattedData);
      } else {
        setData([]);
      }
    } catch (error) {
      clearTimeout(slowTimer);
      if (requestId !== chartRequestRef.current) return;
      if (import.meta.env.DEV) {
        console.error('Chart data error:', error);
      }
      const status = error?.response?.status;
      if (status === 503 || !error?.response) {
        autoRetryRef.current = setTimeout(() => {
          loadChartData();
        }, 12000);
      }
      setData([]);
    } finally {
      if (requestId !== chartRequestRef.current) return;
      setLoading(false);
      setSlowLoad(false);
    }
  };

  const periods = [
    { label: '7D', value: 7 },
    { label: '1M', value: 30 },
    { label: '3M', value: 90 },
    { label: '1Y', value: 365 }
  ];

  return (
    <div className="w-full stat-card card-hover">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">{cryptoName} Price Chart</h2>
        <div className="flex gap-2 bg-slate-900/50 p-1 rounded-lg border border-slate-700/50">
          {periods.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 rounded text-sm font-semibold transition-all duration-300 ${
                period === p.value
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-80 flex items-center justify-center text-slate-400">
          <div className="text-center">
            <div className="animate-spin text-2xl mb-2">⌛</div>
            {slowLoad ? 'Warming up data service...' : 'Loading chart...'}
          </div>
        </div>
      ) : data.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#e2e8f0'
              }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPrice)"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-80 flex items-center justify-center text-slate-400">
          No data available
        </div>
      )}
    </div>
  );
}
