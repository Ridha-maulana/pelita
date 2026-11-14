import { useMemo, useState } from 'react';
import type { Trade } from '../domain/types';
import { tradeDate } from '../domain/period';
import { dayKeyOf, monthKeyOf, wibParts, sessionOf } from '../domain/time';
import { pipsOf } from '../domain/trading';
import { money, pipsS, signedMoney, tone, MONTHS_ID } from '../domain/format';
import { Icon } from '../ui/icons';
import { Confirm, PickerSheet, Sheet } from '../ui/primitives';
import { actions, useActiveAccount } from '../data/store';
import { TradeForm } from './trade-form';

type StatusF = 'all' | 'open' | 'closed';
type SideF = 'both' | 'Long' | 'Short';

export function JournalPage({ dayFilter, clearDay, idsFilter, clearIds, onAdd, toast }: { dayFilter: string | null; clearDay: () => void; idsFilter: string[] | null; clearIds: () => void; onAdd: () => void; toast: (m: string) => void }) {
  const acc = useActiveAccount();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusF>('all');
  const [side, setSide] = useState<SideF>('both');
  const [pickSide, setPickSide] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [detail, setDetail] = useState<Trade | null>(null);

  const live = useMemo(() => acc.trades.filter(t => !t.deletedAt), [acc]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return live
      .filter(t => (status === 'all' || t.status === status) && (side === 'both' || t.side === side)
        && (!s || t.symbol.toLowerCase().includes(s) || t.setup.toLowerCase().includes(s))
        && (!dayFilter || dayKeyOf(tradeDate(t)) === dayFilter) && (!idsFilter || idsFilter.includes(t.id)))
      .sort((a, b) => Date.parse(tradeDate(b)) - Date.parse(tradeDate(a)));
  }, [live, q, status, side, dayFilter, idsFilter]);

  // Kelompok tahun > bulan
  const groups = useMemo(() => {
    const y: Record<string, Record<string, Trade[]>> = {};
    for (const t of list) {
      const w = wibParts(tradeDate(t));
      ((y[String(w.year)] ??= {})[monthKeyOf(tradeDate(t))] ??= []).push(t);
    }
    return Object.entries(y).sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [list]);

  const sum = (ts: Trade[]) => ts.filter(t => t.status === 'closed');
  const counts = { all: live.length, open: live.filter(t => t.status === 'open').length, closed: live.filter(t => t.status === 'closed').length };

  return (
    <div className="page stack">
      <div><h1 className="page-title">My Journal</h1><p className="page-sub">Semua transaksi akun {acc.name}.</p></div>
      <div className="row">
        <label className="grow" style={{ position: 'relative' }}>
          <span className="sr">Cari simbol atau setup</span>
          <input className="input" style={{ paddingLeft: 40 }} placeholder="Cari simbol atau setup…" value={q} onChange={e => setQ(e.target.value)} />
          <span style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted)' }}><Icon name="search" size={20} /></span>
        </label>
        <button className="btn" onClick={() => setPickSide(true)}>{side === 'both' ? 'Long & Short' : side}<Icon name="chevDown" size={16} /></button>
      </div>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        {(['all', 'open', 'closed'] as const).map(k => (
          <button key={k} className="chip" aria-pressed={status === k} onClick={() => setStatus(k)}>
            {k === 'all' ? 'Semua' : k === 'open' ? 'Terbuka' : 'Ditutup'} <span style={{ opacity: .7 }}>{counts[k]}</span>
          </button>
        ))}
      </div>
      {idsFilter && <div className="banner row between"><span>Menampilkan {idsFilter.length} posisi dari grafik</span><button className="btn" onClick={clearIds}>Hapus filter</button></div>}
      {dayFilter && <div className="banner row between"><span>Menampilkan {dayFilter}</span><button className="btn" onClick={clearDay}>Hapus filter</button></div>}

      {groups.length === 0 && (
        <div className="stack" style={{ alignItems: 'center', padding: '48px 0', textAlign: 'center' }}>
          <p>{live.length === 0 ? 'Belum ada catatan. Catat trade pertamamu.' : 'Tidak ada trade yang cocok dengan filter.'}</p>
          {live.length === 0 && <button className="btn primary" onClick={onAdd}>Catat trade</button>}
        </div>
      )}

      {groups.map(([year, months]) => {
        const all = Object.values(months).flat();
        const closed = sum(all);
        const total = closed.reduce((a, t) => a + t.pnl, 0);
        const k = `y${year}`;
        return (
          <section key={year}>
            <button className="group-head" aria-expanded={!!open[k]} onClick={() => setOpen({ ...open, [k]: !open[k] })}>
              <div><b style={{ fontSize: 18 }}>Tahun {year}</b>
                <div className="muted">{all.length} posisi · <span className={tone(total)}>{signedMoney(total, acc.currency)}</span> · <span className={tone(closed.reduce((a, t) => a + pipsOf(t), 0))}>{pipsS(closed.reduce((a, t) => a + pipsOf(t), 0))}</span></div>
              </div>
              <Icon name="chevDown" />
            </button>
            {open[k] && Object.entries(months).sort((a, b) => b[0].localeCompare(a[0])).map(([mk, ts]) => {
              const mt = sum(ts).reduce((a, t) => a + t.pnl, 0);
              const kk = `m${mk}`;
              return (
                <div key={mk} style={{ marginLeft: 8 }}>
                  <button className="group-head" aria-expanded={!!open[kk]} onClick={() => setOpen({ ...open, [kk]: !open[kk] })}>
                    <span><b>{MONTHS_ID[Number(mk.slice(5)) - 1]} {mk.slice(0, 4)}</b> <span className="muted">· {ts.length} posisi · </span><span className={tone(mt)}>{signedMoney(mt, acc.currency)}</span></span>
                    <Icon name="chevDown" size={18} />
                  </button>
                  {open[kk] && ts.map(t => <TradeRow key={t.id} t={t} cur={acc.currency} onOpen={() => setDetail(t)} />)}
                </div>
              );
            })}
          </section>
        );
      })}

      <button className="fab" aria-label="Catat trade" onClick={onAdd}><Icon name="plus" size={26} /></button>
      {pickSide && <PickerSheet<SideF> title="Arah" value={side} options={[{ value: 'both', label: 'Long & Short' }, { value: 'Long', label: 'Long' }, { value: 'Short', label: 'Short' }]} onPick={setSide} onClose={() => setPickSide(false)} />}
      {detail && <TradeDetail t={live.find(x => x.id === detail.id) ?? detail} accId={acc.id} cur={acc.currency} onClose={() => setDetail(null)} toast={toast} />}
    </div>
  );
}

