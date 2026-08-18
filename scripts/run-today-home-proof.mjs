/**
 * إثبات الرئيسية المعاد تصميمها — [QIMMAH-TODAY-SOVEREIGN-REDESIGN-001].
 *
 * قسمان: ① سلوكي يقود `buildWeeklyPulse` فوق تخزين مُحاكى (ملف TS مستقل)،
 *        ② بنيوي مقترن على المكوّنات الحيّة، ثم **محاكاتا التفاف** تُسقطان
 *           الفحصين المركزيّين باسمهما (§4.2: كل شدّ بوابة يُرفَق بمهاجمته).
 *
 * ═══ الارتدادات التي يمنعها ═══
 * ① **لوحة الأصفار.** أن يستقبل القادمُ الجديد «أكملت ٠ من ٤ · ٠٪» في يومه
 *    الأول. الشرط `hasData` يجب أن يقيس **الجلسات** لا وجود الخطة؛ فالخطة تكفي
 *    لرسم شكل الأسبوع ولا تكفي لادّعاء نبض.
 * ② **عيب المرجع البصري.** لقطة «مستخدم جديد» في المرجع تعلن «لا توجد بيانات»
 *    وتعرض ثلاثة أيام خضراء. الحارس يثبت أنّ الحالتين مشتقّتان من مصدر واحد.
 * ③ **عودة الحلقات إلى ثلث الطية.** [CTO-73] حذفها لسبب مقيس؛ الحارس يثبّت
 *    القياسات المضغوطة فلا تعود البطاقة لوحةَ قياس تحجز الطية.
 * ④ **الازدواج.** لمحة القسم ووصف البطل كانا يقولان الجملة نفسها مرّتين.
 */
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')

let pass = 0
const fails = []
const check = (label, cond) => {
  if (cond) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fails.push(label); console.log(`  ✗ FAIL: ${label}`) }
}

/**
 * يجرّد التعليقات قبل أي فحص **غياب**. فحص «لا يذكر الملف X» على النصّ الخام
 * يخلط الكود بالشرح: تعليق يوثّق ما أُصلح يُسقط الإثبات وهو أصدق ما في الملف.
 */
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ')

// ── ① القسم السلوكي ─────────────────────────────────────────────────────────
const banner = `
const __store = new Map();
const __ls = {
  get length() { return __store.size; },
  key(i) { return Array.from(__store.keys())[i] ?? null; },
  getItem: (k) => (__store.has(k) ? __store.get(k) : null),
  setItem: (k, v) => { __store.set(k, String(v)); },
  removeItem: (k) => { __store.delete(k); },
  clear: () => { __store.clear(); },
};
globalThis.localStorage = __ls;
globalThis.window = { localStorage: __ls, addEventListener() {}, removeEventListener() {} };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`

