// P12 — جلب GIFs الناقصة (46) من WorkoutX v1 (مُصادَق عليه بمفتاح wx_ الجديد).
//
// الشكل المؤكّد (probe زياد 2026-07-03، HTTP 200):
//   • GET https://api.workoutxapp.com/v1/exercises — ترويسة X-WorkoutX-Key بالمفتاح خامًا
//   • الاستجابة مُقسَّمة صفحات: {total: 1327, count: N, data: [...]} — يجب جمع كل الصفحات
//   • المطابقة محليًا على القائمة الكاملة، والتنزيل من gifUrl — التنزيل يتطلب المفتاح أيضًا (يُحتسب)
//
// درسا P12: (1) لا endpoint بحث — 46×404. (2) لا افتراض «قائمة واحدة» — v1 مُقسَّم.
// القاعدة: ‎--probe أولًا دائمًا؛ يكشف حجم الصفحة ويطبع العدد الكلي المخطّط ثم يتوقف.
//
// الأوضاع:
//   node scripts/p12-fetch-gifs.mjs --dry-run   ← بلا شبكة: يطبع الخطة والعدّاد
//   WORKOUTX_API_KEY=x node scripts/p12-fetch-gifs.mjs --probe   ← طلب واحد: حالة+جسم خام، ثم يتوقف
//   WORKOUTX_API_KEY=x node scripts/p12-fetch-gifs.mjs           ← التشغيل الكامل (عتبة 0.85)
//   WORKOUTX_API_KEY=x node scripts/p12-fetch-gifs.mjs --approved ← ينزّل الـ١٧ المعتمدة يدويًا فقط
//
// idempotent: يتخطّى أي ملف موجود في public/exercise-gifs/. غير الموجود في WorkoutX → تخطٍّ وتسجيل.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const LOCAL_DIR = resolve(ROOT, 'public/exercise-gifs')

const KEY = process.env.WORKOUTX_API_KEY || ''
const BASE = 'https://api.workoutxapp.com'
// probe زياد 2026-07-03: ‎/v1/exercises هو المسار الحقيقي (401 = موجود لكن المصادقة مرفوضة)،
// وبقية المسارات 404 «Route not found» — لذلك v1 أولًا ولا نجرّب 404ات معروفة افتراضيًا.
const CANDIDATE_PATHS = ['/v1/exercises']
// آلية المصادقة الأصلية (P5): المفتاح خامًا في X-WorkoutX-Key. فشلت اليوم بـ401
// «Invalid API key format» → يبدو أن WorkoutX غيّرت المخطط. بعد التحقق من لوحة/وثائق
// WorkoutX اضبط الشكل الصحيح عبر البيئة دون تعديل كود:
//   WORKOUTX_AUTH_HEADER=Authorization WORKOUTX_AUTH_PREFIX='Bearer ' bash scripts/p12-fetch-gifs.sh --probe
const AUTH_HEADER = process.env.WORKOUTX_AUTH_HEADER || 'X-WorkoutX-Key'
const AUTH_PREFIX = process.env.WORKOUTX_AUTH_PREFIX || ''
// سقف صارم لكل الطلبات الموقَّعة بالمفتاح — قائمة + تنزيلات gif (v1 يتطلب المفتاح عليها ويُحتسبان).
// تشغيل كامل بلا كاش = 133 صفحة + ~46 تنزيلًا ≈ 179؛ السقف 200 يسمح به ويمنع أي جموح أبعد.
// (الحصّة الدائمة عند آخر قراءة: 335.)
const HARD_CAP = 200

const DRY_RUN = process.argv.includes('--dry-run')
const PROBE = process.argv.includes('--probe')
const CANDIDATES = process.argv.includes('--candidates')
const APPROVED_MODE = process.argv.includes('--approved')

// موافقات زياد اليدوية من جدول المرشّحات (2026-07): slug → اسم مدخل الكتالوج **بالضبط**.
// --approved ينزّل هذه الـ١٧ فقط بمطابقة اسم دقيقة (لا مطابقة ضبابية) — كل واحد اعتمده زياد بعينه.
// المرفوضة (تبقى placeholder، لا تُنزَّل): lateral-raise-machine, reverse-pec-deck,
// glute-drive-machine, glute-kickback-machine, hip-adductor-machine, pendulum-squat-machine,
// single-arm-lat-pulldown, chest-supported-row-machine, iso-lateral-incline-press.
const APPROVED = {
  'assisted-dip-machine': 'Assisted Triceps Dip kneeling',
  'incline-chest-press-machine': 'Lever Incline Chest Press',
  'iso-lateral-chest-press': 'Lever Chest Press',
  'iso-lateral-high-row': 'Lever One Arm Lateral High Row',
  'iso-lateral-pulldown': 'Cable Bar Lateral Pulldown',
  'lat-pulldown-machine': 'Cable Pulldown pro Lat Bar',
  'leg-extension-machine': 'Lever Leg Extension',
  'leg-press-machine': 'Sled 45° Leg Press',
  'lying-leg-curl': 'Lever Lying Leg Curl',
  'rear-delt-row-machine': 'Barbell Rear Delt Row',
  'seated-row-machine': 'Cable Seated High Row v-bar',
  'standing-hip-extension-machine': 'Cable Standing Hip Extension',
  'standing-leg-curl': 'Standing Single Leg Curl',
  'triceps-extension-machine': 'Assisted Standing Triceps Extension with Towel',
  'wide-grip-iso-lateral-pulldown': 'Lever One Arm Lateral Wide Pulldown',
  'wide-grip-lat-pulldown': 'Twin Handle Parallel Grip Lat Pulldown',
  'ab-crunch-machine': 'Cable Kneeling Crunch',
}

