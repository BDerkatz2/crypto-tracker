import React from 'react';

export default function Navigation({ currentPage, onPageChange }) {
  const pages = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'watchlist', label: 'Watchlist' }
  ];

  return (
    <nav className="sticky top-0 z-50 glass-effect border-b border-blue-500/20 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🪙</div>
            <h1 className="text-2xl font-bold gradient-text">Crypto Tracker</h1>
          </div>
          <div className="flex gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => onPageChange(page.id)}
                className={`px-4 py-2 rounded-md transition-all duration-300 font-semibold ${
                  currentPage === page.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                {page.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
