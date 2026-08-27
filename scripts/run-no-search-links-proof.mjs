#!/usr/bin/env node
/**
 * إثبات «لا روابط بحث» — [مهمة الصقل §3]
 *
 * قرار المؤسس نصًّا: «فيديو واحد مُتحقَّق منه. ليس نتائج بحث. ولا يُفتح بحث
 * يوتيوب أبدًا». كان النموذج القديم يولّد رابط بحث لكل تمرين في طبقة البيانات
 * نفسها (`video()` في exercises.ts) ويعرضه في أربعة أسطح. هذا الإثبات يحرس
 * الإبادة بنيويًّا:
 *   ① لا `results?search_query` في src كلّها، ولا أثر لرمز `exerciseVideoSearchUrl`.
 *   ② الأسطح الأربعة تقرأ من السجلّ المُتحقَّق (`approvedVideoFor`) حصرًا،
 *      ومشغّل الإحماء لا يُركَّب iframe فيه قبل ضغطة المستخدم (اقترانًا لا تجاورًا).
 *   ③ CSP تسمح بمضيف التضمين الخاص وحده وتبقي حصون التأطير كما هي.
 * وكل إحكام يُهاجَم بمحاكاة التفاف تسقط بفحصها المسمّى (§4.2).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0
let fail = 0
const check = (label, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ✓ ${label}`) }
  else { fail++; console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`) }
}

/** تجريد التعليقات كي لا يُرضي التأكيدَ نصٌّ شارح ولا يُفشِله. */
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8')

// ─── ① المسح الشامل: src كلّها بلا روابط بحث ─────────────────────────────
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f)
  if (statSync(p).isDirectory()) return f === 'node_modules' ? [] : walk(p)
  return /\.(ts|tsx|css|html)$/.test(f) ? [p] : []
})
const files = walk(resolve(ROOT, 'src'))
const offenders = (needle) => files.filter((p) => readFileSync(p, 'utf8').includes(needle))

console.log('\n① الإبادة الشاملة')
check(`لا \`results?search_query\` في src (${files.length} ملفًا مفحوصًا)`, offenders('results?search_query').length === 0, offenders('results?search_query').join(' · '))
check('لا أثر لرمز `exerciseVideoSearchUrl`', offenders('exerciseVideoSearchUrl').length === 0, offenders('exerciseVideoSearchUrl').join(' · '))

// ─── ② الأسطح تقرأ من السجلّ المُتحقَّق ──────────────────────────────────
console.log('\n② الأسطح الأربعة على السجلّ المُتحقَّق')
const warm = stripComments(src('src/components/workout/WarmupScreen.tsx'))
const mode = stripComments(src('src/components/WorkoutMode.tsx'))
const detail = stripComments(src('src/components/ExerciseDetail.tsx'))
const picker = stripComments(src('src/components/ExerciseLibraryPicker.tsx'))
const plan = stripComments(src('src/lib/workoutPlan.ts'))
const data = stripComments(src('src/data/exercises.ts'))

check('شاشة الإحماء تعرض زرّ الفيديو من `approvedVideoFor`', /approvedVideoFor\(step\.exerciseId\)/.test(warm) && /data-testid="warmup-video-play"/.test(warm))
/**
 * اقتران لا تجاور: الـiframe لا يوجد إلا داخل فرع «هذه الخطوة قيد التشغيل».
 * تُستخرج كتلة الشرط بحدودها ويُطالَب أن **كل** iframe في الملف داخلها.
 */
