import { contrast, lum, mix, pickReadable, readableOn, validHex } from './color';
import type { ThemeDef, ThemeSide } from './themes.data';

export interface CustomColor { on: boolean; bg: string; ac: string }
export const DEFAULT_CUSTOM: CustomColor = { on: false, bg: '#14171f', ac: '#e8a33d' };

/** "Warna sendiri": palet utuh dari warna latar + warna aksen. */
export function deriveCustom(c: CustomColor): ThemeSide {
  const bg = validHex(c.bg) ? c.bg : DEFAULT_CUSTOM.bg;
  const ac = validHex(c.ac) ? c.ac : DEFAULT_CUSTOM.ac;
  const dark = lum(bg) < 0.3;
  const ink = dark ? mix(bg, '#ffffff', 0.92) : mix(bg, '#000000', 0.9);
  return { canvas: bg, surface: mix(bg, '#ffffff', dark ? 0.07 : 0.7), ink, primary: ac, soft: mix(bg, ac, dark ? 0.28 : 0.2) };
}

/** Peta satu sisi tema → token CSS Pelita. */
export function tokensFor(side: ThemeSide, dark: boolean): Record<string, string> {
  const { canvas, surface, ink, primary, soft } = side;
  const pos = pickReadable(dark ? ['#34c58f', '#2ee6a0', '#7dffc4'] : ['#12805a', '#07804d', '#0a6b42'], surface);
  const neg = pickReadable(dark ? ['#ff6b7a', '#ff6b81', '#ffa0ae'] : ['#c33a46', '#cf1f3a', '#a3122b'], surface);
  const warn = pickReadable(dark ? ['#f2b857', '#ffd27a'] : ['#b26b00', '#8f5600'], surface);
  // aksen sebagai teks/ikon harus terbaca di atas latar
  const accent = contrast(primary, canvas) >= 3 ? primary : mix(primary, ink, 0.35);
  return {
    '--bg': canvas, '--surface': surface, '--surface-2': mix(surface, ink, 0.07), '--line': mix(surface, ink, dark ? 0.16 : 0.13),
    '--text': ink, '--muted': mix(ink, canvas, dark ? 0.42 : 0.4),
    '--accent': accent, '--accent-ink': readableOn(accent), '--accent-soft': soft,
    '--pos': pos, '--neg': neg, '--warn': warn,
    '--shadow': dark ? '0 1px 2px rgb(0 0 0 / .4), 0 8px 24px rgb(0 0 0 / .35)' : '0 1px 2px rgb(0 0 0 / .06), 0 6px 18px rgb(0 0 0 / .06)'
  };
}

export const TOKEN_KEYS = ['--bg', '--surface', '--surface-2', '--line', '--text', '--muted', '--accent', '--accent-ink', '--accent-soft', '--pos', '--neg', '--warn', '--shadow'] as const;

export function pickSide(theme: ThemeDef, custom: CustomColor, dark: boolean): { side: ThemeSide; dark: boolean } {
  if (custom.on) { const s = deriveCustom(custom); return { side: s, dark: lum(s.canvas) < 0.3 }; }
  return { side: dark ? theme.dark : theme.light, dark };
}
