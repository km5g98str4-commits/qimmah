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