// ── القائمة الناقصة: slug | اسم البحث EN | عضلة تقريبية (لمكافأة المطابقة) ──
const MISSING = [
  ['ab-crunch-machine', 'Ab Crunch Machine', 'core'],
  ['assisted-dip-machine', 'Assisted Dip Machine', 'triceps'],
  ['cable-hammer-curl', 'Cable Hammer Curl', 'biceps'],
  ['cable-hip-adduction', 'Cable Hip Adduction', 'glutes'],
  ['cable-overhead-extension', 'Cable Overhead Triceps Extension', 'triceps'],
  ['cable-shoulder-press', 'Cable Shoulder Press', 'shoulders'],
  ['cable-woodchop', 'Cable Woodchop', 'core'],
  ['chest-supported-row', 'Chest Supported Dumbbell Row', 'back'],
  ['chest-supported-row-machine', 'Chest Supported Row Machine', 'back'],
  ['close-grip-pulldown', 'Close Grip Pulldown', 'back'],
  ['decline-dumbbell-press', 'Decline Dumbbell Press', 'chest'],
  ['dumbbell-kickback', 'Dumbbell Triceps Kickback', 'triceps'],
  ['dumbbell-rdl', 'Dumbbell Romanian Deadlift', 'hamstrings'],
  ['dumbbell-sumo-squat', 'Dumbbell Sumo Squat', 'quads'],
  ['face-pull', 'Face Pull', 'shoulders'],
  ['glute-drive-machine', 'Glute Drive Machine', 'glutes'],
  ['glute-kickback-machine', 'Glute Kickback Machine', 'glutes'],
  ['goblet-squat', 'Goblet Squat', 'quads'],
  ['hip-adductor-machine', 'Hip Adductor Machine', 'glutes'],
  ['incline-cable-fly', 'Incline Cable Fly', 'chest'],
  ['incline-chest-press-machine', 'Incline Chest Press Machine', 'chest'],
  ['incline-dumbbell-press', 'Incline Dumbbell Press', 'chest'],
  ['iso-lateral-chest-press', 'Iso Lateral Chest Press', 'chest'],
  ['iso-lateral-high-row', 'Iso Lateral High Row', 'back'],
  ['iso-lateral-incline-press', 'Iso Lateral Incline Press', 'chest'],
  ['iso-lateral-pulldown', 'Iso Lateral Pulldown', 'back'],
  ['lat-pulldown-machine', 'Lat Pulldown', 'back'],
  ['lateral-raise', 'Dumbbell Lateral Raise', 'shoulders'],
  ['lateral-raise-machine', 'Machine Lateral Raise', 'shoulders'],
  ['leg-extension-machine', 'Leg Extension', 'quads'],
  ['leg-press-machine', 'Leg Press', 'quads'],
  ['lying-leg-curl', 'Lying Leg Curl', 'hamstrings'],
  ['pendulum-squat-machine', 'Pendulum Squat', 'quads'],
  ['rear-delt-row-machine', 'Rear Delt Row Machine', 'shoulders'],
  ['reverse-pec-deck', 'Reverse Pec Deck', 'shoulders'],
  ['seated-dumbbell-press', 'Seated Dumbbell Shoulder Press', 'shoulders'],
  ['seated-row-machine', 'Seated Row Machine', 'back'],
  ['single-arm-cable-row', 'Single Arm Cable Row', 'back'],
  ['single-arm-lat-pulldown', 'Single Arm Lat Pulldown', 'back'],
  ['single-leg-calf-raise', 'Single Leg Calf Raise', 'calves'],
  ['sissy-squat', 'Sissy Squat', 'quads'],
  ['standing-hip-extension-machine', 'Standing Hip Extension', 'glutes'],
  ['standing-leg-curl', 'Standing Leg Curl', 'hamstrings'],
  ['triceps-extension-machine', 'Machine Triceps Extension', 'triceps'],
  ['wide-grip-iso-lateral-pulldown', 'Wide Grip Iso Lateral Pulldown', 'back'],
  ['wide-grip-lat-pulldown', 'Wide Grip Lat Pulldown', 'back'],
]

// ── أدوات منقولة حرفيًا من السكربت المُثبت (fetch-workoutx-media.mjs) ──
let reqCount = 0
let quotaExhausted = false

function redact(s) {
  if (!KEY) return String(s)
  return String(s).split(KEY).join('«REDACTED-KEY»')
}

