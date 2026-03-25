import React, { useState, useEffect, useRef } from 'react';
import CryptoSearch from '../components/CryptoSearch';
import PriceChart from '../components/PriceChart';
import { cryptoAPI } from '../services/api';

export default function Dashboard() {
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [cryptoDetails, setCryptoDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);
  const detailsRequestRef = useRef(0);

  useEffect(() => {
    if (selectedCrypto) {
      loadCryptoDetails();
    }
  }, [selectedCrypto]);

  const loadCryptoDetails = async () => {
    const requestId = ++detailsRequestRef.current;
    setLoading(true);
    setDetailsError(false);
    setCryptoDetails(null);
    setSlowLoad(false);

    const slowTimer = setTimeout(() => setSlowLoad(true), 5000);

    try {
      const response = await cryptoAPI.getCryptoData(selectedCrypto.id);
      clearTimeout(slowTimer);

      if (requestId !== detailsRequestRef.current) return;

      // Backend returns { data: [...], total: N }
      const list = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : null;
      const details = list?.[0];

      if (details && details.id) {
        setCryptoDetails(details);
      } else {
        console.warn('getCryptoData returned no usable details. Raw response:', response.data);
        setCryptoDetails(null);
        setDetailsError(true);
      }
    } catch (error) {
      clearTimeout(slowTimer);
      if (requestId !== detailsRequestRef.current) return;
      console.error('Error loading crypto details:', error);
      setCryptoDetails(null);
      setDetailsError(true);
    } finally {
      if (requestId !== detailsRequestRef.current) return;
      setLoading(false);
      setSlowLoad(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 slide-up">
          <h1 className="text-4xl font-bold gradient-text mb-2">Market Explorer</h1>
          <p className="text-slate-400">Discover and analyze cryptocurrencies in real-time</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search Panel */}
          <div className="stat-card card-hover h-fit">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              🔍 <span>Find Crypto</span>
            </h2>
            <CryptoSearch onSelectCrypto={setSelectedCrypto} />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {selectedCrypto && (
              <>
                {/* Crypto Info Card */}
                <div className="stat-card card-hover">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-3xl font-bold text-white">{selectedCrypto.name}</h2>
                      <p className="text-slate-400 text-lg">{selectedCrypto.symbol}</p>
                    </div>
                    {cryptoDetails && (
                      <div className="text-right">
                        <p className="text-3xl font-bold text-white">
                          ${cryptoDetails.current_price?.toLocaleString() || 'N/A'}
                        </p>
                        <p className={`text-sm font-semibold mt-1 ${cryptoDetails.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {cryptoDetails.price_change_percentage_24h >= 0 ? '▲' : '▼'} {Math.abs(cryptoDetails.price_change_percentage_24h)?.toFixed(2) || 'N/A'}% (24h)
                        </p>
                      </div>
                    )}
                    {loading && (
                      <div className="text-slate-400 text-sm animate-pulse">Loading price...</div>
                    )}
                  </div>

                  {loading ? (
                    <div className="mt-4 text-center text-slate-400">
                      <div className="inline-block animate-spin">⌛</div>
                      {slowLoad
                        ? ' Warming up data service, please wait...'
                        : ' Loading details...'}
                    </div>
                  ) : cryptoDetails ? (
                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                        <span className="text-slate-400 text-sm">Market Cap</span>
                        <p className="text-2xl font-bold text-white mt-1">
                          ${(cryptoDetails.market_cap / 1e9)?.toFixed(2) || 'N/A'}B
                        </p>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                        <span className="text-slate-400 text-sm">24h Change</span>
                        <p className={`text-2xl font-bold mt-1 ${cryptoDetails.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {cryptoDetails.price_change_percentage_24h?.toFixed(2) || 'N/A'}%
                        </p>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                        <span className="text-slate-400 text-sm">Supply</span>
                        <p className="text-2xl font-bold text-white mt-1">
                          {(cryptoDetails.circulating_supply / 1e6)?.toFixed(2) || 'N/A'}M
                        </p>
                      </div>
                    </div>
                  ) : null}
                  {detailsError && !loading && (
                    <div className="mt-4 text-center text-slate-500 text-sm">
                      Could not load price data. Check console for details.
                    </div>
                  )}
                </div>

                {/* Price Chart */}
                <PriceChart 
                  cryptoId={selectedCrypto.id} 
                  cryptoName={selectedCrypto.name}
                />
              </>
            )}

            {!selectedCrypto && (
              <div className="stat-card flex items-center justify-center py-20">
                <div className="text-center">
                  <p className="text-2xl text-slate-400 mb-2">📈</p>
                  <p className="text-lg text-slate-400">Select a cryptocurrency to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
