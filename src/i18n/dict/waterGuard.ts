// نصوص حارس تسجيل الماء + سطر «الباقي» + مسار التراجع — [FOUNDER-QA/P1].
//
// قاموس **جديد خاصّ بهذه الحارة** (§1.4/٢): لا يُعدَّل قاموس مشترك، وسطحا الماء
// الحيّان (بطاقة الرئيسية · لوحة ماء التغذية) يقرآن منه معًا فلا يفترق النصّان.
//
// ═══ النبرة ═══
// عامية بيضاء، **ملاحظة لا إنذار**: «فوق هدفك» لا «خطر». لا تشخيص، ولا نصيحة
// علاجية، ولا علامة تعجّب واحدة. الثوابت الأربعة (§6) تسري على كل سطر.
//
// ═══ الأرقام ═══
// كل دالة تستقبل **نصًّا منسَّقًا مسبقًا** (`formatNumber(n, lang)`) لا رقمًا خامًا —
// وإلا عادت أرقام لاتينية إلى جلسة عربية من باب القاموس (BUG-019).

import type { Lang } from '@/lib/appPreferences'

export interface WaterGuardStrings {
  /** وحدة اللتر المعروضة. */
  litersUnit: string
  /** «٢٫١ / ٣٫٠ لتر» — النصّان منسَّقان مسبقًا. */
  litersOfTarget: (consumed: string, target: string) => string
  /** «باقي ٠٫٩ لتر». */
  litersRemaining: (remaining: string) => string
  /** يُقال حين يكتمل الهدف بدل رقم باقٍ صفريّ. */
  litersTargetMet: string

  // — نافذة التأكيد (طبقتان) —
  confirmElevatedTitle: string
  confirmElevatedBody: (projected: string, target: string) => string
  confirmExtremeTitle: string
  confirmExtremeBody: (projected: string) => string
  confirmYes: string
  confirmExtremeYes: string
  confirmNo: string

  // — التراجع والتصفير —
  undoCup: string
  resetWater: string
  resetConfirmBody: (consumed: string) => string
  resetConfirmYes: string
  resetCancel: string
  resetFailed: string
}

const ar: WaterGuardStrings = {
  litersUnit: 'لتر',
  litersOfTarget: (consumed, target) => `${consumed} / ${target} لتر`,
  litersRemaining: (remaining) => `باقي ${remaining} لتر`,
  litersTargetMet: 'كمّلت هدفك',

  confirmElevatedTitle: 'فوق هدفك اليوم',
  confirmElevatedBody: (projected, target) =>
    `بكذا توصل ${projected} لتر اليوم، وهدفك ${target} لتر. نسجّلها؟`,
  confirmExtremeTitle: 'كمية كبيرة اليوم',
  confirmExtremeBody: (projected) =>
    `بكذا توصل ${projected} لتر اليوم — أكبر بكثير من أي يوم عادي. إذا كانت ضغطة بالغلط تقدر تتراجع.`,
  confirmYes: 'سجّلها',
  confirmExtremeYes: 'إي، سجّلها',
  confirmNo: 'لا، خلّها',

  undoCup: 'تراجع عن آخر كوب',
  resetWater: 'صفّر ماء اليوم',
  resetConfirmBody: (consumed) => `بنمسح ${consumed} لتر المسجّلة اليوم ونبدأ من صفر. تمام؟`,
  resetConfirmYes: 'صفّرها',
  resetCancel: 'خلّها',
  resetFailed: 'ما قدرنا نصفّرها — جرّب مرة ثانية.',
}

const en: WaterGuardStrings = {
  litersUnit: 'L',
  litersOfTarget: (consumed, target) => `${consumed} / ${target} L`,
  litersRemaining: (remaining) => `${remaining} L left`,
  litersTargetMet: 'Target reached',

  confirmElevatedTitle: 'Above your target today',
  confirmElevatedBody: (projected, target) =>
    `That puts you at ${projected} L today, and your target is ${target} L. Log it?`,
  confirmExtremeTitle: 'That is a big amount today',
  confirmExtremeBody: (projected) =>
    `That puts you at ${projected} L today — well above a normal day. If it was a mis-tap, you can back out.`,
  confirmYes: 'Log it',
  confirmExtremeYes: 'Yes, log it',
  confirmNo: 'No, skip it',

  undoCup: 'Undo last cup',
  resetWater: 'Reset today’s water',
  resetConfirmBody: (consumed) => `We will clear the ${consumed} L logged today and start from zero. OK?`,
  resetConfirmYes: 'Reset it',
  resetCancel: 'Keep it',
  resetFailed: 'We could not reset it — please try again.',
}

export const waterGuardStrings: Record<Lang, WaterGuardStrings> = { ar, en }
