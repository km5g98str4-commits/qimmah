// سجلّ أحداث التتبّع المحلي — **مصدر الحقيقة الوحيد** للأسماء والخصائص.
//
// [CTO-68] — منظومة التتبّع المحلية. المبدأ الحاكم: الأحداث تتجمّع على الجهاز
// حصرًا، **صفر endpoint سحابي**. لا مكتبة تحليلات خارجية، ولا معرّف إعلاني، ولا
// معرّف جهاز: الحدث يُنسب لمالكه عبر لاحقة المفتاح (ضيف/حساب) لا عبر معرّف داخله.
//
// لماذا ملف منفصل عن `lib/analytics/`؟ لأن تلك الطبقة **قادرة على الإرسال** متى
// ضُبط `VITE_ANALYTICS_ENDPOINT` (مزوّد HTTP حقيقي في `analytics/providers/http.ts`).
// هذه الطبقة لا تملك مسار شبكة أصلًا — وهو فرق بنيوي لا تنظيمي، ويحرسه
// `test:analytics` بفحص مسمّى على مصدر هذا المجلّد كلّه.
// وحارس ثانٍ يمنع التباس الطبقتين: تقاطع السجلّين يجب أن يبقى **خاليًا**.
//
// أسماء الأحداث **إنجليزية snake_case ثابتة**. لا يُطلق حدث خارج هذه القائمة:
// النوع `TrackedEventName` يمنع ذلك عند الترجمة، والإثبات يمنعه عند البوابة.

/**
 * الأحداث الخمسة عشر الموقّعة من المجلس — بترتيب رحلة المستخدم.
 * الترتيب هنا هو ترتيب العرض في العارض والتقرير.
 */
export const TRACKED_EVENTS = [
  // — الإعداد (١–٣) —
  'setup_started',
  'setup_step_reached',
  'setup_completed',
  // — المدخل وأول قيمة (٤–٥) —
  'entry_choice_made',
  'first_win_completed',
  // — الإذن والعودة (٦–٧) —
  'notification_permission_decided',
  'next_day_opened',
  // — التغذية (٨–٩) —
  'food_search_no_result',
  'meal_entry_logged',
  // — التمرين (١٠–١٢) —
  'workout_session_started',
  'workout_session_completed',
  'workout_session_abandoned',
  // — الاستبقاء (١٣–١٥) —
  'return_after_missed_day',
  'day7_summary_reached',
  'reminders_screen_opened',
] as const

export type TrackedEventName = (typeof TRACKED_EVENTS)[number]

/**
 * أنواع «أول انتصار» (ADV-13) — إجراء واحد يُنجَز في أقل من دقيقتين.
 * `warmup` و`meal` لوقت النهار · `water` و`dinner` للمساء (الأخفّ).
 */
export type FirstWinKind = 'warmup' | 'meal' | 'water' | 'dinner'

/** أسماء خطوات الإعداد — مطابقة لترتيب `OnboardingV2` (0..4 مدخلات + 5 جاهز). */
export const SETUP_STEP_NAMES = ['body', 'intent', 'history', 'goal', 'training', 'equipment', 'ready'] as const
export type SetupStepName = (typeof SETUP_STEP_NAMES)[number]

/**
 * موضع قطع التمرين — أين كان المستخدم لحظة التخلّي عن الجلسة.
 * ثلاث قيم لا أربع: القطع **قبل** بدء الجلسة غير مرصود أصلًا (لا جلسة تُقطع)،
 * فلا نُعرّف قيمة لا يمكن أن تقع.
 */
export type WorkoutAbandonPoint = 'session' | 'rest' | 'recovered-prompt'

/**
 * خصائص كل حدث — نوع صارم يمنع انحراف الأسماء أو تمرير حقل خارج العقد.
 *
 * **الحقول كلها غير معرِّفة للهوية** عدا `query` أدناه، وهو الاستثناء الوحيد
 * المقصود في الأمر («بحث طعام بلا نتيجة **بنص الاستعلام**»): نصّ يكتبه المستخدم،
 * يبقى محلّيًا، مقصوص إلى `MAX_PROP_STRING`، ويُمسح مع بقية أحداث مالكه.
 * ممنوع تمرير معرّف حساب أو بريد أو اسم أو قيمة قياس صحي في أي حدث.
 */
