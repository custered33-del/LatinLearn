/**
 * Families: learners share a 7-digit family code and see each other's names,
 * XP and streaks, a shared family streak and goal, and family speed battles.
 * Membership belongs to your login account (saved at saves/<login>/family), so
 * it follows you to every device you log in on and leaves when you log out.
 * Only names and scores are shared; nobody's login code is ever shown.
 */
import { useEffect, useReducer } from 'preact/hooks';
import { LANG, LANGS, type LangId } from '../lang';
import { CLOUD_URL, cloudCode, subscribeCloud } from './cloud';
import { currentStreak, dayKey, readStored, subscribeProgress } from './progress';

const KEY = 'latinlearn:family';
const IDS = Object.keys(LANGS) as LangId[];

export interface Member {
  name: string;
  xp: number;
  streak: number;
  words: number;
  langs: string;
  seen: number;
}
export interface Score {
  name: string;
  best: number;
  flag: string;
  plays: number;
}
/** A family speed battle: best 60-second speed round between start and end wins. */
export interface Comp {
  start: number;
  end: number;
  by: string;
  scores?: Record<string, Score>;
}
export interface FamilyData {
  members: Record<string, Member>;
  days: Record<string, Record<string, number>>;
  comp?: Comp;
}
interface Mine {
  account: string;
  code: string;
  id: string;
  name: string;
}

let mine: Mine | null = null;
try {
  mine = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Mine | null;
} catch {
  /* storage blocked */
}
if (mine && mine.account !== cloudCode()) mine = null;
let data: FamilyData | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((fn) => fn());

const setMine = (m: Mine | null) => {
  if (m?.code !== mine?.code) data = null;
  mine = m;
  try {
    if (m) localStorage.setItem(KEY, JSON.stringify(m));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  changed();
};

const famUrl = (path: string) => `${CLOUD_URL}/families/${path}.json`;
const accountUrl = (account: string) => `${CLOUD_URL}/saves/${account}/family.json`;
const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
const randomCode = () => String(1000000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000000));

async function send(url: string, method: 'PUT' | 'DELETE', body?: unknown) {
  const r = await fetch(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!r.ok) throw new Error(`family ${r.status}`);
}
async function get<T>(url: string): Promise<T | null> {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`family ${r.status}`);
  return (await r.json()) as T | null;
}

/** My stats across every language app on this device. */
function myStats(name: string): Member {
  let xp = 0;
  let streak = 0;
  let words = 0;
  const langs: string[] = [];
  for (const id of IDS) {
    const p = readStored(id);
    if (p.xp > 0) langs.push(LANGS[id].flag);
    xp += p.xp;
    streak = Math.max(streak, currentStreak(p));
    words += Object.values(p.words).filter((s) => s >= 3).length;
  }
  return { name, xp, streak, words, langs: langs.join(''), seen: Date.now() };
}
const practisedToday = () => IDS.some((id) => readStored(id).lastDay === dayKey());

/** Send my stats (and today's tick) to the family, then fetch everyone's. */
export async function refreshFamily(): Promise<void> {
  if (!mine) return;
  const m = mine;
  await send(famUrl(`${m.code}/members/${m.id}`), 'PUT', myStats(m.name));
  if (practisedToday()) await send(famUrl(`${m.code}/days/${dayKey()}/${m.id}`), 'PUT', 1);
  const d = await get<Partial<FamilyData>>(famUrl(m.code));
  if (mine !== m) return;
  data = { members: d?.members ?? {}, days: d?.days ?? {}, comp: d?.comp };
  changed();
}

/** Load the family saved on the logged-in account (after logging in, or on start). */
async function loadAccountFamily(): Promise<void> {
  const account = cloudCode();
  if (!account) return setMine(null);
  const f = await get<Omit<Mine, 'account'>>(accountUrl(account));
  if (cloudCode() !== account) return;
  setMine(f?.code && f.id ? { account, code: f.code, id: f.id, name: f.name ?? 'Me' } : null);
  if (mine) await refreshFamily();
}

