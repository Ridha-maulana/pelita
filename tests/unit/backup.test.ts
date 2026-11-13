import { describe, it, expect } from 'vitest';
import { parseBackup, makeBackup, previewOf } from '../../src/domain/backup';

const legacy = {
  version: 3, appVersion: '5.9.56', activeAccountId: 'gold-50',
  accounts: [{
    id: 'gold-50', name: 'Gold 50', firstDeposit: '2026-09-01', currency: 'USD', balance: 6049.5,
    capitalHistory: [{ id: 'c1', type: 'deposit', amount: 100, date: '2026-09-02', note: '' }],
    trades: [
      { id: 't1', symbol: 'XAUUSD', side: 'Long', date: '2026-10-20T09:20', closeDate: '2026-10-20T10:00', entry: 2728.4, exit: 2735.8, lots: 0.02, sl: 2720, tp: '', pnl: 148, fees: 0, status: 'closed', exitMethod: 'TP', setup: 'x', review: '', screenshots: ['data:image/png;base64,AAAA'] },
      { id: 't5', symbol: 'xauusd', side: 'Long', date: '2026-10-21T07:45', entry: 2732.1, exit: null, lots: 0.02, sl: 2724, tp: 2745, pnl: 0, fees: 0, status: 'open', exitMethod: '', setup: '', review: '' }
    ]
  }]
};

describe('backup & migrasi', () => {
  it('migrasi v3 → baru: waktu WIB, lampiran dipisah', () => {
    const r = parseBackup(legacy)!;
    const t = r.store.accounts[0]!.trades[0]!;
    expect(t.openedAt).toBe('2026-10-20T09:20:00+07:00');
    expect(t.closedAt).toBe('2026-10-20T10:00:00+07:00');
    expect(t.tp).toBeNull();
    expect(t.attachmentIds).toEqual(['t1-s1']);
    expect(r.attachments).toHaveLength(1);
    expect(r.store.accounts[0]!.capital).toHaveLength(1);
    expect(r.store.accounts[0]!.trades[1]!.symbol).toBe('XAUUSD');
    expect(r.store.accounts[0]!.trades[1]!.closedAt).toBeNull();
  });
  it('trade closed tanpa closeDate memakai waktu buka', () => {
    const l = JSON.parse(JSON.stringify(legacy));
    delete l.accounts[0].trades[0].closeDate;
    expect(parseBackup(l)!.store.accounts[0]!.trades[0]!.closedAt).toBe('2026-10-20T09:20:00+07:00');
  });
  it('menolak data rusak', () => {
    expect(parseBackup(null)).toBeNull();
    expect(parseBackup({ accounts: [] })).toBeNull();
    const l = JSON.parse(JSON.stringify(legacy)); l.accounts[0].currency = 'XXX';
    expect(parseBackup(l)).toBeNull();
    const l2 = JSON.parse(JSON.stringify(legacy)); l2.accounts[0].trades[0].lots = 0;
    expect(parseBackup(l2)).toBeNull();
    const l3 = JSON.parse(JSON.stringify(legacy)); l3.accounts.push(l3.accounts[0]);
    expect(parseBackup(l3)).toBeNull();
  });
  it('bolak-balik backup v4 stabil', () => {
    const r1 = parseBackup(legacy)!;
    const b = makeBackup(r1.store, '0.1.0', '2026-11-14T00:00:00Z');
    const r2 = parseBackup(JSON.parse(JSON.stringify(b)))!;
    expect(r2.store).toEqual(r1.store);
    expect(previewOf(r2.store).trades).toBe(2);
  });
});
