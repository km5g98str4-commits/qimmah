// إثبات خلوّ الواجهة من لغة «القالب التجاري» — [CTO-65] البند ٦.
//
// الفجوة: قِمّة تطبيق لياقة شخصي، لكن نصوصه ورثت لغة قالب يُباع — «معاينة
// صفحتك» · «صاحب الصفحة» · «اسم صفحتك» · "Shows on your page". فالمستخدم
// يُخاطَب كمشتري قالب لا كصاحب خطة، **والإنجليزية كانت مصابة كالعربية**.
//
// فحص ساكن عمدًا: هذه **نصوص معروضة**، والتحقّق منها يكون على النصّ.
//
// ⚠️ الفصحى القانونية (الخصوصية · الشروط) **خارج النطاق ولا تُمس** — القسم ٤
// يثبت أنها ما زالت في موضعها، فلا يُقرأ «صفر مخالفات» على أنه محو لها.

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')

let pass = 0
const fails = []
const check = (label, ok) => {
  if (ok) { pass++; console.log('  ✓ ' + label) } else { fails.push(label); console.log('  ✗ ' + label) }
}

// ===== الأسطح المفحوصة: كل قواميس الواجهة + نصوص الإعداد والأقسام =====
const dictDir = 'src/i18n/dict'
const SURFACES = [
  ...readdirSync(resolve(root, dictDir)).filter((f) => f.endsWith('.ts')).map((f) => join(dictDir, f)),
  'src/config/strings.ts',
  'src/config/content.ts',
  'src/config/product.ts',
  ...readdirSync(resolve(root, 'src/components/customizer/steps')).map((f) => join('src/components/customizer/steps', f)),
].map((p) => [p, read(p)])

console.log('\n═══ 1) لغة القالب التجاري غائبة عن كل سطح واجهة ═══')
const FORBIDDEN = [
  ['«صفحتك» — المستخدم صاحب خطة لا صاحب صفحة', /صفحتك|بصفحتك/],
  ['«صفحتي»', /صفحتي/],
  ['«صاحب الصفحة»', /صاحب\s+الصفحة/],
  ['«اسم الصفحة»', /اسم\s+الصفحة/],
  ['«الصفحة الشخصية»', /الصفحة\s+الشخصية/],
  ['English: "your page"', /your\s+page/i],
  ['English: "page owner"', /page\s+owner/i],
  ['English: "page name"', /page\s+name/i],
  ['English: "page look"', /page\s+look/i],
]
for (const [label, re] of FORBIDDEN) {
  const hits = SURFACES.filter(([, src]) => re.test(src)).map(([n]) => n)
  check(`${label} — غائبة`, hits.length === 0)
  if (hits.length) console.log('       ظهرت في: ' + hits.join(', '))
}

console.log('\n═══ 2) المعنى المشروع باقٍ — «صفحة» المتصفّح ليست «صفحتك» ═══')
// استثناء مُعلَن: «الصفحة» بمعنى صفحة المتصفّح (تحديث · 404 · اتجاه النص) نصّ
// صحيح ولا علاقة له بلغة القالب. **وكل استثناء يُحرَس** (§4.2): نتحقّق أنه ما
// زال موجودًا فعلًا، فلا تبقى قائمة استثناء لشيء اختفى.
const strings = read('src/config/strings.ts')
const LEGITIMATE = [
  ['تحديث الصفحة (صفحة المتصفّح)', /حدّث الصفحة/],
  ['صفحة غير موجودة (404)', /الصفحة غير موجودة/],
  ['اتجاه الصفحة (RTL/LTR)', /اتجاه الصفحة/],
]
for (const [label, re] of LEGITIMATE) {
  check(`${label} — باقٍ ولم يُمسح بالجملة`, re.test(strings))
}

