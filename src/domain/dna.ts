import type { Trade } from './types';
import type { Stats } from './stats';

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

export type DnaKey = 'konsistensi' | 'profit' | 'risiko' | 'disiplin' | 'ketahanan';
export type Grade = 'A' | 'B' | 'C' | 'D' | 'E';

export interface DnaDim {
  key: DnaKey;
  name: string;
  short: string;
  score: number;
  meta: string;
  desc: string;
  band: 0 | 1 | 2; // 0 kuat, 1 cukup, 2 perlu perbaikan
}

export interface Dna {
  ready: boolean; // butuh >= 3 trade closed
  dims: DnaDim[];
  overall: number;
  grade: Grade;
  strongest: DnaDim;
  weakest: DnaDim;
}

export const BAND_LABEL = ['Kuat', 'Cukup', 'Perlu perbaikan'] as const;
export const gradeOf = (v: number): Grade => (v >= 85 ? 'A' : v >= 70 ? 'B' : v >= 55 ? 'C' : v >= 40 ? 'D' : 'E');
const bandOf = (v: number): 0 | 1 | 2 => (v >= 75 ? 0 : v >= 50 ? 1 : 2);

/** Skor Trader DNA — lima dimensi, rumus sama dengan Edge Journal. `sorted` = trade closed urut waktu. */
export function computeDna(s: Stats, sorted: Trade[]): Dna {
  const n = sorted.length;
  const mKeys = Object.keys(s.monthPnl);
  const mWin = mKeys.filter(k => s.monthPnl[k]! > 0).length;
  const dWin = s.dayKeys.filter(k => s.dayPnl[k]! > 0).length;
  const dd = (s.maxDrawdown / Math.max(s.balance, 1)) * 100;
  const rf = s.maxDrawdown ? s.total / s.maxDrawdown : s.total > 0 ? 3 : 0;
  const pf = s.profitFactor === Infinity ? 3 : s.profitFactor;
  const slPct = n ? (sorted.filter(t => t.sl !== null && t.sl !== undefined).length / n) * 100 : 0;
  const lots = sorted.map(t => Number(t.lots) || 0);
  const mean = lots.length ? lots.reduce((a, b) => a + b, 0) / lots.length : 0;
  const cv = mean ? Math.sqrt(lots.reduce((a, b) => a + (b - mean) ** 2, 0) / lots.length) / mean : 0;
  let mart = 0;
  sorted.forEach((t, i) => {
    if (i > 0 && sorted[i - 1]!.pnl < 0 && (Number(t.lots) || 0) > (Number(sorted[i - 1]!.lots) || 0) * 1.5) mart++;
  });
  const martFlag = mart >= 2;
  const maxStreak = s.maxLossStreak;

  const sKons = Math.round((mKeys.length ? (mWin / mKeys.length) * 100 : 0) * 0.5 + (s.dayKeys.length ? (dWin / s.dayKeys.length) * 100 : 0) * 0.5);
  const sProf = Math.round(clamp((pf - 0.5) / 2) * 100 * 0.6 + clamp((s.expectancyR + 0.2) / 0.8) * 100 * 0.4);
  const sRisk = Math.round(clamp(1 - dd / 30) * 100 * 0.6 + clamp(rf / 3) * 100 * 0.4);
  const sDisc = Math.round(slPct * 0.5 + clamp(1 - cv) * 100 * 0.3 + (martFlag ? 0 : 100) * 0.2);
  const sRes = Math.round(clamp(1 - (Math.max(maxStreak, 1) - 1) / 9) * 100 * 0.6 + clamp(rf / 3) * 100 * 0.4);

  const mk = (key: DnaKey, name: string, short: string, score: number, meta: string, desc: string): DnaDim =>
    ({ key, name, short, score, meta, desc, band: bandOf(score) });

  const dims = [
    mk('konsistensi', 'Konsistensi', 'Konsistensi', sKons,
      `${mWin}/${mKeys.length} bulan profit · ${s.dayKeys.length ? Math.round((dWin / s.dayKeys.length) * 100) : 0}% hari profit`,
      'Seberapa teratur profit datang — dihitung dari persentase bulan dan hari yang berakhir profit.'),
    mk('profit', 'Profitabilitas', 'Profit', sProf,
      `Profit Factor ${s.profitFactor === Infinity ? '∞' : s.profitFactor.toFixed(2)} · ekspektasi ${s.expectancyR > 0 ? '+' : ''}${s.expectancyR.toFixed(2)}R/trade`,
      'Kualitas cuan — dari Profit Factor (total profit ÷ total rugi) dan ekspektasi rata-rata per trade.'),
    mk('risiko', 'Manajemen Risiko', 'Risiko', sRisk,
      `Max drawdown ${dd.toFixed(1)}% · recovery ${rf.toFixed(1)}×`,
      'Ketahanan modal — dari max drawdown (penurunan terdalam) dan recovery factor (profit ÷ drawdown).'),
    mk('disiplin', 'Disiplin', 'Disiplin', sDisc,
      `Lot ${cv < 0.25 ? 'Stabil' : 'Agresif'} · SL dipakai di ${slPct.toFixed(0)}% trade${martFlag ? ' · terdeteksi martingale' : ''}`,
      'Kepatuhan pada aturan — dari kestabilan ukuran lot dan pemakaian Stop Loss.'),
    mk('ketahanan', 'Ketahanan', 'Ketahanan', sRes,
      `Rugi beruntun maks ${maxStreak}× · recovery ${rf.toFixed(1)}×`,
      'Kemampuan bangkit dari tekanan — dari rentetan rugi beruntun terpanjang dan recovery factor.')
  ];
  const overall = Math.round(dims.reduce((a, d) => a + d.score, 0) / 5);
  const strongest = dims.reduce((a, b) => (b.score > a.score ? b : a));
  const weakest = dims.reduce((a, b) => (b.score < a.score ? b : a));
  return { ready: n >= 3, dims, overall, grade: gradeOf(overall), strongest, weakest };
}
