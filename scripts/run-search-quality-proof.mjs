/**
 * إثبات جودة البحث — [P1-SEARCH-QUALITY].
 *
 * ═══ السؤال ═══
 * ليس «هل يُرجع البحث نتائج؟» (تُثبته براهين التغطية)، بل سؤال المؤسس بعينه:
 * **هل التطابق التامّ الشائع يسبق المطابقة الفزّية الضعيفة؟** وهل يبلغ من يكتب
 * بالعربية ما يبلغه من يكتب باللاتينية؟
 *
 * ═══ لماذا الكتالوج الحقيقي من القرص ═══
 * كل استعلام هنا يمرّ عبر `node:http` على `public/food/` الفعلي — الطقم الساخن
 * والشرائح وحزم البحث. حارسٌ على كتالوج مخترَع في الذاكرة لا يحرس شيئًا.
 *
 * ═══ سياج الانحدار ═══
 * §٢ جدول «استعلام ⇒ النتيجة الأولى المتوقَّعة» يحمل **استعلامات المؤسس نصًّا**.
 * أي موجة ترتيب قادمة تكسر واحدًا منها تسقط باسم الاستعلام لا برقم غامض.
 *
 * ═══ وضوابط §4.2 ═══
 * كل إحكام يُهاجَم: إضعافُ أرضية القصّ · نزعُ الجسر · وتعميمُ القائمة المغلقة إلى
 * قاعدة — ثلاثتها **يجب أن تُسقط فحصًا مسمّى**، لا أن ترفع `TypeError`.
 */
