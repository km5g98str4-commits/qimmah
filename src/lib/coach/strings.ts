// ═══════════════════════════════════════════════════════════════════════════
//  عقد نصوص المرشد — [SOVEREIGN-COACH-001].
//
//  يعيش في `lib/` لا في `i18n/` عمدًا: **الشكل** التزام على القاموس، والقاموس
//  يستورده فيُطبَّق عليه. فمفتاح سطر بلا نصّ — أو نصّ بلا مفتاح — **يسقط في
//  `typecheck`** لا في يد مستخدم. وجداول القيم المنظَّمة مكتوبة باتحاداتها
//  الأصلية (`Muscle` · `GoalType` …) فإضافة عضلة جديدة إلى الكتالوج تُسقط
//  البناء حتى تُترجَم، ولا تظهر مفتاحًا خامًا على الشاشة.
// ═══════════════════════════════════════════════════════════════════════════

import type { ExperienceLevel, GoalType, GymAccess, InjuryAreaKey } from '@/types/profile'
import type { Muscle } from '@/types/workout'
import type { PlanAxisKey } from '@/lib/planRationale'
import type { RecoverySuggestion } from '@/lib/recoveryEngine'
import type { CoachLineKey, CoachLineKind, CoachQuestionId, GroundingSourceId } from './types'

export interface CoachEnumTables {
  experienceLevel: Record<ExperienceLevel, string>
  goalType: Record<GoalType, string>
  gymAccess: Record<GymAccess, string>
  recoverySuggestion: Record<RecoverySuggestion, string>
  muscle: Record<Muscle, string>
  planAxis: Record<PlanAxisKey, string>
  injuryArea: Record<InjuryAreaKey, string>
}

/**
 * نصوص **بطاقة المدخل** وحدها — مفصولة في واجهة مستقلّة عمدًا.
 *
 * شاشة «اليوم» يفتحها كل مستخدم كل يوم، والبطاقة تحتاج أربعة نصوص لا ثلاثمئة.
 * فصلُها يجعل `coachEntryStrings` قابلًا للاستيراد وحده، ويسقط بقيّة القاموس
 * في هزّ الشجرة بدل أن يدخل حزمة اللوحة. و`CoachStrings` **يرث** هذه الحقول
 * فلا تُكتب مرّتين ولا تتباعد نسختان.
 */
export interface CoachEntryStrings {
  eyebrow: string
  entryTitle: string
  entryBody: string
  entryCta: string
}

export interface CoachStrings extends CoachEntryStrings {
  title: string
  subtitle: string
  back: string
  /** إفصاح المصدر — يُعرَض دائمًا، ولا يُخفى خلف «معلومات إضافية». */
  disclosureLocal: string
  disclosureExternal: string
  askLabel: string
  howItAnswers: string
  askPlaceholder: string
  askSubmit: string
  /**
   * **لا ذاكرة ولا تكيّف.** الواجهة تقولها صراحةً: المحرّك حتميّ، لا يحفظ
   * سؤالًا ولا يتعلّم من جواب — وكل جواب يُبنى من جديد لحظة السؤال. إخفاء هذا
   * يترك المستخدم يفترض ذكاءً غير موجود، وهو ادّعاء لا نملكه (§6/٤).
   */
  noMemoryNote: string
  /**
   * حين يسقط عقد الإسناد (`CoachProvenanceError`) لا يُعرض جزء من الجواب ولا
   * يُبتلع الخطأ: تُقال المشكلة صريحة ويبقى المستخدم بلا رقم مخترَع (§5).
   */
  answerBlocked: string
  quickTitle: string
  answerTitle: string
  sourceLabel: string
  unknownLabel: string
  openExercise: string
  reset: string
  /** وسم كل نوع سطر — الفصل المرئي بين المحسوب والمقترَح والملاحظة. */
  kinds: Record<CoachLineKind, string>
  questions: Record<CoachQuestionId, string>
  lines: Record<CoachLineKey, string>
  enums: CoachEnumTables
  /** اسم بشري لكل مصدر إسناد — يُعرَض تحت السطر الذي استند إليه. */
  sources: Record<GroundingSourceId, string>
}
