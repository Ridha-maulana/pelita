import type { Trade } from './types';
import { dayKeyOf, toMs, wibParts, addDaysKey } from './time';

export type Period = 'All time' | 'Year-to-date' | 'Monthly' | 'Weekly' | 'Custom date range';
export const PERIODS: readonly Period[] = ['All time', 'Year-to-date', 'Monthly', 'Weekly', 'Custom date range'];

/** Tanggal yang dipakai untuk filter & pengelompokan: waktu close (jika sudah close), bila tidak waktu buka. */
export const tradeDate = (t: Pick<Trade, 'openedAt' | 'closedAt'>): string => t.closedAt ?? t.openedAt;

export interface PeriodOpts {
  period: Period;
  start?: string; // 'YYYY-MM-DD'
  end?: string;
  now?: number;
}

export function inPeriod(t: Pick<Trade, 'openedAt' | 'closedAt'>, o: PeriodOpts): boolean {
  const d = tradeDate(t);
  const key = dayKeyOf(d);
  const now = wibParts(o.now ?? Date.now());
  switch (o.period) {
    case 'All time':
      return true;
    case 'Year-to-date':
      return wibParts(d).year === now.year;
    case 'Monthly':
      return wibParts(d).monthKey === now.monthKey;
    case 'Weekly':
      return toMs(d) >= (o.now ?? Date.now()) - 7 * 86_400_000;
    case 'Custom date range':
      if (o.start && key < o.start) return false;
      if (o.end && key > o.end) return false;
      return true;
  }
}

export const periodLabel = (o: PeriodOpts): string =>
  o.period === 'Custom date range' ? `${o.start ?? '…'} – ${o.end ?? '…'}` : o.period;

export { addDaysKey };
