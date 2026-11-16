// Mesin sinkronisasi Pelita (tidak bergantung pada Firebase, mudah diuji).
// Data tetap disimpan lokal; bila masuk akun, perubahan dikirim ke cloud dan perubahan dari perangkat lain diterima.

export const STORE_KEY = 'pelita-v1';
export const META_KEY = 'pelita-sync-meta';
export const SAFE_KEY = 'pelita-pre-sync-backup';
export const CHUNK = 200000; // karakter per dokumen (batas Firestore 1 MiB per dokumen)

export type SyncState = 'off' | 'signedout' | 'syncing' | 'synced' | 'dirty' | 'offline' | 'conflict' | 'error';
export interface SyncStatus {
  configured: boolean;
  ready: boolean;
  user: { uid: string; email: string } | null;
  state: SyncState;
  lastSyncAt: number;
  message: string;
}
export interface CloudMeta { updatedAt: number; device: string; chunks: number; size: number }
export interface Backend {
  getMeta(uid: string): Promise<CloudMeta | null>;
  readAll(uid: string): Promise<{ meta: CloudMeta; text: string } | null>;
  write(uid: string, baseUpdatedAt: number, meta: CloudMeta, chunks: string[]): Promise<'ok' | 'conflict'>;
  subscribe(uid: string, cb: (m: CloudMeta | null) => void, onErr: (e: unknown) => void): () => void;
}
export interface StorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void }
interface Meta { uid?: string; lastSyncAt?: number; dirty?: boolean; localRev?: number; deviceId?: string }

export function splitText(text: string, size = CHUNK): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + size, text.length);
    if (end < text.length) { // jangan memotong pasangan surrogate (emoji)
      const c = text.charCodeAt(end - 1);
      if (c >= 0xd800 && c <= 0xdbff) end--;
    }
    out.push(text.slice(i, end));
    i = end;
  }
  return out.length ? out : [''];
}

export function friendlyError(e: unknown): string {
  const x = e as { code?: string; message?: string } | null;
  const code = x?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-email': 'Format email tidak valid.',
    'auth/missing-password': 'Password belum diisi.',
    'auth/weak-password': 'Password terlalu lemah (minimal 6 karakter).',
    'auth/email-already-in-use': 'Email ini sudah terdaftar. Silakan pilih Masuk.',
    'auth/user-not-found': 'Akun tidak ditemukan.',
    'auth/wrong-password': 'Email atau password salah.',
    'auth/invalid-credential': 'Email atau password salah.',
    'auth/invalid-login-credentials': 'Email atau password salah.',
    'auth/too-many-requests': 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.',
    'auth/network-request-failed': 'Tidak ada koneksi internet.',
    'auth/operation-not-allowed': 'Login Email/Password belum diaktifkan di Firebase (atau pendaftaran baru dimatikan).',
    'auth/user-disabled': 'Akun ini dinonaktifkan.',
    'permission-denied': 'Akses ditolak. Periksa Rules Firestore.',
    unavailable: 'Tidak ada koneksi ke server.'
  };
  if (map[code]) return map[code]!;
  if (code.startsWith('auth/') || code.startsWith('firestore/')) return 'Gagal: ' + code;
  return x?.message || 'Terjadi kesalahan.';
}

function isNetworkError(e: unknown): boolean {
  const x = e as { code?: string; message?: string } | null;
  const code = x?.code ?? '';
  return code === 'auth/network-request-failed' || code === 'unavailable' || code === 'deadline-exceeded' || code === 'failed-precondition' ||
    (typeof navigator !== 'undefined' && navigator.onLine === false) || /network|offline|Failed to fetch|Load failed/i.test(x?.message ?? '');
}

export interface EngineDeps {
  storage: StorageLike;
  backend: Backend;
  /** Terapkan teks data dari cloud ke aplikasi; false bila tidak bisa dibaca. */
  applyState: (text: string) => boolean;
  now?: () => number;
  setTimeout?: (f: () => void, ms: number) => unknown;
  clearTimeout?: (id: unknown) => void;
  deviceId?: string;
}

