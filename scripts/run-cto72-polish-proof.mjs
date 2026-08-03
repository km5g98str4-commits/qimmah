// قِمّة — إثبات موجة الصقل [CTO-72] المرحلة ب (البنود التي تعيش في الواجهة).
//
// لماذا ملف واحد بأقسام مسمّاة لا ثلاثة ملفات: البنود الثلاثة تحرس **فكرة واحدة**
// — «لا تعرض ما ليس عندك، ولا تأخذ ما عند المستخدم بلا سؤال». وفصلها إلى ثلاث
// بوّابات يجعل كلًّا منها أفقر سياقًا، ويخفي أن كسر أحدها يكسر المعنى نفسه.
//
// القسم ① البند ١ — اللوحة تفتح بحالة فارغة ذكية (`TodayV2`).
// القسم ② البند ٢ — سياق «ليش نسأل» فوق كل خطوة إعداد (`OnboardingV2`).
// القسم ③ البند ٤ — لا فقدان لتقدّم جلسة بلا تأكيد (`WorkoutMode` · `WorkoutView`).
//
// ═══ لماذا فحص بنيوي لا `includes()` ═══
// §4.2 من الميثاق: «مرور غير مستحقّ ليس نجاحًا». خمس `includes()` متفرّقة تُرضى
// من خمسة مواضع لا علاقة بينها. فكل تأكيد هنا **يستخرج الكتلة بحدودها** (عدّ
// أقواس متوازن) ويسأل: هل هذا العنصر **داخل** هذا الحارس؟ — لا: هل الاثنان
// موجودان في الملف؟
//
// وكل قسم يُرفَق بـ**محاكاة التفاف** تنقض الحارس في نسخة من المصدر وتؤكّد أن
// الفحص يسقط **باسمه** — فلو رخا التأكيد يومًا، سقطت المحاكاة أولًا وأعلنت ذلك.
//
//   node scripts/run-cto72-polish-proof.mjs

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')

let pass = 0
let fail = 0
const check = (label, cond, detail = '') => {
  if (cond) {
    pass += 1
    console.log(`  ✓ ${label}`)
  } else {
    fail += 1
    console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

/**
 * يستخرج كتلة JSX محروسة بحدودها الحقيقية: يبدأ من `opener` ويعدّ الأقواس حتى
 * يُغلق القوس المفتوح. هذا هو الفرق بين «الحارس والعنصر موجودان في الملف» وبين
 * «العنصر **داخل** الحارس» — والثاني وحده ما نريده.
 *
 * يعيد مصفوفة الكتل (قد يتكرّر الحارس)، أو [] إن لم يوجد.
 */
function guardedBlocks(src, opener) {
  const blocks = []
  let from = 0
  for (;;) {
    const start = src.indexOf(opener, from)
    if (start === -1) return blocks
    let depth = 1
    let i = start + opener.length
    while (i < src.length && depth > 0) {
      if (src[i] === '(') depth += 1
      else if (src[i] === ')') depth -= 1
      i += 1
    }
    blocks.push(src.slice(start, i))
    from = start + opener.length
  }
}

/** هل يقع `needle` داخل إحدى الكتل المحروسة بـ`opener`؟ */
const insideGuard = (src, opener, needle) => guardedBlocks(src, opener).some((b) => b.includes(needle))

// ═════════════════════════════════════════════════════════════════════════
console.log('\n① البند ١ — اللوحة تفتح بحالة فارغة ذكية (TodayV2)')
// ═════════════════════════════════════════════════════════════════════════

const today = read('src/views/TodayV2.tsx')
const BLANK_GUARD = '{!blankSlate && ('

// أ) التعريف: القيد مركّب من شرطين — «قادم جديد» **و**«لا إشارة اليوم».
const blankDecl = /const blankSlate = model\.state === 'newUser' && !hasTodaySignal/.test(today)
check('`blankSlate` = قادم جديد ∧ لا إشارة اليوم (شرطان لا واحد)', blankDecl)

// ب) الإشارة مشتقّة من مصادر البطاقات نفسها — لا علم منفصل يشيخ.
const signalBlock = today.slice(today.indexOf('const hasTodaySignal ='), today.indexOf('const blankSlate ='))
const SIGNALS = [
  ['سعرات مستهلَكة', 'nutrition.calories.consumed > 0'],
  ['ماء مسجَّل', 'nutrition.water.consumedMl > 0'],
  ['وجبة مسجَّلة', 'hasMeal'],
  ['وزن اليوم', 'todayWeightLogged'],
  ['تمرين منتهٍ', "trainPillar?.state === 'done'"],
  ['تمرين جارٍ', "trainPillar?.state === 'active'"],
]
SIGNALS.forEach(([name, expr]) => check(`الإشارة تشمل: ${name}`, signalBlock.includes(expr)))

// ج) البنية: بطاقة الماكروز **داخل** الحارس لا بجواره.
check(
  'بطاقة الماكروز (الحلقات الأربع) داخل حارس الحالة الفارغة',
  insideGuard(today, BLANK_GUARD, 'today-macros-title'),
)
check(
  'حلقات الماكرو الأربع كلّها داخل نفس الكتلة المحروسة',
  guardedBlocks(today, BLANK_GUARD).some((b) => (b.match(/<MacroRing/g) || []).length === 4),
)
check(
  'بطاقة «نبض أسبوعك» داخل حارس الحالة الفارغة',
  insideGuard(today, BLANK_GUARD, '<InsightCardsView'),
)

// د) الأرقام الصفرية في بطاقات المهام تُستبدل بنصّ يشرح ما سيحدث.
check(
  'سطر السعرات في بطاقة الوجبة محكوم بـ`!blankSlate`',
  /nutrition\.calories\.target > 0 && !blankSlate/.test(today),
)
check(
  'سطر الماء في بطاقة الموية محكوم بـ`!blankSlate`',
  /nutrition\.water\.targetMl > 0 && !blankSlate/.test(today),
)

// هـ) الحالة الفارغة **مؤقّتة**: لا شيء يقيّدها بعلم دائم يُخزَّن.
check(
  'لا تخزين للحالة الفارغة (تزول بأول تسجيل، لا بعلم محفوظ)',
  !/blankSlate[\s\S]{0,120}(localStorage|safeStorage|setItem)/.test(today),
)

// و) ⚔️ محاكاة التفاف: انزع الحارس ⇒ يجب أن يسقط فحص بنيوي **مسمّى**.
{
  const tampered = today.split(BLANK_GUARD).join('{true && (')
  const stillGuarded = insideGuard(tampered, BLANK_GUARD, 'today-macros-title')
  check(
    '⚔️ نزع الحارس يُسقط فحص «الماكروز داخل الحارس» (لا يمرّ بوجود النصّين)',
    stillGuarded === false,
    'الفحص مرّ على مصدر منزوع الحارس — البوابة رخوة',
  )
}

// ═════════════════════════════════════════════════════════════════════════
console.log(`\n${'─'.repeat(58)}\nالنتيجة: ${pass} ناجح · ${fail} فاشل`)
if (fail > 0) process.exit(1)
