import { CandleData, Signal, TrendDirection, PriceAction } from './types';

/**
 * EMA Calculator
 * Exponential Moving Average for trend identification
 */
export class EMACalculator {
  static calculate(prices: number[], period: number): number[] {
    if (prices.length === 0) return [];

    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    // First EMA = Simple Moving Average
    let sum = 0;
    for (let i = 0; i < Math.min(period, prices.length); i++) {
      sum += prices[i];
    }
    let currentEMA = sum / Math.min(period, prices.length);
    ema.push(currentEMA);

    // Subsequent EMAs
    for (let i = period; i < prices.length; i++) {
      currentEMA = (prices[i] - currentEMA) * multiplier + currentEMA;
      ema.push(currentEMA);
    }

    return ema;
  }

  static getLatestEMA(prices: number[], period: number = 8): number {
    const emaValues = this.calculate(prices, period);
    return emaValues[emaValues.length - 1] || 0;
  }
}

/**
 * Price Action Analyzer
 * Identifies key price action patterns
 */
export class PriceActionAnalyzer {
  /**
   * Detect Bullish Engulfing Pattern
   */
  static isBullishEngulfing(candles: CandleData[]): boolean {
    if (candles.length < 2) return false;

    const prev = candles[candles.length - 2];
    const current = candles[candles.length - 1];

    // Previous candle is bearish
    const isPrevBearish = prev.close < prev.open;
    // Current candle is bullish
    const isCurrBullish = current.close > current.open;
    // Current body engulfs previous
    const engulfs =
      current.open < prev.close &&
      current.close > prev.open;

    return isPrevBearish && isCurrBullish && engulfs;
  }

  /**
   * Detect Bearish Engulfing Pattern
   */
  static isBearishEngulfing(candles: CandleData[]): boolean {
    if (candles.length < 2) return false;

    const prev = candles[candles.length - 2];
    const current = candles[candles.length - 1];

    // Previous candle is bullish
    const isPrevBullish = prev.close > prev.open;
    // Current candle is bearish
    const isCurrBearish = current.close < current.open;
    // Current body engulfs previous
    const engulfs =
      current.open > prev.close &&
      current.close < prev.open;

    return isPrevBullish && isCurrBearish && engulfs;
  }

  /**
   * Detect Bullish Pin Bar (Hammer)
   */
  static isBullishPinBar(candles: CandleData[]): boolean {
    if (candles.length === 0) return false;

    const candle = candles[candles.length - 1];
    const body = Math.abs(candle.close - candle.open);
    const lowWick = Math.min(candle.open, candle.close) - candle.low;
    const totalRange = candle.high - candle.low;

    // Lower wick is at least 2x the body
    return lowWick > body * 2 && lowWick > totalRange * 0.6;
  }

  /**
   * Detect Bearish Pin Bar (Inverted Hammer)
   */
  static isBearishPinBar(candles: CandleData[]): boolean {
    if (candles.length === 0) return false;

    const candle = candles[candles.length - 1];
    const body = Math.abs(candle.close - candle.open);
    const upWick = candle.high - Math.max(candle.open, candle.close);
    const totalRange = candle.high - candle.low;

    // Upper wick is at least 2x the body
    return upWick > body * 2 && upWick > totalRange * 0.6;
  }

  /**
   * Detect Higher Low (Bullish Structure)
   */
  static hasHigherLow(candles: CandleData[]): boolean {
    if (candles.length < 2) return false;

    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];

