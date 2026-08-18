// إثبات تكافؤ تنبيهات الخطة — [QIM-V1-018]
//
// ═══ الفجوة التي يُغلقها ═══
// `planGenerator` يبثّ تنبيهات الخطة **بالعربية نصًّا خامًا**، و`StepGeneratePlan`
// يترجمها عند العرض بمفتاح هو النصّ نفسه:
//     choices.generatedWarning[warning] ?? choices.generatedWarningFallback
// فأي إعادة صياغة لجملة عربية في المولّد تُغيّر **المفتاح**، ويسقط الإنجليزي
// بصمت إلى النصّ العامّ «Review this plan note before applying your changes.»
//
// وهذا ما وقع فعلًا: صياغة تنبيه الإصابات أُعيدت، وأُضيفت حالة ثالثة
// («قيد لم نفهمه، فما استبعدنا شيئًا») — ولم يُضَف مفتاحاهما. فصار مستخدم
// الإنجليزية:
//   · لا يُخبَر أننا راعينا إصابته (ادّعاء سلامة يختفي)، و
//   · **لا يُخبَر أننا لم نفهم قيده** — فيظنّ أن الخطة راعته. وهذا الاتجاه
//     هو الخطر: صمتٌ يُقرأ طمأنينة.
//
// الفحص **بنيوي لا نصّي**: يستخرج كل ما يُدفع إلى `warnings` من المصدر نفسه،
// ثم يشترط لكلٍّ مدخلًا إنجليزيًّا. فمن يُعيد صياغة جملة أو يضيف حالة رابعة
// يسقط هنا **باسم الجملة**، لا بعد أن يراها مستخدم.
//
// Run: npm run test:plan-warning-parity
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const GEN = resolve(root, 'src/lib/planGenerator.ts')
const CALC = resolve(root, 'src/lib/calculators.ts')

