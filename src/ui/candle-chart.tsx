import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { Candle, Tf } from '../domain/candles';
import { candleNum } from '../domain/candles';
import { pctS, pipsS } from '../domain/format';

const W = 500, L = 6, AX = 46, T = 68, B = 26;
const CANDLE_DEF = 120, CANDLE_MIN = 5, CANDLE_FLOOR = 8;

/** Kurva halus (Catmull-Rom → Bezier) lewat titik-titik. */
export function smoothPath(P: readonly (readonly [number, number])[]): string {
  if (P.length < 2) return '';
  let d = `M${P[0]![0].toFixed(1)},${P[0]![1].toFixed(1)}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] ?? P[i]!, p1 = P[i]!, p2 = P[i + 1]!, p3 = P[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

interface Drag { x: number; y: number; off: number; vy: number; moved: boolean; w: number }
interface Pinch { dx0: number; dy0: number; c0: number; v0: number; px: number; idx: number }

export function CandleChart({ candles, tf, mode, resetKey, startBal, onOpen, height = 330 }:
  { candles: Candle[]; tf: Tf; mode: 'line' | 'candle'; resetKey: number; startBal: number; onOpen?: (c: Candle) => void; height?: number }) {
  const H = height;
  const isL = mode === 'line';
  const plotW = W - L - AX;
  const n = candles.length;
  const def = Math.max(CANDLE_FLOOR, Math.min(CANDLE_DEF, n));
  const [count, setCount] = useState(def);
  const maxCount = Math.max(CANDLE_DEF, Math.min(500, n * 2));
  const def0 = Math.min(0, n - def); // kandel < 8: yang pertama tetap di kiri
  const cnt = Math.max(CANDLE_MIN, Math.min(maxCount, count));
  const SW = plotW / cnt;
  const offMax = Math.max(0, n - 3);
  const offMin = (c: number) => Math.min(-Math.max(3, c - 3), n - c);
  const clampOff = (v: number, c: number) => Math.max(offMin(c), Math.min(offMax, v));
  const [off, setOff] = useState(def0);
  const [vy, setVy] = useState(0);
  const [vs, setVs] = useState(1);
  const [sel, setSel] = useState<number | null>(null);
  const drag = useRef<Drag | null>(null);
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<Pinch | null>(null);
  const lastTap = useRef({ t: 0, i: -1 });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [fresh, setFresh] = useState(true);

  // ganti skala / data / tekan ulang tombol skala → tampilan awal
  useEffect(() => {
    setOff(def0); setVy(0); setVs(1); setSel(null); setCount(def); setFresh(true);
    const tm = setTimeout(() => setFresh(false), 900);
    return () => clearTimeout(tm);
  }, [tf, n, resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // dua jari = zoom: cegah halaman ikut bergulir
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const stop = (e: TouchEvent) => { if (e.touches.length >= 2 && e.cancelable) e.preventDefault(); };
    el.addEventListener('touchstart', stop, { passive: false });
    el.addEventListener('touchmove', stop, { passive: false });
    return () => { el.removeEventListener('touchstart', stop); el.removeEventListener('touchmove', stop); };
  }, [n]);

  if (!n) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="chart candle-chart" role="img" aria-label="Grafik kosong">
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="13" fill="var(--muted)">Belum ada trade pada periode ini</text>
      </svg>
    );
  }

  const o = clampOff(off, cnt);
  const first = Math.max(0, Math.floor(n - o - cnt) - 1), last = Math.max(0, Math.min(n, Math.ceil(n - o) + 1));
  const shownIdx: number[] = [];
  for (let i = first; i < last; i++) shownIdx.push(i);
  let lo = Infinity, hi = -Infinity;
  for (const i of shownIdx) { const c = candles[i]!; lo = Math.min(lo, isL ? c.c : c.l); hi = Math.max(hi, isL ? c.c : c.h); }
  if (!isFinite(lo)) { lo = 0; hi = 1; }
  if (hi - lo < 1e-6) { hi += 1; lo -= 1; }
  const pad = (hi - lo) * 0.08;
  lo -= pad; hi += pad;
  { const mid = (lo + hi) / 2, half = (hi - lo) / 2 / vs, d = (vy * (hi - lo)) / vs / (H - T - B); lo = mid - half + d; hi = mid + half + d; }
  const y = (v: number) => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const x = (i: number) => L + plotW - SW / 2 - (n - 1 - i - o) * SW;
  const ix = sel != null && sel >= 0 && sel < n ? sel : Math.min(n - 1, Math.max(0, n - 1 - Math.floor(o)));
  const act = candles[ix]!;

  const pair = () => { const p = [...ptrs.current.values()]; return { dx: Math.abs(p[0]!.x - p[1]!.x), dy: Math.abs(p[0]!.y - p[1]!.y) }; };
  const down = (e: RPointerEvent<SVGSVGElement>) => {
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* abaikan */ }
    const r = e.currentTarget.getBoundingClientRect();
    if (ptrs.current.size === 2) {
      const p = [...ptrs.current.values()];
      const px = (((p[0]!.x + p[1]!.x) / 2 - r.left) / r.width) * W;
      const idx = n - 1 - o - (L + plotW - SW / 2 - px) / SW;
      const q = pair();
      pinch.current = { dx0: q.dx, dy0: q.dy, c0: cnt, v0: vs, px, idx };
      drag.current = null;
      return;
    }
    if (ptrs.current.size === 1) drag.current = { x: e.clientX, y: e.clientY, off: o, vy, moved: false, w: r.width };
  };
  const move = (e: RPointerEvent<SVGSVGElement>) => {
    if (ptrs.current.has(e.pointerId)) ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pz = pinch.current;
    if (pz && ptrs.current.size >= 2) {
      const q = pair();
      let nc = pz.c0;
      if (pz.dx0 >= 30) nc = Math.max(CANDLE_MIN, Math.min(maxCount, (pz.c0 * pz.dx0) / Math.max(8, q.dx)));
      if (pz.dy0 >= 40) setVs(Math.max(0.25, Math.min(6, (pz.v0 * Math.max(8, q.dy)) / pz.dy0)));
      const sw2 = plotW / nc;
      const no = n - 1 - pz.idx - (L + plotW - sw2 / 2 - pz.px) / sw2;
      setCount(nc); setOff(clampOff(no, nc));
      return;
    }
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    if (d.moved) {
      setOff(clampOff(d.off + ((dx / d.w) * W) / SW, cnt));
      setVy(Math.max(-H * 0.9, Math.min(H * 0.9, d.vy + (dy / d.w) * W)));
    }
  };
  const up = (e: RPointerEvent<SVGSVGElement>) => {
    ptrs.current.delete(e.pointerId);
    if (pinch.current) { if (ptrs.current.size < 2) pinch.current = null; drag.current = null; return; }
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved) {
      const r = e.currentTarget.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * W;
      let best = -1, bd = 1e9;
      for (const i of shownIdx) { const dd = Math.abs(x(i) - px); if (dd < bd) { bd = dd; best = i; } }
      if (best >= 0 && bd < Math.max(SW, 9)) {
        setSel(best);
        // ketuk dua kali pada kandel yang sama: buka My Journal berisi posisi dalam kandel itu
        const now = Date.now(), lt = lastTap.current;
        if (lt.i === best && now - lt.t < 380 && onOpen) { lastTap.current = { t: 0, i: -1 }; onOpen(candles[best]!); }
        else lastTap.current = { t: now, i: best };
      }
    }
  };
  const cancel = (e: RPointerEvent<SVGSVGElement>) => { ptrs.current.delete(e.pointerId); if (ptrs.current.size < 2) pinch.current = null; drag.current = null; };

  const grid = [0, 1, 2, 3].map(i => lo + ((hi - lo) * (i + 0.5)) / 4);
  const step = Math.max(1, Math.ceil(58 / SW));
  const colOf = (c: Candle) => (c.c > c.o ? 'var(--pos)' : c.c < c.o ? 'var(--neg)' : 'var(--muted)');
  const bw = Math.max(1.4, SW * 0.62), wk = Math.max(0.9, Math.min(1.6, bw * 0.55));
  const lineCol = candles[n - 1]!.c >= 0 ? 'var(--pos)' : 'var(--neg)';
  const dv = act.c - act.o, dpips = act.pc - act.po, base = startBal || 1;
  const cc = dv > 0 ? 'var(--pos)' : dv < 0 ? 'var(--neg)' : 'var(--muted)';
  const moved = Math.abs(o - def0) > 0.5 || Math.abs(vy) > 2 || Math.abs(vs - 1) > 0.02 || Math.abs(cnt - def) > 1;
  const P = shownIdx.map(i => [x(i), y(candles[i]!.c)] as const);

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="chart candle-chart" role="img"
      aria-label={`Grafik ${isL ? 'garis' : 'kandel'} ${tf}: ${n} kandel, P&L akhir ${candleNum(candles[n - 1]!.c)}`}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}>
      <defs>
        <clipPath id="cdclip"><rect x={L} y={T - 4} width={plotW} height={H - T - B + 8} /></clipPath>
        <linearGradient id="cdg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={lineCol} stopOpacity=".38" /><stop offset="1" stopColor={lineCol} stopOpacity="0" /></linearGradient>
      </defs>
      {grid.map((g, i) => (
        <g key={i}>
          <line x1={L} x2={W - AX} y1={y(g)} y2={y(g)} stroke="var(--line)" strokeDasharray="3 6" />
          <text x={W - 2} y={y(g) + 3.5} textAnchor="end" fontSize="10" fill="var(--muted)">{candleNum(g)}</text>
        </g>
      ))}
      <line x1={L} x2={W - AX} y1={H - B} y2={H - B} stroke="var(--line)" />
      {lo < 0 && hi > 0 && <line x1={L} x2={W - AX} y1={y(0)} y2={y(0)} stroke="var(--muted)" strokeOpacity=".6" strokeDasharray="2 3" />}
      {isL && (
        <g clipPath="url(#cdclip)">
          {P.length > 1 && <path d={`${smoothPath(P)} L${P[P.length - 1]![0]},${H - B} L${P[0]![0]},${H - B} Z`} fill="url(#cdg)" className={fresh ? 'cd-in' : ''} />}
          <path d={P.length > 1 ? smoothPath(P) : `M${L},${P[0]![1]} L${W - AX},${P[0]![1]}`} fill="none" stroke={lineCol} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className={fresh ? 'cd-in' : ''} />
          <line x1={x(ix)} x2={x(ix)} y1={T - 4} y2={H - B} stroke="var(--text)" strokeOpacity=".28" strokeDasharray="3 3" />
          <circle cx={x(ix)} cy={y(act.c)} r="4.6" fill={lineCol} stroke="var(--surface)" strokeWidth="2.2" />
        </g>
      )}
      {!isL && (
        <g clipPath="url(#cdclip)">
          {shownIdx.map(i => {
            const c = candles[i]!;
            const cx = x(i), top = y(Math.max(c.o, c.c)), bot = y(Math.min(c.o, c.c)), k = colOf(c);
            return (
              <g key={c.k} className={fresh ? 'cd cd-in' : 'cd'} style={{ ['--i' as string]: Math.max(0, i - first) }} opacity={i === ix ? 1 : 0.92}>
                {i === ix && <rect x={cx - SW / 2} y={T - 4} width={SW} height={H - T - B + 8} fill="var(--text)" opacity=".06" />}
                <line x1={cx} x2={cx} y1={y(c.h)} y2={y(c.l)} stroke={k} strokeWidth={wk} strokeLinecap="round" />
                <rect x={cx - bw / 2} y={top} width={bw} height={Math.max(1.8, bot - top)} rx={bw > 4 ? 1.2 : 0} fill={k} />
              </g>
            );
          })}
        </g>
      )}
      {shownIdx.map(i => (i % step === 0 && x(i) > L + 14 && x(i) < W - AX - 14
        ? <text key={`l${candles[i]!.k}`} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9.5" fill="var(--muted)">{candles[i]!.short}</text> : null))}
      <text x={L} y={13} fontSize="11.5" fontWeight="700" fill="var(--text)">
        {act.label}<tspan fill="var(--muted)" fontWeight="500" dx="6">{act.n} trade</tspan>
      </text>
      <path d={dv > 0 ? `M${L},${38} L${L + 12},${38} L${L + 6},${27} Z` : dv < 0 ? `M${L},${27} L${L + 12},${27} L${L + 6},${38} Z` : `M${L},${33} L${L + 12},${33}`}
        fill={dv === 0 ? 'none' : cc} stroke={dv === 0 ? cc : 'none'} strokeWidth="2.4" strokeLinecap="round" />
      <text x={L + 19} y={39} fontSize="21" fontWeight="800" fill={cc}>{candleNum(dv)}<tspan fontSize="13.5" fontWeight="700" dx="9">{pctS((dv / base) * 100)}</tspan></text>
      <text x={L} y={58} fontSize="10.5" fontWeight="700" fill={cc}>
        {pipsS(dpips)}<tspan fill="var(--muted)" fontWeight="400" dx="8">|</tspan>
        {isL
          ? <><tspan fill="var(--muted)" fontWeight="500" dx="8">P&amp;L </tspan><tspan fill={act.c >= 0 ? 'var(--pos)' : 'var(--neg)'} fontWeight="600">{candleNum(act.c)}</tspan></>
          : (['O', 'H', 'L', 'C'] as const).map((k, j) => (
            <tspan key={k} fill={colOf(act)} fontWeight="600" dx={j ? 9 : 8}><tspan fill="var(--muted)" fontWeight="500">{k} </tspan>{candleNum({ O: act.o, H: act.h, L: act.l, C: act.c }[k])}</tspan>
          ))}
      </text>
      {moved && <text x={W - AX - 2} y={13} textAnchor="end" fontSize="10" fill="var(--muted)">tekan skala untuk reset</text>}
      {Math.abs(cnt - def) > 1 && <text x={W - AX - 2} y={29} textAnchor="end" fontSize="10" fill="var(--muted)">{Math.round(cnt)} kandel</text>}
    </svg>
  );
}
