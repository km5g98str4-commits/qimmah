import type { Lang } from '@/lib/appPreferences'

/**
 * نظام الأرقام المعروض — **محور ثانٍ مستقل عن اللغة**.
 *
 * كان النظام مربوطًا باللغة ربطًا صلبًا (عربية ⇒ ٠-٩ حتمًا)، وكثير من
 * المستخدمين في السعودية يريدون واجهة عربية بأرقام لاتينية. فصار للعرض محوران:
 * اللغة (فواصل ونصوص) ونمط الأرقام (`auto` يتبع اللغة · `arabic` · `latin`).
 */
export type NumeralStyle = 'auto' | 'arabic' | 'latin'

/**
 * النمط الفعّال **عالمي على مستوى الوحدة**، لا معاملًا مُمرَّرًا.
 *
 * السبب بنيوي: `src/lib/progressV2Model.ts:142` وأمثاله يستقبلون `lang` وسيطًا
 * عاديًا ولا يستطيعون استعمال hook. لو صار النمط معاملًا لتغيّرت كل تواقيع
 * بُناة النماذج. فالسياق في React لإعادة الرسم فقط، والقيمة تعيش هنا.
 */
let activeNumeralStyle: NumeralStyle = 'auto'
const numeralListeners = new Set<() => void>()

/** النمط المُطبَّق الآن (مصدر الحقيقة الوحيد لكل الدوال أدناه). */
export function getActiveNumeralStyle(): NumeralStyle {
  return activeNumeralStyle
}

/**
 * يضبط النمط الفعّال ويُخطر المشتركين. **يمسح جدول الأرقام** لأن الجدول
 * مشتقّ من `formatNumber` — بقاؤه بعد التبديل هو بعينه «افتراق المساعدَين»
 * الذي كُتب هذا الملف ليمنعه بنيويًا.
 */
export function setActiveNumeralStyle(style: NumeralStyle): void {
  if (style === activeNumeralStyle) return
  activeNumeralStyle = style
  digitTableCache.clear()
  numeralListeners.forEach((fn) => fn())
}

/** اشتراك خفيف لإعادة الرسم عند تبديل النمط (يُستعمل مع `useSyncExternalStore`). */
export function subscribeNumeralStyle(fn: () => void): () => void {
  numeralListeners.add(fn)
  return () => {
    numeralListeners.delete(fn)
  }
}

/** يحسم نظام الأرقام من اللغة والنمط. `auto` وحده هو الذي يتبع اللغة. */
export function resolveNumeralSystem(lang: Lang, style: NumeralStyle = activeNumeralStyle): 'arab' | 'latn' {
  if (style === 'arabic') return 'arab'
  if (style === 'latin') return 'latn'
  return lang === 'ar' ? 'arab' : 'latn'
}

/**
 * The product's one numeral policy: the language picks the separators and the
 * numeral-style preference picks the digits. This only formats values at the
 * presentation boundary; the number passed in is never converted or written
 * back to storage.
 */
export function formatNumber(
  value: number,
  lang: Lang,
  options: Intl.NumberFormatOptions = {},
): string {
  const base = lang === 'ar' ? 'ar-SA' : 'en-US'
  const locale = `${base}-u-nu-${resolveNumeralSystem(lang)}`
  return new Intl.NumberFormat(locale, options).format(value)
}

/**
 * جدول أرقام اللغة — **مشتقّ من `formatNumber` نفسه** لا مكتوبًا بيد.
 *
 * لو كُتب الجدول حرفيًا لصار مصدر حقيقة ثانيًا يشيخ وحده: يكفي أن يتغيّر
 * locale واحد في `formatNumber` حتى تفترق الدالتان بصمت — وهو **بالضبط** شكل
 * العطل الذي تغلقه هذه الموجة (مساعدان للأرقام على شاشتين). فالاشتقاق يجعل
 * الافتراق مستحيلًا بنيويًا لا مضبوطًا باختبار.
 *
 * ⚠️ **المفتاح `lang:style` لا `lang` وحدها.** النمط محور ثانٍ؛ لو بقي المفتاح
 * اللغة وحدها لبقي `formatNumeralsIn` يقدّم الجدول القديم بينما `formatNumber`
 * يعطي النظام الجديد — أي الافتراق نفسه من باب آخر.
 *
 * `1234567890` تعطي «١٢٣٤٥٦٧٨٩٠»: آخر محرف هو الصفر، فيُنقل إلى الرأس.
 */
const digitTableCache = new Map<string, string>()
function digitTable(lang: Lang): string {
  const key = `${lang}:${activeNumeralStyle}`
  const cached = digitTableCache.get(key)
  if (cached) return cached
  const seq = formatNumber(1234567890, lang, { useGrouping: false })
  const table = seq.slice(9) + seq.slice(0, 9)
  digitTableCache.set(key, table)
  return table
}

