import { useEffect, useMemo, useRef, useState } from 'react';
import type { Trade } from '../domain/types';
import { DD_DAYS, DD_LEVELS, DD_MONTHS_FULL, DD_SESSIONS, DD_WEEKEND, ddBuild, ddStat, weeksIn, wkRange, type DdRec, type DdStat } from '../domain/drilldown';
import { MONTHS_ID, money, tone } from '../domain/format';
import { SESSIONS } from '../domain/time';
import { Icon } from '../ui/icons';

const LOCK_MSG = ['Menampilkan semua bulan pada periode terpilih', 'Data per nomor minggu dari semua bulan', 'Data per hari dari semua minggu', '4 sesi dengan data agregat dari semua hari', 'Distribusi win/loss agregat dari semua hari'];
const BEST = ['Bulan terbaik', 'Minggu terbaik', 'Hari terbaik', 'Sesi terbaik'];
const TITLES = ['Performa per bulan', 'Performa per minggu', 'Performa per hari', 'Performa per sesi', 'Distribusi win / loss'];
const SES_COL: Record<string, string> = { Asia: 'var(--pos)', London: 'var(--accent)', 'New York': 'var(--warn)', Overlap: 'var(--muted)' };
const LV_COL = ['var(--accent)', 'var(--warn)', 'var(--pos)'];

interface Sel { mk: string | null; wk: number | null; day: string | null; ses: string | null }
interface Item { key: string; title: string; sub?: string; note?: string; dot: string; st: DdStat; tags: string[] }

