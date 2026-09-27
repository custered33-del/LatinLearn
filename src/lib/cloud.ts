/**
 * Cloud save: a 10-digit login code that keeps progress in sync between
 * devices. Saves live in a free Firebase Realtime Database, reached with plain
 * REST calls (no SDK). Each device merges its progress with the cloud copy, so
 * nothing is lost if you practise on your phone and your PC.
 */
import { useEffect, useReducer } from 'preact/hooks';
import { LANG_ID, LANGS, setLanguageSaver, switchLanguage, type LangId } from '../lang';
import { emptyProgress, getProgress, mergeProgress, readStored, sanitize, subscribeProgress, writeStored, type Progress } from './progress';

/** One save holds every language app: `progress` is Latin, `langs` the others. */
type Saves = Record<LangId, Progress>;
const IDS: LangId[] = ['la', 'de', 'es', 'fr', 'zh', 'ar', 'ja', 'ru', 'vi'];

/** Firebase Realtime Database URL; cloud save is hidden until this is set. */
export const CLOUD_URL: string = 'https://latinlearn-custered33-default-rtdb.europe-west1.firebasedatabase.app';
export const cloudEnabled = CLOUD_URL !== '';

const CODE_KEY = 'latinlearn:cloud-code';
const APP = 'LatinLearn';

export type CloudStatus = { state: 'off' | 'syncing' | 'synced' | 'offline'; at?: number };
let status: CloudStatus = { state: 'off' };
let code: string | null = null;
try {
  code = localStorage.getItem(CODE_KEY);
} catch {
  /* storage blocked */
}
const NAME_KEY = 'latinlearn:name';
/** The name on the account, used to greet the learner ("Guten Tag, Dave!"). */
let name = '';
try {
  name = localStorage.getItem(NAME_KEY) ?? '';
} catch {
  /* storage blocked */
}
const listeners = new Set<() => void>();
const setStatus = (s: CloudStatus) => {
  status = s;
  listeners.forEach((fn) => fn());
};

export const cloudCode = () => code;
/** Run `fn` whenever the login or sync status changes. */
export function subscribeCloud(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export const formatCode = (c: string) => `${c.slice(0, 3)} ${c.slice(3, 6)} ${c.slice(6)}`;
export const isCode = (c: string) => /^\d{10}$/.test(c);

export const accountName = () => name;

/** The language the account was last used in (from the last download). */
let accountLang: LangId | null = null;
let firstSync = true;

// Switching language saves it on the account.
setLanguageSaver(async (id) => {
  if (!code) return;
  await fetch(`${CLOUD_URL}/saves/${code}/lang.json`, { method: 'PUT', body: JSON.stringify(id) });
});

function rememberName(n: string) {
  if (n === name) return;
  name = n;
  try {
    if (n) localStorage.setItem(NAME_KEY, n);
    else localStorage.removeItem(NAME_KEY);
  } catch {
    /* session only */
  }
  listeners.forEach((fn) => fn());
}

/** Save a name on the logged-in account (up to 20 characters). */
export async function setAccountName(input: string): Promise<void> {
  const clean = input.trim().replace(/\s+/g, ' ').slice(0, 20);
  if (!code) throw new Error('not logged in');
  const r = await fetch(`${CLOUD_URL}/saves/${code}/name.json`, clean ? { method: 'PUT', body: JSON.stringify(clean) } : { method: 'DELETE' });
  if (!r.ok) throw new Error(`cloud ${r.status}`);
  rememberName(clean);
}

export function useCloud(): { code: string | null; status: CloudStatus; name: string } {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    listeners.add(force as () => void);
    return () => {
      listeners.delete(force as () => void);
    };
  }, []);
  return { code, status, name };
}

const url = (c: string) => `${CLOUD_URL}/saves/${c}.json`;

async function download(c: string): Promise<Partial<Saves> | null | 'missing'> {
  const r = await fetch(url(c), { cache: 'no-store' });
  if (!r.ok) throw new Error(`cloud ${r.status}`);
  const data = (await r.json()) as { app?: string; progress?: unknown; langs?: Record<string, unknown>; name?: unknown; lang?: unknown } | null;
  if (!data) return 'missing';
  if (data.app !== APP) return null;
  accountLang = typeof data.lang === 'string' && data.lang in LANGS ? (data.lang as LangId) : null;
  if (c === code || !code) rememberName(typeof data.name === 'string' ? data.name : '');
  const out: Partial<Saves> = {};
  for (const id of IDS) {
    const p = sanitize(id === 'la' ? data.progress : data.langs?.[id]);
    if (p) out[id] = p;
  }
  return out;
}

