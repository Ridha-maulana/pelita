import { describe, it, expect } from 'vitest';
import { buildCandles, candleNum } from '../../src/domain/candles';
import { ddBuild, ddStat, weeksIn, wkRange } from '../../src/domain/drilldown';
import { mk } from './fixtures';

const T = (iso: string, pnl: number) => mk({ openedAt: iso, closedAt: iso, exit: 1, pnl });

describe('kandel', () => {
  it('menggabungkan OHLC dalam satu kandel jam', () => {
    const c = buildCandles([T('2026-10-20T09:05:00+07:00', 10), T('2026-10-20T09:20:00+07:00', -30), T('2026-10-20T09:40:00+07:00', 5)], 'H1');
    expect(c).toHaveLength(1);
    expect([c[0]!.o, c[0]!.h, c[0]!.l, c[0]!.c, c[0]!.n]).toEqual([0, 10, -20, -15, 3]);
  });
  it('kandel berikutnya dibuka di penutupan sebelumnya', () => {
    const c = buildCandles([T('2026-10-20T09:05:00+07:00', 10), T('2026-10-20T11:00:00+07:00', 20)], 'H1');
    expect(c).toHaveLength(2);
    expect(c[1]!.o).toBe(10); expect(c[1]!.c).toBe(30);
  });
  it('hari trading mulai 07:00 WIB: 06:30 ikut hari sebelumnya', () => {
    const c = buildCandles([T('2026-10-20T20:00:00+07:00', 5), T('2026-10-21T06:30:00+07:00', 5), T('2026-10-21T07:10:00+07:00', 5)], 'D1');
    expect(c.map(x => x.n)).toEqual([2, 1]);
    expect(c[0]!.k).toBe('2026-10-20');
  });
  it('sesi: Overlap (04–07) digabung ke New York', () => {
    const c = buildCandles([T('2026-10-20T21:00:00+07:00', 5), T('2026-10-21T05:00:00+07:00', 5)], 'SES');
    expect(c).toHaveLength(1);
    expect(c[0]!.label).toContain('New York');
  });
  it('minggu mulai Senin; bulan dan tahun mengikuti tanggal kalender', () => {
    const w = buildCandles([T('2026-10-19T10:00:00+07:00', 1), T('2026-10-23T10:00:00+07:00', 1), T('2026-10-26T10:00:00+07:00', 1)], 'W1');
    expect(w.map(x => x.n)).toEqual([2, 1]);
    const m = buildCandles([T('2026-10-31T23:00:00+07:00', 1), T('2026-11-01T01:00:00+07:00', 1)], 'M1');
    expect(m.map(x => x.k)).toEqual(['2026-10', '2026-11']);
    expect(buildCandles([T('2025-12-31T10:00:00+07:00', 1), T('2026-01-01T10:00:00+07:00', 1)], 'Y1')).toHaveLength(2);
  });
  it('abaikan trade open dan terhapus; urutan input tidak berpengaruh', () => {
    const open = mk({ openedAt: '2026-10-20T09:00:00+07:00', exit: null });
    const del = { ...T('2026-10-20T09:10:00+07:00', 50), deletedAt: '2026-10-21T00:00:00+07:00' };
    const c = buildCandles([T('2026-10-20T11:00:00+07:00', 20), open, del, T('2026-10-20T09:05:00+07:00', 10)], 'H1');
    expect(c.map(x => x.c)).toEqual([10, 30]);
  });
  it('tanpa trade → kosong; angka ringkas', () => {
    expect(buildCandles([], 'D1')).toEqual([]);
    expect(candleNum(1250)).toBe('+1.25k'); expect(candleNum(-12.5)).toBe('-12.50'); expect(candleNum(0)).toBe('0.00');
  });
});

describe('drill-down', () => {
  it('minggu dalam bulan: minggu 1 berisi tanggal 1 (kalender mulai Senin)', () => {
    // Okt 2026: 1 Okt = Kamis → minggu 1 = 1–4 Okt
    expect(weeksIn('2026-10')).toBe(5);
    expect(wkRange('2026-10', 1)).toBe('1–4 Okt');
    expect(wkRange('2026-10', 2)).toBe('5–11 Okt');
    expect(wkRange('2026-10', 5)).toBe('26–31 Okt');
  });
  it('rekaman: hari, minggu, sesi, akhir pekan digabung', () => {
    const r = ddBuild([T('2026-10-20T15:00:00+07:00', 10), T('2026-10-24T10:00:00+07:00', -5), T('2026-10-25T10:00:00+07:00', -5)]);
    expect(r[0]!.day).toBe('Selasa'); expect(r[0]!.ses).toBe('London'); expect(r[0]!.wk).toBe(4);
    expect(r[1]!.di).toBe(5); expect(r[2]!.di).toBe(5);
  });
  it('statistik: win rate, rata-rata, jumlah hari', () => {
    const s = ddStat(ddBuild([T('2026-10-20T15:00:00+07:00', 30), T('2026-10-20T16:00:00+07:00', -10), T('2026-10-21T16:00:00+07:00', 10)]));
    expect(s.n).toBe(3); expect(s.wins).toBe(2); expect(s.wr).toBeCloseTo(66.67, 1);
    expect(s.profit).toBe(30); expect(s.avgWin).toBe(20); expect(s.avgLoss).toBe(-10); expect(s.days).toBe(2); expect(s.weeks).toBe(1);
  });
});
