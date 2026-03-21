import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

export default function PortfolioAllocation({ portfolio }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (portfolio && portfolio.length > 0) {
      const total = portfolio.reduce((sum, item) => sum + item.current_value, 0);
      const chartData = portfolio.map(item => ({
        name: item.symbol,
        value: parseFloat(((item.current_value / total) * 100).toFixed(2))
      }));
      setData(chartData);
    }
  }, [portfolio]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

  return (
    <div className="w-full stat-card card-hover">
      <h2 className="text-2xl font-bold text-white mb-6">Portfolio Allocation</h2>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#e2e8f0'
              }}
              formatter={(value) => `${value.toFixed(2)}%`}
            />
            <Legend 
              wrapperStyle={{ color: '#cbd5e1' }}
              formatter={(value) => <span style={{ color: '#e2e8f0' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-80 flex items-center justify-center text-slate-400">
          <p>No portfolio data to display</p>
        </div>
      )}
    </div>
  );
}
