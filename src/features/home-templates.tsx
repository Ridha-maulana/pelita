import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Account, Trade } from '../domain/types';
import type { Stats } from '../domain/stats';
import { buildCandles, TIMEFRAMES, type Candle, type Tf } from '../domain/candles';
import { tradeDate } from '../domain/period';
import { pipsOf } from '../domain/trading';
import { money, pctS, signed, signedMoney, tone } from '../domain/format';
import { Icon, type IconName } from '../ui/icons';
import { smoothPath } from '../ui/candle-chart';
import { HeroChart } from './hero-chart';
import { loadFont } from '../appearance/engine';

export interface HomeProps {
  n: number; acc: Account; s: Stats; trades: Trade[]; now: number; rangeText: string;
  onPeriod: () => void; onAccount: () => void; onStats: () => void; onDna: () => void; onShare: () => void;
  onOpenIds: (ids: string[]) => void; onJournal: () => void;
}

const safe = (a: number, b: number) => (b ? a / b : 0);
const pfText = (s: Stats) => (s.profitFactor === Infinity ? '∞' : s.profitFactor.toFixed(2));
const pipText = (v: number) => (Math.abs(v) >= 10000 ? `${v > 0 ? '+' : v < 0 ? '-' : ''}${(Math.abs(v) / 1000).toFixed(1)}k` : signed(v, 1));
const dayLabel = (k: string) => `${k.slice(8)}/${k.slice(5, 7)}`;

interface Metric { label: string; value: string; tone: string; icon: IconName; color: string }
function metrics(s: Stats, cur: string): Metric[] {
  return [
    { label: 'Win rate', value: `${s.winRate.toFixed(0)}%`, tone: '', icon: 'trophy', color: 'var(--pos)' },
    { label: 'Profit factor', value: pfText(s), tone: '', icon: 'trend', color: 'var(--accent)' },
    { label: 'Total trade', value: String(s.n), tone: '', icon: 'file', color: 'var(--muted)' },
    { label: 'Avg R:R', value: s.avgRR ? `1 : ${s.avgRR.toFixed(1)}` : '—', tone: '', icon: 'scale', color: 'var(--muted)' },
    { label: 'Total pips', value: pipText(s.totalPips), tone: tone(s.totalPips), icon: 'target', color: 'var(--neg)' },
    { label: 'Hari terbaik', value: s.bestDayKey ? signedMoney(s.dayPnl[s.bestDayKey]!, cur) : '—', tone: s.bestDayKey ? 'pos' : '', icon: 'star', color: 'var(--accent)' }
  ];
}

function Hero({ p, cls, extra }: { p: HomeProps; cls?: string; extra?: ReactNode }) {
  const { s, acc, now } = p, cur = acc.currency, growth = safe(s.total, s.start) * 100;
  return (
    <section className={`card stack tp-hero ${cls ?? ''}`} aria-label="Ringkasan">
      <div className="row between">
        <span className="eyebrow">Total P&amp;L</span>
        <div className="row" style={{ gap: 'var(--s2)' }}>
          <button className="icon-btn" aria-label="Bagikan ke story" onClick={p.onShare}><Icon name="share" size={18} /></button>
          <button className="chip" onClick={p.onPeriod} aria-label="Pilih periode">{p.rangeText}<Icon name="chevDown" size={14} /></button>
        </div>
      </div>
      <div className={`hero-num ${tone(s.total)}`}>{signedMoney(s.total, cur)}</div>
      <p className="hero-sub"><b className={tone(s.total)}>{pctS(growth)}</b> dari saldo awal {money(s.start, cur)} · saldo {money(now, cur)}</p>
      {extra}
    </section>
  );
}

function AccountRow({ p }: { p: HomeProps }) {
  return (
    <button className="tp-acct" onClick={p.onAccount} aria-label={`Akun: ${p.acc.name}. Ganti akun`}>
      <span className="tp-ai"><Icon name="coins" size={18} /></span>
      <span className="grow"><small>Akun aktif</small><strong>{p.acc.name}</strong></span>
      <Icon name="chevDown" size={16} />
    </button>
  );
}

function Facts({ p }: { p: HomeProps }) {
  const { s, acc, now } = p, cur = acc.currency, growth = safe(s.total, s.start) * 100;
  const rows: [string, string, string][] = [['Saldo awal', money(s.start, cur), ''], ['Sekarang', money(now, cur), tone(now - s.start)], ['Pertumbuhan', pctS(growth), tone(growth)], ['Hari aktif', String(s.dayKeys.length), '']];
  return <div className="tp-facts">{rows.map(([l, v, t]) => <div key={l}><small>{l}</small><b className={t}>{v}</b></div>)}</div>;
}

