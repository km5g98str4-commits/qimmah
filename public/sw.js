/* عامل خدمة قِمّة — قشرة تطبيق تعمل دون اتصال (offline app-shell).
 * الإستراتيجية:
 *  - التنقّلات (HTML): الشبكة أولًا **بمهلة** ثم index.html المخزّن.
 *  - أصول Vite المُهشّمة (/assets/): cache-first — اسم الملف يتغيّر بتغيّر المحتوى.
 *  - بقية أصول نفس الأصل (أيقونات/صور/GIF): stale-while-revalidate.
 * الإصدار يُحقن آليًا وقت البناء (هاش الـ commit) — كل نشر يُبطل كاش النشرة السابقة
 * ويعيد تخزين القشرة، فلا يعلق مستخدم على index.html قديم. (انظر vite.config.ts)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * [QIM-WEB-HOTFIX-002] — ثلاثة أحكام صريحة أُضيفت بعد عطل إنتاج P0:
 *
 * ١) **الحالة 200 وحدها ليست إذنًا بالتخزين.** كان الشرط `status === 200` فقط،
 *    فحين ابتلع SPA fallback طلبَ حزمة مفقودة وأعاد «200 + HTML»، خزّن العامل
 *    صفحةَ HTML تحت عنوان ملف JS. ومسارات `/assets/` عنده cache-first — فيصير
 *    العطل **لزجًا عبر التحديثات** لا عابرًا.
 * ٢) **الأصل المفقود يفشل بصدق.** لا نستبدل ردًّا فاشلًا بنسخة مخزّنة قد تكون
 *    مسمومة، ولا نتظاهر بالنجاح.
 * ٣) **للتنقّل مهلة.** `fetch` بلا مهلة يعلّق الصفحة بلا حدّ على شبكة مخنوقة
 *    والقشرة السليمة حاضرة في الكاش بلا استعمال. ومع ذلك: **5xx يمرّ كما هو**
 *    ولا يُخفى خلف القشرة — الفشل الصادق أولى من نجاح متنكّر.
 * ───────────────────────────────────────────────────────────────────────────
 */
const VERSION = 'qimmah-__SW_VERSION__'
const APP_SHELL = `${VERSION}-shell`
const RUNTIME = `${VERSION}-runtime`

/** مهلة جلب التنقّل قبل الرجوع إلى القشرة المخزّنة. */
const NAVIGATION_TIMEOUT_MS = 6000

// أصول الإقلاع المُهشّمة — يحقنها البناء (vite.config.ts) من dist/index.html، كي
// تعمل القشرة دون اتصال من أول زيارة (لا انتظار لزيارة ثانية تملأ كاش التشغيل).
const PRECACHE_ASSETS = __SW_PRECACHE_ASSETS__

// قشرة **لازمة**: بدونها لا إقلاع دون اتصال، ففشلها يُفشل التثبيت عمدًا.
const REQUIRED_URLS = ['/', '/index.html', ...PRECACHE_ASSETS]

// ملحقات **اختيارية**: أيقونات وبيان التطبيق. غيابها لا يستحق إسقاط التثبيت
// كلّه — `addAll` ذرّية، فأي 404 واحد فيها كان يمنع عمل التطبيق دون اتصال تمامًا.
const OPTIONAL_URLS = [
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
]

/**
 * نوع المحتوى المتوقَّع لهذا الطلب.
 *
 * لا نتّكل على `request.destination` وحده: طلبات `fetch()` تأتي بوجهة فارغة،
 * وهي بالضبط الحالة التي يُطلب فيها ملف حزمة برمجيًا. فنُسند إليها امتداد المسار.
 */
function expectedKind(request, url) {
  const dest = request.destination
  if (dest === 'document') return 'document'
  if (dest === 'script' || /\.m?js$/i.test(url.pathname)) return 'script'
  if (dest === 'style' || /\.css$/i.test(url.pathname)) return 'style'
  if (dest === 'image' || /\.(png|jpe?g|gif|svg|webp|avif|ico)$/i.test(url.pathname)) return 'image'
  return 'other'
}

