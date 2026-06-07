const CACHE_NAME = 'pinnacle-finance-v6-user-isolation'
const APP_SHELL = ['/', '/manifest.json', '/pinnacle_logo.png']

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))))
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api') || url.pathname.includes('/usuarios') || url.pathname.includes('/dashboard') || url.pathname.includes('/movimentacoes') || url.pathname.includes('/metas') || url.pathname.includes('/categorias') || url.pathname.includes('/cartoes') || url.pathname.includes('/parcelamentos') || url.pathname.includes('/insights') || url.pathname.includes('/planejamento') || url.pathname.includes('/importacao')) return
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const clone = response.clone()
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
      return response
    }).catch(() => caches.match('/')))
  )
})
