import { useMemo, useState } from 'react';
import type { Account } from '../domain/types';
import { PERIODS, inPeriod, type Period, tradeDate } from '../domain/period';
import { computeStats, byCloseTime } from '../domain/stats';
import { advancedRows } from '../domain/advanced';
import { computeDna, BAND_LABEL } from '../domain/dna';
import { currentBalance } from '../domain/account';
import { isClosed } from '../domain/trading';
import { dayKeyOf, wibParts, daysInMonth, mondayOffset } from '../domain/time';
import { money, pctS, signedMoney, tone, MONTHS_ID } from '../domain/format';
import { Icon } from '../ui/icons';
import { Radar } from '../ui/charts';
import { HeroChart } from './hero-chart';
import { DrillDown } from './drilldown';
import { ShareSheet } from './share-sheet';
import { PickerSheet, Sheet } from '../ui/primitives';
import { useActiveAccount, useApp, actions } from '../data/store';

const monthName = (key: string) => `${MONTHS_ID[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
const mpct = (v: number, base: number) => { const p = (v / (base || 1)) * 100, a = Math.abs(p); return (p > 0.004 ? '+' : p < -0.004 ? '-' : '') + (a >= 10 ? a.toFixed(1) : a.toFixed(2)) + '%'; };
const PERIOD_LABEL: Record<Period, string> = { 'All time': 'Semua waktu', 'Year-to-date': 'Tahun ini', Monthly: 'Bulan ini', Weekly: '7 hari', 'Custom date range': 'Rentang tanggal' };

export function PerformancePage({ onCalendar, onOpenIds, toast }: { onCalendar: () => void; onOpenIds: (ids: string[]) => void; toast: (m: string) => void }) {
  const acc = useActiveAccount();
  const [period, setPeriod] = useState<Period>('All time');
  const [pickPeriod, setPickPeriod] = useState(false);
  const [pickAcc, setPickAcc] = useState(false);
  const [sheet, setSheet] = useState<null | 'adv' | 'dna' | 'share'>(null);
  const [year, setYear] = useState(() => wibParts(Date.now()).year);
  const [monthSel, setMonthSel] = useState<string | null>(null); // 'YYYY-MM'
  const accounts = useApp(s => s.store.accounts);

  const byPeriod = useMemo(() => acc.trades.filter(t => !t.deletedAt && isClosed(t) && inPeriod(t, { period })), [acc, period]);
  const filtered = useMemo(() => (monthSel ? byPeriod.filter(t => wibParts(tradeDate(t)).monthKey === monthSel) : byPeriod), [byPeriod, monthSel]);
  const s = useMemo(() => computeStats(acc, filtered), [acc, filtered]);
  const now = currentBalance(acc);
  const rangeText = monthSel ? monthName(monthSel) : PERIOD_LABEL[period];
  const allClosed = useMemo(() => acc.trades.filter(t => !t.deletedAt && isClosed(t)), [acc]);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`;
    const xs = allClosed.filter(t => wibParts(tradeDate(t)).monthKey === key);
    const pnl = xs.reduce((a, t) => a + t.pnl, 0);
    return { key, i, n: xs.length, pnl, wins: xs.filter(t => t.pnl > 0).length };
  }), [allClosed, year]);
  const bestMonthKey = Object.keys(s.monthPnl).sort((a, b) => s.monthPnl[b]! - s.monthPnl[a]!)[0] ?? null;
  const syms = useMemo(() => {
    const m = new Map<string, { n: number; pnl: number }>();
    for (const t of filtered) { const x = m.get(t.symbol) ?? { n: 0, pnl: 0 }; x.n++; x.pnl += t.pnl; m.set(t.symbol, x); }
    return [...m].map(([sym, v]) => ({ sym, ...v })).sort((a, b) => b.n - a.n);
  }, [filtered]);
  const maxSym = Math.max(1, ...syms.map(x => Math.abs(x.pnl)));
  const shareData = {
    account: acc.name, total: s.total, growthPct: (s.total / s.start) * 100, start: s.start, now, days: s.dayKeys.length,
    vals: s.cumByDay, labels: s.dayKeys.map(k => `${k.slice(8)}/${k.slice(5, 7)}`),
    best: bestMonthKey ? `${monthName(bestMonthKey)} ${signedMoney(s.monthPnl[bestMonthKey]!, acc.currency)}` : '—',
    dd: s.maxDrawdown ? `-${money(s.maxDrawdown, acc.currency)}` : '—', periodText: rangeText, fmt: (n: number) => money(n, acc.currency)
  };

  return (
    <div className="page stack" style={{ gap: 'var(--s4)' }}>
      <header className="row between">
        <div>
          <h1 className="page-title">Pelita</h1>
          <p className="page-sub">Jurnal trading</p>
        </div>
        <div className="row">
          <button className="icon-btn" aria-label="Kalender" onClick={onCalendar}><Icon name="calendar" /></button>
          <button className="btn" onClick={() => setPickAcc(true)}><Icon name="user" size={18} />{acc.name}<Icon name="chevDown" size={16} /></button>
        </div>
      </header>

      <section className="card stack" aria-label="Ringkasan">
        <div className="row between">
          <span className="eyebrow">Total P&L</span>
          <div className="row" style={{ gap: 'var(--s2)' }}>
            <button className="icon-btn" aria-label="Bagikan ke story" onClick={() => setSheet('share')}><Icon name="share" size={18} /></button>
            <button className="chip" onClick={() => setPickPeriod(true)} aria-label="Pilih periode">{PERIOD_LABEL[period]}<Icon name="chevDown" size={14} /></button>
          </div>
        </div>
        <div className={`hero-num ${tone(s.total)}`}>{signedMoney(s.total, acc.currency)}</div>
        <p className={tone(s.total)}>{pctS((s.total / s.start) * 100)} pada periode ini</p>
        {monthSel && <div className="banner row between"><span>Menampilkan {monthName(monthSel)}</span><button className="btn" onClick={() => setMonthSel(null)}>Semua bulan</button></div>}
        <div className="kv kv3">
          <div><span>Saldo awal</span><b>{money(s.start, acc.currency)}</b></div>
          <div><span>Sekarang</span><b className={tone(now - s.start)}>{money(now, acc.currency)}</b></div>
          <div><span>Hari aktif</span><b>{s.dayKeys.length}</b></div>
        </div>
        <HeroChart trades={filtered} startBal={s.start} onOpen={c => onOpenIds(c.ids)} />
        <div className="kv">
          <div><span>Win rate</span><b>{s.winRate.toFixed(0)}%</b></div>
          <div><span>Profit factor</span><b>{s.profitFactor === Infinity ? '∞' : s.profitFactor.toFixed(2)}</b></div>
          <div><span>Total trade</span><b>{s.n}</b></div>
          <div><span>Avg R:R</span><b>{s.avgRR ? s.avgRR.toFixed(1) : '—'}</b></div>
          <div><span>Drawdown</span><b className={s.maxDrawdown ? 'neg' : ''}>{s.maxDrawdown ? `-${((s.maxDrawdown / (s.balance || 1)) * 100).toFixed(1)}%` : '0%'}</b></div>
          <div><span>Hari terbaik</span><b className="pos">{s.bestDayKey ? signedMoney(s.dayPnl[s.bestDayKey]!, acc.currency) : '—'}</b></div>
        </div>
        <div className="row">
          <button className="btn grow" onClick={() => setSheet('adv')}><Icon name="list" size={18} />Stats</button>
          <button className="btn grow" onClick={() => setSheet('dna')}><Icon name="dna" size={18} />DNA</button>
        </div>
      </section>

      <section className="card stack" aria-label="Monthly gain">
        <div className="row between">
          <h2 className="h2">Monthly gain</h2>
          <div className="row" style={{ gap: 'var(--s2)' }}>
            <button className="icon-btn" aria-label="Tahun sebelumnya" onClick={() => setYear(year - 1)}><Icon name="chevLeft" size={18} /></button>
            <b>{year}</b>
            <button className="icon-btn" aria-label="Tahun berikutnya" onClick={() => setYear(year + 1)}><Icon name="chevRight" size={18} /></button>
          </div>
        </div>
        <div className="mg-grid">
          {months.map(m => (
            <button key={m.key} className="mg-cell" aria-pressed={monthSel === m.key} disabled={!m.n} onClick={() => setMonthSel(monthSel === m.key ? null : m.key)}
              aria-label={`${MONTHS_ID[m.i]} ${year}: ${m.n} posisi, ${signedMoney(m.pnl, acc.currency)}`}>
              <span className="muted">{MONTHS_ID[m.i]}</span>
              <b className={tone(m.pnl)}>{m.n ? mpct(m.pnl, s.start) : '—'}</b>
              <small className="muted">{m.n ? `${m.n} posisi` : ''}</small>
            </button>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 13 }}>Ketuk bulan untuk memfilter seluruh halaman; ketuk lagi untuk melepas.</p>
      </section>

      <DrillDown trades={filtered} currency={acc.currency} rangeText={rangeText} startBal={s.start} />

      {syms.length > 0 && (
        <section className="card stack" aria-label="Per simbol">
          <h2 className="h2">Per simbol</h2>
          <div className="list">
            {syms.map(x => (
              <div key={x.sym} className="dd-item">
                <div className="row between"><strong>{x.sym}</strong><b className={tone(x.pnl)}>{signedMoney(x.pnl, acc.currency)}</b></div>
                <div className="muted">{x.n} posisi</div>
                <div className="dd-bar"><i style={{ width: `${Math.max(3, (Math.abs(x.pnl) / maxSym) * 100)}%`, background: x.pnl < 0 ? 'var(--neg)' : 'var(--pos)' }} /></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {pickPeriod && <PickerSheet title="Periode" value={period} options={PERIODS.filter(p => p !== 'Custom date range').map(p => ({ value: p, label: PERIOD_LABEL[p] }))} onPick={setPeriod} onClose={() => setPickPeriod(false)} />}
      {pickAcc && <PickerSheet title="Akun" value={acc.id} options={accounts.map(a => ({ value: a.id, label: a.name }))} onPick={actions.setActive} onClose={() => setPickAcc(false)} />}
      {sheet === 'share' && <ShareSheet data={shareData} onClose={() => setSheet(null)} toast={toast} />}
      {sheet === 'adv' && <AdvancedSheet acc={acc} filtered={filtered} onClose={() => setSheet(null)} />}
      {sheet === 'dna' && <DnaSheet acc={acc} filtered={filtered} onClose={() => setSheet(null)} />}
    </div>
  );
}

function AdvancedSheet({ acc, filtered, onClose }: { acc: Account; filtered: Account['trades']; onClose: () => void }) {
  const now = wibParts(Date.now());
  const rows = advancedRows(acc, computeStats(acc, filtered), { y: now.year, m: now.month - 1 });
  return (
    <Sheet title="Advanced Statistics" onClose={onClose}>
      <p className="muted">{filtered.length} trade closed pada periode ini</p>
      <div>{rows.map(([l, v, t]) => <div className="adv-row" key={l}><span>{l}</span><b className={t}>{v}</b></div>)}</div>
      <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
        Pips dihitung dari entry ke close: XAUUSD 1 pip = 0,10; pair JPY 0,01; pair lain 0,0001; NAS100 &amp; BTCUSD 1 poin.
        Statistik hanya memakai trade closed; hari dihitung menurut waktu close (WIB).
      </p>
    </Sheet>
  );
}

function DnaSheet({ acc, filtered, onClose }: { acc: Account; filtered: Account['trades']; onClose: () => void }) {
  const s = computeStats(acc, filtered);
  const sorted = byCloseTime(filtered.filter(isClosed));
  const d = computeDna(s, sorted);
  return (
    <Sheet title="Trader DNA" onClose={onClose}>
      {!d.ready ? <p className="muted">Butuh minimal 3 trade closed untuk membaca DNA trading kamu.</p> : (
        <div className="stack">
          <div className="row between">
            <div><span className="eyebrow">Skor keseluruhan</span><div className="hero-num">{d.overall}</div></div>
            <div className="hero-num" aria-label={`Grade ${d.grade}`}>{d.grade}</div>
          </div>
          <Radar dims={d.dims} />
          <p>Terkuat: <b>{d.strongest.name}</b> · Perlu perhatian: <b>{d.weakest.name}</b></p>
          <div className="list">
            {d.dims.map(x => (
              <div key={x.key} className="item" style={{ display: 'block' }}>
                <div className="row between"><span className="t">{x.name}</span><b>{x.score} · {BAND_LABEL[x.band]}</b></div>
                <div className="d">{x.meta}</div>
                <div className="d">{x.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}

export function CalendarSheet({ onClose, onPickDay }: { onClose: () => void; onPickDay: (day: string) => void }) {
  const acc = useActiveAccount();
  const now = wibParts(Date.now());
  const [y, setY] = useState(now.year);
  const [m, setM] = useState(now.month); // 1-12
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
    <Sheet title="Kalender" onClose={onClose}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <button className="icon-btn" aria-label="Bulan sebelumnya" onClick={() => go(-1)}><Icon name="chevLeft" /></button>
        <div style={{ textAlign: 'center' }}><b>{MONTHS_ID[m - 1]} {y}</b><div className={tone(monthPnl)}>{signedMoney(monthPnl, acc.currency)}</div></div>
        <button className="icon-btn" aria-label="Bulan berikutnya" onClick={() => go(1)}><Icon name="chevRight" /></button>
      </div>
      <div className="cal-grid" aria-hidden="true" style={{ marginBottom: 4 }}>{['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d => <span key={d} className="muted" style={{ textAlign: 'center', fontSize: 12 }}>{d}</span>)}</div>
      <div className="cal-grid">
        {Array.from({ length: mondayOffset(y, m) }, (_, i) => <div key={`e${i}`} className="cal-cell empty" />)}
        {Array.from({ length: daysInMonth(y, m) }, (_, i) => {
          const day = `${prefix}-${String(i + 1).padStart(2, '0')}`;
          const v = info[day];
          return (
            <button key={day} className={`cal-cell ${v ? (v.pnl > 0 ? 'win' : v.pnl < 0 ? 'loss' : '') : ''}`} disabled={!v}
              aria-label={v ? `${day}: ${v.n} posisi, ${signedMoney(v.pnl, acc.currency)}` : day}
              onClick={() => { onPickDay(day); onClose(); }}>
              <span>{i + 1}</span>{v && <small>{v.n}</small>}
            </button>
          );
        })}
      </div>
      <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>Ketuk tanggal yang punya posisi untuk membuka jurnal hari itu.</p>
    </Sheet>
  );
}
