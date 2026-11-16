// Adaptor Firebase (Auth email/password + Cloud Firestore) untuk Pelita.
// SDK dimuat dari gstatic saat dibutuhkan (tanpa paket npm). Bila gagal dimuat (offline), aplikasi tetap jalan lokal.
//
// Penyimpanan cloud: dokumen berada di users/{uid}/chunks dengan id "pelita-meta" dan "pelita-0000…".
// Aturan Firestore milik Edge Journal sudah mengizinkan path ini, dan data Edge Journal (users/{uid} + chunk c0000…) tidak tersentuh.
import { useSyncExternalStore } from 'react';
import { FIREBASE_CONFIG } from './config';
import { createEngine, friendlyError, type Backend, type CloudMeta, type SyncStatus } from './engine';
import { setLocalChangedHandler } from './hook';
import { parseBackup, type ParseResult } from '../domain/backup';
import { actions } from '../data/store';

const FIREBASE_VERSION = '10.11.1';
const META_ID = 'pelita-meta';
const chunkId = (i: number) => 'pelita-' + String(i).padStart(4, '0');
const HINT_KEY = 'pelita-auth-hint';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fb = any;

const configured = !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
let status: SyncStatus = configured
  ? { configured: true, ready: false, user: null, state: 'signedout', lastSyncAt: 0, message: '' }
  : { configured: false, ready: true, user: null, state: 'off', lastSyncAt: 0, message: '' };
const listeners = new Set<() => void>();
const setStatus = (s: SyncStatus) => { status = s; listeners.forEach(l => l()); };

export const getCloudStatus = () => status;
export const useCloudStatus = (): SyncStatus => useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => status);

export function hasAuthHint(): boolean { try { return localStorage.getItem(HINT_KEY) === '1'; } catch { return false; } }
const setHint = (on: boolean) => { try { on ? localStorage.setItem(HINT_KEY, '1') : localStorage.removeItem(HINT_KEY); } catch { /* */ } };

type Engine = ReturnType<typeof createEngine>;
interface Impl {
  engine: Engine | null;
  fb: Fb | null;
  auth: Fb | null;
  db: Fb | null;
  loadError: string;
}
const impl: Impl = { engine: null, fb: null, auth: null, db: null, loadError: '' };
let booting: Promise<void> | null = null;

function applyState(text: string): boolean {
  try {
    const r = parseBackup(JSON.parse(text));
    if (!r) return false;
    actions.applyRemote(r.store);
    return true;
  } catch { return false; }
}

