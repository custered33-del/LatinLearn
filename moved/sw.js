// LanguageLearn moved to https://languagelearn-app.vercel.app/. This replaces the old
// offline worker on GitHub Pages: it clears the old copy and steps aside.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((list) => list.forEach((c) => c.navigate(c.url))),
  );
});
