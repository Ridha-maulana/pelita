import type { Currency } from './types';

const SYM: Record<Currency, string> = { USD: '$', EUR: '€', IDR: 'Rp', GBP: '£' };
export const currencySymbol = (c: Currency | string) => (SYM as Record<string, string>)[c] ?? '';

export function money(n: number, currency: Currency | string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2
  }).format(Number(n) || 0);
}

export const number = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(n) || 0);

export const signed = (n: number, d = 1) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${Math.abs(n).toFixed(d)}`;
export const signedMoney = (n: number, cur: Currency | string) => `${n > 0 ? '+' : ''}${money(n, cur)}`;
export const pctS = (v: number) => `${signed(Number(v) || 0, 2)}%`;
export const pipsS = (v: number) => `${signed(Number(v) || 0, 1)} pips`;
export const tone = (n: number): 'pos' | 'neg' | '' => (n > 0 ? 'pos' : n < 0 ? 'neg' : '');

export function fmtHold(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return '—';
  if (min < 60) return `${Math.round(min)} mnt`;
  if (min < 1440) {
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    return m ? `${h} j ${m} mnt` : `${h} j`;
  }
  const d = Math.floor(min / 1440), h = Math.round((min % 1440) / 60);
  return h ? `${d} hr ${h} j` : `${d} hr`;
}

export const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] as const;
