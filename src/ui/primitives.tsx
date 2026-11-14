import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './icons';

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Tutup"><Icon name="close" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Confirm({ title, text, ok = 'Ya', danger, onOk, onCancel }:
  { title: string; text?: string; ok?: string; danger?: boolean; onOk: () => void; onCancel: () => void }) {
  return (
    <div className="scrim center" onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="dialog stack" role="alertdialog" aria-label={title}>
        <h2>{title}</h2>
        {text && <p className="muted">{text}</p>}
        <div className="row">
          <button className="btn grow" onClick={onCancel}>Batal</button>
          <button className={`btn grow ${danger ? 'danger' : 'primary'}`} onClick={onOk}>{ok}</button>
        </div>
      </div>
    </div>
  );
}

/** Pemilih satu ketukan: memilih langsung menutup. */
export function PickerSheet<T extends string>({ title, value, options, onPick, onClose }:
  { title: string; value: T; options: { value: T; label: string }[]; onPick: (v: T) => void; onClose: () => void }) {
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="list">
        {options.map(o => (
          <button key={o.value} className="item" onClick={() => { onPick(o.value); onClose(); }}>
            <span className="t grow">{o.label}</span>
            {o.value === value && <Icon name="check" />}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = (m: string) => { setMsg(m); clearTimeout(t.current); t.current = setTimeout(() => setMsg(null), 2400); };
  const node = msg ? <div className="toast" role="status">{msg}</div> : null;
  return { show, node };
}

/** Daftar geser: tiap halaman berisi `size` baris; geser ke samping untuk halaman lain. Hanya halaman aktif ± 1 yang dirender. */
export function PagedList<T>({ items, size = 5, rowH = 60, render, onPage }:
  { items: readonly T[]; size?: number; rowH?: number; render: (item: T, i: number) => ReactNode; onPage?: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const [cur, setCur] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const onScroll = () => {
    const el = box.current; if (!el) return;
    const p = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
    if (p !== cur) { setCur(p); onPage?.(p); }
  };
  const go = (p: number) => { const el = box.current; if (el) el.scrollTo({ left: p * el.clientWidth, behavior: 'smooth' }); };
  return (
    <div>
      <div className="paged" ref={box} onScroll={onScroll} style={{ height: rowH * size }}>
        {Array.from({ length: pages }, (_, p) => (
          <div className="paged-page list" key={p} role="group" aria-label={`Halaman ${p + 1} dari ${pages}`}>
            {Math.abs(p - cur) <= 1 && items.slice(p * size, p * size + size).map((it, i) => render(it, p * size + i))}
          </div>
        ))}
      </div>
      <div className="paged-foot">
        <button className="icon-btn" aria-label="Halaman sebelumnya" disabled={cur === 0} onClick={() => go(cur - 1)}><Icon name="chevLeft" size={18} /></button>
        <span className="muted">{cur + 1} / {pages}</span>
        <button className="icon-btn" aria-label="Halaman berikutnya" disabled={cur >= pages - 1} onClick={() => go(cur + 1)}><Icon name="chevRight" size={18} /></button>
      </div>
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button className="switch" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}><i /></button>;
}
