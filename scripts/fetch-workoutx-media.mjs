#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// P5 MEDIA — جلب GIF متحرّك من WorkoutX مرّة واحدة (build-time) وتخزينه محليًا (vendored).
//
// المفتاح له سقف مدى الحياة (500 طلب). يُستخدم مرّة واحدة وقت البناء فقط — لا يُقرأ وقت التشغيل أبدًا.
//   • يُقرأ من process.env.WORKOUTX_API_KEY فقط (لا يُكتب في أي ملف مُلتزَم).
//   • ترويسة الطلب: X-WorkoutX-Key.  القاعدة: https://api.workoutxapp.com
//
// السلوك:
//   1) PROBE: طلب اختبار واحد لتأكيد المسار + شكل الاستجابة. يطبع عيّنة (بلا المفتاح) + الحصّة المتبقية.
//   2) إن كان الشكل صالحًا (وبلا --probe): يطابق تمارين قِمّة (~170) بالاسم/العضلة/الأداة،
//      يُنزّل كل gif → public/exercise-gifs/<id>.gif، ويكتب src/data/exerciseGifs.ts (id → مسار محلّي).
//
// حارس الميزانية: سقف صارم 300 طلب لواجهة WorkoutX، عدّاد جارٍ، توقّف عند إشارة نفاد الحصّة،
//                 لا حلقات غير محدودة. (تنزيل ملفات الـ gif من CDN لا يحمل المفتاح ولا يُحتسب على الحصّة).
//
// التشغيل:
//   WORKOUTX_API_KEY=xxxx node scripts/fetch-workoutx-media.mjs --probe   ← طلب اختبار واحد فقط
//   WORKOUTX_API_KEY=xxxx node scripts/fetch-workoutx-media.mjs           ← تشغيل كامل (مرّة واحدة)
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const KEY = process.env.WORKOUTX_API_KEY || ''
const BASE = 'https://api.workoutxapp.com'
const HEADER = 'X-WorkoutX-Key'
const PROBE_ONLY = process.argv.includes('--probe')

// مسارات مرشّحة لاكتشاف الواجهة (نتوقّف عند أوّل استجابة JSON صالحة). كل محاولة تُحتسب على الحصّة.
const CANDIDATE_PATHS = ['/exercises', '/v1/exercises', '/api/exercises', '/exercise']

// — حارس الميزانية —
const HARD_CAP = 300 // سقف صارم لطلبات WorkoutX (المفتاح له سقف 500 مدى الحياة).
let reqCount = 0
let quotaExhausted = false

const LOCAL_DIR = resolve(ROOT, 'public/exercise-gifs')
const LOCAL_BASE = '/exercise-gifs/' // مسار الويب (Vite يخدم public/ من الجذر).

function redact(s) {
  // لا نطبع المفتاح أبدًا في أي مخرجات.
  return String(s).split(KEY).join('«REDACTED-KEY»')
}

// أسماء ترويسات محتملة للحصّة المتبقية.
function readQuota(headers) {
  const keys = [
    'x-ratelimit-remaining', 'x-rate-limit-remaining', 'ratelimit-remaining',
    'x-quota-remaining', 'x-requests-remaining', 'x-workoutx-remaining',
  ]
  const out = {}
  for (const [k, v] of headers) {
    if (keys.includes(k.toLowerCase()) || /quota|remaining|ratelimit|limit/i.test(k)) out[k] = v
  }
  return out
}

// طلب موحّد لواجهة WorkoutX: يزيد العدّاد، يفرض السقف، يقرأ الحصّة، لا يطبع المفتاح.
async function apiFetch(path) {
  if (quotaExhausted) throw new Error('توقّف: إشارة نفاد الحصّة استُلمت سابقًا.')
  if (reqCount >= HARD_CAP) throw new Error(`توقّف: بلغنا سقف الميزانية الصارم (${HARD_CAP} طلب).`)
  reqCount++
  const url = BASE + path
  console.log(`  → [req ${reqCount}/${HARD_CAP}] GET ${url}`)
  const res = await fetch(url, { headers: { [HEADER]: KEY, Accept: 'application/json' } })
  const quota = readQuota(res.headers)
  if (Object.keys(quota).length) console.log(`    حصّة:`, JSON.stringify(quota))
  // 429 أو حصّة = 0 → إشارة نفاد؛ نوقف كل الطلبات اللاحقة.
  const remainingVals = Object.values(quota).map(Number).filter((n) => !Number.isNaN(n))
  if (res.status === 429 || remainingVals.some((n) => n <= 0)) {
    quotaExhausted = true
    console.warn('    ⚠ إشارة نفاد الحصّة — إيقاف كل طلبات WorkoutX.')
  }
  return { res, quota }
}

