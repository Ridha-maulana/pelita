// Penghubung kecil antara store dan sinkron online (tanpa memuat Firebase).
import { markLocalChanged } from './engine';

let handler: (() => void) | null = null;
export const setLocalChangedHandler = (f: (() => void) | null) => { handler = f; };

/** Dipanggil store setelah menyimpan perubahan dari pengguna. */
export function noteLocalSave(): void {
  try { markLocalChanged(localStorage, () => handler?.()); } catch { /* localStorage tidak tersedia */ }
}