// ── حصّة وحدود ──
// x-quota-remaining  = الحصّة الدائمة (مدى الحياة) — إشارة التوقف الوحيدة للميزانية.
// x-ratelimit-remaining = حد الدقيقة (30/د، يتصفّر كل دقيقة) — ليس نفاد حصّة! ننتظر ونكمل.
// (حادثة 2026-07-03 الثالثة: الخلط بينهما أوقف الزحف عند صفحة 30/133 والحصّة 468.)
const RATE_WAIT_MS = Number(process.env.WORKOUTX_RATE_WAIT_MS || 65_000)
const MIN_SPACING_MS = Number(process.env.WORKOUTX_SPACING_MS || 2_400) // ~25 طلبًا/دقيقة استباقيًا
let lastReqAt = 0
let rateRemaining = Infinity

const hdrNum = (res, name) => {
  const v = res.headers.get(name)
  const n = Number(v)
  return v == null || Number.isNaN(n) ? null : n
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function apiFetch(path) {
  if (quotaExhausted) throw new Error('توقّف: الحصّة الدائمة (x-quota-remaining) نفدت.')
  for (;;) {
    if (reqCount >= HARD_CAP) throw new Error(`توقّف: بلغنا سقف الميزانية الصارم (${HARD_CAP} طلب).`)
    // تهدئة استباقية (~25/د) + انتظار حد الدقيقة إن تصفّر
    const spacing = lastReqAt + MIN_SPACING_MS - Date.now()
    if (spacing > 0) await sleep(spacing)
    if (rateRemaining <= 0) {
      console.log(`    ⏸ حد الدقيقة (x-ratelimit) وصل صفرًا — انتظار ${Math.round(RATE_WAIT_MS / 1000)} ثانية ثم متابعة…`)
      await sleep(RATE_WAIT_MS)
      rateRemaining = Infinity
    }
    reqCount++
    lastReqAt = Date.now()
    const url = path.startsWith('http') ? path : BASE + path
    const res = await fetch(url, { headers: { [AUTH_HEADER]: AUTH_PREFIX + KEY, Accept: 'application/json' } })
    const quota = hdrNum(res, 'x-quota-remaining')
    const rate = hdrNum(res, 'x-ratelimit-remaining')
    if (rate != null) rateRemaining = rate
    console.log(`  → [req ${reqCount}/${HARD_CAP}] GET ${url}${quota != null ? ` • حصّة دائمة: ${quota}` : ''}${rate != null ? ` • حد الدقيقة: ${rate}` : ''}`)
    if (quota != null && quota <= 0) {
      quotaExhausted = true
      console.warn('    ⛔ الحصّة الدائمة نفدت (x-quota-remaining ≤ 0) — إيقاف كل طلبات WorkoutX.')
      return { res }
    }
    if (res.status === 429) {
      console.log(`    ⏸ HTTP 429 — إيقاف مؤقت ${Math.round(RATE_WAIT_MS / 1000)} ثانية ثم إعادة المحاولة (rate limit pause, resuming…)`)
      await sleep(RATE_WAIT_MS)
      rateRemaining = Infinity
      continue
    }
    return { res }
  }
}

function extractList(data) {
  if (Array.isArray(data)) return data
  for (const k of ['exercises', 'data', 'results', 'items', 'list']) {
    if (Array.isArray(data?.[k])) return data[k]
  }
  return []
}

function extractGifUrl(entry) {
  if (!entry || typeof entry !== 'object') return ''
  for (const k of ['gifUrl', 'gif', 'animatedUrl', 'animation', 'gifAsset', 'gif_url']) {
    if (typeof entry[k] === 'string' && /\.gif(\?|$)/i.test(entry[k])) return entry[k]
    if (typeof entry[k] === 'string' && entry[k].startsWith('http')) return entry[k]
  }
  for (const k of ['imageUrl', 'image', 'media', 'thumbnail', 'url']) {
    if (typeof entry[k] === 'string' && /\.gif(\?|$)/i.test(entry[k])) return entry[k]
  }
  return ''
}

function extractName(entry) {
  for (const k of ['name', 'exercise', 'title', 'nameEn', 'exerciseName']) {
    if (typeof entry?.[k] === 'string' && entry[k].trim()) return entry[k]
  }
  return ''
}

const MUSCLE_MAP = {
  chest: ['chest'], back: ['lats', 'middle back', 'lower back', 'traps'],
  shoulders: ['shoulders', 'traps'], biceps: ['biceps', 'forearms'], triceps: ['triceps'],
  quads: ['quadriceps'], hamstrings: ['hamstrings', 'glutes'], glutes: ['glutes', 'hamstrings'],
  calves: ['calves'], core: ['abdominals'],
}
const TOKEN_ALIAS = {
  pushup: 'pushups', pullup: 'pullups', chinup: 'pullups', ez: 'e-z', glute: 'glutes',
  ham: 'leg', crunch: 'crunches', raise: 'raises', extension: 'extensions', abs: 'crunches',
  fly: 'flyes', dip: 'dips', swing: 'swings',
}
const STOP = new Set(['the', 'a', 'with', 'and', 'of', 'to', 'for', 'on', 'machine'])
function tokens(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ')
    .map((t) => t.trim()).filter((t) => t && !STOP.has(t)).map((t) => TOKEN_ALIAS[t] || t)
}

function bestGif(nameEn, muscle, catalog) {
  const qTok = tokens(nameEn)
  const want = MUSCLE_MAP[muscle] || []
  let best = null
  for (const c of catalog) {
    if (!c.url) continue
    const cSet = new Set(tokens(c.name))
    const hit = qTok.filter((t) => cSet.has(t)).length
    const coverage = qTok.length ? hit / qTok.length : 0
    const muscleTok = new Set(tokens((c.muscles || []).join(' ')))
    const muscleBonus = want.some((w) => muscleTok.has(w)) ? 0.1 : 0
    const score = coverage + muscleBonus
    if (!best || score > best.score) best = { url: c.url, name: c.name, coverage, score }
  }
  return best && best.coverage >= 0.66 ? best : null
}

// أفضل n مرشّحات (اسم + تغطية + رابط) لمراجعة زياد اليدوية — بلا حد أدنى.
function topGifs(nameEn, muscle, catalog, n = 3) {
  const qTok = tokens(nameEn)
  const want = MUSCLE_MAP[muscle] || []
  const scored = []
  for (const c of catalog) {
    if (!c.url) continue
    const cSet = new Set(tokens(c.name))
    const hit = qTok.filter((t) => cSet.has(t)).length
    const coverage = qTok.length ? hit / qTok.length : 0
    const muscleTok = new Set(tokens((c.muscles || []).join(' ')))
    const muscleBonus = want.some((w) => muscleTok.has(w)) ? 0.1 : 0
    scored.push({ name: c.name, url: c.url, coverage, score: coverage + muscleBonus })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, n)
}

// عتبة التنزيل التلقائي (قرار زياد P12): لا تنزيل تلقائي دون هذه التغطية — تُدرَج مرشّحاتها
// للموافقة اليدوية بدل تنزيلها. عدّلها عبر WORKOUTX_COVERAGE_MIN عند الحاجة.
const COVERAGE_MIN = Number(process.env.WORKOUTX_COVERAGE_MIN || 0.85)

// أجهزة الموافقة اليدوية = الأساسيات الـ٣٢ + الأجهزة الست للإضافات (قرار زياد: الإضافات
// تظهر في كل خطة الآن فتُعامَل مثل الأساسيات في جدول الموافقة اليدوية للصور).
// الأساسيات تُقرأ من machineCatalog.ts كي لا تنجرف؛ الإضافات ثابتة (الأجهزة الست).
const ACCESSORY_MACHINE_IDS = [
  'preacher-curl-machine', 'cable-biceps-curl', 'triceps-extension-machine',
  'cable-triceps-pushdown', 'ab-crunch-machine', 'cable-crunch',
]
const PRIMARY_IDS = (() => {
  try {
    const src = readFileSync(resolve(ROOT, 'src/data/machineCatalog.ts'), 'utf8')
    const block = src.slice(src.indexOf('PRIMARY_MACHINE_IDS'), src.indexOf('primaryMachineIdSet'))
    const ids = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1])
    return new Set([...ids, ...ACCESSORY_MACHINE_IDS])
  } catch { return new Set(ACCESSORY_MACHINE_IDS) }
})()

