// ثوابت المحرّك — مصدر واحد لكل رقم يتكرّر.
//
// **`AGE_MIN` لا يُعلَن هنا.** هو قرار مقفل يعيش في `config/profileDomain`،
// ودرسه مدفوع الثمن: كان معلنًا في موضعين برقمين مختلفين فيُقبل المستخدم في
// مسار ويُرفض في آخر ([CTO-65] البند ٢). يُعاد تصديره فقط.

import { AGE_RANGE } from '@/config/profileDomain'
import type { Muscle, MovementPattern } from '@/types/workout'

/** الحدّ الأدنى للعمر — مقفل، مصدره `config/profileDomain` وحده. */
export const AGE_MIN = AGE_RANGE.min

/** سنّ الرشد لأغراض تقييد الأهداف. شامل: 18 بالضبط يرى كل الخيارات. */
export const ADULT_AGE = 18

/**
 * الأهداف المسموحة للقاصر. **الصيانة والصحة العامة فقط** — لا `cut` ولا `bulk`.
 * قرار امتثال App Store لا تفضيل تصميمي؛ يقابل `fix/minors-maintenance-only`
 * القائم على الجذع.
 */
export const MINOR_ALLOWED_GOALS = ['maintain'] as const

/** العضلات الأساسية التي تُرتَّب بينها الأولويات. */
export const PRIORITISABLE_MUSCLES: readonly Muscle[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'legs',
  'glutes',
  'hamstrings',
  'quads',
  'calves',
  'core',
]

/** أنماط الحركة التي يجب أن تغطّيها أي خطة كاملة. */
export const CORE_PATTERNS: readonly MovementPattern[] = ['push', 'pull', 'squat', 'hinge']

/** مفتاح تخزين حالة التخصيص — مسجَّل في `userDataKeys`. */
export const PERSONALIZATION_STATE_KEY = 'qimmah:personalization:state:v1'
/** مفتاح تخزين الملف المشتقّ. */
export const PERSONALIZATION_PROFILE_KEY = 'qimmah:personalization:profile:v1'
