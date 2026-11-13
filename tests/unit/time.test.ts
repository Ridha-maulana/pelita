import { describe, it, expect } from 'vitest';
import { toWibIso, wibParts, sessionOf, sessionOfHour, sessionOf3, tradingDayKey, toMs, weekStartKey, holdMinutes, toInputValue } from '../../src/domain/time';

describe('waktu WIB', () => {
  it('ISO tanpa offset dianggap WIB', () => {
    expect(toWibIso('2026-10-20T09:20')).toBe('2026-10-20T09:20:00+07:00');
  });
  it('UTC dikonversi ke WIB dan melewati tengah malam', () => {
    expect(toWibIso('2026-10-20T20:30:00Z')).toBe('2026-10-21T03:30:00+07:00');
    expect(wibParts('2026-10-20T20:30:00Z').dayKey).toBe('2026-10-21');
  });
  it('offset lain dihormati', () => {
    expect(toMs('2026-10-20T09:20:00+07:00')).toBe(toMs('2026-10-20T02:20:00Z'));
  });
  it('toInputValue', () => {
    expect(toInputValue('2026-10-20T02:20:00Z')).toBe('2026-10-20T09:20');
  });
  it('sesi sesuai definisi baru (07-14, 14-20, 20-04, 04-07)', () => {
    const t: [number, string][] = [[7, 'Asia'], [13, 'Asia'], [14, 'London'], [19, 'London'], [20, 'New York'], [23, 'New York'], [0, 'New York'], [3, 'New York'], [4, 'Overlap'], [6, 'Overlap']];
    for (const [h, s] of t) expect(sessionOfHour(h)).toBe(s);
    for (let h = 0; h < 24; h++) expect(['Asia', 'London', 'New York', 'Overlap']).toContain(sessionOfHour(h));
  });
  it('sesi dari timestamp & 3 sesi', () => {
    expect(sessionOf('2026-10-20T05:00:00+07:00')).toBe('Overlap');
    expect(sessionOf3('2026-10-20T05:00:00+07:00')).toBe('New York');
    expect(sessionOf3('2026-10-20T15:00:00+07:00')).toBe('London');
  });
  it('hari trading mulai 07:00 WIB', () => {
    expect(tradingDayKey('2026-10-20T06:59:00+07:00')).toBe('2026-10-19');
    expect(tradingDayKey('2026-10-20T07:00:00+07:00')).toBe('2026-10-20');
  });
  it('awal minggu = Senin', () => {
    expect(weekStartKey('2026-11-14')).toBe('2026-11-09'); // Sabtu
    expect(weekStartKey('2026-11-09')).toBe('2026-11-09');
    expect(weekStartKey('2026-11-15')).toBe('2026-11-09'); // Minggu
  });
  it('lama tahan', () => {
    expect(holdMinutes('2026-10-20T09:00:00+07:00', '2026-10-20T10:30:00+07:00')).toBe(90);
    expect(holdMinutes('2026-10-20T09:00:00+07:00', null)).toBeNull();
    expect(holdMinutes('2026-10-20T10:00:00+07:00', '2026-10-20T09:00:00+07:00')).toBeNull();
  });
});
