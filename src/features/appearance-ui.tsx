import { useState } from 'react';
import { Icon } from '../ui/icons';
import { PagedList, Sheet, Switch } from '../ui/primitives';
import { resetAppearance, setSettings, useSettings, type Mode } from '../data/settings';
import { FONTS } from '../appearance/fonts.data';
import { THEMES } from '../appearance/themes.data';
import { SURFACES } from '../appearance/surfaces.data';
import { FX_KEYS, HEADER_STYLES, NAV_STYLES, loadFont, resolveDark, themeById, fontById, type FxKey } from '../appearance/engine';
import { BGD_MAX, WP_CATS, WP_LIST, wpAuto, wpByKey, wpThumb, type Wp } from '../appearance/wallpaper';
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

type View = null | 'main' | 'mode' | 'theme' | 'font' | 'sfc' | 'nav' | 'hdr' | 'bg';

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

  if (view === 'nav') return (
    <Sheet title="Menu bawah" onClose={back}>
      <div className="list">
        {NAV_STYLES.map(([v, l]) => (
          <button key={v} className="item" onClick={() => { setSettings({ nav: v }); back(); }}>
            <span className="t grow">{l}</span>{st.nav === v && <Icon name="check" />}
          </button>
        ))}
      </div>
    </Sheet>
  );

  if (view === 'hdr') return (
    <Sheet title="Header" onClose={back}>
      <p className="muted" style={{ marginBottom: 'var(--s2)' }}>Berlaku di halaman Performance.</p>
      <PagedList items={HEADER_STYLES} render={([v, l]) => (
        <button key={v} className="item" style={{ height: 60 }} onClick={() => { setSettings({ hdr: v }); back(); }}>
          <span className="t grow">{l}</span>{st.hdr === v && <Icon name="check" />}
        </button>
      )} />
    </Sheet>
  );

  if (view === 'bg') return <BackgroundPicker onBack={back} />;

  const wp = st.bg ? wpByKey(st.bg) : undefined;
  return (
    <Sheet title="Tampilan aplikasi" onClose={onClose}>
      <div className="list">
        <button className="item" onClick={() => setView('mode')}><span className="t grow">Mode</span><span className="muted">{MODE_LABEL[st.mode]}</span><Icon name="chevRight" size={18} /></button>
        <button className="item" onClick={() => setView('theme')}><span className="t grow">Tema warna</span><span className="muted">{st.custom.on ? 'Warna sendiri' : themeById(st.theme).name}</span><Icon name="chevRight" size={18} /></button>
        <button className="item" onClick={() => setView('font')}><span className="t grow">Font</span><span className="muted">{fontById(st.font).name}</span><Icon name="chevRight" size={18} /></button>
        <button className="item" onClick={() => setView('sfc')}><span className="t grow">Efek permukaan</span><span className="muted">{st.sfc ? SURFACES[st.sfc - 1]?.name : 'Standar'}</span><Icon name="chevRight" size={18} /></button>
        <button className="item" onClick={() => setView('nav')}><span className="t grow">Menu bawah</span><span className="muted">{NAV_STYLES.find(x => x[0] === st.nav)?.[1]}</span><Icon name="chevRight" size={18} /></button>
        <button className="item" onClick={() => setView('hdr')}><span className="t grow">Header</span><span className="muted">{HEADER_STYLES.find(x => x[0] === st.hdr)?.[1]}</span><Icon name="chevRight" size={18} /></button>
        <button className="item" onClick={() => setView('bg')}><span className="t grow">Latar</span><span className="muted">{wp ? wp.name : 'Tanpa latar'}</span><Icon name="chevRight" size={18} /></button>
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
      {wp && (() => {
        const dark = resolveDark(st.mode);
        const auto = wpAuto(wp, st.bgd, dark);
        return (
          <div className="field" style={{ marginTop: 'var(--s3)' }}>
            <span>Redup latar: {st.bgd}%{auto ? ' (otomatis lebih gelap agar teks terbaca)' : ''}</span>
            <input type="range" min={0} max={BGD_MAX} step={5} value={st.bgd} aria-label="Redup latar" onChange={e => setSettings({ bgd: Number(e.target.value) })} />
          </div>
        );
      })()}
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

function BackgroundPicker({ onBack }: { onBack: () => void }) {
  const st = useSettings();
  const [cat, setCat] = useState<string>('semua');
  const list = cat === 'semua' ? WP_LIST : WP_LIST.filter(w => w.cat === cat);
  const items: readonly (Wp | null)[] = cat === 'semua' ? [null, ...list] : list;
  const pick = (k: string) => { setSettings({ bg: k }); onBack(); };
  return (
    <Sheet title="Latar" onClose={onBack}>
      <div className="chips" role="group" aria-label="Kategori latar">
        {[['semua', 'Semua'] as const, ...WP_CATS].map(([k, l]) => (
          <button key={k} className="chip" aria-pressed={cat === k} onClick={() => setCat(k)}>{l}</button>
        ))}
      </div>
      <div style={{ marginTop: 'var(--s3)' }} key={cat}>
        <PagedList items={items} render={(w, i) => w ? (
          <button key={w.k} className="item" style={{ height: 60 }} onClick={() => pick(w.k)}>
            <span className="wp-thumb" aria-hidden="true" dangerouslySetInnerHTML={{ __html: wpThumb(w, String(i)) }} />
            <span className="grow"><div className="t">{w.name}</div><div className="d">{WP_CATS.find(c => c[0] === w.cat)?.[1]}</div></span>
            {st.bg === w.k && <Icon name="check" />}
          </button>
        ) : (
          <button key="none" className="item" style={{ height: 60 }} onClick={() => pick('')}>
            <span className="t grow">Tanpa latar</span>{!st.bg && <Icon name="check" />}
          </button>
        )} />
      </div>
    </Sheet>
  );
}
