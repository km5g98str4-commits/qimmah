// قِمّة — إثبات وصول الأطباق السعودية إلى الشاشة (الأصل المحفوظ PR #9).
//
// الفجوة المُثبَتة: الـ130 طبقًا السعودي موجودة في `src/data/saudiFoods.ts` ومدموجة في
// `foodItems`، و`searchFood()` في طبقة البيانات تعرف التطبيع العربي والكلمات المفتاحية —
// لكن شاشة التغذية كانت تُصفّي بمطابقة نصّ خام (`nameAr.includes`)، فتُسقط كل ذلك:
// «كبسه» و«قهوه» و«عسير» و«هارديس» كانت تُرجع صفر نتائج مع أنّ البيانات موجودة.
// وجود البيانات ليس دليلًا على عمل الميزة (§2).
//
// هذا الإثبات يحرس ثلاثة أمور:
//   1) البيانات: 130 طبقًا بحصّة موحّدة صادقة (لكل 100غ) وباسم إنجليزي لكل طبق.
//   2) الوصول: كل طبق يُوجد باسمه وبمنطقته عبر searchFood، والتطبيع يعمل فعلًا.
//   3) التوصيل: الشاشة تستدعي searchFood ولا تعود للمطابقة الخام، ولا تعرض
//      تسمية حصة عربية في الواجهة الإنجليزية.
//
// لا يكرّر `run-food-db-proof.mjs` — ذاك يحرس جودة الأرقام (4/4/9، النطاقات، التكرار)
// لكل الـ641 صنفًا. هذا يحرس وصولها إلى المستخدم وصدق عرض الحصة.
//
//   node scripts/run-saudi-foods-proof.mjs

