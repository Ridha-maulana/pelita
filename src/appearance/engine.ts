import { FONTS } from './fonts.data';
import { SURFACES } from './surfaces.data';
import { THEMES } from './themes.data';
import { applyWallpaper } from './wallpaper';
import { pickSide, TOKEN_KEYS, tokensFor, type CustomColor } from './theme';

export type Mode = 'auto' | 'light' | 'dark';
export const FX_KEYS = ['latar', 'kartu', 'tombol', 'ikon', 'hdr', 'nav', 'gerak'] as const;
export type FxKey = (typeof FX_KEYS)[number];
export type Fx = Record<FxKey, boolean>;
export const FX_DEFAULT: Fx = { latar: true, kartu: true, tombol: true, ikon: true, hdr: false, nav: false, gerak: true };

/** Gaya menu bawah: 0 = standar Pelita, 1 kapsul gelap, 2 datar + titik, 3 mengambang + chip, 4 datar + pil. */
export const NAV_STYLES: readonly (readonly [number, string])[] = [[0, 'Standar'], [1, 'Kapsul gelap'], [2, 'Datar + titik'], [3, 'Mengambang + chip'], [4, 'Datar + pil']];
/** Gaya header halaman Performance. */
export const HEADER_STYLES: readonly (readonly [number, string])[] = [[0, 'Standar'], [1, 'Minimal satu baris'], [2, 'Bilah kaca'], [3, 'Akun jadi judul'], [5, 'Saldo di pil akun'], [6, 'Banner gradasi'], [7, 'Status tersimpan'], [9, 'Kartu mengambang'], [10, 'Strip tanggal'], [12, 'Template 2 · Organik hijau']];

/** Template beranda Performance: 0 Standar, 1 Dasbor biru, 2 Organik hijau, 3 Hijau bersih, 4 Kaca lembut, 5 Sederhana. */
export const HOME_LIST: readonly (readonly [number, string])[] = [[0, 'Standar'], [1, 'Template 1 · Dasbor biru'], [2, 'Template 2 · Organik hijau'], [3, 'Template 3 · Hijau bersih'], [4, 'Template 4 · Kaca lembut'], [5, 'Template 5 · Sederhana']];
/** Header dan menu bawah bawaan tiap template; dipakai saat pilihan Header / Menu bawah masih "Standar". */
export const TPL_HDR: readonly number[] = [0, 5, 2, 3, 9, 1];
export const TPL_NAV: readonly number[] = [0, 0, 4, 4, 4, 4];
export const effHdr = (a: Pick<Appearance, 'hdr' | 'home'>): number => a.hdr || TPL_HDR[a.home] || 0;
export const effNav = (a: Pick<Appearance, 'nav' | 'home'>): number => a.nav || TPL_NAV[a.home] || 0;

export interface Appearance {
  mode: Mode; theme: string; font: string; sfc: number; custom: CustomColor; fx: Fx;
  nav: number; hdr: number; home: number;
  /** latar: '' = tanpa latar, atau 'kategori:Nama' */ bg: string;
  /** redup latar 0..80 (%) */ bgd: number;
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

  r.setAttribute('data-nv', String(effNav(a)));
  r.setAttribute('data-home', String(a.home));
  applyWallpaper(a.bg, a.bgd, r.getAttribute('data-eff') === 'dark');

  const f = fontById(a.font);
  loadFont(f.id);
  r.style.setProperty('--font', f.css);

  if (a.sfc > 0) {
    r.setAttribute('data-sfc', String(a.sfc));
    r.setAttribute('data-sfcf', SURFACE_FAMILY[a.sfc] ?? 'a');
  } else { r.removeAttribute('data-sfc'); r.removeAttribute('data-sfcf'); }
  for (const k of FX_KEYS) r.setAttribute(FX_ATTR[k], a.fx[k] ? '1' : '0');
  syncSystemBars(r.getAttribute('data-eff') === 'dark');
}

/** Warna CSS apa pun (hex, rgb(), nama) → #rrggbb, atau '' bila tak terbaca. */
function toHex(css: string): string {
  const v = css.trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(v)) return '#' + v.slice(1).split('').map(x => x + x).join('').toLowerCase();
  try {
    const c = document.createElement('canvas').getContext('2d');
    if (!c) return '';
    c.fillStyle = '#000'; c.fillStyle = v;
    const r = String(c.fillStyle);
    return /^#[0-9a-f]{6}$/i.test(r) ? r.toLowerCase() : '';
  } catch { return ''; }
}

type SB = { setBackgroundColor?: (o: { color: string }) => Promise<void>; setStyle?: (o: { style: string }) => Promise<void>; setOverlaysWebView?: (o: { overlay: boolean }) => Promise<void> };
let barDark = false, barHooked = false;

function pushBars(): void {
  const bg = toHex(getComputedStyle(document.documentElement).getPropertyValue('--bg'));
  if (!bg) return;
  let m = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
  m.content = bg;
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; registerPlugin?: (n: string) => SB; Plugins?: Record<string, SB> } }).Capacitor;
    if (cap?.isNativePlatform?.() && cap.registerPlugin) {
      const sb = cap.Plugins?.StatusBar ?? cap.registerPlugin('StatusBar');
      const quiet = (p?: Promise<void>) => { void p?.catch(() => undefined); };
      quiet(sb.setOverlaysWebView?.({ overlay: false }));
      quiet(sb.setBackgroundColor?.({ color: bg }));
      quiet(sb.setStyle?.({ style: barDark ? 'DARK' : 'LIGHT' }));
    }
  } catch { /* di luar aplikasi Android */ }
}

/** Samakan bilah status (browser/PWA lewat meta theme-color, APK lewat plugin StatusBar) dengan latar halaman, supaya tidak ada pita terpisah.
 *  Di APK dikirim ulang beberapa kali karena jembatan native kadang belum siap saat halaman pertama dimuat. */
function syncSystemBars(dark: boolean): void {
  barDark = dark;
  pushBars();
  setTimeout(pushBars, 400); setTimeout(pushBars, 1600); setTimeout(pushBars, 4500);
  if (!barHooked) {
    barHooked = true;
    document.addEventListener('visibilitychange', () => { if (!document.hidden) pushBars(); });
    window.addEventListener('focus', pushBars);
  }
}

/** Keluarga warna teks per gaya permukaan: d = teks terang, l = teks gelap, a = ikut mode. */
const SURFACE_FAMILY: Record<number, string> = Object.fromEntries(SURFACES.map(s => [s.id, s.tone]));
