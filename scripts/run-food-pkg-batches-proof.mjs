/**
 * إثبات دفعات المنتجات المنسَّقة (PKG-*) — حارة P1.
 *
 * ═══ ما يحرسه ═══
 * الدفعة الثانية (PKG-002) تضيف **أسماء عربية** لمنتجات موجودة أصلًا في الكتالوج،
 * ولا تضيف رقمًا غذائيًا واحدًا. والخطر الوحيد في عمل كهذا أن يتسلّل رقم **مكتوب
 * بيد** بين الأرقام المنقولة — فيصير الملف يبدو مصدَّقًا وهو ليس كذلك.
 *
 * ولذلك التأكيد المركزي هنا ليس «هل الرقم معقول؟» بل:
 *
 *   ⟢ **هل كل ماكرو مطابق حرفيًا للسجلّ الذي يزعم الملفُّ أنه نقله عنه؟** ⟣
 *
 * الملف يصرّح بمصدر كل سجلّ في `carried_from_product_id`، والإثبات يفتح الشرائح
 * ويقارن رقمًا برقم. فرقمٌ كُتب بيد — ولو كان صحيحًا — يُسقط البوابة، لأن مصدره
 * ليس ما يدّعيه.
 *
 * ═══ الطبقات ═══
 *   ١) شكل الدفعة    — اسم عربي وإنجليزي وعلامة لكل سجلّ · باركود صالح وفريد.
 *   ٢) إثبات المصدر  — ماكروز مطابقة حرفيًا لسجلّ مذكور · لا ماكروز بلا مصدر ·
 *                      كل حقل غائب معلَن في `omitted_fields`.
 *   ٣) سلامة القيم   — **مصالحة أتواتر بلا نقطة عمياء** · صوديوم معقول أو محذوف معلَنًا.
 *   ٤) وصل الاستيعاب — اكتشاف متعدّد الدفعات · وسلوك PKG-001 لم يتغيّر.
 *   ٥) محاكاة التفاف (§4.2) — كل حارس أعلاه يُهاجَم بإعادة العطل الذي وُضع له،
 *      ويجب أن يسقط **بفحص مسمّى لا باستثناء تقني**.
 *
 * ═══ لماذا مصالحة أتواتر هنا أشدّ من مصالحة الخط ═══
 * `sanity.mjs` يتخطّى المصالحة حين تكون الطاقة المتوقّعة من الماكروز دون ٤٠ سعرة
 * (`predicted >= ATWATER_MIN_KCAL`)، وهو شرط **يُعمي الفحص عن المشروبات كلّها**:
 * فمرّ في الكتالوج «سفن أب زيرو» بـ١٨ سعرة وماكروز أصفار، و«كيت كات» بـ١٤ سعرة
 * مع ٢٦غ دهن — كلاهما مستحيل، وكلاهما اجتاز فحص الخط. الحدّ هنا ١٢٪ بلا استثناء.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { loadTsModule } from './food-production/lib/loadTs.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const PACK_DIR = resolve(root, 'docs/data-factory/packaged')
const SHARD_DIR = resolve(root, 'public/food/shards')

let pass = 0
let fail = 0
const failures = []
function check(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  ✅ ${name}`) }
  else { fail += 1; failures.push(name); console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`) }
}

const G = await loadTsModule('src/lib/food/gtin.ts')

// ─────────────────────────── تحميل المدخلات ───────────────────────────

const packFiles = readdirSync(PACK_DIR).filter((f) => /^PKG-\d+.*\.json$/.test(f)).sort()
const packs = packFiles.map((f) => JSON.parse(readFileSync(resolve(PACK_DIR, f), 'utf8')))
const pkg002 = packs.find((p) => p.batch === 'PKG-002')

if (!existsSync(SHARD_DIR)) {
  console.error('\n✖ لا توجد شرائح في public/food/shards — هذا الإثبات يقيس مقابلها.')
  process.exit(1)
}
/** كل سجلات الكتالوج، مفهرسة بـ`product_id` — مصدر الحقيقة للمقارنة. */
const byProductId = new Map()
for (const f of readdirSync(SHARD_DIR).filter((x) => /^shard-\d+\.json$/.test(x)).sort()) {
  const s = JSON.parse(readFileSync(resolve(SHARD_DIR, f), 'utf8'))
  for (const k of Object.keys(s.records)) {
    const r = s.records[k]
    byProductId.set(r.product_id, r)
  }
}