// يكتب/يحدّث قسم مرشّحات GIF للأساسيات داخل P12_ASSETS.md بين علامتين ثابتتين.
function writeCandidatesDoc(rows) {
  const docPath = resolve(ROOT, 'docs/product/P12_ASSETS.md')
  const START = '<!--P12_GIF_CANDIDATES:START-->'
  const END = '<!--P12_GIF_CANDIDATES:END-->'
  let doc
  try { doc = readFileSync(docPath, 'utf8') } catch { return }
  const lines = ['', '### مرشّحات GIF للأجهزة بلا صورة — أساسيات + إضافات (top-3، للموافقة اليدوية)', '',
    '> مولّد آليًا بـ `node scripts/p12-fetch-gifs.mjs --candidates` على جهاز فيه كاش الزحف. راجع كل صف واعتمد الأنسب يدويًا.', '',
    '| الجهاز (placeholder) | مرشّح ١ (تغطية) | مرشّح ٢ | مرشّح ٣ |', '|---|---|---|---|']
  for (const r of rows) {
    const c = r.candidates
    const cell = (x) => (x ? `«${x.name}» (${x.coverage.toFixed(2)})` : '—')
    lines.push(`| \`${r.slug}\` | ${cell(c[0])} | ${cell(c[1])} | ${cell(c[2])} |`)
  }
  const section = `${START}\n${lines.join('\n')}\n${END}`
  if (doc.includes(START) && doc.includes(END)) {
    doc = doc.replace(new RegExp(`${START}[\\s\\S]*?${END}`), section)
  } else {
    doc += `\n\n${section}\n`
  }
  writeFileSync(docPath, doc)
  console.log(`▶ كُتبت ${rows.length} مرشّحًا في docs/product/P12_ASSETS.md (بين علامتَي P12_GIF_CANDIDATES).`)
}

