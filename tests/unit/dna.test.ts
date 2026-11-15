import { describe, expect, it } from 'vitest';
import { computeDna } from '../../src/domain/dna';
import { computeStats, byCloseTime } from '../../src/domain/stats';
import { account, mk } from './fixtures';

describe('Trader DNA', () => {
  it('tiap dimensi punya saran perbaikan yang tidak kosong', () => {
    const ts = [
      mk({ openedAt: '2026-10-01T09:00:00+07:00', entry: 2700, exit: 2710, sl: 2690 }),
      mk({ openedAt: '2026-10-02T09:00:00+07:00', entry: 2700, exit: 2690, sl: 2690 }),
      mk({ openedAt: '2026-10-03T09:00:00+07:00', entry: 2700, exit: 2720 })
    ];
    const a = account(ts);
    const d = computeDna(computeStats(a, ts), byCloseTime(ts));
    expect(d.ready).toBe(true);
    expect(d.dims).toHaveLength(5);
    for (const x of d.dims) expect(x.tip.length).toBeGreaterThan(10);
  });
});
