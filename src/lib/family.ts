/**
 * Families: up to a handful of learners share a 7-digit family code and see
 * each other's names, XP and streaks, plus a shared family streak and goals.
 * Only names and stats are shared; nobody's login code ever leaves their device.
 */
import { useEffect, useReducer } from 'preact/hooks';
import { LANGS, type LangId } from '../lang';
import { CLOUD_URL } from './cloud';
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
export interface FamilyData {
  members: Record<string, Member>;
  days: Record<string, Record<string, number>>;
}
interface Mine {
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
let data: FamilyData | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((fn) => fn());

const save = (m: Mine | null) => {
  mine = m;
  data = null;
  try {
    if (m) localStorage.setItem(KEY, JSON.stringify(m));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  changed();
};

const url = (path: string) => `${CLOUD_URL}/families/${path}.json`;
const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
const randomCode = () => String(1000000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000000));

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

async function put(path: string, body: unknown) {
  const r = await fetch(url(path), { method: 'PUT', body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`family ${r.status}`);
}

/** Send my stats (and today's tick) to the family, then fetch everyone's. */
export async function refreshFamily(): Promise<void> {
  if (!mine) return;
  const m = mine;
  await put(`${m.code}/members/${m.id}`, myStats(m.name));
  if (practisedToday()) await put(`${m.code}/days/${dayKey()}/${m.id}`, 1);
  const r = await fetch(url(m.code), { cache: 'no-store' });
  if (!r.ok) throw new Error(`family ${r.status}`);
  const d = (await r.json()) as Partial<FamilyData> | null;
  if (mine !== m) return;
  data = { members: d?.members ?? {}, days: d?.days ?? {} };
  changed();
}

export async function createFamily(name: string): Promise<void> {
  for (let i = 0; i < 5; i++) {
    const code = randomCode();
    const r = await fetch(url(code), { cache: 'no-store' });
    if (r.ok && (await r.json()) === null) {
      save({ code, id: randomId(), name });
      return refreshFamily();
    }
  }
  throw new Error('no free code');
}

export async function joinFamily(input: string, name: string): Promise<'ok' | 'wrong'> {
  const code = input.replace(/\D/g, '');
  if (!/^\d{7}$/.test(code)) return 'wrong';
  const r = await fetch(url(`${code}/members`), { cache: 'no-store' });
  if (!r.ok) throw new Error(`family ${r.status}`);
  if ((await r.json()) === null) return 'wrong';
  save({ code, id: randomId(), name });
  await refreshFamily();
  return 'ok';
}

export async function leaveFamily(): Promise<void> {
  const m = mine;
  save(null);
  if (m) await fetch(url(`${m.code}/members/${m.id}`), { method: 'DELETE' }).catch(() => undefined);
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

export const formatFamilyCode = (c: string) => `${c.slice(0, 3)} ${c.slice(3)}`;

export function useFamily(): { mine: Mine | null; data: FamilyData | null } {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    listeners.add(force as () => void);
    return () => {
      listeners.delete(force as () => void);
    };
  }, []);
  return { mine, data };
}

// Keep my stats fresh for the family while I practise.
let timer: ReturnType<typeof setTimeout> | undefined;
subscribeProgress(() => {
  if (!mine) return;
  clearTimeout(timer);
  timer = setTimeout(() => void refreshFamily().catch(() => undefined), 5000);
});
