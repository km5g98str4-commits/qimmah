// P12 — جلب GIFs الناقصة (46) بشكل الطلب المُثبت من P5 (fetch-workoutx-media.mjs).
//
// الشكل المُثبت (الذي نجح في دفعة الـ60 الأصلية):
//   • طلب قائمة واحد: GET https://api.workoutxapp.com/exercises (ترويسة X-WorkoutX-Key)
//   • المطابقة محليًا على القائمة المعادة (لا يوجد endpoint بحث لكل تمرين!)
//   • التنزيل من روابط CDN داخل القائمة (بلا مفتاح — لا يُحتسب على الحصّة وفق تجربة P5)
//
// درس P12: سكربت سابق افترض ‎?search=‎ لكل تمرين → 46×404 حرقت 46 طلبًا. لا تخمين بعد اليوم:
// شغّل ‎--probe أولًا (طلب واحد) وتأكد من الشكل قبل أي تشغيل كامل.
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
const HEADER = 'X-WorkoutX-Key'
// نفس مرشّحات P5 — الأول هو الذي نجح تاريخيًا؛ البقية احتياط إن تغيّرت الواجهة.
const CANDIDATE_PATHS = ['/exercises', '/v1/exercises', '/api/exercises', '/exercise']
// سقف صارم لطلبات API المُوقَّعة بالمفتاح (المتبقي مدى الحياة ~229 بعد حادثة الـ404).
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
  const res = await fetch(url, { headers: { [HEADER]: KEY, Accept: 'application/json' } })
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

// يجلب كتالوج WorkoutX بمسار القائمة المُثبت (مع احتياطات) — طلب واحد عادةً.
async function fetchCatalog() {
  for (const path of CANDIDATE_PATHS) {
    const { res } = await apiFetch(path)
    const raw = await res.text()
    if (PROBE) {
      console.log(`\n── PROBE — الحالة والجسم الخام (مقتطع 800 حرفًا، المفتاح محجوب) ──`)
      console.log(`HTTP ${res.status} ${res.statusText} — ${BASE}${path}`)
      console.log(redact(raw).slice(0, 800))
    }
    if (res.status !== 200) { console.warn(`  ⚠ ${path} → ${res.status}؛ أجرّب المرشّح التالي.`); continue }
    let data
    try { data = JSON.parse(raw) } catch { console.warn(`  ⚠ ${path}: ليس JSON.`); continue }
    const list = extractList(data)
    if (!list.length) { console.warn(`  ⚠ ${path}: قائمة فارغة/شكل غير معروف.`); continue }
    const catalog = list.map((e) => ({
      name: extractName(e),
      url: extractGifUrl(e),
      muscles: [e.muscle, e.primaryMuscle, e.target, ...(Array.isArray(e.muscles) ? e.muscles : [])].filter(Boolean),
    })).filter((c) => c.name && c.url)
    console.log(`▶ كتالوج WorkoutX عبر ${path}: ${catalog.length} مدخلًا يحمل gif.`)
    return catalog
  }
  throw new Error('كل مرشّحات مسار القائمة فشلت — لا تكمل، راجع المخرجات أعلاه.')
}

async function main() {
  console.log(`P12 fetch-gifs (v2 — شكل P5 المُثبت: قائمة واحدة + مطابقة محلية + تنزيل CDN)`)
  console.log(`ناقص: ${MISSING.length} GIF • طلبات API المخطّطة: 1 (قائمة) — التنزيلات عبر CDN بلا مفتاح • سقف صارم: ${HARD_CAP}`)

  if (DRY_RUN) {
    console.log(`── DRY RUN (بلا شبكة، بلا مفتاح) ──`)
    MISSING.forEach(([slug, name], i) => {
      const exists = existsSync(resolve(LOCAL_DIR, `${slug}.gif`))
      console.log(`[${i + 1}/${MISSING.length}] (dry) ${slug} ← مطابقة محلية: «${name}»${exists ? ' — موجود، سيُتخطّى' : ''}`)
    })
    console.log(`\n══════════ الخلاصة ══════════`)
    console.log(`DRY RUN: ${MISSING.length} عنصرًا • طلب API واحد مخطّط (قائمة) + تنزيلات CDN • لا شبكة استُخدمت.`)
    console.log(`✅ ضمن الميزانية (1 ≤ ${HARD_CAP}).`)
    return
  }

  if (!KEY) { console.error('KEY MISSING — اضبط WORKOUTX_API_KEY في البيئة.'); process.exit(1) }

  const catalog = await fetchCatalog()

  if (PROBE) {
    const probeHit = bestGif('Hack Squat', 'quads', catalog)
    console.log(`\n── PROBE — تحقق مطابقة على تمرين معروف (Hack Squat، موجود لدينا أصلًا) ──`)
    console.log(probeHit ? `✅ وجدنا «${probeHit.name}» بتغطية ${probeHit.coverage.toFixed(2)} — الشكل يعمل.` : '⚠ لم تنجح المطابقة — راجع شكل القائمة أعلاه قبل التشغيل الكامل.')
    console.log(`ℹ --probe: توقّف بعد الاختبار. طلبات API المستهلكة: ${reqCount}.`)
    return
  }

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