function MetricGrid({ p, cols }: { p: HomeProps; cols?: number }) {
  return (
    <section className="tp-metrics" style={cols ? { gridTemplateColumns: `repeat(${cols}, 1fr)` } : undefined} aria-label="Statistik">
      {metrics(p.s, p.acc.currency).map(m => (
        <div key={m.label} className="tile">
          <small><span className="tp-mi" style={{ color: m.color }}><Icon name={m.icon} size={16} /></span>{m.label}</small>
          <b className={m.tone}>{m.value}</b>
        </div>
      ))}
    </section>
  );
}

function Actions({ p }: { p: HomeProps }) {
  return (
    <div className="row">
      <button className="btn grow" onClick={p.onStats}><Icon name="list" size={18} />Statistik</button>
      <button className="btn grow" onClick={p.onDna}><Icon name="dna" size={18} />DNA trader</button>
    </div>
  );
}

function TfBar({ tf, set }: { tf: Tf; set: (t: Tf) => void }) {
  return (
    <div className="seg tf" role="group" aria-label="Skala grafik">
      {TIMEFRAMES.map(([k, l]) => <button key={k} type="button" aria-pressed={tf === k} onClick={() => set(k)}>{l}</button>)}
    </div>
  );
}

function Donut({ s }: { s: Stats }) {
  const wins = s.wins.length, losses = s.losses.length, be = Math.max(0, s.n - wins - losses), tot = s.n || 1, R = 64, C = 2 * Math.PI * R;
  const seg = (n: number, off: number) => ({ strokeDasharray: `${(n / tot) * C} ${C}`, strokeDashoffset: -(off / tot) * C });
  return (
    <div className="tp-donut-row">
      <svg viewBox="0 0 160 160" className="tp-donut" role="img" aria-label={`Menang ${wins}, kalah ${losses}, impas ${be}`}>
        <g transform="rotate(-90 80 80)" fill="none" strokeWidth="24">
          <circle cx="80" cy="80" r={R} stroke="var(--surface-2)" />
          {wins > 0 && <circle cx="80" cy="80" r={R} stroke="var(--pos)" style={seg(wins, 0)} />}
          {losses > 0 && <circle cx="80" cy="80" r={R} stroke="var(--neg)" style={seg(losses, wins)} />}
          {be > 0 && <circle cx="80" cy="80" r={R} stroke="var(--faint)" style={seg(be, wins + losses)} />}
        </g>
        <text x="80" y="88" textAnchor="middle" fontSize="26" fontWeight="500" fill="var(--text)">{s.n ? Math.round((wins / tot) * 100) : 0}%</text>
      </svg>
      <ul className="tp-legend">
        {([['var(--pos)', 'Menang', wins], ['var(--neg)', 'Kalah', losses], ['var(--faint)', 'Impas', be]] as const).map(([c, l, v]) => (
          <li key={l}><i className="dot" style={{ background: c }} />{l}<b>{v}</b></li>
        ))}
      </ul>
    </div>
  );
}

function NoData() { return <p className="muted tp-empty">Belum ada trade pada periode ini</p>; }

/* ---------- grafik ---------- */
const niceTicks = (lo: number, hi: number, k = 4): number[] => {
  const span = hi - lo || 1, raw = span / k, mag = 10 ** Math.floor(Math.log10(raw)), f = raw / mag;
  const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag, out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.abs(v) < 1e-9 ? 0 : v);
  return out;
};
const compact = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : String(Math.round(v)));

