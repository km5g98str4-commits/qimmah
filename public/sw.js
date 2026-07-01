/* عامل خدمة قِمّة — قشرة تطبيق تعمل دون اتصال (offline app-shell).
 * الإستراتيجية:
 *  - التنقّلات (HTML): الشبكة أولًا ثم index.html المخزّن (يتيح فتح التطبيق دون اتصال).
 *  - أصول نفس الأصل (JS/CSS/صور/خطوط): stale-while-revalidate.
 * غيّر رقم الإصدار عند كل نشر لإبطال الكاش القديم.
 */
const VERSION = 'qimmah-v2'
const APP_SHELL = `${VERSION}-shell`
const RUNTIME = `${VERSION}-runtime`

// قشرة أساسية تُخزّن مسبقًا لتشغيل أوّل دون اتصال.
const PRECACHE_URLS = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // التنقّلات: الشبكة أولًا مع رجوع إلى قشرة التطبيق المخزّنة عند انقطاع الاتصال.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html', { ignoreSearch: true })),
    )
    return
  }

  // أصول نفس الأصل فقط — stale-while-revalidate.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(RUNTIME).then(async (cache) => {
        const cached = await cache.match(request)
        const network = fetch(request)
          .then((response) => {
            if (response && response.status === 200 && response.type === 'basic') {
              cache.put(request, response.clone())
            }
            return response
          })
          .catch(() => cached)
        return cached || network
      }),
    )
  }
})