export interface TrackedEventProps {
  /** ١ — بدء الإعداد: أول عرض لخطوة الأساسيات (مرّة لكل دخول للتدفّق). */
  setup_started: { resumed: boolean }
  /**
   * ٢ — السقوط عند كل خطوة، **باسم الخطوة**.
   *
   * الملتقَط هو **الوصول** إلى الخطوة، وهو الأصل الصادق الذي يُشتقّ منه السقوط:
   * سقوط الخطوة = آخر خطوة وُصلت في جلسة **لم يتبعها** `setup_completed`.
   * لم نسمِّه «dropped» لأننا لا نرصد المغادرة نفسها — أكثر الهجر يقع بإغلاق
   * التطبيق لا بضغطة رجوع، فلا حدث عندها. الاسم يقول ما رُصد فعلًا (§صدق المعروض).
   */
  setup_step_reached: { step: SetupStepName }
  /** ٣ — إكمال الإعداد: بعد بناء الخطة وحفظها بنجاح، لا عند ضغط الزر. */
  setup_completed: Record<string, never>
  /** ٤ — توزيع الشاشة الأولى: أي مسار اختاره القادم الجديد. */
  entry_choice_made: { choice: 'guest' | 'signup' | 'login' }
  /**
   * ٥ — أول انتصار منجز، بنوعه (ADV-13).
   * كان اسمه `first_action_completed` في [CTO-68] حين كان ينتظر سطحه؛ سمّاه
   * [CTO-70] `first_win_completed` عند بناء السطح، والأعلى رقمًا يُنفَّذ (§1.2).
   */
  first_win_completed: { kind: FirstWinKind; partOfDay: 'day' | 'evening' }
  /** ٦ — قرار إذن الإشعارات (قبول/رفض) عند جذره: نداء طلب الإذن نفسه. */
  notification_permission_decided: { decision: 'granted' | 'denied' | 'unsupported' }
  /** ٧ — فتح اليوم التالي: أول فتح في يوم تقويمي بعد يوم استُخدم فيه التطبيق. */
  next_day_opened: { gapDays: number }
  /** ٨ — بحث طعام بلا نتيجة، بنص الاستعلام (مقصوصًا). فجوة مباشرة في قاعدة الطعام. */
  food_search_no_result: { query: string }
  /** ٩ — تسجيل وجبة: بعد إضافة صنف فعليًا ليوم التغذية. */
  meal_entry_logged: { slot: string }
  /** ١٠ — بدء تمرين: لحظة إنشاء الجلسة النشطة. */
  workout_session_started: { exercises: number }
  /** ١١ — إكمال تمرين: بعد **تأكيد** كتابة الجلسة (لا عند ضغط «أنهِ»). */
  workout_session_completed: { exercises: number; sets: number }
  /** ١٢ — قطع تمرين، **بموضع القطع**. */
  workout_session_abandoned: { at: WorkoutAbandonPoint; completedSets: number }
  /** ١٣ — عودة بعد يوم فائت: أول عرض لحالة «العودة بعد انقطاع». */
  return_after_missed_day: { daysAway: number }
  /**
   * ١٤ — الوصول لملخّص اليوم السابع.
   * ⏳ **ينتظر سطحه** — ملخّص اليوم ٧ لم يُبنَ بعد. مُعرَّف هنا ليلتقطه CTO-70.
   */
  day7_summary_reached: { dayIndex: number }
  /** ١٥ — فتح شاشة التذكيرات ذاتيًا: المؤشّر المجاني الموقَّع على نيّة الالتزام. */
  reminders_screen_opened: Record<string, never>
}

/**
 * أحداث **معرَّفة بلا سطح بعد** — لا موضع نداء لها في الكود اليوم عمدًا.
 * الإثبات يتحقّق من الأمرين معًا: أن هذه لا تُنادى، وأن **كل ما عداها يُنادى**.
 * حذف اسم من هنا بلا زرع نداء يُسقط البوابة — فلا يُنسى سطح عند بنائه.
 */
// [CTO-70] وصل السطحين الأخيرين (أول انتصار · ملخّص اليوم ٧) فأُفرِغت القائمة.
// تبقى معرَّفة لا محذوفة: القاعدة ذات الاتجاهين في `test:analytics` تسري عليها
// فارغةً كما تسري ممتلئة، وأي حدث جديد يُضاف بلا سطح يُعلَن هنا لا يُهرَّب.
export const AWAITING_SURFACE: readonly TrackedEventName[] = [] as const

/** هل هذا الحدث ينتظر سطحه (فلا يُتوقَّع له موضع نداء اليوم)؟ */
export function isAwaitingSurface(name: TrackedEventName): boolean {
  return AWAITING_SURFACE.includes(name)
}
