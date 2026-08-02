/**
 * صياغة الهدف بالمستوى **المُعلَن** — مصدر واحد لكل شاشة تعرض اسم الهدف.
 *
 * [CTO-65] البند ٥ أزال خريطة المصطلحات الثابتة من `profileV2Model` فصار الملف
 * الشخصي يتبع مستوى المستخدم. و[CTO-67] البند ٤ يمدّ العلاج إلى **معاينة الخطة**
 * داخل «تعديل خطتي»: كانت تعرض `identity.mainGoal` — وهي سلسلة تُكتب عند إكمال
 * الإعداد من `goalChoices` بالمصطلح الخام، فيقرأ المبتدئ الذي اختار «خسارة دهون»
 * كلمة «تنشيف» في معاينته. **نفس الوعد، شاشة أخرى.**
 *
 * ولماذا وحدة مستقلّة لا نسخة ثانية من المنطق: لو حسبت كل شاشة صياغتها بنفسها
 * لصار للتطبيق مصدرا تسمية، وهو أصل العطب لا علاجه.
 *
 * **العلاج عند العرض لا عند الكتابة عمدًا:** `identity.mainGoal` المخزَّنة عند
 * آلاف المستخدمين تحمل المصطلح الخام أصلًا. إصلاح مسار الكتابة وحده يترك كل ملف
 * قائم على حاله، والاشتقاق عند العرض يشمل القديم والجديد معًا.
 */

import { goalWordingFor } from '@/i18n/dict/onboardingIntent'
import { loadOnboardingProfile } from '@/lib/onboardingProfile'
import { v2LevelFromExperience, type V2Level } from '@/lib/onboardingV2Flow'
import type { Lang } from '@/lib/appPreferences'
import type { CalorieGoal } from '@/types/profile'

/**
 * المستوى المُعتمَد حين لا يكون محفوظًا — [CTO-65] البند ٥.
 *
 * **`beginner` لا `intermediate` عمدًا.** توقيع `goalWordingFor` هو
 * `s.goalWording[level ?? 'intermediate']`، فتمرير `null` إليه **يعيد «تنشيف»
 * ويجعل البند يبدو منجزًا وهو ليس كذلك**. لذلك يُحسم السقوط هنا باسم معلَن،
 * ونحو أوسع الصياغتين فهمًا: لغة النتيجة يفهمها كل مستوى، ومصطلح الصالة لا
 * يفهمه المبتدئ. حين لا نعرف، لا نخاطر بالتسريب.
 */
export const LEVEL_WHEN_UNKNOWN: V2Level = 'beginner'

/**
 * المستوى كما **أعلنه المستخدم** في الإعداد — `null` حين لا إجابة محفوظة.
 *
 * ⚠️ لا يُقرأ من `customization.profile.trainingLevel`: افتراضيّه
 * `'intermediate'`، فيُلبِس كلَّ مستخدم صياغةَ المتوسّط قبل أن يجيب شيئًا.
 * المصدر الوحيد الصادق هو الإجابة المحفوظة نفسها.
 */
export function declaredTrainingLevel(): V2Level | null {
  return v2LevelFromExperience(loadOnboardingProfile()?.trainingPreferences?.experience)
}

/** صياغة هدف بعينه (تسمية + وصف + عنوان برنامج) بلغة الشاشة وبالمستوى المُعلَن. */
export function declaredGoalWording(lang: Lang, goal: CalorieGoal) {
  return goalWordingFor(lang, declaredTrainingLevel() ?? LEVEL_WHEN_UNKNOWN)[goal]
}

/** التسمية وحدها — ما تعرضه بطاقات المعاينة والمراجعة. */
export function declaredGoalLabel(lang: Lang, goal: CalorieGoal | null | undefined): string | null {
  return goal ? declaredGoalWording(lang, goal).label : null
}
