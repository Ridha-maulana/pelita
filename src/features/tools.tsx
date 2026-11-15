import { useState } from 'react';
import { Icon, type IconName } from '../ui/icons';
import { Field } from '../ui/primitives';
import { AppearanceSheet, MODE_LABEL, type View } from './appearance-ui';
import { useSettings } from '../data/settings';
import { THEMES } from '../appearance/themes.data';
import { SURFACES } from '../appearance/surfaces.data';
import { FX_KEYS, HEADER_STYLES, HOME_LIST, NAV_STYLES, themeById, fontById } from '../appearance/engine';
import { wpByKey } from '../appearance/wallpaper';
import { contractSize, SYMBOLS } from '../domain/trading';
import { money } from '../domain/format';
import { useActiveAccount } from '../data/store';

type Row = { view: View; icon: IconName; title: string; desc: string; value: string };

export function ToolsPage() {
  const st = useSettings();
  const [look, setLook] = useState<View>(null);
  const [risk, setRisk] = useState(false);
  const fxOn = FX_KEYS.filter(k => st.fx[k]).length;
  const rows: Row[] = [
    { view: 'home', icon: 'home', title: 'Halaman utama', desc: 'Template lengkap: header, isi, dan menu bawah', value: HOME_LIST.find(x => x[0] === st.home)?.[1] ?? 'Standar' },
    { view: 'mode', icon: 'moon', title: 'Mode tampilan', desc: 'Terang, gelap, atau otomatis', value: MODE_LABEL[st.mode] },
    { view: 'theme', icon: 'palette', title: 'Tema aplikasi', desc: `${THEMES.length} tema, masing-masing terang & gelap`, value: st.custom.on ? 'Warna sendiri' : themeById(st.theme).name },
    { view: 'font', icon: 'type', title: 'Font aplikasi', desc: 'Jenis huruf di seluruh aplikasi', value: fontById(st.font).name },
    { view: 'main', icon: 'sparkle', title: 'Efek tampilan', desc: 'Kartu, tombol, ikon, latar, dan gerak: pilih semua atau satu per satu', value: `${fxOn} efek aktif` },
    { view: 'sfc', icon: 'layers', title: 'Efek permukaan kartu', desc: 'Doff, solid, transparan, bayangan: kartu, header, dan menu bawah', value: SURFACES.find(s => s.id === st.sfc)?.name ?? 'Standar' },
    { view: 'bg', icon: 'image', title: 'Latar aplikasi', desc: 'Warna dasar, doff, kaca, anime, atau pola di belakang halaman', value: (st.bg && wpByKey(st.bg)?.name) || 'Standar' },
    { view: 'hdr', icon: 'user', title: 'Tampilan header', desc: 'Gaya header atas, hanya di halaman utama', value: HEADER_STYLES.find(x => x[0] === st.hdr)?.[1] ?? 'Standar' },
    { view: 'nav', icon: 'sliders', title: 'Tampilan menu bawah', desc: 'Gaya menu bar di bagian bawah layar', value: NAV_STYLES.find(x => x[0] === st.nav)?.[1] ?? 'Standar' }
  ];
  return (
    <div className="page stack">
      <div><h1 className="page-title">Trading Tools</h1><p className="page-sub">Kalkulator risk dan reward.</p></div>
      <div className="list">
        <button className="item" aria-expanded={risk} onClick={() => setRisk(!risk)}>
          <span className="ic"><Icon name="calculator" /></span>
          <span className="grow"><div className="t">Risk calculator</div><div className="d">Hitung risk, reward, dan ukuran lot</div></span>
          <Icon name="chevDown" size={18} />
        </button>
        {risk && <RiskCalc />}
      </div>
      <div className="eyebrow">Tampilan aplikasi</div>
      <div className="list">
        {rows.map(r => (
          <button key={r.view} className="item" onClick={() => setLook(r.view)}>
            <span className="ic"><Icon name={r.icon} /></span>
            <span className="grow"><div className="t">{r.title}</div><div className="d">{r.desc}</div></span>
            <span className="val">{r.value}</span>
            <Icon name="chevRight" size={18} />
          </button>
        ))}
      </div>
      {look && <AppearanceSheet start={look} onClose={() => setLook(null)} />}
    </div>
  );
}

function RiskCalc() {
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
    <div className="calc-inline">
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
    </div>
  );
}
