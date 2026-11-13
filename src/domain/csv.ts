import type { Trade } from './types';

const esc = (v: unknown) => {
  const s = String(v ?? '');
  // cegah injeksi rumus di Excel/Sheets (=,+,-,@ di awal) lalu kutip jika perlu
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const CSV_HEADER = ['Tanggal Entry', 'Tanggal Close', 'Symbol', 'Arah', 'Status', 'Entry', 'Exit', 'Lots', 'SL', 'TP', 'Exit Method', 'PnL', 'Fees', 'Setup', 'Review'];

export function tradesToCsv(trades: Trade[]): string {
  const rows = trades.map(t => [
    t.openedAt, t.closedAt ?? '', t.symbol, t.side, t.status, t.entry, t.exit ?? '', t.lots,
    t.sl ?? '', t.tp ?? '', t.exitMethod, t.pnl, t.fees, t.setup, t.review
  ].map(esc).join(','));
  return [CSV_HEADER.join(','), ...rows].join('\n');
}
