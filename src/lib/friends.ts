/**
 * Friends and the global leaderboard. Every login account gets a random 8-digit
 * friend ID (saved at saves/<login>/friendId) and a public profile at
 * profiles/<friendId> with its name, XP and streak. Adding a friend's ID links
 * both profiles, so you each see the other. The leaderboard is the 10 profiles
 * with the most XP. Login codes are never shared, only friend IDs.
 */
import { useEffect, useReducer } from 'preact/hooks';
import { accountName, CLOUD_URL, cloudCode, subscribeCloud } from './cloud';
import { myStats, type Member } from './family';
import { subscribeProgress } from './progress';

const KEY = 'latinlearn:friends';

export interface Profile extends Member {
  friends?: Record<string, true>;
}

interface Mine {
  account: string;
  id: string;
}

let mine: Mine | null = null;
try {
  mine = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Mine | null;
} catch {
  /* storage blocked */
}
if (mine && mine.account !== cloudCode()) mine = null;
let friends: [string, Profile][] | null = null;
let board: [string, Profile][] | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((fn) => fn());

function setMine(m: Mine | null) {
  if (m?.id !== mine?.id) friends = null;
  mine = m;
  try {
    if (m) localStorage.setItem(KEY, JSON.stringify(m));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  changed();
}

const profileUrl = (path: string) => `${CLOUD_URL}/profiles/${path}.json`;
const idUrl = (account: string) => `${CLOUD_URL}/saves/${account}/friendId.json`;
const randomId = () => String(10000000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 90000000));
export const formatFriendId = (id: string) => `${id.slice(0, 4)} ${id.slice(4)}`;

async function send(url: string, method: 'PUT' | 'PATCH' | 'DELETE', body?: unknown) {
  const r = await fetch(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!r.ok) throw new Error(`friends ${r.status}`);
}
async function get<T>(url: string): Promise<T | null> {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`friends ${r.status}`);
  return (await r.json()) as T | null;
}

const myProfile = () => myStats(accountName() || 'Learner');

/** Load the account's friend ID, making one the first time. */
async function loadAccount(): Promise<void> {
  const account = cloudCode();
  if (!account) return setMine(null);
  let id = await get<string>(idUrl(account));
  if (!id) {
    for (let i = 0; i < 5 && !id; i++) {
      const next = randomId();
      if ((await get(profileUrl(next))) === null) id = next;
    }
    if (!id) throw new Error('no free friend ID');
    await send(profileUrl(id), 'PATCH', myProfile());
    await send(idUrl(account), 'PUT', id);
  }
  if (cloudCode() !== account) return;
  setMine({ account, id });
  await refreshFriends();
}

/** Send my stats to my profile, then fetch my friends' profiles. */
export async function refreshFriends(): Promise<void> {
  const m = mine;
  if (!m) return;
  await send(profileUrl(m.id), 'PATCH', myProfile());
  const ids = Object.keys((await get<Record<string, true>>(profileUrl(`${m.id}/friends`))) ?? {});
  const list = await Promise.all(ids.map(async (id) => [id, await get<Profile>(profileUrl(id))] as const));
  if (mine !== m) return;
  friends = list.filter((f): f is [string, Profile] => !!f[1]).sort((a, b) => b[1].xp - a[1].xp);
  changed();
}

/** The 10 learners with the most XP. */
export async function refreshBoard(): Promise<void> {
  const d = await get<Record<string, Profile>>(`${CLOUD_URL}/profiles.json?orderBy="xp"&limitToLast=10`);
  board = Object.entries(d ?? {}).sort((a, b) => b[1].xp - a[1].xp);
  changed();
}

export async function addFriend(input: string): Promise<'ok' | 'wrong' | 'self' | 'already'> {
  const m = mine;
  if (!m) throw new Error('log in first');
  const id = input.replace(/\D/g, '');
  if (id === m.id) return 'self';
  if (friends?.some(([f]) => f === id)) return 'already';
  if (!/^\d{8}$/.test(id) || (await get(profileUrl(`${id}/xp`))) === null) return 'wrong';
  await send(profileUrl(`${m.id}/friends/${id}`), 'PUT', true);
  await send(profileUrl(`${id}/friends/${m.id}`), 'PUT', true);
  await refreshFriends();
  return 'ok';
}

export async function removeFriend(id: string): Promise<void> {
  const m = mine;
  if (!m) return;
  await send(profileUrl(`${m.id}/friends/${id}`), 'DELETE');
  await send(profileUrl(`${id}/friends/${m.id}`), 'DELETE');
  await refreshFriends();
}

export function useFriends(): { account: string | null; myId: string | null; friends: [string, Profile][] | null; board: [string, Profile][] | null } {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    listeners.add(force as () => void);
    return () => {
      listeners.delete(force as () => void);
    };
  }, []);
  return { account: cloudCode(), myId: mine?.id ?? null, friends, board };
}

// Follow the login (and name changes): logging out forgets the friend ID on this device.
let lastAccount = cloudCode();
let lastName = accountName();
subscribeCloud(() => {
  const account = cloudCode();
  if (account !== lastAccount) {
    lastAccount = account;
    if (!account) setMine(null);
    else void loadAccount().catch(() => undefined);
  } else if (accountName() !== lastName && mine) void refreshFriends().catch(() => undefined);
  lastName = accountName();
});
if (lastAccount) void loadAccount().catch(() => undefined);

// Keep my profile fresh while I practise.
let timer: ReturnType<typeof setTimeout> | undefined;
subscribeProgress(() => {
  if (!mine) return;
  clearTimeout(timer);
  timer = setTimeout(() => void refreshFriends().catch(() => undefined), 8000);
});
