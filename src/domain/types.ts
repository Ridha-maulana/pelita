export type Side = 'Long' | 'Short';
export type TradeStatus = 'open' | 'closed';
export type ExitMethod = 'TP' | 'SL' | 'BE' | 'Manual' | '';
export type Currency = 'USD' | 'EUR' | 'IDR' | 'GBP';

/** Semua waktu disimpan sebagai ISO 8601 dengan offset WIB, mis. 2026-10-20T09:20:00+07:00 */
export interface Trade {
  id: string;
  symbol: string;
  side: Side;
  openedAt: string;
  closedAt: string | null;
  entry: number;
  exit: number | null;
  lots: number;
  sl: number | null;
  tp: number | null;
  fees: number;
  pnl: number;
  status: TradeStatus;
  exitMethod: ExitMethod;
  setup: string;
  review: string;
  /** id lampiran di IndexedDB (bukan data URL di dalam jurnal) */
  attachmentIds: string[];
  mt5Ticket?: string;
  source?: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CapitalEntry {
  id: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  date: string;
  note: string;
}

export interface Account {
  id: string;
  name: string;
  currency: Currency;
  /** saldo dasar akun (sama dengan "balance" di Edge Journal) */
  balance: number;
  firstDeposit: string;
  trades: Trade[];
  capital: CapitalEntry[];
}

export interface Store {
  activeAccountId: string;
  accounts: Account[];
}
