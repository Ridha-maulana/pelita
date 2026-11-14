import { describe, it, expect } from 'vitest';
import { THEMES } from '../../src/appearance/themes.data';
import { FONTS } from '../../src/appearance/fonts.data';
import { SURFACES } from '../../src/appearance/surfaces.data';
import { contrast, mix, readableOn, validHex } from '../../src/appearance/color';
import { deriveCustom, tokensFor } from '../../src/appearance/theme';
import { DEFAULT_SETTINGS, parseSettings } from '../../src/appearance/prefs';

describe('data tampilan', () => {
  it('jumlah sesuai aplikasi lama (78 tema + bawaan, 85 font, 25 permukaan)', () => {
    expect(THEMES).toHaveLength(79);
    expect(FONTS).toHaveLength(85);
    expect(SURFACES).toHaveLength(25);
  });
  it('id unik dan warna valid', () => {
    expect(new Set(THEMES.map(t => t.id)).size).toBe(THEMES.length);
    expect(new Set(FONTS.map(f => f.id)).size).toBe(FONTS.length);
    for (const t of THEMES) for (const side of [t.light, t.dark]) for (const c of Object.values(side)) expect(validHex(c)).toBeTruthy();
  });
});

describe('token tema', () => {
  it('teks terbaca di atas latar pada semua tema (kontras ≥ 4.5)', () => {
    const bad: string[] = [];
    for (const t of THEMES) for (const [side, dark] of [[t.light, false], [t.dark, true]] as const) {
      const k = tokensFor(side, dark);
      if (contrast(k['--text']!, k['--bg']!) < 4.5) bad.push(`${t.id}/${dark ? 'gelap' : 'terang'} teks`);
      if (contrast(k['--text']!, k['--surface']!) < 4.5) bad.push(`${t.id}/${dark ? 'gelap' : 'terang'} kartu`);
      if (contrast(k['--accent-ink']!, k['--accent']!) < 4.5) bad.push(`${t.id}/${dark ? 'gelap' : 'terang'} tombol`);
    }
    expect(bad).toEqual([]);
  });
  it('warna sendiri: latar gelap → ink terang, latar terang → ink gelap', () => {
    expect(contrast(deriveCustom({ on: true, bg: '#101418', ac: '#e8a33d' }).ink, '#101418')).toBeGreaterThan(7);
    expect(contrast(deriveCustom({ on: true, bg: '#f4f1ea', ac: '#c98515' }).ink, '#f4f1ea')).toBeGreaterThan(7);
  });
  it('hex rusak jatuh ke bawaan, tidak melempar', () => {
    expect(validHex(deriveCustom({ on: true, bg: 'zzz', ac: '#12' }).canvas)).toBeTruthy();
  });
  it('mix dan readableOn', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(readableOn('#ffffff')).toBe('#111111');
    expect(readableOn('#000000')).toBe('#ffffff');
  });
});

describe('pengaturan tersimpan', () => {
  it('kosong/rusak → bawaan', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('x')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ theme: 'tidak-ada', font: 9, sfc: 99, mode: 'x' })).toEqual(DEFAULT_SETTINGS);
  });
  it('nilai valid dipertahankan; fx parsial dilengkapi bawaan', () => {
    const s = parseSettings({ mode: 'dark', theme: 'mint', font: 'poppins', sfc: 12, fx: { nav: true, gerak: false } });
    expect(s.mode).toBe('dark'); expect(s.theme).toBe('mint'); expect(s.font).toBe('poppins'); expect(s.sfc).toBe(12);
    expect(s.fx.nav).toBe(true); expect(s.fx.gerak).toBe(false); expect(s.fx.kartu).toBe(true);
  });
  it('pengaturan lama {mode} tetap terbaca', () => {
    expect(parseSettings({ mode: 'light' }).mode).toBe('light');
  });
});

import { WP_LIST, wpAuto, wpDim, wpNeed, wpThumb } from '../../src/appearance/wallpaper';

describe('latar', () => {
  it('34 latar, 5 kategori, kunci unik', () => {
    expect(WP_LIST).toHaveLength(34);
    expect(new Set(WP_LIST.map(w => w.k)).size).toBe(34);
    expect(new Set(WP_LIST.map(w => w.cat))).toEqual(new Set(['dasar', 'doff', 'kaca', 'anime', 'pola']));
  });
  it('penjaga nada: latar terang di mode gelap diredupkan otomatis', () => {
    const terang = { tone: 'l', cat: 'dasar' }, gelap = { tone: 'd', cat: 'dasar' };
    expect(wpNeed(terang, true)).toBe(0.8); expect(wpNeed(terang, false)).toBe(0);
    expect(wpNeed(gelap, false)).toBe(0.8); expect(wpNeed(gelap, true)).toBe(0);
    expect(wpNeed({ tone: 'a', cat: 'dasar' }, true)).toBe(0);
    expect(wpNeed({ tone: 'l', cat: 'anime' }, false)).toBe(0.6);
  });
  it('redup = maksimum pilihan pengguna dan kebutuhan; penanda otomatis', () => {
    const w = WP_LIST.find(x => x.tone === 'l' && x.cat !== 'anime')!;
    expect(wpDim(w, 20, true)).toBe(0.8); expect(wpAuto(w, 20, true)).toBe(true);
    expect(wpDim(w, 80, true)).toBe(0.8); expect(wpAuto(w, 80, true)).toBe(false);
    expect(wpDim(w, 30, false)).toBe(0.3);
  });
  it('id SVG thumbnail dibuat unik per baris', () => {
    const w = WP_LIST[0]!;
    expect(w.thumb.includes('@')).toBe(true);
    expect(wpThumb(w, '3').includes('@')).toBe(false);
    expect(wpThumb(w, '3')).not.toBe(wpThumb(w, '4'));
  });
  it('pengaturan: nav/hdr/bg tidak valid jatuh ke bawaan; bgd dijepit', () => {
    const a = parseSettings({ nav: 9, hdr: 4, bg: 'x:y', bgd: 500 });
    expect([a.nav, a.hdr, a.bg, a.bgd]).toEqual([0, 0, '', 80]);
    const b = parseSettings({ nav: 3, hdr: 10, bg: WP_LIST[2]!.k, bgd: 35 });
    expect([b.nav, b.hdr, b.bg, b.bgd]).toEqual([3, 10, WP_LIST[2]!.k, 35]);
  });
});
