import type { Account, Trade } from './types';
import { capitalSums, startingBalance } from './account';
import { holdMinutes, monthKeyOf, dayKeyOf, toMs } from './time';
import { pipsOf, riskFor, rewardFor, isClosed } from './trading';
import { tradeDate } from './period';

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const avg = (a: number[]) => (a.length ? sum(a) / a.length : 0);

/** Urutkan menurut waktu close (kronologis nyata), kunci pengelompokan = hari WIB waktu close. */
export const byCloseTime = (a: Trade[]) => a.slice().sort((x, y) => toMs(tradeDate(x)) - toMs(tradeDate(y)));

export interface StatsView { y: number; m: number } // m: 0-11

export interface Stats {
  n: number;
  wins: Trade[];
  losses: Trade[];
  grossWin: number;
  grossLoss: number;
  winRate: number;
  profitFactor: number; // Infinity bila tanpa rugi
  total: number;
  avgWin: number;
  avgLoss: number; // negatif
  avgRR: number | null;
  expectancyR: number;
  recoveryFactor: number;
  maxDrawdown: number;
  /** puncak profit kumulatif (>=0) */
  highWater: number;
  longs: Trade[];
  shorts: Trade[];
  dayPnl: Record<string, number>;
  dayKeys: string[];
  monthPnl: Record<string, number>;
  bestDayKey: string | null;
  maxWinStreak: number;
  maxLossStreak: number;
  pips: number[];
  totalPips: number;
  tpPips: number[];
  slPips: number[];
  holds: number[];
  avgHold: number;
  /** kurva ekuitas per hari: kumulatif dan drawdown dari puncak */
  cumByDay: number[];
  ddByDay: number[];
  start: number;
  balance: number;
  deposits: number;
  withdrawals: number;
}

export function computeStats(account: Account, filtered: Trade[]): Stats {
  const cl = byCloseTime(filtered.filter(isClosed));
  const n = cl.length;
  const wins = cl.filter(t => t.pnl > 0);
  const losses = cl.filter(t => t.pnl < 0);
  const grossWin = sum(wins.map(t => t.pnl));
  const grossLoss = Math.abs(sum(losses.map(t => t.pnl)));
  const total = sum(cl.map(t => Number(t.pnl) || 0));
  const profitFactor = grossLoss ? grossWin / grossLoss : grossWin ? Infinity : 0;

  const dayPnl: Record<string, number> = {};
  const monthPnl: Record<string, number> = {};
  for (const t of cl) {
    const d = dayKeyOf(tradeDate(t));
    dayPnl[d] = (dayPnl[d] ?? 0) + (Number(t.pnl) || 0);
    const m = monthKeyOf(tradeDate(t));
    monthPnl[m] = (monthPnl[m] ?? 0) + (Number(t.pnl) || 0);
  }
  const dayKeys = Object.keys(dayPnl).sort();

  // Drawdown dari ekuitas puncak (per trade, kronologis).
  let eq = 0, peak = 0, maxDd = 0;
  for (const t of cl) {
    eq += Number(t.pnl) || 0;
    peak = Math.max(peak, eq);
    maxDd = Math.max(maxDd, peak - eq);
  }
  const cumByDay: number[] = [], ddByDay: number[] = [];
  let c = 0, pk = 0;
  for (const k of dayKeys) { c += dayPnl[k]!; pk = Math.max(pk, c); cumByDay.push(c); ddByDay.push(c - pk); }

  const rrs = cl
    .map(t => { const r = riskFor(t.entry, t.sl, t.lots, t.symbol), w = rewardFor(t.entry, t.tp, t.lots, t.symbol); return r && w ? w / r : null; })
    .filter((v): v is number => v !== null);
  const rs = cl
    .map(t => { const r = riskFor(t.entry, t.sl, t.lots, t.symbol); return r ? (Number(t.pnl) || 0) / r : null; })
    .filter((v): v is number => v !== null);
  const avgLossAbs = losses.length ? grossLoss / losses.length : 0;
  const expectancyR = rs.length ? avg(rs) : avgLossAbs && n ? total / n / avgLossAbs : 0;

  let ws = 0, ls = 0, mw = 0, ml = 0;
  for (const t of cl) {
    if (t.pnl > 0) { ws++; ls = 0; mw = Math.max(mw, ws); }
    else if (t.pnl < 0) { ls++; ws = 0; ml = Math.max(ml, ls); }
    else { ws = 0; ls = 0; }
  }

  const pips = cl.map(pipsOf);
  const holds = cl.map(t => holdMinutes(t.openedAt, t.closedAt)).filter((v): v is number => v !== null);
  const bestDayKey = dayKeys.length ? dayKeys.reduce((a, b) => (dayPnl[b]! > dayPnl[a]! ? b : a)) : null;
  const { deposits, withdrawals } = capitalSums(account);

  return {
    n, wins, losses, grossWin, grossLoss,
    winRate: n ? (wins.length / n) * 100 : 0,
    profitFactor, total,
    avgWin: wins.length ? grossWin / wins.length : 0,
    avgLoss: losses.length ? -avgLossAbs : 0,
    avgRR: rrs.length ? avg(rrs) : null,
    expectancyR,
    recoveryFactor: maxDd ? total / maxDd : total > 0 ? Infinity : 0,
    maxDrawdown: maxDd,
    highWater: peak,
    longs: cl.filter(t => t.side === 'Long'),
    shorts: cl.filter(t => t.side === 'Short'),
    dayPnl, dayKeys, monthPnl, bestDayKey,
    maxWinStreak: mw, maxLossStreak: ml,
    pips, totalPips: sum(pips),
    tpPips: wins.map(pipsOf),
    slPips: losses.map(t => Math.abs(pipsOf(t))),
    holds, avgHold: avg(holds),
    cumByDay, ddByDay,
    start: startingBalance(account),
    balance: Number(account.balance) || 0,
    deposits, withdrawals
  };
}

export const tradingStyle = (avgHoldMin: number) =>
  avgHoldMin <= 0 ? '' : avgHoldMin < 60 ? 'Scalping' : avgHoldMin < 1440 ? 'Day trading' : avgHoldMin < 10080 ? 'Swing' : 'Position';
