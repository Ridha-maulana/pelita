import type { Account, CapitalEntry, Currency, ExitMethod, Store, Trade } from './types';
import { toWibIso } from './time';

export const BACKUP_VERSION = 4;
const CURRENCIES: Currency[] = ['USD', 'EUR', 'IDR', 'GBP'];
const METHODS: ExitMethod[] = ['TP', 'SL', 'BE', 'Manual', ''];

export interface Attachment { id: string; dataUrl: string }
export interface ParseResult { store: Store; attachments: Attachment[]; warnings: string[] }

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const optNum = (v: unknown): number | null =>
  v === '' || v === null || v === undefined ? null : Number.isFinite(Number(v)) ? Number(v) : NaN;
const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** Baca satu trade dari bentuk lama (v3: date/closeDate/screenshots) atau baru (v4: openedAt/closedAt/attachmentIds). */
function readTrade(raw: unknown, acc: Attachment[]): Trade | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id).trim();
  const symbol = str(raw.symbol).trim().toUpperCase();
  const side = raw.side === 'Long' || raw.side === 'Short' ? raw.side : null;
  const status = raw.status === 'open' || raw.status === 'closed' ? raw.status : null;
  const entry = Number(raw.entry);
  const lots = Number(raw.lots);
  const exit = optNum(raw.exit), sl = optNum(raw.sl), tp = optNum(raw.tp);
  const fees = optNum(raw.fees) ?? 0;
  const pnl = optNum(raw.pnl) ?? 0;
  const opened = str(raw.openedAt) || str(raw.date);
  if (!id || !symbol || !side || !status || !Number.isFinite(entry) || !(lots > 0)) return null;
  if ([exit, sl, tp, fees, pnl].some(n => Number.isNaN(n as number))) return null;
  if (!opened || Number.isNaN(Date.parse(toWibIso(opened)))) return null;
  const closedRaw = str(raw.closedAt) || str(raw.closeDate);
  const closedAt = status === 'closed' ? toWibIso(closedRaw || opened) : null;
  const attachmentIds: string[] = Array.isArray(raw.attachmentIds) ? raw.attachmentIds.filter((x: unknown) => typeof x === 'string') : [];
  if (Array.isArray(raw.screenshots)) {
    raw.screenshots.forEach((d: unknown, i: number) => {
      if (typeof d === 'string' && d.startsWith('data:')) {
        const aid = `${id}-s${i + 1}`;
        acc.push({ id: aid, dataUrl: d });
        attachmentIds.push(aid);
      }
    });
  }
  return {
    id, symbol, side, status,
    openedAt: toWibIso(opened), closedAt,
    entry, exit: status === 'closed' ? exit : null, lots, sl, tp, fees, pnl: status === 'closed' ? pnl : 0,
    exitMethod: METHODS.includes(raw.exitMethod) ? raw.exitMethod : '',
    setup: str(raw.setup), review: str(raw.review), attachmentIds,
    mt5Ticket: raw.mt5Ticket ? String(raw.mt5Ticket) : undefined,
    source: raw.source ? String(raw.source) : undefined,
    updatedAt: str(raw.updatedAt) || toWibIso(opened),
    deletedAt: raw.deletedAt ? String(raw.deletedAt) : null
  };
}

function readCapital(raw: unknown): CapitalEntry[] {
  const list = Array.isArray(raw) ? raw : [];
  return list.filter(isObj).map((c, i) => ({
    id: str(c.id) || `cap-${i + 1}`,
    type: c.type === 'withdraw' ? 'withdraw' as const : 'deposit' as const,
    amount: Number(c.amount) || 0,
    date: str(c.date),
    note: str(c.note)
  }));
}

/** Validasi + migrasi backup (v3 Edge Journal atau v4 Pelita). Mengembalikan null bila rusak. */
export function parseBackup(data: unknown): ParseResult | null {
  if (!isObj(data) || !Array.isArray(data.accounts) || !data.accounts.length) return null;
  const ids = new Set<string>();
  const attachments: Attachment[] = [];
  const warnings: string[] = [];
  const accounts: Account[] = [];
  for (const a of data.accounts) {
    if (!isObj(a)) return null;
    const id = str(a.id).trim(), name = str(a.name).trim();
    const currency = CURRENCIES.includes(a.currency) ? (a.currency as Currency) : null;
    const balance = Number(a.balance);
    if (!id || !name || !currency || !Number.isFinite(balance) || !Array.isArray(a.trades) || ids.has(id)) return null;
    ids.add(id);
    const trades: Trade[] = [];
    for (const t of a.trades) {
      const r = readTrade(t, attachments);
      if (!r) return null;
      trades.push(r);
    }
    accounts.push({
      id, name, currency, balance, trades,
      firstDeposit: str(a.firstDeposit),
      capital: readCapital(a.capital ?? a.capitalHistory)
    });
  }
  const active = accounts.some(x => x.id === data.activeAccountId) ? (data.activeAccountId as string) : accounts[0]!.id;
  return { store: { activeAccountId: active, accounts }, attachments, warnings };
}

export function makeBackup(store: Store, appVersion: string, now = new Date().toISOString()) {
  return { version: BACKUP_VERSION, appVersion, exportedAt: now, activeAccountId: store.activeAccountId, accounts: store.accounts };
}

export interface Preview { accounts: number; trades: number; accountNames: string[] }
export const previewOf = (s: Store): Preview => ({
  accounts: s.accounts.length,
  trades: s.accounts.reduce((n, a) => n + a.trades.length, 0),
  accountNames: s.accounts.map(a => a.name)
});