const playingBlock = (() => {
  const i = warm.indexOf('playingStep === i && (')
  if (i < 0) return null
  let depth = 0
  for (let k = warm.indexOf('(', i); k < warm.length; k++) {
    if (warm[k] === '(') depth++
    else if (warm[k] === ')') { depth--; if (depth === 0) return warm.slice(i, k + 1) }
  }
  return null
})()
const iframeCount = (blob) => (blob.match(/<iframe/g) ?? []).length
check('مشغّل الإحماء لا يُركَّب قبل الضغطة — كل iframe داخل فرع `playingStep === i`', playingBlock !== null && iframeCount(warm) > 0 && iframeCount(warm) === iframeCount(playingBlock))
check('وضع الجلسة: الرابط من `approvedVideoFor(exId)`/`planExerciseVideo` حصرًا', /approvedVideoFor\(exId\)\?\.canonicalUrl/.test(mode) && /planExerciseVideo\(pe\)/.test(mode))
check('تفاصيل التمرين: `VideoBlock` باقٍ ولا مرساة بحث تحت المرجع', /<VideoBlock exerciseId=/.test(detail) && !/watchOnYouTube/.test(detail))
check('منتقي المكتبة: الرابط `canonicalUrl` ويختفي بصدق عند الغياب', /approvedVideoFor\(e\.id\)/.test(picker) && /ref\.canonicalUrl/.test(picker) && /rel="noopener noreferrer"/.test(picker))
check('طبقة الخطة: `planExerciseVideo` = تخصيص المستخدم ثم `approvedVideoFor` — لا غير', (() => {
  const i = plan.indexOf('export function planExerciseVideo')
  if (i < 0) return false
  const body = plan.slice(i, plan.indexOf('\n}', i))
  return /pe\.videoUrl/.test(body) && /approvedVideoFor\(pe\.exerciseId\)\?\.canonicalUrl/.test(body) && !/youtube/.test(body)
})())
check('طبقة البيانات: لا مولّد روابط ولا قيمة افتراضية لـ`videoUrl`', !/function video\(/.test(data) && /videoUrl: p\.videoUrl,/.test(data))

// ─── ③ CSP: مضيف التضمين الخاص وحده، والحصون باقية ───────────────────────
console.log('\n③ سياسة أمن المحتوى')
const headers = src('public/_headers')
const cspLine = headers.split('\n').find((l) => l.includes('Content-Security-Policy')) ?? ''
const frameSrc = cspLine.match(/frame-src ([^;]+);/)?.[1]?.trim() ?? ''
check('`frame-src` هو `https://www.youtube-nocookie.com` بلا زيادة', frameSrc === 'https://www.youtube-nocookie.com', `frame-src=${frameSrc || '(غائب)'}`)
check('حصنا التأطير باقيان: `frame-ancestors \'none\'` + `X-Frame-Options: DENY`', cspLine.includes("frame-ancestors 'none'") && headers.includes('X-Frame-Options: DENY'))
check('لا سماح لـ`youtube.com` الكامل (المتتبِّع) في أي توجيه', !cspLine.includes('https://www.youtube.com'))

// ─── ④ محاكاة الالتفاف — كل إحكام يُهاجَم ويسقط بفحصه المسمّى ────────────
console.log('\n④ محاكاة الالتفاف (§4.2)')
const attack = (label, mutated, checkFn) => {
  const caught = !checkFn(mutated)
  check(`«${label}» يسقط بفحصه المسمّى`, caught)
}
attack(
  'حقن رابط بحث في وضع الجلسة',
  mode + "\nconst sneaky = 'https://www.youtube.com/results?search_query=x'\n",
  (m) => !m.includes('results?search_query'),
)
attack(
  'جرّ iframe الإحماء خارج فرع الضغطة (تركيب مسبق)',
  warm.replace('{videoRef && playingStep === i && (', '{videoRef && (') + '\n',
  (m) => {
    const i = m.indexOf('playingStep === i && (')
    if (i < 0) return false
    let depth = 0
    let block = null
    for (let k = m.indexOf('(', i); k < m.length; k++) {
      if (m[k] === '(') depth++
      else if (m[k] === ')') { depth--; if (depth === 0) { block = m.slice(i, k + 1); break } }
    }
    return block !== null && iframeCount(m) > 0 && iframeCount(m) === iframeCount(block)
  },
)
attack(
  'إرجاع الاحتياط البحثي إلى planExerciseVideo',
  plan.replace("approvedVideoFor(pe.exerciseId)?.canonicalUrl ?? ''", "approvedVideoFor(pe.exerciseId)?.canonicalUrl ?? `https://www.youtube.com/results?search_query=${'x'}`"),
  (m) => {
    const i = m.indexOf('export function planExerciseVideo')
    if (i < 0) return false
    const body = m.slice(i, m.indexOf('\n}', i))
    return !/youtube/.test(body)
  },
)
attack(
  'توسيع frame-src إلى يوتيوب المتتبِّع',
  headers.replace('frame-src https://www.youtube-nocookie.com', 'frame-src https://www.youtube-nocookie.com https://www.youtube.com'),
  (m) => {
    const l = m.split('\n').find((x) => x.includes('Content-Security-Policy')) ?? ''
    return (l.match(/frame-src ([^;]+);/)?.[1]?.trim() ?? '') === 'https://www.youtube-nocookie.com'
  },
)
attack(
  'إسقاط حصن `frame-ancestors` مع إبقاء البقية',
  headers.replace("frame-ancestors 'none'; ", ''),
  (m) => {
    const l = m.split('\n').find((x) => x.includes('Content-Security-Policy')) ?? ''
    return l.includes("frame-ancestors 'none'") && m.includes('X-Frame-Options: DENY')
  },
)

console.log(`\n${fail === 0 ? '✅' : '❌'} لا روابط بحث: ${pass + fail} فحصًا، ${fail} فشل.`)
process.exit(fail === 0 ? 0 : 1)
