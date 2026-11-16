import { describe, it, expect } from 'vitest';
import { parseMt5Text, mt5ToWib, mt5NormSymbol, buildPrefill } from '../../src/lib/mt5';

const sample = `
XAUUSDm, buy 0.02                      2026.10.27 08:15:01
4062.46 → 4068.12                                  11.32
#1234567890                  2026.10.27 07:40:10
S / L: 4055.00      Swap: 0.00
T / P: 4068.10      Komisi: -0.14
XAUUSD, sell 0.01                      2026.10.27 09:00:00
4070.50 → 4075.50                                  5.00
`;

describe('parser teks MT5', () => {
  it('membaca baris detail lengkap', () => {
    const { rows, pick } = parseMt5Text(sample);
    expect(rows).toHaveLength(2);
    expect(pick!.detailed).toBe(true);
    expect(pick!.symbol).toBe('XAUUSD');
    expect(pick!.side).toBe('Long');
    expect(pick!.lots).toBe(0.02);
    expect(pick!.entry).toBe(4062.46);
    expect(pick!.exit).toBe(4068.12);
    expect(pick!.profit).toBe(11.32);
    expect(pick!.ticket).toBe('1234567890');
    expect(pick!.sl).toBe(4055);
    expect(pick!.tp).toBe(4068.1);
    expect(pick!.commission).toBe(-0.14);
  });
  it('tanda profit dari arah & harga (Short rugi)', () => {
    const r = parseMt5Text(sample).rows[1]!;
    expect(r.side).toBe('Short');
    expect(r.profit).toBe(-5);
    expect(r.detailed).toBe(false);
  });
  it('OCR sering salah baca buy/sell', () => {
    expect(parseMt5Text('EURUSD, se1l 0.1\n1.1000 1.1010 -10.0').rows[0]!.side).toBe('Short');
    expect(parseMt5Text('EURUSD, bvy 0.1\n1.1000 1.1010 10.0').rows[0]!.side).toBe('Long');
  });
  it('teks tanpa posisi → kosong', () => {
    expect(parseMt5Text('halo dunia').rows).toEqual([]);
    expect(parseMt5Text('').pick).toBeNull();
  });
  it('angka berformat ribuan dan koma desimal', () => {
    const r = parseMt5Text('BTCUSD, buy 0.5\n64 250,10 → 64 900,55   325,22').rows[0]!;
    expect(r.entry).toBe(64250.1);
    expect(r.exit).toBe(64900.55);
  });
});

describe('zona waktu MT5', () => {
  it('musim panas AS: GMT+3 → WIB +4 jam', () => { expect(mt5ToWib('2026.10.27 08:15:01', 'auto-us')).toBe('2026-10-27T12:15'); });
  it('musim dingin: GMT+2 → WIB +5 jam', () => { expect(mt5ToWib('2026.11.10 08:15', 'auto-us')).toBe('2026-11-10T13:15'); });
  it('batas tengah malam', () => { expect(mt5ToWib('2026.01.05 22:30', 'gmt2')).toBe('2026-01-06T03:30'); });
  it('sudah WIB tanpa konversi; teks tak valid → kosong', () => {
    expect(mt5ToWib('2026.10.27 08:15', 'wib')).toBe('2026-10-27T08:15');
    expect(mt5ToWib('abc', 'wib')).toBe('');
  });
});

describe('simbol & prefill', () => {
  it('menormalkan simbol broker', () => {
    expect(mt5NormSymbol('XAUUSDm')).toBe('XAUUSD');
    expect(mt5NormSymbol('EURUSD.pro')).toBe('EURUSD');
    expect(mt5NormSymbol('FOOBAR')).toBeNull();
  });
  it('prefill: cara keluar TP, biaya dari swap+komisi, P&L bersih', () => {
    const pf = buildPrefill(parseMt5Text(sample).pick!, 'auto-us');
    expect(pf.exitMethod).toBe('TP');
    expect(pf.fees).toBe(0.14);
    expect(pf.net).toBe(11.18);
    expect(pf.opened).toBe('2026-10-27T11:40');
    expect(pf.closed).toBe('2026-10-27T12:15');
  });
});
