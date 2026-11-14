import { useState } from 'react';
import { Icon } from '../ui/icons';
import { PagedList, Sheet, Switch } from '../ui/primitives';
import { resetAppearance, setSettings, useSettings, type Mode } from '../data/settings';
import { FONTS } from '../appearance/fonts.data';
import { THEMES } from '../appearance/themes.data';
import { SURFACES } from '../appearance/surfaces.data';
import { FX_KEYS, loadFont, themeById, fontById, type FxKey } from '../appearance/engine';
import { validHex } from '../appearance/color';

const MODE_LABEL: Record<Mode, string> = { auto: 'Otomatis', light: 'Terang', dark: 'Gelap' };
const FX_INFO: Record<FxKey, [string, string]> = {
  latar: ['Efek latar', 'Cahaya halus di latar halaman'],
  kartu: ['Efek kartu', 'Gaya permukaan pada kartu'],
  tombol: ['Efek tombol', 'Tombol utama bergradasi dan bercahaya'],
  ikon: ['Efek ikon', 'Ikon daftar berlatar warna aksen'],
  hdr: ['Efek judul', 'Garis aksen di bawah judul halaman'],
  nav: ['Efek menu bawah', 'Gaya permukaan pada menu bawah'],
  gerak: ['Efek gerak', 'Kartu muncul halus dan animasi saat ditekan']
};

type View = null | 'main' | 'mode' | 'theme' | 'font' | 'sfc';

export function AppearanceRow({ open }: { open: () => void }) {
  const st = useSettings();
  return (
    <button className="item" onClick={open}>
      <span className="ic"><Icon name="sliders" /></span>
      <span className="grow"><div className="t">Tampilan aplikasi</div><div className="d">{st.custom.on ? 'Warna sendiri' : themeById(st.theme).name} · {fontById(st.font).name} · {MODE_LABEL[st.mode]}</div></span>
      <Icon name="chevRight" size={18} />
    </button>
  );
}

export function AppearanceSheet({ onClose }: { onClose: () => void }) {
  const st = useSettings();
  const [view, setView] = useState<View>('main');
  const back = () => setView('main');

  if (view === 'mode') return (
    <Sheet title="Mode tampilan" onClose={back}>
      <div className="list">
        {(['auto', 'light', 'dark'] as Mode[]).map(m => (
          <button key={m} className="item" onClick={() => { setSettings({ mode: m }); back(); }}>
            <span className="t grow">{MODE_LABEL[m]}</span>{st.mode === m && <Icon name="check" />}
          </button>
        ))}
      </div>
    </Sheet>
  );

  if (view === 'theme') return (
    <Sheet title="Tema warna" onClose={back}>
      <PagedList items={THEMES} render={t => {
        const side = st.mode === 'dark' || (st.mode === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches) ? t.dark : t.light;
        return (
          <button key={t.id} className="item" style={{ height: 60 }} onClick={() => { setSettings({ theme: t.id, custom: { ...st.custom, on: false } }); back(); }}>
            <span className="swatch" aria-hidden="true">
              {[side.canvas, side.surface, side.primary].map((c, i) => <i key={i} style={{ background: c }} />)}
            </span>
            <span className="grow"><div className="t">{t.name}</div><div className="d">{t.tag}</div></span>
            {!st.custom.on && st.theme === t.id && <Icon name="check" />}
          </button>
        );
      }} />
    </Sheet>
  );

  if (view === 'font') return (
    <Sheet title="Font" onClose={back}>
      <PagedList items={FONTS} render={f => {
        loadFont(f.id);
        return (
          <button key={f.id} className="item" style={{ height: 60 }} onClick={() => { setSettings({ font: f.id }); back(); }}>
            <span className="grow"><div className="t" style={{ fontFamily: f.css }}>{f.name}</div><div className="d">{f.desc}</div></span>
            {st.font === f.id && <Icon name="check" />}
          </button>
        );
      }} />
    </Sheet>
  );

  if (view === 'sfc') return (
    <Sheet title="Efek permukaan" onClose={back}>
      <div className="list">
        <button className="item" onClick={() => { setSettings({ sfc: 0 }); back(); }}><span className="t grow">Standar</span>{st.sfc === 0 && <Icon name="check" />}</button>
      </div>
      <PagedList items={SURFACES} render={s => (
        <button key={s.id} className="item" style={{ height: 60 }} onClick={() => { setSettings({ sfc: s.id }); back(); }}>
          <span className="swatch" aria-hidden="true"><i style={{ background: s.solid ?? 'var(--surface-2)', border: '1px solid var(--line)' }} /></span>
          <span className="grow"><div className="t">{s.name}</div><div className="d">{s.group === 'doff' ? 'Doff' : 'Dasar'}</div></span>
          {st.sfc === s.id && <Icon name="check" />}
        </button>
      )} />
    </Sheet>
  );

  return (
    <Sheet title="Tampilan aplikasi" onClose={onClose}>
      <div className="list">
        <button className="item" onClick={() => setView('mode')}><span className="t grow">Mode</span><span className="muted">{MODE_LABEL[st.mode]}</span><Icon name="chevRight" size={18} /></button>
        <button className="item" onClick={() => setView('theme')}><span className="t grow">Tema warna</span><span className="muted">{st.custom.on ? 'Warna sendiri' : themeById(st.theme).name}</span><Icon name="chevRight" size={18} /></button>
        <button className="item" onClick={() => setView('font')}><span className="t grow">Font</span><span className="muted">{fontById(st.font).name}</span><Icon name="chevRight" size={18} /></button>
        <button className="item" onClick={() => setView('sfc')}><span className="t grow">Efek permukaan</span><span className="muted">{st.sfc ? SURFACES[st.sfc - 1]?.name : 'Standar'}</span><Icon name="chevRight" size={18} /></button>
        <div className="item">
          <span className="grow"><div className="t">Warna sendiri</div><div className="d">Pilih warna latar dan aksen</div></span>
          <Switch on={st.custom.on} label="Warna sendiri" onChange={v => setSettings({ custom: { ...st.custom, on: v } })} />
        </div>
      </div>
      {st.custom.on && (
        <div className="row" style={{ marginTop: 'var(--s3)' }}>
          <ColorField label="Latar" value={st.custom.bg} onChange={bg => setSettings({ custom: { ...st.custom, bg } })} />
          <ColorField label="Aksen" value={st.custom.ac} onChange={ac => setSettings({ custom: { ...st.custom, ac } })} />
        </div>
      )}
      <div className="eyebrow" style={{ margin: 'var(--s5) 0 var(--s1)' }}>Efek</div>
      <div className="list">
        {FX_KEYS.map(k => (
          <div className="item" key={k}>
            <span className="grow"><div className="t">{FX_INFO[k][0]}</div><div className="d">{FX_INFO[k][1]}</div></span>
            <Switch on={st.fx[k]} label={FX_INFO[k][0]} onChange={v => setSettings({ fx: { ...st.fx, [k]: v } })} />
          </div>
        ))}
      </div>
      <button className="btn block" style={{ marginTop: 'var(--s5)' }} onClick={resetAppearance}>Kembalikan tampilan standar</button>
    </Sheet>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [txt, setTxt] = useState(value);
  return (
    <div className="field grow">
      <span>{label}</span>
      <div className="row">
        <input type="color" className="color" aria-label={label} value={value} onChange={e => { setTxt(e.target.value); onChange(e.target.value); }} />
        <input className="input" value={txt} maxLength={7} aria-label={`${label} (hex)`} onChange={e => { const v = e.target.value; setTxt(v); if (validHex(v)) onChange(v); }} />
      </div>
    </div>
  );
}
