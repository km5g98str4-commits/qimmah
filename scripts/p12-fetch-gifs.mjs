// P12 — جلب GIFs الناقصة (46) من WorkoutX v1 (مُصادَق عليه بمفتاح wx_ الجديد).
//
// الشكل المؤكّد (probe زياد 2026-07-03، HTTP 200):
//   • GET https://api.workoutxapp.com/v1/exercises — ترويسة X-WorkoutX-Key بالمفتاح خامًا
//   • الاستجابة مُقسَّمة صفحات: {total: 1327, count: N, data: [...]} — يجب جمع كل الصفحات
//   • المطابقة محليًا على القائمة الكاملة، والتنزيل من gifUrl (CDN) داخل المدخلات
//
// درسا P12: (1) لا endpoint بحث — 46×404. (2) لا افتراض «قائمة واحدة» — v1 مُقسَّم.
// القاعدة: ‎--probe أولًا دائمًا؛ يكشف حجم الصفحة ويطبع العدد الكلي المخطّط ثم يتوقف.
//
// الأوضاع:
//   node scripts/p12-fetch-gifs.mjs --dry-run   ← بلا شبكة: يطبع الخطة والعدّاد
//   WORKOUTX_API_KEY=x node scripts/p12-fetch-gifs.mjs --probe   ← طلب واحد: حالة+جسم خام، ثم يتوقف
//   WORKOUTX_API_KEY=x node scripts/p12-fetch-gifs.mjs           ← التشغيل الكامل
//
// idempotent: يتخطّى أي ملف موجود في public/exercise-gifs/. غير الموجود في WorkoutX → تخطٍّ وتسجيل.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
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
// سقف صارم لطلبات API المُوقَّعة بالمفتاح (المتبقي ~225 بعد حادثتي 2026-07-03).
const HARD_CAP = 150

const DRY_RUN = process.argv.includes('--dry-run')
const PROBE = process.argv.includes('--probe')

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

function readQuota(headers) {
  const keys = ['x-quota-remaining', 'x-ratelimit-remaining', 'x-requests-remaining']
  const out = {}
  for (const [k, v] of headers) {
    if (keys.includes(k.toLowerCase()) || /quota|remaining|ratelimit|limit/i.test(k)) out[k] = v
  }
  return out
}

async function apiFetch(path) {
  if (quotaExhausted) throw new Error('توقّف: إشارة نفاد الحصّة استُلمت سابقًا.')
  if (reqCount >= HARD_CAP) throw new Error(`توقّف: بلغنا سقف الميزانية الصارم (${HARD_CAP} طلب).`)
  reqCount++
  const url = BASE + path
  console.log(`  → [req ${reqCount}/${HARD_CAP}] GET ${url}`)
  const res = await fetch(url, { headers: { [AUTH_HEADER]: AUTH_PREFIX + KEY, Accept: 'application/json' } })
  const quota = readQuota(res.headers)
  if (Object.keys(quota).length) console.log(`    حصّة:`, JSON.stringify(quota))
  const remainingVals = Object.values(quota).map(Number).filter((n) => !Number.isNaN(n))
  if (res.status === 429 || remainingVals.some((n) => n <= 0)) {
    quotaExhausted = true
    console.warn('    ⚠ إشارة نفاد الحصّة — إيقاف كل طلبات WorkoutX.')
  }
  return { res, quota }
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

async function downloadGif(url, absPath) {
  if (existsSync(absPath)) return 'exists'
  try {
    const res = await fetch(url) // CDN بلا مفتاح — لا يُحتسب على حصّة API وفق تجربة P5.
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
  const all = det.pages.flat()
  for (let i = det.pages.length; i < totalPages; i++) {
    const q = det.mode === 'page' ? `?limit=${det.pageSize}&page=${i + 1}` : `?limit=${det.pageSize}&offset=${i * det.pageSize}`
    const pg = await fetchJsonPage(q)
    if (!pg.count) break
    all.push(...pg.entries)
    await new Promise((r) => setTimeout(r, 250))
  }
  const catalog = toCatalog(all)
  console.log(`▶ كتالوج WorkoutX كامل: ${all.length}/${det.total} مدخلًا (${catalog.length} يحمل gif) عبر ${reqCount} طلبًا.`)
  return catalog
}

async function main() {
  console.log(`P12 fetch-gifs (v3 — v1 مُرقَّم الصفحات: كشف حجم الصفحة ثم جمع كامل + مطابقة محلية + تنزيل CDN)`)
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

  let downloaded = 0, skipped = 0, notfound = []
  for (const [i, [slug, name, muscle]] of MISSING.entries()) {
    const out = resolve(LOCAL_DIR, `${slug}.gif`)
    if (existsSync(out)) { console.log(`[${i + 1}/${MISSING.length}] ⏭ ${slug} — موجود.`); skipped++; continue }
    const hit = bestGif(name, muscle, catalog)
    if (!hit) { console.log(`[${i + 1}/${MISSING.length}] ✗ ${slug} — لا مطابقة في WorkoutX (تخطٍّ، لا فشل).`); notfound.push(slug); continue }
    console.log(`[${i + 1}/${MISSING.length}] ⬇ ${slug} ← «${hit.name}» (تغطية ${hit.coverage.toFixed(2)})`)
    const ok = await downloadGif(hit.url, out)
    if (ok === true) downloaded++
    else if (ok === 'exists') skipped++
    else notfound.push(slug)
    await new Promise((r) => setTimeout(r, 400)) // لطف مع الـCDN
  }

  console.log(`\n══════════ الخلاصة ══════════`)
  console.log(`نزّلنا: ${downloaded} • تخطّينا (موجود): ${skipped} • غير موجود/فشل: ${notfound.length}`)
  if (notfound.length) console.log(`غير الموجود: ${notfound.join(', ')}`)
  console.log(`طلبات API المستهلكة هذه الجولة: ${reqCount} (التنزيلات CDN لا تحمل المفتاح).`)
  console.log(`التالي: node scripts/p12-sync-gifs.mjs && npm run build`)
}

main().catch((e) => { console.error('✗', e.message); process.exit(1) })
