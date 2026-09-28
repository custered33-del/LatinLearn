/**
 * Push notifications: streak saver (an hour before your streak ends), a daily
 * reminder, and "we miss you" after a few days away. Turning them on saves this
 * device's push address at push/<id> in the database, with the little the sender
 * needs to decide what to send: your streak, the last day you practised, your
 * time zone and your choices. notify/send.mjs (run by GitHub every 15 minutes)
 * does the sending.
 */
import { useEffect, useReducer } from 'preact/hooks';
import { LANG, LANG_ID } from '../lang';
import { CLOUD_URL } from './cloud';
import { currentStreak, readStored, subscribeProgress } from './progress';

/** Public half of the signing key (the private half is only on the sender). */
const VAPID_PUBLIC = 'BEBQdHryIgB-EGn9JAjVsybTDdLILkM1RQgpX6i0ROZgmSVcqhgYsBbFx9nBAJtOv85FdpZFbSOTAhGuUC_Afrc';
const KEY = 'latinlearn:push';

export interface PushPrefs {
  streak: boolean;
  daily: boolean;
  away: boolean;
  /** Hour (0-23) for the daily reminder. */
  hour: number;
}
interface Saved {
  id: string;
  prefs: PushPrefs;
}

export const DEFAULT_PREFS: PushPrefs = { streak: true, daily: true, away: true, hour: 17 };

let saved: Saved | null = null;
try {
  saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Saved | null;
} catch {
  /* storage blocked */
}
const listeners = new Set<() => void>();
function setSaved(s: Saved | null) {
  saved = s;
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

const isIos = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const installed = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

/** Can this device get notifications? 'ios-install' means: add to Home Screen first. */
export function pushSupport(): 'ok' | 'ios-install' | 'no' {
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return 'no';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return isIos() && !installed() ? 'ios-install' : 'no';
  return 'ok';
}

const recordUrl = (id: string) => `${CLOUD_URL}/push/${id}.json`;
const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** What the sender needs to know about me right now. */
function status() {
  const p = readStored(LANG_ID);
  return {
    lang: LANG_ID,
    app: LANG.app,
    language: LANG.language,
    hello: LANG.hello,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    streak: currentStreak(p),
    lastDay: p.lastDay ?? '',
    seen: Date.now(),
  };
}

async function send(id: string, method: 'PUT' | 'PATCH', body: unknown) {
  const r = await fetch(recordUrl(id), { method, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`push ${r.status}`);
}

async function subscription(): Promise<PushSubscription> {
  const reg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, no) => setTimeout(() => no(new Error('no service worker')), 8000)),
  ]);
  return (await reg.pushManager.getSubscription()) ?? reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID_PUBLIC) });
}

/** Ask permission and turn notifications on. */
export async function enablePush(prefs: PushPrefs = saved?.prefs ?? DEFAULT_PREFS): Promise<'ok' | 'denied'> {
  if ((await Notification.requestPermission()) !== 'granted') return 'denied';
  const sub = (await subscription()).toJSON();
  const id = saved?.id ?? randomId();
  await send(id, 'PUT', { sub: { endpoint: sub.endpoint, keys: sub.keys }, prefs, ...status() });
  setSaved({ id, prefs });
  return 'ok';
}

export async function disablePush(): Promise<void> {
  const s = saved;
  setSaved(null);
  if (s) await fetch(recordUrl(s.id), { method: 'DELETE' }).catch(() => undefined);
  const reg = await navigator.serviceWorker?.getRegistration();
  await (await reg?.pushManager.getSubscription())?.unsubscribe();
}

export async function setPushPrefs(prefs: PushPrefs): Promise<void> {
  if (!saved) return;
  await send(saved.id, 'PATCH', { prefs });
  setSaved({ ...saved, prefs });
}

export function usePush(): { on: boolean; prefs: PushPrefs } {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    listeners.add(force as () => void);
    return () => {
      listeners.delete(force as () => void);
    };
  }, []);
  return { on: !!saved, prefs: saved?.prefs ?? DEFAULT_PREFS };
}

/** Keep the sender up to date (streak, last practice, time zone, push address). */
async function update(): Promise<void> {
  const s = saved;
  if (!s || pushSupport() !== 'ok') return;
  if (Notification.permission !== 'granted') return setSaved(null);
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = (await reg?.pushManager.getSubscription())?.toJSON();
  if (!sub?.endpoint) return setSaved(null);
  // The whole record, in case the sender tidied it away while the device was offline.
  await send(s.id, 'PATCH', { sub: { endpoint: sub.endpoint, keys: sub.keys }, prefs: s.prefs, ...status() });
}

if (saved) void update().catch(() => undefined);
let timer: ReturnType<typeof setTimeout> | undefined;
subscribeProgress(() => {
  if (!saved) return;
  clearTimeout(timer);
  timer = setTimeout(() => void update().catch(() => undefined), 5000);
});
