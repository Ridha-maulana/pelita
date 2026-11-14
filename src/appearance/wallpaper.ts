import { WALLPAPERS, type WpRow } from './wallpapers.data';

export const WP_CATS: readonly (readonly [string, string])[] = [['dasar', 'Dasar'], ['doff', 'Doff'], ['kaca', 'Kaca'], ['anime', 'Anime'], ['pola', 'Pola']];
export interface Wp { k: string; cat: string; name: string; tone: string; thumb: string; full: string }
export const WP_LIST: readonly Wp[] = WALLPAPERS.map((r: WpRow) => ({ k: `${r[0]}:${r[1]}`, cat: r[0], name: r[1], tone: r[2], thumb: r[3], full: r[4] || r[3] }));
export const wpByKey = (k: string): Wp | undefined => WP_LIST.find(w => w.k === k);
export const BGD_MAX = 80;

/**
 * Redup minimum agar teks tetap terbaca: latar terang di mode gelap (atau sebaliknya) diredupkan otomatis;
 * 'm' = campur; 'a' = ikut warna tema; gambar ramai (anime) minimal 0.6.
 */
export function wpNeed(w: Pick<Wp, 'tone' | 'cat'>, dark: boolean): number {
  let n = 0;
  if (w.tone === 'm') n = 0.42;
  else if (w.tone !== 'a' && ((w.tone === 'l' && dark) || (w.tone === 'd' && !dark))) n = 0.8;
  if (w.cat === 'anime') n = Math.max(n, 0.6);
  return n;
}
export const wpDim = (w: Wp, bgd: number, dark: boolean): number => Math.max(bgd / 100, wpNeed(w, dark));
/** Apakah redup sedang dipaksa otomatis (di atas pilihan pengguna). */
export const wpAuto = (w: Wp, bgd: number, dark: boolean): boolean => wpNeed(w, dark) > bgd / 100 + 0.005;
export const wpThumb = (w: Wp, uid: string): string => w.thumb.replace(/@/g, `t${uid}`);

let layer: HTMLDivElement | null = null, art: HTMLDivElement | null = null, dimEl: HTMLDivElement | null = null, cur = '';

/** Pasang/lepas lapisan latar tetap di belakang seluruh aplikasi. bg kosong = tanpa latar. */
export function applyWallpaper(bg: string, bgd: number, dark: boolean): void {
  const root = document.documentElement;
  const w = bg ? wpByKey(bg) : undefined;
  if (!w) {
    root.removeAttribute('data-bgw'); root.removeAttribute('data-bgwt');
    layer?.remove(); layer = art = dimEl = null; cur = '';
    return;
  }
  if (!layer || !layer.isConnected) {
    layer = document.createElement('div'); layer.id = 'pl-wp'; layer.setAttribute('aria-hidden', 'true');
    art = document.createElement('div'); art.className = 'wp-art';
    dimEl = document.createElement('div'); dimEl.className = 'wp-dim';
    layer.append(art, dimEl); root.appendChild(layer); cur = '';
  }
  if (cur !== w.k && art) {
    art.innerHTML = w.full.replace(/@/g, 'w'); // data statis milik aplikasi, bukan masukan pengguna
    art.style.filter = w.cat === 'anime' ? 'blur(1.4px)' : '';
    art.style.transform = w.cat === 'anime' ? 'scale(1.03)' : '';
    cur = w.k;
  }
  if (dimEl) dimEl.style.opacity = wpDim(w, bgd, dark).toFixed(2);
  root.setAttribute('data-bgw', '1'); root.setAttribute('data-bgwt', w.tone);
}