export function createEngine(deps: EngineDeps) {
  const { storage, backend, applyState } = deps;
  const now = deps.now ?? (() => Date.now());
  const later = deps.setTimeout ?? ((f, ms) => setTimeout(f, ms));
  const cancel = deps.clearTimeout ?? (id => clearTimeout(id as ReturnType<typeof setTimeout>));
  let deviceId = deps.deviceId ?? null;

  let status: SyncStatus = { configured: true, ready: false, user: null, state: 'signedout', lastSyncAt: 0, message: '' };
  const subs = new Set<(s: SyncStatus) => void>();
  let uid: string | null = null;
  let unsub: (() => void) | null = null;
  let timer: unknown = null;
  let retryTimer: unknown = null;
  let pushing = false;
  let queued = false;
  let sessionToken = 0;

  const emit = () => subs.forEach(f => { try { f({ ...status }); } catch { /* abaikan */ } });
  const set = (patch: Partial<SyncStatus>) => { status = { ...status, ...patch }; emit(); };
  const loadMeta = (): Meta => { try { return (JSON.parse(storage.getItem(META_KEY) ?? 'null') as Meta | null) ?? {}; } catch { return {}; } };
  const saveMeta = (m: Meta) => { try { storage.setItem(META_KEY, JSON.stringify(m)); } catch { /* penuh? abaikan */ } };
  const hasLocal = () => storage.getItem(STORE_KEY) !== null;

  function ensureDeviceId(): string {
    const m = loadMeta();
    if (!deviceId) deviceId = m.deviceId || 'd' + Math.random().toString(36).slice(2, 10) + now().toString(36);
    if (m.deviceId !== deviceId) { m.deviceId = deviceId; saveMeta(m); }
    return deviceId;
  }
  function setSynced(m?: Meta, message?: string) {
    set({ state: 'synced', lastSyncAt: (m ?? loadMeta()).lastSyncAt ?? 0, message: message ?? '' });
  }
  function setConflict() {
    cancel(timer); cancel(retryTimer);
    set({ state: 'conflict', message: 'Data di cloud dan di perangkat ini sama-sama berubah. Pilih data yang dipakai.' });
  }
  function fail(e: unknown) {
    if (isNetworkError(e)) { set({ state: 'offline', message: 'Menunggu koneksi internet…' }); scheduleRetry(15000); }
    else { set({ state: 'error', message: friendlyError(e) }); scheduleRetry(60000); }
  }
  function scheduleRetry(ms: number) {
    cancel(retryTimer);
    const token = sessionToken;
    retryTimer = later(() => { if (token === sessionToken && uid && status.state !== 'conflict') void reconcile(); }, ms);
  }

  async function onUser(user: { uid: string; email: string } | null) {
    sessionToken++;
    if (unsub) { try { unsub(); } catch { /* */ } unsub = null; }
    cancel(timer); cancel(retryTimer);
    if (!user) { uid = null; set({ ready: true, user: null, state: 'signedout', message: '' }); return; }
    ensureDeviceId();
    uid = user.uid;
    set({ ready: true, user: { uid: user.uid, email: user.email || '' }, state: 'syncing', message: '' });
    let m = loadMeta();
    if (m.uid !== uid) { // perangkat ini belum pernah disinkronkan dengan akun ini
      m = { uid, lastSyncAt: 0, dirty: hasLocal(), localRev: m.localRev ?? 0, deviceId: deviceId ?? undefined };
      saveMeta(m);
    }
    await reconcile();
    if (uid === user.uid) startSub();
  }

  async function reconcile(): Promise<void> {
    if (!uid) return;
    const token = sessionToken;
    try {
      const cloud = await backend.getMeta(uid);
      if (token !== sessionToken) return;
      const m = loadMeta();
      if (!cloud) {
        if (hasLocal()) { m.dirty = true; saveMeta(m); return await push(); }
        return setSynced(m);
      }
      if (cloud.updatedAt === (m.lastSyncAt ?? 0)) return m.dirty ? await push() : setSynced(m);
      if (cloud.updatedAt < (m.lastSyncAt ?? 0) && hasLocal()) { // cloud pernah direset: kirim ulang data lokal
        m.lastSyncAt = cloud.updatedAt; m.dirty = true; saveMeta(m);
        return await push();
      }
      if (!hasLocal() || !m.dirty) return await pull();
      return setConflict();
    } catch (e) { fail(e); }
  }

  async function pull(): Promise<void> {
    const token = sessionToken;
    if (!uid) return;
    set({ state: 'syncing', message: '' });
    const r = await backend.readAll(uid);
    if (token !== sessionToken) return;
    if (!r) { setSynced(loadMeta()); return; }
    const current = storage.getItem(STORE_KEY);
    if (current !== null) { try { storage.setItem(SAFE_KEY, current); } catch { /* abaikan */ } }
    if (!applyState(r.text)) { set({ state: 'error', message: 'Data di cloud tidak dapat dibaca.' }); return; }
    const m = loadMeta();
    m.uid = uid; m.lastSyncAt = r.meta.updatedAt; m.dirty = false; saveMeta(m);
    setSynced(m, 'Data terbaru dimuat dari cloud.');
  }

  async function push(): Promise<void> {
    if (!uid) return;
    if (pushing) { queued = true; return; }
    pushing = true;
    const token = sessionToken;
    try {
      set({ state: 'syncing', message: '' });
      const text = storage.getItem(STORE_KEY);
      if (text === null) { setSynced(loadMeta()); return; }
      const m = loadMeta();
      const revAtStart = m.localRev ?? 0;
      const base = m.lastSyncAt ?? 0;
      const updatedAt = Math.max(now(), base + 1);
      const chunks = splitText(text);
      const res = await backend.write(uid, base, { updatedAt, device: deviceId ?? '', chunks: chunks.length, size: text.length }, chunks);
      if (token !== sessionToken) return;
      if (res === 'conflict') { setConflict(); return; }
      const m2 = loadMeta();
      m2.uid = uid; m2.lastSyncAt = updatedAt;
      m2.dirty = (m2.localRev ?? 0) !== revAtStart;
      saveMeta(m2);
      if (m2.dirty) { set({ state: 'dirty', lastSyncAt: updatedAt, message: '' }); queued = true; }
      else setSynced(m2);
    } catch (e) { fail(e); }
    finally {
      pushing = false;
      if (queued && uid && status.state !== 'conflict') { queued = false; later(() => { void push(); }, 400); } else queued = false;
    }
  }

  function localChanged() {
    if (!uid || status.state === 'conflict') return;
    set({ state: 'dirty', message: '' });
    cancel(timer);
    timer = later(() => { void push(); }, 2000);
  }

  function startSub() {
    if (!uid || unsub) return;
    const token = sessionToken;
    unsub = backend.subscribe(uid, meta => {
      if (token !== sessionToken || !meta) return;
      const m = loadMeta();
      if (meta.device === deviceId) return; // perubahan dari perangkat ini sendiri
      if (meta.updatedAt <= (m.lastSyncAt ?? 0)) return;
      if (pushing || status.state === 'conflict') return;
      if (m.dirty) { setConflict(); return; }
      pull().catch(fail);
    }, e => fail(e));
  }

  async function resolveConflict(choice: 'cloud' | 'local'): Promise<void> {
    if (!uid) return;
    try {
      if (choice === 'cloud') { await pull(); }
      else {
        const cloud = await backend.getMeta(uid);
        const m = loadMeta();
        m.lastSyncAt = cloud ? cloud.updatedAt : 0; m.dirty = true; saveMeta(m);
        await push();
      }
    } catch (e) { fail(e); }
  }

  return {
    subscribe(fn: (s: SyncStatus) => void) { subs.add(fn); try { fn({ ...status }); } catch { /* */ } return () => { subs.delete(fn); }; },
    getStatus: (): SyncStatus => ({ ...status }),
    onUser, reconcile, localChanged, resolveConflict,
    syncNow: () => reconcile(),
    _debug: () => ({ uid, pushing, meta: loadMeta() })
  };
}

/** Tandai perubahan lokal (dipanggil store setiap kali data disimpan karena ulah pengguna). */
export function markLocalChanged(storage: StorageLike, notify: () => void) {
  try {
    const m = (JSON.parse(storage.getItem(META_KEY) ?? 'null') as Meta | null) ?? {};
    m.dirty = true; m.localRev = (m.localRev ?? 0) + 1;
    storage.setItem(META_KEY, JSON.stringify(m));
  } catch { /* abaikan */ }
  try { notify(); } catch { /* abaikan */ }
}
