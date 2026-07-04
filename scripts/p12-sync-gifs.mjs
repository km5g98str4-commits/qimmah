#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// P12 — مزامنة خريطة GIF (src/data/exerciseGifs.ts) مع الملفات الفعلية.
//
// ماذا يفعل:
//   1) يمسح public/exercise-gifs/*.gif (اسم الملف = slug).
//   2) يستخرج LEGACY_EXERCISE_ID_MAP من src/data/exercises.ts (بدون استيراد TS —
//      استخراج نصّي حتى لا تنحرف القوائم عن المصدر).
//   3) يبني الخريطة بمفاتيح قانونية (canonical-first):
//        المفتاح = canonicalExerciseId(slug الملف)، القيمة = مسار الملف الموجود فعلًا.
//      أي «صفر إعادة تسمية ملفات، صفر إعادة تنزيل» — الملفات القديمة تبقى بأسمائها
//      ويشير إليها المعرّف القانوني.
//   4) عند وجود ملف قانوني وملف قديم لنفس المعرّف → يفضّل الملف القانوني ويحذّر.
//   5) يكتب src/data/exerciseGifs.ts (مفاتيح مرتّبة أبجديًا لثبات الـ diff). idempotent.
//
// التشغيل:  node scripts/p12-sync-gifs.mjs           ← يكتب الملف
//           node scripts/p12-sync-gifs.mjs --check   ← يتحقّق فقط (يفشل إن كان الملف غير متزامن)
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const GIF_DIR = resolve(ROOT, 'public/exercise-gifs')
const OUT_FILE = resolve(ROOT, 'src/data/exerciseGifs.ts')
const CHECK_ONLY = process.argv.includes('--check')

/** يستخرج LEGACY_EXERCISE_ID_MAP (قديم → قانوني) من exercises.ts نصّيًا. */
export function extractLegacyMap(src) {
  const start = src.indexOf('export const LEGACY_EXERCISE_ID_MAP')
  if (start === -1) throw new Error('LEGACY_EXERCISE_ID_MAP غير موجودة في exercises.ts')
  const open = src.indexOf('{', start)
  const close = src.indexOf('}', open)
  const body = src.slice(open + 1, close)
  const map = {}
  const re = /'([^']+)':\s*'([^']+)'/g
  let m
  while ((m = re.exec(body))) map[m[1]] = m[2]
  return map
}

function main() {
  const legacy = extractLegacyMap(readFileSync(resolve(ROOT, 'src/data/exercises.ts'), 'utf8'))
  const canonical = (id) => legacy[id] ?? id

  const files = readdirSync(GIF_DIR).filter((f) => f.endsWith('.gif')).sort()
  if (files.length === 0) throw new Error(`لا ملفات gif في ${GIF_DIR}`)

  // مفتاح قانوني → مسار الملف الموجود. الملف القانوني الاسم يفوز على القديم.
  const map = {}
  const isCanonicalFile = {}
  let legacyKeyed = 0
  for (const f of files) {
    const slug = f.replace(/\.gif$/, '')
    const id = canonical(slug)
    const fileIsCanonical = slug === id
    if (map[id]) {
      if (fileIsCanonical && !isCanonicalFile[id]) {
        console.warn(`⚠ ${id}: يوجد ملف قديم وملف قانوني — اعتمدنا القانوني (${f}).`)
      } else {
        console.warn(`⚠ ${id}: ملف مكرّر ${f} تُجوهِل (المعتمد: ${map[id]}).`)
        continue
      }
    }
    map[id] = `/exercise-gifs/${f}`
    isCanonicalFile[id] = fileIsCanonical
    if (!fileIsCanonical) legacyKeyed++
  }

  const ordered = Object.keys(map).sort()
  const entries = ordered.map((k) => `  '${k}': '${map[k]}',`).join('\n')

  const out = `// ⚙️ ملف مُولّد آليًا — لا تُحرّره يدويًا. لإعادة التوليد:  node scripts/p12-sync-gifs.mjs
// خريطة ثابتة: مُعرّف تمرين قانوني → مسار GIF متحرّك محلّي في public/exercise-gifs/.
//
// المفاتيح قانونية (canonical-first، P12): ملفات وُرِّدت قديمًا باسم معرّف قديم
// (مثل cable-curl.gif) تبقى بأسمائها — صفر إعادة تسمية/تنزيل — ويشير إليها
// المعرّف القانوني (cable-biceps-curl → /exercise-gifs/cable-curl.gif) وفق
// LEGACY_EXERCISE_ID_MAP في exercises.ts. لجلب الناقص: scripts/p12-fetch-gifs.sh.
// التغطية الحالية: ${ordered.length} معرّفًا (${legacyKeyed} منها عبر ملف باسم قديم).

/** خريطة ثابتة: مُعرّف تمرين قانوني → مسار GIF متحرّك محلّي. */
export const exerciseGifs: Record<string, string> = {
${entries}
}

/** يُرجع مسار الـ GIF المحلّي إن توفّر، وإلا undefined (فيرجع المكوّن للصورة الثابتة ثم البديل الأنيق). */
export function getExerciseGif(exerciseId: string): string | undefined {
  return exerciseGifs[exerciseId]
}
`

  const current = (() => { try { return readFileSync(OUT_FILE, 'utf8') } catch { return '' } })()
  if (current === out) {
    console.log(`✅ exerciseGifs.ts متزامن (${ordered.length} مدخلًا، ${files.length} ملفًا).`)
    return
  }
  if (CHECK_ONLY) {
    console.error('⛔ exerciseGifs.ts غير متزامن مع public/exercise-gifs/ — شغّل: node scripts/p12-sync-gifs.mjs')
    process.exit(1)
  }
  writeFileSync(OUT_FILE, out)
  console.log(`✅ كُتب exerciseGifs.ts: ${ordered.length} مدخلًا (${legacyKeyed} بمفتاح قانوني لملف قديم) من ${files.length} ملفًا.`)
}

// لا تُشغّل إلا عند التنفيذ المباشر (الملف يُستورد أيضًا من p12-gif-manifest.mjs).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
