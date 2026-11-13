// Lampiran (screenshot) disimpan di IndexedDB, bukan di localStorage (kuota kecil).
const DB = 'pelita-files';
const STORE = 'attachments';

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => {
    const r = fn(db.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export const putAttachment = (id: string, dataUrl: string) => tx('readwrite', s => s.put(dataUrl, id));
export const getAttachment = (id: string) => tx<string | undefined>('readonly', s => s.get(id));
export const deleteAttachment = (id: string) => tx('readwrite', s => s.delete(id));

/** Perkecil gambar sebelum disimpan (maks sisi panjang 1280px, JPEG 0,8). */
export async function shrinkImage(file: Blob, max = 1280): Promise<string> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.8);
}
