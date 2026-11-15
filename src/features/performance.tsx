import { useMemo, useState } from 'react';
import { inPeriod, type Period, tradeDate } from '../domain/period';
import { computeStats } from '../domain/stats';
import { currentBalance } from '../domain/account';
import { isClosed } from '../domain/trading';
import { dayKeyOf, sessionOf3, weekStartKey, wibParts } from '../domain/time';
import { money, pctS, signed, signedMoney, tone } from '../domain/format';
import { Icon } from '../ui/icons';
import { AppHeader } from './app-header';
import { useSettings } from '../data/settings';
import { effHdr } from '../appearance/engine';
import { HomeTemplate } from './home-templates';
import { HeroChart } from './hero-chart';
import { ShareSheet } from './share-sheet';
import { DnaPage, PERIOD_LABEL, StatsPage, monthName } from './stats-pages';
import { PickerSheet } from '../ui/primitives';
import { useActiveAccount, useApp, actions } from '../data/store';

const pipText = (v: number) => (Math.abs(v) >= 10000 ? `${v > 0 ? '+' : v < 0 ? '-' : ''}${(Math.abs(v) / 1000).toFixed(1)}k` : signed(v, 1));

export function PerformancePage({ onCalendar, onOpenIds, onPickDay, toast }: { onCalendar: () => void; onOpenIds: (ids: string[]) => void; onPickDay: (day: string) => void; toast: (m: string) => void }) {
  const acc = useActiveAccount();
  const [period, setPeriod] = useState<Period>('All time');
  const [pickAcc, setPickAcc] = useState(false);
  const [pickPeriod, setPickPeriod] = useState(false);
  const [page, setPage] = useState<null | 'stats' | 'dna'>(null);
  const [share, setShare] = useState(false);
  const [monthSel, setMonthSel] = useState<string | null>(null); // 'YYYY-MM'
  const accounts = useApp(s => s.store.accounts);
  const st = useSettings();
  const hdr = effHdr(st);

  const byPeriod = useMemo(() => acc.trades.filter(t => !t.deletedAt && isClosed(t) && inPeriod(t, { period })), [acc, period]);
  const filtered = useMemo(() => (monthSel ? byPeriod.filter(t => wibParts(tradeDate(t)).monthKey === monthSel) : byPeriod), [byPeriod, monthSel]);
  const s = useMemo(() => computeStats(acc, filtered), [acc, filtered]);
  const now = currentBalance(acc);
  const rangeText = monthSel ? monthName(monthSel) : PERIOD_LABEL[period];
  const allClosed = useMemo(() => acc.trades.filter(t => !t.deletedAt && isClosed(t)), [acc]);
  const bestMonthKey = Object.keys(s.monthPnl).sort((a, b) => s.monthPnl[b]! - s.monthPnl[a]!)[0] ?? null;
  const growth = s.start ? (s.total / s.start) * 100 : 0;
  const counts = useMemo(() => {
    const y = new Set<number>(), m = new Set<string>(), w = new Set<string>(), ss = new Set<string>();
    for (const t of filtered) {
      const iso = tradeDate(t), p = wibParts(iso), dk = dayKeyOf(iso);
      y.add(p.year); m.add(p.monthKey); w.add(weekStartKey(dk)); ss.add(`${dk}|${sessionOf3(iso)}`);
    }
    return [[y.size, 'tahun'], [m.size, 'bulan'], [w.size, 'minggu'], [s.dayKeys.length, 'hari'], [ss.size, 'sesi']] as const;
  }, [filtered, s.dayKeys.length]);
  const dd = s.maxDrawdown ? `-${((s.maxDrawdown / (s.balance || 1)) * 100).toFixed(1)}%` : '0%';
  const shareData = {
    account: acc.name, total: s.total, growthPct: growth, start: s.start, now, days: s.dayKeys.length,
    vals: s.cumByDay, labels: s.dayKeys.map(k => `${k.slice(8)}/${k.slice(5, 7)}`),
    best: bestMonthKey ? `${monthName(bestMonthKey)} ${signedMoney(s.monthPnl[bestMonthKey]!, acc.currency)}` : '—',
    dd: s.maxDrawdown ? `-${money(s.maxDrawdown, acc.currency)}` : '—', periodText: rangeText, fmt: (n: number) => money(n, acc.currency)
  };
  const toWallet = () => { location.hash = '#/profile'; };
  const stats6: [string, string, string][] = [
    ['Win rate', `${s.winRate.toFixed(0)}%`, 'pos'], ['Profit Factor', s.profitFactor === Infinity ? '∞' : s.profitFactor.toFixed(2), 'pos'], ['Total Trades', String(s.n), ''],
    ['Avg. R:R', s.avgRR ? s.avgRR.toFixed(1) : '—', ''], ['Perolehan Pips', pipText(s.totalPips), tone(s.totalPips)], ['Best Day', s.bestDayKey ? signedMoney(s.dayPnl[s.bestDayKey]!, acc.currency) : '—', 'pos']
  ];

  return (
    <div className="page stack" style={{ gap: 'var(--s4)' }}>
      <AppHeader variant={hdr} account={acc} onCalendar={onCalendar} onAccount={() => setPickAcc(true)} />

      {monthSel && <div className="banner row between"><span>Menampilkan {monthName(monthSel)}</span><button className="btn" onClick={() => setMonthSel(null)}>Semua bulan</button></div>}

      {st.home === 0 ? (
        <section className="card stack hero-card" aria-label="Ringkasan">
          <div className="hc-top">
            <div>
              <span className="eyebrow">Total P&amp;L</span>
              <div className={`hero-num ${tone(s.total)}`}>{signedMoney(s.total, acc.currency)}</div>
              <p className={`hc-trend ${tone(growth)}`}><Icon name="trend" size={16} />{pctS(growth)} pada periode ini</p>
            </div>
            <div className="hc-acct">
              <span className="eyebrow">Active account</span>
              <b>{acc.name}</b>
              <button className="icon-btn boxed" aria-label="Deposit dan penarikan" onClick={toWallet}><Icon name="wallet" size={20} /></button>
            </div>
          </div>
          <div className="pc-row" aria-label="Cakupan data">
            {counts.map(([n, l]) => <span key={l}><b>{n}</b> {l}</span>)}
          </div>
          <div className="facts">
            <div><small>Saldo awal</small><b>{money(s.start, acc.currency)}</b></div>
            <div><small>Sekarang</small><b className={tone(now - s.start)}>{money(now, acc.currency)}</b></div>
            <div><small>Pertumbuhan</small><b className={tone(growth)}>{pctS(growth)}</b></div>
            <div><small>Hari aktif</small><b>{s.dayKeys.length}</b></div>
          </div>
          <HeroChart trades={filtered} startBal={s.start} onOpen={c => onOpenIds(c.ids)} />
          <div className="best-row">
            <span><i className="dot" style={{ background: 'var(--pos)' }} />Bulan terbaik: <b>{bestMonthKey ? `${monthName(bestMonthKey).slice(0, 3)} ${pctS((s.monthPnl[bestMonthKey]! / (s.start || 1)) * 100)}` : '—'}</b></span>
            <span><i className="dot" style={{ background: 'var(--neg)' }} />Drawdown terdalam: <b>{dd}</b></span>
          </div>
          <div className="stat6" role="list">
            {stats6.map(([l, v, t]) => <div key={l} role="listitem"><small>{l}</small><b className={t}>{v}</b></div>)}
          </div>
          <div className="row">
            <button className="btn grow" onClick={() => setShare(true)}><Icon name="share" size={18} />Share</button>
            <button className="btn grow" onClick={() => setPage('stats')}><Icon name="list" size={18} />Stats</button>
            <button className="btn grow" onClick={() => setPage('dna')}><Icon name="dna" size={18} />DNA</button>
          </div>
        </section>
      ) : (
        <HomeTemplate n={st.home} acc={acc} s={s} trades={filtered} now={now} rangeText={rangeText}
          onPeriod={() => setPickPeriod(true)} onAccount={() => setPickAcc(true)} onStats={() => setPage('stats')} onDna={() => setPage('dna')} onShare={() => setShare(true)}
          onOpenIds={onOpenIds} onJournal={() => { location.hash = '#/journal'; }} />
      )}

      {pickPeriod && <PickerSheet title="Periode" value={period} options={(['All time', 'Year-to-date', 'Monthly', 'Weekly'] as Period[]).map(p => ({ value: p, label: PERIOD_LABEL[p] }))} onPick={setPeriod} onClose={() => setPickPeriod(false)} />}
      {pickAcc && <PickerSheet title="Akun" value={acc.id} options={accounts.map(a => ({ value: a.id, label: a.name }))} onPick={actions.setActive} onClose={() => setPickAcc(false)} />}
      {share && <ShareSheet data={shareData} onClose={() => setShare(false)} toast={toast} />}
      {page === 'stats' && <StatsPage acc={acc} period={period} setPeriod={setPeriod} filtered={filtered} s={s} rangeText={rangeText} monthSel={monthSel} setMonthSel={setMonthSel}
        allClosed={allClosed} onClose={() => setPage(null)} onPickDay={d => { setPage(null); onPickDay(d); }} />}
      {page === 'dna' && <DnaPage acc={acc} period={period} setPeriod={setPeriod} filtered={byPeriod} onClose={() => setPage(null)} />}
    </div>
  );
}