async function upload(c: string, saves: Saves): Promise<void> {
  const { la, ...langs } = saves;
  // PATCH keeps other parts of the account (like its family) intact.
  const r = await fetch(url(c), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app: APP, saved: Date.now(), progress: la, langs }),
  });
  if (!r.ok) throw new Error(`cloud ${r.status}`);
}

/** This device's progress for every language. */
const localSaves = (): Saves => Object.fromEntries(IDS.map((id) => [id, readStored(id)])) as Saves;

let lastSynced = '';
let running: Promise<void> | null = null;

/** Pull the cloud copy, merge it with this device, and push the result. */
export function syncNow(): Promise<void> {
  if (!cloudEnabled || !code) return Promise.resolve();
  running ??= (async () => {
    const c = code!;
    setStatus({ state: 'syncing', at: status.at });
    try {
      const remote = await download(c);
      // Opening the app: go to the language this account was last used in (on any device).
      if (firstSync && accountLang && accountLang !== LANG_ID) {
        firstSync = false;
        void switchLanguage(accountLang);
        return;
      }
      firstSync = false;
      if (remote === 'missing') {
        // The account was deleted or reset: this device logs out.
        wipeDevice();
        return;
      }
      const saves = localSaves();
      for (const id of IDS) {
        const theirs = remote ? remote[id] : undefined;
        if (!theirs) continue;
        const merged = mergeProgress(saves[id], theirs);
        if (JSON.stringify(merged) !== JSON.stringify(saves[id])) writeStored(id, merged);
        saves[id] = merged;
      }
      await upload(c, saves);
      lastSynced = JSON.stringify(getProgress());
      setStatus({ state: 'synced', at: Date.now() });
    } catch {
      setStatus({ state: 'offline', at: status.at });
    } finally {
      running = null;
    }
  })();
  return running;
}

function remember(c: string | null) {
  code = c;
  try {
    if (c) localStorage.setItem(CODE_KEY, c);
    else localStorage.removeItem(CODE_KEY);
  } catch {
    /* session only */
  }
}

/** Clear every language's progress on this device and log out. */
function wipeDevice() {
  for (const id of IDS) writeStored(id, emptyProgress());
  remember(null);
  rememberName('');
  lastSynced = '';
  setStatus({ state: 'off' });
}

/**
 * Make a new login code. It starts with this device's progress, which is only
 * ever guest progress: logging out clears the device, so one set of progress
 * can't be copied into several accounts.
 */
export async function createCode(): Promise<string> {
  for (let tries = 0; tries < 5; tries++) {
    const digits = crypto.getRandomValues(new Uint32Array(3));
    const c = String(1 + (digits[0] % 9)) + String((digits[1] % 1e5) * 1e4 + (digits[2] % 1e4)).padStart(9, '0');
    if ((await download(c)) === 'missing') {
      await upload(c, localSaves());
      remember(c);
      lastSynced = JSON.stringify(getProgress());
      setStatus({ state: 'synced', at: Date.now() });
      return c;
    }
  }
  throw new Error('no free code');
}

/** Log in on this device: the account's progress replaces what's here. */
export async function logIn(input: string): Promise<'ok' | 'wrong' | 'offline'> {
  const c = input.replace(/\D/g, '');
  if (!isCode(c)) return 'wrong';
  let remote: Partial<Saves>;
  try {
    const r = await download(c);
    if (!r || r === 'missing') return 'wrong';
    remote = r;
  } catch {
    return 'offline';
  }
  for (const id of IDS) writeStored(id, remote[id] ?? emptyProgress());
  remember(c);
  // Open the account's last language next time the app starts (the welcome screen reloads straight into it).
  if (accountLang) {
    try {
      localStorage.setItem('latinlearn:lang', accountLang);
    } catch {
      /* ignore */
    }
  }
  lastSynced = JSON.stringify(getProgress());
  setStatus({ state: 'synced', at: Date.now() });
  return 'ok';
}

/** Save to the account one last time, then clear this device. */
export async function logOut(): Promise<void> {
  await syncNow();
  wipeDevice();
}

// Keep in sync: on start, when back online, and a few seconds after any change.
if (typeof window !== 'undefined' && cloudEnabled) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  subscribeProgress(() => {
    if (!code || JSON.stringify(getProgress()) === lastSynced) return;
    clearTimeout(timer);
    timer = setTimeout(() => void syncNow(), 4000);
  });
  addEventListener('online', () => void syncNow());
  if (code) void syncNow();
}
