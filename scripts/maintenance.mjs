// Close or open the app for updates: `node scripts/maintenance.mjs close|open`.
// Flips status/maintenance in the Firebase database. Only the project owner can:
// it uses the Firebase sign-in saved on this PC (never printed or stored anywhere else).
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';

const DB = 'https://latinlearn-custered33-default-rtdb.europe-west1.firebasedatabase.app';
const mode = process.argv[2];
if (mode !== 'close' && mode !== 'open') {
  console.log('Use: node scripts/maintenance.mjs close   or   node scripts/maintenance.mjs open');
  process.exit(1);
}

const cfgFile = `${homedir()}/.config/configstore/firebase-tools.json`;
const refresh = existsSync(cfgFile) ? JSON.parse(readFileSync(cfgFile, 'utf8'))?.tokens?.refresh_token : undefined;
if (!refresh) {
  console.log('This PC is not signed in to Firebase, so it cannot close or open the app.');
  process.exit(1);
}

try {
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

  const down = mode === 'close';
  const res = await fetch(`${DB}/status.json`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ maintenance: down, changed: Date.now() }),
  });
  if (!res.ok) throw new Error(`the database said ${res.status}`);

  console.log('');
  console.log(
    down
      ? '  CLOSED for updates. Everyone now sees "Sorry, down for updates".'
      : '  OPEN again. Everyone\'s app reloads with the new version.',
  );
  console.log('');
} catch (err) {
  console.log(`Couldn't ${mode} the app: ${err.message}. Check the internet and try again.`);
  process.exit(1);
}