/** أرقام لاتينية `0-9` وهندية `٠-٩` وفارسية `۰-۹` — مدخلات التطبيع الثلاثة. */
const ANY_DIGIT = /[0-9٠-٩۰-۹]/g
const ARABIC_INDIC_ZERO = 0x0660 // ٠
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0 // ۰
/** فاصلة عشرية عربية `٫` (U+066B) وفاصلة آلاف `٬` (U+066C) — وهما ما يُصدره `formatNumber` نفسه. */
const ARABIC_DECIMAL_SEPARATOR = '٫'
const ARABIC_THOUSANDS_SEPARATOR = '٬'
/** علامات ثنائية الاتجاه غير مرئية يُقحمها ICU قبل السالب (ALM/LRM/RLM). */
const BIDI_MARKS = /[؜‎‏]/g

/**
 * **الطبقة الرقمية القانونية الوحيدة** — تحوّل أي كتابة رقمية عربية إلى الشكل
 * الغربي القانوني الذي تفهمه `Number()`.
 *
 * - `٠-٩` (U+0660–0669) و`۰-۹` (U+06F0–06F9) ⇐ `0-9`
 * - `٫` (U+066B) ⇐ `.` — الفاصلة العشرية التي **يُصدرها التطبيق نفسه**
 * - `٬` (U+066C) ⇐ تُحذف — فاصلة الآلاف
 * - علامات الاتجاه غير المرئية تُحذف (وإلا انكسر السالب المنسَّق)
 * - اللاتيني والنصّ غير الرقمي يمرّان كما هما (`-` يبقى فيسلم السالب)
 *
 * لا تلمس هذه الدالة الحروف ولا علامات الترقيم النصّية (`،` مثلًا تبقى) —
 * فهي طيّ أرقام لا تنظيف نصّ.
 *
 * ⚠️ **التطبيع عند حدّ الإدخال حصرًا.** القيم المخزَّنة تبقى غربية قانونية.
 *
 * `separators: false` يقصرها على الأرقام وحدها — يستعمله مستهلك واحد معلَن:
 * `foldArabicDigits` في `src/lib/text/foodNormalize.ts`، لأن طيّها **عقد فهرسة
 * مختوم بـ`NORMALIZATION_VERSION`**؛ توسيع قواعده يُبطل الفهارس المبنيّة على
 * القرص، وذلك قرار حارة الطعام لا قرار هذه الموجة.
 */
export function foldDigits(input: string, opts: { separators?: boolean } = {}): string {
  if (input === '') return ''
  const { separators = true } = opts
  let out = ''
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 0
    if (code >= ARABIC_INDIC_ZERO && code <= ARABIC_INDIC_ZERO + 9) {
      out += String(code - ARABIC_INDIC_ZERO)
    } else if (code >= EXTENDED_ARABIC_INDIC_ZERO && code <= EXTENDED_ARABIC_INDIC_ZERO + 9) {
      out += String(code - EXTENDED_ARABIC_INDIC_ZERO)
    } else if (separators && ch === ARABIC_DECIMAL_SEPARATOR) {
      out += '.'
    } else if (separators && ch === ARABIC_THOUSANDS_SEPARATOR) {
      /* فاصلة آلاف — تُحذف */
    } else {
      out += ch
    }
  }
  return separators ? out.replace(BIDI_MARKS, '') : out
}

/**
 * حدّ العرض لنصّ **يحمل رقمه بداخله أصلًا** — مثل اسم يوم الخطة المحفوظ
 * «اليوم 1 · علوي». هذه النصوص تُولَّد وتُخزَّن بأرقام لاتينية عمدًا (قيمة
 * مخزَّنة تبقى كما هي — PKG-7)، فلا يجوز إصلاحها في المولّد ولا في التخزين.
 * التحويل يقع هنا، عند الرسم، ولا يعود إلى القرص أبدًا.
 *
 * التطبيع **باتجاهين**: العربية تُظهر «١»، والإنجليزية تُظهر «1» — فنصّ إرث
 * محفوظ بأرقام هندية لا يتسرّب إلى جلسة إنجليزية.
 */
export function formatNumeralsIn(text: string, lang: Lang): string {
  const table = digitTable(lang)
  return text.replace(ANY_DIGIT, (d) => {
    const code = d.charCodeAt(0)
    if (code >= EXTENDED_ARABIC_INDIC_ZERO) return table[code - EXTENDED_ARABIC_INDIC_ZERO]
    if (code >= ARABIC_INDIC_ZERO) return table[code - ARABIC_INDIC_ZERO]
    return table[Number(d)]
  })
}
