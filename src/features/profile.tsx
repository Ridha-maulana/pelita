import { useRef, useState } from 'react';
import type { Currency } from '../domain/types';
import { BACKUP_VERSION, makeBackup, parseBackup, previewOf, type ParseResult } from '../domain/backup';
import { tradesToCsv } from '../domain/csv';
import { capitalSums } from '../domain/account';
import { money } from '../domain/format';
import { nowWibIso } from '../domain/time';
import { Icon } from '../ui/icons';
import { Confirm, Field, Sheet } from '../ui/primitives';
import { actions, getState, useActiveAccount, useApp } from '../data/store';
import { readLegacy } from '../data/persist';
import { putAttachment } from '../data/attachments';
import { APP_VERSION } from '../version';

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ProfilePage({ toast }: { toast: (m: string) => void }) {
  const acc = useActiveAccount();
  const accounts = useApp(s => s.store.accounts);
  const saveError = useApp(s => s.saveError);
  const [dlg, setDlg] = useState<null | 'new' | 'rename' | 'capital' | 'delete'>(null);
  const [pending, setPending] = useState<ParseResult | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const legacy = readLegacy();
  const { deposits, withdrawals } = capitalSums(acc);

  async function applyImport(r: ParseResult) {
    // cadangan otomatis sebelum menimpa
    download(`pelita-sebelum-impor-${nowWibIso().slice(0, 10)}.json`, JSON.stringify(makeBackup(getState().store, APP_VERSION)), 'application/json');
    await Promise.all(r.attachments.map(a => putAttachment(a.id, a.dataUrl).catch(() => undefined)));
    actions.replaceStore(r.store);
    setPending(null);
    toast('Data dipulihkan');
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    try {
      const r = parseBackup(JSON.parse(await f.text()));
      if (!r) return toast('File tidak valid');
      setPending(r);
    } catch { toast('File tidak bisa dibaca'); }
  }

  return (
    <div className="page stack">
      <div><h1 className="page-title">Profil</h1><p className="page-sub">Akun, cadangan, dan data.</p></div>
      {saveError && <div className="banner err" role="alert">Penyimpanan di perangkat penuh atau gagal. Unduh cadangan sekarang agar data tidak hilang.</div>}

      <h2 className="eyebrow">Akun</h2>
      <div className="list">
        {accounts.map(a => (
          <button key={a.id} className="item" onClick={() => actions.setActive(a.id)} aria-current={a.id === acc.id}>
            <span className="ic"><Icon name={a.id === acc.id ? 'check' : 'user'} /></span>
            <span className="grow"><div className="t">{a.name}</div><div className="d">{a.currency} · {a.trades.filter(t => !t.deletedAt).length} trade</div></span>
          </button>
        ))}
        <button className="item" onClick={() => setDlg('new')}><span className="ic"><Icon name="plus" /></span><span className="grow t">Tambah akun</span></button>
        <button className="item" onClick={() => setDlg('rename')}><span className="ic"><Icon name="edit" /></span><span className="grow t">Ganti nama akun</span></button>
        <button className="item" onClick={() => setDlg('capital')}><span className="ic"><Icon name="wallet" /></span><span className="grow"><div className="t">Deposit & penarikan</div><div className="d">Deposit {money(deposits, acc.currency)} · Tarik {money(withdrawals, acc.currency)}</div></span></button>
        {accounts.length > 1 && <button className="item" onClick={() => setDlg('delete')}><span className="ic neg"><Icon name="trash" /></span><span className="grow t neg">Hapus akun</span></button>}
      </div>

      <h2 className="eyebrow">Data</h2>
      <div className="list">
        <button className="item" onClick={() => download(`pelita-backup-${nowWibIso().slice(0, 10)}.json`, JSON.stringify(makeBackup(getState().store, APP_VERSION)), 'application/json')}>
          <span className="ic"><Icon name="download" /></span><span className="grow"><div className="t">Unduh cadangan</div><div className="d">Semua akun, format JSON v{BACKUP_VERSION}</div></span>
        </button>
        <button className="item" onClick={() => file.current?.click()}>
          <span className="ic"><Icon name="upload" /></span><span className="grow"><div className="t">Pulihkan dari file</div><div className="d">Cadangan Pelita atau Edge Journal</div></span>
        </button>
        <button className="item" onClick={() => download(`pelita-${acc.name}.csv`, tradesToCsv(acc.trades.filter(t => !t.deletedAt)), 'text/csv')}>
          <span className="ic"><Icon name="share" /></span><span className="grow"><div className="t">Ekspor CSV</div><div className="d">Jurnal {acc.name}</div></span>
        </button>
        {legacy && (
          <button className="item" onClick={() => setPending(legacy)}>
            <span className="ic"><Icon name="book" /></span><span className="grow"><div className="t">Impor dari Edge Journal</div><div className="d">Ditemukan data di browser ini</div></span>
          </button>
        )}
        <button className="item" onClick={() => { actions.loadDemo(); toast('Data contoh dimuat'); }}>
          <span className="ic"><Icon name="info" /></span><span className="grow"><div className="t">Coba dengan data contoh</div><div className="d">Mengganti isi sementara; unduh cadangan dulu bila perlu</div></span>
        </button>
      </div>
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={e => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
      <p className="muted" style={{ fontSize: 13 }}>Pelita {APP_VERSION} · data tersimpan di perangkat ini.</p>

      {pending && (() => { const p = previewOf(pending.store); return (
        <Confirm title="Timpa data sekarang?" text={`${p.accounts} akun, ${p.trades} trade (${p.accountNames.join(', ')}). Cadangan data sekarang diunduh otomatis sebelum menimpa.`} ok="Pulihkan" danger onCancel={() => setPending(null)} onOk={() => { void applyImport(pending); }} />
      ); })()}
      {dlg === 'new' && <NewAccount onClose={() => setDlg(null)} />}
      {dlg === 'rename' && <Rename id={acc.id} name={acc.name} onClose={() => setDlg(null)} />}
      {dlg === 'capital' && <Capital accId={acc.id} onClose={() => setDlg(null)} />}
      {dlg === 'delete' && <Confirm title="Hapus akun?" text={`Akun "${acc.name}" beserta ${acc.trades.length} trade akan dihapus dari perangkat ini.`} ok="Hapus" danger onCancel={() => setDlg(null)} onOk={() => { actions.deleteAccount(acc.id); setDlg(null); toast('Akun dihapus'); }} />}
    </div>
  );
}

function NewAccount({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [cur, setCur] = useState<Currency>('USD');
  const [bal, setBal] = useState('1000');
  return (
    <Sheet title="Tambah akun" onClose={onClose}>
      <div className="stack">
        <Field label="Nama"><input className="input" value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Mata uang"><select className="input" value={cur} onChange={e => setCur(e.target.value as Currency)}>{['USD', 'EUR', 'IDR', 'GBP'].map(c => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Saldo awal"><input className="input" inputMode="decimal" value={bal} onChange={e => setBal(e.target.value)} /></Field>
        <button className="btn primary block" disabled={!name.trim() || !Number.isFinite(Number(bal))} onClick={() => { actions.addAccount(name, cur, Number(bal)); onClose(); }}>Simpan</button>
      </div>
    </Sheet>
  );
}

function Rename({ id, name, onClose }: { id: string; name: string; onClose: () => void }) {
  const [v, setV] = useState(name);
  return (
    <Sheet title="Ganti nama akun" onClose={onClose}>
      <div className="stack">
        <Field label="Nama"><input className="input" value={v} onChange={e => setV(e.target.value)} /></Field>
        <button className="btn primary block" disabled={!v.trim()} onClick={() => { actions.renameAccount(id, v); onClose(); }}>Simpan</button>
      </div>
    </Sheet>
  );
}

function Capital({ accId, onClose }: { accId: string; onClose: () => void }) {
  const acc = useActiveAccount();
  const [type, setType] = useState<'deposit' | 'withdraw'>('deposit');
  const [amt, setAmt] = useState('');
  return (
    <Sheet title="Deposit & penarikan" onClose={onClose}>
      <div className="stack">
        <div className="seg" role="group" aria-label="Jenis">
          <button aria-pressed={type === 'deposit'} onClick={() => setType('deposit')}>Deposit</button>
          <button aria-pressed={type === 'withdraw'} onClick={() => setType('withdraw')}>Tarik</button>
        </div>
        <Field label="Jumlah"><input className="input" inputMode="decimal" value={amt} onChange={e => setAmt(e.target.value)} /></Field>
        <button className="btn primary block" disabled={!(Number(amt) > 0)} onClick={() => { actions.addCapital(accId, { type, amount: Number(amt), date: nowWibIso().slice(0, 10), note: '' }); setAmt(''); }}>Tambah</button>
        <div>{acc.capital.map(c => (
          <div className="adv-row" key={c.id}>
            <span>{c.date} · {c.type === 'deposit' ? 'Deposit' : 'Tarik'}</span>
            <span className="row"><b>{money(c.amount, acc.currency)}</b><button className="icon-btn" aria-label="Hapus" onClick={() => actions.deleteCapital(accId, c.id)}><Icon name="trash" size={18} /></button></span>
          </div>
        ))}</div>
      </div>
    </Sheet>
  );
}
