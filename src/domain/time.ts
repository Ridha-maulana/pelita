/**
 * Satu-satunya tempat yang boleh menghitung tanggal/jam trading.
 * Zona waktu tetap WIB (UTC+7, tanpa DST), dihitung dengan aritmetika murni
 * sehingga hasilnya sama di semua perangkat dan di tes.
 */
export const WIB_OFFSET_MIN = 7 * 60;
const MS_MIN = 60_000;

export type SessionName = 'Asia' | 'London' | 'New York' | 'Overlap';

export interface WibParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0=Min .. 6=Sab
  /** 'YYYY-MM-DD' kalender WIB */
  dayKey: string;
  /** 'YYYY-MM' */
  monthKey: string;
}

const p2 = (n: number) => String(n).padStart(2, '0');

/** Terima ISO dengan offset, ISO tanpa offset (dianggap WIB), Date, atau epoch ms. */
export function toMs(v: string | number | Date): number {
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return v;
  const s = v.trim();
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) {
    const ms = Date.parse(s);
    if (!Number.isNaN(ms)) return ms;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(s);
  if (!m) return Number.NaN;
  const [, y, mo, d, h = '0', mi = '0', se = '0'] = m;
  return Date.UTC(+y!, +mo! - 1, +d!, +h, +mi, +se) - WIB_OFFSET_MIN * MS_MIN;
}

export function wibParts(v: string | number | Date): WibParts {
  const shifted = new Date(toMs(v) + WIB_OFFSET_MIN * MS_MIN);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  return {
    year, month, day,
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
    dayKey: `${year}-${p2(month)}-${p2(day)}`,
    monthKey: `${year}-${p2(month)}`
  };
}

/** ISO dengan offset WIB, detik dipotong: 2026-10-20T09:20:00+07:00 */
export function toWibIso(v: string | number | Date): string {
  const w = wibParts(v);
  return `${w.dayKey}T${p2(w.hour)}:${p2(w.minute)}:00+07:00`;
}

export const nowWibIso = (now: number = Date.now()) => toWibIso(now);

/** Nilai untuk <input type="datetime-local">: 'YYYY-MM-DDTHH:mm' waktu WIB */
export function toInputValue(v: string | number | Date): string {
  const w = wibParts(v);
  return `${w.dayKey}T${p2(w.hour)}:${p2(w.minute)}`;
}

export const fromInputValue = (s: string): string => toWibIso(s);

export const dayKeyOf = (v: string | number | Date) => wibParts(v).dayKey;
export const monthKeyOf = (v: string | number | Date) => wibParts(v).monthKey;

/** Hari trading dimulai 07:00 WIB: 06:59 masih milik hari sebelumnya. */
export function tradingDayKey(v: string | number | Date): string {
  return wibParts(toMs(v) - 7 * 60 * MS_MIN).dayKey;
}

export interface SessionDef {
  name: SessionName;
  label: string;
  hours: string;
  test: (h: number) => boolean;
}

/** Sesi menurut jam entry WIB (definisi tunggal untuk seluruh aplikasi). */
export const SESSIONS: readonly SessionDef[] = [
  { name: 'Asia', label: 'Asia', hours: '07:00–14:00', test: h => h >= 7 && h < 14 },
  { name: 'London', label: 'London', hours: '14:00–20:00', test: h => h >= 14 && h < 20 },
  { name: 'New York', label: 'New York', hours: '20:00–04:00', test: h => h >= 20 || h < 4 },
  { name: 'Overlap', label: 'Overlap', hours: '04:00–07:00', test: h => h >= 4 && h < 7 }
];

export function sessionOfHour(hour: number): SessionName {
  return (SESSIONS.find(s => s.test(hour)) ?? SESSIONS[3]!).name;
}

export const sessionOf = (v: string | number | Date): SessionName => sessionOfHour(wibParts(v).hour);

/** Grafik ringkas memakai 3 sesi; Overlap digabung ke New York. */
export function sessionOf3(v: string | number | Date): Exclude<SessionName, 'Overlap'> {
  const s = sessionOf(v);
  return s === 'Overlap' ? 'New York' : s;
}

/** Awal minggu (Senin) 'YYYY-MM-DD' untuk sebuah dayKey. */
export function weekStartKey(dayKey: string): string {
  const ms = Date.UTC(+dayKey.slice(0, 4), +dayKey.slice(5, 7) - 1, +dayKey.slice(8, 10));
  const wd = (new Date(ms).getUTCDay() + 6) % 7;
  const d = new Date(ms - wd * 86_400_000);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
}

export const addDaysKey = (dayKey: string, n: number): string => {
  const ms = Date.UTC(+dayKey.slice(0, 4), +dayKey.slice(5, 7) - 1, +dayKey.slice(8, 10)) + n * 86_400_000;
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
};

export const daysInMonth = (year: number, month1: number) => new Date(Date.UTC(year, month1, 0)).getUTCDate();
/** 0=Senin .. 6=Minggu untuk tanggal 1 bulan itu (kalender mulai Senin). */
export const mondayOffset = (year: number, month1: number) => (new Date(Date.UTC(year, month1 - 1, 1)).getUTCDay() + 6) % 7;

export function holdMinutes(openedAt: string, closedAt: string | null): number | null {
  if (!closedAt) return null;
  const d = (toMs(closedAt) - toMs(openedAt)) / MS_MIN;
  return Number.isFinite(d) && d >= 0 ? d : null;
}
