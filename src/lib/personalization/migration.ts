// هجرة المستخدمين القائمين — «لا تُجبر مستخدمًا حاليًا على فقد ملفه» (§17).
//
// ═══ القاعدة: نسأل الناقص لا الكل ═══
// من أتمّ `OnboardingV2` عنده بالفعل: الهدف · الأيام · المدّة · البيئة ·
// الإصابات · الموافقة الصحية · وبعد [CTO-73] الجسدَ والنية والمستوى. كل ذلك
// يُترجَم إلى إجابات بنك التخصيص، فيبدأ المحرّك **من منتصف الطريق** ولا يعيد
// السؤال. وما لم يكن عنده يُسأل عنه وحده.
//
// ═══ وما لا يُترجَم لا يُخمَّن ═══
// حقل غير موجود في المصدر يبقى **بلا إجابة** — لا قيمة افتراضية صامتة. لأن
// إجابة مخترَعة تُغلق سؤالًا كان سيُطرح، فتُنتج ملفًا يبدو مكتملًا وليس كذلك.
// وهذا بعينه العطل القائم: `defaultAnswers` يملأ العمر ٢٥ والطول ١٧٠ فيخرج
// **نفس BMR لكل مستخدم** (`PERSONALIZATION-SPEC.md` §2.1-٤).

import type { OnboardingProfile } from '@/types/onboarding'
import type { AnswerValue, PersonalizationState } from './types'
import { recomputeDerived } from './engine'
import type { Lang } from '@/lib/appPreferences'
import { createState } from './engine'

/** بيئة الإعداد القديمة ← مكان التدريب + المعدّات المتاحة. */
const ENVIRONMENT_MAP: Record<string, { place: string; equipment: string[] }> = {
  commercial_gym: { place: 'gym', equipment: [] },
  small_gym: { place: 'gym', equipment: [] },
  home_gym: { place: 'home', equipment: ['dumbbell', 'bodyweight', 'bench'] },
  bodyweight: { place: 'home', equipment: ['bodyweight'] },
}

/** الهدف المخزَّن ← الخيار المعروض. الاتجاه معكوس فيبقى الطيّ متّسقًا. */
const GOAL_TO_DISPLAY: Record<string, string> = {
  cut: 'fat_loss',
  bulk: 'muscle_gain',
  maintain: 'general_health',
}

const EXPERIENCE_TO_SELF: Record<string, string> = {
  beginner: 'beginner',
  novice: 'beginner',
  intermediate: 'intermediate',
  advanced: 'advanced',
}

const CONSISTENCY_MAP: Record<string, string> = {
  new: 'rare',
  on_and_off: 'on_off',
  consistent: 'steady',
  returning: 'on_off',
}

export interface MigrationReport {
  state: PersonalizationState
  /** المفاتيح التي وصلت من الملف القديم. */
  mapped: string[]
  /** ما بقي بلا إجابة وسيُسأل عنه — يُعرض للمستخدم لا يُخفى. */
  stillMissing: string[]
}

/**
 * يبني حالة تخصيص من ملف الإعداد القائم. **لا يكتب تخزينًا** — المستدعي
 * يقرّر الحفظ ويقرأ نتيجته.
 */