// يستخرج قائمة التمارين من جسم استجابة بأي شكل شائع.
function extractList(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  for (const k of ['exercises', 'data', 'results', 'items', 'list']) {
    if (Array.isArray(data[k])) return data[k]
  }
  return []
}

// يستخرج رابط الـ gif المتحرّك من مدخل بأي شكل حقل شائع.
function extractGifUrl(entry) {
  if (!entry || typeof entry !== 'object') return ''
  for (const k of ['gifUrl', 'gif', 'animatedUrl', 'animation', 'gifAsset', 'gif_url']) {
    if (typeof entry[k] === 'string' && /\.gif(\?|$)/i.test(entry[k])) return entry[k]
    if (typeof entry[k] === 'string' && entry[k].startsWith('http')) return entry[k]
  }
  // بعض الواجهات تُعيد media/images.
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

// ── مطابقة قِمّة (منقولة من build-exercise-media.mjs لثبات المعايير) ──
const MUSCLE_MAP = {
  chest: ['chest'], back: ['lats', 'middle back', 'lower back', 'traps'],
  shoulders: ['shoulders', 'traps'], biceps: ['biceps', 'forearms'], triceps: ['triceps'],
  quads: ['quadriceps'], hamstrings: ['hamstrings', 'glutes'], glutes: ['glutes', 'hamstrings'],
  calves: ['calves'], core: ['abdominals'], cardio: [],
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

function loadQimmahExercises() {
  const src = readFileSync(resolve(ROOT, 'src/data/exercises.ts'), 'utf8')
  const re = /ex\(\{[^}]*?id:\s*'([^']+)'[^}]*?nameEn:\s*'([^']+)'[^}]*?primaryMuscle:\s*'([^']+)'[^}]*?equipment:\s*\[([^\]]*)\]/g
  const rows = []
  let m
  while ((m = re.exec(src))) {
    rows.push({
      id: m[1], nameEn: m[2], muscle: m[3],
      equip: m[4].replace(/'/g, '').split(',').map((s) => s.trim()).filter(Boolean),
    })
  }
  return rows
}

// أفضل مطابقة gif لتمرين قِمّة (اسم + ترجيح العضلة). عتبة تغطية 0.66 لتفادي مطابقة خاطئة.
function bestGif(q, catalog) {
  const qTok = tokens(q.nameEn)
  const want = MUSCLE_MAP[q.muscle] || []
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

// تنزيل gif من مصدره (CDN غالبًا؛ لا يحمل المفتاح ولا يُحتسب على حصّة WorkoutX).
async function downloadGif(url, absPath) {
  if (existsSync(absPath) && process.env.FORCE_REDOWNLOAD !== '1') return true
  try {
    const res = await fetch(url)
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

async function probe() {
  console.log('▶ PROBE: طلب اختبار واحد لتأكيد المسار + شكل الاستجابة …')
  for (const path of CANDIDATE_PATHS) {
    let r
    try { r = await apiFetch(path) } catch (e) { console.warn(`  ${e.message}`); break }
    const { res } = r
    const ct = res.headers.get('content-type') || ''
    console.log(`    ← ${res.status} ${res.statusText} • content-type: ${ct}`)
    let body
    const text = await res.text()
    try { body = JSON.parse(text) } catch { body = null }
    if (!res.ok) {
      console.log(`    جسم (مقتطف): ${redact(text).slice(0, 300)}`)
      if (res.status === 401 || res.status === 403) {
        console.warn('    ⚠ رفض المصادقة — تحقّق من المفتاح/الترويسة.')
        return { ok: false, reason: `auth ${res.status}` }
      }
      continue // جرّب المسار التالي
    }
    if (!body) {
      console.log(`    ⚠ استجابة ليست JSON. مقتطف: ${redact(text).slice(0, 300)}`)
      continue
    }
    const list = extractList(body)
    const sample = list[0] || body
    console.log(`    ✅ استجابة JSON. عناصر القائمة: ${list.length}`)
    console.log(`    عيّنة (بلا المفتاح):`)
    console.log(redact(JSON.stringify(sample, null, 2)).split('\n').map((l) => '      ' + l).join('\n').slice(0, 1600))
    return { ok: true, path, body, list, sampleName: extractName(sample), sampleGif: extractGifUrl(sample) }
  }
  return { ok: false, reason: 'لم يُعثر على مسار يُعيد JSON صالحًا' }
}

async function main() {
  if (!KEY) { console.error('KEY MISSING — اضبط WORKOUTX_API_KEY في البيئة.'); process.exit(1) }

  const p = await probe()
  if (!p.ok) {
    console.error(`\n⛔ توقّف بعد طلب(ات) الاختبار — الشكل غير مؤكّد (${p.reason}). لم نستهلك حصّة إضافية.`)
    console.error(`   طلبات مستهلكة: ${reqCount}. راجع العيّنة أعلاه قبل أي تشغيل كامل.`)
    process.exit(2)
  }

  // تأكيد أن الشكل يحمل اسمًا ورابط gif فعليًا قبل أي جلب موسّع.
  const listHasGif = p.list.some((e) => extractGifUrl(e))
  const listHasName = p.list.some((e) => extractName(e))
  if (!listHasName || !listHasGif) {
    console.error(`\n⛔ توقّف: الشكل لا يحوي (اسم=${listHasName}, gif=${listHasGif}) بوضوح. راجع العيّنة أعلاه؛ لم نحرق حصّة.`)
    process.exit(2)
  }
  console.log(`\n✅ الشكل مؤكّد: القائمة تحوي أسماء وروابط gif. المسار: ${p.path}`)

  if (PROBE_ONLY) {
    console.log('ℹ --probe: توقّف بعد الاختبار كما طُلب.')
    return
  }

  // بناء كتالوج محلّي (اسم/عضلات/رابط) من القائمة المُعادة — لا طلبات إضافية للمطابقة.
  const catalog = p.list.map((e) => ({
    name: extractName(e),
    url: extractGifUrl(e),
    muscles: [e.muscle, e.primaryMuscle, e.target, ...(Array.isArray(e.muscles) ? e.muscles : [])].filter(Boolean),
  })).filter((c) => c.name && c.url)
  console.log(`▶ كتالوج WorkoutX: ${catalog.length} مدخلًا يحمل gif.`)

  const qimmah = loadQimmahExercises()
  const map = {}
  let matched = 0, downloaded = 0, failed = 0
  const unmatched = []

  console.log(`▶ مطابقة + تنزيل gif محليًا إلى public/exercise-gifs/ …`)
  for (const q of qimmah) {
    if (q.muscle === 'cardio') { unmatched.push(q.id); continue }
    const hit = bestGif(q, catalog)
    if (!hit) { unmatched.push(q.id); continue }
    matched++
    const rel = `${q.id}.gif`
    const ok = await downloadGif(hit.url, resolve(LOCAL_DIR, rel))
    if (ok) { map[q.id] = LOCAL_BASE + rel; downloaded++ }
    else failed++
  }

  // ترتيب المفاتيح لثبات الـ diff.
  const ordered = {}
  for (const k of Object.keys(map).sort()) ordered[k] = map[k]

  const out = `// ⚙️ ملف مُولّد آليًا — لا تُحرّره يدويًا.
// المصدر: scripts/fetch-workoutx-media.mjs  •  بيانات GIF: WorkoutX (جُلبت مرّة واحدة وقت البناء).
// كل ملف gif مُنزَّل (vendored) في public/exercise-gifs/ — العرض وقت التشغيل لا يحتاج مفتاحًا ولا شبكة.
// لإعادة التوليد (يستهلك حصّة WorkoutX):  WORKOUTX_API_KEY=xxxx node scripts/fetch-workoutx-media.mjs
//
// التغطية: ${downloaded}/${qimmah.length} تمرينًا له GIF متحرّك محلّي.

/** خريطة ثابتة: مُعرّف تمرين قِمّة → مسار GIF متحرّك محلّي (public/exercise-gifs/<id>.gif). */
export const exerciseGifs: Record<string, string> = ${JSON.stringify(ordered, null, 2)}

/** يُرجع مسار الـ GIF المحلّي إن توفّر، وإلا undefined (فيرجع المكوّن للصورة الثابتة). */
export function getExerciseGif(exerciseId: string): string | undefined {
  return exerciseGifs[exerciseId]
}
`
  writeFileSync(resolve(ROOT, 'src/data/exerciseGifs.ts'), out)

  console.log(`\n✅ مطابقة ${matched} • تنزيل ${downloaded} • فشل ${failed}.`)
  console.log(`ℹ غير مطابِق (${unmatched.length}).`)
  console.log(`ℹ طلبات WorkoutX المستهلكة: ${reqCount}/${HARD_CAP}.`)
}

main().catch((e) => { console.error(redact(e.stack || e.message)); process.exit(1) })
