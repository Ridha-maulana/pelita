import type { Account, Trade } from '../../src/domain/types';
import { pnlFor } from '../../src/domain/trading';

let n = 0;
export function mk(o: Partial<Trade> & { openedAt: string; exit: number | null }): Trade {
  const t: Trade = {
    id: `t${++n}`, symbol: 'XAUUSD', side: 'Long', closedAt: null, entry: 2700, lots: 0.1, sl: null, tp: null,
    fees: 0, pnl: 0, status: o.exit === null ? 'open' : 'closed', exitMethod: '', setup: '', review: '',
    attachmentIds: [], updatedAt: '2026-10-01T00:00:00+07:00', ...o
  };
  if (t.status === 'closed') {
    t.closedAt = t.closedAt ?? t.openedAt;
    t.pnl = o.pnl ?? pnlFor(t, t.exit);
  }
  return t;
}

export function account(trades: Trade[], extra: Partial<Account> = {}): Account {
  return { id: 'a', name: 'Test', currency: 'USD', balance: 10000, firstDeposit: '2026-01-01', trades, capital: [], ...extra };
}
