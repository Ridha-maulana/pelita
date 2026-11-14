import { useEffect, useRef, useState } from 'react';
import { Sheet, Switch } from '../ui/primitives';
import { Icon } from '../ui/icons';
import { drawShareImage, type ShareData } from '../lib/share-image';

export function ShareSheet({ data, onClose, toast }: { data: Omit<ShareData, 'hide'>; onClose: () => void; toast: (m: string) => void }) {
  const [hide, setHide] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const blob = useRef<Blob | null>(null);
  const key = JSON.stringify([data.account, data.total, data.growthPct, data.periodText, data.vals.length, hide]);

  useEffect(() => {
    let dead = false, made: string | null = null;
    // tunggu font siap sebentar agar teks di gambar memakai font aplikasi
    const ready = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise(r => setTimeout(r, 800))]);
    void ready.then(() => {
      if (dead) return;
      drawShareImage({ ...data, hide }).toBlob(b => {
        if (dead || !b) return;
        blob.current = b; made = URL.createObjectURL(b); setUrl(made);
      }, 'image/png');
    });
    return () => { dead = true; if (made) URL.revokeObjectURL(made); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.download = `pelita-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    toast('Gambar disimpan');
  };
  const share = async () => {
    const b = blob.current;
    if (!b) return;
    const f = new File([b], 'pelita.png', { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [f] })) { await navigator.share({ files: [f], title: 'Pelita', text: 'Hasil trading saya' }); return; }
    } catch (e) { if ((e as Error).name === 'AbortError') return; }
    save();
  };

  return (
    <Sheet title="Bagikan ke story" onClose={onClose}>
      <div className="stack">
        {url ? <img src={url} alt="Pratinjau gambar ringkasan" style={{ width: '100%', maxHeight: '52vh', objectFit: 'contain', borderRadius: 'var(--r-md)' }} /> : <p className="muted">Menyiapkan gambar…</p>}
        <div className="item"><span className="grow"><div className="t">Sembunyikan nominal</div><div className="d">Tampilkan persen saja</div></span><Switch on={hide} onChange={setHide} label="Sembunyikan nominal" /></div>
        <div className="row">
          <button className="btn grow" disabled={!url} onClick={save}><Icon name="download" size={18} />Simpan</button>
          <button className="btn primary grow" disabled={!url} onClick={() => void share()}><Icon name="share" size={18} />Bagikan</button>
        </div>
      </div>
    </Sheet>
  );
}