async function downloadGif(url, absPath) {
  if (existsSync(absPath)) return 'exists'
  try {
    // v1 يتطلب المفتاح على تنزيلات gif أيضًا (401 بدونه — حادثة 2026-07-03 الرابعة)،
    // لذلك نمرّرها عبر apiFetch: نفس الترويسة + العدّاد + التهدئة + طباعة الحصّة لكل تنزيل.
    const { res } = await apiFetch(url)
    if (!res.ok) { console.warn(`    ⚠ فشل تنزيل gif ${redact(url)} (${res.status})`); return false }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length === 0) { console.warn(`    ⚠ gif فارغ ${redact(url)}`); return false }
    mkdirSync(dirname(absPath), { recursive: true })
    writeFileSync(absPath, buf)
    return true
  } catch (e) {
    console.warn(`    ⚠ خطأ تنزيل gif (${e.message})`); return false
  }
}

// ── ترقيم الصفحات (v1) ──
const PATH = '/v1/exercises'
const TARGET_DETECT_LIMIT = 1000 // نطلب سقفًا كبيرًا؛ الواجهة تعيد count الفعلي (كشف الحد الأقصى بطلب واحد).
const MAX_COMFORT_REQUESTS = 15 // هدف زياد: القائمة كاملة في ≤ 15 طلبًا وإلا توقف وتأكيد.
const ALLOW_MANY_PAGES = process.env.WORKOUTX_ALLOW_PAGES === '1' // تجاوز صريح بعد تأكيد الميزانية.

function toCatalog(list) {
  return list.map((e) => ({
    name: extractName(e),
    url: extractGifUrl(e),
    muscles: [e.muscle, e.primaryMuscle, e.target, ...(Array.isArray(e.muscles) ? e.muscles : [])].filter(Boolean),
  })).filter((c) => c.name && c.url)
}

async function fetchJsonPage(query) {
  const { res } = await apiFetch(`${PATH}${query}`)
  const raw = await res.text()
  if (res.status !== 200) throw new Error(`${PATH}${query} → HTTP ${res.status}: ${redact(raw).slice(0, 200)}`)
  let data
  try { data = JSON.parse(raw) } catch { throw new Error(`${PATH}${query}: الاستجابة ليست JSON`) }
  const entries = extractList(data)
  const total = Number(data.total ?? data.totalCount ?? data.total_count ?? NaN)
  const cursorKeys = ['next', 'nextCursor', 'next_cursor', 'cursor', 'nextPage', 'links'].filter((k) => data[k] != null)
  return { entries, total: Number.isNaN(total) ? null : total, count: entries.length, cursorKeys, raw }
}

/**
 * يكشف الترقيم بأقل الطلبات:
 *  ط1: ?limit=1000 → count المعاد = حجم الصفحة الفعلي (وربما القائمة كلها).
 *  ط2 (عند الحاجة): ?limit=<eff>&offset=<eff> — إن اختلف أول مدخل → offset يعمل؛
 *  وإلا ط3: ?limit=<eff>&page=2. يعيد {pageSize, total, mode, firstPages}.
 */
async function detectPagination() {
  const p1 = await fetchJsonPage(`?limit=${TARGET_DETECT_LIMIT}`)
  const pageSize = p1.count
  const total = p1.total ?? p1.count
  if (p1.cursorKeys.length) console.log(`  ℹ حقول ترقيم في الجسم: ${p1.cursorKeys.join(', ')}`)
  if (pageSize >= total) return { pageSize, total, mode: 'single', pages: [p1.entries] }

  const firstName = extractName(p1.entries[0] ?? {})
  const p2 = await fetchJsonPage(`?limit=${pageSize}&offset=${pageSize}`)
  if (p2.count && extractName(p2.entries[0] ?? {}) !== firstName)
    return { pageSize, total, mode: 'offset', pages: [p1.entries, p2.entries] }

  const p3 = await fetchJsonPage(`?limit=${pageSize}&page=2`)
  if (p3.count && extractName(p3.entries[0] ?? {}) !== firstName)
    return { pageSize, total, mode: 'page', pages: [p1.entries, p3.entries] }

  throw new Error('تعذّر كشف معامل الترقيم (لا offset ولا page غيّرا الصفحة) — توقف وراجع وثائق WorkoutX.')
}

function plannedTotalRequests(det) {
  const totalPages = Math.ceil(det.total / det.pageSize)
  const already = det.pages.length
  return { totalPages, planned: reqCount + Math.max(0, totalPages - already) }
}

