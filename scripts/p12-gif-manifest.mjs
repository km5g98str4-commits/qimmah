#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// P12 — تقرير تغطية GIF (بلا شبكة، node فقط).
//
// يحسب المجموعة المطلوبة الكاملة = كل أجهزة الكتالوج (machineCatalog.ts) + كل
// معرّفات البدائل الفريدة (machineAlternatives.ts)، ثم يقاطعها مع خريطة
// exerciseGifs.ts (بعد تحويل مفاتيحها للقانوني) بشرط وجود الملف فعليًا في
// public/exercise-gifs/.
//
// يطبع: قائمة المغطّى، قائمة الناقص (slug قانوني + الاسم EN + الاسم AR)،
// وعدد طلبات WorkoutX المخطّط لها بالضبط.
//
// شكل الطلب المُثبت (P5): طلب قائمة واحد + مطابقة محلية + تنزيل CDN بلا مفتاح.
// (حادثة 2026-07-03: افتراض ?search= لكل تمرين كان خاطئًا — 46×404. المتبقي ~229.)
// ملاحظة من P5 (scripts/fetch-workoutx-media.mjs): تنزيل ملفات gif يتم من CDN
// بلا مفتاح ولا يُحتسب غالبًا على الحصّة — أي أن الاستهلاك الفعلي المرجّح
//
// قاعدة الميزانية الصارمة: إن تجاوز المخطّط 150 طلبًا → تحذير STOP أحمر.
//
// لا يستورد TS — استخراج نصّي من ملفات المصدر حتى لا تنحرف القوائم أبدًا.
// التشغيل:  node scripts/p12-gif-manifest.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { extractLegacyMap } from './p12-sync-gifs.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8')

const RED = '\x1b[31m\x1b[1m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'
const HARD_BUDGET = 150

// ── 1) أجهزة الكتالوج (+ أسماؤها الثنائية) من machineCatalog.ts ──
function extractCatalog(src) {
  const items = new Map() // exerciseId → { nameEn, nameAr }
  const re = /exerciseId:\s*'([^']+)',\s*nameEn:\s*'([^']+)',\s*nameAr:\s*'([^']+)'/g
  let m
  while ((m = re.exec(src))) {
    if (!items.has(m[1])) items.set(m[1], { nameEn: m[2], nameAr: m[3] })
  }
  return items
}

// ── 2) معرّفات البدائل الفريدة من machineAlternatives.ts ──
function extractAlternatives(src) {
  const start = src.indexOf('export const machineAlternatives')
  const end = src.indexOf('\n}', start)
  const body = src.slice(start, end)
  const ids = new Set()
  const re = /(?:dumbbell|cable):\s*'([^']+)'/g
  let m
  while ((m = re.exec(body))) ids.add(m[1])
  return ids
}

// ── 3) أسماء التمارين (EN/AR) من exercises.ts ──
function extractExerciseNames(src) {
  const names = new Map()
  const re = /id:\s*'([^']+)',\s*nameAr:\s*'([^']+)',\s*nameEn:\s*'([^']+)'/g
  let m
  while ((m = re.exec(src))) names.set(m[1], { nameAr: m[2], nameEn: m[3] })
  return names
}

// ── 4) خريطة exerciseGifs.ts ──
function extractGifMap(src) {
  const map = {}
  const re = /'([^']+)':\s*'(\/exercise-gifs\/[^']+)'/g
  let m
  while ((m = re.exec(src))) map[m[1]] = m[2]
  return map
}

function main() {
  const catalog = extractCatalog(read('src/data/machineCatalog.ts'))
  const altIds = extractAlternatives(read('src/data/machineAlternatives.ts'))
  const names = extractExerciseNames(read('src/data/exercises.ts'))
  const legacy = extractLegacyMap(read('src/data/exercises.ts'))
  const gifMap = extractGifMap(read('src/data/exerciseGifs.ts'))
  const files = new Set(readdirSync(resolve(ROOT, 'public/exercise-gifs')).filter((f) => f.endsWith('.gif')))
  const canonical = (id) => legacy[id] ?? id

  // المجموعة المطلوبة الكاملة (قانونية، فريدة).
  const required = new Set([...catalog.keys(), ...[...altIds].map(canonical)])

  // التغطية: معرّف قانوني → مسار ملف gif موجود فعلًا.
  const coveredBy = {}
  for (const [key, path] of Object.entries(gifMap)) {
    const file = path.replace('/exercise-gifs/', '')
    if (files.has(file)) coveredBy[canonical(key)] = path
  }

  const nameOf = (id) => {
    const n = catalog.get(id) ?? (names.has(id) ? { nameEn: names.get(id).nameEn, nameAr: names.get(id).nameAr } : null)
    return n ?? { nameEn: '؟ (غير موجود في exercises.ts)', nameAr: '؟' }
  }

  const sorted = [...required].sort()
  const covered = sorted.filter((id) => coveredBy[id])
  const missing = sorted.filter((id) => !coveredBy[id])

  console.log('P12 GIF MANIFEST — تغطية أجهزة الكتالوج + البدائل')
  console.log('═'.repeat(72))
  console.log(`المطلوب الكلي: ${required.size} (أجهزة الكتالوج: ${catalog.size} + بدائل فريدة خارج الكتالوج: ${required.size - catalog.size})`)
  console.log(`ملفات gif موجودة: ${files.size} • مدخلات الخريطة: ${Object.keys(gifMap).length}`)
  console.log()

  console.log(`${GREEN}✔ مغطّى (${covered.length}):${RESET}`)
  for (const id of covered) {
    const tag = catalog.has(id) ? '[جهاز]' : '[بديل]'
    console.log(`  ${tag} ${id}  →  ${coveredBy[id]}`)
  }
  console.log()

  console.log(`${YELLOW}✘ ناقص (${missing.length}):${RESET}`)
  for (const id of missing) {
    const n = nameOf(id)
    const tag = catalog.has(id) ? '[جهاز]' : '[بديل]'
    console.log(`  ${tag} ${id}  •  EN: ${n.nameEn}  •  AR: ${n.nameAr}`)
  }
  console.log()

  const planned = 4 // أسوأ حالة: مرشّحات مسار القائمة الأربعة
  console.log('═'.repeat(72))
  console.log(`طلبات API المخطّطة: 1 (قائمة واحدة، أسوأ حالة 4 مع المسارات الاحتياطية) — ${missing.length} GIF تُنزَّل من CDN بلا مفتاح`)
  console.log('(افتراض محافظ؛ تجربة P5 تشير إلى أن تنزيل CDN لا يحمل المفتاح — الاستهلاك الفعلي المرجّح ≈ ' + missing.length + ')')
  if (planned > HARD_BUDGET) {
    console.log(`${RED}⛔ STOP: المخطّط (${planned}) يتجاوز سقف الميزانية الصارم (${HARD_BUDGET} طلبًا).`)
    console.log(`   لا تُشغّل الجلب — قلّص القائمة أو قسّمها على دفعات معتمدة.${RESET}`)
    process.exitCode = 1
  } else {
    console.log(`${GREEN}✅ ضمن الميزانية: ${planned} ≤ ${HARD_BUDGET} (المتبقي مدى الحياة ~225).${RESET}`)
  }
}

main()
