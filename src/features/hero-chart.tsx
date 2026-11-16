import { useEffect, useMemo, useRef, useState } from 'react';
import type { Trade } from '../domain/types';
import { buildCandles, TIMEFRAMES, type Candle, type Tf } from '../domain/candles';
import { CandleChart } from '../ui/candle-chart';

type Kind = 'line' | 'candle';
const KEY = 'pelita-chart';
function load(): { kind: Kind; tf: Tf } {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return { kind: p.kind === 'line' ? 'line' : 'candle', tf: TIMEFRAMES.some(t => t[0] === p.tf) ? p.tf : 'SES' };
  } catch { return { kind: 'candle', tf: 'SES' }; }
}

/** Grafik Performance: ganti Kandel / Garis + skala 1H · 1S · 1D · 1W · 1M · 1Y. */
export function HeroChart({ trades, startBal, onOpen, height, fit }: { trades: Trade[]; startBal: number; onOpen: (c: Candle) => void; height?: number; fit?: boolean }) {
  const [pref, setPref] = useState(load);
  const [fitH, setFitH] = useState<number | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const cur = useRef<number | undefined>(height);
  // Tinggi grafik menyesuaikan layar: sisa tinggi layar setelah bagian lain halaman, supaya seluruh halaman utama muat tanpa tertutup menu bawah.
  useEffect(() => {
    if (!fit) return;
    const run = () => {
      const page = wrap.current?.closest('.page');
      if (!page) return;
      let bottom = 0;
      page.querySelectorAll('*').forEach(e => { const r = (e as HTMLElement).getBoundingClientRect(); if (r.height > 0) bottom = Math.max(bottom, r.bottom); });
      const pad = parseFloat(getComputedStyle(page).paddingBottom) || 0;
      const total = bottom + window.scrollY + pad;
      const base = cur.current ?? 300;
      const next = Math.round(Math.max(220, Math.min(520, window.innerHeight - (total - base))));
      if (Math.abs(next - base) >= 3) { cur.current = next; setFitH(next); }
    };
    run();
    const t = [setTimeout(run, 120), setTimeout(run, 700), setTimeout(run, 2000)];
    window.addEventListener('resize', run);
    return () => { t.forEach(clearTimeout); window.removeEventListener('resize', run); };
  }, [fit, trades.length, pref.tf]);
  const [rk, setRk] = useState(0);
  const save = (p: { kind: Kind; tf: Tf }) => { setPref(p); try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* tidak kritis */ } };
  const candles = useMemo(() => buildCandles(trades, pref.tf), [trades, pref.tf]);
  const isLine = pref.kind === 'line';
  return (
    <div ref={wrap} className="hero-chart stack" style={{ gap: 'var(--s2)' }}>
      <CandleChart candles={candles} tf={pref.tf} mode={pref.kind} resetKey={rk} startBal={startBal} onOpen={onOpen} height={fitH ?? height} />
      <div className="chart-tools">
        <div className="seg tf" role="group" aria-label="Skala grafik">
          {TIMEFRAMES.map(([k, l]) => (
            <button key={k} type="button" aria-pressed={pref.tf === k} onClick={() => { save({ ...pref, tf: k }); setRk(r => r + 1); }}>{l}</button>
          ))}
        </div>
        <button type="button" className="kind" role="switch" aria-checked={isLine} aria-label={isLine ? 'Beralih ke grafik kandel' : 'Beralih ke grafik garis'}
          onClick={() => save({ ...pref, kind: isLine ? 'candle' : 'line' })}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            {isLine
              ? <path d="M3 17l5-6 4 3 8-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              : <><path d="M7 3v3M7 18v3" stroke="var(--neg)" strokeWidth="2" strokeLinecap="round" /><rect x="4.5" y="6" width="5" height="12" rx="1.2" fill="var(--neg)" /><path d="M17 2v3M17 17v4" stroke="var(--pos)" strokeWidth="2" strokeLinecap="round" /><rect x="14.5" y="5" width="5" height="12" rx="1.2" fill="var(--pos)" /></>}
          </svg>
          <span>{isLine ? 'Garis' : 'Kandel'}</span>
        </button>
      </div>
    </div>
  );
}