// يجمع القائمة كاملة وفق الترقيم المكتشف (مع بوابة الميزانية).
async function fetchCatalog(det) {
  const { totalPages, planned } = plannedTotalRequests(det)
  if (planned > HARD_CAP) throw new Error(`المخطّط ${planned} طلبًا > السقف الصارم ${HARD_CAP} — توقف.`)
  if (totalPages > MAX_COMFORT_REQUESTS && !ALLOW_MANY_PAGES)
    throw new Error(`حجم الصفحة ${det.pageSize} يتطلب ${totalPages} طلبًا (> ${MAX_COMFORT_REQUESTS}). ` +
      `أكّد الميزانية ثم أعد التشغيل مع WORKOUTX_ALLOW_PAGES=1.`)
  // استئناف فعّال: كاش محلي (غير مُلتزَم) للصفحات المجموعة — إعادة التشغيل لا تعيد الزحف.
  const CACHE = resolve(__dirname, '.p12-catalog-cache.json')
  let all = det.pages.flat()
  let startPage = det.pages.length
  if (existsSync(CACHE)) {
    try {
      const c = JSON.parse(readFileSync(CACHE, 'utf8'))
      if (c.total === det.total && c.pageSize === det.pageSize && c.mode === det.mode && Array.isArray(c.entries) && c.fetchedPages > startPage) {
        all = c.entries
        startPage = c.fetchedPages
        console.log(`▶ استئناف من الكاش: ${startPage}/${totalPages} صفحة (${all.length} مدخلًا) — لا إعادة زحف.`)
      }
    } catch { /* كاش تالف → تجاهل */ }
  }
  const etaMin = (left) => Math.ceil((left * MIN_SPACING_MS) / 60000)
  if (startPage < totalPages)
    console.log(`▶ زحف القائمة: ${totalPages - startPage} صفحة متبقية ≈ ${etaMin(totalPages - startPage)} دقيقة (تهدئة ~25 طلبًا/د).`)
  for (let i = startPage; i < totalPages; i++) {
    const q = det.mode === 'page' ? `?limit=${det.pageSize}&page=${i + 1}` : `?limit=${det.pageSize}&offset=${i * det.pageSize}`
    const pg = await fetchJsonPage(q)
    if (!pg.count) break
    all.push(...pg.entries)
    writeFileSync(CACHE, JSON.stringify({ total: det.total, pageSize: det.pageSize, mode: det.mode, fetchedPages: i + 1, entries: all }))
    console.log(`  📄 صفحة ${i + 1}/${totalPages} (${all.length}/${det.total} مدخلًا) — متبقٍ ≈ ${etaMin(totalPages - i - 1)} د`)
  }
  const catalog = toCatalog(all)
  console.log(`▶ كتالوج WorkoutX كامل: ${all.length}/${det.total} مدخلًا (${catalog.length} يحمل gif) عبر ${reqCount} طلبًا.`)
  return catalog
}

async function main() {
  console.log(`P12 fetch-gifs (v4.1 — v1 مُرقَّم: كاش زحف قابل للاستئناف + تنزيلات موقَّعة بالمفتاح ومحسوبة)`)
  console.log(`ناقص: ${MISSING.length} GIF • v1 مُقسَّم صفحات (total≈1327) — probe يكشف حجم الصفحة ويطبع العدد المخطّط • سقف صارم: ${HARD_CAP}`)

  if (DRY_RUN) {
    console.log(`── DRY RUN (بلا شبكة، بلا مفتاح) ──`)
    MISSING.forEach(([slug, name], i) => {
      const exists = existsSync(resolve(LOCAL_DIR, `${slug}.gif`))
      console.log(`[${i + 1}/${MISSING.length}] (dry) ${slug} ← مطابقة محلية: «${name}»${exists ? ' — موجود، سيُتخطّى' : ''}`)
    })
    console.log(`\n══════════ الخلاصة ══════════`)
    console.log(`DRY RUN: ${MISSING.length} عنصرًا • الطلبات: كشف الترقيم 1–3 + ceil(1327/حجم الصفحة) صفحات (الهدف ≤ 15) + تنزيلات CDN • لا شبكة استُخدمت.`)
    console.log(`✅ الحسم النهائي للعدد في --probe (إلزامي قبل التشغيل الكامل).`)
    return
  }

  if (!KEY) { console.error('KEY MISSING — اضبط WORKOUTX_API_KEY في البيئة.'); process.exit(1) }

  // كاش زحف مكتمل؟ → مطابقة وتنزيل مباشرةً، صفر طلبات قائمة (حتى الكشف لا يلزم).
  if (!PROBE) {
    const CACHE = resolve(__dirname, '.p12-catalog-cache.json')
    if (existsSync(CACHE)) {
      try {
        const c = JSON.parse(readFileSync(CACHE, 'utf8'))
        if (Array.isArray(c.entries) && c.total && c.entries.length >= c.total) {
          console.log(`▶ كاش الزحف مكتمل (${c.entries.length}/${c.total}) — مطابقة وتنزيل مباشرةً، صفر طلبات قائمة.`)
          const catalog = toCatalog(c.entries)
          console.log(`▶ كتالوج WorkoutX من الكاش: ${catalog.length} مدخلًا يحمل gif.`)
          if (APPROVED_MODE) { await runApproved(catalog); return }
          if (CANDIDATES) { runCandidates(catalog); return }
          await matchAndDownload(catalog)
          return
        }
      } catch { /* كاش تالف → مسار الكشف الطبيعي */ }
    }
  }

  // تشخيص سلامة المفتاح (بلا كشفه): الطول + بصمة + كشف مسافات/أسطر تسلّلت من الصدفة.
  const { createHash } = await import('node:crypto')
  const fp = createHash('sha256').update(KEY).digest('hex').slice(0, 8)
  console.log(`Auth: ${AUTH_HEADER}: ${AUTH_PREFIX}«REDACTED len=${KEY.length} sha256:${fp}…»`)
  if (/^\s|\s$/.test(KEY)) console.warn('⚠ المفتاح يبدأ/ينتهي بمسافة أو سطر جديد — نظّفه (السبب الشائع لـ«Invalid API key format»).')
  if (/[\r\n]/.test(KEY)) console.warn('⚠ المفتاح يحوي سطرًا جديدًا داخليًا — انسخه من المصدر مباشرة.')

  const det = await detectPagination()
  const { totalPages, planned } = plannedTotalRequests(det)
  console.log(`▶ الترقيم: total=${det.total} • حجم الصفحة الفعلي=${det.pageSize} • النمط=${det.mode} • الصفحات=${totalPages}`)
  console.log(`▶ إجمالي طلبات API المخطّط للتشغيل الكامل: ${planned} (المستهلك في الكشف: ${reqCount})`)

  if (PROBE) {
    const sampled = toCatalog(det.pages.flat())
    const probeHit = bestGif('Hack Squat', 'quads', sampled)
    console.log(`\n── PROBE — مطابقة Hack Squat على الصفحات المُحمَّلة (${sampled.length} مدخلًا) ──`)
    console.log(probeHit
      ? `✅ وجدنا «${probeHit.name}» بتغطية ${probeHit.coverage.toFixed(2)}.`
      : `ℹ غير موجود في العيّنة المُحمَّلة (${det.pages.length} صفحة من ${totalPages}) — طبيعي مع الترقيم؛ التشغيل الكامل يبحث في الكل.`)
    if (totalPages > MAX_COMFORT_REQUESTS)
      console.log(`⚠ الصفحات (${totalPages}) تتجاوز هدف ≤ ${MAX_COMFORT_REQUESTS} — التشغيل الكامل سيتوقف ما لم تضبط WORKOUTX_ALLOW_PAGES=1 بعد تأكيد الميزانية.`)
    console.log(`ℹ --probe: توقّف. طلبات API المستهلكة: ${reqCount}.`)
    return
  }

  const catalog = await fetchCatalog(det)

  if (APPROVED_MODE) { await runApproved(catalog); return }
  if (CANDIDATES) { runCandidates(catalog); return }
  await matchAndDownload(catalog)
}


