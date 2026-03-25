import React, { useEffect, useState } from 'react';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Watchlist from './pages/Watchlist';
import { pingBackend } from './services/api';
import './index.css';

const VALID_PAGES = new Set(['dashboard', 'portfolio', 'watchlist']);

const getPageFromHash = () => {
  const page = window.location.hash.replace(/^#/, '').trim().toLowerCase();
  return VALID_PAGES.has(page) ? page : 'dashboard';
};

function App() {
  const [currentPage, setCurrentPage] = useState(getPageFromHash);

  useEffect(() => {
    // Pre-warm the backend immediately so it wakes from sleep before user picks a coin.
    pingBackend();

    const handleHashChange = () => {
      setCurrentPage(getPageFromHash());
    };

    // Ensure a stable default hash for first load.
    if (!window.location.hash) {
      window.location.hash = '#dashboard';
    }

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handlePageChange = (page) => {
    if (!VALID_PAGES.has(page)) {
      return;
    }
    window.location.hash = `#${page}`;
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'portfolio':
        return <Portfolio />;
      case 'watchlist':
        return <Watchlist />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation currentPage={currentPage} onPageChange={handlePageChange} />
      {renderPage()}
    </div>
  );
}

export default App;