async function enter(code: string, name: string) {
  const account = cloudCode();
  if (!account) throw new Error('log in first');
  const m: Mine = { account, code, id: randomId(), name };
  await send(accountUrl(account), 'PUT', { code: m.code, id: m.id, name: m.name });
  setMine(m);
  await refreshFamily();
}

export async function createFamily(name: string): Promise<void> {
  for (let i = 0; i < 5; i++) {
    const code = randomCode();
    if ((await get(famUrl(`${code}/members`))) === null) return enter(code, name);
  }
  throw new Error('no free code');
}

export async function joinFamily(input: string, name: string): Promise<'ok' | 'wrong'> {
  const code = input.replace(/\D/g, '');
  if (!/^\d{7}$/.test(code) || (await get(famUrl(`${code}/members`))) === null) return 'wrong';
  await enter(code, name);
  return 'ok';
}

export async function leaveFamily(): Promise<void> {
  const m = mine;
  if (!m) return;
  await send(famUrl(`${m.code}/members/${m.id}`), 'DELETE');
  await send(accountUrl(m.account), 'DELETE');
  setMine(null);
}

/** Days in a row that at least one family member practised (today can still be pending). */
export function familyStreak(d: FamilyData): number {
  const day = new Date();
  let n = 0;
  if (!d.days[dayKey(day)]) day.setDate(day.getDate() - 1);
  while (d.days[dayKey(day)]) {
    n++;
    day.setDate(day.getDate() - 1);
  }
  return n;
}

// ---------------------------------------------------------------------------
// Speed battles
// ---------------------------------------------------------------------------

export const compActive = (c?: Comp): c is Comp => !!c && c.end > Date.now();

/** Everyone's best score, highest first. */
export const compRanking = (c?: Comp): [string, Score][] =>
  Object.entries(c?.scores ?? {}).sort((a, b) => b[1].best - a[1].best || a[1].plays - b[1].plays);

export async function startComp(minutes: number): Promise<void> {
  if (!mine) return;
  await refreshFamily();
  if (compActive(data?.comp)) return; // someone else just started one
  const now = Date.now();
  await send(famUrl(`${mine.code}/comp`), 'PUT', { start: now, end: now + minutes * 60_000, by: mine.name });
  await refreshFamily();
}

/** Record a finished round; only your best score in the battle counts. */
export async function submitScore(points: number): Promise<void> {
  if (!mine || !compActive(data?.comp)) return;
  const old = data.comp.scores?.[mine.id];
  const score: Score = { name: mine.name, best: Math.max(points, old?.best ?? 0), flag: LANG.flag, plays: (old?.plays ?? 0) + 1 };
  await send(famUrl(`${mine.code}/comp/scores/${mine.id}`), 'PUT', score);
  await refreshFamily();
}

/** "12m 5s", "3h 20m" or "2d 4h". */
export function timeLeft(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}

export const formatFamilyCode = (c: string) => `${c.slice(0, 3)} ${c.slice(3)}`;

export function useFamily(): { account: string | null; mine: Mine | null; data: FamilyData | null } {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    listeners.add(force as () => void);
    return () => {
      listeners.delete(force as () => void);
    };
  }, []);
  return { account: cloudCode(), mine, data };
}

// Follow the login: logging out leaves the family on this device, logging in loads the account's family.
let lastAccount = cloudCode();
subscribeCloud(() => {
  const account = cloudCode();
  if (account === lastAccount) return;
  lastAccount = account;
  if (!account) setMine(null);
  else void loadAccountFamily().catch(() => undefined);
});
if (lastAccount) void loadAccountFamily().catch(() => undefined);

// Keep my stats fresh for the family while I practise.
let timer: ReturnType<typeof setTimeout> | undefined;
subscribeProgress(() => {
  if (!mine) return;
  clearTimeout(timer);
  timer = setTimeout(() => void refreshFamily().catch(() => undefined), 5000);
});
