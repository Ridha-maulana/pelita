import { useEffect, useState, type ReactNode } from 'react';
import { cloud, hasAuthHint, initCloud, useCloudStatus } from '../cloud/firebase';
import { SAFE_KEY, type SyncStatus } from '../cloud/engine';
import type { ParseResult } from '../domain/backup';
import { previewOf } from '../domain/backup';
import { putAttachment } from '../data/attachments';
import { actions, getState } from '../data/store';
import { Confirm } from '../ui/primitives';
import { Icon } from '../ui/icons';

const EMAIL_KEY = 'pelita-login-email';
const SKIP_KEY = 'pelita-skip-login';
const read = (k: string) => { try { return localStorage.getItem(k) ?? ''; } catch { return ''; } };
const write = (k: string, v: string) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch { /* */ } };

function PwInput({ value, onChange, placeholder, autoComplete }: { value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-wrap">
      <input className="input" type={show ? 'text' : 'password'} autoComplete={autoComplete ?? 'current-password'} autoCapitalize="none" autoCorrect="off" spellCheck={false}
        value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
      <button type="button" className="pw-eye" aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'} aria-pressed={show} onClick={() => setShow(s => !s)}>
        <Icon name={show ? 'eyeOff' : 'eye'} size={20} />
      </button>
    </div>
  );
}

function useBusy() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  async function run(fn: () => Promise<unknown>, ok?: string) {
    setBusy(true); setMsg('');
    try { await fn(); if (ok) setMsg(ok); } catch (e) { setMsg((e as Error).message || 'Terjadi kesalahan.'); }
    setBusy(false);
  }
  return { busy, msg, setMsg, run };
}

const timeOf = (t: number) => (t ? new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':') : '');
export function statusLabel(st: SyncStatus): string {
  if (!st.configured) return 'Belum diaktifkan';
  if (!st.user) return st.ready ? 'Belum masuk · data di perangkat ini' : 'Memuat layanan online…';
  const t = timeOf(st.lastSyncAt);
  return ({
    synced: 'Tersinkron' + (t ? ' · ' + t : ''), syncing: 'Menyinkronkan…', dirty: 'Perubahan menunggu dikirim…',
    offline: 'Offline · dikirim saat online', conflict: 'Perlu pilihan Anda', error: 'Gagal sinkron'
  } as Record<string, string>)[st.state] ?? '';
}

