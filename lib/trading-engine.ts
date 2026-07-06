import {
  CandleData,
  Signal,
  SignalType,
  TrendDirection,
  Market,
} from './types';
import { EMACalculator, PriceActionAnalyzer, MarketStructureAnalyzer } from './price-action';
import { EntryExitCalculator } from './entry-exit';

/**
 * Main Trading Engine
 * Generates institutional-quality trading signals
 */
export class TradingEngine {
  private symbol: string;
  private market: Market;
  private higherTFCandles: CandleData[] = [];
  private entryTFCandles: CandleData[] = [];
  private minConfidence: number = 75; // Only signals with 75%+ confidence

  constructor(symbol: string, market: Market) {
    this.symbol = symbol;
    this.market = market;
  }

  /**
   * Update candle data from WebSocket
   */
  updateCandles(
    candles: CandleData[],
    timeframe: 'HIGHER' | 'ENTRY'
  ): void {
    if (timeframe === 'HIGHER') {
      this.higherTFCandles = candles;
    } else {
      this.entryTFCandles = candles;
    }
  }

  /**
   * Analyze trend from higher timeframe
   */
  private analyzeTrend(): { direction: TrendDirection; ema: number; strength: number } {
    if (this.higherTFCandles.length === 0) {
      return { direction: 'NEUTRAL', ema: 0, strength: 0 };
    }

    // Get higher timeframe prices
    const prices = this.higherTFCandles.map(c => c.close);
    const ema8 = EMACalculator.getLatestEMA(prices, 8);

    const lastCandle = this.higherTFCandles[this.higherTFCandles.length - 1];
    const lastPrice = lastCandle.close;

    let direction: TrendDirection = 'NEUTRAL';
    if (lastPrice > ema8) {
      direction = 'BULLISH';
    } else if (lastPrice < ema8) {
      direction = 'BEARISH';
    }

    const strength = MarketStructureAnalyzer.getTrendStrength(
      this.higherTFCandles,
      ema8
    );

    return { direction, ema: ema8, strength: strength * 100 };
  }

  /**
   * Check if market conditions allow signals
   */
  private isValidMarketCondition(): boolean {
    if (this.higherTFCandles.length < 20) return false;

    // Reject ranging markets
    if (MarketStructureAnalyzer.isRanging(this.higherTFCandles)) {
      return false;
    }

    // Reject low volatility
    const volatility = MarketStructureAnalyzer.getVolatility(this.higherTFCandles);
    if (volatility < 0.0001) {
      return false; // Too low volatility
    }

    return true;
  }

  /**
   * Analyze entry timeframe confirmation
   */
  private analyzeEntryConfirmation(
    trend: TrendDirection,
    higherEMA: number
  ): { priceAction: any; strength: number; reasons: string[] } {
    const reasons: string[] = [];
    let strength = 0;

    if (this.entryTFCandles.length < 5) {
      return { priceAction: {}, strength: 0, reasons };
    }

    const prices = this.entryTFCandles.map(c => c.close);
    const ema8 = EMACalculator.getLatestEMA(prices, 8);

    const priceAction = {
      bullishEngulfing: PriceActionAnalyzer.isBullishEngulfing(this.entryTFCandles),
      bearishEngulfing: PriceActionAnalyzer.isBearishEngulfing(this.entryTFCandles),
      bullishPinBar: PriceActionAnalyzer.isBullishPinBar(this.entryTFCandles),
      bearishPinBar: PriceActionAnalyzer.isBearishPinBar(this.entryTFCandles),
      higherLow: PriceActionAnalyzer.hasHigherLow(this.entryTFCandles),
      lowerHigh: PriceActionAnalyzer.hasLowerHigh(this.entryTFCandles),
      higherHigh: PriceActionAnalyzer.hasHigherHigh(this.entryTFCandles),
      lowerLow: PriceActionAnalyzer.hasLowerLow(this.entryTFCandles),
      momentumCandle: PriceActionAnalyzer.isMomentumCandle(
        this.entryTFCandles,
        trend === 'BULLISH'
      ),
      breakOfStructure: PriceActionAnalyzer.isBreakOfStructure(
        this.entryTFCandles,
        trend === 'BULLISH'
      ),
      emaRetest: PriceActionAnalyzer.isEMARetest(
        this.entryTFCandles[this.entryTFCandles.length - 1],
        higherEMA
      ),
    };

    strength = PriceActionAnalyzer.getPriceActionStrength(
      this.entryTFCandles,
      trend,
      higherEMA
    );

    // Build reasons array
    if (trend === 'BULLISH') {
      if (priceAction.bullishEngulfing) reasons.push('Bullish Engulfing');
      if (priceAction.bullishPinBar) reasons.push('Bullish Pin Bar');
      if (priceAction.higherLow) reasons.push('Higher Low');
      if (priceAction.higherHigh) reasons.push('Higher High');
      if (priceAction.momentumCandle) reasons.push('Momentum Candle');
      if (priceAction.breakOfStructure) reasons.push('Break of Structure');
      if (priceAction.emaRetest) reasons.push('EMA Retest');
    } else {
      if (priceAction.bearishEngulfing) reasons.push('Bearish Engulfing');
      if (priceAction.bearishPinBar) reasons.push('Bearish Pin Bar');
      if (priceAction.lowerHigh) reasons.push('Lower High');
      if (priceAction.lowerLow) reasons.push('Lower Low');
      if (priceAction.momentumCandle) reasons.push('Momentum Candle');
      if (priceAction.breakOfStructure) reasons.push('Break of Structure');
      if (priceAction.emaRetest) reasons.push('EMA Retest');
    }

    return { priceAction, strength, reasons };
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    trendStrength: number,
    paStrength: number,
    rrRatio: number
  ): number {
    // Weighted confidence calculation
    const trendWeight = trendStrength * 0.3; // 30%
    const paWeight = paStrength * 0.5; // 50%
    const rrWeight = Math.min(rrRatio / 5, 1) * 100 * 0.2; // 20%

    const confidence = trendWeight + paWeight + rrWeight;

    return Math.min(confidence, 100);
  }

