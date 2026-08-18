import type { Lang } from '@/lib/appPreferences'
import type { PlanOutcomeCode } from '@/lib/planChanges'

/**
 * قاموس نتيجة إعادة التوليد والتحويل لنسخة الأجهزة — [SOVEREIGN-003] D7.
 *
 * السجلّ: عامية بيضاء (§6). والقاعدة الحاكمة هنا **صدق المعروض قبل الطمأنينة**:
 * الرسالة تصف ما حدث في المحرّك فعلًا، لا ما ضغطه المستخدم. «ما تغيّر شي» نتيجة
 * صحيحة تُقال صريحة ومعها سببها — لا فشل يُخفى ولا نجاح يُدَّعى.
 */
export interface PlanCoherenceStrings {
  /** رسالة النتيجة كما تُعرض بعد الفعل. */
  outcome: Record<PlanOutcomeCode, string>
  /** سطر يصف حجم التغيير حين وقع فعلًا. */
  changedDetail: (days: number, exercises: number) => string
}

const ar: PlanCoherenceStrings = {
  outcome: {
    machines_converted: 'تم — حوّلنا خطتك التلقائية لنسخة الأجهزة.',
    machines_already:
      'ما تغيّر شي — خطتك أصلًا كلها أجهزة، فما فيه تمرين نبدّله. هذي نتيجة صحيحة مو خلل.',
    machines_unavailable:
      'ما تغيّر شي — أدواتك المسجّلة ما فيها أجهزة، فما نقدر نبني لك نسخة أجهزة صادقة. عدّل أدواتك في «تعديل خطتي» وجرّب بعدها.',
    machines_no_effect:
      'ما تغيّر شي — طلب التحويل ما وصّل لخطة مختلفة، وما ندري ليش بالضبط. ما بنقول لك تم وهي ما تمّت. راجع أدواتك في «تعديل خطتي».',
    save_failed:
      'ما انحفظت — تخزين المتصفح رفض الكتابة، فخطتك القديمة باقية زي ما هي. فضّي مساحة أو جرّب من نافذة عادية مو خفيّة.',
    regenerated: 'تم — سوّينا لك خطة جديدة من بياناتك الحالية.',
    regenerated_identical:
      'ما تغيّر شي — بياناتك ما تغيّرت، والمولّد يعطي نفس النتيجة لنفس البيانات. خطتك زي ما هي.',
  },
  changedDetail: (days, exercises) => `تعدّل ${days} يوم و${exercises} تمرين.`,
}

const en: PlanCoherenceStrings = {
  outcome: {
    machines_converted: 'Done — your auto plan is now the machines version.',
    machines_already:
      "Nothing changed — your plan is already all machines, so there was nothing to swap. That's a correct result, not a failure.",
    machines_unavailable:
      "Nothing changed — the equipment you listed has no machines, so we can't build an honest machines version. Update your equipment in “Edit my plan” and try again.",
    machines_no_effect:
      "Nothing changed — the switch didn't produce a different plan, and we don't know exactly why. We won't tell you it worked when it didn't. Check your equipment in “Edit my plan”.",
    save_failed:
      "Not saved — your browser storage refused the write, so your old plan is still there. Free up space, or try outside a private window.",
    regenerated: 'Done — we built you a new plan from your current data.',
    regenerated_identical:
      'Nothing changed — your data is the same, and the generator gives the same result for the same data. Your plan stays as it is.',
  },
  changedDetail: (days, exercises) => `${days} day(s) and ${exercises} exercise(s) changed.`,
}

export const planCoherenceStrings: Record<Lang, PlanCoherenceStrings> = { ar, en }
