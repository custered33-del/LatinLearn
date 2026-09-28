// Sends LatinLearn push notifications to every device that turned them on in Settings.
//
//   node notify/send.mjs          the regular check (GitHub runs it every 15 minutes):
//                                 streak saver, daily reminder and "we miss you"
//   node notify/send.mjs --test   a test notification to every device (TestNoti.cmd)
//
// Devices are listed at push/<id> in the Firebase database; the signing keys are at
// secrets/vapid. Both are admin-only, so this needs a Google access token: on GitHub
// it's FIREBASE_TOKEN, on this PC it's the Firebase sign-in saved by the Firebase CLI.
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import webpush from 'web-push';
import { pick } from './pick.mjs';

const DB = 'https://latinlearn-custered33-default-rtdb.europe-west1.firebasedatabase.app';
const SITE = 'https://custered33-del.github.io/LatinLearn/';
const test = process.argv.includes('--test');

async function accessToken() {
  if (process.env.FIREBASE_TOKEN) return process.env.FIREBASE_TOKEN;
  const cfg = `${homedir()}/.config/configstore/firebase-tools.json`;
  const refresh = existsSync(cfg) ? JSON.parse(readFileSync(cfg, 'utf8'))?.tokens?.refresh_token : undefined;
  if (!refresh) throw new Error('this PC is not signed in to Firebase');
  // The Firebase CLI's public sign-in client (the same one firebase-tools uses).
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refresh,
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
    }),
  });
  const { access_token: token } = await r.json();
  if (!token) throw new Error(`sign-in failed (${r.status})`);
  return token;
}

const token = await accessToken();
async function db(path, method = 'GET', body) {
  const r = await fetch(`${DB}/${path}.json`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`database ${r.status} on ${path}`);
  return r.json();
}

const keys = await db('secrets/vapid');
if (!keys?.publicKey) throw new Error('no signing keys at secrets/vapid');
webpush.setVapidDetails(SITE, keys.publicKey, keys.privateKey);

const iconFor = (lang) => `${SITE}${!lang || lang === 'la' ? 'icon-192.png' : `icon-${lang}-192.png`}`;

const devices = Object.entries((await db('push')) ?? {});
let sent = 0;
let gone = 0;
let failed = 0;
for (const [id, d] of devices) {
  const msg = test
    ? { kind: 'test', title: 'LatinLearn', body: 'Test, we are testing our newest feature, NOTIFICATIONS! 🔔', url: '#/' }
    : pick(d);
  if (!msg || !d.sub?.endpoint) continue;
  const payload = JSON.stringify({ title: msg.title, body: msg.body, url: msg.url, icon: iconFor(d.lang), tag: `latinlearn-${msg.kind}` });
  try {
    await webpush.sendNotification(d.sub, payload, { TTL: msg.kind === 'streak' ? 3600 : 6 * 3600, urgency: 'high' });
    sent++;
    if (msg.mark !== undefined) await db(`push/${id}/sent`, 'PATCH', { [msg.kind]: msg.mark });
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      // The device turned notifications off or the app was removed.
      await db(`push/${id}`, 'DELETE');
      gone++;
    } else {
      failed++;
      console.log(`  couldn't reach one device (${err.statusCode ?? err.message})`);
    }
  }
}
console.log(`${test ? 'Test' : 'Check'}: ${devices.length} device(s) with notifications on, ${sent} sent${gone ? `, ${gone} removed (turned off)` : ''}${failed ? `, ${failed} failed` : ''}.`);
