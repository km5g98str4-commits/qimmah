/**
 * نيّة شاشة التمرين — مالك قانوني واحد للمفتاح ولحراسته.
 *
 * ═══ العطل الذي يغلقه ═══
 * «اليوم» يعرض «إحماء قصير · سوّه الحين»، وضغطُه كان ينفّذ `onNavigate('workout')`
 * **وحدها**. وشاشة الإحماء موجودة وموصولة فعلًا (`WarmupScreen` داخل
 * `WorkoutView`)، لكنها لا تُفتح إلا من `startDay` — أي من زرّ البدء **داخل**
 * شاشة التمرين. فالنيّة تُفقد عند الحدّ بين الشاشتين، ويهبط المستخدم على
 * الشاشة العامّة. نداءٌ يَعِد بالإحماء ويُسلّم قائمة تمارين: كذبة واجهة (§6-٤).
 *
 * ═══ لماذا نيّة مخزَّنة لا مَعلم في المسار ═══
 * التنقّل هنا حالة لا هاش (`onNavigate('workout')`)، فلا مكان لمعامل في الرابط.
 * والنمط قائم في المستودع مرّتين — `setupFocus.ts` و`quickLogIntent.ts` — وهذا
 * ثالثها بنفس الشكل حرفًا بحرف، لا آلية توجيه رابعة.
 *
 * ═══ ولماذا الحراسة ═══
 * في Safari حين تُمنع الكعكات، الوصول إلى `window.sessionStorage` **نفسه** يرمي
 * `SecurityError` — لا دوالّه فقط. فبلا `try` يموت معالج النقر كلّه، ويصير عطلُ
 * تخزينٍ عطلَ زرّ. ونفس السبب يجعل القراءة محروسة أثناء التركيب.
 *
 * والقراءة **مستهلِكة**: `take` تمسح قبل أن تُعيد، فلا يُعاد فتح الإحماء عند كل
 * تحديث للصفحة إلى الأبد.
 */
export const WORKOUT_INTENT_KEY = 'qimmah:workout-intent'

/** الوجهة الوحيدة اليوم — تُوسَّع بقيمة مُعلَنة لا بنصّ حرّ. */
export type WorkoutIntent = 'warmup'

const VALID: readonly WorkoutIntent[] = ['warmup']

function isValid(raw: string | null): raw is WorkoutIntent {
  return raw !== null && (VALID as readonly string[]).includes(raw)
}

/** يسجّل نيّة شاشة التمرين. آمن في بيئة بلا نافذة أو بتخزين محجوب. */
export function requestWorkoutIntent(intent: WorkoutIntent): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(WORKOUT_INTENT_KEY, intent)
  } catch {
    /* تخزين محجوب — التنقّل يتم على أي حال، والإحماء يبقى متاحًا من زرّ البدء. */
  }
}

/**
 * يقرأ النيّة **ويستهلكها إن كانت من نصيب هذه الشاشة**.
 *
 * وأي قيمة خارج المُعلَن تُمسح وتُتجاهَل بلا رمي — قيمة مجهولة لا تُبقى معلّقة.
 */
export function takeWorkoutIntent(accepted: readonly WorkoutIntent[]): WorkoutIntent | null {
  if (typeof window === 'undefined') return null
  let raw: string | null = null
  try {
    raw = window.sessionStorage.getItem(WORKOUT_INTENT_KEY)
  } catch {
    return null
  }
  if (raw === null) return null
  if (!isValid(raw)) {
    clearWorkoutIntent()
    return null
  }
  if (!accepted.includes(raw)) return null
  clearWorkoutIntent()
  return raw
}

/** يمسح النيّة. آمن في بيئة بلا نافذة أو بتخزين محجوب. */
export function clearWorkoutIntent(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(WORKOUT_INTENT_KEY)
  } catch {
    /* محجوب — لا شيء يُمسح ولا شيء يُكسر. */
  }
}