    return current.low > previous.low;
  }

  /**
   * Detect Lower High (Bearish Structure)
   */
  static hasLowerHigh(candles: CandleData[]): boolean {
    if (candles.length < 2) return false;

    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];

    return current.high < previous.high;
  }

  /**
   * Detect Higher High (Bullish Continuation)
   */
  static hasHigherHigh(candles: CandleData[]): boolean {
    if (candles.length < 2) return false;

    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];

    return current.high > previous.high;
  }

  /**
   * Detect Lower Low (Bearish Continuation)
   */
  static hasLowerLow(candles: CandleData[]): boolean {
    if (candles.length < 2) return false;

    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];

    return current.low < previous.low;
  }

  /**
   * Detect Momentum Candle (Strong directional move)
   */
  static isMomentumCandle(candles: CandleData[], isBullish: boolean): boolean {
    if (candles.length === 0) return false;

    const candle = candles[candles.length - 1];
    const body = Math.abs(candle.close - candle.open);
    const totalRange = candle.high - candle.low;
    const bodyRatio = body / totalRange;

    if (isBullish) {
      // Strong bullish candle: large green body, close near high
      return (
        candle.close > candle.open &&
        bodyRatio > 0.65 &&
        candle.high - candle.close < totalRange * 0.1
      );
    } else {
      // Strong bearish candle: large red body, close near low
      return (
        candle.close < candle.open &&
        bodyRatio > 0.65 &&
        candle.close - candle.low < totalRange * 0.1
      );
    }
  }

  /**
   * Detect Break of Structure
   */
  static isBreakOfStructure(
    candles: CandleData[],
    isBullish: boolean
  ): boolean {
    if (candles.length < 3) return false;

    const current = candles[candles.length - 1];
    const prev1 = candles[candles.length - 2];
    const prev2 = candles[candles.length - 3];

    if (isBullish) {
      // Break of bearish structure: current high > prev high
      const recentHigh = Math.max(prev1.high, prev2.high);
      return current.close > recentHigh;
    } else {
      // Break of bullish structure: current low < prev low
      const recentLow = Math.min(prev1.low, prev2.low);
      return current.close < recentLow;
    }
  }

  /**
   * Detect EMA Retest (Price touching EMA)
   */
  static isEMARetest(candle: CandleData, ema: number, threshold: number = 0.01): boolean {
    const priceDiff = Math.abs(candle.close - ema);
    const percentDiff = (priceDiff / ema) * 100;
    return percentDiff <= threshold * 100;
  }

  /**
   * Get consolidated price action strength
   */
  static getPriceActionStrength(
    candles: CandleData[],
    trend: TrendDirection,
    ema: number
  ): number {
    let strength = 0;

    if (trend === 'BULLISH') {
      if (this.isBullishEngulfing(candles)) strength += 2;
      if (this.isBullishPinBar(candles)) strength += 1.5;
      if (this.hasHigherLow(candles)) strength += 1;
      if (this.hasHigherHigh(candles)) strength += 1;
      if (this.isMomentumCandle(candles, true)) strength += 1.5;
      if (this.isBreakOfStructure(candles, true)) strength += 2;
      if (this.isEMARetest(candles[candles.length - 1], ema)) strength += 1;
    } else {
      if (this.isBearishEngulfing(candles)) strength += 2;
      if (this.isBearishPinBar(candles)) strength += 1.5;
      if (this.hasLowerHigh(candles)) strength += 1;
      if (this.hasLowerLow(candles)) strength += 1;
      if (this.isMomentumCandle(candles, false)) strength += 1.5;
      if (this.isBreakOfStructure(candles, false)) strength += 2;
      if (this.isEMARetest(candles[candles.length - 1], ema)) strength += 1;
    }

    return Math.min(strength * 10, 100); // Normalize to 100
  }
}

/**
 * Market Structure Analyzer
 */
export class MarketStructureAnalyzer {
  /**
   * Detect market volatility
   */
  static getVolatility(candles: CandleData[], lookback: number = 20): number {
    if (candles.length < lookback) return 0;

    const recentCandles = candles.slice(-lookback);
    const ranges = recentCandles.map(c => c.high - c.low);
    const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;

    const variance = ranges.reduce((sum, range) => {
      return sum + Math.pow(range - avgRange, 2);
    }, 0) / ranges.length;

    return Math.sqrt(variance);
  }

  /**
   * Check if market is ranging
   */
  static isRanging(candles: CandleData[], lookback: number = 50): boolean {
    if (candles.length < lookback) return false;

    const recentCandles = candles.slice(-lookback);
    const highs = recentCandles.map(c => c.high);
    const lows = recentCandles.map(c => c.low);

    const maxHigh = Math.max(...highs);
    const minLow = Math.min(...lows);
    const range = maxHigh - minLow;

    // If range is too small relative to price, it's ranging
    const avgPrice = recentCandles.reduce((sum, c) => sum + c.close, 0) / recentCandles.length;
    const rangePercent = (range / avgPrice) * 100;

    return rangePercent < 2; // Less than 2% range = ranging
  }

  /**
   * Detect trend strength
   */
  static getTrendStrength(candles: CandleData[], ema: number): number {
    if (candles.length < 5) return 0;

    const recentCandles = candles.slice(-5);
    const aboveEMA = recentCandles.filter(c => c.close > ema).length;
    const belowEMA = recentCandles.filter(c => c.close < ema).length;

    return Math.max(aboveEMA, belowEMA) / 5;
  }
}

export default {
  EMACalculator,
  PriceActionAnalyzer,
  MarketStructureAnalyzer,
};
