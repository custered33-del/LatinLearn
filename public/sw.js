// LatinLearn service worker: makes the installed app work offline.
// Pages are fetched fresh when online (so updates arrive) and fall back to the
// cache offline; everything else (hashed code, icons, voice clips) is cache-first.
const CACHE = 'latinlearn-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Audio elements ask for byte ranges; answer them from the cached file. */
async function rangeResponse(res, range) {
  const buf = await res.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  const start = m && m[1] ? Number(m[1]) : 0;
  const end = m && m[2] ? Math.min(Number(m[2]), buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const url = req.url.split('#')[0];
  let res = await cache.match(url);
  if (!res) {
    res = await fetch(url);
    if (res.ok && res.status === 200) await cache.put(url, res.clone());
  }
  const range = req.headers.get('range');
  return range && res.status === 200 ? rangeResponse(res, range) : res;
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    // no-cache: always check for a new version (GitHub Pages otherwise lets browsers reuse the page for 10 minutes).
    const res = await fetch(req, { cache: 'no-cache' });
    if (res.ok) await cache.put('./index.html', res.clone());
    return res;
  } catch {
    return (await cache.match('./index.html')) || Response.error();
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(req.mode === 'navigate' ? networkFirst(req) : cacheFirst(req));
});

// Notifications (streak saver, daily reminder, "we miss you", tests) sent by notify/send.mjs.
self.addEventListener('push', (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { body: e.data ? e.data.text() : '' };
  }
  e.waitUntil(
    self.registration.showNotification(d.title || 'LatinLearn', {
      body: d.body || '',
      icon: d.icon || './icon-192.png',
      badge: d.icon || './icon-192.png',
      tag: d.tag,
      data: { url: d.url || '#/' },
    }),
  );
});

// Tapping a notification opens the app (or brings it to the front) on the right page.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '#/', self.registration.scope).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          if ('navigate' in c) c.navigate(url).catch(() => undefined);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
