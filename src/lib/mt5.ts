// Membaca teks OCR dari screenshot Riwayat MT5 (tab Posisi) dan mengubah jam server MT5 ke WIB.
import { SYMBOLS } from '../domain/trading';
import type { ExitMethod, Side } from '../domain/types';

export const MT5_TZ_OPTIONS = [
  { v: 'auto-us', l: 'GMT+2 / GMT+3 otomatis (umum: XM, MRG)' },
  { v: 'gmt2', l: 'GMT+2 tetap' },
  { v: 'gmt3', l: 'GMT+3 tetap' },
  { v: 'gmt0', l: 'GMT+0' },
  { v: 'wib', l: 'Sudah WIB (tanpa konversi)' }
] as const;
export type Mt5Tz = (typeof MT5_TZ_OPTIONS)[number]['v'];
const TZ_KEY = 'pelita-mt5-tz';

export function mt5GetTz(): Mt5Tz {
  try { const v = localStorage.getItem(TZ_KEY); if (MT5_TZ_OPTIONS.some(o => o.v === v)) return v as Mt5Tz; } catch { /* */ }
  return 'auto-us';
}
export function mt5SetTz(v: Mt5Tz) { try { localStorage.setItem(TZ_KEY, v); } catch { /* */ } }

/** Hari ke-n hari Minggu dalam bulan (jam musim panas AS: Minggu ke-2 Maret s.d. Minggu ke-1 November). */
const nthSunday = (y: number, m0: number, n: number) => { const first = new Date(Date.UTC(y, m0, 1)).getUTCDay(); return 1 + ((7 - first) % 7) + (n - 1) * 7; };
function offsetHours(mode: Mt5Tz, y: number, mo: number, d: number): number {
  if (mode === 'gmt2') return 2;
  if (mode === 'gmt3') return 3;
  if (mode === 'gmt0') return 0;
  if (mode === 'wib') return 7;
  const start = Date.UTC(y, 2, nthSunday(y, 2, 2));
  const end = Date.UTC(y, 10, nthSunday(y, 10, 1));
  const cur = Date.UTC(y, mo - 1, d);
  return cur >= start && cur < end ? 3 : 2;
}

/** "2026.10.27 08:15:01" (jam server) → "2026-10-27T12:15" (WIB). */
export function mt5ToWib(str: string, mode: Mt5Tz): string {
  const m = String(str || '').match(/(\d{4})[.\-/](\d{2})[.\-/](\d{2})[ T]+(\d{1,2}):(\d{2})/);
  if (!m) return '';
  const y = +m[1]!, mo = +m[2]!, d = +m[3]!, h = +m[4]!, mi = +m[5]!;
  if (mode === 'wib') return `${m[1]}-${m[2]}-${m[3]}T${String(h).padStart(2, '0')}:${m[5]}`;
  const off = offsetHours(mode, y, mo, d);
  const ms = Date.UTC(y, mo - 1, d, h, mi) - off * 3600000 + 7 * 3600000;
  return new Date(ms).toISOString().slice(0, 16);
}

const NUM = /-?\d{1,3}(?:[\u00a0\u202f\u2009 ]\d{3})+[.,]\d+|-?\d+[.,]\d+/g;
const DT = /(\d{4})[.\-/](\d{2})[.\-/](\d{2})[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?/;
const HEAD = /([A-Za-z][A-Za-z0-9._]{1,14})\s*[,;]\s*(buy|b[uv]y|se[l1!|iI]{1,3})\s+(\d+(?:[.,]\d+)?)/i;
const toNum = (s: string) => Number(String(s).replace(/[\u00a0\u202f\u2009 ]/g, '').replace(',', '.'));
const numbers = (line: string) => (String(line).match(NUM) ?? []).map(toNum);

/** Samakan nama simbol broker (XAUUSDm, GOLD., EURUSD.pro) dengan daftar simbol aplikasi. */
export function mt5NormSymbol(raw: string): string | null {
  const u = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!u) return null;
  if (SYMBOLS.includes(u)) return u;
  const hit = SYMBOLS.find(s => u.startsWith(s));
  if (hit) return hit;
  if (u.startsWith('XAU')) return 'XAUUSD';
  if (u.startsWith('GOLD')) return 'GOLD';
  return null;
}

export interface Mt5Row {
  symbolRaw: string; symbol: string | null; side: Side; lots: number;
  closeTime: string; openTime: string; ticket: string;
  entry: number | null; exit: number | null; profit: number | null;
  sl: number | null; tp: number | null; swap: number; commission: number; detailed?: boolean;
}

