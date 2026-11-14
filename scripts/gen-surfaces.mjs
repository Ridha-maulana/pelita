// Pembuat src/styles/surfaces.css (25 efek permukaan). Jalankan: node scripts/gen-surfaces.mjs
// Dasar rancangan: efek permukaan Edge Journal milik pengguna; selektor ditulis ulang untuk Pelita.
import { writeFileSync } from 'node:fs';

const svg = s => 'url("data:image/svg+xml;utf8,' + encodeURIComponent(s).replace(/%20/g, ' ').replace(/%3D/g, '=').replace(/%27/g, "'").replace(/%2C/g, ',').replace(/%3A/g, ':').replace(/%2F/g, '/') + '")';
const noise = (freq, alpha, oct = 2, rgb = '1 1 1', w = 140) => {
  const [r, g, b] = rgb.split(' ');
  return svg(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${w}'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${oct}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 ${alpha} 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`);
};
const NW = noise(0.9, 0.05), NK = noise(0.9, 0.05, 2, '0 0 0'), NW9 = noise(0.9, 0.07), NK9 = noise(0.9, 0.06, 2, '0 0 0');

const h2 = c => { c = c.replace('#', ''); return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)); };
const x2 = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = h2(a), B = h2(b); return x2(A.map((v, i) => v * (1 - t) + B[i] * t)); };
const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; const [r, g, b] = h2(c); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const cr = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
const POS = ['#07804d', '#0a6b42', '#2ee6a0', '#7dffc4', '#c8ffe3', '#04442a'], NEG = ['#cf1f3a', '#a3122b', '#ff6b81', '#ffa0ae', '#ffd0d6', '#5c0715'];
const pick = (cands, bg, def, need = 4) => {
  const ok = [...cands, def].filter(c => cr(c, bg) >= need);
  if (ok.includes(def)) return def;
  return ok.length ? ok.reduce((a, b) => (cr(a, bg) <= cr(b, bg) ? a : b)) : cands.reduce((a, b) => (cr(a, bg) >= cr(b, bg) ? a : b));
};
const tone = (c, fam) => {
  const ink = fam === 'l' ? '#000000' : '#ffffff';
  const [dp, dn] = fam === 'l' ? ['#07804d', '#cf1f3a'] : ['#2ee6a0', '#ff6b81'];
  return { sf: c, mu: mix(c, ink, fam === 'l' ? 0.8 : 0.86), mu2: mix(c, ink, fam === 'l' ? 0.62 : 0.68), ln: mix(c, ink, 0.22), pos: pick(POS, c, dp), neg: pick(NEG, c, dn), ink: fam === 'l' ? '#17181b' : '#f5f6f8' };
};
const flat = (c, shadow = '0 1px 2px #00000040,0 8px 20px #00000045') => {
  const fam = lum(c) > 0.3 ? 'l' : 'd';
  return { fam, css: `background:${c};border:1px solid ${fam === 'l' ? '#00000012' : '#ffffff14'};box-shadow:${shadow};`, ex: tone(c, fam) };
};
const doff = c => {
  const fam = lum(c) > 0.3 ? 'l' : 'd';
  const lo = mix(c, '#ffffff', 0.045), hi = mix(c, '#000000', 0.06);
  const n = fam === 'l' ? NK : NW;
  const edge = fam === 'l' ? '#00000014' : '#ffffff12', top = fam === 'l' ? '#ffffffb0' : '#ffffff16';
  return { fam, css: `background:${n},linear-gradient(160deg,${lo},${hi});border:1px solid ${edge};box-shadow:0 1px 2px #00000040,0 10px 22px #0000005c,inset 0 1px 0 ${top},inset 0 -2px 0 #0000001a;`, ex: tone(c, fam) };
};

// id -> {fam, dark css, light css (opsional), ex}
const S = {};
const add = (k, fam, css, cssL, ex) => { S[k] = { fam, css, cssL, ex }; };
{ const f = flat('#fafafa'); add(1, f.fam, f.css, null, f.ex); }
{ const f = flat('#1c1c1e'); add(2, f.fam, f.css, null, f.ex); }
{ const f = flat('#adb1b9'); add(3, f.fam, f.css, null, f.ex); }
add(4, 'a', 'background-image:linear-gradient(135deg,#ffffff16,#ffffff05);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid #ffffff30;box-shadow:0 6px 18px #00000040,inset 0 1px 0 #ffffff26;',
  'background:#ffffff70;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid #ffffffd0;box-shadow:0 6px 18px #00000018,inset 0 1px 0 #ffffffe0;');
