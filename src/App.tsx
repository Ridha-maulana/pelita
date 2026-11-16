import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from './ui/icons';
import { useToast } from './ui/primitives';
import { PerformancePage } from './features/performance';
import { CalendarPage } from './features/stats-pages';
import { JournalPage } from './features/journal';
import { ToolsPage } from './features/tools';
import { ProfilePage } from './features/profile';
import { TradeForm } from './features/trade-form';
import { AddMenu, ImportList, ScanOverlay } from './features/screenshot-entry';
import { buildChartPrefill, buildPrefill, mt5GetTz, parseMt5Text, type Mt5Row, type Prefill } from './lib/mt5';
import { ocrImageFiles } from './lib/ocr';
import { useActiveAccount } from './data/store';

type Tab = 'performance' | 'journal' | 'tools' | 'profile';
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'performance', label: 'Performance', icon: 'bars' },
  { id: 'journal', label: 'My Journal', icon: 'book' },
  { id: 'tools', label: 'Tools', icon: 'sliders' },
  { id: 'profile', label: 'Profil', icon: 'user' }
];
const fromHash = (): Tab => {
  const h = location.hash.replace(/^#\/?/, '') as Tab;
  return TABS.some(t => t.id === h) ? h : 'performance';
};

export function App() {
  const [tab, setTab] = useState<Tab>(fromHash);
  const [adding, setAdding] = useState(false);
  const [menu, setMenu] = useState(false);
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  const [shots, setShots] = useState<Blob[]>([]);
  const [batch, setBatch] = useState<Mt5Row[] | null>(null);
  const [scan, setScan] = useState<{ p: number; t: string } | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [calendar, setCalendar] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [ids, setIds] = useState<string[] | null>(null);
  const acc = useActiveAccount();
  const toast = useToast();

  useEffect(() => {
    const on = () => setTab(fromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  async function scanFiles(files: File[]) {
    setScan({ p: 0, t: 'Menyiapkan…' });
    try {
      const r = await ocrImageFiles(files, (p, t) => setScan({ p, t }));
      // gabungkan semua gambar; posisi dengan tiket sama (screenshot tumpang tindih) hanya dihitung sekali
      const seen = new Set<string>(), rows: Mt5Row[] = [];
      for (const tx of r.texts) for (const row of parseMt5Text(tx).rows) {
        const key = row.ticket ? 't' + row.ticket : [row.side, row.lots, row.entry, row.exit, row.closeTime].join('|');
        if (seen.has(key)) continue;
        seen.add(key); rows.push(row);
      }
      rows.sort((x, y) => String(y.closeTime).localeCompare(String(x.closeTime)));
      const pick = rows.find(x => x.detailed) ?? rows[0] ?? null;
      setScan(null);
      const charts = r.charts.filter((c): c is NonNullable<typeof c> => !!c);
      if (!pick && charts.length) {
        if (charts.length > 1) toast.show(`${charts.length} gambar grafik terbaca. Yang pertama dimasukkan dulu; ulangi untuk yang lain.`);
        setPrefill(buildChartPrefill(charts[0]!)); setShots([files[0]!]); setAdding(true);
        return;
      }
      if (!pick) { toast.show('Data trade tidak terbaca. Coba screenshot yang lebih jelas atau isi manual.'); return; }
      if (rows.filter(x => x.detailed).length >= 2) { setBatch(rows); return; }
      setPrefill(buildPrefill(pick, mt5GetTz())); setShots([files[0]!]); setAdding(true);
    } catch (e) {
      setScan(null);
      toast.show((e as Error)?.message === 'ocr-load' ? 'Mesin pembaca teks gagal dimuat. Pastikan internet aktif lalu coba lagi.' : 'Screenshot gagal dibaca. Coba lagi atau isi manual.');
    }
  }
  const go = (t: Tab) => { if (location.hash !== `#/${t}`) location.hash = `#/${t}`; setTab(t); };

  const nav = (t: (typeof TABS)[number]) => (
    <button key={t.id} className="nav-item" aria-current={tab === t.id ? 'page' : undefined} onClick={() => go(t.id)}>
      <Icon name={t.icon} size={26} />{t.label}
    </button>
  );

  return (
    <div className="app">
      {tab === 'performance' && <PerformancePage onCalendar={() => setCalendar(true)} onAdd={() => setMenu(true)} onPickDay={d => { setDay(d); setIds(null); go('journal'); }} onOpenIds={i => { setIds(i); setDay(null); go('journal'); }} toast={toast.show} />}
      {tab === 'journal' && <JournalPage dayFilter={day} clearDay={() => setDay(null)} idsFilter={ids} clearIds={() => setIds(null)} onAdd={() => setMenu(true)} toast={toast.show} />}
      {tab === 'tools' && <ToolsPage />}
      {tab === 'profile' && <ProfilePage toast={toast.show} />}

      <nav className="nav" aria-label="Menu utama">
        {nav(TABS[0]!)}{nav(TABS[1]!)}
        <button className="nav-add" aria-label="Catat trade" onClick={() => setMenu(true)}><Icon name="candlePlus" size={30} /><span className="nav-add-l">Catat</span></button>
        {nav(TABS[2]!)}{nav(TABS[3]!)}
      </nav>

      {menu && <AddMenu onClose={() => setMenu(false)} onManual={() => { setMenu(false); setPrefill(null); setShots([]); setAdding(true); }} onScreenshot={() => { setMenu(false); picker.current?.click(); }} />}
      <input ref={picker} type="file" accept="image/*" multiple hidden onChange={e => { const f = [...(e.target.files ?? [])]; e.target.value = ''; if (f.length) void scanFiles(f); }} />
      {scan && <ScanOverlay progress={scan.p} text={scan.t} />}
      {batch && <ImportList accountId={acc.id} trades={acc.trades.filter(t => !t.deletedAt)} rows={batch} onClose={() => setBatch(null)} onDone={n => { setBatch(null); go('journal'); toast.show(`${n} trade dicatat dari screenshot`); }} />}
      {adding && <TradeForm key={prefill ? `pf-${prefill.entry}-${prefill.ticket ?? ''}` : 'manual'} accountId={acc.id} currency={acc.currency} prefill={prefill ?? undefined} attachFiles={shots} onClose={() => { setAdding(false); setPrefill(null); setShots([]); }} onSaved={toast.show} />}
      {calendar && <CalendarPage acc={acc} onClose={() => setCalendar(false)} onPickDay={d => { setDay(d); setIds(null); go('journal'); }} />}
      {toast.node}
    </div>
  );
}
