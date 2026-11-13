// Build lokal darurat (tanpa Vite) untuk uji visual: esbuild + React dari /opt/npm-tools. CI memakai `vite build`.
import { build } from '/opt/npm-tools/node_modules/esbuild/lib/main.js';
import { mkdirSync, cpSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const out = resolve(root, '.localdist');
mkdirSync(out, { recursive: true });
await build({
  entryPoints: [resolve(root, 'src/main.tsx')], outfile: resolve(out, 'app.js'), bundle: true, format: 'esm',
  jsx: 'automatic', nodePaths: ['/opt/npm-tools/node_modules'], loader: { '.svg': 'dataurl' }, logLevel: 'error',
  define: { 'import.meta.env.DEV': 'false' }
});
cpSync(resolve(root, 'public'), out, { recursive: true });
writeFileSync(resolve(out, 'index.html'), `<!doctype html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>Pelita</title><link rel="stylesheet" href="./app.css"></head><body><div id="root"></div><script type="module" src="./app.js"></script></body></html>`);
console.log('ok');
