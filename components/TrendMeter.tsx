'use client';

import React, { useEffect, useState } from 'react';
import { TrendDirection } from '@/lib/types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Trend Meter Component
 * Displays current market trend with strength indicator
 */
interface TrendMeterProps {
  symbol: string;
}

export default function TrendMeter({ symbol }: TrendMeterProps) {
  const [trend, setTrend] = useState<TrendDirection>('NEUTRAL');
  const [strength, setStrength] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzeTrend();
    const interval = setInterval(analyzeTrend, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [symbol]);

  const analyzeTrend = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/market-data?action=single&symbol=${symbol}`);
      const data = await response.json();

      if (data.klines && data.klines.length > 0) {
        // Simple trend detection based on last candles
        const recentCandles = data.klines.slice(-20);
        const closes = recentCandles.map((k: any) => k.close);
        
        // Calculate average
        const avgPrice = closes.reduce((a: number, b: number) => a + b) / closes.length;
        const lastPrice = closes[closes.length - 1];

        let detectedTrend: TrendDirection = 'NEUTRAL';
        let trendStrength = 50;

        if (lastPrice > avgPrice) {
          detectedTrend = 'BULLISH';
          trendStrength = Math.min(50 + ((lastPrice - avgPrice) / avgPrice) * 1000, 100);
        } else if (lastPrice < avgPrice) {
          detectedTrend = 'BEARISH';
          trendStrength = Math.min(50 - ((avgPrice - lastPrice) / avgPrice) * 1000, 100);
        }

        setTrend(detectedTrend);
        setStrength(Math.round(trendStrength));
      }
    } catch (error) {
      console.error('Error analyzing trend:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendColor = () => {
    if (trend === 'BULLISH') return 'text-neon-green';
    if (trend === 'BEARISH') return 'text-neon-red';
    return 'text-gray-400';
  };

  const getTrendBgColor = () => {
    if (trend === 'BULLISH') return 'bg-green-500/20 border-neon-green';
    if (trend === 'BEARISH') return 'bg-red-500/20 border-neon-red';
    return 'bg-gray-500/20 border-gray-400';
  };

  return (
    <div className={`card-dark border ${getTrendBgColor()}`}>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-lg ${trend === 'BULLISH' ? 'bg-green-500/20' : trend === 'BEARISH' ? 'bg-red-500/20' : 'bg-gray-500/20'}`}>
            {trend === 'BULLISH' ? (
              <TrendingUp className="text-neon-green" size={32} />
            ) : trend === 'BEARISH' ? (
              <TrendingDown className="text-neon-red" size={32} />
            ) : (
              <Minus className="text-gray-400" size={32} />
            )}
          </div>
          <div>
            <h3 className="text-2xl font-bold">Market Trend Analysis</h3>
            <p className={`text-lg font-bold ${getTrendColor()}`}>{trend}</p>
          </div>
        </div>
        <button
          onClick={analyzeTrend}
          disabled={loading}
          className="btn-secondary text-sm"
        >
          {loading ? 'Analyzing...' : 'Refresh'}
        </button>
      </div>

      {/* Strength Meter */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Trend Strength</span>
          <span className="font-bold text-neon-blue">{strength}%</span>
        </div>
        <div className="w-full h-3 bg-dark-border rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              trend === 'BULLISH'
                ? 'bg-neon-green'
                : trend === 'BEARISH'
                ? 'bg-neon-red'
                : 'bg-gray-400'
            }`}
            style={{ width: `${strength}%` }}
          />
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-3 gap-3 pt-4">
          <div className="bg-white/5 p-3 rounded-lg text-center">
            <p className="text-gray-400 text-xs mb-1">Signal Type</p>
            <p className={`font-bold ${getTrendColor()}`}>
              {trend === 'BULLISH' ? 'BUY' : trend === 'BEARISH' ? 'SELL' : 'WAIT'}
            </p>
          </div>
          <div className="bg-white/5 p-3 rounded-lg text-center">
            <p className="text-gray-400 text-xs mb-1">Confidence</p>
            <p className="font-bold text-neon-purple">{strength > 70 ? 'HIGH' : strength > 40 ? 'MID' : 'LOW'}</p>
          </div>
          <div className="bg-white/5 p-3 rounded-lg text-center">
            <p className="text-gray-400 text-xs mb-1">Status</p>
            <p className="font-bold text-neon-blue">{loading ? 'Updating...' : 'Ready'}</p>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-400 pt-4 border-t border-white/10 mt-4">
        {trend === 'BULLISH'
          ? '📈 Market is showing bullish momentum. Look for BUY opportunities on support retests.'
          : trend === 'BEARISH'
          ? '📉 Market is showing bearish momentum. Look for SELL opportunities on resistance retests.'
          : '⏸️ Market is neutral. Wait for clearer signals before entering trades.'}
      </p>
    </div>
  );
}
