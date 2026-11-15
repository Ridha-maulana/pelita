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
export function resetAppearance() { setSettings({ mode: DEFAULT_SETTINGS.mode, theme: DEFAULT_SETTINGS.theme, font: DEFAULT_SETTINGS.font, sfc: DEFAULT_SETTINGS.sfc, custom: DEFAULT_CUSTOM, fx: FX_DEFAULT, nav: DEFAULT_SETTINGS.nav, hdr: DEFAULT_SETTINGS.hdr, home: DEFAULT_SETTINGS.home, bg: DEFAULT_SETTINGS.bg, bgd: DEFAULT_SETTINGS.bgd }); }

try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (s.mode === 'auto') applySettings(); }); } catch { /* tanpa matchMedia */ }

export const useSettings = () => useSyncExternalStore(cb => { ls.add(cb); return () => { ls.delete(cb); }; }, () => s);