/** Layar masuk di awal. Hanya bila Firebase aktif; "Lanjut tanpa masuk" diingat sampai Keluar. */
export function AuthGate({ children }: { children: ReactNode }) {
  const st = useCloudStatus();
  const [skip, setSkip] = useState(() => read(SKIP_KEY) === '1');
  const [hint] = useState(hasAuthHint);
  const [entered, setEntered] = useState(false);
  const [late, setLate] = useState(false);
  const [email, setEmail] = useState(() => read(EMAIL_KEY));
  const [pw, setPw] = useState('');
  const { busy, msg, setMsg, run } = useBusy();

  useEffect(() => { void initCloud(); }, []);
  useEffect(() => { const t = setTimeout(() => setLate(true), 8000); return () => clearTimeout(t); }, []);
  useEffect(() => {
    const f = () => { setSkip(false); setEntered(false); };
    window.addEventListener('pelita-gate-reset', f);
    return () => window.removeEventListener('pelita-gate-reset', f);
  }, []);

  let view: 'app' | 'check' | 'login' | 'conflict' = 'app';
  if (st.configured && !skip) {
    if (st.user) {
      if (entered || hint || late) view = 'app';
      else if (st.state === 'conflict') view = 'conflict';
      else if (st.state === 'syncing') view = 'check';
    } else if (!st.ready) view = hint ? 'app' : late ? 'login' : 'check';
    else if (hint && st.state === 'offline') view = 'app';
    else view = 'login';
  }
  useEffect(() => { if (view === 'app' && st.user) setEntered(true); }, [view, st.user]);
  // konflik harus tetap tampil walau sudah "masuk" dari ingatan
  if (st.user && st.state === 'conflict' && !entered) view = 'conflict';

  if (view === 'app') return <>{children}</>;

  const brand = (
    <div className="gate-brand"><span className="gate-mark"><Icon name="bolt" size={28} /></span><div><b>PELITA</b><span>Jurnal trading</span></div></div>
  );
  if (view === 'check') return <div className="gate">{brand}<p className="gate-note">{st.user ? 'Menyinkronkan data…' : 'Memeriksa akun…'}</p></div>;
  if (view === 'conflict') {
    return (
      <div className="gate">{brand}
        <div className="gate-box">
          <h1>Pilih data yang dipakai</h1>
          <p>Perangkat ini dan cloud sama-sama sudah punya data jurnal yang berbeda. Pilih salah satu. Yang tidak dipilih disimpan sebagai cadangan lokal.</p>
          <button className="btn primary block" disabled={busy} onClick={() => { if (window.confirm('Data di perangkat ini akan diganti dengan data cloud. Lanjutkan?')) void run(() => cloud.resolveConflict('cloud')); }}>Pakai data cloud</button>
          <button className="btn block" disabled={busy} onClick={() => { if (window.confirm('Data di cloud akan diganti dengan data perangkat ini. Lanjutkan?')) void run(() => cloud.resolveConflict('local')); }}>Pakai data perangkat ini</button>
          {msg && <p className="gate-err" role="alert">{msg}</p>}
        </div>
      </div>
    );
  }
  const err = msg || (st.state === 'offline' && st.message) || '';
  const go = () => run(async () => { await cloud.signIn(email, pw); write(EMAIL_KEY, email.trim()); });
  return (
    <div className="gate">{brand}
      <form className="gate-box" onSubmit={e => { e.preventDefault(); if (email && pw) void go(); }}>
        <h1>Masuk</h1>
        <p>Data jurnal tersimpan online di akun Anda dan otomatis muncul di perangkat mana pun. Akun Edge Journal bisa dipakai.</p>
        <label className="field"><span>Email</span>
          <input className="input" type="email" autoComplete="username" autoCapitalize="none" inputMode="email" value={email} placeholder="email@anda.com" onChange={e => setEmail(e.target.value)} />
        </label>
        <label className="field"><span>Password</span><PwInput value={pw} onChange={setPw} placeholder="Password" /></label>
        {err && <p className="gate-err" role="alert">{err}</p>}
        <button className="btn primary block" type="submit" disabled={busy || !email || !pw}>{busy ? 'Memproses…' : 'Masuk'}</button>
        <div className="gate-row">
          <button className="btn" type="button" disabled={busy || !email || !pw} onClick={() => run(async () => { await cloud.signUp(email, pw); write(EMAIL_KEY, email.trim()); })}>Daftar baru</button>
          <button className="btn" type="button" disabled={busy || !email} onClick={() => run(() => cloud.resetPassword(email), 'Email reset password dikirim. Periksa kotak masuk atau spam.')}>Lupa password</button>
        </div>
        <button className="gate-link" type="button" onClick={() => { write(SKIP_KEY, '1'); setSkip(true); setMsg(''); }}>Lanjut tanpa masuk</button>
      </form>
    </div>
  );
}