/** Kurva ekuitas bertangga (Template 1). */
function Stepped({ trades, start }: { trades: Trade[]; start: number }) {
  const [rg, setRg] = useState<'H' | 'D' | 'W' | 'M' | 'A'>('A');
  const pts = useMemo(() => {
    const all = trades.filter(t => t.status === 'closed' && !t.deletedAt).map(t => ({ iso: tradeDate(t), t: Date.parse(tradeDate(t)), pnl: t.pnl })).filter(x => Number.isFinite(x.t)).sort((a, b) => a.t - b.t);
    if (!all.length) return [];
    const last = all[all.length - 1]!.t, hrs = { H: 1, D: 24, W: 168, M: 720, A: 0 }[rg], cut = hrs ? last - hrs * 36e5 : -Infinity;
    let eq = start; const out: { t: number; eq: number; iso: string }[] = [];
    for (const p of all) { eq += p.pnl; if (p.t >= cut) out.push({ t: p.t, eq, iso: p.iso }); }
    if (out.length === 1) out.unshift({ t: out[0]!.t - 36e5, eq: out[0]!.eq - all.find(p => p.t === out[0]!.t)!.pnl, iso: out[0]!.iso });
    return out;
  }, [trades, start, rg]);
  const W = 340, H = 200, L = 44, R = 10, T = 12, B = 24;
  const body = (() => {
    if (!pts.length) return <NoData />;
    const t0 = pts[0]!.t, t1 = pts[pts.length - 1]!.t, span = Math.max(t1 - t0, 36e5);
    const vals = pts.map(p => p.eq), lo0 = Math.min(...vals), hi0 = Math.max(...vals), pad = (hi0 - lo0) * 0.12 || 1;
    const lo = lo0 - pad, hi = hi0 + pad, ticks = niceTicks(lo, hi, 4);
    const x = (t: number) => L + ((t - t0) / span) * (W - L - R), y = (v: number) => T + ((hi - v) / (hi - lo)) * (H - T - B);
    let d = `M${x(pts[0]!.t)},${y(pts[0]!.eq)}`;
    for (let i = 1; i < pts.length; i++) d += ` H${x(pts[i]!.t)} V${y(pts[i]!.eq)}`;
    const last = pts[pts.length - 1]!;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Kurva ekuitas">
        <defs><linearGradient id="tp1g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--tp)" stopOpacity=".28" /><stop offset="1" stopColor="var(--tp)" stopOpacity="0" /></linearGradient></defs>
        {ticks.map(v => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" /><text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="var(--faint)">{compact(v)}</text></g>)}
        <path d={`${d} V${H - B} H${x(pts[0]!.t)} Z`} fill="url(#tp1g)" />
        <path d={d} fill="none" stroke="var(--tp)" strokeWidth="2.2" strokeLinejoin="round" />
        <circle cx={x(last.t)} cy={y(last.eq)} r="4.5" fill="var(--tp)" stroke="var(--surface)" strokeWidth="2.2" />
        {[pts[0]!, last].map((p, i) => <text key={i} x={i ? W - R : L} y={H - 6} textAnchor={i ? 'end' : 'start'} fontSize="10" fill="var(--faint)">{dayLabel(p.iso.slice(0, 10))}</text>)}
      </svg>
    );
  })();
  return (
    <div className="stack" style={{ gap: 'var(--s2)' }}>
      <div className="seg tf" role="group" aria-label="Rentang">
        {([['H', '1H'], ['D', '1D'], ['W', '1W'], ['M', '1M'], ['A', 'Semua']] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={rg === k} onClick={() => setRg(k)}>{l}</button>)}
      </div>
      {body}
    </div>
  );
}

/** Area halus P&L kumulatif per kandel (Template 2). */
function Area({ candles }: { candles: Candle[] }) {
  if (!candles.length) return <NoData />;
  const W = 340, H = 190, L = 44, R = 10, T = 14, B = 24;
  const vals = [0, ...candles.map(c => c.c)], lo0 = Math.min(0, ...vals), hi0 = Math.max(0, ...vals), pad = (hi0 - lo0) * 0.1 || 1, lo = lo0, hi = hi0 + pad, ticks = niceTicks(lo, hi, 4);
  const n = vals.length, x = (i: number) => L + (n > 1 ? i / (n - 1) : 1) * (W - L - R), y = (v: number) => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const P = vals.map((v, i) => [x(i), y(v)] as const), ln = P.length > 1 ? smoothPath(P) : '', last = P[P.length - 1]!;
  const labels = [candles[0]!, candles[candles.length - 1]!];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Grafik P&L kumulatif">
      <defs><linearGradient id="tp2g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--tp)" stopOpacity=".3" /><stop offset="1" stopColor="var(--tp)" stopOpacity="0" /></linearGradient></defs>
      {ticks.map(v => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray={v === 0 ? undefined : '3 5'} /><text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="var(--faint)">{compact(v)}</text></g>)}
      <path d={`${ln} L${last[0]},${y(Math.max(lo, 0))} L${P[0]![0]},${y(Math.max(lo, 0))} Z`} fill="url(#tp2g)" />
      <path d={ln} fill="none" stroke="var(--tp)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="5" fill="var(--tp)" stroke="var(--surface)" strokeWidth="2.4" />
      {labels.map((c, i) => <text key={i} x={i ? W - R : L} y={H - 6} textAnchor={i ? 'end' : 'start'} fontSize="10" fill="var(--faint)">{c.short}</text>)}
    </svg>
  );
}