// ───────────────────── المدقّقات — دوال نقية تُعاد على نسخ مشوَّهة ─────────────────────

const ATWATER_MAX_PCT = 12
const SODIUM_MAX_PER_100ML = 400
const SODIUM_MAX_PER_100G = 5000
const MACRO_PAIRS = [
  ['energy_kcal', 'energy_kcal'],
  ['protein_g', 'protein_g'],
  ['carbohydrates_g', 'carbs_g'],
  ['fat_g', 'fat_g'],
]

const hasMacros = (it) => {
  const n = it.per_100g_or_100ml ?? {}
  return MACRO_PAIRS.some(([k]) => n[k] !== null && n[k] !== undefined)
}

/** انحراف أتواتر **بلا النقطة العمياء** التي في `sanity.mjs`. */
function atwaterDevPct(n) {
  const predicted = 4 * (n.protein_g ?? 0) + 4 * (n.carbohydrates_g ?? 0) + 9 * (n.fat_g ?? 0)
  const kcal = n.energy_kcal ?? 0
  if (kcal < 5 && predicted < 5) return 0
  if (predicted === 0) return kcal < 5 ? 0 : 999
  return Math.abs(kcal - predicted) / predicted * 100
}

/** يعيد قائمة مخالفات مسمّاة — الاسم هو ما يظهر في الفشل، فلا يسقط الإثبات باستثناء. */
function validatePack(pack, shardIndex) {
  const v = []
  const seenGtin = new Set()
  for (const it of pack.items ?? []) {
    const id = it.barcode ?? '(بلا باركود)'
    const n = it.per_100g_or_100ml ?? {}

    // ── الطبقة ١: الشكل ──
    if (!it.name_ar || typeof it.name_ar !== 'string' || !it.name_ar.trim()) v.push(`missing_name_ar:${id}`)
    if (!it.name_en || typeof it.name_en !== 'string' || !it.name_en.trim()) v.push(`missing_name_en:${id}`)
    if (!it.brand_ar || typeof it.brand_ar !== 'string' || !it.brand_ar.trim()) v.push(`missing_brand:${id}`)
    const cls = G.classifyGtin(it.barcode)
    if (!cls.ok) v.push(`invalid_gtin:${id}:${cls.reason}`)
    else {
      if (seenGtin.has(cls.gtin14)) v.push(`duplicate_gtin:${cls.gtin14}`)
      seenGtin.add(cls.gtin14)
    }

    // ── الطبقة ٢: إثبات المصدر ──
    const macros = hasMacros(it)
    if (macros && !it.source_off_url && !it.source_official_url) v.push(`macros_without_source_url:${id}`)
    if (macros && !it.carried_from_product_id) v.push(`macros_without_carried_from:${id}`)
    if (!macros && it.nutrition_status !== 'incomplete_flagged') v.push(`incomplete_not_flagged:${id}`)

    if (it.carried_from_product_id) {
      /**
       * ⚠️ **الخلافة المشروعة — [FOUNDER-QA-007].**
       *
       * بعد تشغيل خطّ الإنتاج يحلّ السجلّ المنسَّق **محلّ** توأمه من OFF بنفس
       * الباركود (وهذا هو المقصود: الاسم العربي يدخل الكتالوج). فيصير المصدر
       * المذكور غير موجود بمعرّفه القديم — لا لأنه لم يوجد قطّ، بل لأن هذا
       * السجلّ نفسه ورثه. فالإثبات يجب أن يمرّ **قبل التشغيل وبعده**، وإلّا
       * صار حارسًا يسقط كلّما نجح ما يحرسه.
       *
       * والخلافة تُقبل **بشرط مسمّى**: أن يحمل السجلّ الوارث نفس الباركود.
       * ادّعاءُ نقلٍ عن سجلّ لم يوجد أصلًا يبقى ساقطًا بـ
       * `carried_from_missing_in_catalog` — ويحرسه تأكيد مضادّ.
       */
      let src = shardIndex.get(it.carried_from_product_id)
      if (!src && cls.ok) {
        const heir = shardIndex.get(`qimmah_curated:${cls.gtin14}`)
        const citedGtin = String(it.carried_from_product_id).split(':')[1] ?? ''
        // الوارث يُقبل مصدرًا فقط إن كان المذكور يحمل نفس الباركود.
        if (heir && (citedGtin === cls.gtin14 || citedGtin === cls.gtin14.replace(/^0+/, ''))) src = heir
      }
      if (!src) v.push(`carried_from_missing_in_catalog:${id}:${it.carried_from_product_id}`)
      else {
        // ⟢ التأكيد المركزي: مطابقة حرفية رقمًا برقم ⟣
        for (const [packKey, recKey] of MACRO_PAIRS) {
          if (n[packKey] !== src[recKey]) {
            v.push(`macro_not_carried_verbatim:${id}:${packKey}:pack=${n[packKey]}:source=${src[recKey]}`)
          }
        }
        // الحقول الثانوية: منقولة حرفيًا، أو محذوفة **معلَنًا** بسبب.
        const declared = new Set((it.omitted_fields ?? []).map((o) => o.field))
        for (const [packKey, recKey] of [['saturated_fat_g', 'saturated_fat_g'], ['sugars_g', 'sugar_g'], ['fiber_g', 'fiber_g'], ['sodium_mg', 'sodium_mg']]) {
          if (n[packKey] === null || n[packKey] === undefined) {
            if (!declared.has(packKey)) v.push(`omission_not_declared:${id}:${packKey}`)
          } else if (n[packKey] !== src[recKey]) {
            v.push(`secondary_not_carried_verbatim:${id}:${packKey}`)
          }
        }
      }
    }

    // ── الطبقة ٣: سلامة القيم ──
    if (macros) {
      const dev = atwaterDevPct(n)
      if (dev > ATWATER_MAX_PCT) v.push(`atwater_out_of_range:${id}:${dev.toFixed(1)}pct`)
      const liquid = /مل/.test(String(it.serving_size ?? '')) || it.category_ar === 'مشروبات غازية' || it.category_ar === 'مشروبات طاقة'
      const cap = liquid ? SODIUM_MAX_PER_100ML : SODIUM_MAX_PER_100G
      if (n.sodium_mg !== null && n.sodium_mg !== undefined && n.sodium_mg > cap) {
        v.push(`implausible_sodium_carried:${id}:${n.sodium_mg}`)
      }
    }
  }
  return v
}