import { readFileSync, existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { loadTsModule, ROOT } from './food-production/lib/loadTs.mjs'

const checks = []
const ok = (label, pass, detail = '') => checks.push({ label, pass: !!pass, detail: String(detail) })
const counter = (label, held, detail = '') => checks.push({ label: `⟲ ${label}`, pass: !!held, detail: String(detail) })

const FOOD = resolve(ROOT, 'public/food')
const HAS_ASSETS = existsSync(resolve(FOOD, 'hot-set.json'))

// ══════════════════════════════════════════════════════════════════════
// §٠ — التمارين: لا يحتاج أصولًا، فيُقاس دائمًا
// ══════════════════════════════════════════════════════════════════════
const { filterExerciseLibrary } = await loadTsModule('src/lib/exerciseLibrary.ts')
const { exercises } = await loadTsModule('src/data/exercises.ts')

const exSearch = (q, lang = /[؀-ۿ]/.test(q) ? 'ar' : 'en') =>
  filterExerciseLibrary({ search: q, muscle: 'all', equipment: 'all', lang })
const exTop = (q) => exSearch(q)[0]?.nameEn ?? '—'

console.log('\n① مكتبة التمارين — الصدارة بجودة المطابقة لا بالأبجدية')

/** استعلام ⇒ اسم التمرين الإنجليزي المتوقَّع أولًا. سياج انحدار مسمّى. */
const EXERCISE_FENCE = [
  ['pull up', 'Pull-Up'],
  ['Pull-Up', 'Pull-Up'],
  ['deadlift', 'Deadlift'],
  ['deadlifts', 'Deadlift'],
  ['plank', 'Plank'],
  ['bench press', 'Barbell Bench Press'],
  ['عقلة', 'Pull-Up'],
  ['رفعة ميتة', 'Deadlift'],
  ['تمرين الضغط', 'Push-Up'],
  ['بلانك', 'Plank'],
]
for (const [q, expected] of EXERCISE_FENCE) {
  const top = exTop(q)
  ok(`[تمارين] «${q}» ⇒ «${expected}» أولًا`, top === expected, top)
}

// الجموع كانت صفرًا — تُقاس لا تُدّعى.
for (const [q, min] of [['squats', 5], ['deadlifts', 2], ['curls', 5]]) {
  const n = exSearch(q).length
  ok(`[تمارين] الجمع «${q}» يصل نتائج (كان صفرًا)`, n >= min, `${n} نتيجة`)
}

// ⟲ المطابقة **مقترنة لا مفرَّقة**: كلمتان في المكتبة لكن ليس في تمرين واحد.
{
  const n = exSearch('سكوات بلانك').length
  counter('رمزان من تمرينين مختلفين ⇒ صفر — مطابقة الرموز اقتران لا اجتماع', n === 0, `${n} نتيجة`)
}
// ⟲ الطيّ لا يخترع مطابقة: كلمة غير موجودة تبقى صفرًا مهما طُويت.
{
  const n = exSearch('qimmah-no-such-exercise-001').length
  counter('كلمة غير موجودة تبقى صفرًا بعد كل الصيغ', n === 0, `${n} نتيجة`)
}
// ⟲ الأبجدية كاسرُ تعادل لا قرار: مطابقة أقوى تسبق أوّلَ الأبجدية.
{
  const res = exSearch('ضغط')
  const top = res[0]?.nameAr ?? '—'
  const alphabetFirst = [...res].sort((a, b) => a.nameAr.localeCompare(b.nameAr, 'ar'))[0]?.nameAr ?? '—'
  counter(
    'الصدارة ليست أوّلَ الأبجدية — «ضغط» بادئةً تسبق «جهاز ضغط…» تضمينًا',
    top !== alphabetFirst && top.startsWith('ضغط'),
    `الصدارة «${top}» · أوّل الأبجدية «${alphabetFirst}»`,
  )
}
// ⟲ الفلاتر لم تُمَسّ: العضلة والمعدّة تبقيان قاطعتين مع الاستعلام.
{
  const sample = exercises.find((e) => e.equipment.length > 0 && e.nameEn.length > 3)
  const res = filterExerciseLibrary({ search: '', muscle: sample.primaryMuscle, equipment: sample.equipment[0], lang: 'ar' })
  counter(
    'الفلتر المركّب يبقى قاطعًا — كل نتيجة تطابق العضلة والمعدّة معًا',
    res.length > 0 && res.every((e) => e.primaryMuscle === sample.primaryMuscle && e.equipment.includes(sample.equipment[0])),
    `${res.length} نتيجة · ${sample.primaryMuscle}/${sample.equipment[0]}`,
  )
}

// ══════════════════════════════════════════════════════════════════════
// §١ — جسر الخطّين: القائمة مغلقة ومسنَدة، لا قاعدة صوتية
// ══════════════════════════════════════════════════════════════════════
const aliases = await loadTsModule('src/lib/food/searchAliases.ts')
const { BRAND_SCRIPT_ALIASES, PACK_WORD_ALIASES, brandBridgeVariant } = aliases

console.log('\n② جسر الخطّين — القائمة المغلقة')
ok('القائمة مُصدَّرة وغير فارغة', Array.isArray(BRAND_SCRIPT_ALIASES) && BRAND_SCRIPT_ALIASES.length > 0, `${BRAND_SCRIPT_ALIASES.length} مجموعة`)
ok('كل مجموعة: صيغة معتمدة + متغيّر واحد على الأقل',
  BRAND_SCRIPT_ALIASES.every((g) => g.length >= 2 && g.every((s) => typeof s === 'string' && s.trim())),
  `${BRAND_SCRIPT_ALIASES.length}`)
ok('الصيغة المعتمدة لاتينية والمتغيّرات عربية — لا خلط اتجاه',
  BRAND_SCRIPT_ALIASES.every(([c, ...v]) => /^[a-z0-9' ]+$/.test(c) && v.every((x) => /[؀-ۿ]/.test(x))),
  'الاتجاه عربي ⇒ لاتيني')

// ⟲ الشرط ٤ محفوظ: كلمة عربية أصيلة مغرية **مستبعَدة** رغم مكسبها المقيس.
counter(
  'الشرط ٤: «سعودية» لا تُجسَّر إلى `saudia` — صفة بلد قبل أن تكون علامة',
  brandBridgeVariant('سعودية') === null && brandBridgeVariant('السعودية') === null,
  `${brandBridgeVariant('سعودية')}`,
)
// ⟲ ليست قاعدة صوتية: كلمة عربية خارج القائمة لا تُجسَّر إطلاقًا.
for (const w of ['كبسة', 'دجاج', 'تمر', 'قشطة', 'برجر']) {
  counter(`ليست قاعدة: «${w}» خارج القائمة ⇒ لا جسر`, brandBridgeVariant(w) === null, `${brandBridgeVariant(w)}`)
}
// ⟲ «كل الرموز أو لا شيء»: رمز عربي بلا مقابل يُسقط الصيغة كلّها.
counter(
  'رمز عربي بلا مقابل يُسقط الجسر كلّه — «بيبسي بالليمون» ⇒ لا جسر',
  brandBridgeVariant('بيبسي بالليمون') === null,
  `${brandBridgeVariant('بيبسي بالليمون')}`,
)
ok('والمركّب المترجَم بالكامل يُجسَّر — «بيبسي زيرو» ⇒ `pepsi zero`',
  brandBridgeVariant('بيبسي زيرو') === 'pepsi zero', `${brandBridgeVariant('بيبسي زيرو')}`)
ok('اسم متعدّد الكلمات يُلتقط كجملة — «كيت كات» ⇒ `kitkat`',
  brandBridgeVariant('كيت كات') === 'kitkat', `${brandBridgeVariant('كيت كات')}`)
// ⟲ كلمات العبوة لا تُخلط معانيها: `diet` تبقى `diet` ولا تصير `zero`.
counter(
  'لا خلط منتجات: «دايت» ⇒ `diet` لا `zero` — Diet Coke و Coke Zero عبوتان',
  brandBridgeVariant('دايت') === 'diet' && PACK_WORD_ALIASES.every((g) => g[0] !== 'zero' || !g.includes('دايت')),
  `${brandBridgeVariant('دايت')}`,
)

if (!HAS_ASSETS) {
  console.log('\n⚠️  `public/food/` غائب — لم تُقَس استعلامات الكتالوج في هذا التشغيل.')
  report()
}

// ══════════════════════════════════════════════════════════════════════
// §٢ — الكتالوج الحقيقي عبر مقبس
// ══════════════════════════════════════════════════════════════════════
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.replace(/^\/food\//, '').split('?')[0])
  let body
  try { body = readFileSync(resolve(FOOD, p)) } catch { res.writeHead(404); res.end(); return }
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(body)
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}/food`

const [{ Catalog }, { createMemoryCache }, unified] = await Promise.all([
  loadTsModule('src/lib/food/catalog/catalog.ts'),
  loadTsModule('src/lib/food/catalog/idbCache.ts'),
  loadTsModule('src/lib/food/unifiedSearch.ts'),
])
const fetchText = async (u) => { const r = await fetch(u); return r.ok ? await r.text() : null }
const catalog = await Catalog.create({ fetchText, baseUrl: base, cache: createMemoryCache() })
await catalog.init()

const search = (q, lang = /[؀-ۿ]/.test(q) ? 'ar' : 'en') =>
  unified.searchAllFoods(q, { catalog, lang, limit: 18 })
const nameOf = (r) => `${r?.item?.nameAr ?? ''} | ${r?.item?.nameEn ?? ''}`

console.log('\n③ استعلامات المؤسس — سياج انحدار بالنصّ')

/**
 * استعلام ⇒ نمطٌ **يجب** أن تطابقه النتيجة الأولى.
 * كُتبت أنماطًا لا أسماء حرفية لأن الكتالوج يحمل عدّة عبوات للعلامة الواحدة،
 * والمقصود «الصدارة هي العلامة المطلوبة» لا «هذه العبوة بالذات».
 */
const FOUNDER_FENCE = [
  ['Coca Cola Zero', /coca[ -]?cola zero/i],
  ['Diet Coke', /diet coke/i],
  ['7UP Free', /7up free/i],
  ['Almarai', /almarai|المراعي/i],
  ["L'usine", /usine|لوزين/i],
  ['Indomie', /indomie/i],
  ['Pepsi Zero', /pepsi z[ée]ro/i],
  ['كوكا كولا', /coca[ -]?cola|كوكا كولا/i],
  ['بيبسي', /pepsi/i],
  ['المراعي', /المراعي|almarai/i],
  ['لوزين', /usine|لوزين/i],
  ['اندومي', /indomie/i],
]
for (const [q, expected] of FOUNDER_FENCE) {
  const res = await search(q)
  const top = res[0]
  ok(`[طعام] «${q}» ⇒ الصدارة تطابق ${expected}`, !!top && expected.test(nameOf(top)), top ? `${nameOf(top)} · ${res.length} نتيجة` : 'صفر')
}

console.log('\n④ الفجوة العربية — قياس، لا ادّعاء')
/** [عربي, لاتيني] — الأول كان صفرًا/شبه صفر، والثاني يعمل. */
const SCRIPT_GAP = [
  ['اندومي', 'indomie'], ['ماجي', 'maggi'], ['لايز', 'lays'], ['كيت كات', 'kitkat'],
  ['هاينز', 'heinz'], ['بربيكان', 'barbican'], ['تانج', 'tang'], ['كواكر', 'quaker'],
  ['بلدنا', 'baladna'], ['كندر', 'kinder'], ['ليبتون', 'lipton'], ['بيبسي', 'pepsi'],
]
let bridged = 0
for (const [ar, en] of SCRIPT_GAP) {
  const arRes = await search(ar)
  const enRes = await search(en)
  const arPack = arRes.filter((r) => r.source === 'packaged').length
  const enPack = enRes.filter((r) => r.source === 'packaged').length
  if (arPack > 0) bridged += 1
  ok(`[جسر] «${ar}» تبلغ منتجات «${en}» المعبّأة`, arPack > 0, `عربي ${arPack} · لاتيني ${enPack} سجلًا معبّأً`)
}
ok(`الجسر يعمل على كل المجموعات المقيسة: ${bridged}/${SCRIPT_GAP.length}`, bridged === SCRIPT_GAP.length, `${bridged}/${SCRIPT_GAP.length}`)

/**
 * ⟲ الجسر **محمول فعلًا**.
 *
 * ⚠️ **رُبِط بمقصده بعد أن تحسّنت البيانات — [FOUNDER-QA-007].** كان مكتوبًا
 * «خامًا ⇒ **صفر**»، وكان صادقًا يوم كُتب. ثم أضافت حزمة `PKG-002` أسماء عربية
 * لمنتجات كانت بلا اسم عربي، فصار الخام يبلغ بعضها — **وهذا نجاح لا انحدار**.
 * فالمقصد ليس «الخام صفر» بل «الجسر يزيد الوصول فعلًا»؛ وتثبيت الصفر كان
 * يجعل الحارس يسقط كلّما **تحسّن** الكتالوج، فيُعلّمنا تعطيله.
 *
 * والقياس يبقى بأسنانه: الجسر يجب أن يزيد **زيادة موجبة مقيسة**، ويبقى
 * الالتفاف الحقيقي (نزع الجسر) خسارةً تُسمّى.
 */
{
  const { normalizeProductKey } = await loadTsModule('src/lib/text/foodNormalize.ts')
  const rawHits = await catalog.searchRanked(normalizeProductKey('اندومي'), { limit: 12, deep: true })
  const bridgedHits = await catalog.searchRanked('indomie', { limit: 12, deep: true })
  counter(
    'نزعُ الجسر يخسر وصولًا مقيسًا: «اندومي» خامًا أقلّ ممّا يبلغه `indomie`',
    bridgedHits.length > rawHits.length && bridgedHits.length > 0,
    `خام ${rawHits.length} · مجسَّر ${bridgedHits.length} · الفارق ${bridgedHits.length - rawHits.length}`,
  )
  // وحالة ما زالت صفرًا بلا الجسر — كي لا يصير الفحص «أكبر بواحد» ويكفي.
  const zeroCase = await catalog.searchRanked(normalizeProductKey('بربيكان'), { limit: 12, deep: true })
  const zeroBridged = await catalog.searchRanked('barbican', { limit: 12, deep: true })
  counter(
    'وحالةٌ بلا اسم عربي في الكتالوج تبقى صفرًا خامًا — فالجسر ليس تجميلًا',
    zeroCase.length === 0 && zeroBridged.length > 0,
    `خام ${zeroCase.length} · مجسَّر ${zeroBridged.length}`,
  )
}

console.log('\n⑤ التطابق التامّ يسبق الفزّي — قاعدة المؤسس')

// «Lays»: التطابق التامّ المعبّأ يجب أن يسبق تضمينًا منسَّقًا وُلد من قصّ جمع.
const laysRes = await search('Lays')
const laysTop = laysRes[0]
ok('«Lays» ⇒ الصدارة منتج Lay\'s حقيقي لا طبق يحوي «layers»',
  !!laysTop && laysTop.source === 'packaged' && /lay/i.test(laysTop.item.nameEn),
  laysTop ? nameOf(laysTop) : 'صفر')

/**
 * ⟲ **التأكيد المضادّ المركزي** (§4.2): إضعاف أرضية القصّ يعيد العطل حرفيًا.
 *
 * يُعاد بناء الحالة **قبل** الإصلاح من نفس المرشّحين: كل نتيجة منسَّقة بلغت
 * الأرضية (٦) تُردّ إلى قوّتها غير المؤرَّضة (٥ = تضمين اسم)، ثم يُعاد الدمج
 * بنفس السجلات المعبّأة. لو كانت الأرضية بلا أثر لبقيت الصدارة كما هي — فيسقط
 * هذا الفحص **باسمه**، لا بـ`TypeError`.
 */
{
  const curated = unified.rankCurated('Lays')
  const packaged = await unified.rankPackaged(catalog, 'Lays')
  const floored = curated.filter((r) => r.strength === unified.CURATED_SINGULARIZED_FLOOR)
  const weakened = curated.map((r) =>
    r.strength === unified.CURATED_SINGULARIZED_FLOOR ? { ...r, strength: 5 } : r)
  const before = unified.mergeUnified(weakened, packaged, 'en', 18)
  const after = unified.mergeUnified(curated, packaged, 'en', 18)
  counter(
    'إضعاف أرضية القصّ يعيد العطل: طبقٌ منسَّق يتصدّر «Lays» فوق اسم مطابق تمامًا',
    floored.length > 0 && before[0]?.source === 'curated' && after[0]?.source === 'packaged',
    `مؤرَّضة ${floored.length} · قبل «${nameOf(before[0])}» · بعد «${nameOf(after[0])}»`,
  )
}

/**
 * ⟲ والأرضية **لا تبتلع العربية المعرَّفة**: حذف «ال» ليس قصًّا.
 * «الكبسة» تبلغ «كبسة دجاج» بصيغة بلا «ال» وحدها — ولو أُخضعت للأرضية لانهار
 * بحث كل اسم معرَّف. تُقاس بقوّتها لا بوجودها.
 */
{
  const withAl = unified.rankCurated('الكبسة')
  const strongest = Math.min(...withAl.map((r) => r.strength))
  counter(
    'حذف «ال» ليس قصًّا: «الكبسة» تحتفظ بقوّة أقوى من الأرضية',
    withAl.length > 0 && strongest < unified.CURATED_SINGULARIZED_FLOOR,
    `أقوى ${strongest} · الأرضية ${unified.CURATED_SINGULARIZED_FLOOR} · ${withAl.length} نتيجة`,
  )
}

// ⟲ الجسر لا يغرق المنسَّق: استعلام منسَّق بحت يبقى صدارته منسَّقة.
for (const q of ['كبسة', 'شاورما', 'مندي']) {
  const res = await search(q)
  counter(`الجسر لا يزيح المنسَّق: «${q}» صدارتها منسَّقة`, res[0]?.source === 'curated', `${res[0]?.source} · ${nameOf(res[0])}`)
}

// ⟲ ضوابط سالبة: البحث لا يطابق كل شيء بكل شيء.
for (const q of ['زززززز', 'qqqqzz', 'سكوات']) {
  const n = (await search(q)).length
  counter(`ضابط سالب: «${q}» ⇒ صفر`, n === 0, `${n}`)
}

console.log('\n⑥ إسناد القائمة — كل علامة تقابل سجلًا حقيقيًا')
const ungrounded = []
for (const [canonical] of BRAND_SCRIPT_ALIASES) {
  const hits = await catalog.searchRanked(canonical, { limit: 3, deep: true })
  if (hits.length === 0) ungrounded.push(canonical)
}
ok('الشرط ١: كل صيغة معتمدة تطابق سجلًا حقيقيًا في الكتالوج (لا خريطة إلى عدم)',
  ungrounded.length === 0, ungrounded.join(' · ') || `${BRAND_SCRIPT_ALIASES.length}/${BRAND_SCRIPT_ALIASES.length} مسنَدة`)

server.close()
report()

function report() {
  const failed = checks.filter((c) => !c.pass)
  const counters = checks.filter((c) => c.label.startsWith('⟲')).length
  for (const c of checks) console.log(`  ${c.pass ? '✓' : '✗'} ${c.label}${c.detail ? ` — ${c.detail}` : ''}`)
  if (failed.length) {
    console.log(`\n❌ سقط ${failed.length} من ${checks.length}:`)
    for (const f of failed) console.log(`   ✗ ${f.label} — ${f.detail}`)
    process.exit(1)
  }
  console.log(`\n✅ جودة البحث: ${checks.length} فحصًا، 0 فشل (منها ${counters} تأكيدًا مضادًّا).`)
  process.exit(0)
}
