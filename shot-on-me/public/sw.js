const CACHE_VERSION = 'som-v1'
const PRECACHE_URLS = ['/app-icons/icon-192.png', '/app-icons/icon-512.png']

// Install — precache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch — network-first strategy
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Skip non-GET, chrome-extension, and API requests
  if (
    request.method !== 'GET' ||
    request.url.startsWith('chrome-extension') ||
    request.url.includes('/api/')
  ) {
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})

// Handle skip-waiting message from CacheBuster
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
