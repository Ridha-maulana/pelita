import type { Store } from '../domain/types';
import { parseBackup } from '../domain/backup';

export const KEY = 'pelita-v1';
export const LEGACY_KEY = 'edge-journal-v3'; // Edge Journal di origin yang sama (github.io) bisa diimpor

export type SaveResult = { ok: true } | { ok: false; reason: 'quota' | 'error' };

export function loadStore(storage: Pick<Storage, 'getItem'> = localStorage): Store | null {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    const parsed = parseBackup(JSON.parse(raw));
    return parsed ? parsed.store : null;
  } catch {
    return null;
  }
}

/** Menyimpan dengan try/catch; kuota penuh dilaporkan ke UI (tidak diam-diam gagal). */
export function saveStore(store: Store, storage: Pick<Storage, 'setItem'> = localStorage): SaveResult {
  try {
    storage.setItem(KEY, JSON.stringify({ version: 4, ...store }));
    return { ok: true };
  } catch (e) {
    const name = (e as { name?: string })?.name ?? '';
    return { ok: false, reason: /quota/i.test(name) ? 'quota' : 'error' };
  }
}

/** Cari data Edge Journal lama di browser ini (tanpa mengubahnya). */
export function readLegacy(storage: Pick<Storage, 'getItem'> = localStorage) {
  try {
    const raw = storage.getItem(LEGACY_KEY);
    if (!raw) return null;
    return parseBackup(JSON.parse(raw));
  } catch {
    return null;
  }
}
