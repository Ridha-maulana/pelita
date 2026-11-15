import { useMemo, useState } from 'react';
import type { Account, Trade } from '../domain/types';
import { PERIODS, type Period, tradeDate } from '../domain/period';
import { computeStats, byCloseTime, type Stats } from '../domain/stats';
import { advancedRows } from '../domain/advanced';
import { computeDna, BAND_LABEL } from '../domain/dna';
import { isClosed } from '../domain/trading';
import { dayKeyOf, wibParts, daysInMonth, mondayOffset } from '../domain/time';
import { signedMoney, tone, MONTHS_ID } from '../domain/format';
import { Icon } from '../ui/icons';
import { Radar } from '../ui/charts';
import { FullPage } from '../ui/primitives';
import { DrillDown } from './drilldown';

export const PERIOD_LABEL: Record<Period, string> = { 'All time': 'All time', 'Year-to-date': 'Tahun ini', Monthly: 'Bulan ini', Weekly: '7 hari', 'Custom date range': 'Rentang tanggal' };
export const monthName = (key: string) => `${MONTHS_ID[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
const mpct = (v: number, base: number) => { const p = (v / (base || 1)) * 100, a = Math.abs(p); return (p > 0.004 ? '+' : p < -0.004 ? '-' : '') + (a >= 10 ? a.toFixed(1) : a.toFixed(2)) + '%'; };
const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function PeriodSelect({ period, setPeriod }: { period: Period; setPeriod: (p: Period) => void }) {
  return (
    <div className="period-row">
      <div><b>Periode</b><small>Atur rentang analisis</small></div>
      <select className="input" aria-label="Periode" value={period} onChange={e => setPeriod(e.target.value as Period)}>
        {PERIODS.filter(p => p !== 'Custom date range').map(p => <option key={p} value={p}>{PERIOD_LABEL[p]}</option>)}
      </select>
    </div>
  );
}

/** Kalender satu bulan: total P&L bulan, kotak tanggal yang punya posisi bisa diketuk. */
export function CalendarCard({ acc, onPickDay }: { acc: Account; onPickDay: (day: string) => void }) {
  const now = wibParts(Date.now());
  const [y, setY] = useState(now.year);
  const [m, setM] = useState(now.month);
  const info = useMemo(() => {
    const r: Record<string, { pnl: number; n: number }> = {};
    for (const t of acc.trades) {
      if (t.deletedAt) continue;
      const k = dayKeyOf(tradeDate(t));
      const x = (r[k] ??= { pnl: 0, n: 0 });
      x.pnl += t.status === 'closed' ? t.pnl : 0;
      x.n += 1;
    }
    return r;
  }, [acc]);
  const go = (d: number) => { const t = m + d; setY(y + Math.floor((t - 1) / 12)); setM(((t - 1 + 12) % 12) + 1); };
  const prefix = `${y}-${String(m).padStart(2, '0')}`;
  const monthPnl = Object.keys(info).filter(k => k.startsWith(prefix)).reduce((a, k) => a + info[k]!.pnl, 0);
  return (
    <section className="card stack" aria-label="Kalender">
      <div className="row between"><h2 className="h2">Kalender</h2><b className={tone(monthPnl)}>{signedMoney(monthPnl, acc.currency)}</b></div>
      <div className="row between">
        <button className="icon-btn boxed" aria-label="Bulan sebelumnya" onClick={() => go(-1)}><Icon name="chevLeft" /></button>
        <b>{MONTHS_ID[m - 1]} {y}</b>
        <button className="icon-btn boxed" aria-label="Bulan berikutnya" onClick={() => go(1)}><Icon name="chevRight" /></button>
      </div>
      <div className="cal-grid" aria-hidden="true">{['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d => <span key={d} className="muted" style={{ textAlign: 'center', fontSize: 12 }}>{d}</span>)}</div>
      <div className="cal-grid">
        {Array.from({ length: mondayOffset(y, m) }, (_, i) => <div key={`e${i}`} className="cal-cell empty" />)}
        {Array.from({ length: daysInMonth(y, m) }, (_, i) => {
          const day = `${prefix}-${String(i + 1).padStart(2, '0')}`;
          const v = info[day];
          return (
            <button key={day} className={`cal-cell ${v ? (v.pnl > 0 ? 'win' : v.pnl < 0 ? 'loss' : '') : ''}`} disabled={!v}
              aria-label={v ? `${day}: ${v.n} posisi, ${signedMoney(v.pnl, acc.currency)}` : day} onClick={() => onPickDay(day)}>
              <span>{i + 1}</span>{v && <small>{v.n}</small>}
            </button>
          );
        })}
      </div>
      <p className="muted" style={{ fontSize: 13 }}>Ketuk tanggal yang punya posisi untuk membuka jurnal hari itu.</p>
    </section>
  );
}

export function CalendarPage({ acc, onClose, onPickDay }: { acc: Account; onClose: () => void; onPickDay: (day: string) => void }) {
  return (
    <FullPage title="Kalender" sub={acc.name} onClose={onClose}>
      <CalendarCard acc={acc} onPickDay={d => { onPickDay(d); onClose(); }} />
    </FullPage>
  );
}

interface StatsProps {
  acc: Account; period: Period; setPeriod: (p: Period) => void; filtered: Trade[]; s: Stats; rangeText: string;
  monthSel: string | null; setMonthSel: (k: string | null) => void; allClosed: Trade[]; onClose: () => void; onPickDay: (d: string) => void;
}

export function StatsPage(p: StatsProps) {
  const { acc, s, allClosed, monthSel, setMonthSel } = p;
  const nowP = wibParts(Date.now());
  const [year, setYear] = useState(nowP.year);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`;
    const xs = allClosed.filter(t => wibParts(tradeDate(t)).monthKey === key);
    const pnl = xs.reduce((a, t) => a + t.pnl, 0);
    return { key, i, n: xs.length, pnl, wins: xs.filter(t => t.pnl > 0).length };
  }), [allClosed, year]);
  const selKey = monthSel ?? `${nowP.year}-${String(nowP.month).padStart(2, '0')}`;
  const sel = months.find(m => m.key === selKey) ?? { key: selKey, i: Number(selKey.slice(5, 7)) - 1, n: 0, pnl: 0, wins: 0 };
  const maxAbs = Math.max(1, ...months.map(m => Math.abs(m.pnl)));
  const now = wibParts(Date.now());
  const rows = advancedRows(acc, s, { y: now.year, m: now.month - 1 });
  const syms = useMemo(() => {
    const m = new Map<string, { n: number; pnl: number }>();
    for (const t of p.filtered) { const x = m.get(t.symbol) ?? { n: 0, pnl: 0 }; x.n++; x.pnl += t.pnl; m.set(t.symbol, x); }
    return [...m].map(([sym, v]) => ({ sym, ...v })).sort((a, b) => b.pnl - a.pnl);
  }, [p.filtered]);
  const maxSym = Math.max(1, ...syms.map(x => Math.abs(x.pnl)));
  const wins = s.wins.length, losses = s.losses.length, wr = s.n ? Math.round((wins / s.n) * 100) : 0;
  return (
    <FullPage title="Advanced Statistics" sub={`Analisis ${PERIOD_LABEL[p.period].toLowerCase()} · ${acc.name}`} badge="STAT" onClose={p.onClose}>
      <PeriodSelect period={p.period} setPeriod={v => { p.setPeriod(v); setMonthSel(null); }} />
      <div className="fp-intro"><h1>Advanced Statistics</h1><p>Statistik lengkap akun · {s.n} trade</p></div>

      <CalendarCard acc={acc} onPickDay={d => { p.onPickDay(d); }} />

      <section className="card stack" aria-label="Monthly gain">
        <div className="row between">
          <h2 className="h2">Monthly gain</h2>
          <div className="row" style={{ gap: 'var(--s2)' }}>
            <button className="icon-btn boxed" aria-label="Tahun sebelumnya" onClick={() => setYear(year - 1)}><Icon name="chevLeft" size={18} /></button>
            <b>{year}</b>
            <button className="icon-btn boxed" aria-label="Tahun berikutnya" onClick={() => setYear(year + 1)}><Icon name="chevRight" size={18} /></button>
          </div>
        </div>
        <div className="mbars" role="group" aria-label="Gain per bulan">
          {months.map(m => {
            const h = m.n ? Math.max(6, (Math.abs(m.pnl) / maxAbs) * 100) : 0;
            return (
              <button key={m.key} className={`mbar ${sel.key === m.key ? 'on' : ''}`} aria-pressed={monthSel === m.key} onClick={() => setMonthSel(monthSel === m.key ? null : m.key)}
                aria-label={`${MONTHS_ID[m.i]} ${year}: ${m.n} posisi, ${signedMoney(m.pnl, acc.currency)}`}>
                <span className="mbar-val">{sel.key === m.key && m.n ? mpct(m.pnl, s.start) : ''}</span>
                <span className="mbar-col"><i style={{ height: `${h}%`, background: m.pnl < 0 ? 'var(--neg)' : 'var(--pos)' }} /></span>
                <span className="mbar-lbl">{MON3[m.i]}</span>
              </button>
            );
          })}
        </div>
        <div className="tiles">
          <div className="tile"><small>Gain {MON3[sel.i]}</small><b className={tone(sel.pnl)}>{mpct(sel.pnl, s.start)}</b></div>
          <div className="tile"><small>Profit</small><b className={tone(sel.pnl)}>{signedMoney(sel.pnl, acc.currency).replace(/^\+/, '')}</b></div>
          <div className="tile"><small>Trades</small><b>{sel.n}</b></div>
          <div className="tile"><small>Win rate</small><b>{sel.n ? Math.round((sel.wins / sel.n) * 100) : 0}%</b></div>
        </div>
        <p className="muted" style={{ fontSize: 13 }}>Ketuk bulan untuk memfilter semua kartu di bawah; ketuk lagi untuk melepas.</p>
      </section>

      <DrillDown trades={p.filtered} currency={acc.currency} rangeText={p.rangeText} startBal={s.start} />

      <section className="card stack" aria-label="Profitability">
        <div className="row between"><b className="pos">Profitability · {wr}% menang</b><span className="muted">{wins} W / {losses} L</span></div>
        <div className="pbar"><i style={{ width: `${wr}%` }} /></div>
        <div>{rows.map(([l, v, t]) => <div className="adv-row" key={l}><span>{l}</span><b className={t}>{v}</b></div>)}</div>
        <p className="muted" style={{ fontSize: 13 }}>
          Pips dihitung dari entry ke close: XAUUSD 1 pip = 0,10; pair JPY 0,01; pair lain 0,0001; NAS100 &amp; BTCUSD 1 poin. Statistik hanya memakai trade closed; hari dihitung menurut waktu close (WIB).
        </p>
      </section>

      <section className="card stack" aria-label="P&L per pair">
        <h2 className="h2">P&amp;L per pair</h2>
        {syms.length === 0 ? <p className="muted">Belum ada data.</p> : syms.map(x => (
          <div key={x.sym} className="dd-item">
            <div className="row between"><strong>{x.sym}</strong><b className={tone(x.pnl)}>{signedMoney(x.pnl, acc.currency)}</b></div>
            <div className="muted">{x.n} posisi</div>
            <div className="dd-bar"><i style={{ width: `${Math.max(3, (Math.abs(x.pnl) / maxSym) * 100)}%`, background: x.pnl < 0 ? 'var(--neg)' : 'var(--pos)' }} /></div>
          </div>
        ))}
      </section>
    </FullPage>
  );
}