/** Isi baris "Sinkron online" di Profil. */
export function SyncCard({ toast }: { toast: (m: string) => void }) {
  const st = useCloudStatus();
  const [email, setEmail] = useState(() => read(EMAIL_KEY));
  const [pw, setPw] = useState('');
  const { busy, msg, run } = useBusy();
  const [edge, setEdge] = useState<ParseResult | null>(null);

  if (!st.configured) return <p className="muted sync-note">Sinkron online belum diaktifkan di versi ini.</p>;
  if (!st.user) {
    return (
      <form className="stack sync-form" onSubmit={e => { e.preventDefault(); if (email && pw) void run(async () => { await cloud.signIn(email, pw); write(EMAIL_KEY, email.trim()); write(SKIP_KEY, ''); }); }}>
        <p className="muted sync-note">Masuk dengan akun Edge Journal yang sama, atau daftar baru. Data jurnal ikut tersimpan online.</p>
        <label className="field"><span>Email</span><input className="input" type="email" autoComplete="username" autoCapitalize="none" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@anda.com" /></label>
        <label className="field"><span>Password</span><PwInput value={pw} onChange={setPw} placeholder="minimal 6 karakter" /></label>
        <div className="row sync-btns">
          <button className="btn primary" type="submit" disabled={busy || !email || !pw}>{busy ? 'Memproses…' : 'Masuk'}</button>
          <button className="btn" type="button" disabled={busy || !email || !pw} onClick={() => run(async () => { await cloud.signUp(email, pw); write(EMAIL_KEY, email.trim()); write(SKIP_KEY, ''); })}>Daftar</button>
          <button className="btn" type="button" disabled={busy || !email} onClick={() => run(() => cloud.resetPassword(email), 'Email reset password dikirim. Periksa kotak masuk atau spam.')}>Lupa password</button>
        </div>
        {(msg || st.message) && <p className="sync-note warn" role="status">{msg || st.message}</p>}
      </form>
    );
  }
  async function applyEdge(r: ParseResult) {
    try { localStorage.setItem(SAFE_KEY, JSON.stringify(getState().store)); } catch { /* */ }
    await Promise.all(r.attachments.map(a => putAttachment(a.id, a.dataUrl).catch(() => undefined)));
    actions.replaceStore(r.store);
    setEdge(null);
    toast('Data Edge Journal dimuat');
  }
  const p = edge ? previewOf(edge.store) : null;
  return (
    <div className="stack sync-form">
      <p className="sync-note">Masuk sebagai <b>{st.user.email}</b></p>
      <p className={'sync-status ' + st.state} role="status">{statusLabel(st)}</p>
      {st.state === 'conflict' && (
        <div className="sync-conflict">
          <p>{st.message}</p>
          <div className="row sync-btns">
            <button className="btn" disabled={busy} onClick={() => { if (window.confirm('Data di perangkat ini akan diganti dengan data cloud. Lanjutkan?')) void run(() => cloud.resolveConflict('cloud')); }}>Pakai data cloud</button>
            <button className="btn" disabled={busy} onClick={() => { if (window.confirm('Data di cloud akan diganti dengan data perangkat ini. Lanjutkan?')) void run(() => cloud.resolveConflict('local')); }}>Pakai data perangkat ini</button>
          </div>
        </div>
      )}
      {(st.state === 'error' || st.state === 'offline') && st.message && <p className="sync-note warn">{st.message}</p>}
      {msg && <p className="sync-note warn" role="status">{msg}</p>}
      <div className="row sync-btns">
        <button className="btn" disabled={busy || st.state === 'conflict'} onClick={() => run(() => cloud.syncNow())}>Sinkronkan sekarang</button>
        <button className="btn" disabled={busy} onClick={() => run(() => cloud.readEdge().then(r => { if (!r) throw new Error('Tidak ada data Edge Journal di cloud untuk akun ini.'); setEdge(r); }))}>Impor dari Edge Journal</button>
        <button className="btn" disabled={busy} onClick={() => run(async () => { await cloud.signOut(); window.dispatchEvent(new Event('pelita-gate-reset')); })}>Keluar</button>
      </div>
      <p className="muted sync-note">Lampiran screenshot belum ikut tersinkron; hanya data trade dan akun.</p>
      {edge && p && (
        <Confirm title="Impor data Edge Journal?" text={`Ditemukan ${p.accounts} akun dan ${p.trades} trade (${p.accountNames.join(', ')}). Data di perangkat ini diganti; versi lama disimpan sebagai cadangan lokal.`}
          ok="Impor" onCancel={() => setEdge(null)} onOk={() => { void applyEdge(edge); }} />
      )}
    </div>
  );
}