export function migrateFromOnboarding(profile: OnboardingProfile, lang: Lang, userId: string | null = null, now = Date.now()): MigrationReport {
  const answers: Record<string, AnswerValue> = {}
  const mapped: string[] = []

  const set = (key: string, value: AnswerValue): void => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value) && !value.length) return
    answers[key] = value
    mapped.push(key)
  }

  // الموافقة الصحية تُهاجَر **فقط إن كانت مقبولة صراحةً**. غيابها يعني إعادة
  // طلبها — الإذن لا يُستنتج ولا يُورَّث بالسكوت.
  if (profile.consents?.healthData?.accepted === true) set('healthConsent', true)

  set('age', profile.profile?.age ?? null)
  set('sex', profile.profile?.sex ?? null)
  set('heightCm', profile.bodyMetrics?.heightCm ?? null)
  set('weightKg', profile.bodyMetrics?.currentWeightKg ?? null)
  set('targetWeightKg', profile.bodyMetrics?.targetWeightKg ?? null)

  const goal = profile.goal?.type
  if (goal) set('primaryGoalDisplay', GOAL_TO_DISPLAY[goal] ?? 'general_health')

  const tp = profile.trainingPreferences
  if (tp?.daysPerWeek) set('daysPerWeek', String(tp.daysPerWeek))
  if (tp?.sessionDurationMin) set('sessionMinutes', String(tp.sessionDurationMin))
  if (tp?.experience) {
    set('selfLevel', EXPERIENCE_TO_SELF[tp.experience] ?? 'beginner')
    // «مبتدئ» في المخطّط القديم لا يميّز بين «ما جرّب» و«جرّب قليلًا»، فلا
    // نخترع: `trainedBefore` يبقى فارغًا ويُسأل.
    if (tp.experience !== 'beginner') set('trainedBefore', 'years')
  }
  if (tp?.consistency) set('consistency', CONSISTENCY_MAP[tp.consistency] ?? 'on_off')
  if (tp?.splitMode === 'advanced' && tp.advancedSplit) {
    const supported = ['full_body', 'upper_lower', 'push_pull_legs', 'bro_split']
    if (supported.includes(tp.advancedSplit)) set('splitChoice', tp.advancedSplit)
  }
  if (tp?.environment) {
    const env = ENVIRONMENT_MAP[tp.environment]
    if (env) {
      set('place', env.place)
      if (env.equipment.length) set('equipmentList', env.equipment)
    }
  }

  const injuries = profile.limitations?.injuries ?? []
  if (injuries.length) {
    set('hasInjury', 'current')
    // ⚠️ **لا نترجم نصّ الإصابة إلى منطقة جسم.** القائمة القديمة نصّ حرّ،
    // والمطابقة التخمينية هنا تعني قيدًا أمنيًا مبنيًّا على تخمين. تُحفظ كما
    // هي في الملاحظات، ويُسأل `l-current-areas` بالقائمة المغلقة.
    set('limitationNotes', injuries.join(' · '))
  } else if (profile.limitations) {
    set('hasInjury', 'none')
  }

  const steps = profile.activityProfile?.stepEstimate
  if (typeof steps === 'number') {
    set('dailySteps', steps < 3000 ? 'lt3k' : steps < 6000 ? 'k3_6' : steps < 10000 ? 'k6_10' : 'gt10k')
  }
  const meals = profile.nutritionPreferences?.mealsPerDay
  if (typeof meals === 'number') set('mealsPerDay', meals <= 2 ? '1_2' : meals === 3 ? '3' : meals === 4 ? '4' : '5plus')

  const base = createState(lang, userId, now)
  const state = recomputeDerived({ ...base, answers })

  const REQUIRED_KEYS = ['healthConsent', 'age', 'sex', 'heightCm', 'weightKg', 'trainedBefore', 'primaryGoalDisplay', 'daysPerWeek', 'sessionMinutes', 'place', 'trainingStyle', 'hasInjury']
  const stillMissing = REQUIRED_KEYS.filter((k) => answers[k] === undefined)

  return { state, mapped, stillMissing }
}

/**
 * ترقية حالة محفوظة بإصدار بنك أقدم. الإجابات لأسئلة حُذفت **تُهمَل بلا كسر**،
 * والباقي يُعاد اشتقاقه. لا نحذف إجابة خام: قد يعود سؤالها في إصدار لاحق.
 */
export function migrateState(state: PersonalizationState, knownKeys: ReadonlySet<string>): PersonalizationState {
  const answers: Record<string, AnswerValue> = {}
  for (const [k, v] of Object.entries(state.answers)) if (knownKeys.has(k)) answers[k] = v
  const history = state.history.filter((h) => h.id)
  return recomputeDerived({ ...state, answers, history })
}
