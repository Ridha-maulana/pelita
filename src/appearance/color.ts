export type RGB = [number, number, number];
export const validHex = (v: string): boolean => /^#[0-9a-fA-F]{6}$/.test(v);
export const toRgb = (hex: string): RGB => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as RGB;
export const toHex = (a: RGB): string => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export function mix(a: string, b: string, t: number): string {
  const A = toRgb(a), B = toRgb(b);
  return toHex([A[0] * (1 - t) + B[0] * t, A[1] * (1 - t) + B[1] * t, A[2] * (1 - t) + B[2] * t]);
}
export function lum(hex: string): number {
  const f = (v: number) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  const [r, g, b] = toRgb(hex);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function contrast(a: string, b: string): number {
  const la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** Teks di atas `bg`: abu-hitam atau putih bila kontrasnya ≥ 4.5, kalau tidak hitam/putih murni yang terbaik. */
export function readableOn(bg: string): string {
  for (const c of ['#111111', '#ffffff']) if (contrast(bg, c) >= 4.5) return c;
  return contrast(bg, '#000000') >= contrast(bg, '#ffffff') ? '#000000' : '#ffffff';
}
/** Dari kandidat, ambil yang kontrasnya cukup terhadap `bg`; kalau tak ada, yang terbaik. */
export function pickReadable(cands: string[], bg: string, need = 3.5): string {
  const ok = cands.filter(c => contrast(c, bg) >= need);
  if (ok.length) return ok[0]!;
  return cands.reduce((a, b) => (contrast(a, bg) >= contrast(b, bg) ? a : b));
}
