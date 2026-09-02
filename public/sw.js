const CACHE_NAME = 'ctfl-study-shell-v1'
const CACHE_PREFIX = 'ctfl-study-'
const scopeUrl = new URL('./', self.registration.scope)

const scopedUrl = (path) => new URL(path, scopeUrl).href

const canCache = (response) =>
  response && response.ok && (response.type === 'basic' || response.type === 'default')

async function cacheApplicationShell() {
  const cache = await caches.open(CACHE_NAME)
  const indexUrl = scopedUrl('./')
  const response = await fetch(new Request(indexUrl, { cache: 'reload' }))

  if (!canCache(response)) {
    throw new Error('Não foi possível obter o shell da aplicação.')
  }

  await cache.put(indexUrl, response.clone())
  const html = await response.text()
  const references = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((reference) => !reference.startsWith('data:'))
    .map((reference) => new URL(reference, indexUrl))
    .filter((url) => url.origin === scopeUrl.origin && url.pathname.startsWith(scopeUrl.pathname))

  const coreUrls = [
    scopedUrl('manifest.webmanifest'),
    scopedUrl('icon.svg'),
    scopedUrl('icon-192.png'),
    scopedUrl('icon-512.png'),
  ]
  const urls = [...new Set([...coreUrls, ...references.map((url) => url.href)])]

  await Promise.allSettled(
    urls.map(async (url) => {
      const assetResponse = await fetch(new Request(url, { cache: 'reload' }))
      if (canCache(assetResponse)) await cache.put(url, assetResponse)
    }),
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheApplicationShell().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((names) =>
          Promise.all(
            names
              .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
              .map((name) => caches.delete(name)),
          ),
        ),
      self.registration.navigationPreload?.enable(),
      self.clients.claim(),
    ]),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== scopeUrl.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME)

        try {
          const response = (await event.preloadResponse) || (await fetch(request))
          if (canCache(response)) {
            await cache.put(request, response.clone())
            await cache.put(scopedUrl('./'), response.clone())
          }
          return response
        } catch {
          return (
            (await cache.match(request, { ignoreSearch: true })) ||
            (await cache.match(scopedUrl('./'))) ||
            Response.error()
          )
        }
      })(),
    )
    return
  }

  if (!url.pathname.startsWith(scopeUrl.pathname)) return

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      const cached = await cache.match(request, { ignoreSearch: true })

      if (cached) return cached

      const response = await fetch(request)
      if (canCache(response)) await cache.put(request, response.clone())
      return response
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
