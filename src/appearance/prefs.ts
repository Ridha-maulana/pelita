import { FX_DEFAULT, FX_KEYS, type Appearance, type Fx, type Mode } from './engine';
import { DEFAULT_CUSTOM } from './theme';
import { validHex } from './color';
import { FONTS } from './fonts.data';
import { THEMES } from './themes.data';

export type Settings = Appearance;
export const DEFAULT_SETTINGS: Settings = { mode: 'auto', theme: 'pelita', font: 'inter', sfc: 0, custom: DEFAULT_CUSTOM, fx: FX_DEFAULT };

export function parseSettings(raw: unknown): Settings {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const mode: Mode = p.mode === 'light' || p.mode === 'dark' ? p.mode : 'auto';
  const theme = typeof p.theme === 'string' && THEMES.some(t => t.id === p.theme) ? p.theme : 'pelita';
  const font = typeof p.font === 'string' && FONTS.some(f => f.id === p.font) ? p.font : 'inter';
  const sfc = typeof p.sfc === 'number' && Number.isInteger(p.sfc) && p.sfc >= 0 && p.sfc <= 25 ? p.sfc : 0;
  const c = (p.custom && typeof p.custom === 'object' ? p.custom : {}) as Record<string, unknown>;
  const custom = {
    on: c.on === true,
    bg: typeof c.bg === 'string' && validHex(c.bg) ? c.bg : DEFAULT_CUSTOM.bg,
    ac: typeof c.ac === 'string' && validHex(c.ac) ? c.ac : DEFAULT_CUSTOM.ac
  };
  const f = (p.fx && typeof p.fx === 'object' ? p.fx : {}) as Record<string, unknown>;
  const fx = { ...FX_DEFAULT } as Fx;
  for (const k of FX_KEYS) if (typeof f[k] === 'boolean') fx[k] = f[k] as boolean;
  return { mode, theme, font, sfc, custom, fx };
}