/**
 * هل يجوز تخزين هذا الردّ تحت هذا الطلب؟
 *
 * **الحكم الحاكم:** HTML لا يُخزَّن أبدًا تحت عنوان أصل. هذا نصًّا ما ينتجه
 * SPA fallback حين تختفي حزمة، وتخزينه هو ما يحوّل عطلًا عابرًا إلى عطل دائم.
 */
function mayCache(request, url, response) {
  if (!response || !response.ok || response.type !== 'basic') return false

  const kind = expectedKind(request, url)
  const contentType = (response.headers.get('content-type') || '').toLowerCase()

  // صفحة HTML تحت عنوان أصل ⇒ رفض قاطع مهما كانت الحالة.
  if (kind !== 'document' && contentType.includes('text/html')) return false

  if (kind === 'script') return /javascript|ecmascript/.test(contentType)
  if (kind === 'style') return contentType.includes('text/css')
  if (kind === 'image') return contentType.startsWith('image/')
  return true
}

/** `fetch` بمهلة — يُلغى الطلب عند تجاوزها فيسقط إلى معالج الفشل. */
function fetchWithTimeout(request, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer))
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL)
      .then(async (cache) => {
        // اللازم أولًا وذرّيًا: إن سقط، سقط التثبيت — ولا نَعِد بعملٍ دون اتصال لا نملكه.
        await cache.addAll(REQUIRED_URLS)
        // ثم الاختياري كلٌّ على حدة: فشل واحد لا يُسقط البقية.
        await Promise.all(
          OPTIONAL_URLS.map((u) => cache.add(u).catch(() => undefined)),
        )
      })
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

/**
 * التنقّل: الشبكة أولًا بمهلة، والقشرة المخزّنة شبكةَ أمان.
 *
 * ما لا تفعله عمدًا: **لا تبتلع 5xx**. الخادم المعطوب يجب أن يُرى معطوبًا؛
 * تقديم القشرة فوقه يعطي مستخدمًا يظنّ التطبيق سليمًا وخلفه خادم ساقط.
 * القشرة تُقدَّم عند **انقطاع أو مهلة** فقط — وهي حالة «لا جواب» لا «جواب سيّئ».
 */
async function handleNavigation(request) {
  const shell = await caches.match('/index.html', { ignoreSearch: true })
  try {
    return await fetchWithTimeout(request, NAVIGATION_TIMEOUT_MS)
  } catch (err) {
    if (shell) return shell
    throw err
  }
}

/** أصول نفس الأصل — cache-first للمُهشّم، stale-while-revalidate لغيره. */
async function handleAsset(request, url) {
  // البحث في كل الكاشات: أصول الإقلاع المُخزّنة مسبقًا تعيش في كاش القشرة لا التشغيل.
  // ignoreVary: الخوادم قد تعيد Vary: Origin وسكربتات module ترسل Origin بينما
  // precache لا يرسله — بدون التجاهل يفشل التطابق ويتعطّل الفتح دون اتصال.
  const cached = await caches.match(request, { ignoreVary: true })

  // أصول Vite المُهشّمة غير قابلة للتغيّر: اسم الملف يتغيّر بتغيّر المحتوى.
  if (cached && url.pathname.startsWith('/assets/')) return cached

  const network = fetchWithTimeout(request, NAVIGATION_TIMEOUT_MS)
    .then(async (response) => {
      if (mayCache(request, url, response)) {
        const cache = await caches.open(RUNTIME)
        await cache.put(request, response.clone())
      }
      // الردّ يمرّ كما هو — بما فيه 404. الأصل المفقود يفشل بصدق، ولا يُستبدل
      // بنسخة مخزّنة قد تكون هي نفسها المسمومة.
      return response
    })
    .catch((err) => {
      if (cached) return cached
      throw err
    })

  return cached || network
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request))
    return
  }

  if (url.origin === self.location.origin) {
    event.respondWith(handleAsset(request, url))
  }
})
