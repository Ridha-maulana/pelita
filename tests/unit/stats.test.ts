import { describe, it, expect } from 'vitest';
import { computeStats } from '../../src/domain/stats';
import { advancedRows } from '../../src/domain/advanced';
import { computeDna, gradeOf } from '../../src/domain/dna';
import { startingBalance, currentBalance } from '../../src/domain/account';
import { inPeriod } from '../../src/domain/period';
import { tradesToCsv } from '../../src/domain/csv';
import { account, mk } from './fixtures';

// +100, -50, +100, -50, -50, +200 (pnl diset langsung)
const trades = [
  mk({ openedAt: '2026-10-01T09:00:00+07:00', closedAt: '2026-10-01T10:00:00+07:00', exit: 1, pnl: 100, sl: 2690, tp: 2720 }),
  mk({ openedAt: '2026-10-02T09:00:00+07:00', closedAt: '2026-10-02T09:30:00+07:00', exit: 1, pnl: -50 }),
  mk({ openedAt: '2026-10-03T15:00:00+07:00', closedAt: '2026-10-03T17:00:00+07:00', exit: 1, pnl: 100, side: 'Short' }),
  mk({ openedAt: '2026-10-04T09:00:00+07:00', closedAt: '2026-10-04T09:10:00+07:00', exit: 1, pnl: -50 }),
  mk({ openedAt: '2026-10-05T09:00:00+07:00', closedAt: '2026-10-05T09:10:00+07:00', exit: 1, pnl: -50 }),
  mk({ openedAt: '2026-10-06T21:00:00+07:00', closedAt: '2026-10-06T23:00:00+07:00', exit: 1, pnl: 200 }),
  mk({ openedAt: '2026-10-07T09:00:00+07:00', exit: null })
];
const acc = account(trades);

describe('statistik', () => {
  const s = computeStats(acc, trades);
  it('hitungan dasar', () => {
    expect(s.n).toBe(6);
    expect(s.total).toBe(250);
    expect(s.grossWin).toBe(400);
    expect(s.grossLoss).toBe(150);
    expect(s.profitFactor).toBeCloseTo(400 / 150, 5);
    expect(s.winRate).toBeCloseTo(50, 5);
  });
  it('drawdown dari ekuitas puncak', () => {
    // kumulatif: 100, 50, 150, 100, 50, 250 → puncak 150 → turun ke 50 = 100
    expect(s.maxDrawdown).toBe(100);
    expect(s.highWater).toBe(250);
  });
  it('streak', () => {
    expect(s.maxLossStreak).toBe(2);
    expect(s.maxWinStreak).toBe(1);
  });
  it('trade open tidak ikut', () => {
    expect(s.longs.length + s.shorts.length).toBe(6);
  });
  it('31 baris Advanced Statistics (recon menulis 30; yang benar 31)', () => {
    const rows = advancedRows(acc, s, { y: 2026, m: 9 });
    expect(rows).toHaveLength(31);
    expect(rows[0]).toEqual(['Total Trades', '6', '']);
    expect(rows.find(r => r[0] === 'Profit Factor')![1]).toBe('2.67');
    expect(rows.find(r => r[0] === 'Profit Pips Okt')).toBeTruthy();
    expect(rows.find(r => r[0] === 'Max Drawdown')![1]).toBe('-$100 · -1.00%');
  });
  it('rows kosong tidak NaN', () => {
    const e = computeStats(account([]), []);
    const rows = advancedRows(account([]), e, { y: 2026, m: 0 });
    expect(rows.every(r => !r[1].includes('NaN'))).toBeTruthy();
  });
});

describe('akun', () => {
  it('modal awal & saldo sekarang', () => {
    const a = account(trades, { capital: [{ id: 'c1', type: 'deposit', amount: 500, date: '2026-10-01', note: '' }, { id: 'c2', type: 'withdraw', amount: 100, date: '2026-10-02', note: '' }] });
    expect(startingBalance(a)).toBe(9600);
    expect(currentBalance(a)).toBe(10250);
    expect(startingBalance(account([], { balance: 0 }))).toBe(1);
  });
});

describe('DNA', () => {
  it('lima dimensi, skor 0-100, grade valid', () => {
    const s = computeStats(acc, trades);
    const d = computeDna(s, trades.filter(t => t.status === 'closed'));
    expect(d.dims).toHaveLength(5);
    for (const x of d.dims) { expect(x.score).toBeGreaterThan(-1); expect(x.score).toBeLessThan(101); }
    expect(['A', 'B', 'C', 'D', 'E']).toContain(d.grade);
    expect(d.ready).toBeTruthy();
  });
  it('batas grade', () => {
    expect(gradeOf(85)).toBe('A'); expect(gradeOf(84)).toBe('B'); expect(gradeOf(70)).toBe('B');
    expect(gradeOf(55)).toBe('C'); expect(gradeOf(40)).toBe('D'); expect(gradeOf(39)).toBe('E');
  });
});

describe('periode', () => {
  it('memakai tanggal close', () => {
    const t = mk({ openedAt: '2026-09-30T22:00:00+07:00', closedAt: '2026-10-01T02:00:00+07:00', exit: 1, pnl: 1 });
    const now = Date.parse('2026-10-15T00:00:00+07:00');
    expect(inPeriod(t, { period: 'Monthly', now })).toBeTruthy();
    expect(inPeriod(t, { period: 'Custom date range', start: '2026-10-01', end: '2026-10-01' })).toBeTruthy();
    expect(inPeriod(t, { period: 'Custom date range', start: '2026-09-30', end: '2026-09-30' })).toBeFalsy();
  });
});

describe('CSV', () => {
  it('menetralkan rumus dan mengutip koma', () => {
    const t = mk({ openedAt: '2026-10-01T09:00:00+07:00', exit: null, setup: '=HYPERLINK("x")', review: 'a, b' });
    const csv = tradesToCsv([t]);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain('"a, b"');
  });
});
