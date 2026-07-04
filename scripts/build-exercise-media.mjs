#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// مولّد خريطة وسائط التمارين (build-time) — Qimmah / قِمّة
//
// يطابق تمارين قِمّة (~170) مع قاعدة البيانات العامة المفتوحة `yuhonas/free-exercise-db`
// (رخصة Unlicense / ملكية عامة) وينتج خريطة ثابتة:  exerciseId -> { img0, img1, gifUrl? }
//
// • PRIMARY (بلا مفتاح، يعمل دائمًا): صور 0.jpg / 1.jpg (بداية/نهاية الحركة) من free-exercise-db.
// • UPGRADE (اختياري): إذا ضُبط WORKOUTX_API_KEY يُجلب gifUrl متحرّك من WorkoutX ويُفضّل على الصور.
//
// المخرجات: src/data/exerciseMedia.ts  (تُلتزم في المستودع — لا شبكة وقت التشغيل).
//
// التشغيل:  node scripts/build-exercise-media.mjs
//           WORKOUTX_API_KEY=xxxx node scripts/build-exercise-media.mjs   (لفتح GIF المتحرّك)
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const DB_JSON_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const DB_IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'

// مجلد الصور المحلّية (يُخدَم من الجذر: /exercise-images/…). نُنزّل الصور المطابَقة هنا ونُلزمها في المستودع
// كي لا يعتمد العرض على شبكة raw.githubusercontent وقت التشغيل. الرخصة Unlicense (ملكية عامة) — الالتزام مسموح.
const LOCAL_DIR = resolve(ROOT, 'public/exercise-images')
const LOCAL_BASE = '/exercise-images/' // مسار الويب (Vite يخدم public/ من الجذر)
// إعادة التنزيل عند ضبط FORCE_REDOWNLOAD=1؛ افتراضيًا نتخطّى الملفات الموجودة (idempotent + سريع).
const FORCE_REDOWNLOAD = process.env.FORCE_REDOWNLOAD === '1'

const WORKOUTX_KEY = process.env.WORKOUTX_API_KEY || ''
const WORKOUTX_URL = 'https://api.workoutxapp.com/exercises'

// — قاموس مطابقة العضلات: عضلة قِمّة → مجموعة عضلات free-exercise-db —
const MUSCLE_MAP = {
  chest: ['chest'],
  back: ['lats', 'middle back', 'lower back', 'traps'],
  shoulders: ['shoulders', 'traps'],
  biceps: ['biceps', 'forearms'],
  triceps: ['triceps'],
  quads: ['quadriceps'],
  hamstrings: ['hamstrings', 'glutes'],
  glutes: ['glutes', 'hamstrings'],
  calves: ['calves'],
  core: ['abdominals'],
  cardio: [],
}

// — قاموس مطابقة الأدوات: أداة قِمّة → أدوات free-exercise-db —
const EQUIP_MAP = {
  barbell: ['barbell'],
  dumbbell: ['dumbbell'],
  machine: ['machine', 'cable'],
  cable: ['cable', 'machine'],
  bodyweight: ['body only'],
  'ez-bar': ['e-z curl bar', 'barbell'],
  smith: ['barbell', 'machine'],
  kettlebell: ['kettlebells'],
  plate: ['other', 'barbell'],
  band: ['bands'],
  rope: ['cable'],
  bench: [], // ملحق — لا يميّز
}

// مرادفات أسماء لتحسين تطابق الرموز (qimmah token → db token المكافئ)
const TOKEN_ALIAS = {
  pushup: 'pushups',
  pullup: 'pullups',
  chinup: 'pullups',
  ez: 'e-z',
  glute: 'glutes',
  ham: 'leg',
  crunch: 'crunches',
  raise: 'raises',
  extension: 'extensions',
  curl: 'curl',
  abs: 'crunches',
  fly: 'flyes',
  dip: 'dips',
  swing: 'swings',
}

