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

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const DB_JSON_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const DB_IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'

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

async function main() {
  console.log('▶ تحميل free-exercise-db …')
  const db = await fetchDb()
  const dbById = Object.fromEntries(db.map((x) => [x.id, x]))
  const qimmah = loadQimmahExercises()
  const gifList = await fetchWorkoutXGifs()
  if (WORKOUTX_KEY) console.log(gifList ? `▶ WorkoutX: ${gifList.length} تمرين متحرّك` : '▶ WorkoutX: لا بيانات')

  const mapping = {}
  let matched = 0
  let gifs = 0
  const unmatched = []

  for (const q of qimmah) {
    if (q.muscle === 'cardio') {
      unmatched.push(q.id)
      continue
    }
    const override = MANUAL_OVERRIDE[q.id] ? dbById[MANUAL_OVERRIDE[q.id]] : null
    const hit = override ? { dbEx: override } : bestMatch(q, db)
    if (!hit) {
      unmatched.push(q.id)
      continue
    }
    const imgs = hit.dbEx.images.map((p) => DB_IMG_BASE + p)
    const entry = { img0: imgs[0], img1: imgs[1] || imgs[0] }
    const gif = matchGif(q, gifList)
    if (gif) {
      entry.gifUrl = gif
      gifs++
    }
    mapping[q.id] = entry
    matched++
  }

  // ترتيب المفاتيح لثبات الـ diff
  const ordered = {}
  for (const k of Object.keys(mapping).sort()) ordered[k] = mapping[k]

  const header = `// ⚙️ ملف مُولّد آليًا — لا تُحرّره يدويًا.
// المصدر: scripts/build-exercise-media.mjs  •  بيانات: yuhonas/free-exercise-db (Unlicense / ملكية عامة)
// لإعادة التوليد:  node scripts/build-exercise-media.mjs
// لفتح GIF المتحرّك (اختياري):  WORKOUTX_API_KEY=xxxx node scripts/build-exercise-media.mjs
//
// التغطية: ${matched}/${qimmah.length} تمرينًا له صورة حقيقية${gifs ? ` • ${gifs} منها GIF متحرّك` : ''}.
`

  const body = `
/** وسائط تمرين واحد: إطار بداية + إطار نهاية (واختياريًا GIF متحرّك يُفضّل عند توفّره). */
export interface ExerciseMedia {
  /** إطار بداية الحركة (0.jpg). */
  img0: string
  /** إطار نهاية الحركة (1.jpg) — للتلاشي المتبادل ومحاكاة الحركة. */
  img1: string
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
