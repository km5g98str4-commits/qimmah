// إثبات: لا شريط ثابت يحتلّ قاع الشاشة فوق جذر التطبيق.
// [QIM-WEB-FOUNDER-UX-003] الحزمة ١.
//
// الواقعة التي أنشأت هذه البوابة (مقيسة على البناء المعتمد cc60adf، ٣٩٠×٧٨٠،
// أندرويد/كروم حيث يُطلق `beforeinstallprompt`):
//   • شريط «ثبّت التطبيق» كان `fixed inset-x-0 bottom-0 z-[60]` بارتفاع ١٧٢بكسل.
//   • شريط التنقّل السفلي في `MobileShell` هو `z-50` **داخل** التدفّق.
//   ⇒ `document.elementFromPoint` في مركز **كل** عنصر تنقّل من الخمسة، وفي مركز
//     «كمّل كضيف» على الهبوط و«ادخل وشوف خطتي» على التسليم، كان يعيد الشريط.
//     أي أن قاع التطبيق كله لم يكن قابلًا للنقر بالإصبع — بينما `.click()`
//     البرمجي يمرّ لأنه يتجاوز اختبار الإصابة. وهذا مصدر «يشتغل مرة ومرة لا».
//
// لماذا فحص بنيوي وليس متصفّحًا هنا: البوابة المحلّية بلا متصفّح عمدًا (الميثاق
// §4.0). القياس الحقيقي بـ`elementFromPoint` يعيش في `test:e2e:install-overlap`.
// هذا الفحص يمنع **عودة البنية** التي تنتج العطل، ويُهاجَم بمحاكاة التفاف أدناه.

