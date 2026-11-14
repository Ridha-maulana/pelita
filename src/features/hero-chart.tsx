import { useMemo, useState } from 'react';
import type { Trade } from '../domain/types';
import { buildCandles, TIMEFRAMES, type Candle, type Tf } from '../domain/candles';
import { CandleChart } from '../ui/candle-chart';

type Kind = 'line' | 'candle';
const KEY = 'pelita-chart';
function load(): { kind: Kind; tf: Tf } {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return { kind: p.kind === 'candle' ? 'candle' : 'line', tf: TIMEFRAMES.some(t => t[0] === p.tf) ? p.tf : 'SES' };
  } catch { return { kind: 'line', tf: 'SES' }; }
}

/** Grafik Performance: ganti Kandel / Garis + skala 1H · 1S · 1D · 1W · 1M · 1Y. */
export function HeroChart({ trades, startBal, onOpen }: { trades: Trade[]; startBal: number; onOpen: (c: Candle) => void }) {
  const [pref, setPref] = useState(load);
  const [rk, setRk] = useState(0);
  const save = (p: { kind: Kind; tf: Tf }) => { setPref(p); try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* tidak kritis */ } };
  const candles = useMemo(() => buildCandles(trades, pref.tf), [trades, pref.tf]);
  const isLine = pref.kind === 'line';
  return (
    <div className="hero-chart stack" style={{ gap: 'var(--s2)' }}>
      <CandleChart candles={candles} tf={pref.tf} mode={pref.kind} resetKey={rk} startBal={startBal} onOpen={onOpen} />
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
      <p className="muted" style={{ fontSize: 12 }}>Geser = pindah · cubit = zoom · ketuk 2× kandel = buka jurnalnya</p>
    </div>
  );
}