export function initCloud(): Promise<void> {
  if (!configured) return Promise.resolve();
  if (booting) return booting;
  booting = (async () => {
    try {
      const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/`;
      const [appM, authM, fsM] = await Promise.all([
        import(/* @vite-ignore */ base + 'firebase-app.js'),
        import(/* @vite-ignore */ base + 'firebase-auth.js'),
        import(/* @vite-ignore */ base + 'firebase-firestore.js')
      ]);
      const fb: Fb = { ...appM, ...authM, ...fsM };
      const app = fb.initializeApp(FIREBASE_CONFIG);
      const auth = fb.getAuth(app);
      const db = fb.getFirestore(app);
      const metaRef = (uid: string) => fb.doc(db, 'users', uid, 'chunks', META_ID);
      const chunkRef = (uid: string, i: number) => fb.doc(db, 'users', uid, 'chunks', chunkId(i));

      const backend: Backend = {
        async getMeta(uid) { const s = await fb.getDoc(metaRef(uid)); return s.exists() ? (s.data() as CloudMeta) : null; },
        async readAll(uid) {
          for (let attempt = 0; attempt < 3; attempt++) {
            const meta = await backend.getMeta(uid);
            if (!meta) return null;
            const snaps: Fb[] = await Promise.all(Array.from({ length: meta.chunks }, (_, i) => fb.getDoc(chunkRef(uid, i))));
            const parts = snaps.map(s => (s.exists() ? s.data() : null));
            if (parts.every(p => p && p.pv === meta.updatedAt)) return { meta, text: parts.map(p => p.pt as string).join('') };
            await new Promise(r => setTimeout(r, 600)); // data sedang ditulis perangkat lain, coba lagi
          }
          throw new Error('Data cloud belum konsisten, coba lagi sebentar.');
        },
        async write(uid, baseUpdatedAt, meta, chunks) {
          return fb.runTransaction(db, async (tx: Fb) => {
            const cur = await tx.get(metaRef(uid));
            if (cur.exists() && cur.data().updatedAt > baseUpdatedAt) return 'conflict';
            tx.set(metaRef(uid), meta);
            chunks.forEach((t, i) => tx.set(chunkRef(uid, i), { pi: i, pv: meta.updatedAt, pt: t }));
            const oldN: number = cur.exists() ? (cur.data().chunks ?? 0) : 0;
            for (let i = chunks.length; i < oldN; i++) tx.delete(chunkRef(uid, i));
            return 'ok';
          });
        },
        subscribe(uid, cb, onErr) {
          return fb.onSnapshot(metaRef(uid), (s: Fb) => cb(s.exists() ? (s.data() as CloudMeta) : null), onErr);
        }
      };

      const engine = createEngine({
        storage: localStorage, backend, applyState
      });
      engine.subscribe(s => setStatus({ ...s, configured: true }));
      impl.engine = engine; impl.fb = fb; impl.auth = auth; impl.db = db;
      setLocalChangedHandler(() => engine.localChanged());

      fb.onAuthStateChanged(auth, (user: { uid: string; email: string | null } | null) => {
        if (user) setHint(true);
        void engine.onUser(user ? { uid: user.uid, email: user.email ?? '' } : null);
      });
      window.addEventListener('online', () => { void engine.syncNow(); });
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void engine.syncNow(); });
    } catch (e) {
      impl.loadError = 'Tidak dapat memuat layanan online. Periksa koneksi lalu muat ulang.';
      setStatus({ ...status, configured: true, ready: true, state: 'offline', message: impl.loadError });
      booting = null; // boleh dicoba lagi
      void e;
    }
  })();
  return booting;
}

const need = (): Fb => {
  if (!impl.fb || !impl.auth) throw new Error(impl.loadError || 'Layanan online belum termuat. Periksa koneksi internet.');
  return impl.fb;
};
async function wrap<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); } catch (e) { throw new Error(friendlyError(e)); }
}

export const cloud = {
  signIn: (email: string, pw: string) => wrap(async () => { const fb = need(); await fb.signInWithEmailAndPassword(impl.auth, email.trim(), pw); }),
  signUp: (email: string, pw: string) => wrap(async () => { const fb = need(); await fb.createUserWithEmailAndPassword(impl.auth, email.trim(), pw); }),
  signOut: () => wrap(async () => { const fb = need(); setHint(false); await fb.signOut(impl.auth); }),
  resetPassword: (email: string) => wrap(async () => { const fb = need(); await fb.sendPasswordResetEmail(impl.auth, email.trim()); }),
  syncNow: () => impl.engine?.syncNow() ?? Promise.resolve(),
  resolveConflict: (c: 'cloud' | 'local') => impl.engine?.resolveConflict(c) ?? Promise.resolve(),
  /** Baca data Edge Journal dari cloud (hanya baca; tidak mengubah apa pun). */
  readEdge: (): Promise<ParseResult | null> => wrap(async () => {
    const fb = need();
    const user = impl.auth.currentUser as { uid: string } | null;
    if (!user) throw new Error('Belum masuk.');
    const m = await fb.getDoc(fb.doc(impl.db, 'users', user.uid));
    if (!m.exists()) return null;
    const meta = m.data() as { updatedAt: number; chunks: number };
    const snaps: Fb[] = await Promise.all(Array.from({ length: meta.chunks }, (_, i) => fb.getDoc(fb.doc(impl.db, 'users', user.uid, 'chunks', 'c' + String(i).padStart(4, '0')))));
    const parts = snaps.map(s => (s.exists() ? s.data() : null));
    if (!parts.every(p => p && p.v === meta.updatedAt)) throw new Error('Data Edge Journal di cloud belum konsisten, coba lagi.');
    return parseBackup(JSON.parse(parts.map(p => p.t as string).join('')));
  })
};