// ─────────────────── الطبقة ١+٢+٣: الدفعة الحقيقية ───────────────────

console.log('\n▸ الطبقة ١–٣ — PKG-002 مقابل الكتالوج')

check('PKG-002 موجود ومقروء', !!pkg002)
check('PKG-002 فيه سجلات', (pkg002?.items?.length ?? 0) > 0, `العدد ${pkg002?.items?.length ?? 0}`)

const violations = validatePack(pkg002 ?? { items: [] }, byProductId)
check(`لا مخالفة واحدة في ${pkg002?.items?.length ?? 0} سجلًا`, violations.length === 0,
  violations.slice(0, 6).join(' | '))

// تفصيل معلَن بالأرقام — كي يُقرأ العدد لا يُوصف
const items = pkg002?.items ?? []
check('كل سجلّ يحمل اسمًا عربيًا', items.every((i) => i.name_ar?.trim()), `${items.filter((i) => i.name_ar?.trim()).length}/${items.length}`)
check('كل سجلّ يحمل اسمًا إنجليزيًا', items.every((i) => i.name_en?.trim()), `${items.filter((i) => i.name_en?.trim()).length}/${items.length}`)
check('كل سجلّ يحمل علامة عربية', items.every((i) => i.brand_ar?.trim()), `${items.filter((i) => i.brand_ar?.trim()).length}/${items.length}`)
check('كل ماكرو منقول حرفيًا من سجلّ مذكور', !violations.some((x) => x.startsWith('macro_not_carried_verbatim')))
check('لا سجلّ بماكروز بلا رابط مصدر', !violations.some((x) => x.startsWith('macros_without_source_url')))
check('كل باركود صالح بخانة تحقّق mod-10', !violations.some((x) => x.startsWith('invalid_gtin')))
check('كل باركود فريد داخل الدفعة', !violations.some((x) => x.startsWith('duplicate_gtin')))
check('مصالحة أتواتر ≤ ١٢٪ لكل سجلّ (بلا نقطة عمياء)', !violations.some((x) => x.startsWith('atwater_out_of_range')))
check('كل حقل غائب معلَن في omitted_fields', !violations.some((x) => x.startsWith('omission_not_declared')))

// تقاطع الدفعات — سلعة واحدة لا تُطالب بها دفعتان.
const pkg001 = packs.find((p) => p.batch === 'PKG-001')
const g14 = (b) => { const c = G.classifyGtin(b); return c.ok ? c.gtin14 : null }
const set001 = new Set((pkg001?.items ?? []).map((i) => g14(i.barcode)).filter(Boolean))
const overlap = items.map((i) => g14(i.barcode)).filter((x) => x && set001.has(x))
check('لا تقاطع باركود بين PKG-001 وPKG-002', overlap.length === 0, overlap.slice(0, 4).join(','))

