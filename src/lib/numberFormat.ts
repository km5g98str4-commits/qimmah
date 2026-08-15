import type { Lang } from '@/lib/appPreferences'

/**
 * The product's one numeral policy: Arabic uses Arabic-Indic digits and English
 * uses Latin digits. This only formats values at the presentation boundary; the
 * number passed in is never converted or written back to storage.
 */
export function formatNumber(
  value: number,
  lang: Lang,
  options: Intl.NumberFormatOptions = {},
): string {
  const locale = lang === 'ar' ? 'ar-SA-u-nu-arab' : 'en-US-u-nu-latn'
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
 * `1234567890` تعطي «١٢٣٤٥٦٧٨٩٠»: آخر محرف هو الصفر، فيُنقل إلى الرأس.
 */
const digitTableCache = new Map<Lang, string>()
function digitTable(lang: Lang): string {
  const cached = digitTableCache.get(lang)
  if (cached) return cached
  const seq = formatNumber(1234567890, lang, { useGrouping: false })
  const table = seq.slice(9) + seq.slice(0, 9)
  digitTableCache.set(lang, table)
  return table
}

/** أرقام لاتينية `0-9` وهندية `٠-٩` — المدخلان الوحيدان اللذان نطبّعهما. */
const ANY_DIGIT = /[0-9٠-٩]/g
const ARABIC_INDIC_ZERO = 0x0660

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
    return table[code >= ARABIC_INDIC_ZERO ? code - ARABIC_INDIC_ZERO : Number(d)]
  })
}