/** Hasil: semua baris terbaca + baris terbaik (yang punya detail lengkap dulu). */
export function parseMt5Text(text: string): { rows: Mt5Row[]; pick: Mt5Row | null } {
  const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rows: Mt5Row[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i]!.match(HEAD);
    if (!m) continue;
    const side: Side = /^b/i.test(m[2]!) ? 'Long' : 'Short';
    const lots = toNum(m[3]!);
    const dt = lines[i]!.match(DT);
    const row: Mt5Row = { symbolRaw: m[1]!, symbol: mt5NormSymbol(m[1]!), side, lots, closeTime: dt ? dt[0] : '', openTime: '', ticket: '', entry: null, exit: null, profit: null, sl: null, tp: null, swap: 0, commission: 0 };
    // baris harga: entry → exit, profit
    let after = i;
    for (let j = i + 1; j <= Math.min(i + 2, lines.length - 1); j++) {
      if (HEAD.test(lines[j]!)) break;
      const nums = numbers(lines[j]!);
      if (nums.length >= 2) {
        row.entry = Math.abs(nums[0]!); row.exit = Math.abs(nums[1]!);
        if (nums.length >= 3) row.profit = Math.abs(nums[2]!);
        after = j;
        break;
      }
    }
    if (row.entry === null || row.exit === null) continue;
    // tanda profit dari arah dan harga (lebih andal daripada tanda minus hasil OCR)
    if (row.profit !== null) {
      const move = side === 'Long' ? row.exit - row.entry : row.entry - row.exit;
      row.profit = (move < 0 ? -1 : 1) * row.profit;
    }
    // blok detail (ada bila posisi diketuk/dibuka): #tiket, waktu buka, S/L, T/P, swap, komisi
    for (let j = after + 1; j <= Math.min(after + 4, lines.length - 1); j++) {
      if (HEAD.test(lines[j]!)) break;
      const tk = lines[j]!.match(/#\s*(\d{5,})/);
      if (tk && !row.ticket) {
        row.ticket = tk[1]!;
        const od = lines[j]!.match(DT);
        if (od) row.openTime = od[0];
        const a = lines[j + 1], b = lines[j + 2];
        if (a && !HEAD.test(a)) { const n = numbers(a); if (n.length >= 1) row.sl = Math.abs(n[0]!) || null; if (n.length >= 2) row.swap = n[1]!; }
        if (b && !HEAD.test(b)) { const n = numbers(b); if (n.length >= 1) row.tp = Math.abs(n[0]!) || null; if (n.length >= 2) row.commission = n[1]!; }
        break;
      }
    }
    row.detailed = !!row.ticket;
    rows.push(row);
  }
  const pick = rows.find(r => r.detailed) ?? rows[0] ?? null;
  return { rows, pick };
}

/** Isi awal form Catat trade dari hasil baca. Waktu dalam format input WIB (YYYY-MM-DDTHH:mm). */
export interface Prefill {
  symbol: string; symbolRaw?: string; symbolKnown: boolean; side: Side;
  entry: number; exit: number | null; lots: number; sl: number | null; tp: number | null; fees: number;
  exitMethod: ExitMethod; ticket?: string; profit?: number | null; net?: number | null;
  opened: string; closed: string; chart?: boolean; notes?: string[]; hasOpen?: boolean;
}
export function buildPrefill(row: Mt5Row, tz: Mt5Tz): Prefill {
  const entry = row.entry ?? 0;
  const tol = Math.max(0.011, Math.abs(entry) * 0.0001); // toleransi selip harga (slippage)
  const near = (a: number | null, b: number | null) => a != null && b != null && Math.abs(a - b) <= tol;
  const method: ExitMethod = near(row.exit, row.tp) ? 'TP' : near(row.exit, row.sl) ? 'SL' : 'Manual';
  const feeTotal = -((Number(row.swap) || 0) + (Number(row.commission) || 0));
  const net = row.profit == null ? null : row.profit + (Number(row.swap) || 0) + (Number(row.commission) || 0);
  return {
    symbol: row.symbol ?? 'XAUUSD', symbolRaw: row.symbolRaw, symbolKnown: !!row.symbol, side: row.side, entry, exit: row.exit, lots: row.lots,
    sl: row.sl, tp: row.tp, fees: Math.round(feeTotal * 100) / 100, exitMethod: method, ticket: row.ticket, profit: row.profit, net,
    hasOpen: !!row.openTime, opened: mt5ToWib(row.openTime || row.closeTime, tz), closed: mt5ToWib(row.closeTime, tz)
  };
}

export interface ChartRead { chart: true; symbolRaw: string; symbol: string | null; side: Side; lots: number | null; entry: number; sl: number | null; tp: number | null; notes: string[] }
/** Hasil baca grafik MT5 (posisi open) → isi awal form. Waktu buka tidak ada di grafik; diisi waktu sekarang oleh form. */
export function buildChartPrefill(ch: ChartRead): Prefill {
  return {
    chart: true, notes: ch.notes, symbol: ch.symbol ?? 'XAUUSD', symbolRaw: ch.symbolRaw, symbolKnown: !!ch.symbol, side: ch.side,
    entry: ch.entry, exit: null, lots: ch.lots ?? 0.01, sl: ch.sl, tp: ch.tp, fees: 0, exitMethod: 'Manual', opened: '', closed: ''
  };
}