// المطابقة + التنزيل + جدول مراجعة المطابقات (تغطية < 1.00 تُطبع لمراجعة زياد اليدوية).
async function matchAndDownload(catalog) {
  let downloaded = 0, skipped = 0, notfound = []
  const review = []       // تغطية بين العتبة و١.٠٠ — نُزّلت لكن راجعها بصريًا
  const belowThreshold = [] // تحت العتبة — لم تُنزَّل، مرشّحاتها للموافقة اليدوية
  for (const [i, [slug, name, muscle]] of MISSING.entries()) {
    const out = resolve(LOCAL_DIR, `${slug}.gif`)
    if (existsSync(out)) { console.log(`[${i + 1}/${MISSING.length}] ⏭ ${slug} — موجود.`); skipped++; continue }
    const hit = bestGif(name, muscle, catalog)
    if (!hit) { console.log(`[${i + 1}/${MISSING.length}] ✗ ${slug} — لا مطابقة في WorkoutX (تخطٍّ، لا فشل).`); notfound.push(slug); continue }
    // بوابة العتبة (قرار زياد): لا تنزيل تلقائي دون COVERAGE_MIN — نجمع المرشّحات للموافقة.
    if (hit.coverage < COVERAGE_MIN) {
      const cands = topGifs(name, muscle, catalog, 3)
      belowThreshold.push({ slug, isPrimary: PRIMARY_IDS.has(slug), candidates: cands })
      console.log(`[${i + 1}/${MISSING.length}] ⏸ ${slug} — أفضل تغطية ${hit.coverage.toFixed(2)} < عتبة ${COVERAGE_MIN} → لا تنزيل تلقائي (مرشّحات للموافقة).`)
      continue
    }
    if (hit.coverage < 1) review.push({ slug, matched: hit.name, coverage: hit.coverage })
    console.log(`[${i + 1}/${MISSING.length}] ⬇ ${slug} ← «${hit.name}» (تغطية ${hit.coverage.toFixed(2)})`)
    const ok = await downloadGif(hit.url, out)
    if (ok === true) downloaded++
    else if (ok === 'exists') skipped++
    else notfound.push(slug)
  }

  console.log(`\n══════════ الخلاصة ══════════`)
  console.log(`نزّلنا: ${downloaded} • تخطّينا (موجود): ${skipped} • غير موجود/فشل: ${notfound.length} • تحت العتبة (بلا تنزيل): ${belowThreshold.length}`)
  if (notfound.length) console.log(`غير الموجود: ${notfound.join(', ')}`)
  if (review.length) {
    console.log(`\n⚠ مراجعة المطابقات (عتبة ≤ تغطية < 1.00) — نُزّلت، راجعها بصريًا (MATCH_REVIEW في P12_ASSETS.md):`)
    for (const r of review) console.log(`  • ${r.slug} ← «${r.matched}» (${r.coverage.toFixed(2)})`)
  }
  // مرشّحات الأجهزة (أساسيات + إضافات) تحت العتبة → للموافقة اليدوية (قرار زياد 2b/rec3).
  const primPending = belowThreshold.filter((b) => b.isPrimary)
  if (primPending.length) {
    console.log(`\n⚠ ${primPending.length} جهازًا (أساسي/إضافة) دون عتبة التنزيل — مرشّحاتها (top-3) للموافقة اليدوية:`)
    for (const b of primPending) {
      const c = b.candidates.map((x) => `«${x.name}» ${x.coverage.toFixed(2)}`).join(' | ')
      console.log(`  • ${b.slug}: ${c || '(لا مرشّح)'}`)
    }
    writeCandidatesDoc(primPending)
  }
  console.log(`طلبات API المستهلكة هذه الجولة: ${reqCount} (تشمل تنزيلات gif — كلها موقَّعة بالمفتاح).`)
  console.log(`التالي: راجع المرشّحات في P12_ASSETS.md ثم node scripts/p12-sync-gifs.mjs && npm run build`)
}