console.log('\n═══ 3) التأكيد المضادّ — الاستثناء لم يصر قاعدة (§4.2) ═══')
// أ) نصّ مخالف يحمل نفس الجذر «صفح» يجب أن **يُكشَف** رغم مشروعية «الصفحة».
const SMUGGLED = "  previewYourPage: 'معاينة صفحتك',"
check('التفاف: «معاينة صفحتك» تُكشَف رغم السماح بـ«الصفحة»', /صفحتك/.test(SMUGGLED))
check('ولا يُنجّيها وجود «الصفحة» المشروعة في نفس الملف', /صفحتك/.test(SMUGGLED + '\n' + 'حدّث الصفحة'))
// ب) والعكس: النصّ المشروع لا يُكشَف — وإلا كانت البوابة تصرخ على كل شيء.
check('«حدّث الصفحة» لا تُكشَف كلغة قالب', !FORBIDDEN.some(([, re]) => re.test('حدّث الصفحة')))
check('«الصفحة غير موجودة» لا تُكشَف', !FORBIDDEN.some(([, re]) => re.test('الصفحة غير موجودة')))
// ج) الإنجليزية: "reload the page" مشروعة، "your page" ليست.
check('English: "reload the page" لا تُكشَف', !FORBIDDEN.some(([, re]) => re.test('reload the page')))
check('English: "Shows on your page" تُكشَف', FORBIDDEN.some(([, re]) => re.test('Shows on your page')))
// د) الإثبات ليس فارغًا: الأسطح قُرئت بمحتوى فعلي.
check('كل الأسطح قُرئت بمحتوى فعلي', SURFACES.length > 25 && SURFACES.every(([, s]) => s.length > 100))
check('قاموس الإعداد ضمن المفحوص فعلًا', SURFACES.some(([n]) => n.endsWith('onboarding.ts')))

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══ 3.5) صفّ «النوع: فرد» محذوف من المعاينة الحيّة — [CTO-67] البند ٢ ═══')
// **لماذا لم يكفِ توسيع قائمة الكلمات:** «النوع» مفردة مشروعة في مواضع أخرى
// (رأس عمود «النوع» في جدولَي الجدول والمكمّلات). حظرها بالجملة يُسقط البوابة
// على نصّ سليم، وتركها يُبقي المخالفة. فالحارس هنا **بنيوي على الموضع** لا
// معجمي على الكلمة: يمنع عودة الصفّ إلى `PreviewSummary` تحديدًا.
//
// والمخالفة كانت مزدوجة: «النوع: فرد» مفهوم قالب متعدّد المستأجرين (فرد/مدرب/
// صانع محتوى)، **وقيمتها بلا ترجمة** فتظهر «Type: فرد» في الواجهة الإنجليزية.
// التعليقات تُنزع قبل الفحص: الحارس يحكم على **الكود المنفَّذ** لا على شرحه،
// وإلا أسقطه تعليق يشرح ما حُذف — وهو ما وقع فعلًا عند كتابة هذا الفحص.
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const preview = stripComments(read('src/components/customizer/PreviewSummary.tsx'))
const onboardingDict = read('src/i18n/dict/onboarding.ts')
check('المعاينة لا تستورد `userTypeOptions`', !/userTypeOptions/.test(preview))
check('المعاينة لا تعرض `identity.userType`', !/identity\.userType/.test(preview))
check('المعاينة لا تعرض مفتاح `previewType`', !/previewType/.test(preview))
check('ومفتاح `previewType` نفسه أُزيل من القاموس بلغتيه', !/previewType/.test(onboardingDict))

