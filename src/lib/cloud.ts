/**
 * Cloud save: a 10-digit login code that keeps progress in sync between
 * devices. Saves live in a free Firebase Realtime Database, reached with plain
 * REST calls (no SDK). Each device merges its progress with the cloud copy, so
 * nothing is lost if you practise on your phone and your PC.
 */
import { useEffect, useReducer } from 'preact/hooks';
import { getProgress, mergeProgress, replaceProgress, sanitize, subscribeProgress, type Progress } from './progress';

/** Firebase Realtime Database URL; cloud save is hidden until this is set. */
export const CLOUD_URL = '';
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
const listeners = new Set<() => void>();
const setStatus = (s: CloudStatus) => {
  status = s;
  listeners.forEach((fn) => fn());
};

export const cloudCode = () => code;
export const formatCode = (c: string) => `${c.slice(0, 3)} ${c.slice(3, 6)} ${c.slice(6)}`;
export const isCode = (c: string) => /^\d{10}$/.test(c);

export function useCloud(): { code: string | null; status: CloudStatus } {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    listeners.add(force as () => void);
    return () => {
      listeners.delete(force as () => void);
    };
  }, []);
  return { code, status };
}

const url = (c: string) => `${CLOUD_URL}/saves/${c}.json`;

async function download(c: string): Promise<Progress | null | 'missing'> {
  const r = await fetch(url(c), { cache: 'no-store' });
  if (!r.ok) throw new Error(`cloud ${r.status}`);
  const data = (await r.json()) as { app?: string; progress?: unknown } | null;
  if (!data) return 'missing';
  return data.app === APP ? sanitize(data.progress) : null;
}

async function upload(c: string, p: Progress): Promise<void> {
  const r = await fetch(url(c), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app: APP, saved: Date.now(), progress: p }),
  });
  if (!r.ok) throw new Error(`cloud ${r.status}`);
}

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
      const local = getProgress();
      const merged = remote && remote !== 'missing' ? mergeProgress(local, remote) : local;
      if (JSON.stringify(merged) !== JSON.stringify(local)) replaceProgress(merged);
      await upload(c, merged);
      lastSynced = JSON.stringify(merged);
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

/** Make a new login code holding this device's progress. */
export async function createCode(): Promise<string> {
  for (let tries = 0; tries < 5; tries++) {
    const digits = crypto.getRandomValues(new Uint32Array(3));
    const c = String(1 + (digits[0] % 9)) + String((digits[1] % 1e5) * 1e4 + (digits[2] % 1e4)).padStart(9, '0');
    if ((await download(c)) === 'missing') {
      await upload(c, getProgress());
      remember(c);
      lastSynced = JSON.stringify(getProgress());
      setStatus({ state: 'synced', at: Date.now() });
      return c;
    }
  }
  throw new Error('no free code');
}

/** Log in on this device: merge the cloud progress with what's here. */
export async function logIn(input: string): Promise<'ok' | 'wrong' | 'offline'> {
  const c = input.replace(/\D/g, '');
  if (!isCode(c)) return 'wrong';
  try {
    const remote = await download(c);
    if (!remote || remote === 'missing') return 'wrong';
  } catch {
    return 'offline';
  }
  remember(c);
  await syncNow();
  return status.state === 'synced' ? 'ok' : 'offline';
}

export function logOut(): void {
  remember(null);
  setStatus({ state: 'off' });
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