/** Batang P&L kumulatif 14 kandel terakhir (Template 3). */
function Bars({ candles, sel, onPick }: { candles: Candle[]; sel: number; onPick: (i: number) => void }) {
  if (!candles.length) return <NoData />;
  const W = 340, H = 190, AX = 40, T = 14, B = 24, PW = W - AX, n = candles.length, slot = PW / n, bw = Math.min(slot * 0.7, 26);
  const vals = candles.map(c => c.c), lo0 = Math.min(0, ...vals), hi0 = Math.max(0, ...vals), pad = (hi0 - lo0) * 0.06 || 1, lo = lo0 < 0 ? lo0 - pad : 0, hi = hi0 + pad;
  const y = (v: number) => T + ((hi - v) / (hi - lo)) * (H - T - B), ticks = niceTicks(lo, hi, 3), y0 = y(Math.max(lo, 0));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Grafik batang P&L kumulatif">
      {ticks.map(v => <g key={v}><line x1={0} x2={PW} y1={y(v)} y2={y(v)} stroke="var(--line)" /><text x={W - 2} y={y(v) + 4} textAnchor="end" fontSize="10" fill="var(--faint)">{compact(v)}</text></g>)}
      {candles.map((c, i) => {
        const top = Math.min(y0, y(c.c)), h = Math.max(3, Math.abs(y0 - y(c.c)));
        return (
          <g key={c.k} onClick={() => onPick(i)} style={{ cursor: 'pointer' }}>
            <rect x={i * slot} y={0} width={slot} height={H - B} fill="transparent" />
            <rect x={i * slot + (slot - bw) / 2} y={top} width={bw} height={h} rx="4" fill="var(--tp)" opacity={i === sel ? 1 : 0.35} />
          </g>
        );
      })}
      {[candles[0]!, candles[n - 1]!].map((c, i) => <text key={i} x={i ? PW : 0} y={H - 6} textAnchor={i ? 'end' : 'start'} fontSize="10" fill="var(--faint)">{c.short}</text>)}
    </svg>
  );
}

