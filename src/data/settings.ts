import { useSyncExternalStore } from 'react';

export type Mode = 'auto' | 'light' | 'dark';
export interface Settings { mode: Mode }
const KEY = 'pelita-settings';

function load(): Settings {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return { mode: p.mode === 'light' || p.mode === 'dark' ? p.mode : 'auto' };
  } catch { return { mode: 'auto' }; }
}

let s: Settings = load();
const ls = new Set<() => void>();

export function applySettings(x: Settings = s) {
  const r = document.documentElement;
  if (x.mode === 'auto') r.removeAttribute('data-mode'); else r.setAttribute('data-mode', x.mode);
}
export function setSettings(patch: Partial<Settings>) {
  s = { ...s, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* kuota: pengaturan tidak kritis */ }
  applySettings();
  ls.forEach(l => l());
}
export const useSettings = () => useSyncExternalStore(cb => { ls.add(cb); return () => { ls.delete(cb); }; }, () => s);