/**
 * الفجوة التي تسدّها الدفعة — مقيسة لا موصوفة، و**بحالتين لا بحالة**.
 *
 * [FOUNDER-QA-007] قبل تشغيل الخطّ: التوأم من OFF موجود **بلا اسم عربي**،
 * فالفجوة ظاهرة. بعد التشغيل: السجلّ المنسَّق ورثه **ومعه الاسم العربي**،
 * فالفجوة **مسدودة** لا غائبة. الفحص الذي يعرف حالةً واحدة يسقط عند نجاح
 * ما يحرسه — فيقيس الحالتين، ويبقى ساقطًا حين لا فجوة أصلًا.
 */
const gapState = items.map((i) => {
  const cls = G.classifyGtin(i.barcode)
  const twin = byProductId.get(i.carried_from_product_id)
  if (twin) return twin.name_ar ? 'no-gap' : 'gap-open'
  const heir = cls.ok ? byProductId.get(`qimmah_curated:${cls.gtin14}`) : undefined
  if (heir && heir.name_ar) return 'gap-closed'
  return 'unresolved'
})
const gapOk = gapState.filter((x) => x === 'gap-open' || x === 'gap-closed').length
const noGap = gapState.filter((x) => x === 'no-gap').length
check('كل سجلّ يسدّ فجوة اسم عربي فعلية في الكتالوج', gapOk === items.length,
  `${gapOk}/${items.length} (فجوة قائمة أو مسدودة) · بلا فجوة ${noGap} · غير محسوم ${gapState.filter((x) => x === 'unresolved').length}`)

// ─────────────────── الطبقة ٤: وصل الاستيعاب ───────────────────

console.log('\n▸ الطبقة ٤ — وصل الاستيعاب متعدّد الدفعات')

