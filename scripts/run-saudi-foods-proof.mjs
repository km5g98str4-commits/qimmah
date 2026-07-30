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
      export { foodItems, searchFood, normalizeSearch } from '@/data/foodItems'
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
const { foodItems, searchFood, normalizeSearch, servingSummary } = mod

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

console.log('\n═══ 5) التوصيل: الشاشة تستخدم البحث فعلًا ═══')
const view = read('src/views/NutritionV2.tsx')
check('شاشة التغذية تستورد searchFood', /import \{[^}]*\bsearchFood\b[^}]*\} from '@\/data\/foodItems'/.test(view))
check('شاشة التغذية تستدعيه على نصّ البحث', /searchFood\(q\)/.test(view))
check('لا رجوع للمطابقة الخام في الشاشة', !/nameAr\.includes\(query\)/.test(view))

console.log('\n═══ 6) صدق عرض الحصة في الواجهة الإنجليزية ═══')
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

console.log(`\n✅ نجحت كل الفحوص — ${pass} فحصًا (${saudi.length} طبقًا سعوديًا · ${foodItems.length} صنفًا في القاعدة).`)