// اقتران بالخطوات الحيّة: المفهوم قد يعود من باب آخر — خطوة تعرض `userType`
// وتُدرَج في المعالج. فنقرأ **مصفوفات الخطوات المركَّبة فعلًا** في وضع «متقدّم»
// (وهو الوضع الوحيد الذي يُركِّب المعالج — `SetupView.tsx`)، ونفحص ملفّاتها.
// ⚠️ استثناء مُعلَن: `StepBasics` يعرض `userType` وهو **خارج هذه المصفوفات**
// (لا مسار يصل إليه اليوم). فحصه هنا يقول ذلك صراحةً بدل السكوت عنه.
const center = read('src/sections/CustomizationCenter.tsx')
const liveStepBlock = center.slice(center.indexOf('const advancedEssentialSteps'), center.indexOf('/** مركز التخصيص'))
const liveStepComponents = [...liveStepBlock.matchAll(/Component:\s*(\w+)/g)].map((m) => m[1])
check('مصفوفات الخطوات الحيّة استُخرجت بمحتوى فعلي', liveStepComponents.length >= 8 && liveStepComponents.includes('StepReview'))
check('`StepBasics` خارج الخطوات الحيّة (وإلا عاد الحقل من بابه)', !liveStepComponents.includes('StepBasics'))
const liveStepSources = liveStepComponents.map((name) => [name, stripComments(read(`src/components/customizer/steps/${name}.tsx`))])
const typeLeaks = liveStepSources.filter(([, src]) => /identity\.userType|userTypeOptions|صانع\s+محتوى/.test(src)).map(([n]) => n)
check('ولا خطوة حيّة تعرض شريحة المشتري (فرد/مدرب/صانع محتوى)', typeLeaks.length === 0)
if (typeLeaks.length) console.log('       ظهرت في: ' + typeLeaks.join(', '))
// الاستثناء المشروع يُحرَس (§4.2): «النوع» كرأس عمود جدول باقٍ ولم يُمسح بالجملة.
check('«النوع» المشروعة (رأس عمود الجدول) باقية ولم تُمسح بالجملة', /scheduleColType:\s*'النوع'/.test(onboardingDict) && /suppColType:\s*'النوع'/.test(onboardingDict))
// التأكيد المضادّ: نسخة تعيد الصفّ تُكشَف، والنسخة الحالية لا تُكشَف.
const SMUGGLED_ROW = "<span className=\"text-ink-500\">{d.previewType}</span>"
check('التفاف: عودة صفّ النوع إلى المعاينة تُكشَف', /previewType/.test(SMUGGLED_ROW))
check('التفاف: عودة القيمة عبر `userTypeOptions` تُكشَف كذلك', /userTypeOptions/.test("const t = userTypeOptions.find((o) => o.value === data.identity.userType)"))
check('ولا يُكشَف رأس عمود «النوع» المشروع', !/previewType|userTypeOptions/.test("  scheduleColType: 'النوع',"))

console.log('\n═══ 4) الفصحى القانونية لم تُمس — القيد المحفوظ ═══')
const policy = read('src/data/policyCopy.ts')
// النصّ القانوني نفسه يعيش في `strings.ts → legal`، لا في ملفّي العرض — فحصه
// على مصدره لا على المكوّن، وإلا مرّ الفحص على غلاف فارغ.
const legalBlock = strings.slice(strings.indexOf('privacyBody: ['))
check('كتلة الخصوصية القانونية ما زالت موجودة', /privacyBody:\s*\[/.test(strings))
check('كتلة الشروط القانونية ما زالت موجودة', /termsBody:\s*\[/.test(strings))
check('مربّع الأهلية القانوني قائم', policy.includes('eligibilityPrefix'))
// عيّنة فصحى صريحة: لو حُوّل القانوني إلى عامية بالخطأ لسقط هذا.
check('الخصوصية ما زالت بالفصحى (عيّنة مسمّاة)', legalBlock.includes('لا نبيع بياناتك ولا نشاركها مع معلنين'))
check('وشاشتا العرض ما زالتا تستدعيان النصّ القانوني', read('src/views/PrivacyView.tsx').includes('privacyBody') && read('src/views/TermsView.tsx').includes('termsBody'))

console.log(`\n${fails.length === 0 ? '✅' : '❌'} إثبات خلوّ الواجهة من لغة القالب: ${pass} فحصًا، ${fails.length} فشل.`)
if (fails.length) { for (const f of fails) console.log('   ✗ ' + f); process.exit(1) }
