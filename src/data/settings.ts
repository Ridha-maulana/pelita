import { useSyncExternalStore } from 'react';
import { applyAppearance, FX_DEFAULT } from '../appearance/engine';
import { DEFAULT_CUSTOM } from '../appearance/theme';
import { DEFAULT_SETTINGS, parseSettings, type Settings } from '../appearance/prefs';

export type { Mode } from '../appearance/engine';
export type { Settings } from '../appearance/prefs';
const KEY = 'pelita-settings';

function load(): Settings {
  try { return parseSettings(JSON.parse(localStorage.getItem(KEY) ?? '{}')); } catch { return { ...DEFAULT_SETTINGS }; }
}

let s: Settings = load();
const ls = new Set<() => void>();

export function applySettings(x: Settings = s) { applyAppearance(x); }
export function setSettings(patch: Partial<Settings>) {
  s = { ...s, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* kuota: pengaturan tidak kritis */ }
  applySettings();
  ls.forEach(l => l());
}
export function resetAppearance() { setSettings({ theme: 'pelita', font: 'inter', sfc: 0, custom: DEFAULT_CUSTOM, fx: FX_DEFAULT, nav: 0, hdr: 0, bg: '', bgd: 20 }); }

try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (s.mode === 'auto') applySettings(); }); } catch { /* tanpa matchMedia */ }

export const useSettings = () => useSyncExternalStore(cb => { ls.add(cb); return () => { ls.delete(cb); }; }, () => s);