// وضع --candidates: لكل جهاز (أساسي أو إضافة) بلا GIF محلي، اطبع top-3 واكتبها في P12_ASSETS.md. بلا تنزيل.
function runCandidates(catalog) {
  const rows = []
  for (const [slug, name, muscle] of MISSING) {
    if (!PRIMARY_IDS.has(slug)) continue // أجهزة الموافقة اليدوية (أساسيات + إضافات) فقط
    if (existsSync(resolve(LOCAL_DIR, `${slug}.gif`))) continue // له صورة أصلًا
    rows.push({ slug, candidates: topGifs(name, muscle, catalog, 3) })
  }
  console.log(`\n── مرشّحات ${rows.length} جهازًا (أساسيات + إضافات) بلا GIF (top-3 لكل واحد) ──`)
  for (const r of rows) {
    console.log(`  • ${r.slug}: ${r.candidates.map((x) => `«${x.name}» ${x.coverage.toFixed(2)}`).join(' | ') || '(لا مرشّح)'}`)
  }
  writeCandidatesDoc(rows)
}

// وضع --approved: ينزّل الـ١٧ المعتمدة يدويًا بمطابقة اسم دقيقة من الكتالوج المُخزَّن.
// التنزيلات موقَّعة بالمفتاح ومحسوبة (apiFetch)، idempotent (يتخطّى الموجود)، لا مطابقة ضبابية.
const normName = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim()
async function runApproved(catalog) {
  // خريطة اسم→مدخل من الكتالوج. الموافقة الدقيقة **نهائية**: لا عتبة تغطية، لا مرشّحات،
  // ولا تخطٍّ للموجود — المطابقة الاسمية الدقيقة هي التفويض فتُنزَّل قسريًا (تستبدل أي ملف سابق).
  const byName = new Map()
  for (const c of catalog) {
    const nm = normName(c.name)
    if (nm && !byName.has(nm)) byName.set(nm, c) // أول تطابق يفوز (ثبات)
  }
  const entries = Object.entries(APPROVED)
  console.log(`\n── --approved: ${entries.length} موافقة يدوية — مطابقة اسم دقيقة نهائية (بلا عتبة)، تنزيل قسري ──`)
  let downloaded = 0
  const notfound = []
  for (const [slug, name] of entries) {
    const out = resolve(LOCAL_DIR, `${slug}.gif`)
    const hit = byName.get(normName(name))
    if (!hit || !hit.url) { console.log(`  ✗ ${slug} ← «${name}» — لا مطابقة اسم دقيقة في الكتالوج (تحقّق من التهجئة).`); notfound.push(slug); continue }
    // تنزيل قسري: نحذف أي ملف سابق (قد يكون مطابقة خاطئة) ثم ننزّل المُعتمَد بعينه.
    try { rmSync(out, { force: true }) } catch { /* لا ملف — طبيعي */ }
    console.log(`  ⬇ ${slug} ← «${hit.name}» (قسري)`)
    const ok = await downloadGif(hit.url, out)
    if (ok === true) downloaded++
    else notfound.push(slug)
  }
  console.log(`\n══════════ الخلاصة (--approved) ══════════`)
  console.log(`نزّلنا (قسري): ${downloaded} • لم يُنزَّل: ${notfound.length}`)
  if (notfound.length) console.log(`لم يُنزَّل: ${notfound.join(', ')} — أرسل اسم الكتالوج الدقيق لأصحّح الخريطة.`)
  console.log(`طلبات API المستهلكة هذه الجولة: ${reqCount} (تنزيلات موقَّعة بالمفتاح).`)
  console.log(`التالي: node scripts/p12-sync-gifs.mjs && npm run build`)
}

main().catch((e) => { console.error('✗', e.message); process.exit(1) })