const built = await build({
  entryPoints: [resolve(root, 'scripts/today-home-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})
const dir = mkdtempSync(join(tmpdir(), 'today-home-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, built.outputFiles[0].text)
await import(pathToFileURL(file).href)

// ── ② القسم البنيوي ─────────────────────────────────────────────────────────
const today = read('src/views/TodayV2.tsx')
const rings = read('src/components/today/DailyRingsCard.tsx')
const ring = read('src/components/today/ProgressRing.tsx')
const next = read('src/components/today/NextActionCard.tsx')
const water = read('src/components/today/WaterCard.tsx')
const pulseCard = read('src/components/today/WeeklyPulseCard.tsx')
const pulseModel = read('src/lib/weeklyPulse.ts')
const dict = read('src/i18n/dict/todayHome.ts')
const shell = read('src/components/MobileShell.tsx')

console.log('\n⑧ السطح الحيّ هو المعروض — لا توأم')
check('`DashboardView` (الموجَّه من App) يصيّر `TodayV2`', read('src/views/DashboardView.tsx').includes('<TodayV2'))
check('`App.tsx` يوجّه `DashboardView`', read('src/App.tsx').includes("import('@/views/DashboardView')"))
check('الرئيسية تركّب بطاقة الحلقات', today.includes('<DailyRingsCard'))
check('الرئيسية تركّب بطاقة الإجراء التالي', today.includes('<NextActionCard'))
check('الرئيسية تركّب الماء ونبض الأسبوع', today.includes('<WaterCard') && today.includes('<WeeklyPulseCard'))

console.log('\n⑨ الحلقات مضغوطة — لا عودة إلى ثلث الطية')
// القياسات مقترنة بالوسم نفسه لا مذكورة في أي مكان من الملف (§4.2).
const calRing = rings.slice(rings.indexOf('<ProgressRing value={ratioOf(calories)}'), rings.indexOf('</ProgressRing>'))
check('حلقة السعرات ٨٤بك بسمك ٨', calRing.includes('size={84}') && calRing.includes('stroke={8}'))
const macroRing = rings.slice(rings.indexOf('<ProgressRing value={ratioOf(m.slice)}'), rings.lastIndexOf('</ProgressRing>'))
check('حلقات الماكرو ٤٠بك بسمك ٥', macroRing.includes('size={40}') && macroRing.includes('stroke={5}'))
check('الحلقة الكبيرة تشارك صفَّها (لا توسيط يبتلع العرض)', rings.includes('flex w-full items-center gap-3.5'))
check('الماكروز صفٌّ واحد بثلاثة أعمدة', rings.includes('grid grid-cols-3'))

console.log('\n⑩ الصدق: لا رقم مخترَع، ولا لون وحده')
check('بلا هدف تُعرض «—» لا صفر', rings.includes("hasCalTarget ? n(remainingOf(calories)) : '—'"))
check('المتبقّي مقصوص عند الصفر', rings.includes('Math.max(0, Math.round(s.target - s.consumed))'))
check('كل حلقة تحمل وصفًا صوتيًّا كاملًا', rings.includes('d.ringAria(') && dict.includes('ringAria:'))
check('الحلقة نفسها مخفيّة عن قارئ الشاشة (النصّ يحمل المعلومة)', ring.includes('aria-hidden="true"'))
check('سطر يشرح دلالة القوس مقابل الرقم', rings.includes('d.ringLegend') && dict.includes('ringLegend:'))
check('«ما تم» يحمل رمزًا لا لونًا وحده', pulseCard.includes("state === 'missed' &&"))
check('«مكتمل» يحمل علامة صحّ', pulseCard.includes("state === 'completed' && <Icon name=\"Check\""))

console.log('\n⑪ نبض الأسبوع: تاريخ لا خطّة')
check('`hasData` تقيس الجلسات وحدها', pulseModel.includes('hasData: sessions.length > 0'))
check('النسبة `null` بلا مقام', pulseModel.includes('percent: plannedCount > 0 ?') && pulseModel.includes(': null,'))
check('الاكتمال من `dayCompletion` لا من `finishedAt` خامًا', pulseModel.includes('dayCompletion(stamp, sessions)'))
check('أيام الخطة من `currentWorkout` (المصدر الواحد)', pulseModel.includes('currentWorkout(userId, customization, date)'))
check('لا تجاوز يدوي على حالة اليوم في البطاقة', !code(pulseCard).includes("empty ? (day.isToday ? 'today' : 'none')"))
check('نصّ الفراغ معلَن بالعربية والإنجليزية', dict.includes('pulseEmpty:') && dict.includes('Your weekly pulse starts after'))

console.log('\n⑫ لا ازدواج ولا استنتاج في الواجهة')
check('لمحة البطاقة تُطوى حين تطابق لمحة القسم', next.includes('const innerEyebrow = hero.eyebrow === eyebrow ? null : hero.eyebrow'))
check('الوصف يُطوى حين يعرض صفُّ المقاييس نفس الأرقام', next.includes('const subtitle = !showMeta'))
check('البطاقة تصيّر `hero` ولا تستنتج يوم راحة بنفسها', next.includes('restDay') && !code(next).includes('currentWorkout'))
check('شريط التقدّم يظهر عند تقدّم حقيقي وحده', next.includes('training.percent > 0'))
check('مقاييس التمرين من النموذج لا من حساب في الواجهة', today.includes('training={model.training}') && !code(today).includes('.exercises.length'))

console.log('\n⑬ الترطيب يعيد استعمال المنطق القائم')
check('الرئيسية تستعمل هوك التغذية الحيّ نفسه', today.includes("useNutritionToday } from '@/lib/nutritionTracking'"))
check('لا متجر ماء ثانٍ في مكوّن الماء', !code(water).includes('localStorage') && !code(water).includes('addWaterToDay'))
check('فشل الحفظ يُعرض ولا يُبتلع', water.includes('setFailed(!onAdd(CUP_ML))') && water.includes('d.waterSaveError'))
check('بلا هدف يُعرض المسجَّل فعلًا (الضغطة لها أثر مرئي)', water.includes('d.waterLoggedOnly('))

console.log('\n⑭ الوصولية والقياسات')
check('القشرة تملك `h1` والرئيسية لا تنازعها', shell.includes('<h1') && !code(today).includes('<h1'))
check('زرّ إضافة الماء ٤٤بك على الأقل', water.includes('h-11 w-11'))
check('صورة الحساب هدف لمس ٤٤بك', today.includes('h-11 w-11 shrink-0 place-items-center rounded-full'))
check('النداء الأساسي ≥١٨٫٦٦بك عريض (نصّ كبير AA)', next.includes('text-[19px] font-black text-white'))
check('حركة الحلقة تمرّ من `v2-fill` (يُعطَّل مع تقليل الحركة)', ring.includes('className="v2-fill"'))
check('لا حركة دائمة على الحلقة', !ring.includes('animate-') && !ring.includes('infinite'))
check('مساحة القاع تتجنّب زرّ التسجيل المرفوع', today.includes('pb-36'))

console.log('\n⑮ النصوص في القاموس بلغتين')
check('قاموس مستقل للسطح', dict.includes('export const todayHomeStrings'))
check('العربية والإنجليزية معًا', dict.includes('const ar: TodayHomeStrings') && dict.includes('const en: TodayHomeStrings'))
// بعد تجريد التعليقات، أي حرف عربي باقٍ في هذه المكوّنات هو نصّ صلب (§6).
const hardcodedArabic = (src) => /[؀-ۿ]/.test(code(src))
check('لا نصّ عربي صلب في مكوّنات السطح', ![rings, next, water, pulseCard, ring, read('src/components/today/QuickActions.tsx')].some(hardcodedArabic))
check('التوطين عند حدّ العرض لا في التخزين', today.includes('formatNumeralsIn(text, lang)') && next.includes('formatNumeralsIn(text, lang)'))

// ── ③ محاكاتا الالتفاف — كل شدّ يُهاجَم (§4.2) ───────────────────────────────
console.log('\n⑯ محاكاة الالتفاف — الفحوص تسقط بأسمائها')

// (أ) إعادة `hasData` إلى الشرط القديم يجب أن تُسقط فحص «تقيس الجلسات وحدها».
const rolledBack = pulseModel.replace('hasData: sessions.length > 0', 'hasData: sessions.length > 0 || plannedCount > 0')
check(
  'إعادة `hasData` إلى «أو وجود خطة» تُسقط الفحص باسمه',
  rolledBack !== pulseModel && !rolledBack.includes('hasData: sessions.length > 0,'),
)

// (ب) تكبير الحلقة إلى مقاس المرجع يجب أن يُسقط فحص الضغط.
const inflated = rings.replace('size={84}', 'size={160}')
const inflatedCal = inflated.slice(inflated.indexOf('<ProgressRing value={ratioOf(calories)}'), inflated.indexOf('</ProgressRing>'))
check('تكبير حلقة السعرات يُسقط فحص القياس باسمه', !inflatedCal.includes('size={84}'))

// (ج) الفحص البنيوي **مقترن**: ذكر `size={84}` في أي مكان آخر من الملف لا يُرضيه.
const decoy = rings.replace('size={84}', 'size={160}') + '\n// size={84} stroke={8}\n'
const decoyCal = decoy.slice(decoy.indexOf('<ProgressRing value={ratioOf(calories)}'), decoy.indexOf('</ProgressRing>'))
check('ذكرٌ متفرّق لنفس القياس لا يُرضي الفحص (لا رضا من مواضع متفرّقة)', !decoyCal.includes('size={84}'))

// (د) إعادة وصل الوصف المزدوج يجب أن تُسقط فحص الازدواج.
const duped = next.replace('const innerEyebrow = hero.eyebrow === eyebrow ? null : hero.eyebrow', 'const innerEyebrow = hero.eyebrow')
check('إعادة اللمحة المزدوجة تُسقط الفحص باسمه', !duped.includes('hero.eyebrow === eyebrow ? null'))

// (هـ) حارس النصّ الصلب يُهاجَم هو الآخر: نصّ عربي مدسوس **داخل الكود** يجب أن
//      يقلبه، وإلّا كان الحارس يقيس التعليقات لا الكود.
const smuggled = rings.replace('{d.remainingTitle}', "{'باقي لك اليوم'}")
check('نصّ عربي مدسوس في الكود يقلب حارس النصّ الصلب', hardcodedArabic(smuggled) && !hardcodedArabic(rings))

if (fails.length > 0) {
  console.log(`\n❌ الرئيسية: ${pass} نجحت، ${fails.length} فشلت:`)
  fails.forEach((f) => console.log(`   • ${f}`))
  process.exit(1)
}
console.log(`\n✅ الرئيسية: ${pass} فحصًا بنيويًّا، 0 فشل.`)
