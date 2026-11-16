import { useEffect, useState } from 'react';
import { getAttachment } from '../data/attachments';
import { Icon } from '../ui/icons';

/** Pratinjau lampiran (dibaca dari IndexedDB). Ketuk gambar untuk memperbesar. */
export function AttachmentThumbs({ ids, onRemove }: { ids: string[]; onRemove?: (id: string) => void }) {
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const [big, setBig] = useState<string | null>(null);
  useEffect(() => {
    let off = false;
    ids.forEach(id => {
      if (id in urls) return;
      getAttachment(id).then(u => { if (!off) setUrls(m => ({ ...m, [id]: u ?? null })); }).catch(() => { if (!off) setUrls(m => ({ ...m, [id]: null })); });
    });
    return () => { off = true; };
  }, [ids]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ids.length) return null;
  return (
    <>
      <div className="thumbs">
        {ids.map(id => (
          <div className="thumb" key={id}>
            {urls[id]
              ? <button type="button" className="thumb-img" aria-label="Perbesar screenshot" onClick={() => setBig(urls[id]!)}><img src={urls[id]!} alt="Screenshot trade" /></button>
              : <span className="thumb-img thumb-miss">{id in urls ? 'Tidak ada' : '…'}</span>}
            {onRemove && <button type="button" className="thumb-x" aria-label="Hapus lampiran" onClick={() => onRemove(id)}><Icon name="close" size={14} /></button>}
          </div>
        ))}
      </div>
      {big && (
        <div className="scrim center viewer" role="dialog" aria-label="Screenshot" onClick={() => setBig(null)}>
          <img src={big} alt="Screenshot trade" />
          <button className="icon-btn viewer-x" aria-label="Tutup" onClick={() => setBig(null)}><Icon name="close" /></button>
        </div>
      )}
    </>
  );
}
