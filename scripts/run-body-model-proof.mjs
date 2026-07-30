// ⛔ خارج `test:gate` عن قصد — استبعاد موثَّق لا تعطيل صامت.
//
// السبب: هذا الإثبات يفحص **شكل** مجسّم العضلات كما بُني على خطّ
// `release/v1.2.0-rc`، وعند توحيد الجبهة فاز مجسّم `q17` لأنه يحمل تدقيق محرّك
// `p14` بتطابق بايت-ببايت (mesh/raster/render).
//
// ما يغطّي ضماناته السلوكية: `test:body3d` (٢٤ فحصًا، داخل البوابة) — ومنه
// «الإطار ضمن ميزانية ٦٠ إطارًا (١٦٫٧م.ث)».
//
// ⚠️ قبل أرشفته نهائيًا: أي تأكيد **سلوكي** فيه لا نظير له في `test:body3d`
// يُنقل إليه أولًا.
//
// إثبات مجسّم العضلات (RC v1.2.0).
//
// الفجوة: قبل هذا لم تكن الواجهة تعرض جسمًا عضليًا إطلاقًا — لا في ProgressV2 ولا
// في غيرها. كان MuscleCoverageGrid بلا مستوردين، و muscleMapLib بلا مستوردين،
// و react-body-highlighter اعتمادية مثبّتة لا تُرسَم أبدًا. محرّك التغطية
// (computeWeeklyCoverage) كان يُستهلك في MyStatsView كأرقام فقط.
//
// هذا الإثبات يحرس: التركيب، غياب الاعتماديات الخارجية للمحرّك، الالتزام بقاعدة
// التوطين (لا نصوص داخل JSX)، والتحميل الكسول (المحرّك ثقيل ولا يدخل حزمة الشاشة).
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { strict as assert } from 'node:assert'

const root = resolve(import.meta.dirname, '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')
let pass = 0
const check = (label, cond) => { assert.ok(cond, `FAIL: ${label}`); pass++; console.log(`  ✓ ${label}`) }

console.log('════════ إثبات مجسّم العضلات — قِمّة ════════')

const ENGINE = ['src/lib/body3d/math.ts', 'src/lib/body3d/mesh.ts', 'src/lib/body3d/raster.ts', 'src/lib/body3d/render.ts']
const DATA = ['src/data/bodyModel3d.ts', 'src/data/bodyAnatomy.ts']
const comp = read('src/components/BodyModel3D.tsx')
const flat = read('src/components/FlatMuscleBody.tsx')
const progress = read('src/views/ProgressV2.tsx')
const dict = read('src/i18n/dict/bodyModel.ts')
const pkg = JSON.parse(read('package.json'))

console.log('\n═══ 1) الملفات موجودة ═══')
for (const f of [...ENGINE, ...DATA]) check(`${f.replace('src/', '')} موجود`, read(f).length > 0)

console.log('\n═══ 2) بلا اعتماديات خارجية (رسم محلي — قاعدة المشروع) ═══')
for (const f of ENGINE) {
  const s = read(f)
  const externals = [...s.matchAll(/^import .* from '([^.@][^']*)'/gm)].map((m) => m[1])
  check(`${f.replace('src/lib/body3d/', '')} لا يستورد أي حزمة خارجية`, externals.length === 0)
}
check('لا مكتبة رسم عضلات في الاعتماديات', !pkg.dependencies['react-body-highlighter'])
check('الجسر الميت muscleMapLib حُذف', !readdirSync(resolve(root, 'src/lib')).includes('muscleMapLib.ts'))
check('لا حزمة vendor-charts ميتة في vite.config', !/vendor-charts/.test(read('vite.config.ts')))

console.log('\n═══ 3) مركَّب على شاشة التقدّم ═══')
check('ProgressV2 يستورد المجسّم كسولًا', /const BodyModel3D = lazy\(\(\) => import\('@\/components\/BodyModel3D'\)/.test(progress))
check('ProgressV2 يركّبه داخل Suspense', /<Suspense[\s\S]{0,200}<BodyModel3D lang=\{lang\} \/>/.test(progress))

console.log('\n═══ 4) التوطين — لا نصوص داخل JSX ═══')
for (const [name, src] of [['BodyModel3D', comp], ['FlatMuscleBody', flat]]) {
  const body = src.slice(src.indexOf('export function'))
  // نص عربي حرفي بين وسمين، أو داخل سلسلة مفردة تُعرض للمستخدم
  check(`${name}: لا نص عربي حرفي بين الوسوم`, !/[^=]>[^<>{}]*[؀-ۿ][^<>{}]*</.test(body))
  check(`${name}: يقرأ من قاموس bodyModel`, /bodyModelStrings/.test(src))
  // توقيع المكوّن نفسه يجب أن يستقبل lang (لا نكتفي بورود الكلمة في الملف).
  const sig = body.slice(0, body.indexOf(') {') + 3)
  check(`${name}: توقيعه يستقبل lang`, /\blang\b/.test(sig))
}
check('كل مفاتيح القاموس معرّفة في العربية والإنجليزية', (() => {
  const iface = dict.slice(dict.indexOf('export interface BodyModelStrings'), dict.indexOf('const ar:'))
  const keys = [...iface.matchAll(/^\s{2}(\w+)[?:(]/gm)].map((m) => m[1])
  const arBlock = dict.slice(dict.indexOf('const ar:'), dict.indexOf('const en:'))
  const enBlock = dict.slice(dict.indexOf('const en:'), dict.indexOf('export const bodyModelStrings'))
  return keys.length >= 15 && keys.every((k) => new RegExp(`\\b${k}:`).test(arBlock) && new RegExp(`\\b${k}:`).test(enBlock))
})())

console.log('\n═══ 5) صدق البيانات — التغطية من الجلسات الحقيقية ═══')
check('يحسب التغطية من محرّك التغطية لا من أرقام مُختلقة', /computeWeeklyCoverage/.test(comp))
check('يقرأ الجلسات الحقيقية', /loadSessions/.test(comp))
check('غير المُدرَّب يبقى محايدًا (بلا لوم)', /untouchedHint|emptyHint/.test(comp))

console.log('\n═══ 6) الوصول ═══')
check('الرسم المسطّح يحمل وصفًا للوصول', /aria-label=\{s\.mapAriaLabel\(/.test(flat))
check('المجسّم يوفّر بديلًا مسطّحًا للأجهزة الضعيفة', /'3d' \| 'flat'/.test(comp))

console.log(`\n✅ إثبات مجسّم العضلات: ${pass} فحصًا، 0 فشل.`)