// تجاوزات يدوية لتمارين لا يلتقطها تطابق الأسماء (مفردات مختلفة) — مُعرّف قِمّة → مُعرّف free-exercise-db.
const MANUAL_OVERRIDE = {
  'pec-deck': 'Butterfly',
  'reverse-pec-deck': 'Reverse_Machine_Flyes',
  'dumbbell-rdl': 'Romanian_Deadlift',
  'machine-rdl': 'Romanian_Deadlift',
  // تمارين أساسية — نضمن الصورة الأكثر تمثيلًا (لا أشكالًا غريبة).
  'barbell-bench-press': 'Barbell_Bench_Press_-_Medium_Grip',
  'lat-pulldown': 'Wide-Grip_Lat_Pulldown',
  'overhead-press': 'Standing_Military_Press',
  'pull-up': 'Pullups',
  // رفرفة خلفية بالدمبل (تمرين منزلي) — نتفادى مطابقة صورة الكيبل ونثبّت صورة الدمبل.
  'rear-delt-fly': 'Reverse_Flyes',
}

const STOP = new Set(['the', 'a', 'with', 'and', 'of', 'to', 'for', 'on', 'machine'])

function tokens(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t && !STOP.has(t))
    .map((t) => TOKEN_ALIAS[t] || t)
}

// — استخراج تمارين قِمّة من ملف TS (id + nameEn + primaryMuscle + equipment) —
function loadQimmahExercises() {
  const src = readFileSync(resolve(ROOT, 'src/data/exercises.ts'), 'utf8')
  const re =
    /ex\(\{[^}]*?id:\s*'([^']+)'[^}]*?nameEn:\s*'([^']+)'[^}]*?primaryMuscle:\s*'([^']+)'[^}]*?equipment:\s*\[([^\]]*)\]/g
  const rows = []
  let m
  while ((m = re.exec(src))) {
    rows.push({
      id: m[1],
      nameEn: m[2],
      muscle: m[3],
      equip: m[4].replace(/'/g, '').split(',').map((s) => s.trim()).filter(Boolean),
    })
  }
  return rows
}

// بطاقات أجهزة يجب أن تبقى على البديل الأنيق — لا تُطابَق بصور free-exercise-db (وزن حرّ دومًا).
// المصدر الموحّد: PLACEHOLDER_ONLY_EXERCISE_IDS في src/data/exercises.ts (يستخرجه نصّيًا كي لا ينحرف).
function loadPlaceholderOnlyIds() {
  const src = readFileSync(resolve(ROOT, 'src/data/exercises.ts'), 'utf8')
  const start = src.indexOf('PLACEHOLDER_ONLY_EXERCISE_IDS: readonly string[] = [')
  if (start === -1) return new Set()
  const open = src.indexOf('[', start)
  const close = src.indexOf(']', open)
  return new Set([...src.slice(open + 1, close).matchAll(/'([^']+)'/g)].map((m) => m[1]))
}

async function fetchDb() {
  const res = await fetch(DB_JSON_URL)
  if (!res.ok) throw new Error(`free-exercise-db fetch failed: ${res.status}`)
  return res.json()
}

// — درجة المطابقة بين تمرين قِمّة ومدخل قاعدة البيانات —
function scoreMatch(q, dbEx, qTok) {
  const dbTok = tokens(dbEx.name)
  const dbSet = new Set(dbTok)
  const hit = qTok.filter((t) => dbSet.has(t)).length
  const coverage = qTok.length ? hit / qTok.length : 0 // نسبة رموز قِمّة الموجودة في db
  const union = new Set([...qTok, ...dbTok]).size
  const jaccard = union ? hit / union : 0

  const wantMuscles = MUSCLE_MAP[q.muscle] || []
  const muscleMatch = wantMuscles.length === 0 || dbEx.primaryMuscles.some((m) => wantMuscles.includes(m)) ? 1 : 0

  const wantEquip = new Set(q.equip.flatMap((e) => EQUIP_MAP[e] || []))
  const equipMatch = wantEquip.size === 0 || wantEquip.has(dbEx.equipment) ? 1 : 0

  // الاسم هو الإشارة الأقوى؛ العضلة/الأداة ترجّحان عند التعادل.
  const score = coverage * 3 + jaccard * 1.5 + muscleMatch * 1 + equipMatch * 0.75
  return { score, coverage, muscleMatch, dbLen: dbTok.length }
}

function bestMatch(q, db) {
  const qTok = tokens(q.nameEn)
  let best = null
  for (const dbEx of db) {
    if (!Array.isArray(dbEx.images) || dbEx.images.length < 1) continue
    const r = scoreMatch(q, dbEx, qTok)
    if (
      !best ||
      r.score > best.r.score ||
      (r.score === best.r.score && r.dbLen < best.r.dbLen) // عند التعادل: الاسم الأقصر (الأقرب)
    ) {
      best = { dbEx, r }
    }
  }
  // عتبة دقّة: نطلب تغطية اسم عالية + توافق عضلة لتفادي مطابقة خاطئة.
  if (best && best.r.coverage >= 0.66 && best.r.muscleMatch === 1) return best
  // تغطية كاملة تكفي وحدها (أسماء قصيرة جدًا مثل Deadlift / Plank).
  if (best && best.r.coverage >= 0.99) return best
  return null
}

async function fetchWorkoutXGifs() {
  if (!WORKOUTX_KEY) return null
  try {
    const res = await fetch(WORKOUTX_URL, { headers: { 'X-WorkoutX-Key': WORKOUTX_KEY } })
    if (!res.ok) {
      console.warn(`⚠ WorkoutX fetch failed (${res.status}) — تخطّي GIF، نُبقي الصور الثابتة.`)
      return null
    }
    const data = await res.json()
    const list = Array.isArray(data) ? data : data.exercises || data.data || []
    return list
  } catch (e) {
    console.warn(`⚠ WorkoutX error (${e.message}) — تخطّي GIF، نُبقي الصور الثابتة.`)
    return null
  }
}

// مطابقة GIF متحرّك من WorkoutX باسم التمرين (إن توفّر مفتاح).
function matchGif(q, gifList) {
  if (!gifList) return null
  const qTok = tokens(q.nameEn)
  let best = null
  for (const g of gifList) {
    const name = g.name || g.exercise || g.title || ''
    const url = g.gifUrl || g.gif || g.imageUrl || g.image || ''
    if (!name || !url) continue
    const dbSet = new Set(tokens(name))
    const hit = qTok.filter((t) => dbSet.has(t)).length
    const coverage = qTok.length ? hit / qTok.length : 0
    if (!best || coverage > best.coverage) best = { url, coverage }
  }
  return best && best.coverage >= 0.66 ? best.url : null
}

// — تنزيل صورة واحدة إلى مسار محلّي (idempotent: يتخطّى الموجود ما لم يُطلب FORCE) —
// يُرجع true عند توفّر الملف محليًا (منزَّل أو موجود مسبقًا)، false عند فشل التنزيل.
async function downloadImage(url, absPath) {
  if (existsSync(absPath) && !FORCE_REDOWNLOAD) return true
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.warn(`  ⚠ فشل تنزيل ${url} (${res.status})`)
      return false
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length === 0) {
      console.warn(`  ⚠ ملف فارغ ${url}`)
      return false
    }
    mkdirSync(dirname(absPath), { recursive: true })
    writeFileSync(absPath, buf)
    return true
  } catch (e) {
    console.warn(`  ⚠ خطأ تنزيل ${url} (${e.message})`)
    return false
  }
}

