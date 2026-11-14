/** Gambar ringkasan 1080×1920 untuk dibagikan ke story. Digambar sendiri di canvas (tanpa pustaka). */
export interface ShareData {
  account: string; total: number; growthPct: number; start: number; now: number; days: number;
  vals: number[]; labels: string[]; best: string; dd: string; periodText: string; hide: boolean; fmt: (n: number) => string;
}

const F = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const G = '#34c58f', R = '#ff6b7a', AMBER = '#e8a33d';

export function drawShareImage(d: ShareData): HTMLCanvasElement {
  const W = 1080, H = 1920, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  const col = d.total >= 0 ? G : R;
  const rr = (a: number, b: number, w: number, h: number, r: number) => { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); };
  const t = (s: string, px: number, py: number, size: number, color: string, weight = 500, align: CanvasTextAlign = 'left') => { x.font = `${weight} ${size}px ${F}`; x.fillStyle = color; x.textAlign = align; x.fillText(s, px, py); };
  const pct = `${d.growthPct >= 0 ? '+' : ''}${d.growthPct.toFixed(2)}%`;

  let g: CanvasGradient = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#141210'); g.addColorStop(1, '#241d12');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  g = x.createRadialGradient(W - 120, 260, 20, W - 120, 260, 520);
  g.addColorStop(0, 'rgba(232,163,61,.26)'); g.addColorStop(1, 'rgba(232,163,61,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  g = x.createRadialGradient(100, H - 200, 20, 100, H - 200, 520);
  g.addColorStop(0, 'rgba(52,197,143,.13)'); g.addColorStop(1, 'rgba(52,197,143,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);

  // kepala: lambang pelita (api di atas dasar)
  g = x.createLinearGradient(80, 110, 176, 206);
  g.addColorStop(0, '#f0b552'); g.addColorStop(1, '#c98515');
  x.fillStyle = g; rr(80, 110, 96, 96, 26); x.fill();
  x.fillStyle = '#1b1405';
  x.beginPath(); x.moveTo(128, 128); x.bezierCurveTo(146, 148, 150, 160, 128, 178); x.bezierCurveTo(106, 160, 110, 148, 128, 128); x.closePath(); x.fill();
  rr(112, 184, 32, 8, 4); x.fill();
  t('PELITA', 204, 152, 40, '#f3efe6', 800);
  t('JURNAL TRADING', 204, 192, 22, '#a39b8b', 500);

  // kartu
  const cx = 60, cy = 270, cw = 960, ch = 1290;
  g = x.createLinearGradient(cx, cy, cx + cw, cy + ch);
  g.addColorStop(0, '#26211a'); g.addColorStop(1, '#1b1814');
  x.fillStyle = g; rr(cx, cy, cw, ch, 56); x.fill();
  x.strokeStyle = '#3a342b'; x.lineWidth = 3; x.stroke();
  t('TOTAL P&L', 110, 360, 26, '#a39b8b');
  t('AKUN', 970, 360, 24, '#a39b8b', 500, 'right');
  t(d.account, 970, 420, 46, '#fff', 800, 'right');
  const big = d.hide ? pct : `${d.total >= 0 ? '+' : ''}${d.fmt(d.total)}`;
  t(big, 110, 520, big.length > 11 ? 96 : 126, col, 800);
  t(`${d.total >= 0 ? '↗' : '↘'}  ${d.hide ? 'Pertumbuhan' : pct} pada periode terpilih`, 110, 590, 32, col);
  x.strokeStyle = '#3a342b'; x.lineWidth = 2; x.beginPath(); x.moveTo(110, 640); x.lineTo(970, 640); x.stroke();
  const mask = '••••••';
  const stats: [string, string, string][] = [['Saldo awal', d.hide ? mask : d.fmt(d.start), '#fff'], ['Sekarang', d.hide ? mask : d.fmt(d.now), col], ['Pertumbuhan', pct, col], ['Hari aktif', String(d.days), '#fff']];
  stats.forEach((s0, i) => { const px = i % 2 ? 570 : 110, py = i < 2 ? 710 : 870; t(s0[0], px, py, 28, '#b3ab9b'); t(s0[1], px, py + 68, 58, s0[2], 800); });

  // grafik
  const L = 110, Rr = 970, T = 1060, B = 1370, vals = d.vals, n = vals.length;
  const lo = Math.min(...vals, 0), hi = Math.max(...vals, 0), sp = hi - lo || 1;
  const px = (i: number) => (n < 2 ? (L + Rr) / 2 : L + (i / (n - 1)) * (Rr - L)), py = (v: number) => T + ((hi - v) / sp) * (B - T);
  x.setLineDash([8, 14]); x.strokeStyle = '#3a342b'; x.lineWidth = 2;
  [0.25, 0.5, 0.75].forEach(f => { x.beginPath(); x.moveTo(L, T + (B - T) * f); x.lineTo(Rr, T + (B - T) * f); x.stroke(); });
  x.setLineDash([]); x.strokeStyle = '#4a4338'; x.beginPath(); x.moveTo(L, B); x.lineTo(Rr, B); x.stroke();
  if (n > 1) {
    const P = vals.map((v, i) => [px(i), py(v)] as const);
    const path = () => {
      x.beginPath(); x.moveTo(P[0]![0], P[0]![1]);
      for (let i = 0; i < P.length - 1; i++) {
        const p0 = P[i - 1] ?? P[i]!, p1 = P[i]!, p2 = P[i + 1]!, p3 = P[i + 2] ?? p2;
        x.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
      }
    };
    path(); x.lineTo(px(n - 1), B); x.lineTo(px(0), B); x.closePath();
    g = x.createLinearGradient(0, T, 0, B);
    g.addColorStop(0, d.total >= 0 ? 'rgba(52,197,143,.42)' : 'rgba(255,107,122,.42)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fill();
    x.save(); x.shadowColor = col; x.shadowBlur = 26; x.strokeStyle = col; x.lineWidth = 9; x.lineCap = 'round'; x.lineJoin = 'round'; path(); x.stroke(); x.restore();
    const ex = px(n - 1), ey = py(vals[n - 1]!);
    x.fillStyle = d.total >= 0 ? 'rgba(52,197,143,.25)' : 'rgba(255,107,122,.25)'; x.beginPath(); x.arc(ex, ey, 24, 0, Math.PI * 2); x.fill();
    x.fillStyle = col; x.strokeStyle = '#141210'; x.lineWidth = 6; x.beginPath(); x.arc(ex, ey, 12, 0, Math.PI * 2); x.fill(); x.stroke();
    const last = vals[n - 1]!;
    const endTxt = d.hide ? pct : `${last > 0 ? '+' : ''}${d.fmt(last)}`;
    t(endTxt, Math.min(ex, Rr - 10), Math.max(ey - 34, T - 14), 30, col, 800, 'right');
  } else {
    t('Belum ada trade pada periode ini', 540, (T + B) / 2, 30, '#a39b8b', 500, 'center');
  }
  if (d.labels[0]) t(d.labels[0], L, B + 52, 26, '#a39b8b');
  if (n > 1 && d.labels[n - 1]) t(d.labels[n - 1]!, Rr, B + 52, 26, '#a39b8b', 500, 'right');

  // keterangan
  x.fillStyle = G; x.beginPath(); x.arc(120, 1456, 13, 0, Math.PI * 2); x.fill();
  t('Bulan terbaik:', 148, 1466, 30, '#b3ab9b');
  x.font = `500 30px ${F}`; const bw = x.measureText('Bulan terbaik: ').width;
  t(d.best, 148 + bw + 6, 1466, 30, '#f3efe6', 800);
  x.fillStyle = R; x.beginPath(); x.arc(120, 1516, 13, 0, Math.PI * 2); x.fill();
  t('Drawdown terdalam:', 148, 1526, 30, '#b3ab9b');
  x.font = `500 30px ${F}`; const dw = x.measureText('Drawdown terdalam: ').width;
  t(d.dd, 148 + dw + 6, 1526, 30, '#f3efe6', 800);
  t(d.periodText, 540, 1650, 34, AMBER, 700, 'center');
  t('Dibuat dengan Pelita', 540, 1820, 26, '#7d766a', 500, 'center');
  return c;
}