const ingestSrc = readFileSync(resolve(root, 'scripts/food-production/ingest-curated.mjs'), 'utf8')
check('الاستيعاب لم يعد مثبَّتًا على مسار PKG-001', !/PKG-001-saudi-gulf-packaged\.json/.test(ingestSrc))
check('الاستيعاب يكتشف كل PKG-*.json', /readdirSync\(PACK_DIR\)/.test(ingestSrc) && /\^PKG-/.test(ingestSrc))
check('الاكتشاف مفروز (حتمي)', /\.sort\(\)/.test(ingestSrc))
check('مُعرّف الدفعة يُقرأ من الملف لا نصًّا صلبًا', /source_record_id: `\$\{batch\}:/.test(ingestSrc))
check('تكرار الباركود عبر الدفعات مرفوض ومسمّى', /duplicate_gtin_claimed_by_/.test(ingestSrc))
check('كلا الدفعتين مكتشفتان', packFiles.length >= 2, packFiles.join(', '))

// ─────────────────── الطبقة ٥: محاكاة الالتفاف (§4.2) ───────────────────
//
// كل حارس أعلاه يُهاجَم بإعادة العطل الذي وُضع له. والشرط المزدوج في كل هجمة:
//   (أ) أن تسقط،  و(ب) أن تسقط **بالاسم المتوقَّع** لا باستثناء تقني.

console.log('\n▸ الطبقة ٥ — محاكاة الالتفاف: كل حارس يُهاجَم')

const clone = (o) => JSON.parse(JSON.stringify(o))
const sample = () => clone(items[0])

/** يشغّل المدقّق على دفعة مشوَّهة ويؤكّد سقوطه بفحص **مسمّى**. */
function attack(label, mutate, expectedPrefix) {
  const bad = { batch: 'ATTACK', items: [sample()] }
  let vs
  try {
    mutate(bad.items[0])
    vs = validatePack(bad, byProductId)
  } catch (e) {
    // سقوط باستثناء تقني ليس إثباتًا (§4.2) — يُبلَّغ صراحةً.
    check(`${label} — يسقط بفحص مسمّى`, false, `سقط باستثناء ${e.constructor.name} بدل فحص مسمّى`)
    return
  }
  const named = vs.filter((x) => x.startsWith(expectedPrefix))
  check(`${label} — يسقط بفحص «${expectedPrefix}»`, named.length > 0,
    named.length === 0 ? `المخالفات المرصودة: ${vs.join(' | ') || '(لا شيء — الحارس لم يعمل)'}` : '')
}

// ١) الهجمة الأهم: رقم مكتوب بيد يحلّ محلّ المنقول — ولو كان «معقولًا».
attack('حقن سعرة مكتوبة بيد تخالف السجلّ المصدر',
  (it) => { it.per_100g_or_100ml.energy_kcal = it.per_100g_or_100ml.energy_kcal + 1 },
  'macro_not_carried_verbatim')

// ٢) ماكروز بلا مصدر — الطلب الصريح في أمر الحارة.
attack('حقن ماكروز بلا رابط مصدر',
  (it) => { it.source_off_url = null; it.source_official_url = null },
  'macros_without_source_url')

attack('حقن ماكروز بلا سجلّ مصدر مذكور',
  (it) => { it.carried_from_product_id = null },
  'macros_without_carried_from')

attack('ادّعاء نقل عن سجلّ غير موجود في الكتالوج',
  (it) => { it.carried_from_product_id = 'openfoodfacts:00000000000000' },
  'carried_from_missing_in_catalog')

// ٣) الشكل.
attack('حذف الاسم العربي', (it) => { it.name_ar = '' }, 'missing_name_ar')
attack('حذف الاسم الإنجليزي', (it) => { it.name_en = null }, 'missing_name_en')
attack('حذف العلامة', (it) => { it.brand_ar = '   ' }, 'missing_brand')
attack('باركود بخانة تحقّق خاطئة', (it) => { it.barcode = '6281057002611' }, 'invalid_gtin')

// ٤) العطل الحقيقي الذي مرّ من فحص الخط: مشروب بطاقة مستحيلة وماكروز أصفار.
//    («سفن أب زيرو» ١٨ سعرة/٠ ماكروز — اجتاز `sanity.mjs` لأن المتوقَّع دون ٤٠.)
attack('إعادة النقطة العمياء: ١٨ سعرة بماكروز أصفار',
  (it) => { it.per_100g_or_100ml = { ...it.per_100g_or_100ml, energy_kcal: 18, protein_g: 0, carbohydrates_g: 0, fat_g: 0 }
            it.carried_from_product_id = null },
  'atwater_out_of_range')

// ٥) صوديوم غير معقول يُحمَل بدل أن يُحذف معلَنًا («سفن أب» ٩٢٠٠ مغ/١٠٠مل في الكتالوج).
attack('حمل صوديوم غير معقول في مشروب',
  (it) => { it.category_ar = 'مشروبات غازية'; it.per_100g_or_100ml.sodium_mg = 9200; it.carried_from_product_id = null },
  'implausible_sodium_carried')

// ٦) حقل غائب بلا إعلان.
attack('إسقاط حقل ثانوي بلا إعلانه في omitted_fields',
  (it) => { it.per_100g_or_100ml.sodium_mg = null; it.omitted_fields = [] },
  'omission_not_declared')

// ٧) مسار «ناقص لكنه مكشوف» — طلب المؤسس الصريح: المنتج يبقى قابلًا للاكتشاف
//    والنقص **يُعلَن** بدل أن تُخترع أرقامه. الاتجاهان يُثبتان معًا:
//    فحارسٌ يرفض كل ناقص يمنع المسار، وحارسٌ يقبل كل ناقص لا يحرس شيئًا.
//    ⚠️ لا سجلّ ناقص في هذه الدفعة، فلولا هذان التأكيدان لبقي المسار غير مفحوص أصلًا.
const stripMacros = (it) => {
  it.per_100g_or_100ml = { energy_kcal: null, protein_g: null, fat_g: null, saturated_fat_g: null,
    carbohydrates_g: null, sugars_g: null, fiber_g: null, sodium_mg: null }
  it.carried_from_product_id = null
}
attack('سجلّ بلا ماكروز وبلا وسم نقص',
  (it) => { stripMacros(it); it.nutrition_status = 'carried_from_verified_record' },
  'incomplete_not_flagged')
{
  const it = sample()
  stripMacros(it)
  it.nutrition_status = 'incomplete_flagged'
  const vs = validatePack({ batch: 'ATTACK', items: [it] }, byProductId)
  check('سجلّ ناقص **موسوم** يمرّ — المنتج يبقى مكتشَفًا ونقصه معلَن',
    vs.length === 0, vs.join(' | '))
}

// ٨) تكرار باركود داخل الدفعة.
{
  const bad = { batch: 'ATTACK', items: [sample(), sample()] }
  const vs = validatePack(bad, byProductId)
  check('تكرار باركود داخل الدفعة — يسقط بفحص «duplicate_gtin»',
    vs.some((x) => x.startsWith('duplicate_gtin')), vs.join(' | ') || '(الحارس لم يعمل)')
}

// ٨) **تأكيد مضادّ على المهاجِم نفسه**: الدفعة السليمة يجب أن تمرّ من نفس المدقّق.
//    لولا هذا لكان مدقّقًا يرفض كل شيء — ويبدو صارمًا وهو معطّل.
{
  const vs = validatePack({ batch: 'CLEAN', items: [sample()] }, byProductId)
  check('السجلّ السليم يمرّ من نفس المدقّق (المدقّق ليس رافضًا للكل)', vs.length === 0, vs.join(' | '))
}

// ─────────────── الطبقة ٦: هل تصل الميزة المستخدم فعلًا؟ ───────────────
//
// الدفعة كلّها بلا قيمة إن لم يفز سجلّها المنسَّق على نظيره من OFF عند إزالة التكرار.
// «وجود الملف ليس دليلًا على عمل الميزة» — فيُقاس المسار لا يُفترض.

console.log('\n▸ الطبقة ٦ — السجلّ المنسَّق يفوز فعلًا ويحمل اسمه العربي')

const { dedupe } = await import('./food-production/lib/dedupe.mjs')
const normMod = await loadTsModule('src/lib/text/foodNormalize.ts')

// عيّنة: أول ٢٥ سجلًا لها نظير حيّ في الكتالوج.
let contested = 0, wonByCurated = 0, carriedArabic = 0, conflicts = 0
for (const it of items) {
  const cls = G.classifyGtin(it.barcode)
  if (!cls.ok) continue
  /**
   * [FOUNDER-QA-007] الطرف المنافس قد يكون قد اختفى بالخلافة. فإن غاب، يُبنى
   * من الوارث نفسه **بنزع الاسم العربي** — أي إعادةُ حالةِ ما قبل الدفعة
   * حرفيًّا من بياناتها. فقانون الترجيح يُختبر في الحالتين بنفس المدخل.
   */
  let off = byProductId.get(`openfoodfacts:${cls.gtin14}`)
  if (!off) {
    const heir = byProductId.get(`qimmah_curated:${cls.gtin14}`)
    if (!heir) continue
    off = { ...heir, product_id: `openfoodfacts:${cls.gtin14}`, source: 'openfoodfacts', name_ar: null, brand_ar: null, confidence: 0.75 }
  }
  contested += 1
  const n = it.per_100g_or_100ml
  const curated = {
    ...off,
    product_id: `qimmah_curated:${cls.gtin14}`,
    source: 'qimmah_curated',
    name_ar: it.name_ar,
    brand_ar: it.brand_ar,
    energy_kcal: n.energy_kcal, protein_g: n.protein_g, carbs_g: n.carbohydrates_g, fat_g: n.fat_g,
    confidence: 0.9,
  }
  const res = dedupe([off, curated], normMod.normalizeProductKey)
  const winner = res.accepted[0]
  if (winner?.source === 'qimmah_curated') wonByCurated += 1
  if (winner?.name_ar) carriedArabic += 1
  conflicts += res.conflicts.length
}
check('كل سجلّ متنازَع عليه يفوز به المنسَّق', contested > 0 && wonByCurated === contested, `${wonByCurated}/${contested}`)
check('الفائز يحمل الاسم العربي إلى البحث', contested > 0 && carriedArabic === contested, `${carriedArabic}/${contested}`)
// النقل الحرفي للماكروز يجعل هذا صفرًا بالبناء — ولو اختُرع رقم لظهر هنا تباعدًا.
check('صفر تعارض غذائي مع سجلّ OFF (أثر النقل الحرفي)', conflicts === 0, `التعارضات ${conflicts}`)

// ─────────────────────────── الخلاصة ───────────────────────────

console.log(`\n${'─'.repeat(58)}`)
console.log(`  نجح ${pass} · فشل ${fail}`)
if (fail > 0) {
  console.log('\n  الفاشل:')
  for (const f of failures) console.log(`   • ${f}`)
  process.exit(1)
}
console.log(`  ✅ PKG-002: ${items.length} سجلًا · كل ماكرو منقول حرفيًا من سجلّ مذكور`)
console.log(`${'─'.repeat(58)}\n`)