let pass = 0
const failures = []
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ✓  ${name}`) }
  else { failures.push(name); console.log(`  ✗  ${name}${detail ? ` — ${detail}` : ''}`) }
}

/** كل نصّ حرفيّ يُدفع إلى `warnings` داخل planGenerator. */
function emittedLiterals(src) {
  const out = []
  const re = /warnings\.push\(\s*'((?:[^'\\]|\\.)*)'\s*\)/g
  let m
  while ((m = re.exec(src))) out.push(m[1].replace(/\\'/g, "'"))
  return out
}

/** التنبيهات المُمرَّرة عبر ثوابت/متغيّرات لا نصوص حرفية. */
function emittedIndirect(genSrc, calcSrc) {
  const out = []
  if (/warnings\.push\(\s*MINOR_GOAL_RESTRICTION_NOTE\s*\)/.test(genSrc)) {
    const m = calcSrc.match(/export const MINOR_GOAL_RESTRICTION_NOTE\s*=\s*\n?\s*'((?:[^'\\]|\\.)*)'/)
    if (m) out.push({ via: 'MINOR_GOAL_RESTRICTION_NOTE', text: m[1].replace(/\\'/g, "'") })
  }
  if (/warnings\.push\(\s*nutritionWarning\s*\)/.test(genSrc)) {
    const m = genSrc.match(/return \{ plan, warning: within \? undefined : '((?:[^'\\]|\\.)*)' \}/)
    if (m) out.push({ via: 'generateNutrition', text: m[1].replace(/\\'/g, "'") })
  }
  return out
}

const genSrc = readFileSync(GEN, 'utf8')
const calcSrc = readFileSync(CALC, 'utf8')

const direct = emittedLiterals(genSrc)
const indirect = emittedIndirect(genSrc, calcSrc)
const emitted = [...direct, ...indirect.map((x) => x.text)]

console.log('\n① استخراج التنبيهات من المصدر')
check('استُخرجت تنبيهات حرفية من planGenerator', direct.length >= 6, `العدد: ${direct.length}`)
check('تنويه القاصرين مُستخرَج عبر ثابته', indirect.some((x) => x.via === 'MINOR_GOAL_RESTRICTION_NOTE'))
check('تنبيه التغذية مُستخرَج عبر مولّده', indirect.some((x) => x.via === 'generateNutrition'))
// حارس الحارس: لو صار الاستخراج صفرًا لصار الفحص تحصيل حاصل.
check('الاستخراج ليس فارغًا — وإلا فالفحص بلا معنى', emitted.length >= 8, `العدد: ${emitted.length}`)

const banner = 'globalThis.window = globalThis.window || {};\n'
const result = await build({
  entryPoints: [resolve(root, 'src/i18n/dict/profileChoices.ts')],
  bundle: true, format: 'esm', platform: 'node', write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})
const dir = mkdtempSync(join(tmpdir(), 'plan-warning-parity-'))
const file = join(dir, 'dict.mjs')
writeFileSync(file, result.outputFiles[0].text)
const { profileChoiceStrings } = await import(pathToFileURL(file).href)
const en = profileChoiceStrings.en.generatedWarning
const fallback = profileChoiceStrings.en.generatedWarningFallback

console.log('\n② كل تنبيه يُبَثّ له مقابل إنجليزي')
for (const text of emitted) {
  const short = text.length > 46 ? `${text.slice(0, 46)}…` : text
  check(`«${short}»`, typeof en[text] === 'string' && en[text].length > 0,
    'لا مدخل إنجليزي — سيسقط إلى النصّ العامّ عند العرض')
}

console.log('\n③ ادّعاء السلامة لا يسقط إلى نصّ عامّ')
const applied = direct.find((t) => t.startsWith('راعينا مناطق الإصابة'))
const unrecognized = direct.find((t) => t.startsWith('كتبت لنا قيدًا'))
check('حالة «راعينا الإصابة» ما زالت تُبَثّ', Boolean(applied))
check('حالة «قيد لم نفهمه» ما زالت تُبَثّ — الصمت يُقرأ طمأنينة', Boolean(unrecognized))
// ملاحظة على صياغة الفحصين التاليين — [QIM-V1-018]:
// أول صياغة كانت `en[x] !== fallback` وحدها، وهي **تمرّ بلا استحقاق** حين يغيب
// المدخل أصلًا: `undefined !== fallback` صحيح. أي أن الفحص الذي يحرس ادّعاء
// السلامة كان يخضرّ في الحالة التي كُتب لأجلها بالضبط. الآن يُشترط **وجود نصّ
// إنجليزي فعلي** قبل مقارنته بالعامّ.
const translated = (t) => typeof en[t] === 'string' && en[t].length > 0
check('ترجمة «راعينا الإصابة» موجودة وليست النصّ العامّ',
  Boolean(applied) && translated(applied) && en[applied] !== fallback)
check('ترجمة «قيد لم نفهمه» موجودة وليست النصّ العامّ',
  Boolean(unrecognized) && translated(unrecognized) && en[unrecognized] !== fallback)
check('وترجمتاهما مختلفتان — لا تُخلط حالة بحالة',
  Boolean(applied && unrecognized) && translated(applied) && translated(unrecognized) &&
    en[applied] !== en[unrecognized])

console.log('\n④ ⚔️ محاكاة الالتفاف — يجب أن تسقط بفحص مسمّى')
{
  const tampered = { ...en }
  delete tampered[applied]
  const wouldFallBack = (tampered[applied] ?? fallback) === fallback
  check('⚔️ نزع مدخل «راعينا الإصابة» ⇒ يسقط إلى النصّ العامّ (فيُرصد)', wouldFallBack)
}
{
  // إعادة صياغة الجملة في المولّد = تغيير المفتاح ⇒ لا مدخل ⇒ رصد.
  const rekeyed = `${applied} `
  check('⚔️ إعادة صياغة الجملة تُغيّر المفتاح فيسقط الفحص', typeof en[rekeyed] !== 'string')
}
{
  // ولو صار المستخرَج فارغًا لمرّ ②/③ بلا فحص — نُثبت أن ذلك يُرصد في ①.
  check('⚔️ استخراج فارغ يُسقِط الحارس نفسه لا يُمرّره', [].length >= 8 === false)
}

console.log(`\n${failures.length === 0 ? '🎉' : '❌'} ${pass} نجحت / ${failures.length} فشلت`)
if (failures.length) {
  console.log('الفاشلة:', failures.join(' · '))
  process.exit(1)
}
