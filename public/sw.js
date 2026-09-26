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
    const res = await fetch(req);
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
