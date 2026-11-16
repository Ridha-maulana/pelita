import { useSyncExternalStore } from 'react';
import type { Account, CapitalEntry, Currency, Store, Trade } from '../domain/types';
import { loadStore, saveStore, type SaveResult } from './persist';
import { nowWibIso } from '../domain/time';
import { pnlFor } from '../domain/trading';
import { seedStore } from './seed';
import { noteLocalSave } from '../cloud/hook';

export interface AppState {
  store: Store;
  saveError: null | 'quota' | 'error';
  seeded: boolean;
}

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function initial(): AppState {
  const saved = loadStore();
  if (saved) return { store: saved, saveError: null, seeded: false };
  // Pengguna baru: satu akun kosong. Data contoh hanya lewat tombol "Coba dengan data contoh".
  const a: Account = { id: uid('acc'), name: 'Akun Utama', currency: 'USD', balance: 1000, firstDeposit: nowWibIso().slice(0, 10), trades: [], capital: [] };
  return { store: { activeAccountId: a.id, accounts: [a] }, saveError: null, seeded: false };
}

let state: AppState = initial();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
/** Ada perubahan dari pengguna yang belum disimpan (dipakai untuk menandai sinkron). */
let userChanged = false;

function emit() {
  userChanged = true;
  listeners.forEach(l => l());
  clearTimeout(timer);
  timer = setTimeout(flush, 150);
}
export function flush(): SaveResult {
  clearTimeout(timer);
  const r = saveStore(state.store);
  if (r.ok && userChanged) { userChanged = false; noteLocalSave(); }
  const err = r.ok ? null : r.reason;
  if (err !== state.saveError) { state = { ...state, saveError: err }; listeners.forEach(l => l()); }
  return r;
}
const set = (fn: (s: Store) => Store) => { state = { ...state, store: fn(state.store) }; emit(); };

export const getState = () => state;
export function useApp<T>(sel: (s: AppState) => T): T {
  return useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => sel(state));
}
export const useActiveAccount = (): Account =>
  useApp(s => s.store.accounts.find(a => a.id === s.store.activeAccountId) ?? s.store.accounts[0]!);

const mapAcc = (s: Store, id: string, fn: (a: Account) => Account): Store => ({ ...s, accounts: s.accounts.map(a => (a.id === id ? fn(a) : a)) });
const stamp = (t: Trade): Trade => ({ ...t, updatedAt: nowWibIso() });

export const actions = {
  replaceStore(store: Store) { state = { ...state, store, seeded: false }; emit(); },
  /** Data dari cloud: simpan di perangkat tanpa menandai "perubahan lokal" (supaya tidak dikirim balik). */
  applyRemote(store: Store) {
    state = { ...state, store, seeded: false };
    userChanged = false;
    clearTimeout(timer);
    saveStore(state.store);
    listeners.forEach(l => l());
  },
  loadDemo() { state = { ...state, store: seedStore(), seeded: true }; emit(); },
  setActive(id: string) { set(s => (s.accounts.some(a => a.id === id) ? { ...s, activeAccountId: id } : s)); },
  addAccount(name: string, currency: Currency, balance: number) {
    const a: Account = { id: uid('acc'), name: name.trim() || 'Akun', currency, balance, firstDeposit: nowWibIso().slice(0, 10), trades: [], capital: [] };
    set(s => ({ activeAccountId: a.id, accounts: [...s.accounts, a] }));
  },
  renameAccount(id: string, name: string) { set(s => mapAcc(s, id, a => ({ ...a, name: name.trim() || a.name }))); },
  deleteAccount(id: string) {
    set(s => {
      if (s.accounts.length <= 1) return s; // minimal satu akun
      const accounts = s.accounts.filter(a => a.id !== id);
      return { accounts, activeAccountId: s.activeAccountId === id ? accounts[0]!.id : s.activeAccountId };
    });
  },
  addTrade(accId: string, t: Omit<Trade, 'id' | 'updatedAt' | 'pnl'> & { pnl?: number }) {
    const full: Trade = stamp({ ...t, id: uid('t'), pnl: t.pnl ?? (t.status === 'closed' ? pnlFor(t, t.exit) : 0), updatedAt: '' });
    set(s => mapAcc(s, accId, a => ({ ...a, trades: [full, ...a.trades] })));
    return full.id;
  },
  updateTrade(accId: string, id: string, patch: Partial<Trade>) {
    set(s => mapAcc(s, accId, a => ({ ...a, trades: a.trades.map(t => (t.id === id ? stamp({ ...t, ...patch }) : t)) })));
  },
  closeTrade(accId: string, id: string, exit: number, closedAt: string, exitMethod: Trade['exitMethod'], pnl?: number) {
    set(s => mapAcc(s, accId, a => ({
      ...a,
      trades: a.trades.map(t => t.id !== id ? t : stamp({ ...t, status: 'closed', exit, closedAt, exitMethod, pnl: pnl ?? pnlFor(t, exit) }))
    })));
  },
  /** Hapus = tombstone (supaya sinkron bisa menyebarkan penghapusan). */
  deleteTrade(accId: string, id: string) {
    set(s => mapAcc(s, accId, a => ({ ...a, trades: a.trades.map(t => (t.id === id ? stamp({ ...t, deletedAt: nowWibIso() }) : t)) })));
  },
  addCapital(accId: string, c: Omit<CapitalEntry, 'id'>) {
    set(s => mapAcc(s, accId, a => ({ ...a, capital: [...a.capital, { ...c, id: uid('cap') }] })));
  },
  deleteCapital(accId: string, id: string) {
    set(s => mapAcc(s, accId, a => ({ ...a, capital: a.capital.filter(c => c.id !== id) })));
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => { flush(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
}
