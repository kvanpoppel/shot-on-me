// Revig Service Worker — handles push notifications and offline caching

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

// Handle incoming push messages
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data = {}
  try { data = event.data.json() } catch { data = { title: 'Revig', body: event.data.text() } }

  const title = data.title || 'Revig'
  const options = {
    body: data.body || data.message || '',
    icon: data.icon || '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: data.data || {},
    vibrate: [100, 50, 100],
    tag: data.tag || 'revig-notification',
    renotify: true,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Handle notification click — open or focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          if (client.navigate) client.navigate(url)
          return
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
