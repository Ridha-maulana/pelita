import type { Trade } from './types';
import { addDaysKey, sessionOf3, tradingDayKey, weekStartKey, wibParts } from './time';
import { pipsOf } from './trading';
import { tradeDate } from './period';
import { MONTHS_ID } from './format';

/** Skala kandel: H1 = per jam, SES = per sesi, D1 = hari trading (mulai 07:00 WIB), W1 = minggu, M1 = bulan, Y1 = tahun. */
export type Tf = 'H1' | 'SES' | 'D1' | 'W1' | 'M1' | 'Y1';
export const TIMEFRAMES: readonly (readonly [Tf, string])[] = [['H1', '1H'], ['SES', '1S'], ['D1', '1D'], ['W1', '1W'], ['M1', '1M'], ['Y1', '1Y']];

export interface Candle {
  k: string; label: string; short: string;
  /** open, high, low, close dari P&L kumulatif */
  o: number; h: number; l: number; c: number;
  n: number;
  /** pips kumulatif di awal dan akhir kandel */
  po: number; pc: number;
  ids: string[];
}

const SES_LABEL = { Asia: 'Asia', London: 'London', 'New York': 'New York' } as const;
const SES_SHORT = { Asia: 'AS', London: 'LDN', 'New York': 'NY' } as const;
const dayLabel = (day: string) => `${day.slice(8, 10)} ${MONTHS_ID[Number(day.slice(5, 7)) - 1]}`;
const p2 = (n: number) => String(n).padStart(2, '0');

/**
 * Kandel ekuitas (P&L kumulatif) dari trade closed. Penggabungan OHLC standar:
 * open = awal, close = akhir, high/low = ekstrem seluruh langkah. Input dipakai menurut waktu close.
 */
export function buildCandles(trades: Trade[], tf: Tf): Candle[] {
  const sorted = trades.filter(t => t.status === 'closed' && !t.deletedAt).sort((a, b) => Date.parse(tradeDate(a)) - Date.parse(tradeDate(b)) || a.id.localeCompare(b.id));
  const out: Candle[] = [];
  let eq = 0, pq = 0;
  let cur: Candle | null = null;
  for (const t of sorted) {
    const d = tradeDate(t);
    const w = wibParts(d);
    const tday = tradingDayKey(d);
    const hh = p2(w.hour);
    let k: string, label: string, short: string;
    if (tf === 'H1') {
      k = `${w.dayKey} ${hh}`; label = `${dayLabel(w.dayKey)} ${hh}:00`; short = `${w.dayKey.slice(8, 10)}/${w.dayKey.slice(5, 7)} ${hh}`;
    } else if (tf === 'SES') {
      const s = sessionOf3(d);
      k = `${tday}|${s}`; label = `${dayLabel(tday)} · ${SES_LABEL[s]}`; short = `${tday.slice(8, 10)}/${tday.slice(5, 7)} ${SES_SHORT[s]}`;
    } else if (tf === 'W1') {
      const mon = weekStartKey(tday);
      k = mon; label = `Minggu ${dayLabel(mon)} – ${dayLabel(addDaysKey(mon, 4))}`; short = dayLabel(mon);
    } else if (tf === 'M1') {
      // bulan & tahun mengikuti tanggal kalender (sama dengan Advanced Statistics), bukan hari trading
      k = w.monthKey; label = `${MONTHS_ID[w.month - 1]} ${w.year}`; short = MONTHS_ID[w.month - 1]!;
    } else if (tf === 'Y1') {
      k = String(w.year); label = `Tahun ${w.year}`; short = String(w.year);
    } else {
      k = tday; label = dayLabel(tday); short = dayLabel(tday);
    }
    const before = eq, after = eq + (Number(t.pnl) || 0);
    const pb = pq, pa = pq + pipsOf(t);
    eq = after; pq = pa;
    if (cur && cur.k === k) {
      cur.c = after; cur.h = Math.max(cur.h, before, after); cur.l = Math.min(cur.l, before, after); cur.n++; cur.pc = pa; cur.ids.push(t.id);
    } else {
      cur = { k, label, short, o: before, c: after, h: Math.max(before, after), l: Math.min(before, after), n: 1, po: pb, pc: pa, ids: [t.id] };
      out.push(cur);
    }
  }
  return out;
}

/** Angka ringkas untuk sumbu: 1.25k, +340, -12.50. */
export function candleNum(v: number): string {
  const a = Math.abs(v);
  const s = a >= 10000 ? (a / 1000).toFixed(1) + 'k' : a >= 1000 ? (a / 1000).toFixed(2) + 'k' : a >= 100 ? a.toFixed(0) : a.toFixed(2);
  return (v < 0 ? '-' : v > 0 ? '+' : '') + s;
}
