import type { Trade } from './types';
import { daysInMonth, mondayOffset, sessionOfHour, wibParts, type SessionName } from './time';
import { pipsOf } from './trading';
import { tradeDate } from './period';
import { MONTHS_ID } from './format';

export const DD_MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'] as const;
export const DD_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] as const;
export const DD_WEEKEND = 'Akhir pekan (Sab–Min)';
export const DD_SESSIONS: readonly SessionName[] = ['Asia', 'London', 'New York', 'Overlap'];
export const DD_LEVELS = ['Bulan', 'Minggu', 'Hari', 'Sesi', 'Win/Loss'] as const;

export interface DdRec {
  /** 'YYYY-MM' */ mk: string;
  /** 'YYYY-MM-DD' */ iso: string;
  /** minggu ke-n dalam bulan (minggu 1 berisi tanggal 1; kalender mulai Senin) */ wk: number;
  /** 0=Senin..5=akhir pekan */ di: number;
  day: string;
  ses: SessionName;
  pnl: number;
  pips: number;
}

export function ddBuild(trades: Trade[]): DdRec[] {
  const out: DdRec[] = [];
  for (const t of trades) {
    if (t.status !== 'closed' || t.deletedAt) continue;
    const w = wibParts(tradeDate(t));
    const off = mondayOffset(w.year, w.month);
    const di = Math.min((w.weekday + 6) % 7, 5);
    out.push({ mk: w.monthKey, iso: w.dayKey, wk: Math.floor((w.day - 1 + off) / 7) + 1, di, day: di < 5 ? DD_DAYS[di]! : DD_WEEKEND, ses: sessionOfHour(w.hour), pnl: Number(t.pnl) || 0, pips: pipsOf(t) });
  }
  return out;
}

export interface DdStat {
  n: number; wins: number; losses: number; wr: number; profit: number; pips: number; avgWin: number; avgLoss: number;
  days: number; weeks: number; sessions: number;
}
export function ddStat(rs: DdRec[]): DdStat {
  const w = rs.filter(r => r.pnl > 0), l = rs.filter(r => r.pnl < 0);
  const sum = (a: DdRec[], k: 'pnl' | 'pips' = 'pnl') => a.reduce((x, r) => x + r[k], 0);
  return {
    n: rs.length, wins: w.length, losses: l.length, wr: rs.length ? (w.length / rs.length) * 100 : 0, profit: sum(rs), pips: sum(rs, 'pips'),
    avgWin: w.length ? sum(w) / w.length : 0, avgLoss: l.length ? sum(l) / l.length : 0,
    days: new Set(rs.map(r => r.iso)).size, weeks: new Set(rs.map(r => r.mk + r.wk)).size, sessions: new Set(rs.map(r => r.ses)).size
  };
}

const ym = (mk: string) => ({ y: Number(mk.slice(0, 4)), m: Number(mk.slice(5, 7)) });
export const weeksIn = (mk: string): number => { const { y, m } = ym(mk); return Math.floor((daysInMonth(y, m) - 1 + mondayOffset(y, m)) / 7) + 1; };
/** Rentang tanggal sebuah minggu, mis. "6–12 Okt". */
export function wkRange(mk: string, wk: number): string {
  const { y, m } = ym(mk);
  const dim = daysInMonth(y, m), off = mondayOffset(y, m);
  const a = Math.max(1, (wk - 1) * 7 - off + 1), b = Math.min(dim, (wk - 1) * 7 - off + 7);
  return a === b ? `${a} ${MONTHS_ID[m - 1]}` : `${a}–${b} ${MONTHS_ID[m - 1]}`;
}
