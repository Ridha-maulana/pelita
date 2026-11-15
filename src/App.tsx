import { useEffect, useState } from 'react';
import { Icon, type IconName } from './ui/icons';
import { useToast } from './ui/primitives';
import { PerformancePage } from './features/performance';
import { CalendarPage } from './features/stats-pages';
import { JournalPage } from './features/journal';
import { ToolsPage } from './features/tools';
import { ProfilePage } from './features/profile';
import { TradeForm } from './features/trade-form';
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
  const go = (t: Tab) => { if (location.hash !== `#/${t}`) location.hash = `#/${t}`; setTab(t); };

  const nav = (t: (typeof TABS)[number]) => (
    <button key={t.id} className="nav-item" aria-current={tab === t.id ? 'page' : undefined} onClick={() => go(t.id)}>
      <Icon name={t.icon} size={26} />{t.label}
    </button>
  );

  return (
    <div className="app">
      {tab === 'performance' && <PerformancePage onCalendar={() => setCalendar(true)} onPickDay={d => { setDay(d); setIds(null); go('journal'); }} onOpenIds={i => { setIds(i); setDay(null); go('journal'); }} toast={toast.show} />}
      {tab === 'journal' && <JournalPage dayFilter={day} clearDay={() => setDay(null)} idsFilter={ids} clearIds={() => setIds(null)} onAdd={() => setAdding(true)} toast={toast.show} />}
      {tab === 'tools' && <ToolsPage />}
      {tab === 'profile' && <ProfilePage toast={toast.show} />}

      <nav className="nav" aria-label="Menu utama">
        {nav(TABS[0]!)}{nav(TABS[1]!)}
        <button className="nav-add" aria-label="Catat trade" onClick={() => setAdding(true)}><Icon name="candlePlus" size={30} /><span className="nav-add-l">Catat</span></button>
        {nav(TABS[2]!)}{nav(TABS[3]!)}
      </nav>

      {adding && <TradeForm accountId={acc.id} currency={acc.currency} onClose={() => setAdding(false)} onSaved={toast.show} />}
      {calendar && <CalendarPage acc={acc} onClose={() => setCalendar(false)} onPickDay={d => { setDay(d); setIds(null); go('journal'); }} />}
      {toast.node}
    </div>
  );
}
