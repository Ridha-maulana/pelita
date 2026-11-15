import { FX_DEFAULT, FX_KEYS, HEADER_STYLES, HOME_LIST, NAV_STYLES, type Appearance, type Fx, type Mode } from './engine';
import { DEFAULT_CUSTOM } from './theme';
import { validHex } from './color';
import { FONTS } from './fonts.data';
import { THEMES } from './themes.data';
import { BGD_MAX, wpByKey } from './wallpaper';

export type Settings = Appearance;
/** Bawaan = tampilan Edge Journal: X terang, Open Sans, putih solid, Template 5, header Organik hijau, latar Organik hijau. */
export const DEFAULT_SETTINGS: Settings = { mode: 'light', theme: 'x', font: 'opensans', sfc: 1, custom: DEFAULT_CUSTOM, fx: FX_DEFAULT, nav: 0, hdr: 12, home: 5, bg: 'pola:Organik hijau', bgd: 20 };

export function parseSettings(raw: unknown): Settings {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const mode: Mode = p.mode === 'light' || p.mode === 'dark' ? p.mode : p.mode === 'auto' ? 'auto' : DEFAULT_SETTINGS.mode;
  const theme = typeof p.theme === 'string' && THEMES.some(t => t.id === p.theme) ? p.theme : DEFAULT_SETTINGS.theme;
  const font = typeof p.font === 'string' && FONTS.some(f => f.id === p.font) ? p.font : DEFAULT_SETTINGS.font;
  const sfc = typeof p.sfc === 'number' && Number.isInteger(p.sfc) && p.sfc >= 0 && p.sfc <= 25 ? p.sfc : DEFAULT_SETTINGS.sfc;
  const c = (p.custom && typeof p.custom === 'object' ? p.custom : {}) as Record<string, unknown>;
  const custom = {
    on: c.on === true,
    bg: typeof c.bg === 'string' && validHex(c.bg) ? c.bg : DEFAULT_CUSTOM.bg,
    ac: typeof c.ac === 'string' && validHex(c.ac) ? c.ac : DEFAULT_CUSTOM.ac
  };
  const f = (p.fx && typeof p.fx === 'object' ? p.fx : {}) as Record<string, unknown>;
  const fx = { ...FX_DEFAULT } as Fx;
  for (const k of FX_KEYS) if (typeof f[k] === 'boolean') fx[k] = f[k] as boolean;
  const nav = typeof p.nav === 'number' && NAV_STYLES.some(x => x[0] === p.nav) ? p.nav : DEFAULT_SETTINGS.nav;
  const hdr = typeof p.hdr === 'number' && HEADER_STYLES.some(x => x[0] === p.hdr) ? p.hdr : DEFAULT_SETTINGS.hdr;
  const home = typeof p.home === 'number' && HOME_LIST.some(x => x[0] === p.home) ? p.home : DEFAULT_SETTINGS.home;
  const bg = typeof p.bg === 'string' && wpByKey(p.bg) ? p.bg : DEFAULT_SETTINGS.bg;
  const bgd = typeof p.bgd === 'number' && Number.isFinite(p.bgd) ? Math.max(0, Math.min(BGD_MAX, Math.round(p.bgd))) : DEFAULT_SETTINGS.bgd;
  return { mode, theme, font, sfc, custom, fx, nav, hdr, home, bg, bgd };
}

