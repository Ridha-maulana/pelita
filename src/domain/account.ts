import type { Account } from './types';
import { isClosed } from './trading';

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

export function capitalSums(account: Pick<Account, 'capital'>) {
  const cap = account.capital ?? [];
  const deposits = sum(cap.filter(c => c.type !== 'withdraw').map(c => Number(c.amount) || 0));
  const withdrawals = sum(cap.filter(c => c.type === 'withdraw').map(c => Number(c.amount) || 0));
  return { deposits, withdrawals };
}

/** Modal awal = saldo dasar − deposit + penarikan (minimal 1, supaya pembagian aman). */
export function startingBalance(account: Account): number {
  const { deposits, withdrawals } = capitalSums(account);
  return Math.max((Number(account.balance) || 0) - deposits + withdrawals, 1);
}

/** Saldo sekarang = saldo dasar + total P&L trade closed. */
export function currentBalance(account: Account): number {
  return (Number(account.balance) || 0) + sum(account.trades.filter(isClosed).map(t => Number(t.pnl) || 0));
}
