// Jalankan tes unit tanpa vitest: bundel dengan esbuild (alias vitest -> shim) lalu node --test.
import { build } from '/opt/npm-tools/node_modules/esbuild/lib/main.js';
import { readdirSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const out = resolve(root, '.localtest');
mkdirSync(out, { recursive: true });
const files = readdirSync(resolve(root, 'tests/unit')).filter(f => f.endsWith('.test.ts')).map(f => resolve(root, 'tests/unit', f));
await build({
  entryPoints: files, outdir: out, bundle: true, platform: 'node', format: 'esm', outExtension: { '.js': '.mjs' },
  alias: { vitest: resolve(root, 'scripts/vitest-shim.ts') }, logLevel: 'error'
});
const r = spawnSync('node', ['--test', ...files.map(f => resolve(out, f.split('/').pop().replace('.ts', '.mjs')))], { stdio: 'inherit' });
process.exit(r.status ?? 1);
