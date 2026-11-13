import type { Account, Trade } from './types';
import { money, MONTHS_ID, fmtHold, tone } from './format';
import { computeStats, tradingStyle, type Stats, type StatsView } from './stats';
import { pipsOf } from './trading';
import { monthKeyOf } from './time';
import { tradeDate } from './period';

export type AdvRow = [label: string, value: string, tone: 'pos' | 'neg' | ''];

const sgn = (n: number, d = 1) => `${n > 0 ? '+' : ''}${n.toFixed(d)}`;
const wrOf = (a: Trade[]) => (a.length ? Math.round((a.filter(t => t.pnl > 0).length / a.length) * 100) : 0);
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const mx = (a: number[]) => (a.length ? Math.max(...a) : 0);

/** 30 baris Advanced Statistics (urutan sama dengan Edge Journal). */
export function advancedRows(account: Account, s: Stats, view: StatsView): AdvRow[] {
  const cur = account.currency;
  const fm = (n: number) => money(n, cur);
  const sg = (n: number) => `${n > 0 ? '+' : ''}${fm(n)}`;
  const n = s.n;
  const base = s.balance || 1;
  const vk = `${view.y}-${String(view.m + 1).padStart(2, '0')}`;
  const inM = [...s.wins, ...s.losses].filter(t => monthKeyOf(tradeDate(t)) === vk);
  const mPnl = inM.reduce((a, t) => a + (Number(t.pnl) || 0), 0);
  const mPips = inM.reduce((a, t) => a + pipsOf(t), 0);
  const days = s.dayKeys.length;
  const best = s.bestDayKey ? s.dayPnl[s.bestDayKey]! : 0;
  const mon = MONTHS_ID[view.m]!;
  const pf = s.profitFactor, rf = s.recoveryFactor;

  return [
    ['Total Trades', String(n), ''],
    ['Profit Factor', pf === Infinity ? '∞' : pf.toFixed(2), n ? (pf >= 1 ? 'pos' : 'neg') : ''],
    ['Avg. R:R', s.avgRR ? s.avgRR.toFixed(1) : '—', ''],
    ['Expectancy', `${sgn(s.expectancyR, 2)}R · ${sg(n ? s.total / n : 0)}`, tone(s.expectancyR)],
    ['Recovery Factor', rf === Infinity ? '∞' : rf.toFixed(1), n ? (rf >= 1 ? 'pos' : 'neg') : ''],
    ['Avg. Win / Loss', `${sg(s.avgWin)} / ${sg(s.avgLoss)}`, ''],
    ['Gross Profit', sg(s.grossWin), s.grossWin ? 'pos' : ''],
    ['Gross Loss', s.grossLoss ? `-${fm(s.grossLoss)}` : fm(0), s.grossLoss ? 'neg' : ''],
    ['Longs Won', `${wrOf(s.longs)}% (${s.longs.length})`, ''],
    ['Shorts Won', `${wrOf(s.shorts)}% (${s.shorts.length})`, ''],
    ['Best Day', s.bestDayKey ? `${sg(best)} · ${sgn((best / base) * 100, 2)}%` : '—', s.bestDayKey ? tone(best) : ''],
    ['Avg Daily Gain', days ? `${sg(s.total / days)} · ${sgn((s.total / days / base) * 100, 2)}%` : '—', days ? tone(s.total) : ''],
    ['Max Win Streak', `${s.maxWinStreak}×`, s.maxWinStreak ? 'pos' : ''],
    ['Max Loss Streak', `${s.maxLossStreak}×`, s.maxLossStreak ? 'neg' : ''],
    ['Avg Hold', s.holds.length ? `${fmtHold(s.avgHold)} · ${tradingStyle(s.avgHold)}` : '—', ''],
    ['Perolehan Pips', `${sgn(s.totalPips)} pips`, tone(s.totalPips)],
    [`Profit Pips ${mon}`, `${sgn(mPips)} pips`, tone(mPips)],
    ['Average TP Pips', `${avg(s.tpPips).toFixed(1)} pips`, s.tpPips.length ? 'pos' : ''],
    ['Average SL Pips', `${avg(s.slPips).toFixed(1)} pips`, s.slPips.length ? 'neg' : ''],
    ['Max TP Pips', `${mx(s.tpPips).toFixed(1)} pips`, s.tpPips.length ? 'pos' : ''],
    ['Max SL Pips', `${mx(s.slPips).toFixed(1)} pips`, s.slPips.length ? 'neg' : ''],
    ['Profit', sg(s.total), tone(s.total)],
    ['Gain', `${sgn((s.total / s.start) * 100, 2)}%`, tone(s.total)],
    ['Abs. Gain', `${sgn((s.total / (s.start + s.deposits)) * 100, 2)}%`, tone(s.total)],
    [`Gain ${mon}`, `${sgn((mPnl / s.start) * 100, 2)}% · ${sg(mPnl)}`, tone(mPnl)],
    ['Max Drawdown', s.maxDrawdown ? `-${fm(s.maxDrawdown)} · -${((s.maxDrawdown / base) * 100).toFixed(2)}%` : fm(0), s.maxDrawdown ? 'neg' : ''],
    ['High Water Mark', `${s.highWater > 0 ? '+' : ''}${fm(s.highWater)}`, s.highWater > 0 ? 'pos' : ''],
    ['Balance', fm(s.balance), ''],
    ['Equity', fm(s.balance + s.total), tone(s.total)],
    ['Deposits', fm(s.deposits), s.deposits ? 'pos' : ''],
    ['Withdrawals', fm(s.withdrawals), s.withdrawals ? 'neg' : '']
  ];
}

export const advancedFor = (account: Account, filtered: Trade[], view: StatsView) =>
  advancedRows(account, computeStats(account, filtered), view);
