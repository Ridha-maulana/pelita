import { describe, it, expect } from 'vitest';
import { createEngine, splitText, friendlyError, markLocalChanged, STORE_KEY, META_KEY, type Backend, type CloudMeta } from '../../src/cloud/engine';

function mkStorage(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => (m.has(k) ? m.get(k)! : null), setItem: (k: string, v: string) => { m.set(k, v); }, _m: m };
}
function mkCloud() {
  const c = { meta: null as CloudMeta | null, text: '', subs: [] as Array<(m: CloudMeta | null) => void> };
  const backend: Backend = {
    async getMeta() { return c.meta; },
    async readAll() { return c.meta ? { meta: c.meta, text: c.text } : null; },
    async write(_u, base, meta, chunks) {
      if (c.meta && c.meta.updatedAt > base) return 'conflict';
      c.meta = meta; c.text = chunks.join(''); c.subs.forEach(f => f(meta)); return 'ok';
    },
    subscribe(_u, cb) { c.subs.push(cb); return () => { c.subs = c.subs.filter(f => f !== cb); }; }
  };
  return { c, backend };
}
function mkTimers() {
  const q: Array<() => void> = [];
  return { setTimeout: (f: () => void) => { q.push(f); return q.length; }, clearTimeout: () => undefined, flush: async () => { while (q.length) { q.shift()!(); await new Promise(r => setTimeout(r, 0)); } } };
}
const flushP = () => new Promise(r => setTimeout(r, 5));

describe('splitText', () => {
  it('menyambung kembali tepat dan tidak memotong emoji', () => {
    const t = 'ab😀cd😀ef'.repeat(30);
    const parts = splitText(t, 7);
    expect(parts.join('')).toBe(t);
    for (const p of parts) expect(/[\ud800-\udbff]$/.test(p)).toBe(false);
  });
  it('teks kosong tetap satu bagian', () => { expect(splitText('')).toEqual(['']); });
});

describe('friendlyError', () => {
  it('menerjemahkan kode umum', () => {
    expect(friendlyError({ code: 'auth/invalid-credential' })).toBe('Email atau password salah.');
    expect(friendlyError({ code: 'auth/email-already-in-use' })).toContain('sudah terdaftar');
    expect(friendlyError({ code: 'auth/aneh' })).toBe('Gagal: auth/aneh');
  });
});

describe('mesin sinkron', () => {
  it('masuk pertama kali dengan data lokal dan cloud kosong → kirim', async () => {
    const st = mkStorage({ [STORE_KEY]: '{"a":1}' });
    const { c, backend } = mkCloud();
    const e = createEngine({ storage: st, backend, applyState: () => true, deviceId: 'dev1', now: () => 1000 });
    await e.onUser({ uid: 'u1', email: 'a@b.c' });
    expect(c.text).toBe('{"a":1}');
    expect(e.getStatus().state).toBe('synced');
  });

  it('masuk di perangkat kosong, cloud ada data → tarik', async () => {
    const st = mkStorage();
    const { c, backend } = mkCloud();
    c.meta = { updatedAt: 500, device: 'lain', chunks: 1, size: 7 }; c.text = '{"b":2}';
    let applied = '';
    const e = createEngine({ storage: st, backend, applyState: t => { applied = t; st.setItem(STORE_KEY, t); return true; }, deviceId: 'dev1' });
    await e.onUser({ uid: 'u1', email: 'a@b.c' });
    expect(applied).toBe('{"b":2}');
    expect(e.getStatus().state).toBe('synced');
    expect(JSON.parse(st.getItem(META_KEY)!).lastSyncAt).toBe(500);
  });

  it('kedua sisi punya data berbeda → konflik; pilih cloud menarik, pilih lokal mengirim', async () => {
    const mk = async () => {
      const st = mkStorage({ [STORE_KEY]: '{"lokal":1}' });
      const { c, backend } = mkCloud();
      c.meta = { updatedAt: 900, device: 'lain', chunks: 1, size: 9 }; c.text = '{"cloud":1}';
      let applied = '';
      const e = createEngine({ storage: st, backend, applyState: t => { applied = t; return true; }, deviceId: 'dev1', now: () => 2000 });
      await e.onUser({ uid: 'u1', email: 'a@b.c' });
      return { e, c, get applied() { return applied; } };
    };
    const a = await mk();
    expect(a.e.getStatus().state).toBe('conflict');
    await a.e.resolveConflict('cloud');
    expect(a.applied).toBe('{"cloud":1}');
    const b = await mk();
    await b.e.resolveConflict('local');
    expect(b.c.text).toBe('{"lokal":1}');
    expect(b.e.getStatus().state).toBe('synced');
  });

  it('perubahan lokal dikirim setelah jeda; perangkat lain menerima otomatis', async () => {
    const t = mkTimers();
    const st1 = mkStorage({ [STORE_KEY]: '{"v":1}' });
    const st2 = mkStorage();
    const { c, backend } = mkCloud();
    let now = 1000;
    const e1 = createEngine({ storage: st1, backend, applyState: () => true, deviceId: 'A', now: () => now++, setTimeout: t.setTimeout, clearTimeout: t.clearTimeout });
    await e1.onUser({ uid: 'u', email: 'x@y.z' });
    const e2 = createEngine({ storage: st2, backend, applyState: tx => { st2.setItem(STORE_KEY, tx); return true; }, deviceId: 'B', now: () => now++, setTimeout: t.setTimeout, clearTimeout: t.clearTimeout });
    await e2.onUser({ uid: 'u', email: 'x@y.z' });
    expect(st2.getItem(STORE_KEY)).toBe('{"v":1}');
    st1.setItem(STORE_KEY, '{"v":2}');
    markLocalChanged(st1, () => e1.localChanged());
    expect(e1.getStatus().state).toBe('dirty');
    await t.flush(); await flushP();
    expect(c.text).toBe('{"v":2}');
    await flushP();
    expect(st2.getItem(STORE_KEY)).toBe('{"v":2}');
    expect(e2.getStatus().state).toBe('synced');
  });

  it('keluar mengembalikan status signedout', async () => {
    const st = mkStorage();
    const { backend } = mkCloud();
    const e = createEngine({ storage: st, backend, applyState: () => true });
    await e.onUser({ uid: 'u', email: 'a@b.c' });
    await e.onUser(null);
    expect(e.getStatus().state).toBe('signedout');
    expect(e.getStatus().user).toBe(null);
  });
});
