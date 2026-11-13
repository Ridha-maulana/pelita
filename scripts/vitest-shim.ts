// Pengganti vitest MINIMAL untuk dijalankan lokal tanpa registry npm. CI memakai vitest asli.
import { describe as d, it as i } from 'node:test';
import assert from 'node:assert/strict';
export const describe = d;
export const it = i;
export const test = i;
const close = (a: number, b: number, digits = 2) => Math.abs(a - b) < Math.pow(10, -digits) / 2;
export function expect(actual: any) {
  const mk = (neg: boolean) => {
    const chk = (ok: boolean, msg: string) => { if (neg ? ok : !ok) assert.fail((neg ? 'NOT ' : '') + msg); };
    return {
      toBe: (e: any) => chk(Object.is(actual, e), `expected ${JSON.stringify(actual)} toBe ${JSON.stringify(e)}`),
      toEqual: (e: any) => { try { assert.deepStrictEqual(actual, e); chk(true, ''); } catch (err) { if (neg) return; throw err; } if (neg) assert.fail('expected not equal'); },
      toBeCloseTo: (e: number, dg = 2) => chk(close(actual, e, dg), `expected ${actual} close to ${e}`),
      toBeTruthy: () => chk(!!actual, `expected truthy, got ${actual}`),
      toBeFalsy: () => chk(!actual, `expected falsy, got ${actual}`),
      toBeNull: () => chk(actual === null, `expected null, got ${actual}`),
      toBeGreaterThan: (e: number) => chk(actual > e, `expected ${actual} > ${e}`),
      toBeLessThan: (e: number) => chk(actual < e, `expected ${actual} < ${e}`),
      toHaveLength: (n: number) => chk(actual.length === n, `expected length ${n}, got ${actual.length}`),
      toContain: (e: any) => chk(actual.includes(e), `expected ${JSON.stringify(actual)} to contain ${e}`),
      toThrow: () => { let t = false; try { actual(); } catch { t = true; } chk(t, 'expected throw'); }
    };
  };
  return { ...mk(false), not: mk(true) };
}
