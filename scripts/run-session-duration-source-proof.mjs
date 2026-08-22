/**
 * مصدر واحد لمدّة الجلسة — [SOVEREIGN-003].
 *
 * ═══ العطل ═══
 * المؤسس رأى **٧٥ دقيقة** في شاشة و**٤٠** في أخرى لنفس اليوم. والسبب أن
 * «مدّة الجلسة» كانت ثلاثة معانٍ مختلطة:
 *   ① **المُعلَنة** — ما اختاره المستخدم في الإعداد (`profile.workoutDuration`).
 *      هذه **ميزانيته**، لا تقدير جلسته. مكانها الصحيح: التفضيلات وسقف التخفيف.
 *   ② **الحقيقية** — `estimateDurationMin` في `workoutStats`: مجموعات ×
 *      (عمل + راحة). هذه ما تعرضه الرئيسية.
 *   ③ **تقدير ثانٍ** — «٩ دقائق لكل تمرين» كان يعيش في `customPlan/builder`
 *      ويغذّي تحذير «جلستك أطول من هدفك»، وفي `workoutV2Model` (توأم ميت).
 *
 * فكان المستخدم يُحذَّر برقمٍ لا يراه في أي شاشة.
 *
 * ═══ ما يُثبَت هنا ═══
 *   ① الحسّاب الحيّ **واحد**: كل مسار حيّ يعرض تقدير جلسة يمرّ بـ`workoutStats`.
 *   ② التقدير الثاني لم يعد له وجود في مسار حيّ.
 *   ③ المُعلَنة تبقى مشروعة **حيث تعني ميزانية** (سقف التخفيف) لا تقدير جلسة.
 *   ④ ⟲ تأكيد مضادّ: إعادة «٩ دقائق لكل تمرين» إلى مسار حيّ تسقط بفحص مسمّى.
 */
import { build } from 'esbuild'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8')
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ')

let pass = 0
const fails = []
const check = (label, cond, detail = '') => {
  if (cond) { pass += 1; console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`) }
  else { fails.push(label); console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`) }
}

/** النمط الذي يعرّف التقدير الثاني، أيًّا كان اسم متغيّره. */
const NINE_MIN = /\*\s*9\s*\)\s*\/\s*5|\(\s*n\s*\*\s*9\s*\)|\*\s*9\s*\/\s*5/

console.log('\n① الحسّاب الحيّ واحد')
const stats = code(read('src/lib/workoutStats.ts'))
check('`workoutStats` يملك الصيغة الحقيقية (مجموعات × (عمل + راحة))',
  /export function estimateDurationMin/.test(stats) && /restSec/.test(stats))

const builder = code(read('src/features/customPlan/builder.ts'))
check('باني الخطة المخصّصة يستدعي الحسّاب المركزي', /estimateDurationMin/.test(builder))
check('② ولا يحمل التقدير الثاني بعد اليوم', !NINE_MIN.test(builder), 'نمط «٩ دقائق/تمرين» غائب')

const today = code(read('src/lib/todayV2Model.ts'))
check('الرئيسية تستدعي الحسّاب المركزي', /estimateDurationMin/.test(today))
check('  ولا تحمل تقديرًا ثانيًا', !NINE_MIN.test(today))

console.log('\n③ المُعلَنة تبقى ميزانيةً لا تقديرَ جلسة')
const workoutView = code(read('src/views/WorkoutView.tsx'))
const declaredUses = (workoutView.match(/profile\.workoutDuration/g) ?? []).length
check('شاشة التمرين تستعمل المُعلَنة (سقف التخفيف) — وهو استعمال مشروع',
  declaredUses > 0, `${declaredUses} موضعًا`)
check('  وتستعملها مع `cappedSessionMinutes` لا كعرض تقدير',
  /cappedSessionMinutes/.test(workoutView))

console.log('\n④ التوأم الميت لا يُحتسب مسارًا حيًّا')
const app = code(read('src/App.tsx'))
check('`WorkoutV2` بلا مستورد في قشرة التطبيق — فتقديره لا يصل مستخدمًا',
  !/WorkoutV2/.test(app), 'توأم ميت موثَّق')

console.log('\n⟲ التأكيد المضادّ — الفحص ليس فارغًا')
const revived = builder.replace('estimateDurationMin(day)', 'Math.max(20, Math.round((day.exercises.length * 9) / 5) * 5)')
check('⟲ إعادة «٩ دقائق/تمرين» إلى الباني تُلتقَط بالنمط نفسه',
  NINE_MIN.test(revived) && !NINE_MIN.test(builder))

console.log('\n⑤ الأرقام تتّفق فعلًا — لا نصًّا فقط')
const d = mkdtempSync(join(tmpdir(), 'dur-'))
const out = join(d, 'b.mjs')
writeFileSync(join(d, 'e.ts'), `
  export { estimateDurationMin } from '@/lib/workoutStats'
  export { estimateSessionMinutes } from '@/features/customPlan/builder'
`)
await build({
  entryPoints: [join(d, 'e.ts')], bundle: true, format: 'esm', outfile: out, platform: 'node',
  alias: { '@': join(root, 'src') }, logLevel: 'silent',
  define: { 'import.meta.env': JSON.stringify({ MODE: 'production', PROD: true, DEV: false }) },
})
const M = await import(pathToFileURL(out).href)
const day = { id: 'd1', nameAr: 'يوم', nameEn: 'Day', exercises: Array.from({ length: 6 }, (_, i) => ({ exerciseId: `e${i}`, sets: 4, reps: '8-12', restSec: 90, order: i, notes: '', startingWeight: '' })) }
const canonical = M.estimateDurationMin(day)
const viaBuilder = M.estimateSessionMinutes(day)
check('الباني والحسّاب المركزي يعطيان نفس الرقم على نفس اليوم',
  canonical === viaBuilder && canonical > 0, `${viaBuilder} = ${canonical}`)
const old9 = Math.max(20, Math.round((day.exercises.length * 9) / 5) * 5)
check('⟲ والفرق عن التقدير القديم مقيس لا مدّعًى', old9 !== canonical, `القديم ${old9} ≠ الحالي ${canonical}`)

console.log(`\n${fails.length === 0 ? '✅' : '❌'} مصدر مدّة الجلسة — نجح ${pass} · فشل ${fails.length}`)
if (fails.length) { for (const f of fails) console.log(`   · ${f}`); process.exit(1) }