function TradeRow({ t, cur, onOpen }: { t: Trade; cur: string; onOpen: () => void }) {
  const w = wibParts(tradeDate(t));
  return (
    <button className="trade" onClick={onOpen}>
      <span><span className="sym">{t.symbol}</span> <span className={`tag ${t.side === 'Long' ? 'long' : 'short'}`}>{t.side}</span> {t.status === 'open' && <span className="tag">Terbuka</span>}</span>
      <b className={tone(t.pnl)}>{t.status === 'closed' ? signedMoney(t.pnl, cur) : '—'}</b>
      <span className="meta">{w.day} {MONTHS_ID[w.month - 1]} · {String(w.hour).padStart(2, '0')}:{String(w.minute).padStart(2, '0')} · {sessionOf(t.openedAt)} · {t.lots} lot</span>
      <span className="meta" style={{ textAlign: 'right' }}>{t.status === 'closed' ? pipsS(pipsOf(t)) : ''}</span>
    </button>
  );
}

function TradeDetail({ t, accId, cur, onClose, toast }: { t: Trade; accId: string; cur: string; onClose: () => void; toast: (m: string) => void }) {
  const [mode, setMode] = useState<null | 'edit' | 'close' | 'del'>(null);
  if (mode === 'edit' || mode === 'close') return <TradeForm accountId={accId} currency={cur} trade={t} closing={mode === 'close'} onClose={() => { setMode(null); onClose(); }} onSaved={toast} />;
  if (mode === 'del') return <Confirm title="Hapus trade?" text={`${t.symbol} ${t.side} akan dihapus dari jurnal.`} ok="Hapus" danger onCancel={() => setMode(null)} onOk={() => { actions.deleteTrade(accId, t.id); toast('Trade dihapus'); onClose(); }} />;
  const rows: [string, string][] = [
    ['Entry', String(t.entry)], ['Exit', t.exit === null ? '—' : String(t.exit)], ['Lot', String(t.lots)],
    ['SL', t.sl === null ? '—' : String(t.sl)], ['TP', t.tp === null ? '—' : String(t.tp)], ['Biaya', money(t.fees, cur)],
    ['Dibuka', t.openedAt.slice(0, 16).replace('T', ' ') + ' WIB'], ['Ditutup', t.closedAt ? t.closedAt.slice(0, 16).replace('T', ' ') + ' WIB' : '—'],
    ['Cara keluar', t.exitMethod || '—'], ['Sesi', sessionOf(t.openedAt)]
  ];
  return (
    <Sheet title={`${t.symbol} · ${t.side}`} onClose={onClose}>
      <div className="stack">
        {t.status === 'closed' && <div className={`hero-num ${tone(t.pnl)}`}>{signedMoney(t.pnl, cur)}</div>}
        <div>{rows.map(([l, v]) => <div className="adv-row" key={l}><span>{l}</span><b>{v}</b></div>)}</div>
        {t.setup && <p><b>Setup:</b> {t.setup}</p>}
        {t.review && <p><b>Catatan:</b> {t.review}</p>}
        <div className="row">
          {t.status === 'open' && <button className="btn primary grow" onClick={() => setMode('close')}>Tutup trade</button>}
          <button className="btn grow" onClick={() => setMode('edit')}><Icon name="edit" size={18} />Ubah</button>
          <button className="btn danger" onClick={() => setMode('del')} aria-label="Hapus"><Icon name="trash" size={18} /></button>
        </div>
      </div>
    </Sheet>
  );
}