export function DnaPage({ acc, period, setPeriod, filtered, onClose }: { acc: Account; period: Period; setPeriod: (p: Period) => void; filtered: Trade[]; onClose: () => void }) {
  const [open, setOpen] = useState(true);
  const s = computeStats(acc, filtered);
  const d = computeDna(s, byCloseTime(filtered.filter(isClosed)));
  return (
    <FullPage title="Trader DNA" sub={`Analisis ${PERIOD_LABEL[period].toLowerCase()} · ${acc.name}`} badge="DNA" onClose={onClose}>
      <PeriodSelect period={period} setPeriod={setPeriod} />
      <div className="fp-intro"><h1>Trader DNA</h1><p>Rapor karakter trading berbasis data</p></div>
      <section className="card stack" aria-label="Skor keseluruhan">
        <div className="row between">
          <h2 className="h2 row" style={{ gap: 'var(--s2)' }}><Icon name="activity" size={20} />Skor Keseluruhan</h2>
          {d.ready && <span className="grade-pill">Grade {d.grade} · {d.overall}</span>}
        </div>
        {!d.ready ? <p className="muted">Butuh minimal 3 trade closed pada periode ini untuk membaca karakter trading.</p> : (
          <>
            <Radar dims={d.dims} />
            <div className="stack" style={{ gap: 'var(--s3)' }}>
              {d.dims.map(x => (
                <div key={x.key}>
                  <div className="row between"><span>{x.name}</span><b>{x.score}</b></div>
                  <div className="pbar thin"><i style={{ width: `${Math.max(2, x.score)}%` }} /></div>
                </div>
              ))}
            </div>
            <p className="dna-quick"><b>Baca cepat:</b> Terkuat di <b>{d.strongest.name}</b>, paling bisa ditingkatkan di <b>{d.weakest.name}</b>. Grade {d.grade} artinya skor rata-rata {d.overall}/100 dari 5 dimensi di bawah.</p>
            <button className="link-btn" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? '▾' : '▸'} Rincian skor &amp; cara menjadi lebih baik</button>
            {open && d.dims.map(x => (
              <article key={x.key} className={`dna-card band${x.band}`}>
                <div className="row between"><h3>{x.name}</h3><span className="grade-pill sm">{x.score}/100 · {BAND_LABEL[x.band]}</span></div>
                <p className="muted" style={{ fontSize: 12, textAlign: 'right' }}>{x.meta}</p>
                <p>{x.desc}</p>
                <p><b className="dna-tip">Cara tingkatkan:</b> {x.tip}</p>
              </article>
            ))}
          </>
        )}
      </section>
    </FullPage>
  );
}
