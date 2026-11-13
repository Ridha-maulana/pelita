import { useState } from 'react';
import { Icon } from '../ui/icons';
import { Field, PickerSheet, Sheet } from '../ui/primitives';
import { setSettings, useSettings, type Mode } from '../data/settings';
import { contractSize, SYMBOLS } from '../domain/trading';
import { money } from '../domain/format';
import { useActiveAccount } from '../data/store';

const MODE_LABEL: Record<Mode, string> = { auto: 'Otomatis', light: 'Terang', dark: 'Gelap' };

export function ToolsPage() {
  const st = useSettings();
  const [dlg, setDlg] = useState<null | 'mode' | 'risk'>(null);
  return (
    <div className="page stack">
      <div><h1 className="page-title">Tools</h1><p className="page-sub">Tampilan dan alat bantu.</p></div>
      <div className="list">
        <button className="item" onClick={() => setDlg('mode')}>
          <span className="ic"><Icon name="moon" /></span>
          <span className="grow"><div className="t">Mode tampilan</div><div className="d">{MODE_LABEL[st.mode]}</div></span>
          <Icon name="chevRight" size={18} />
        </button>
        <button className="item" onClick={() => setDlg('risk')}>
          <span className="ic"><Icon name="sliders" /></span>
          <span className="grow"><div className="t">Kalkulator risiko</div><div className="d">Hitung lot dari risiko dan stop loss</div></span>
          <Icon name="chevRight" size={18} />
        </button>
      </div>
      {dlg === 'mode' && <PickerSheet<Mode> title="Mode tampilan" value={st.mode} options={(['auto', 'light', 'dark'] as Mode[]).map(m => ({ value: m, label: MODE_LABEL[m] }))} onPick={m => setSettings({ mode: m })} onClose={() => setDlg(null)} />}
      {dlg === 'risk' && <RiskCalc onClose={() => setDlg(null)} />}
    </div>
  );
}

function RiskCalc({ onClose }: { onClose: () => void }) {
  const acc = useActiveAccount();
  const [bal, setBal] = useState(String(acc.balance));
  const [pct, setPct] = useState('1');
  const [sym, setSym] = useState('XAUUSD');
  const [entry, setEntry] = useState('');
  const [sl, setSl] = useState('');
  const dist = Math.abs(Number(entry) - Number(sl));
  const risk = (Number(bal) * Number(pct)) / 100;
  const perLot = dist * contractSize(sym);
  const lots = dist > 0 && perLot > 0 ? risk / perLot : 0;
  return (
    <Sheet title="Kalkulator risiko" onClose={onClose}>
      <div className="stack">
        <div className="row">
          <Field label="Saldo"><input className="input" inputMode="decimal" value={bal} onChange={e => setBal(e.target.value)} /></Field>
          <Field label="Risiko %"><input className="input" inputMode="decimal" value={pct} onChange={e => setPct(e.target.value)} /></Field>
        </div>
        <Field label="Simbol">
          <select className="input" value={sym} onChange={e => setSym(e.target.value)}>{SYMBOLS.map(s => <option key={s}>{s}</option>)}</select>
        </Field>
        <div className="row">
          <Field label="Entry"><input className="input" inputMode="decimal" value={entry} onChange={e => setEntry(e.target.value)} /></Field>
          <Field label="Stop loss"><input className="input" inputMode="decimal" value={sl} onChange={e => setSl(e.target.value)} /></Field>
        </div>
        <div className="kv">
          <div><span>Risiko</span><b>{money(risk || 0, acc.currency)}</b></div>
          <div><span>Lot</span><b>{lots ? lots.toFixed(2) : '—'}</b></div>
        </div>
      </div>
    </Sheet>
  );
}
