import { useEffect, useState } from 'react';
import { Icon, type IconName } from './ui/icons';
import { useToast } from './ui/primitives';
import { PerformancePage, CalendarSheet } from './features/performance';
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
      {tab === 'performance' && <PerformancePage onCalendar={() => setCalendar(true)} />}
      {tab === 'journal' && <JournalPage dayFilter={day} clearDay={() => setDay(null)} onAdd={() => setAdding(true)} toast={toast.show} />}
      {tab === 'tools' && <ToolsPage />}
      {tab === 'profile' && <ProfilePage toast={toast.show} />}

      <nav className="nav" aria-label="Menu utama">
        {nav(TABS[0]!)}{nav(TABS[1]!)}
        <button className="nav-add" aria-label="Catat trade" onClick={() => setAdding(true)}><Icon name="candlePlus" size={30} /></button>
        {nav(TABS[2]!)}{nav(TABS[3]!)}
      </nav>

      {adding && <TradeForm accountId={acc.id} currency={acc.currency} onClose={() => setAdding(false)} onSaved={toast.show} />}
      {calendar && <CalendarSheet onClose={() => setCalendar(false)} onPickDay={d => { setDay(d); go('journal'); }} />}
      {toast.node}
    </div>
  );
}
