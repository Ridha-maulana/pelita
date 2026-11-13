import { describe, it, expect } from 'vitest';
import { pnlFor, pipSizeOf, pipsOf, riskFor, rewardFor } from '../../src/domain/trading';

const base = { side: 'Long' as const, entry: 2728.4, lots: 0.02, symbol: 'XAUUSD', fees: 0 };
describe('P&L', () => {
  it('XAUUSD long cocok dengan jurnal lama (+148 untuk contoh t1)', () => {
    expect(pnlFor(base, 2735.8)).toBeCloseTo(14.8, 2); // 7.4 * 0.02 * 100
  });
  it('short membalik arah', () => {
    expect(pnlFor({ ...base, side: 'Short' }, 2735.8)).toBeCloseTo(-14.8, 2);
  });
  it('fees dikurangkan', () => {
    expect(pnlFor({ ...base, fees: 1 }, 2735.8)).toBeCloseTo(13.8, 2);
  });
  it('tanpa exit = 0', () => {
    expect(pnlFor(base, null)).toBe(0);
  });
  it('forex 100000', () => {
    expect(pnlFor({ side: 'Short', entry: 1.1764, lots: 0.1, symbol: 'EURUSD', fees: 0 }, 1.1749)).toBeCloseTo(15, 2);
  });
  it('risk & reward', () => {
    expect(riskFor(2728.4, 2720, 0.02, 'XAUUSD')).toBeCloseTo(16.8, 2);
    expect(rewardFor(2728.4, 2745, 0.02, 'XAUUSD')).toBeCloseTo(33.2, 2);
    expect(riskFor(2728.4, null, 0.02, 'XAUUSD')).toBe(0);
  });
});
describe('pips', () => {
  it('ukuran pip', () => {
    expect(pipSizeOf('XAUUSD')).toBe(0.1);
    expect(pipSizeOf('USDJPY')).toBe(0.01);
    expect(pipSizeOf('BTCUSD')).toBe(1);
    expect(pipSizeOf('NAS100')).toBe(1);
    expect(pipSizeOf('EURUSD')).toBe(0.0001);
  });
  it('pips trade closed', () => {
    expect(pipsOf({ side: 'Long', entry: 2728.4, exit: 2735.8, symbol: 'XAUUSD', status: 'closed' })).toBeCloseTo(74, 5);
    expect(pipsOf({ side: 'Short', entry: 1.1764, exit: 1.1749, symbol: 'EURUSD', status: 'closed' })).toBeCloseTo(15, 5);
    expect(pipsOf({ side: 'Long', entry: 1, exit: null, symbol: 'EURUSD', status: 'open' })).toBe(0);
  });
});
