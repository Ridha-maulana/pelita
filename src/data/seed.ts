import type { Store, Trade } from '../domain/types';
import { pnlFor } from '../domain/trading';

function t(id: string, o: Partial<Trade> & Pick<Trade, 'symbol' | 'side' | 'openedAt' | 'entry' | 'lots'>): Trade {
  const closed = o.exit !== null && o.exit !== undefined;
  const base: Trade = {
    id, closedAt: closed ? (o.closedAt ?? o.openedAt) : null, exit: null, sl: null, tp: null, fees: 0, pnl: 0,
    status: closed ? 'closed' : 'open', exitMethod: '', setup: '', review: '', attachmentIds: [], updatedAt: o.openedAt, ...o
  };
  if (closed) base.pnl = pnlFor(base, base.exit);
  return base;
}

/** Data contoh — hanya dimuat saat pengguna menekan "Coba dengan data contoh". */
export function seedStore(): Store {
  const trades: Trade[] = [
    t('d1', { symbol: 'XAUUSD', side: 'Long', openedAt: '2026-10-20T09:20:00+07:00', closedAt: '2026-10-20T11:05:00+07:00', entry: 2728.4, exit: 2735.8, lots: 0.2, sl: 2720, tp: 2745, exitMethod: 'TP', setup: 'Breakout sesi Asia', review: 'Eksekusi sesuai rencana.' }),
    t('d2', { symbol: 'EURUSD', side: 'Short', openedAt: '2026-10-18T14:10:00+07:00', closedAt: '2026-10-18T18:40:00+07:00', entry: 1.1764, exit: 1.1749, lots: 0.5, sl: 1.178, tp: 1.173, exitMethod: 'TP', setup: 'Rejection resistance H4', review: 'Sabar menunggu konfirmasi.' }),
    t('d3', { symbol: 'XAUUSD', side: 'Short', openedAt: '2026-10-15T10:00:00+07:00', closedAt: '2026-10-15T10:25:00+07:00', entry: 2716.9, exit: 2720.2, lots: 0.2, sl: 2722, tp: 2710, exitMethod: 'SL', setup: 'Counter trend', review: 'Stop terlalu dekat.' }),
    t('d4', { symbol: 'GBPJPY', side: 'Long', openedAt: '2026-10-12T08:40:00+07:00', closedAt: '2026-10-12T16:00:00+07:00', entry: 201.2, exit: 202.05, lots: 0.01, sl: 200.7, tp: 202.4, exitMethod: 'Manual', setup: 'Continuation', review: 'Cukup baik.' }),
    t('d5', { symbol: 'XAUUSD', side: 'Long', openedAt: '2026-10-21T07:45:00+07:00', entry: 2732.1, lots: 0.1, sl: 2724, tp: 2745, setup: 'Retest support M15' })
  ];
  const id = 'demo';
  return { activeAccountId: id, accounts: [{ id, name: 'Contoh', currency: 'USD', balance: 1000, firstDeposit: '2026-09-01', trades, capital: [] }] };
}