import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')
let pass = 0
const check = (label, condition) => {
  if (!condition) throw new Error(`FAIL: ${label}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}

/**
 * يزيل التعليقات قبل أي تحليل. ضروري لا تجميلي: هذا الإثبات نفسه سقط أول مرّة
 * على **تعليق** يشرح المكوّن المحذوف (`<InstallPrompt/>` داخل نصّ توضيحي). بوابة
 * تقرأ التعليقات كأنها كود تُنذر كذبًا، والإنذار الكاذب يُدرَّب الناس على تجاهلها.
 */
function stripComments(source) {
  // ⚠️ لا قاعدة خاصّة بتعليق JSX. كانت هنا قاعدة `\{\s*/\*…\*/\s*\}` تبدو
  // بريئة وهي **تبتلع ملفات كاملة**: تُطابق `{` أي كتلة يليها `/**`، ثم يمتدّ
  // الكسول إلى أوّل `*/` **يعقبه `}`** ولو بعد ألفي حرف. اكتُشفت حين أسقطت دالة
  // كاملة من تحليل إثبات آخر فبدت غير موجودة. تجريد الكتل وحده كافٍ وصحيح.
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // تعليق كتلة /* … */
    .replace(/^[ \t]*\/\/.*$/gm, ' ') // تعليق سطر //
}

/** أعلى z-index معلَن في نصّ className (Tailwind: `z-50` أو `z-[60]`). */
function maxZ(source) {
  let top = 0
  for (const m of source.matchAll(/\bz-\[(\d+)\]|\bz-(\d{2,3})\b/g)) {
    const v = Number(m[1] ?? m[2])
    if (Number.isFinite(v) && v > top) top = v
  }
  return top
}

/**
 * هل يُعلن هذا المصدر سطحًا **ثابتًا مرسًى بالقاع** يعلو شريط التنقّل (z ≥ 50)؟
 *
 * ⚠️ كانت المرساة هنا `bottom-0` وحدها — **وكان ذلك ثغرة حقيقية**: `SuccessToast`
 * يجلس على `bottom-5 z-[55]`، فمرّ من البوابة وهو يغطّي التبويبات الخمسة ستّ
 * ثوانٍ بعد الإعداد. اكتشفه إثبات المتصفّح لا هذا الفحص. فوُسِّعت المرساة إلى
 * **أي** `bottom-*` (رقم أو قيمة مخصّصة). `inset-0` وحدها نافذة ملء شاشة (حوار
 * مقصود بحاجب وحبس تركيز) لا شريطًا سفليًا، فتبقى خارج النطاق.
 */
function declaresBottomOverlay(source) {
  // خارج التعليقات كذلك: رأس `InstallPrompt.tsx` يشرح البنية المحظورة بنصّها،
  // فلو قرأنا التعليقات لصار كل ملف يشرح العطل مذنبًا بشرحه له.
  const code = stripComments(source)
  const fixed = /\bfixed\b/.test(code)
  const bottomAnchored = /\bbottom-(?:\d+|\[[^\]]+\])\b/.test(code) || /\binset-y-0\b/.test(code) || /\bbottom:\s*['\"\`]?calc\(/.test(code)
  return fixed && bottomAnchored && maxZ(code) >= 50
}

/**
 * السطح العائم مقبول فوق القاع **بشرطين معًا**، وهما عقد هذه البوابة:
 *   ١) يرتفع بارتفاع شريط التنقّل المقيس (`--qimmah-nav-h`) فلا يجلس عليه.
 *   ٢) غلافه شفّاف للمؤشّر (`pointer-events-none`) فلا يبتلع ما حوله.
 * أحدهما بلا الآخر لا يكفي: الارتفاع وحده يترك الغلاف يبتلع، والشفافية وحدها
 * تترك البطاقة نفسها جالسة على تبويب.
 */
function clearsTheNav(source) {
  const code = stripComments(source)
  return code.includes('--qimmah-nav-h') && code.includes('pointer-events-none') && code.includes('pointer-events-auto')
}

/** أسماء المكوّنات المركَّبة فعلًا في مصدر معطى (`<Name` بحرف كبير، خارج التعليقات). */
function mountedComponents(source) {
  return new Set([...stripComments(source).matchAll(/<([A-Z][A-Za-z0-9_]*)\b/g)].map((m) => m[1]))
}

/**
 * المحلّل: يعيد أسماء المكوّنات التي (أ) يركّبها جذر التطبيق و(ب) تُعلن سطحًا
 * ثابتًا مرسًى بالقاع يعلو التنقّل. قائمة فارغة = القاع نظيف.
 */
function bottomOverlaysMountedByApp(appSource, overrides = {}) {
  const mounted = mountedComponents(appSource)
  const violations = []
  for (const file of readdirSync(resolve(root, 'src/components'))) {
    if (!file.endsWith('.tsx')) continue
    const name = file.replace(/\.tsx$/, '')
    if (!mounted.has(name)) continue
    const source = overrides[name] ?? read(`src/components/${file}`)
    if (declaresBottomOverlay(source) && !clearsTheNav(source)) violations.push(name)
  }
  return violations
}

console.log('\nإثبات قاع الشاشة — لا شريط ثابت فوق جذر التطبيق')

const app = read('src/App.tsx')
const shell = read('src/components/MobileShell.tsx')
const prompt = read('src/components/InstallPrompt.tsx')

// ١) الحقيقة الأساسية: جذر التطبيق لا يركّب أي سطح سفلي ثابت.
const violations = bottomOverlaysMountedByApp(app)
check(
  `جذر التطبيق بلا سطح سفلي ثابت يعلو التنقّل${violations.length ? ` — وُجد: ${violations.join('، ')}` : ''}`,
  violations.length === 0,
)

// ٢) الوظيفة لم تُحذف: النسخة الصحيحة داخل مسار القشرة، لا فوقها.
//
// [R4-UX-INSTALL] الفحص كان يسمّي `InstallBanner` وحده، فكان يحرس **اسمًا** لا
// بنية: أي بديل أصدق يُسقط البوابة، وأي بديل أسوأ يمرّ ما دام الاسم باقيًا.
// الآن: تُستخرج دعوة التثبيت المركَّبة فعلًا من القشرة، ويُفحص **ملفّها هي**.
const MOUNTED_INVITES = ['InstallInvite', 'InstallBanner']
const mountedInvite = MOUNTED_INVITES.find((name) => shell.includes(`<${name}`)) ?? null
check(`دعوة التثبيت ما زالت مركَّبة داخل القشرة${mountedInvite ? ` (${mountedInvite})` : ''}`, mountedInvite !== null)
const invitePath = mountedInvite === 'InstallInvite' ? 'src/components/today/InstallInvite.tsx' : 'src/components/InstallBanner.tsx'
check(
  'شريط القشرة في التدفّق لا ثابتًا (لا يمكنه بنيويًا أن يعلو التنقّل)',
  mountedInvite !== null && !declaresBottomOverlay(read(invitePath)),
)
check('دليل التثبيت الدائم باقٍ في الإعدادات', read('src/views/SettingsView.tsx').includes('InstallGuideSection'))

// ٣) الاستبعاد معلَن لا صامت (الميثاق §11).
check('سبب استبعاد الشريط الثابت مكتوب في رأس ملفه', prompt.includes('غير مركَّب حاليًا') && prompt.includes('elementFromPoint'))

// ٤) شريط التنقّل ما زال في تدفّق القشرة (لا يُنقل إلى fixed سرًّا).
check('شريط التنقّل في مسار القشرة', shell.includes('شريط التنقّل السفلي في مسار القشرة') && /<nav\b[\s\S]{0,240}?relative z-50/.test(shell))

// [R4-UX-INSTALL] محاكاة الالتفاف على الفحص ٢: دعوة تثبيت تُعلن سطحًا سفليًّا
// ثابتًا يجب أن **تسقط باسمها** ولو كانت مركَّبة في القشرة. الاسم وحده لا يشفع.
{
  const attackedInvite = read(invitePath).replace('className="flex flex-wrap', 'className="fixed inset-x-0 bottom-0 z-[60] flex flex-wrap')
  if (attackedInvite === read(invitePath)) throw new Error('FAIL: محاكاة دعوة التثبيت لم تُغيّر شيئًا — الإثبات معطوب')
  check('محاكاة الالتفاف: دعوة تثبيت ثابتة في القاع تُكتشف باسمها', declaresBottomOverlay(attackedInvite))
}

// ————————————————— محاكاة الالتفاف (الميثاق §4.2) —————————————————
// إحكامٌ لم يُهاجَم لا يُقبل. نُعيد تركيب الشريط الثابت في نسخة **مُصطنَعة** من
// جذر التطبيق ونطالب المحلّل بأن يسقط **باسم المكوّن** لا بخطأ تقني عابر.
{
  const attacked = app.replace('</RouteErrorBoundary>', '  <InstallPrompt lang={LANG} />\n      </RouteErrorBoundary>')
  if (attacked === app) throw new Error('FAIL: محاكاة الالتفاف لم تُغيّر شيئًا — الإثبات نفسه معطوب')
  const caught = bottomOverlaysMountedByApp(attacked)
  check('محاكاة الالتفاف: إعادة الشريط الثابت تُكتشف باسمها', caught.includes('InstallPrompt'))
}
// محاكاة ثانية: شريط سفلي **جديد** بمكوّن آخر يجب أن يُكتشف كذلك — البوابة تحرس
// البنية لا اسمًا واحدًا. نستعمل مكوّنًا قائمًا يُعلن سطحًا سفليًا ثابتًا.
{
  const bottomDeclarers = readdirSync(resolve(root, 'src/components'))
    .filter((f) => f.endsWith('.tsx'))
    .filter((f) => declaresBottomOverlay(read(`src/components/${f}`)) && !clearsTheNav(read(`src/components/${f}`)))
    .map((f) => f.replace(/\.tsx$/, ''))
  check('يوجد مكوّن واحد على الأقل يُعلن سطحًا سفليًا ثابتًا بلا إزاحة (وإلا فالمحلّل لا يفحص شيئًا)', bottomDeclarers.length > 0)
  const other = bottomDeclarers.find((n) => n !== 'InstallPrompt') ?? bottomDeclarers[0]
  const attacked = app.replace('</RouteErrorBoundary>', `  <${other} />\n      </RouteErrorBoundary>`)
  check(`محاكاة الالتفاف بمكوّن آخر (${other}) تُكتشف كذلك`, bottomOverlaysMountedByApp(attacked).includes(other))
}

// ————————————————— محاكاة ثالثة: الثغرة التي أفلتت فعلًا —————————————————
// `SuccessToast` مرّ من النسخة الأولى من هذه البوابة لأنه `bottom-5` لا `bottom-0`،
// وغطّى التبويبات الخمسة ستّ ثوانٍ. لا يكفي أن نصلحه — يجب أن **تسقط البوابة**
// لو عاد. نُنكس إزاحته في نسخة مصطنعة ونطالب باكتشافه باسمه.
{
  const toast = read('src/components/SuccessToast.tsx')
  check('الإشعار الحالي يرتفع فوق التنقّل ويمرّ المؤشّر من غلافه', declaresBottomOverlay(toast) && clearsTheNav(toast))
  check('الإشعار مركَّب فعلًا في جذر التطبيق (وإلا فالفحص يحرس ملفًا لا يُعرض)', mountedComponents(app).has('SuccessToast'))
  // نبني النسخة المنكوسة من **الكود بعد نزع التعليقات**: التعليق أعلاه يشرح
  // العطل بنصّه (`bottom-5 z-[55]`)، فأي تعديل على النصّ الخام كان يصيب الشرح
  // لا الكود — ومحاكاةٌ تعدّل تعليقًا لا تُثبت شيئًا. (سقطت هكذا أول مرّة.)
  const regressed = stripComments(toast)
    .replace(/style=\{\{ bottom:[^}]+\}\}/, '')
    .replace(/pointer-events-none /g, '')
    .replace(/pointer-events-auto /g, '')
    .replace(/z-\[55\]/, 'z-[55] bottom-5')
  if (clearsTheNav(regressed) || !declaresBottomOverlay(regressed)) {
    throw new Error('FAIL: محاكاة النكس لم تُنتج البنية المعطوبة — الإثبات نفسه معطوب')
  }
  check(
    'محاكاة الالتفاف: نكسُ إزاحة الإشعار فوق التنقّل يُكتشف باسمه',
    bottomOverlaysMountedByApp(app, { SuccessToast: regressed }).includes('SuccessToast'),
  )
}

console.log(`\n✅ قاع الشاشة: ${pass} فحوص، 0 فشل.`)
