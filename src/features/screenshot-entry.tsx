import { useMemo, useState } from 'react';
import type { Trade } from '../domain/types';
import { fromInputValue, nowWibIso } from '../domain/time';
import { pnlFor } from '../domain/trading';
import { buildPrefill, MT5_TZ_OPTIONS, mt5GetTz, mt5SetTz, type Mt5Row, type Mt5Tz } from '../lib/mt5';
import { actions } from '../data/store';
import { Icon } from '../ui/icons';
import { FullPage } from '../ui/primitives';

/** Menu tombol +: Manual atau Screenshot (Pro). */
export function AddMenu({ onManual, onScreenshot, onClose }: { onManual: () => void; onScreenshot: () => void; onClose: () => void }) {
  return (
    <div className="add-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} onTouchStart={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="add-menu" role="menu">
        <button type="button" className="add-menu-item" role="menuitem" onClick={onManual}>
          <span className="add-menu-ico"><Icon name="plus" size={18} /></span>
          <b>Manual Trade Entry</b>
        </button>
        <button type="button" className="add-menu-item" role="menuitem" onClick={onScreenshot}>
          <span className="add-menu-ico"><Icon name="image" size={18} /></span>
          <span><b>Screenshot Trade Entry <em className="pro-tag">Pro</em></b><small>Riwayat MT5 atau chart posisi open</small></span>
        </button>
      </div>
    </div>
  );
}

export function ScanOverlay({ progress, text }: { progress: number; text: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));
  return (
    <div className="scrim center" role="status" aria-live="polite">
      <div className="dialog stack scan-card">
        <div className="scan-spinner" aria-hidden="true" />
        <b>Membaca data trade dari screenshot…</b>
        <span className="muted">{text || 'Mohon tunggu'}</span>
        <div className="scan-bar"><i style={{ width: pct + '%' }} /></div>
      </div>
    </div>
  );
}

const fmt = (s: string) => (s ? new Date(s + ':00+07:00').toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace(/\./g, ':') : '-');

/** Beberapa posisi sekaligus dari satu screenshot. Hanya kartu berinformasi lengkap (tiket, waktu buka, SL, TP) yang bisa dipilih. */
export function ImportList({ accountId, trades, rows, onClose, onDone }: { accountId: string; trades: Trade[]; rows: Mt5Row[]; onClose: () => void; onDone: (n: number) => void }) {
  const [tz, setTz] = useState<Mt5Tz>(mt5GetTz());
  const full = rows.filter(r => r.detailed);
  const skipped = rows.length - full.length;
  const items = useMemo(() => full.map(r => buildPrefill(r, tz)), [rows, tz]); // eslint-disable-line react-hooks/exhaustive-deps
  const have = new Set(trades.map(t => t.mt5Ticket).filter(Boolean) as string[]);
  const [off, setOff] = useState<Set<string>>(() => new Set(full.filter(r => have.has(r.ticket)).map(r => r.ticket)));
  const picked = items.filter(pf => !off.has(pf.ticket ?? ''));
  const toggle = (t: string) => setOff(o => { const n = new Set(o); n.has(t) ? n.delete(t) : n.add(t); return n; });

  function save() {
    for (const pf of picked) {
      const openedAt = fromInputValue(pf.opened || nowWibIso().slice(0, 16));
      const closedAt = fromInputValue(pf.closed || pf.opened || nowWibIso().slice(0, 16));
      const draft = { side: pf.side, entry: pf.entry, lots: pf.lots, symbol: pf.symbol, fees: pf.fees };
      actions.addTrade(accountId, {
        symbol: pf.symbol, side: pf.side, openedAt, closedAt, entry: pf.entry, exit: pf.exit, lots: pf.lots, sl: pf.sl, tp: pf.tp, fees: pf.fees,
        status: 'closed', exitMethod: pf.exitMethod, setup: '', review: '', attachmentIds: [], mt5Ticket: pf.ticket,
        pnl: pf.net != null ? Math.round(pf.net * 100) / 100 : pnlFor(draft, pf.exit)
      });
    }
    onDone(picked.length);
  }

  return (
    <FullPage title={`${items.length} posisi terbaca`} sub="Dari screenshot MT5" badge="PRO" onClose={onClose}>
      <div className="stack trade-page">
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>Centang posisi yang mau dicatat. Hanya kartu dengan info lengkap (tiket, waktu buka, SL, TP) yang dibaca.</p>
        {skipped > 0 && <p className="sync-note warn">{skipped} kartu dilewati karena infonya tidak lengkap (belum diketuk/dibuka di MT5).</p>}
        <label className="field"><span>Zona waktu server MT5</span>
          <select className="input jsel" value={tz} onChange={e => { const v = e.target.value as Mt5Tz; mt5SetTz(v); setTz(v); }}>
            {MT5_TZ_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </label>
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>Waktu ditampilkan dalam WIB (UTC+7).</p>
        <div className="import-list">
          {items.map(pf => {
            const on = !off.has(pf.ticket ?? ''), dup = have.has(pf.ticket ?? '');
            return (
              <button type="button" key={pf.ticket} className={'import-row' + (on ? ' on' : '')} aria-pressed={on} onClick={() => toggle(pf.ticket ?? '')}>
                <span className="import-check" aria-hidden="true">{on ? <Icon name="check" size={16} /> : null}</span>
                <span className="import-body">
                  <b>{pf.symbol} <em className={pf.side === 'Long' ? 'pos' : 'neg'}>{pf.side}</em> {pf.lots}
                    {pf.net != null && <span className={'import-pnl ' + (pf.net >= 0 ? 'pos' : 'neg')}>{pf.net >= 0 ? '+' : ''}{pf.net.toFixed(2)}</span>}</b>
                  <small>{pf.entry} → {pf.exit} · {pf.exitMethod}</small>
                  <small>{fmt(pf.opened)} → {fmt(pf.closed)}</small>
                  <small>SL {pf.sl ?? '-'} · TP {pf.tp ?? '-'} · #{pf.ticket}</small>
                  {dup && <small className="sync-note warn">Tiket ini sudah tercatat di akun ini.</small>}
                </span>
              </button>
            );
          })}
        </div>
        <div className="fs-actions">
          <button className="btn" onClick={onClose}>Batal</button>
          <button className="btn primary" disabled={!picked.length} onClick={save}>Simpan {picked.length} trade</button>
        </div>
      </div>
    </FullPage>
  );
}
