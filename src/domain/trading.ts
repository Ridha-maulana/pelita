import type { Account, Trade } from './types';

export const CONTRACT_SIZES: Readonly<Record<string, number>> = {
  XAUUSD: 100, GOLD: 100, EURUSD: 100000, GBPUSD: 100000, USDJPY: 100000, GBPJPY: 100000,
  AUDUSD: 100000, USDCAD: 100000, USDCHF: 100000, NAS100: 1, BTCUSD: 1
};
export const SYMBOLS = Object.keys(CONTRACT_SIZES);
export const contractSize = (symbol: string) => CONTRACT_SIZES[symbol] ?? 100000;

const num = (v: unknown) => (v === null || v === undefined || v === '' ? NaN : Number(v));
const hasNum = (v: unknown): v is number => Number.isFinite(num(v));

/** P&L = ±(exit−entry) × lots × ukuran kontrak − fees. Belum ada exit → 0. */
export function pnlFor(t: Pick<Trade, 'side' | 'entry' | 'lots' | 'symbol' | 'fees'>, exit: number | null): number {
  if (!hasNum(exit)) return 0;
  const diff = t.side === 'Long' ? exit - t.entry : t.entry - exit;
  return diff * t.lots * contractSize(t.symbol) - (Number(t.fees) || 0);
}

export const riskFor = (entry: number, sl: number | null, lots: number, symbol: string): number =>
  entry && hasNum(sl) && sl !== 0 && lots ? Math.abs(entry - sl) * lots * contractSize(symbol) : 0;

export const rewardFor = (entry: number, tp: number | null, lots: number, symbol: string): number =>
  entry && hasNum(tp) && tp !== 0 && lots ? Math.abs(tp - entry) * lots * contractSize(symbol) : 0;

export function pipSizeOf(symbol: string): number {
  const u = String(symbol || '').toUpperCase();
  if (u.includes('XAU') || u === 'GOLD') return 0.1;
  if (u.includes('XAG')) return 0.01;
  if (u.includes('JPY')) return 0.01;
  if (/BTC|ETH|NAS|US30|SPX/.test(u)) return 1;
  return 0.0001;
}

export function pipsOf(t: Pick<Trade, 'side' | 'entry' | 'exit' | 'symbol' | 'status'>): number {
  if (t.status !== 'closed' || !hasNum(t.exit)) return 0;
  const d = t.side === 'Long' ? t.exit - t.entry : t.entry - t.exit;
  return d / pipSizeOf(t.symbol);
}

export const isClosed = (t: Trade) => t.status === 'closed' && !t.deletedAt;
export const liveTrades = (a: Account) => a.trades.filter(t => !t.deletedAt);