/* ---------- template ---------- */
function T1({ p }: { p: HomeProps }) {
  const { s, acc, trades } = p, cur = acc.currency;
  const spark = s.cumByDay, sn = spark.length, lo = Math.min(...spark, 0), hi = Math.max(...spark, 1), sp = hi - lo || 1;
  const line = spark.map((v, i) => `${sn === 1 ? 0 : (i / (sn - 1)) * 340},${8 + ((hi - v) / sp) * 56}`).join(' ');
  const syms = useMemo(() => {
    const m = new Map<string, { n: number; pnl: number }>();
    for (const t of trades) { const x = m.get(t.symbol) ?? { n: 0, pnl: 0 }; x.n++; x.pnl += t.pnl; m.set(t.symbol, x); }
    return [...m].map(([sym, v]) => ({ sym, ...v })).sort((a, b) => b.n - a.n).slice(0, 3);
  }, [trades]);
  const recent = useMemo(() => trades.filter(t => t.status === 'closed' && !t.deletedAt).sort((a, b) => Date.parse(tradeDate(b)) - Date.parse(tradeDate(a))).slice(0, 6), [trades]);
  const days = s.dayKeys.slice(-5).reverse(), dmax = Math.max(1, ...days.map(k => Math.abs(s.dayPnl[k] ?? 0)));
  const growth = safe(s.total, s.start) * 100;
  return (
    <>
      <Hero p={p} extra={<>
        {sn > 1 && <svg viewBox="0 0 340 72" preserveAspectRatio="none" className="tp-spark" aria-hidden="true"><polyline points={line} fill="none" stroke="var(--tp)" strokeWidth="2" strokeLinejoin="round" /></svg>}
        <AccountRow p={p} />
      </>} />
      <section className="tiles" aria-label="Saldo">
        <div className="tile"><small>Saldo awal</small><b>{money(s.start, cur)}</b></div>
        <div className="tile"><small>Saldo sekarang</small><b className={tone(p.now - s.start)}>{money(p.now, cur)}</b></div>
        <div className="tile"><small>Pertumbuhan</small><b className={tone(growth)}>{pctS(growth)}</b></div>
        <div className="tile"><small>Hari aktif</small><b>{s.dayKeys.length}</b></div>
      </section>
      <MetricGrid p={p} />
      <section className="card stack" aria-label="Kurva ekuitas"><h2 className="h2">Kurva ekuitas</h2><Stepped trades={trades} start={s.start} /></section>
      <section className="card stack" aria-label="Rincian P&L"><h2 className="h2">Rincian P&amp;L</h2><Donut s={s} />
        {syms.length > 0 && <div className="list">{syms.map(x => <div key={x.sym} className="item" style={{ minHeight: 44 }}><span className="t grow">{x.sym}</span><span className="muted">{x.n} posisi</span><b className={tone(x.pnl)}>{signedMoney(x.pnl, cur)}</b></div>)}</div>}
      </section>
      <section className="card stack" aria-label="Trade terbaru">
        <div className="row between"><h2 className="h2">Trade terbaru</h2><button className="chip" onClick={p.onJournal}>Lihat semua<Icon name="chevRight" size={14} /></button></div>
        {recent.length === 0 ? <NoData /> : <div className="list">{recent.map(t => <div key={t.id} className="item" style={{ minHeight: 52 }}>
          <span className="grow"><div className="t">{t.symbol}<span className="tag" style={{ marginLeft: 6 }}>{t.side}</span></div><div className="d">{tradeDate(t).slice(8, 10)}/{tradeDate(t).slice(5, 7)} · {signed(pipsOf(t), 1)} pips</div></span>
          <b className={tone(t.pnl)}>{signedMoney(t.pnl, cur)}</b></div>)}</div>}
      </section>
      <div className="tp-two">
        <section className="card stack" aria-label="P&L harian"><h2 className="h2">P&amp;L harian</h2>
          {days.length === 0 ? <NoData /> : days.map(k => { const v = s.dayPnl[k] ?? 0; return (
            <div key={k} className="dd-item" style={{ padding: 'var(--s2) 0' }}><div className="row between"><span className="muted">{dayLabel(k)}</span><b className={tone(v)}>{signedMoney(v, cur)}</b></div>
              <div className="dd-bar"><i style={{ width: `${Math.max(4, (Math.abs(v) / dmax) * 100)}%`, background: v < 0 ? 'var(--neg)' : 'var(--pos)' }} /></div></div>); })}
        </section>
        <section className="card stack" aria-label="Metrik risiko"><h2 className="h2">Metrik risiko</h2>
          {([['Drawdown maks', s.maxDrawdown ? `-${money(s.maxDrawdown, cur)}` : '—', s.maxDrawdown ? 'neg' : ''], ['Expectancy (R)', `${signed(s.expectancyR, 2)}R`, tone(s.expectancyR)], ['Recovery factor', s.recoveryFactor ? s.recoveryFactor.toFixed(2) : '—', ''], ['Rata-rata tahan', s.avgHold ? `${Math.round(s.avgHold)} mnt` : '—', '']] as const).map(([l, v, t]) =>
            <div className="adv-row" key={l}><span>{l}</span><b className={t}>{v}</b></div>)}
        </section>
      </div>
      <Actions p={p} />
    </>
  );
}

function T2({ p }: { p: HomeProps }) {
  const [tf, setTf] = useState<Tf>('D1');
  const candles = useMemo(() => buildCandles(p.trades, tf), [p.trades, tf]);
  const good = p.s.total >= 0, growth = safe(p.s.total, p.s.start) * 100;
  return (
    <>
      <section className="card stack tp-hero" aria-label="Ringkasan">
        <div className="row between">
          <button className="tp-ttl" onClick={p.onStats}>Total P&amp;L<Icon name="chevRight" size={16} /></button>
          <button className="chip" onClick={p.onAccount} aria-label={`Akun: ${p.acc.name}. Ganti akun`}>{p.acc.name}<Icon name="chevDown" size={14} /></button>
        </div>
        <div className={`hero-num ${tone(p.s.total)}`}>{signedMoney(p.s.total, p.acc.currency)}</div>
        <p className="hero-sub"><b className={tone(growth)}>{pctS(growth)}</b> · {p.rangeText}</p>
        <p className="tp-quote">Proses kecil setiap hari, hasil besar nanti.</p>
        <Area candles={candles} />
        <TfBar tf={tf} set={setTf} />
      </section>
      <section className="tiles" aria-label="Saldo">
        {([['Saldo awal', money(p.s.start, p.acc.currency), ''], ['Saldo sekarang', money(p.now, p.acc.currency), tone(p.now - p.s.start)], ['Pertumbuhan', pctS(growth), tone(growth)], ['Hari aktif', String(p.s.dayKeys.length), '']] as const).map(([l, v, t]) => <div className="tile" key={l}><small>{l}</small><b className={t}>{v}</b></div>)}
      </section>
      <section className="card stack" aria-label="Insight">
        <h2 className="h2">Insight periode ini</h2>
        <p>{p.s.n ? <>Kamu {good ? 'naik' : 'turun'} <b className={good ? 'pos' : 'neg'}>{pctS(growth)}</b> dengan {p.s.n} trade. {good ? 'Pertahankan manajemen risiko yang konsisten.' : 'Evaluasi lagi rencana dan risikonya.'}</> : 'Belum ada trade. Catat trade pertamamu.'}</p>
      </section>
      <div className="row between"><h2 className="h2">Statistik trading</h2><button className="chip" onClick={p.onStats}>Lihat semua<Icon name="chevRight" size={14} /></button></div>
      <MetricGrid p={p} cols={2} />
      <Actions p={p} />
    </>
  );
}

