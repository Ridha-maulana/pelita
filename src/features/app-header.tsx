import type { ReactNode } from 'react';
import type { Account } from '../domain/types';
import { currentBalance } from '../domain/account';
import { money } from '../domain/format';
import { sessionOf3, wibParts } from '../domain/time';
import { Icon } from '../ui/icons';

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="currentColor"><path d="M12 2.5c3.4 3.6 4.4 6 4.4 8.1A4.4 4.4 0 0112 15a4.4 4.4 0 01-4.4-4.4c0-2 1-4.3 4.4-8.1z" /><rect x="8.5" y="17" width="7" height="3" rx="1.5" /></svg>
    </span>
  );
}

interface Props { variant: number; account: Account; onCalendar: () => void; onAccount: () => void }

/** Header halaman Performance. 0 = standar; selebihnya gaya pilihan di Tools → Tampilan aplikasi. */
export function AppHeader({ variant, account, onCalendar, onAccount }: Props) {
  const name = account.name, initial = (name || '?').trim().charAt(0).toUpperCase();
  const bal = money(currentBalance(account), account.currency);
  const cal = <button className="icon-btn" onClick={onCalendar} aria-label="Kalender"><Icon name="calendar" size={20} /></button>;
  const av = <span className="hd-av" aria-hidden="true">{initial}</span>;
  const chev = <Icon name="chevDown" size={14} />;
  const acc = (kids: ReactNode, cls = '') => <button className={`account-pill ${cls}`} onClick={onAccount} aria-label={`Akun: ${name}. Ganti akun`}>{kids}</button>;
  const nm = <span className="acc-name">{name}</span>;
  const brand = (sub: ReactNode = 'Jurnal trading') => (
    <div className="brand"><BrandMark /><div><strong>PELITA</strong><span>{sub}</span></div></div>
  );
  const w = wibParts(Date.now());
  const wrap = (cls: string, kids: ReactNode) => <header className={`hd hd-${variant} ${cls}`}>{kids}</header>;

  switch (variant) {
    case 1: return wrap('', <><div className="brand"><BrandMark size={28} /><strong>Pelita</strong></div><div className="top-actions">{cal}{acc(<><i className="hd-dot" />{nm}{chev}</>)}</div></>);
    case 2: return wrap('', <>{brand()}<div className="top-actions">{cal}{acc(<>{av}{nm}{chev}</>)}</div></>);
    case 3: return wrap('', <>
      <button className="hd-acct-title" onClick={onAccount} aria-label={`Akun: ${name}. Ganti akun`}><small>AKUN AKTIF · {account.currency}</small><span><strong>{name}</strong>{chev}</span></button>
      <div className="top-actions">{cal}<BrandMark size={38} /></div></>);
    case 5: return wrap('', <>{brand()}<div className="top-actions">{cal}{acc(<span className="hd-two"><span className="acc-name">{name}</span><em>{bal}</em></span>)}</div></>);
    case 6: return wrap('', <>{brand()}<div className="top-actions">{cal}{acc(<>{nm}{chev}</>)}</div></>);
    case 7: return wrap('', <>{brand(<span className="hd-sync"><i className="hd-dot" />Tersimpan lokal</span>)}<div className="top-actions">{cal}{acc(<>{av}{nm}</>)}</div></>);
    case 9: return wrap('', <div className="hd-card">{brand()}<div className="top-actions">{cal}<i className="hd-sep" />{acc(<>{av}{chev}</>)}</div></div>);
    case 10: return wrap('', <>
      <div className="hd-row">{brand()}{acc(<>{nm}{chev}</>)}</div>
      <div className="hd-strip"><button onClick={onCalendar}><Icon name="calendar" size={15} /><b>{DAYS[w.weekday]}, {w.day} {MON[w.month - 1]}</b></button><span className="hd-ses"><i className="hd-dot" />{sessionOf3(Date.now())}</span></div></>);
    default: return wrap('', <>{brand()}<div className="top-actions">{cal}{acc(<><Icon name="user" size={18} />{nm}{chev}</>)}</div></>);
  }
}