async function main() {
  console.log('▶ تحميل free-exercise-db …')
  const db = await fetchDb()
  const dbById = Object.fromEntries(db.map((x) => [x.id, x]))
  const qimmah = loadQimmahExercises()
  const placeholderOnly = loadPlaceholderOnlyIds()
  const gifList = await fetchWorkoutXGifs()
  if (WORKOUTX_KEY) console.log(gifList ? `▶ WorkoutX: ${gifList.length} تمرين متحرّك` : '▶ WorkoutX: لا بيانات')

  const mapping = {}
  let matched = 0
  let gifs = 0
  let localFrames = 0
  let remoteFallbacks = 0
  const unmatched = []

  console.log(`▶ تنزيل الصور محليًا إلى public/exercise-images/ …`)
  for (const q of qimmah) {
    if (q.muscle === 'cardio') {
      unmatched.push(q.id)
      continue
    }
    // بطاقات أجهزة بلا لقطة جهاز أصيلة → البديل الأنيق (لا نطابقها بصورة وزن حرّ خاطئة).
    if (placeholderOnly.has(q.id)) {
      unmatched.push(q.id)
      continue
    }
    const override = MANUAL_OVERRIDE[q.id] ? dbById[MANUAL_OVERRIDE[q.id]] : null
    const hit = override ? { dbEx: override } : bestMatch(q, db)
    if (!hit) {
      unmatched.push(q.id)
      continue
    }
    // الروابط البعيدة (raw.githubusercontent) — تبقى كـ fallback عند onError.
    const remote0 = DB_IMG_BASE + hit.dbEx.images[0]
    const remote1 = hit.dbEx.images[1] ? DB_IMG_BASE + hit.dbEx.images[1] : remote0
    const single = remote1 === remote0

    // تنزيل الإطارين إلى public/exercise-images/<id>/0.jpg (و1.jpg إن اختلف).
    const rel0 = `${q.id}/0.jpg`
    const rel1 = single ? rel0 : `${q.id}/1.jpg`
    const ok0 = await downloadImage(remote0, resolve(LOCAL_DIR, rel0))
    const ok1 = single ? ok0 : await downloadImage(remote1, resolve(LOCAL_DIR, rel1))

    // المسار المحلّي إن نجح التنزيل، وإلا نُبقي البعيد كمصدر أساسي (لا نُشير لملف غير موجود).
    const img0 = ok0 ? LOCAL_BASE + rel0 : remote0
    const img1 = ok1 ? LOCAL_BASE + rel1 : remote1
    if (ok0) localFrames++
    else remoteFallbacks++

    // fallback بعيد دائمًا (عند تعذّر تحميل الملف المحلّي في المتصفح).
    const entry = { img0, img1, img0Remote: remote0, img1Remote: remote1 }
    const gif = matchGif(q, gifList)
    if (gif) {
      entry.gifUrl = gif
      gifs++
    }
    mapping[q.id] = entry
    matched++
  }
  console.log(`▶ إطارات محلّية: ${localFrames} تمرينًا • fallback بعيد: ${remoteFallbacks}`)

  // ترتيب المفاتيح لثبات الـ diff
  const ordered = {}
  for (const k of Object.keys(mapping).sort()) ordered[k] = mapping[k]

  const header = `// ⚙️ ملف مُولّد آليًا — لا تُحرّره يدويًا.
// المصدر: scripts/build-exercise-media.mjs  •  بيانات: yuhonas/free-exercise-db (Unlicense / ملكية عامة)
// لإعادة التوليد:  node scripts/build-exercise-media.mjs
// لفتح GIF المتحرّك (اختياري):  WORKOUTX_API_KEY=xxxx node scripts/build-exercise-media.mjs
//
// التغطية: ${matched}/${qimmah.length} تمرينًا له صورة حقيقية${gifs ? ` • ${gifs} منها GIF متحرّك` : ''}.
// الصور مُنزَّلة محليًا في public/exercise-images/ (لا اعتماد على شبكة وقت التشغيل)؛ الروابط البعيدة تبقى كـ fallback.
`

  const body = `
/** وسائط تمرين واحد: إطار بداية + إطار نهاية (واختياريًا GIF متحرّك يُفضّل عند توفّره). */
export interface ExerciseMedia {
  /** إطار بداية الحركة (0.jpg) — مسار محلّي مُلتزَم في المستودع. */
  img0: string
  /** إطار نهاية الحركة (1.jpg) — للتلاشي المتبادل ومحاكاة الحركة (مسار محلّي). */
  img1: string
  /** مصدر بعيد بديل لإطار البداية (raw.githubusercontent) — يُستخدم فقط عند تعذّر تحميل الملف المحلّي. */
  img0Remote?: string
  /** مصدر بعيد بديل لإطار النهاية — يُستخدم فقط عند تعذّر تحميل الملف المحلّي. */
  img1Remote?: string
  /** GIF متحرّك (WorkoutX) — يُفضّل على الصور الثابتة عند توفّره. */
  gifUrl?: string
}

/** خريطة ثابتة: مُعرّف تمرين قِمّة → وسائط مطابقة من قاعدة بيانات عامة. التمارين غير المطابِقة غائبة عمدًا. */
export const exerciseMedia: Record<string, ExerciseMedia> = ${JSON.stringify(ordered, null, 2)}

/** يُرجع وسائط التمرين إن وُجدت مطابقة، وإلا undefined (يعرض المكوّن بديلًا أنيقًا). */
export function getExerciseMedia(exerciseId: string): ExerciseMedia | undefined {
  return exerciseMedia[exerciseId]
}
`

  writeFileSync(resolve(ROOT, 'src/data/exerciseMedia.ts'), header + body)

  console.log(`\n✅ مطابقة ${matched}/${qimmah.length} تمرينًا (${Math.round((matched / qimmah.length) * 100)}%).`)
  if (gifs) console.log(`✅ ${gifs} GIF متحرّك من WorkoutX.`)
  console.log(`ℹ غير مطابِق (${unmatched.length}): ${unmatched.join(', ')}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
