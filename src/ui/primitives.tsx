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