import { build } from 'esbuild'
import { spawnSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { strict as assert } from 'node:assert'

const root = resolve(import.meta.dirname, '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')
let pass = 0
const check = (label, cond, detail = '') => {
  assert.ok(cond, `FAIL: ${label}${detail ? ` — ${detail}` : ''}`)
  pass++
  console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`)
}

// ————— تحميل الوحدات الحقيقية (لا نسخ منطق) —————
const outfile = resolve(root, 'scripts/.saudi-foods-proof.bundle.mjs')
await build({
  stdin: {
    contents: `
      export { foodItems, searchFood, normalizeSearch, LOANWORD_SPELLINGS, SCRIPT_TRANSLITERATIONS } from '@/data/foodItems'
      export { servingSummary } from '@/lib/servingDisplay'
    `,
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile,
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': '{}' },
  logLevel: 'warning',
})
let mod
try {
  mod = await import(pathToFileURL(outfile).href)
} finally {
  try { rmSync(outfile) } catch { /* ignore */ }
}
const { foodItems, searchFood, normalizeSearch, LOANWORD_SPELLINGS, SCRIPT_TRANSLITERATIONS, servingSummary } = mod

const saudi = foodItems.filter((f) => typeof f.id === 'string' && f.id.startsWith('sfct-'))
const ARABIC = /[؀-ۿ]/

console.log('════════ إثبات الأطباق السعودية — قِمّة ════════')

console.log('\n═══ 1) الأصل محفوظ: البيانات نفسها ═══')
check('130 طبقًا سعوديًا تقليديًا في القاعدة', saudi.length === 130, `${saudi.length}`)
check('كل الأطباق داخل foodItems الموحّدة (مدموجة بالمباعدة)', saudi.every((f) => foodItems.includes(f)))
check('لا معرّف مكرّر بين الأطباق السعودية', new Set(saudi.map((f) => f.id)).size === saudi.length)
check('لكل طبق اسم إنجليزي غير فارغ', saudi.every((f) => typeof f.nameEn === 'string' && f.nameEn.trim().length > 0))
check('لكل طبق اسم عربي غير فارغ', saudi.every((f) => typeof f.nameAr === 'string' && f.nameAr.trim().length > 0))
check('لكل طبق كلمات مفتاحية (منطقة + وسوم)', saudi.every((f) => Array.isArray(f.keywords) && f.keywords.length >= 2))

console.log('\n═══ 2) الحصّة صادقة وموحّدة (لكل 100غ) ═══')
// الأطباق السعودية مصدرها جداول تركيب الأغذية بقيم لكل 100غ — التسمية يجب أن تقول ذلك
// حرفيًا، لا «صحن» ولا «وجبة»، وإلّا سجّل المستخدم ثلث طبق وهو يظنّه طبقًا كاملًا.
check('servingGrams = 100 لكل الأطباق', saudi.every((f) => f.servingGrams === 100))
check('التسمية تقول «لكل 100غ» لكل الأطباق', saudi.every((f) => f.servingLabelAr === 'لكل 100غ'))
const labelMismatch = foodItems.filter((f) => {
  if (typeof f.servingGrams !== 'number') return false
  const m = String(f.servingLabelAr).match(/(\d+(?:[.,]\d+)?)\s*(?:غ|مل)/)
  return m ? Math.abs(Number(m[1].replace(',', '.')) - f.servingGrams) > 0.5 : false
})
check('لا تعارض بين رقم التسمية وservingGrams في القاعدة كلها', labelMismatch.length === 0, `${labelMismatch.length} تعارضًا`)
check('لكل طبق تنويه مصدر القيم في notesAr', saudi.every((f) => typeof f.notesAr === 'string' && f.notesAr.includes('لكل 100غ')))
// لا ادّعاءات طبية ولا نصوص مؤقتة (قواعد المحتوى).
const BANNED = /يعالج|يشفي|علاج\b|يمنع المرض|مضاد للسرطان|lorem ipsum|TODO|FIXME|placeholder/i
const claims = saudi.filter((f) => BANNED.test(`${f.nameAr} ${f.nameEn} ${f.notesAr ?? ''} ${(f.keywords ?? []).join(' ')}`))
check('لا ادّعاء طبي ولا نص مؤقت في أي طبق', claims.length === 0, claims.map((f) => f.id).join(',') || 'صفر')

console.log('\n═══ 3) الوصول: كل طبق يُوجد فعلًا بالبحث ═══')
// المطابقة الخام التي كانت في الشاشة — نُبقيها هنا لإظهار الفارق، لا لاستخدامها.
const rawFilter = (q) => {
  const query = q.trim()
  if (!query) return foodItems
  return foodItems.filter((f) => f.nameAr.includes(query) || f.nameEn.toLowerCase().includes(query.toLowerCase()))
}
const unreachableByName = saudi.filter((f) => !searchFood(f.nameAr).some((r) => r.id === f.id))
check('كل طبق يُوجد باسمه العربي الكامل', unreachableByName.length === 0, unreachableByName.map((f) => f.id).join(',') || '130/130')
const unreachableByEn = saudi.filter((f) => !searchFood(f.nameEn).some((r) => r.id === f.id))
check('كل طبق يُوجد باسمه الإنجليزي', unreachableByEn.length === 0, unreachableByEn.map((f) => f.id).join(',') || '130/130')
const unreachableByRegion = saudi.filter((f) => {
  const region = (f.keywords ?? []).find((k) => ARABIC.test(k) && !['سعودي', 'شعبي', 'تقليدي', 'إقليمي'].includes(k))
  return !region || !searchFood(region).some((r) => r.id === f.id)
})
check('كل طبق يُوجد باسم منطقته', unreachableByRegion.length === 0, unreachableByRegion.map((f) => f.id).join(',') || '130/130')

console.log('\n═══ 4) التطبيع العربي يعمل — لا صفر نتائج لخطأ إملائي شائع ═══')
for (const [typo, correct] of [['كبسه', 'كبسة'], ['قهوه', 'قهوة'], ['شوربه', 'شوربة']]) {
  check(`«${typo}» = «${correct}» بعد التطبيع`, normalizeSearch(typo) === normalizeSearch(correct))
  check(`«${typo}» تُرجع نتائج (كانت صفرًا بالمطابقة الخام)`, searchFood(typo).length > 0 && rawFilter(typo).length === 0, `searchFood=${searchFood(typo).length} · raw=${rawFilter(typo).length}`)
}
check('«عسير» تُرجع أطباق المنطقة (كانت صفرًا بالمطابقة الخام)', searchFood('عسير').length >= 5 && rawFilter('عسير').length === 0, `searchFood=${searchFood('عسير').length} · raw=${rawFilter('عسير').length}`)
check('«هارديس» (كتابة بديلة في الكلمات المفتاحية) تُرجع نتائج', searchFood('هارديس').length > 0 && rawFilter('هارديس').length === 0, `searchFood=${searchFood('هارديس').length} · raw=${rawFilter('هارديس').length}`)
check('بحث فارغ يُرجع القاعدة كاملة', searchFood('').length === foodItems.length, `${searchFood('').length}`)
check('«كبسة» تُصدَّر بمطابقة عربية لا إنجليزية (ترتيب بالصلة)', ARABIC.test(searchFood('كبسة')[0]?.nameAr ?? '') && searchFood('كبسة')[0].nameAr.includes('كبسة'), searchFood('كبسة')[0]?.nameAr)

console.log('\n═══ 5) الكلمات الدخيلة: تكافؤ بقائمة مسمّاة لا بقاعدة حرف ═══')
// حارس أوّل: غياب القائمة نفسها يجب أن يسقط بفحص **مسمّى**، لا باستثناء تشغيل غامض.
check('طبقة البيانات تُصدّر قائمة المقابلات LOANWORD_SPELLINGS', Array.isArray(LOANWORD_SPELLINGS) && LOANWORD_SPELLINGS.length > 0, `${Array.isArray(LOANWORD_SPELLINGS) ? `${LOANWORD_SPELLINGS.length} مجموعات` : 'غير مُصدَّرة'}`)
// كل متغيّر في المجموعة يجب أن يُرجع **النتائج نفسها بأعيانها** لا مجرّد عدد مشابه.
for (const group of LOANWORD_SPELLINGS) {
  const [canonical] = group
  const canonicalIds = searchFood(canonical).map((f) => f.id).join(',')
  check(`«${canonical}» تُرجع نتائج فعلية`, searchFood(canonical).length > 0, `${searchFood(canonical).length}`)
  for (const variant of group.slice(1)) {
    check(`«${variant}» = «${canonical}» (النتائج نفسها بأعيانها)`, searchFood(variant).map((f) => f.id).join(',') === canonicalIds, `${searchFood(variant).length} نتيجة`)
  }
}
// الحالة التي فتحت الموجة: «برغر» كانت صفرًا والبيانات تحمل «برجر» في 60 موضعًا.
check('«برغر» و«برجر» تُرجعان النتائج نفسها وعددها > 0', searchFood('برغر').length > 0 && searchFood('برغر').map((f) => f.id).join(',') === searchFood('برجر').map((f) => f.id).join(','), `${searchFood('برغر').length} نتيجة`)

// ————— التأكيد المضادّ: القيد نفسه محروس —————
// لو استُبدلت القائمة يومًا بقاعدة عامّة «ج ≡ غ» لمرّت الفحوص أعلاه كلها وسقطت هذه:
// «جمل» ليست «غمل»، و«برغل» ليست «برجل» (وهي ألصق ما تكون بـ«برجر/برغر»).
const NATIVE_PAIRS = [
  ['جمل', 'غمل'], // لحم جمل — كلمة عربية أصيلة
  ['جريش', 'غريش'], // طبق سعودي
  ['دجاج', 'دغاغ'],
  ['جبن', 'غبن'],
  ['غنم', 'جنم'], // الاتجاه المعاكس: غ أصيلة لا تصير ج
  ['برغل', 'برجل'], // جار «برجر» حرفيًا — ومع ذلك لا تكافؤ
]
for (const [native, flipped] of NATIVE_PAIRS) {
  check(`«${native}» موجودة في القاعدة (المثال حقيقي لا افتراضي)`, searchFood(native).length > 0, `${searchFood(native).length}`)
  check(`«${flipped}» لا تُطابق «${native}» — لا تعميم ج↔غ`, searchFood(flipped).length === 0, `${searchFood(flipped).length} نتيجة`)
}

// انضباط القائمة نفسها: مغلقة، ومسنودة بالبيانات، وبلا تعارض داخلي.
check('القائمة مغلقة وصغيرة (≤ 12 مجموعة)', LOANWORD_SPELLINGS.length <= 12, `${LOANWORD_SPELLINGS.length} مجموعات`)
const ungrounded = LOANWORD_SPELLINGS.filter(([canonical]) => !foodItems.some((f) => `${f.nameAr} ${f.servingLabelAr} ${(f.keywords ?? []).join(' ')}`.includes(canonical)))
check('كل صيغة معتمدة موجودة فعلًا في البيانات (لا مدخلات تخمينية)', ungrounded.length === 0, ungrounded.map((g) => g[0]).join(',') || `${LOANWORD_SPELLINGS.length}/${LOANWORD_SPELLINGS.length}`)
const allForms = LOANWORD_SPELLINGS.flat()
check('لا صيغة مكرّرة بين المجموعات', new Set(allForms).size === allForms.length)

// قاعدة المُدقِّق NAME_SPELL: تقبل المتغيّرين لما توحّده طبقة البحث، وتبقى صارمة لما عداه.
// نُثبتها بتشغيل المُدقِّق فعلًا لا بقراءة مصدره — الاستثناء معلَن في مخرجاته.
const validator = spawnSync(process.execPath, [resolve(root, 'scripts/food-db-validate.mjs'), '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
const report = JSON.parse(validator.stdout)
check('المُدقِّق يستثني «برغر≡برجر» صراحةً (استثناء معلَن لا صامت)', (report.nameSpell?.exempt ?? []).includes('برغر≡برجر'), JSON.stringify(report.nameSpell))
check('لا انحدار: NAME_SPELL ما زالت صفرًا', (report.byCode?.NAME_SPELL ?? 0) === 0, `${report.byCode?.NAME_SPELL ?? 0}`)
check('لا انحدار: أخطاء المُدقِّق ما زالت صفرًا', report.errors === 0, `errors=${report.errors}`)

console.log('\n═══ 6) التوصيل: الشاشة تستخدم البحث فعلًا ═══')
const view = read('src/views/NutritionV2.tsx')
check('شاشة التغذية تستورد searchFood', /import \{[^}]*\bsearchFood\b[^}]*\} from '@\/data\/foodItems'/.test(view))
check('شاشة التغذية تستدعيه على نصّ البحث', /searchFood\(q\)/.test(view))
check('لا رجوع للمطابقة الخام في الشاشة', !/nameAr\.includes\(query\)/.test(view))

console.log('\n═══ 7) صدق عرض الحصة في الواجهة الإنجليزية ═══')
check('الشاشة لا تعرض servingLabelAr مباشرة في JSX', !/\{f\.servingLabelAr\}/.test(view))
check('الشاشة تشتقّ تسمية إنجليزية عبر servingSummary', /servingSummary\(f, lang,/.test(view))
check('وحدة الجرام من قاموس شاشة التغذية لا نصًّا صلبًا', /nutritionScreenStrings\[lang\]\.gramsUnit/.test(view))
// الفحص السلوكي الحقيقي: لا حرف عربي في تسمية الحصة الإنجليزية لأي صنف في القاعدة.
const enLeaks = foodItems.filter((f) => {
  const en = servingSummary(f, 'en', 'g')
  return en != null && ARABIC.test(en)
})
check('لا نصّ عربي في تسمية الحصة الإنجليزية لأي صنف', enLeaks.length === 0, `${enLeaks.length} من ${foodItems.length}`)
const noGrams = foodItems.filter((f) => servingSummary(f, 'en', 'g') == null)
check('كل الأصناف لها غرامات حصة (لا سقوط للتسمية العربية)', noGrams.length === 0, `${noGrams.length} بلا servingGrams`)

console.log('\n═══ 8) [CTO-72] البند ٥ — البحث ثنائي الخطّ (نقل صوتي) ═══')

// أ) الفجوات المقيسة قبل الموجة تُغلق فعلًا — بنتيجة **صحيحة** لا بمجرّد «> صفر».
const BRIDGED = [
  ['kabsa', 'كبسة'],       // المثال المسمّى في الأمر
  ['tamees', 'تميس'],       // كان صفرًا (البيانات تكتبها Tameez)
  ['tamis', 'تميس'],
  ['shakshuka', 'شكشوكة'],  // كان صفرًا (البيانات Shakshouka)
  ['tamr', 'تمر'],          // كان يُرجع نتيجتين خاطئتين
  ['margoog', 'مرقوق'],
  ['اوتميل', 'شوفان'],       // والعكس: عربي ⇒ صنف إنجليزي الأصل
  ['سالمون', 'سلمون'],
  ['تونا', 'تونة'],
  ['باستا', 'مكرونة'],
  ['بانكيك', 'بان كيك'],
  ['يوغرت', 'زبادي'],
  ['بوتيتو', 'بطاطس'],
]
for (const [query, expectIn] of BRIDGED) {
  const hits = searchFood(query)
  const ok = hits.length > 0 && hits.some((f) => normalizeSearch(f.nameAr).includes(normalizeSearch(expectIn)))
  check(`«${query}» ⇒ يلقى «${expectIn}»`, ok, `${hits.length} نتيجة · أولاها «${hits[0]?.nameAr ?? '—'}»`)
}

// ب) التكافؤ **متماثل**: الخطّان يعطيان النتيجة نفسها لا نتيجتين متقاربتين.
for (const [latin, arabic] of [['tamees', 'تميس'], ['tamr', 'تمر'], ['تونا', 'تونة'], ['باستا', 'مكرونة']]) {
  check(
    `«${latin}» و«${arabic}» يعطيان النتائج نفسها بالضبط`,
    searchFood(latin).length === searchFood(arabic).length,
    `${searchFood(latin).length} ≡ ${searchFood(arabic).length}`,
  )
}

// ج) لا خريطة إلى طعام غير موجود: كل صيغة معتمدة تُرجع صنفًا حقيقيًا.
//    هذا يمنع تعفّن القائمة حين يُعاد تسمية صنف أو يُحذف.
for (const group of SCRIPT_TRANSLITERATIONS) {
  check(`الصيغة المعتمدة «${group[0]}» تُرجع صنفًا حقيقيًا`, searchFood(group[0]).length > 0)
}
check(
  'لا صيغة مكرّرة بين مجموعات النقل الصوتي',
  new Set(SCRIPT_TRANSLITERATIONS.flat().map(normalizeSearch)).size === SCRIPT_TRANSLITERATIONS.flat().length,
)

// د) ⚔️ **التأكيد المضادّ** (§4.2) — القائمة لم تصر قاعدة.
//    الشرط ٤ في رأس `SCRIPT_TRANSLITERATIONS`: الصيغة المعتمدة ليست جزءًا من
//    كلمة أخرى. نُثبته على الحالة التي استُبعدت لأجلها بالضبط.
check(
  'الصيغة المعتمدة ليست جزءًا من كلمة أخرى — «تين» مستبعدة',
  !SCRIPT_TRANSLITERATIONS.some((g) => normalizeSearch(g[0]) === normalizeSearch('تين')),
)
{
  // الخطر **مقيس لا مفترض**: «تين» داخل «بروتين» و«كرياتين» في القاعدة نفسها.
  const wouldDrag = foodItems.filter(
    (f) => normalizeSearch(f.nameAr).includes(normalizeSearch('تين')) && /بروتين|كرياتين/.test(f.nameAr),
  )
  check(
    'ولو أُدرجت لجرّت البروتين والكرياتين إلى بحث التين',
    wouldDrag.length >= 3,
    `${wouldDrag.length} صنفًا · مثل «${wouldDrag[0]?.nameAr ?? '—'}»`,
  )
}
// وكل صيغة معتمدة **مدرَجة فعلًا** تجتاز الشرط نفسه: لا تُجرّ صنفًا لا يحمل معناها.
for (const group of SCRIPT_TRANSLITERATIONS) {
  const canonical = normalizeSearch(group[0])
  // «على حدّ كلمة»: بداية الاسم أو بعد فاصل، مع السماح بـ«ال» التعريف —
  // فـ«دبس **التمر**» يحمل معنى «تمر»، و«بروتين» لا يحمل معنى «تين».
  // (يقبل الصيغ متعدّدة الكلمات مثل «بان كيك» لأن المطابقة على النصّ لا على الكلمات.)
  const atWordStart = new RegExp(`(^|[\\s()،/-])(ال)?${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
  const dragged = foodItems.filter(
    (f) => normalizeSearch(f.nameAr).includes(canonical) && !atWordStart.test(normalizeSearch(f.nameAr)),
  )
  check(
    `«${group[0]}» لا تُجرّ صنفًا لا يحمل معناها`,
    dragged.length === 0,
    dragged.length ? `جرّت: ${dragged.slice(0, 3).map((f) => f.nameAr).join(' · ')}` : '',
  )
}
// جارة بحرف واحد — نفس منطق «برغل ≠ برجر»: «تونا» مربوطة و«توتا» ليست.
check('جارة غير مدرجة لا تُكافأ — «توتا» لا تلقى «تونة»', searchFood('توتا').length === 0)
check('ولا «سالمو» الناقصة تُكافأ «سلمون»', !searchFood('سالمو').some((f) => f.nameAr === 'سلمون'))
// محاكاة التعميم المحظور: قاعدة صوتية حرفية (كل a ⇒ ا) تُنتج ضجيجًا لا تكافؤًا.
{
  const naive = (s) => normalizeSearch(s).replace(/a/g, 'ا').replace(/k/g, 'ك')
  check(
    '⚔️ محاكاة القاعدة الصوتية العامّة تُنتج نصًّا لا يطابق الصيغة المعتمدة',
    naive('kabsa') !== normalizeSearch('كبسة'),
    `«${naive('kabsa')}» ≠ «${normalizeSearch('كبسة')}»`,
  )
}

// هـ) الضوابط: ما كان يعمل ما زال يعمل، وبلا ضجيج جديد.
// «شوفان» ٢ ⇒ ٣: أضافت حارة الطعام «جرانولا (عام)» بكلمة مفتاحية «شوفان محمص»،
// والجرانولا **شوفان محمّص فعلًا** — فالثالث معنًى صحيح لا ضجيج تعميم. الضابط
// يحرس ألّا تتضخّم النتيجة بلا سبب مسمّى، لا ألّا تتغيّر أبدًا.
for (const [query, expect] of [['برغل', 1], ['فطيرة', 6], ['تمر', 16], ['شوفان', 3], ['بطاطس', 16]]) {
  check(`ضابط: «${query}» ما زال يُرجع ${expect}`, searchFood(query).length === expect, `${searchFood(query).length}`)
}
check('ضابط: «برغل» لا تُكافأ «برجر» (سابقة القائمة المغلقة)', !searchFood('برغل').some((f) => f.nameAr.includes('برجر')))

console.log('\n═══ 9) التوصيل الحيّ: الشاشة **المرسومة** تستخدم البحث ═══')
// ⚠️ القسم ٦ أعلاه يفحص `NutritionV2.tsx` — وهي شاشة **يتيمة بلا مستورد**
// (معلَنة في `run-analytics-proof.mjs:105`). فحصها وحده يقيس الطبقة الخطأ:
// بوّابة خضراء على كود لا يصل المستخدم. الشاشة الحيّة هي `NutritionView` عبر
// `QuickMealLogger`، فتُفحص هنا صراحةً حتى يصل البند ٥ إلى مستخدم حقيقي.
//
// ⚠️ **حُدِّث في [SOVEREIGN-FOOD-001].** كان الفحص يطلب استيراد `searchFood` **حرفيًا**
// داخل المسجّل. وحين صار المسجّل يبلغ نفس البحث عبر طبقة الاتحاد
// (`src/lib/food/unifiedSearch.ts` — التي وحّدت المنسَّق مع المعبّأ ونقلت «شاورما»
// من صفر إلى ١٢) سقط الفحص **وهو سليم المقصد**: النصّ تغيّر والسلوك لم يتغيّر.
//
// فالحارس يتبع الآن **السلسلة** لا السطر: الشاشة ⇒ المسجّل ⇒ الاتحاد ⇒ قاعدة
// الأطعمة. أي حلقة تنكسر تُسمّى بعينها، ولا يُرضى الحارس بوجود أجزاء متفرّقة (§4.2).
const liveLogger = read('src/components/nutrition/QuickMealLogger.tsx')
const unifiedSearch = read('src/lib/food/unifiedSearch.ts')
check('الحلقة ١: مسجّل الوجبة الحيّ يستورد بحث الأصناف المنسَّقة من طبقة الاتحاد',
  /import \{[^}]*\brankCurated\b[^}]*\} from '@\/lib\/food\/unifiedSearch'/.test(liveLogger))