export function DrillDown({ trades, currency, rangeText, startBal }: { trades: Trade[]; currency: string; rangeText: string; startBal: number }) {
  const fm = (n: number) => money(n, currency);
  const sg = (n: number) => (n > 0 ? `+${fm(n)}` : n < 0 ? `-${fm(Math.abs(n))}` : fm(0));
  const recs = useMemo(() => ddBuild(trades), [trades]);
  const [level, setLevel] = useState(0);
  const [locked, setLocked] = useState(false);
  const [sel, setSel] = useState<Sel>({ mk: null, wk: null, day: null, ses: null });
  const cardRef = useRef<HTMLElement | null>(null);
  const prevNav = useRef<{ lv: number; locked: boolean } | null>(null);
  const mks = useMemo(() => [...new Set(recs.map(r => r.mk))].sort(), [recs]);
  const multiYear = new Set(mks.map(k => k.slice(0, 4))).size > 1;
  const mkIdx = (mk: string) => Number(mk.slice(5, 7)) - 1;
  const mkName = (mk: string) => `${DD_MONTHS_FULL[mkIdx(mk)]} ${mk.slice(0, 4)}`;
  const mkShort = (mk: string) => MONTHS_ID[mkIdx(mk)] + (multiYear ? ` ${mk.slice(2, 4)}` : '');

  // validasi pilihan (data bisa berubah karena ganti akun / filter)
  const curM = sel.mk && mks.includes(sel.mk) ? sel.mk : null;
  const curW = curM && sel.wk && sel.wk <= weeksIn(curM) && recs.some(r => r.mk === curM && r.wk === sel.wk) ? sel.wk : null;
  const curD = curW && sel.day && recs.some(r => r.mk === curM && r.wk === curW && r.day === sel.day) ? sel.day : null;
  const curS = curD && sel.ses && recs.some(r => r.mk === curM && r.wk === curW && r.day === curD && r.ses === sel.ses) ? sel.ses : null;
  const cap = curM ? (curW ? (curD ? (curS ? 4 : 3) : 2) : 1) : 0;
  const lv = locked ? level : Math.min(level, cap);
  const pct = (v: number) => `${v > 0 ? '+' : ''}${((v / Math.max(startBal, 1)) * 100).toFixed(2)}%`;

  // gulir ke kartu hanya saat level / kunci benar-benar berubah (bukan saat dipasang; aman untuk StrictMode)
  useEffect(() => {
    const prev = prevNav.current;
    prevNav.current = { lv, locked };
    if (prev && (prev.lv !== lv || prev.locked !== locked)) cardRef.current?.scrollIntoView({ block: 'start' });
  }, [lv, locked]);

  if (!recs.length) {
    return (
      <section className="card stack" ref={cardRef} aria-label="Performa per bulan, minggu, hari, sesi">
        <h2 className="h2">Performa per bulan / minggu / hari / sesi</h2>
        <p className="muted">{rangeText !== 'Semua waktu' ? `Belum ada trade closed pada periode ${rangeText}. Pilih periode lain.` : 'Belum ada trade closed. Tutup posisi pertama kamu untuk melihat performa per bulan, minggu, hari, dan sesi.'}</p>
      </section>
    );
  }

  const tagsOf = (rs: DdRec[], kinds: ('day' | 'week' | 'month' | 'ses')[]): string[] => {
    const out: string[] = [];
    for (const k of kinds) {
      if (k === 'day') { const seen = new Map<number, string>(); rs.forEach(r => seen.set(r.di, r.day === DD_WEEKEND ? 'Sab–Min' : r.day)); [...seen.keys()].sort((a, b) => a - b).forEach(i => out.push(seen.get(i)!)); }
      else if (k === 'week') [...new Set(rs.map(r => r.wk))].sort((a, b) => a - b).forEach(w => out.push(`Minggu ke-${w}`));
      else if (k === 'month') [...new Set(rs.map(r => r.mk))].sort().forEach(m => out.push(mkShort(m)));
      else DD_SESSIONS.filter(n => rs.some(r => r.ses === n)).forEach(n => out.push(n));
    }
    return out;
  };
  const mkItem = (key: string, o: Partial<Item> & { title: string; dot: string }, rs: DdRec[], kinds: ('day' | 'week' | 'month' | 'ses')[] = []): Item =>
    ({ key, st: ddStat(rs), tags: tagsOf(rs, kinds), ...o });
  const sesHrs = (n: string) => `${SESSIONS.find(s => s.name === n)?.hours ?? ''} WIB`;
  const dayNames = (rs: DdRec[]) => [...DD_DAYS, ...(rs.some(r => r.day === DD_WEEKEND) ? [DD_WEEKEND] : [])];

  let items: Item[] = [], small = '';
  if (lv === 0) {
    const ys = [...new Set(mks.map(k => k.slice(0, 4)))];
    small = ys.length === 1 ? ys[0]! : `${ys[0]}–${ys[ys.length - 1]}`;
    items = mks.map(mk => {
      const rs = recs.filter(r => r.mk === mk), st = ddStat(rs);
      return mkItem(mk, { dot: LV_COL[0]!, title: mkName(mk), tags: [`${st.weeks} minggu`, `${st.days} hari`, `${st.sessions} sesi`] }, rs);
    });
  } else if (lv === 1) {
    if (locked) {
      small = 'Agregasi Semua Bulan';
      const maxW = Math.max(...mks.map(weeksIn));
      items = Array.from({ length: maxW }, (_, i) => { const rs = recs.filter(r => r.wk === i + 1); return mkItem(String(i + 1), { dot: LV_COL[1]!, title: `Minggu ke-${i + 1}`, note: 'Semua Bulan', sub: rs.length ? '' : 'Tidak ada trade' }, rs, ['month', 'day', 'ses']); });
    } else {
      small = mkName(curM!);
      items = Array.from({ length: weeksIn(curM!) }, (_, i) => { const rs = recs.filter(r => r.mk === curM && r.wk === i + 1); return mkItem(String(i + 1), { dot: LV_COL[1]!, title: `Minggu ke-${i + 1}`, sub: wkRange(curM!, i + 1) }, rs, ['day', 'ses']); });
    }
  } else if (lv === 2) {
    if (locked) {
      small = 'Agregasi Semua Minggu';
      items = dayNames(recs).map(d => { const rs = recs.filter(r => r.day === d); return mkItem(d, { dot: LV_COL[2]!, title: d, note: 'Semua Minggu', sub: rs.length ? '' : 'Tidak ada trade' }, rs, ['month', 'week', 'ses']); });
    } else {
      small = `Minggu ke-${curW} · ${mkShort(curM!)}`;
      const scope = recs.filter(r => r.mk === curM && r.wk === curW);
      items = dayNames(scope).map(d => { const rs = scope.filter(r => r.day === d); return mkItem(d, { dot: LV_COL[2]!, title: d, sub: rs.length ? '' : 'Belum ada trade' }, rs, ['month', 'week', 'ses']); });
    }
  } else if (lv === 3) {
    const scope = locked ? recs : recs.filter(r => r.mk === curM && r.wk === curW && r.day === curD);
    small = locked ? 'Agregasi Semua Hari' : curD === DD_WEEKEND ? 'Akhir pekan' : curD!;
    items = DD_SESSIONS.map(n => mkItem(n, { dot: SES_COL[n]!, title: n, sub: sesHrs(n) }, scope.filter(r => r.ses === n), ['day', 'week', 'month'])).filter(i => locked || i.st.n > 0);
  } else if (locked) {
    small = 'Agregasi Semua Hari';
    items = DD_SESSIONS.map(n => mkItem(n, { dot: SES_COL[n]!, title: n, sub: sesHrs(n) }, recs.filter(r => r.ses === n), ['day', 'week', 'month']));
  } else {
    small = `${curS} — ${curD === DD_WEEKEND ? 'Akhir pekan' : curD}`;
    const rs = recs.filter(r => r.mk === curM && r.wk === curW && r.day === curD && r.ses === curS);
    items = [mkItem(curS!, { dot: SES_COL[curS!]!, title: curS!, sub: sesHrs(curS!) }, rs, ['day', 'week', 'month'])];
  }

  const FIELDS = ['mk', 'wk', 'day', 'ses'] as const;
  const baseSel: Sel = { mk: curM, wk: curW, day: curD, ses: curS };
  const applyPick = (key: string) => {
    const f = FIELDS[lv]!;
    const next: Sel = { ...baseSel };
    const val = f === 'wk' ? Number(key) : key;
    if (next[f] !== val) for (const x of FIELDS.slice(lv + 1)) (next as unknown as Record<string, unknown>)[x] = null;
    (next as unknown as Record<string, unknown>)[f] = val;
    setSel(next); setLevel(lv + 1);
  };
  const pick = (i: Item) => { if (lv >= 4) return; if (locked) { setLevel(lv + 1); return; } if (i.st.n > 0) applyPick(i.key); };
  const goNext = () => {
    if (lv >= 4) return;
    if (locked || baseSel[FIELDS[lv]!] != null) { setLevel(lv + 1); return; }
    const first = items.find(i => i.st.n > 0);
    if (first) applyPick(first.key);
  };
  const goBack = () => { if (lv > 0) setLevel(lv - 1); };
  const crumbOn = (i: number) => locked || i <= cap;

  const maxN = Math.max(1, ...items.map(i => i.st.n));
  let hl: string | null = null;
  if (locked) hl = `Mode Kunci: ${LOCK_MSG[lv]}`;
  else if (lv < 4) {
    const c = items.filter(i => i.st.n > 0);
    if (c.length) { const b = c.reduce((a, x) => (x.st.profit > a.st.profit ? x : a)); hl = `${BEST[lv]}: ${b.title} · ${sg(b.st.profit)} · WR ${Math.round(b.st.wr)}% · ${b.st.n} posisi`; }
  }
  const rowsOf = (st: DdStat): [string, string, string][] => [
    ['Win / Loss', `${st.wins} / ${st.losses}`, ''],
    ['Win Rate', `${st.wr.toFixed(1)}%`, st.n ? (st.wr >= 50 ? 'pos' : 'neg') : ''],
    ['Avg. Win / Loss', `${sg(st.avgWin)} / ${sg(st.avgLoss)}`, ''],
    ['Perolehan Pips', `${st.pips > 0 ? '+' : ''}${st.pips.toFixed(1)} pips`, tone(st.pips)]
  ];
  const Tbl = ({ rows }: { rows: [string, string, string][] }) => <div>{rows.map(([l, v, t]) => <div className="adv-row" key={l}><span>{l}</span><b className={t}>{v}</b></div>)}</div>;
  const Head = ({ i }: { i: Item }) => (
    <div className="row" style={{ gap: 'var(--s2)' }}>
      <i className="dd-dot" style={{ background: i.dot }} /><strong>{i.title}</strong>{i.note && <span className="muted">({i.note})</span>}{i.sub && <span className="muted">{i.sub}</span>}
    </div>
  );
  const Tags = ({ tags }: { tags: string[] }) => (tags.length ? <div className="dd-tags">{tags.map((t, k) => <span key={k}>{t}</span>)}</div> : null);

  return (
    <section className="card stack" ref={cardRef} aria-label="Performa per bulan, minggu, hari, sesi">
      <div className="row between">
        <div><h2 className="h2">{TITLES[lv]}</h2><div className="muted">{small}</div></div>
        <button className="chip" aria-pressed={locked} onClick={() => setLocked(v => !v)} aria-label="Mode kunci: gabungkan semua data tiap level">Kunci</button>
      </div>
      <div className="dd-crumbs" role="tablist" aria-label="Level">
        {DD_LEVELS.map((n, i) => (
          <button key={n} role="tab" aria-selected={lv === i} disabled={!crumbOn(i)} className="dd-crumb" onClick={() => setLevel(i)}>{n}</button>
        ))}
      </div>
      {hl && <p className="dd-best">{hl}</p>}

      {lv < 4 && (
        <div className="list">
          {items.map(i => {
            const ok = locked || i.st.n > 0;
            return (
              <button key={i.key} className="dd-item" disabled={!ok} onClick={() => pick(i)} style={{ opacity: ok ? 1 : 0.5 }}>
                <Head i={i} />
                <Tags tags={i.tags} />
                <div className="row between">
                  <span className="muted">{i.st.n} posisi · {Math.round(i.st.wr)}% WR · <span className={tone(i.st.profit)}>{pct(i.st.profit)}</span></span>
                  <b className={tone(i.st.profit)}>{sg(i.st.profit)}</b>
                </div>
                <div className="dd-bar"><i style={{ width: `${i.st.n ? Math.max(3, (i.st.n / maxN) * 100) : 0}%`, background: i.st.profit < 0 ? 'var(--neg)' : 'var(--pos)' }} /></div>
              </button>
            );
          })}
        </div>
      )}
      {lv === 4 && locked && (
        <div className="list">
          {items.map(i => <div key={i.key} className="dd-item"><Head i={i} /><Tags tags={i.tags} /><Tbl rows={rowsOf(i.st)} /></div>)}
          {(() => { const t = ddStat(recs); return <div className="dd-item"><strong>Ringkasan Total</strong><Tbl rows={[['Total posisi', String(t.n), ''], ...rowsOf(t), ['Profit', `${sg(t.profit)} · ${pct(t.profit)}`, tone(t.profit)]]} /></div>; })()}
        </div>
      )}
      {lv === 4 && !locked && items[0] && (() => {
        const i = items[0]!;
        const r = 70, c = 2 * Math.PI * r, tot = i.st.n;
        const wA = tot ? (c * i.st.wins) / tot : 0, lA = tot ? (c * i.st.losses) / tot : 0;
        return (
          <div className="stack">
            <svg viewBox="0 0 180 180" className="chart dd-donut" role="img" aria-label={`Win rate ${i.st.wr.toFixed(1)}%`} style={{ maxWidth: 220, margin: '0 auto' }}>
              <circle cx="90" cy="90" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="24" />
              <circle cx="90" cy="90" r={r} fill="none" stroke="var(--pos)" strokeWidth="24" strokeDasharray={`${wA} ${c - wA}`} transform="rotate(-90 90 90)" />
              <circle cx="90" cy="90" r={r} fill="none" stroke="var(--neg)" strokeWidth="24" strokeDasharray={`${lA} ${c - lA}`} strokeDashoffset={-wA} transform="rotate(-90 90 90)" />
              <text x="90" y="88" textAnchor="middle" fontSize="28" fontWeight="600" fill={i.st.wr >= 50 ? 'var(--pos)' : 'var(--neg)'}>{i.st.wr.toFixed(0)}%</text>
              <text x="90" y="108" textAnchor="middle" fontSize="11" fill="var(--muted)">{tot} posisi</text>
            </svg>
            <Head i={i} /><Tags tags={i.tags} />
            <Tbl rows={[...rowsOf(i.st), ['Profit', `${sg(i.st.profit)} · ${pct(i.st.profit)}`, tone(i.st.profit)]]} />
          </div>
        );
      })()}

      <div className="row">
        <button className="btn grow" disabled={lv === 0} onClick={goBack}><Icon name="chevLeft" size={18} />Kembali</button>
        <button className="btn grow" disabled={lv >= 4} onClick={goNext}>Lanjut<Icon name="chevRight" size={18} /></button>
      </div>
    </section>
  );
}
