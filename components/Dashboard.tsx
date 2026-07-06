'use client';

import React, { useEffect, useState } from 'react';
import { Signal } from '@/lib/types';
import SignalCard from './SignalCard';
import TrendMeter from './TrendMeter';
import ChartComponent from './Chart';

/**
 * Premium Dashboard Component
 * Real-time signal display and market analysis
 */
export default function Dashboard() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [marketData, setMarketData] = useState<any>(null);
  const [stats, setStats] = useState({ activeSignals: 0, winRate: '0%', totalSignals: 0 });

  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];

  useEffect(() => {
    fetchMarketData();
    fetchSignal();
    const interval = setInterval(fetchSignal, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [selectedSymbol]);

  const fetchMarketData = async () => {
    try {
      const response = await fetch(`/api/market-data?action=single&symbol=${selectedSymbol}`);
      const data = await response.json();
      setMarketData(data);
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  };

  const fetchSignal = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: selectedSymbol, market: 'CRYPTO' }),
      });
      const data = await response.json();
      
      if (data.signal) {
        setSignals(prev => [data.signal, ...prev].slice(0, 20));
      }
    } catch (error) {
      console.error('Error fetching signal:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-dark border-b border-dark-border p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl font-black glow-text">MrTradow</h1>
            <div className="flex gap-2">
              <span className="px-4 py-2 bg-neon-green/20 border border-neon-green rounded-lg text-neon-green text-sm font-bold">
                LIVE
              </span>
            </div>
          </div>

          {/* Symbol Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {symbols.map(symbol => (
              <button
                key={symbol}
                onClick={() => setSelectedSymbol(symbol)}
                className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all ${
                  selectedSymbol === symbol
                    ? 'bg-neon-blue text-black'
                    : 'bg-white/5 border border-white/10 hover:border-neon-blue'
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Market Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-gray-400 text-sm mb-2">Price</p>
            <p className="text-3xl font-bold text-neon-blue">${marketData?.price.toFixed(2)}</p>
          </div>
          <div className="card">
            <p className="text-gray-400 text-sm mb-2">24h Change</p>
            <p className={`text-3xl font-bold ${marketData?.change24h > 0 ? 'text-neon-green' : 'text-neon-red'}`}>
              {marketData?.change24h.toFixed(2)}%
            </p>
          </div>
          <div className="card">
            <p className="text-gray-400 text-sm mb-2">High 24h</p>
            <p className="text-3xl font-bold">${marketData?.high24h.toFixed(2)}</p>
          </div>
          <div className="card">
            <p className="text-gray-400 text-sm mb-2">Low 24h</p>
            <p className="text-3xl font-bold">${marketData?.low24h.toFixed(2)}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="card-dark">
          <ChartComponent symbol={selectedSymbol} klines={marketData?.klines || []} />
        </div>

        {/* Trend Meter */}
        <TrendMeter symbol={selectedSymbol} />

        {/* Signals Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className="w-3 h-3 bg-neon-green rounded-full animate-pulse"></span>
              AI Trading Signals
            </h2>
            <button
              onClick={fetchSignal}
              disabled={loading}
              className="btn-secondary text-sm"
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>

          {/* Signal Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto">
            {signals.length > 0 ? (
              signals.map(signal => (
                <SignalCard key={signal.id} signal={signal} />
              ))
            ) : (
              <div className="col-span-2 card text-center py-12">
                <p className="text-gray-400">No signals generated yet. Click Analyze to generate signals.</p>
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <p className="text-gray-400 text-sm mb-2">Active Signals</p>
            <p className="text-3xl font-bold text-neon-blue">{signals.filter(s => s.status === 'ACTIVE').length}</p>
          </div>
          <div className="card">
            <p className="text-gray-400 text-sm mb-2">Win Rate</p>
            <p className="text-3xl font-bold text-neon-green">
              {signals.length > 0
                ? ((signals.filter(s => s.status === 'HIT_TP').length / signals.length) * 100).toFixed(1)
                : '0'}
              %
            </p>
          </div>
          <div className="card">
            <p className="text-gray-400 text-sm mb-2">Total Signals</p>
            <p className="text-3xl font-bold text-neon-purple">{signals.length}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
