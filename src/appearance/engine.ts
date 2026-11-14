import { FONTS } from './fonts.data';
import { SURFACES } from './surfaces.data';
import { THEMES } from './themes.data';
import { pickSide, TOKEN_KEYS, tokensFor, type CustomColor } from './theme';

export type Mode = 'auto' | 'light' | 'dark';
export const FX_KEYS = ['latar', 'kartu', 'tombol', 'ikon', 'hdr', 'nav', 'gerak'] as const;
export type FxKey = (typeof FX_KEYS)[number];
export type Fx = Record<FxKey, boolean>;
export const FX_DEFAULT: Fx = { latar: true, kartu: true, tombol: true, ikon: true, hdr: true, nav: false, gerak: true };

export interface Appearance {
  mode: Mode; theme: string; font: string; sfc: number; custom: CustomColor; fx: Fx;
}

const FX_ATTR: Record<FxKey, string> = { latar: 'data-fxl', kartu: 'data-fxk', tombol: 'data-fxb', ikon: 'data-fxi', hdr: 'data-fxh', nav: 'data-fxn', gerak: 'data-fxg' };
const loaded = new Set<string>();

export const themeById = (id: string) => THEMES.find(t => t.id === id) ?? THEMES[0]!;
export const fontById = (id: string) => FONTS.find(f => f.id === id) ?? FONTS.find(f => f.id === 'inter') ?? FONTS[0]!;

export function systemDark(): boolean {
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; }
}
export const resolveDark = (m: Mode): boolean => (m === 'auto' ? systemDark() : m === 'dark');

export function loadFont(id: string): void {
  const f = fontById(id);
  if (loaded.has(f.id)) return;
  loaded.add(f.id);
  try {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = `https://fonts.googleapis.com/css2?family=${f.gf}&display=swap`;
    document.head.appendChild(l);
  } catch { /* tanpa jaringan: pakai font sistem */ }
}

/** Pasang tampilan ke <html>. Tema bawaan 'pelita' (tanpa warna sendiri) memakai token CSS asli. */
export function applyAppearance(a: Appearance): void {
  const r = document.documentElement;
  const dark = resolveDark(a.mode);
  const theme = themeById(a.theme);
  const isDefault = theme.id === 'pelita' && !a.custom.on;

  if (a.mode === 'auto') r.removeAttribute('data-mode'); else r.setAttribute('data-mode', a.mode);

  if (isDefault) {
    TOKEN_KEYS.forEach(k => r.style.removeProperty(k));
    r.style.colorScheme = '';
    r.setAttribute('data-eff', dark ? 'dark' : 'light');
  } else {
    const { side, dark: d } = pickSide(theme, a.custom, dark);
    const t = tokensFor(side, d);
    TOKEN_KEYS.forEach(k => r.style.setProperty(k, t[k] ?? ''));
    r.style.colorScheme = d ? 'dark' : 'light';
    r.setAttribute('data-eff', d ? 'dark' : 'light');
  }

  const f = fontById(a.font);
  loadFont(f.id);
  r.style.setProperty('--font', f.css);

  if (a.sfc > 0) {
    r.setAttribute('data-sfc', String(a.sfc));
    r.setAttribute('data-sfcf', SURFACE_FAMILY[a.sfc] ?? 'a');
  } else { r.removeAttribute('data-sfc'); r.removeAttribute('data-sfcf'); }
  for (const k of FX_KEYS) r.setAttribute(FX_ATTR[k], a.fx[k] ? '1' : '0');
}

/** Keluarga warna teks per gaya permukaan: d = teks terang, l = teks gelap, a = ikut mode. */
const SURFACE_FAMILY: Record<number, string> = Object.fromEntries(SURFACES.map(s => [s.id, s.tone]));
