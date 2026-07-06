import { Signal } from './types';

/**
 * Zustand Store for Signal Management
 * Manages global state for signals, market data, and user preferences
 */

interface SignalStore {
  // Signals
  signals: Signal[];
  activeSignals: Signal[];
  addSignal: (signal: Signal) => void;
  updateSignal: (id: string, status: Signal['status']) => void;
  clearOldSignals: (hours: number) => void;

  // Market Data
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  selectedTimeframe: string;
  setSelectedTimeframe: (timeframe: string) => void;

  // UI State
  darkMode: boolean;
  toggleDarkMode: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;

  // Watchlist
  watchlist: string[];
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  isFavorite: (symbol: string) => boolean;

  // Notifications
  notifications: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>;
  addNotification: (message: string, type: string) => void;
  removeNotification: (id: string) => void;
}

/**
 * Store implementation using localStorage for persistence
 */
export class SignalStateManager {
  private signals: Signal[] = [];
  private watchlist: string[] = [];
  private darkMode: boolean = true;
  private selectedSymbol: string = 'BTCUSDT';
  private selectedTimeframe: string = '5M';

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load state from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('mrtradow_state');
      if (stored) {
        const state = JSON.parse(stored);
        this.signals = state.signals || [];
        this.watchlist = state.watchlist || [];
        this.darkMode = state.darkMode ?? true;
        this.selectedSymbol = state.selectedSymbol || 'BTCUSDT';
        this.selectedTimeframe = state.selectedTimeframe || '5M';
      }
    } catch (error) {
      console.error('Error loading state from storage:', error);
    }
  }

  /**
   * Save state to localStorage
   */
  private saveToStorage(): void {
    try {
      const state = {
        signals: this.signals,
        watchlist: this.watchlist,
        darkMode: this.darkMode,
        selectedSymbol: this.selectedSymbol,
        selectedTimeframe: this.selectedTimeframe,
      };
      localStorage.setItem('mrtradow_state', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving state to storage:', error);
    }
  }

  /**
   * Add signal
   */
  addSignal(signal: Signal): void {
    this.signals.push(signal);
    // Keep only last 100 signals
    if (this.signals.length > 100) {
      this.signals = this.signals.slice(-100);
    }
    this.saveToStorage();
  }

  /**
   * Update signal status
   */
  updateSignal(id: string, status: Signal['status']): void {
    const signal = this.signals.find(s => s.id === id);
    if (signal) {
      signal.status = status;
      this.saveToStorage();
    }
  }

  /**
   * Get active signals
   */
  getActiveSignals(): Signal[] {
    return this.signals.filter(s => s.status === 'ACTIVE');
  }

  /**
   * Get recent signals (last N hours)
   */
  getRecentSignals(hours: number = 24): Signal[] {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
    return this.signals.filter(s => s.timestamp > cutoffTime);
  }

  /**
   * Clear old signals
   */
  clearOldSignals(hours: number = 72): void {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
    this.signals = this.signals.filter(s => s.timestamp > cutoffTime);
    this.saveToStorage();
  }

  /**
   * Watchlist operations
   */
  addToWatchlist(symbol: string): void {
    if (!this.watchlist.includes(symbol)) {
      this.watchlist.push(symbol);
      this.saveToStorage();
    }
  }

  removeFromWatchlist(symbol: string): void {
    this.watchlist = this.watchlist.filter(s => s !== symbol);
    this.saveToStorage();
  }

  isFavorite(symbol: string): boolean {
    return this.watchlist.includes(symbol);
  }

  getWatchlist(): string[] {
    return this.watchlist;
  }

  /**
   * Theme operations
   */
  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    this.saveToStorage();
  }

  isDarkMode(): boolean {
    return this.darkMode;
  }

  /**
   * Symbol/Timeframe selection
   */
  setSelectedSymbol(symbol: string): void {
    this.selectedSymbol = symbol;
    this.saveToStorage();
  }

  getSelectedSymbol(): string {
    return this.selectedSymbol;
  }

  setSelectedTimeframe(timeframe: string): void {
    this.selectedTimeframe = timeframe;
    this.saveToStorage();
  }

  getSelectedTimeframe(): string {
    return this.selectedTimeframe;
  }

  /**
   * Signal statistics
   */
  getStatistics() {
    const active = this.getActiveSignals();
    const recent = this.getRecentSignals(24);

    const wins = recent.filter(s => s.status === 'HIT_TP').length;
    const losses = recent.filter(s => s.status === 'HIT_SL').length;
    const total = wins + losses;

    return {
      activeSignals: active.length,
      recentSignals: recent.length,
      winRate: total > 0 ? ((wins / total) * 100).toFixed(2) : '0',
      wins,
      losses,
      totalSignals: this.signals.length,
    };
  }
}

export default SignalStateManager;
