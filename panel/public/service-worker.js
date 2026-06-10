// Custom service worker that extends the Angular service worker
// with push-notification click-to-navigate support.
importScripts('./ngsw-worker.js')

self.addEventListener('notificationclick', event => {
  event.notification.close()

  const link = event.notification.data?.trigger_link
  if (!link) {
    return
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Focus an existing window if one is already open on the target URL
      for (const client of clientList) {
        if (client.url === link && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(link)
      }
    })
  )
})