  /**
   * Main signal generation method
   */
  generateSignal(): Signal | null {
    // Step 1: Validate market conditions
    if (!this.isValidMarketCondition()) {
      return null;
    }

    // Step 2: Analyze trend
    const trendAnalysis = this.analyzeTrend();
    if (trendAnalysis.direction === 'NEUTRAL') {
      return null;
    }

    // Step 3: Analyze entry confirmation
    const confirmation = this.analyzeEntryConfirmation(
      trendAnalysis.direction,
      trendAnalysis.ema
    );

    // Step 4: Minimum reasons check (at least 3 confirmations)
    if (confirmation.reasons.length < 3) {
      return null;
    }

    // Step 5: Calculate entry, SL, TP
    const entryData = EntryExitCalculator.calculateEntry(
      this.entryTFCandles,
      trendAnalysis.direction,
      trendAnalysis.ema
    );

    if (!entryData) return null;

    const sl = EntryExitCalculator.calculateStopLoss(
      this.entryTFCandles,
      trendAnalysis.direction
    );

    if (!sl) return null;

    // Try multiple RR ratios (prefer 1:4 or 1:5, minimum 1:3)
    let tp: number | null = null;
    let selectedRRRatio = 3;

    for (const ratio of [5, 4, 3]) {
      const potentialTP = EntryExitCalculator.calculateTakeProfit(
        entryData.price,
        sl,
        ratio,
        trendAnalysis.direction
      );

      const rr = EntryExitCalculator.calculateRiskReward(
        entryData.price,
        sl,
        potentialTP
      );

      if (EntryExitCalculator.validateRiskReward(rr, ratio)) {
        tp = potentialTP;
        selectedRRRatio = ratio;
        break;
      }
    }

    if (!tp) return null;

    // Step 6: Calculate confidence
    const rr = EntryExitCalculator.calculateRiskReward(entryData.price, sl, tp);
    const confidence = this.calculateConfidence(
      trendAnalysis.strength,
      confirmation.strength,
      rr.ratio
    );

    if (confidence < this.minConfidence) {
      return null;
    }

    // Step 7: Build signal
    const signal: Signal = {
      id: `${this.symbol}-${Date.now()}`,
      symbol: this.symbol,
      type: trendAnalysis.direction === 'BULLISH' ? 'BUY' : 'SELL',
      trend: trendAnalysis.direction,
      timeframe: '5M',
      entry: entryData.price,
      stopLoss: sl,
      takeProfit: tp,
      riskReward: rr.ratio,
      confidence: Math.round(confidence),
      probability: Math.round(confidence), // Confidence ≈ Probability
      reasons: confirmation.reasons,
      priceAction: confirmation.priceAction,
      timestamp: Date.now(),
      status: 'ACTIVE',
      market: this.market,
    };

    return signal;
  }

  /**
   * Get current trend without generating signal
   */
  getCurrentTrend(): TrendDirection {
    const trend = this.analyzeTrend();
    return trend.direction;
  }

  /**
   * Get recent signals (historical)
   */
  getSignalHistory(): Signal[] {
    // This would be implemented with database lookup
    // For now, return empty array
    return [];
  }
}

export default TradingEngine;
