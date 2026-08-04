// أحداث التخصيص — محلّية بالكامل، بلا شبكة، وبلا نصّ حرّ.
//
// ═══ ⚠️ لماذا هذه الأحداث ليست في `lib/tracking/registry.ts` ═══
// ذلك السجلّ **مقفل على خمسة عشر اسمًا موقّعًا من المجلس**، ويحرسه
// `scripts/run-analytics-proof.mjs:46` بفحص `names.length === 15` حرفيًا،
// ويطلب لكل اسم **موضع نداء في كود حيّ يصل المستخدم** (`:114`). فإضافة أحد
// عشر اسمًا هنا كانت ستفعل شيئين ممنوعين: تُرخي عددًا موقّعًا، وتضيف أسماء بلا
// سطح حيّ (المحرّك غير موصول بواجهة بعد — انظر تقرير الموجة).
//
// فالحلّ المعلَن: **طبقة أحداث خاصّة بالتخصيص**، بنفس ضمانات طبقة التتبّع
// (صفر endpoint · صفر معرّف إعلاني · لا نصّ حرّ)، **ومقترَح دمجها في السجلّ
// الموقّع حين يُعتمد ذلك ويصير لها سطح حيّ**. لا إرخاء صامت، ولا حدث يُبتلع.
//
// ═══ ولا نصّ حرّ يخرج من هنا ═══
// «لا ترسل إجابات نصّية حسّاسة بلا داعٍ» (§18). القاعدة هنا أشدّ: النصّ الحرّ
// **لا يُسجَّل إطلاقًا** — يُسجَّل طوله فقط. ومعرّف السؤال يُسجَّل لأنه ثابت
// معروف، أمّا الإجابة فتُسجَّل مصنَّفة لا حرفية للفئات الحسّاسة.

import type { QuestionCategory, QuestionId } from './types'

/** الأحداث الأحد عشر (§18). أسماء إنجليزية snake_case كما في السجلّ الموقّع. */
export const PERSONALIZATION_EVENTS = [
  'personalization_started',
  'personalization_question_shown',
  'personalization_question_answered',
  'personalization_question_skipped',
  'personalization_back',
  'personalization_validation_failed',
  'personalization_abandoned',
  'personalization_resumed',
  'personalization_completed',
  'personalization_profile_updated',
  'personalization_recommendation_regenerated',
] as const

export type PersonalizationEventName = (typeof PERSONALIZATION_EVENTS)[number]

/** الفئات التي **لا تُسجَّل قيمتها** — الصحة والقيود بيانات حسّاسة. */
const SENSITIVE_CATEGORIES: readonly QuestionCategory[] = ['safety', 'limitations']

export interface PersonalizationEvent {
  name: PersonalizationEventName
  ts: number
  props: Record<string, string | number | boolean>
}

type Sink = (event: PersonalizationEvent) => void

/**
 * الوجهة. الافتراضي **مصرف فارغ** — لا شبكة، ولا تخزين، ولا تجميع. من أراد
 * تجميعًا محلّيًا يحقنه صراحةً. الافتراض المتاح دائمًا هو ألّا يُجمع شيء.
 */
let sink: Sink | null = null

export function setPersonalizationSink(next: Sink | null): void {
  sink = next
}

/** يسجّل حدثًا. لا يرمي أبدًا — التتبّع لا يكسر تدفّق مستخدم. */
export function emit(name: PersonalizationEventName, props: Record<string, string | number | boolean> = {}, now = Date.now()): void {
  try {
    sink?.({ name, ts: now, props })
  } catch {
    /* صامت عند الفشل — بلا شاشة وبلا أثر على حالة المنتج. */
  }
}

/**
 * يبني خصائص حدث سؤال **بعد تعقيمها**. القيمة الحسّاسة تُستبدل بـ`answered`،
 * والنصّ الحرّ بطوله. التعقيم هنا لا عند الوجهة: مصرف خاطئ لا يستطيع تسريب
 * ما لم يصله أصلًا.
 */
export function questionProps(
  id: QuestionId,
  category: QuestionCategory,
  value?: unknown,
): Record<string, string | number | boolean> {
  const props: Record<string, string | number | boolean> = { question: id, category }
  if (value === undefined) return props
  if (SENSITIVE_CATEGORIES.includes(category)) {
    props.value = 'answered'
    return props
  }
  if (typeof value === 'string') {
    // النصّ الحرّ يُقاس ولا يُنقل. سلسلة قصيرة قد تكون قيمة خيار — تُنقل فقط
    // إن طابقت شكل المعرّفات (حروف صغيرة/أرقام/شرطات)، وإلا فطولها.
    props.value = /^[a-z0-9_]{1,24}$/.test(value) ? value : `len:${value.length}`
    return props
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    props.value = value
    return props
  }
  if (Array.isArray(value)) {
    props.count = value.length
    return props
  }
  return props
}
