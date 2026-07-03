/* عامل خدمة قِمّة — قشرة تطبيق تعمل دون اتصال (offline app-shell).
 * الإستراتيجية:
 *  - التنقّلات (HTML): الشبكة أولًا ثم index.html المخزّن (يتيح فتح التطبيق دون اتصال).
 *  - أصول Vite المُهشّمة (/assets/): cache-first — اسم الملف يتغيّر بتغيّر المحتوى.
 *  - بقية أصول نفس الأصل (أيقونات/صور/GIF): stale-while-revalidate.
 * الإصدار يُحقن آليًا وقت البناء (هاش الـ commit) — كل نشر يُبطل كاش النشرة السابقة
 * ويعيد تخزين القشرة، فلا يعلق مستخدم على index.html قديم. (انظر vite.config.ts)
 */
const VERSION = 'qimmah-__SW_VERSION__'
const APP_SHELL = `${VERSION}-shell`
const RUNTIME = `${VERSION}-runtime`

// أصول الإقلاع المُهشّمة — يحقنها البناء (vite.config.ts) من dist/index.html، كي
// تعمل القشرة دون اتصال من أول زيارة (لا انتظار لزيارة ثانية تملأ كاش التشغيل).
const PRECACHE_ASSETS = __SW_PRECACHE_ASSETS__

// قشرة أساسية تُخزّن مسبقًا لتشغيل أوّل دون اتصال.
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  ...PRECACHE_ASSETS,
]

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

  // أصول نفس الأصل فقط.
  if (url.origin === self.location.origin) {
    // أصول Vite المُهشّمة: غير قابلة للتغيّر — cache-first يوفّر بيانات الجوال
    // (stale-while-revalidate كان يعيد تنزيلها في الخلفية عند كل زيارة).
    const immutable = url.pathname.startsWith('/assets/')
    event.respondWith(
      caches.open(RUNTIME).then(async (cache) => {
        // البحث في كل الكاشات: أصول الإقلاع المُخزّنة مسبقًا تعيش في كاش القشرة لا التشغيل.
        // ignoreVary: الخوادم قد تعيد Vary: Origin وسكربتات module ترسل Origin بينما
        // precache لا يرسله — بدون التجاهل يفشل التطابق ويتعطّل الفتح دون اتصال.
        const cached = await caches.match(request, { ignoreVary: true })
        if (cached && immutable) return cached
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