function T3({ p }: { p: HomeProps }) {
  const [tf, setTf] = useState<Tf>('D1'), [pick, setPick] = useState<number | null>(null);
  const all = useMemo(() => buildCandles(p.trades, tf), [p.trades, tf]);
  const vis = useMemo(() => all.slice(-14), [all]);
  useEffect(() => setPick(null), [tf]);
  const si = vis.length ? Math.min(pick ?? vis.length - 1, vis.length - 1) : 0, act = vis[si];
  const dv = act ? act.c - act.o : 0, cur = p.acc.currency;
  return (
    <>
      <Hero p={p} extra={<>
        <Bars candles={vis} sel={si} onPick={setPick} />
        <TfBar tf={tf} set={setTf} />
        <Facts p={p} />
      </>} />
      {act && (
        <section className="card stack" aria-label="Detail">
          <div className="row between"><b>{act.label}</b><span className="muted">{act.n} trade</span></div>
          <div className={`hero-num ${tone(dv)}`} style={{ fontSize: 28, lineHeight: '32px' }}>{signedMoney(dv, cur)}</div>
          <p className="muted">{signed(act.pc - act.po, 1)} pips · O {act.o.toFixed(0)} H {act.h.toFixed(0)} L {act.l.toFixed(0)} C {act.c.toFixed(0)}</p>
          <button className="btn" onClick={() => p.onOpenIds(act.ids)}>Lihat detail<Icon name="chevRight" size={16} /></button>
        </section>
      )}
      <MetricGrid p={p} cols={3} />
      <Actions p={p} />
    </>
  );
}

function T4({ p }: { p: HomeProps }) {
  return (
    <>
      <i className="tp-blob b1" aria-hidden="true" /><i className="tp-blob b2" aria-hidden="true" />
      <Hero p={p} extra={<Facts p={p} />} />
      <section className="card stack" aria-label="Grafik"><HeroChart trades={p.trades} startBal={p.s.start} onOpen={c => p.onOpenIds(c.ids)} /></section>
      <MetricGrid p={p} cols={3} />
      <Actions p={p} />
    </>
  );
}

function T5({ p }: { p: HomeProps }) {
  return (
    <>
      <Hero p={p} extra={<AccountRow p={p} />} />
      <section className="card stack" aria-label="Grafik"><HeroChart trades={p.trades} startBal={p.s.start} onOpen={c => p.onOpenIds(c.ids)} /></section>
      <section className="tiles" aria-label="Ringkasan">
        {metrics(p.s, p.acc.currency).slice(3, 6).map(m => <div className="tile" key={m.label}><small>{m.label}</small><b className={m.tone}>{m.value}</b></div>)}
      </section>
      <section className="card stack" aria-label="Rincian P&L"><h2 className="h2">Rincian P&amp;L</h2><Donut s={p.s} /></section>
      <Actions p={p} />
    </>
  );
}

/** Bagian atas halaman Performance untuk template 1–5 (0 = standar, dirender di performance.tsx). */
export function HomeTemplate(p: HomeProps) {
  useEffect(() => { if (p.n === 2) loadFont('nunito'); }, [p.n]);
  const C = [null, T1, T2, T3, T4, T5][p.n];
  return C ? <div className={`tp tp${p.n} stack`} style={{ gap: 'var(--s4)' }}><C p={p} /></div> : null;
}