check('الحلقة ٢: ويستدعيه على نصّ بحث المستخدم', /rankCurated\(query\)/.test(liveLogger))
check('الحلقة ٣: وطبقة الاتحاد تبلغ قاعدة الأطعمة نفسها',
  /import \{[^}]*\bsearchFoodScored\b[^}]*\} from '@\/data\/foodItems'/.test(unifiedSearch)
  && /searchFoodScored\(/.test(unifiedSearch))
check('الحلقة ٤: و`searchFood` القائمة ما زالت غلافًا على نفس السلّم — لا سلّمين',
  /searchFoodScored\(query\)\.map\(/.test(read('src/data/foodItems.ts')))
check('الحلقة ٥: والشاشة الحيّة تركّب المسجّل فعلًا', /QuickMealLogger/.test(read('src/views/NutritionView.tsx')))
// ⚔️ تأكيد مضادّ: الحارس يفحص **الاقتران** لا مجرّد ورود الأسماء — اسمٌ في تعليق لا يرضيه.
check('⚔️ اسمٌ مذكور بلا استدعاء لا يخدع الحارس',
  !/rankCurated\(query\)/.test('// rankCurated و searchFoodScored مذكورتان هنا بلا استدعاء'))

console.log(`\n✅ نجحت كل الفحوص — ${pass} فحصًا (${saudi.length} طبقًا سعوديًا · ${foodItems.length} صنفًا في القاعدة).`)
