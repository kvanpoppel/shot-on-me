// Minimal service worker — only exists to enable PWA install
// Does NOT cache anything, does NOT intercept fetches
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  )
})
