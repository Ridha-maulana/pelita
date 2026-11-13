import { useState } from 'react';
import type { ExitMethod, Side, Trade } from '../domain/types';
import { SYMBOLS, pnlFor } from '../domain/trading';
import { fromInputValue, nowWibIso, toInputValue } from '../domain/time';
import { money } from '../domain/format';
import { actions } from '../data/store';
import { Field, Sheet } from '../ui/primitives';

const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s));
const METHODS: ExitMethod[] = ['TP', 'SL', 'BE', 'Manual'];

export function TradeForm({ accountId, currency, trade, closing, onClose, onSaved }:
  { accountId: string; currency: string; trade?: Trade; closing?: boolean; onClose: () => void; onSaved: (m: string) => void }) {
  const isEdit = !!trade;
  const [symbol, setSymbol] = useState(trade?.symbol ?? 'XAUUSD');
  const [side, setSide] = useState<Side>(trade?.side ?? 'Long');
  const [opened, setOpened] = useState(toInputValue(trade?.openedAt ?? nowWibIso()));
  const [entry, setEntry] = useState(trade ? String(trade.entry) : '');
  const [lots, setLots] = useState(trade ? String(trade.lots) : '0.01');
  const [sl, setSl] = useState(trade?.sl != null ? String(trade.sl) : '');
  const [tp, setTp] = useState(trade?.tp != null ? String(trade.tp) : '');
  const [fees, setFees] = useState(trade ? String(trade.fees) : '0');
  const [isClosed, setIsClosed] = useState(closing ? true : trade?.status === 'closed');
  const [exit, setExit] = useState(trade?.exit != null ? String(trade.exit) : '');
  const [closed, setClosed] = useState(toInputValue(trade?.closedAt ?? nowWibIso()));
  const [method, setMethod] = useState<ExitMethod>(trade?.exitMethod || 'Manual');
  const [setup, setSetup] = useState(trade?.setup ?? '');
  const [review, setReview] = useState(trade?.review ?? '');
  const [pnlManual, setPnlManual] = useState(trade && trade.status === 'closed' && Math.abs(pnlFor(trade, trade.exit) - trade.pnl) > 0.005 ? String(trade.pnl) : '');
  const [err, setErr] = useState('');

  const draft = { side, entry: Number(entry), lots: Number(lots), symbol: symbol.trim().toUpperCase(), fees: Number(fees) || 0 };
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
        exitMethod: isClosed ? method : '', pnl: isClosed && exitN !== null ? calc(exitN) : 0
      });
      onSaved(closing ? 'Trade ditutup' : 'Perubahan disimpan');
    } else {
      actions.addTrade(accountId, {
        ...common, status: isClosed ? 'closed' : 'open', exit: isClosed ? exitN : null,
        exitMethod: isClosed ? method : '', attachmentIds: [], pnl: isClosed && exitN !== null ? calc(exitN) : 0
      });
      onSaved('Trade dicatat');
    }
    onClose();
  }

  return (
    <Sheet title={closing ? 'Tutup trade' : isEdit ? 'Ubah trade' : 'Catat trade'} onClose={onClose}>
      <div className="stack">
        {!closing && (
          <>
            <Field label="Simbol">
              <input className="input" list="symbols" value={symbol} onChange={e => setSymbol(e.target.value)} autoCapitalize="characters" />
              <datalist id="symbols">{SYMBOLS.map(s => <option key={s} value={s} />)}</datalist>
            </Field>
            <div className="seg" role="group" aria-label="Arah">
              <button type="button" className="long" aria-pressed={side === 'Long'} onClick={() => setSide('Long')}>Long</button>
              <button type="button" className="short" aria-pressed={side === 'Short'} onClick={() => setSide('Short')}>Short</button>
            </div>
            <Field label="Waktu buka (WIB)"><input className="input" type="datetime-local" value={opened} onChange={e => setOpened(e.target.value)} /></Field>
            <div className="row">
              <Field label="Entry"><input className="input" inputMode="decimal" value={entry} onChange={e => setEntry(e.target.value)} /></Field>
              <Field label="Lot"><input className="input" inputMode="decimal" value={lots} onChange={e => setLots(e.target.value)} /></Field>
            </div>
            <div className="row">
              <Field label="Stop loss"><input className="input" inputMode="decimal" value={sl} onChange={e => setSl(e.target.value)} /></Field>
              <Field label="Take profit"><input className="input" inputMode="decimal" value={tp} onChange={e => setTp(e.target.value)} /></Field>
            </div>
            <Field label="Biaya (fees)"><input className="input" inputMode="decimal" value={fees} onChange={e => setFees(e.target.value)} /></Field>
            {!closing && (
              <div className="seg" role="group" aria-label="Status">
                <button type="button" aria-pressed={!isClosed} onClick={() => setIsClosed(false)}>Terbuka</button>
                <button type="button" aria-pressed={isClosed} onClick={() => setIsClosed(true)}>Sudah ditutup</button>
              </div>
            )}
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
        <Field label="Setup"><input className="input" value={setup} onChange={e => setSetup(e.target.value)} /></Field>
        <Field label="Catatan / review"><textarea className="input" value={review} onChange={e => setReview(e.target.value)} /></Field>
        {err && <p className="neg" role="alert">{err}</p>}
        <button className="btn primary block" onClick={save}>Simpan</button>
      </div>
    </Sheet>
  );
}