add(5, 'd', 'background:linear-gradient(135deg,#8b909a8c,#6d727b8c);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid #ffffff30;box-shadow:0 8px 22px #00000055,inset 0 1px 0 #ffffff30;',
  'background:linear-gradient(135deg,#5d626bec,#464b54ec);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid #ffffff30;box-shadow:0 8px 22px #00000040,inset 0 1px 0 #ffffff30;', tone('#6d727b', 'd'));
add(6, 'a', 'background-image:linear-gradient(#2f6fe414,#2f6fe414);border:1px solid #2f6fe4;box-shadow:inset 0 0 0 1px #2f6fe4,0 0 0 3px #2f6fe41f,0 8px 20px #00000045;',
  'background-image:linear-gradient(#2f6fe410,#2f6fe410);border:1px solid #2f6fe4;box-shadow:inset 0 0 0 1px #2f6fe4,0 0 0 3px #2f6fe422,0 8px 20px #0000001a;');
add(7, 'a', 'box-shadow:0 1px 3px #0000004a,0 8px 22px #00000050;', 'box-shadow:0 1px 3px #00000014,0 8px 22px #00000020;');
add(8, 'a', 'box-shadow:0 6px 12px #000000a0,0 24px 44px #000000c4;', 'box-shadow:0 6px 12px #00000030,0 22px 42px #00000048;');
add(9, 'a', `background:${NW9},#ffffff10;backdrop-filter:blur(24px) saturate(1.25);-webkit-backdrop-filter:blur(24px) saturate(1.25);border:1px solid #ffffff26;box-shadow:0 8px 24px #00000050,inset 0 1px 0 #ffffff2a;`,
  `background:${NK9},#ffffff88;backdrop-filter:blur(24px) saturate(1.25);-webkit-backdrop-filter:blur(24px) saturate(1.25);border:1px solid #ffffffe0;box-shadow:0 8px 24px #0000001c,inset 0 1px 0 #fff;`);
add(10, 'a', 'background-image:linear-gradient(#ffffff04,#ffffff04);border:1px solid #ffffff44;box-shadow:none;', 'background-image:none;border:1px solid #00000033;box-shadow:none;');
const DOFF = [['#1d1e21'], ['#efeeea'], ['#a4a7ae'], ['#46494e'], ['#2b3d5e'], ['#5878a0'], ['#94ab95'], ['#2e4a3c'], ['#62694a'], ['#ecdcc3'], ['#b4664a'], ['#5c2a35'], ['#cf9b9b'], ['#583d58'], ['#624a3e']];
DOFF.forEach(([c], i) => { const d = doff(c); add(11 + i, d.fam, d.css, null, d.ex); });

const CARDS = '.card';
const NAV = '.nav';
const CTRL = '.btn:not(.primary),.icon-btn,.chip:not([aria-pressed="true"]),.input,.tag';
const grp = [['k', CARDS], ['b', CTRL], ['n', NAV]];

const out = ['/* DIHASILKAN oleh scripts/gen-surfaces.mjs — jangan edit tangan.',
  '   html[data-sfc=N] (1..25; 0 = standar). data-sfcf: d/l = palet teks dipaksa, a = ikut mode. data-eff = mode terpakai (light/dark).',
  '   Efek aktif per kelompok lewat data-fxk (kartu), data-fxb (tombol), data-fxn (menu bawah). */',
  '@layer surface {'];
const sel = (k, mode, g, sl) => `html[data-sfc="${k}"][data-fx${g}="1"]${mode ? `[data-eff="${mode}"]` : ''} :is(${sl})`;
const vars = e => `--text:${e.ink};--muted:${e.mu};--line:${e.ln};--pos:${e.pos};--neg:${e.neg};--surface-2:${mix(e.sf, e.fam === 'l' ? '#000000' : '#ffffff', 0.07)};color:${e.ink};`;
for (const [k, s] of Object.entries(S)) {
  const e = s.ex ? { ...s.ex, fam: s.fam } : null;
  out.push(`/* ${k} (${s.fam}) */`);
  for (const [g, sl] of grp) {
    if (s.cssL) {
      out.push(`${sel(k, 'dark', g, sl)}{${s.css}${e ? vars(e) : ''}}`);
      out.push(`${sel(k, 'light', g, sl)}{${s.cssL}${e ? vars(e) : ''}}`);
    } else out.push(`${sel(k, '', g, sl)}{${s.css}${e ? vars(e) : ''}}`);
  }
}
out.push('}');
writeFileSync(new URL('../src/styles/surfaces.css', import.meta.url), out.join('\n') + '\n');
console.log('ok', Object.keys(S).length, out.join('\n').length);
