// قياس أثر مسار «التقدّم» على حجم الحزمة — قبل/بعد.
//
// يُستخدم لإثبات أن حزمة الـ3D لم تعد تُشحن: يبحث عن الـchunk الذي يحوي شاشة
// التقدّم، ويبلّغ حجمه الخام والمضغوط، ويتحقّق من غياب بصمات محرّك الـ3D.
//
// الاستخدام:
//   node scripts/measure-progress-bundle.mjs            # تقرير
//   node scripts/measure-progress-bundle.mjs --assert   # يفشل إن شُحن محرّك 3D

import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const DIST = 'dist/assets'
const ASSERT = process.argv.includes('--assert')

// بصمات تنجو من التصغير: أسماء الدوال تُختصر (BodyRenderer → a)، أمّا السلاسل
// النصية فتبقى حرفيًا. لذلك نبصم على نصوص واجهة المجسّم لا على معرّفات الكود.
const ENGINE_SIGNS = ['مجسّم عضلات ثلاثي الأبعاد', 'اسحب لتدوير', 'جانب آخر']

const files = readdirSync(DIST).filter((f) => f.endsWith('.js'))
const sizeOf = (f) => statSync(join(DIST, f)).size
const gzipOf = (f) => gzipSync(readFileSync(join(DIST, f))).length

let totalRaw = 0
let totalGzip = 0
const engineChunks = []
const progressChunks = []

for (const f of files) {
  const raw = sizeOf(f)
  const gz = gzipOf(f)
  totalRaw += raw
  totalGzip += gz
  const text = readFileSync(join(DIST, f), 'utf8')
  const signs = ENGINE_SIGNS.filter((s) => text.includes(s))
  if (signs.length) engineChunks.push({ file: f, raw, gz, signs })
  if (/Progress/i.test(f)) progressChunks.push({ file: f, raw, gz })
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`

console.log('── مسار التقدّم ──')
if (progressChunks.length === 0) console.log('  (لا chunk باسم Progress — قد يكون مدمجًا)')
for (const c of progressChunks) console.log(`  ${c.file.padEnd(34)} ${kb(c.raw).padStart(10)}  gzip ${kb(c.gz)}`)

console.log('\n── بصمات محرّك 3D في الحزمة ──')
if (engineChunks.length === 0) {
  console.log('  ✅ لا شيء — المحرّك غير مشحون')
} else {
  for (const c of engineChunks) console.log(`  ❌ ${c.file} (${kb(c.raw)}) — ${c.signs.join(', ')}`)
}

console.log('\n── الإجمالي ──')
console.log(`  ${files.length} ملف JS · ${kb(totalRaw)} خام · ${kb(totalGzip)} مضغوط`)

const report = {
  files: files.length,
  totalRaw,
  totalGzip,
  totalRawHuman: kb(totalRaw),
  totalGzipHuman: kb(totalGzip),
  progressChunks: progressChunks.map((c) => ({ ...c, rawHuman: kb(c.raw), gzHuman: kb(c.gz) })),
  engineShipped: engineChunks.length > 0,
  engineChunks: engineChunks.map((c) => ({ file: c.file, rawHuman: kb(c.raw), signs: c.signs })),
}
if (!ASSERT) {
  mkdirSync('docs/testing', { recursive: true })
  writeFileSync('docs/testing/progress-bundle-latest.json', `${JSON.stringify(report, null, 2)}\n`)
}

if (ASSERT && engineChunks.length > 0) {
  console.log('\n❌ محرّك الـ3D ما زال يُشحن في مسار الإنتاج')
  process.exit(1)
}
if (ASSERT) {
  console.log(`\n${engineChunks.length === 0 ? '✅ لا أثر لمحرك 3D في حزمة الإنتاج' : 'ℹ️ '}`)
} else {
  console.log(`\n${engineChunks.length === 0 ? '✅' : 'ℹ️ '} التقرير: docs/testing/progress-bundle-latest.json`)
}
