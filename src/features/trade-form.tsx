import { useEffect, useRef, useState } from 'react';
import type { ExitMethod, Side, Trade } from '../domain/types';
import { SYMBOLS, contractSize, pnlFor, riskFor, rewardFor } from '../domain/trading';
import { startingBalance } from '../domain/account';
import { fromInputValue, nowWibIso, toInputValue } from '../domain/time';
import { money } from '../domain/format';
import { actions, getState } from '../data/store';
import { deleteAttachment, putAttachment, shrinkImage } from '../data/attachments';
import type { Prefill } from '../lib/mt5';
import { AttachmentThumbs } from './attachments-ui';
import { Field, FormPage } from '../ui/primitives';
import { Icon } from '../ui/icons';

const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s));
const METHODS: ExitMethod[] = ['TP', 'SL', 'BE', 'Manual'];

const NOTE_TEXT: Record<string, string> = {
  side: 'Arah (Long/Short) tidak terbaca jelas; dipilih Long. Periksa.', lots: 'Lot tidak terbaca; diisi 0.01. Periksa.', symbol: 'Simbol tidak dikenali; diisi XAUUSD. Periksa.',
  nosl: 'Stop loss tidak terbaca.', notp: 'Take profit tidak terbaca.'
};
const newAttId = () => `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function TradeForm({ accountId, currency, trade, closing, prefill, attachFiles, onClose, onSaved }:
  { accountId: string; currency: string; trade?: Trade; closing?: boolean; prefill?: Prefill; attachFiles?: Blob[]; onClose: () => void; onSaved: (m: string) => void }) {
  const isEdit = !!trade;
  const pf = trade ? undefined : prefill;
  const [symbol, setSymbol] = useState(trade?.symbol ?? pf?.symbol ?? 'XAUUSD');
  const [side, setSide] = useState<Side>(trade?.side ?? pf?.side ?? 'Long');
  const [opened, setOpened] = useState(trade ? toInputValue(trade.openedAt) : pf?.opened || toInputValue(nowWibIso()));
  const [entry, setEntry] = useState(trade ? String(trade.entry) : pf ? String(pf.entry) : '');
  const [lots, setLots] = useState(trade ? String(trade.lots) : pf ? String(pf.lots) : '0.01');
  const [sl, setSl] = useState(trade?.sl != null ? String(trade.sl) : pf?.sl != null ? String(pf.sl) : '');
  const [tp, setTp] = useState(trade?.tp != null ? String(trade.tp) : pf?.tp != null ? String(pf.tp) : '');
  const [fees, setFees] = useState(trade ? String(trade.fees) : pf ? String(pf.fees) : '0');
  const [isClosed, setIsClosed] = useState(closing ? true : trade ? trade.status === 'closed' : pf?.exit != null);
  const [exit, setExit] = useState(trade?.exit != null ? String(trade.exit) : pf?.exit != null ? String(pf.exit) : '');
  const [closed, setClosed] = useState(trade?.closedAt ? toInputValue(trade.closedAt) : pf?.closed || toInputValue(nowWibIso()));
  const [method, setMethod] = useState<ExitMethod>(trade?.exitMethod || pf?.exitMethod || 'Manual');
  const [setup, setSetup] = useState(trade?.setup ?? '');
  const [review, setReview] = useState(trade?.review ?? '');
  const [pnlManual, setPnlManual] = useState(trade && trade.status === 'closed' && Math.abs(pnlFor(trade, trade.exit) - trade.pnl) > 0.005 ? String(trade.pnl) : pf?.net != null ? String(Math.round(pf.net * 100) / 100) : '');
  const initialAtt = useRef<string[]>(trade?.attachmentIds ?? []);
  const addedAtt = useRef<string[]>([]);
  const [att, setAtt] = useState<string[]>(trade?.attachmentIds ?? []);
  const fileIn = useRef<HTMLInputElement>(null);
  const dupTicket = !!(pf?.ticket && getState().store.accounts.find(a => a.id === accountId)?.trades.some(t => t.mt5Ticket === pf.ticket && !t.deletedAt));

  async function addFiles(files: Blob[]) {
    for (const f of files) {
      try {
        const id = newAttId();
        await putAttachment(id, await shrinkImage(f));
        addedAtt.current.push(id);
        setAtt(a => [...a, id]);
      } catch { setErr('Screenshot tidak bisa disimpan.'); }
    }
  }
  const attachedOnce = useRef(false);
  useEffect(() => { if (attachFiles?.length && !attachedOnce.current) { attachedOnce.current = true; void addFiles(attachFiles); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const cancel = () => { addedAtt.current.forEach(id => { void deleteAttachment(id).catch(() => undefined); }); onClose(); };
  const dropRemoved = () => { initialAtt.current.filter(id => !att.includes(id)).forEach(id => { void deleteAttachment(id).catch(() => undefined); }); };
  const [err, setErr] = useState('');
  const [calculated, setCalculated] = useState(false);

  const draft = { side, entry: Number(entry), lots: Number(lots), symbol: symbol.trim().toUpperCase(), fees: Number(fees) || 0 };
  const acct = getState().store.accounts.find(a => a.id === accountId);
  const entryN = Number(entry), lotsN = Number(lots), slN = numOrNull(sl), tpN = numOrNull(tp);
  const riskUsd = riskFor(entryN, slN, lotsN, draft.symbol), rewardUsd = rewardFor(entryN, tpN, lotsN, draft.symbol);
  const base = acct ? startingBalance(acct) : 0;
  const riskPct = base > 0 ? (riskUsd / base) * 100 : 0;
  const lotsAt1 = base > 0 && Number.isFinite(entryN) && slN !== null && entryN !== slN ? (base * 0.01) / (Math.abs(entryN - slN) * contractSize(draft.symbol)) : 0;
  const suggestLots = () => {
    if (!(base > 0) || !Number.isFinite(entryN) || entryN === 0 || slN === null || entryN === slN) { setErr('Isi entry dan stop loss dulu untuk menghitung lot.'); return; }
    setErr(''); setLots(String(Math.max(0.01, Math.floor(lotsAt1 * 100) / 100))); setCalculated(true);
  };
  const exitN = numOrNull(exit);
  const manualN = numOrNull(pnlManual);
  const calc = (e: number) => (manualN !== null && Number.isFinite(manualN) ? manualN : pnlFor(draft, e));
  const preview = isClosed && exitN !== null && Number.isFinite(draft.entry) ? calc(exitN) : null;

  function save() {
    if (!draft.symbol) return setErr('Isi simbol.');
    if (!Number.isFinite(draft.entry) || entry.trim() === '') return setErr('Isi harga entry.');
    if (!(draft.lots > 0)) return setErr('Lot harus lebih dari 0.');
    if (isClosed && (exitN === null || !Number.isFinite(exitN))) return setErr('Isi harga exit untuk trade yang sudah ditutup.');
    const openedAt = fromInputValue(opened);
    const closedAt = isClosed ? fromInputValue(closed) : null;
    if (closedAt && Date.parse(closedAt) < Date.parse(openedAt)) return setErr('Waktu close tidak boleh sebelum waktu buka.');
    const common = {
      symbol: draft.symbol, side, openedAt, closedAt, entry: draft.entry, lots: draft.lots,
      sl: numOrNull(sl), tp: numOrNull(tp), fees: draft.fees, setup, review
    };
    if (isEdit && trade) {
      actions.updateTrade(accountId, trade.id, {
        ...common, status: isClosed ? 'closed' : 'open', exit: isClosed ? exitN : null,
        exitMethod: isClosed ? method : '', pnl: isClosed && exitN !== null ? calc(exitN) : 0, attachmentIds: att
      });
      dropRemoved();
      onSaved(closing ? 'Trade ditutup' : 'Perubahan disimpan');
    } else {
      actions.addTrade(accountId, {
        ...common, status: isClosed ? 'closed' : 'open', exit: isClosed ? exitN : null,
        exitMethod: isClosed ? method : '', attachmentIds: att, mt5Ticket: pf?.ticket || undefined, pnl: isClosed && exitN !== null ? calc(exitN) : 0
      });
      onSaved('Trade dicatat');
    }
    onClose();
  }

  return (
    <FormPage eyebrow={isEdit ? (closing ? 'CLOSE TRADE / EXIT' : 'EDIT TRADE / UPDATE') : pf ? 'NEW TRADE / SCREENSHOT ENTRY' : 'NEW TRADE / MANUAL ENTRY'} title={closing ? 'Tutup trade' : isEdit ? 'Edit trade' : 'Tambah trade'} onClose={cancel}>
      <div className="stack trade-page">
        {pf && (
          <div className="banner" role="status">
            {pf.chart ? 'Dibaca dari grafik MT5 (posisi open). Waktu buka diisi sekarang; periksa semua angka.' : 'Dibaca dari screenshot MT5. Periksa semua angka sebelum menyimpan.'}
            {(pf.notes ?? []).map(n => NOTE_TEXT[n] ? <div key={n}>{NOTE_TEXT[n]}</div> : null)}
            {!pf.symbolKnown && pf.symbolRaw && !pf.chart && <div>Simbol “{pf.symbolRaw}” tidak dikenali; diisi XAUUSD. Periksa.</div>}
            {dupTicket && <div className="neg">Tiket #{pf.ticket} sudah tercatat di akun ini.</div>}
          </div>
        )}
        {!closing && (
          <>
            <Field label="Symbol">
              <input className="input" list="symbols" value={symbol} onChange={e => setSymbol(e.target.value)} autoCapitalize="characters" />
              <datalist id="symbols">{SYMBOLS.map(s => <option key={s} value={s} />)}</datalist>
            </Field>
            <Field label="Tanggal & waktu"><input className="input" type="datetime-local" value={opened} onChange={e => setOpened(e.target.value)} /></Field>
            <Field label="Trade setup / alasan entry"><textarea className="input" rows={3} value={setup} onChange={e => setSetup(e.target.value)} placeholder="Contoh: breakout + retest di resistance H1..." /></Field>
            <div className="direction" role="group" aria-label="Arah">
              <button type="button" className={side === 'Long' ? 'selected long' : ''} aria-pressed={side === 'Long'} onClick={() => setSide('Long')}>Long / Buy</button>
              <button type="button" className={side === 'Short' ? 'selected short' : ''} aria-pressed={side === 'Short'} onClick={() => setSide('Short')}>Short / Sell</button>
            </div>
            <div className="row2">
              <Field label="Entry level"><input className="input" inputMode="decimal" value={entry} onChange={e => setEntry(e.target.value)} placeholder="2728.40" /></Field>
              <Field label="Lots"><input className="input" inputMode="decimal" value={lots} onChange={e => setLots(e.target.value)} /></Field>
            </div>
            <div className="row2">
              <Field label="Stop loss"><input className="input" inputMode="decimal" value={sl} onChange={e => setSl(e.target.value)} placeholder="2720.00" /></Field>
              <Field label="Take profit"><input className="input" inputMode="decimal" value={tp} onChange={e => setTp(e.target.value)} placeholder="2745.00" /></Field>
            </div>
            <div className="calc-result" aria-label="Hitung risiko">
              <div><span>Risk USD</span><strong className="neg">{money(riskUsd, currency)}</strong></div>
              <div><span>Risk %</span><strong className="neg">{riskPct.toFixed(2)}%</strong></div>
              <div><span>Reward</span><strong className="pos">{money(rewardUsd, currency)}</strong></div>
              <div><span>R:R</span><strong>{riskUsd ? (rewardUsd / riskUsd).toFixed(2) : '—'}</strong></div>
            </div>
            {calculated && lotsAt1 > 0 && <p className="muted calc-hint">Lot diisi otomatis untuk risiko 1% dari saldo awal: {Math.max(0.01, Math.floor(lotsAt1 * 100) / 100).toFixed(2)}</p>}
            <Field label="Biaya (fees)"><input className="input" inputMode="decimal" value={fees} onChange={e => setFees(e.target.value)} /></Field>
            <div className="seg" role="group" aria-label="Status">
              <button type="button" aria-pressed={!isClosed} onClick={() => setIsClosed(false)}>Terbuka</button>
              <button type="button" aria-pressed={isClosed} onClick={() => setIsClosed(true)}>Sudah ditutup</button>
            </div>
          </>
        )}
        {isClosed && (
          <>
            <div className="row">
              <Field label="Harga exit"><input className="input" inputMode="decimal" value={exit} onChange={e => setExit(e.target.value)} /></Field>
              <Field label="Cara keluar">
                <select className="input" value={method} onChange={e => setMethod(e.target.value as ExitMethod)}>
                  {METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Waktu close (WIB)"><input className="input" type="datetime-local" value={closed} onChange={e => setClosed(e.target.value)} /></Field>
            <Field label="P&L dari broker (opsional)"><input className="input" inputMode="decimal" placeholder="Kosongkan untuk dihitung otomatis" value={pnlManual} onChange={e => setPnlManual(e.target.value)} /></Field>
            {/JPY$/.test(draft.symbol) && <p className="muted" style={{ fontSize: 13 }}>Pair JPY dihitung dalam yen. Isi P&L dari broker agar tepat dalam mata uang akun.</p>}
            {preview !== null && <p>Hasil: <b className={preview >= 0 ? 'pos' : 'neg'}>{preview >= 0 ? '+' : ''}{money(preview, currency)}</b></p>}
          </>
        )}
        {(isClosed || isEdit) && <Field label="Catatan / review"><textarea className="input" value={review} onChange={e => setReview(e.target.value)} /></Field>}
        {!closing && (
          <div className="stack att-box">
            <span className="att-label">Screenshot</span>
            <AttachmentThumbs ids={att} onRemove={id => setAtt(a => a.filter(x => x !== id))} />
            <input ref={fileIn} type="file" accept="image/*" multiple hidden onChange={e => { void addFiles([...(e.target.files ?? [])]); e.target.value = ''; }} />
            <button type="button" className="btn" onClick={() => fileIn.current?.click()}><Icon name="image" size={18} />Tambah screenshot</button>
          </div>
        )}
        {err && <p className="neg" role="alert">{err}</p>}
        <div className="fs-actions">
          {closing ? <button className="btn" onClick={cancel}>Batal</button> : <button className="btn" type="button" onClick={suggestLots}><Icon name="target" size={18} />Calculate / Adjust risk</button>}
          <button className="btn primary" onClick={save}><Icon name="plus" size={18} />{closing ? 'Tutup trade' : isEdit ? 'Simpan perubahan' : isClosed ? 'Simpan trade (closed)' : 'Save open trade'}</button>
        </div>
      </div>
    </FormPage>
  );
}
