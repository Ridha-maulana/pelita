// Membaca teks dari gambar di HP (OCR) memakai Tesseract.js. Dimuat dari CDN hanya saat Screenshot Trade Entry dipakai.
import { parseMt5Text, type ChartRead } from './mt5';
import { readMt5Chart } from './mt5-chart';

const OCR_SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tess = any;
let loading: Promise<Tess> | null = null;

function loadTesseract(): Promise<Tess> {
  const w = window as unknown as { Tesseract?: Tess };
  if (w.Tesseract) return Promise.resolve(w.Tesseract);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = OCR_SRC;
    s.onload = () => (w.Tesseract ? resolve(w.Tesseract) : reject(new Error('ocr-missing')));
    s.onerror = () => { loading = null; reject(new Error('ocr-load')); };
    document.head.appendChild(s);
  });
  return loading;
}

export type OcrCanvas = HTMLCanvasElement & { _color?: HTMLCanvasElement };

/** Gambar → kanvas abu-abu berkontras tinggi (tema gelap MT5 dibalik jadi teks hitam di latar putih). */
function prepareOcrCanvas(file: Blob): Promise<OcrCanvas> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const maxSide = 2600;
        let scale = img.width < 1400 ? 2 : 1;
        scale = Math.min(scale, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement('canvas') as OcrCanvas;
        c.width = w; c.height = h;
        const g = c.getContext('2d', { willReadFrequently: true })!;
        g.drawImage(img, 0, 0, w, h);
        const col = document.createElement('canvas'); // salinan berwarna untuk membaca garis TP/SL di grafik
        col.width = w; col.height = h;
        col.getContext('2d')!.drawImage(c, 0, 0);
        c._color = col;
        const d = g.getImageData(0, 0, w, h), px = d.data;
        let sum = 0;
        const n = px.length / 4;
        for (let i = 0; i < px.length; i += 16) sum += px[i]! * .299 + px[i + 1]! * .587 + px[i + 2]! * .114;
        const dark = sum / (n / 4) < 128;
        for (let i = 0; i < px.length; i += 4) {
          let v = px[i]! * .299 + px[i + 1]! * .587 + px[i + 2]! * .114;
          if (dark) v = 255 - v;
          px[i] = px[i + 1] = px[i + 2] = v;
        }
        g.putImageData(d, 0, 0);
        URL.revokeObjectURL(url);
        resolve(c);
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img')); };
    img.src = url;
  });
}

export interface OcrResult { texts: string[]; charts: Array<ChartRead | null> }

/** Banyak gambar sekaligus: mesin dimuat sekali, gambar dibaca satu per satu. */
export async function ocrImageFiles(files: Blob[], onProgress?: (p: number, text: string) => void): Promise<OcrResult> {
  const list = [...files], total = list.length;
  const out: OcrResult = { texts: [], charts: [] };
  let cur = 0;
  const report = (p: number, t: string) => {
    try { onProgress?.(Math.min(0.99, (cur + p) / total), (total > 1 ? `Gambar ${Math.min(cur + 1, total)} dari ${total} · ` : '') + t); } catch { /* */ }
  };
  report(0.02, 'Menyiapkan gambar…');
  const T = await loadTesseract();
  report(0.06, 'Memuat mesin pembaca teks…');
  const worker = await T.createWorker('eng', 1, {
    logger: (m: { status?: string; progress?: number }) => {
      if (m?.status === 'recognizing text') report(0.3 + 0.7 * (m.progress || 0), 'Membaca teks…');
      else if (m && /load|init/i.test(m.status || '')) report(0.1 + 0.2 * (m.progress || 0), 'Memuat data bahasa…');
    }
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' });
    for (cur = 0; cur < total; cur++) {
      report(0.1, 'Menyiapkan gambar…');
      try {
        const canvas = await prepareOcrCanvas(list[cur]!);
        const { data } = await worker.recognize(canvas);
        const text: string = data.text || '';
        out.texts.push(text);
        // bukan riwayat MT5 → coba baca sebagai grafik posisi open (garis BUY/SELL, TP, SL)
        let chart: ChartRead | null = null;
        try {
          if (!parseMt5Text(text).rows.length && canvas._color) {
            report(0.9, 'Membaca grafik…');
            chart = await readMt5Chart(worker, canvas._color);
            await worker.setParameters({ tessedit_pageseg_mode: '6', tessedit_char_whitelist: '' });
          }
        } catch { chart = null; }
        out.charts.push(chart);
        if (canvas._color) canvas._color.width = canvas._color.height = 1;
        canvas.width = canvas.height = 1; // lepaskan memori gambar
      } catch { out.texts.push(''); out.charts.push(null); }
    }
    return out;
  } finally {
    try { await worker.terminate(); } catch { /* */ }
  }
}
