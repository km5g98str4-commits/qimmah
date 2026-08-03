// السجل المركزي لمفاتيح البيانات — مصدر الحقيقة الوحيد لتصنيف كل مفتاح localStorage.
//
// القاعدة (موجة سلامة البيانات):
//   • kind='user'  ⇒ بيانات صحة/تدريب/تغذية/تقدّم — يجب أن تكون منسوبة لمستخدم.
//   • kind='device'⇒ تفضيل/كاش على مستوى الجهاز — لا يُنسخ لكل مستخدم.
//   • scoped       ⇒ هل المفتاح موسوم بالمالك في بنيته اليوم؟
//   • النسبة اليوم تتم عبر ختم الملكية (dataOwnership.ts) + العزل عند التبديل؛
//     خطة الهجرة لكل مفتاح (migration) تحدّد مسار التوسيم البنيوي التالي.
//
// أي مفتاح جديد يجب تسجيله هنا — قائمة السماح في accountScope تُشتق من هذا السجل.

export type KeyKind = 'user' | 'device'
export type MigrationPlan =
  | 'owner-suffix' // يُنقل إلى `<key>:u:<uid>` في موجة نقل المفاتيح (بعد تحديث registry النقل)
  | 'already-scoped' // موسوم بالمالك اليوم
  | 'keep-global' // تفضيل جهاز يبقى عامًا
  | 'retire' // legacy يُحذف بعد هجرة مثبتة

export interface DataKeyDef {
  /** المفتاح الأساسي (بلا لاحقة مالك). */
  key: string
  kind: KeyKind
  /** موسوم بالمالك بنيويًا اليوم (لاحقة uid/guest). */
  scoped: boolean
  /** يدخل في التصدير/الاستيراد (portability registry). */
  exported: boolean
  /** يدخل في مزامنة السحابة (مباشرة أو ضمن daily_logs). */
  synced: boolean
  /** الوحدة المالكة للقراءة/الكتابة. */
  owner: string
  migration: MigrationPlan
  note?: string
}

export const DATA_KEYS: readonly DataKeyDef[] = [
  // ── بيانات مستخدم (صحة/تدريب/تغذية/تقدّم) — عالمية اليوم، خطة: owner-suffix ──
  { key: 'qimmah:history:workoutSessions:v1', kind: 'user', scoped: false, exported: true, synced: true, owner: 'historyStore', migration: 'owner-suffix' },
  { key: 'qimmah:history:exerciseHistory:v1', kind: 'user', scoped: false, exported: true, synced: true, owner: 'historyStore', migration: 'owner-suffix' },
  { key: 'qimmah:history:dailyLogs:v1', kind: 'user', scoped: false, exported: true, synced: true, owner: 'historyStore', migration: 'owner-suffix' },
  { key: 'qimmah:history:measurementLogs:v1', kind: 'user', scoped: false, exported: true, synced: true, owner: 'historyStore', migration: 'owner-suffix' },
  { key: 'qimmah:history:nutritionLogs:v1', kind: 'user', scoped: false, exported: true, synced: true, owner: 'historyStore', migration: 'owner-suffix', note: 'ضمن daily_logs' },
  { key: 'qimmah:history:waterLogs:v1', kind: 'user', scoped: false, exported: true, synced: true, owner: 'historyStore', migration: 'owner-suffix', note: 'ضمن daily_logs' },
  { key: 'qimmah:history:supplementLogs:v1', kind: 'user', scoped: false, exported: true, synced: true, owner: 'historyStore', migration: 'owner-suffix', note: 'ضمن daily_logs' },
  { key: 'qimmah:history:medicationLogs:v1', kind: 'user', scoped: false, exported: true, synced: true, owner: 'historyStore', migration: 'owner-suffix', note: 'ضمن daily_logs' },
  { key: 'qimmah:customization:v1', kind: 'user', scoped: false, exported: true, synced: true, owner: 'customization', migration: 'owner-suffix', note: 'شريحة إعدادات الحساب فقط تُزامَن (P12 — profiles.data.settings)؛ حقول الجهاز/العلامة تبقى محلية' },
  { key: 'qimmah:nutrition:v2', kind: 'user', scoped: false, exported: true, synced: false, owner: 'nutritionV2Model', migration: 'owner-suffix', note: 'أصناف اليوم فقط' },
  { key: 'qimmah:steps:v1', kind: 'user', scoped: false, exported: true, synced: true, owner: 'stepCounter', migration: 'owner-suffix' },
  { key: 'qimmah:stepSource:v1', kind: 'user', scoped: false, exported: true, synced: false, owner: 'stepCounter', migration: 'owner-suffix' },
  { key: 'qimmah:stepGoal:v1', kind: 'user', scoped: false, exported: true, synced: false, owner: 'stepCounter', migration: 'owner-suffix' },
  { key: 'qimmah:wellnessToday:v1', kind: 'user', scoped: false, exported: true, synced: false, owner: 'wellnessTracking', migration: 'owner-suffix' },
  { key: 'qimmah:commitmentsToday:v1', kind: 'user', scoped: false, exported: true, synced: false, owner: 'commitmentTracking', migration: 'owner-suffix' },
  { key: 'qimmah:today:v1', kind: 'user', scoped: false, exported: true, synced: false, owner: 'today', migration: 'owner-suffix' },
  { key: 'qimmah:onboarding:profile:v1', kind: 'user', scoped: false, exported: true, synced: true, owner: 'onboardingProfile', migration: 'owner-suffix', note: 'ضمن profiles' },
  { key: 'qimmah:onboarding:v1', kind: 'user', scoped: false, exported: true, synced: false, owner: 'onboarding', migration: 'owner-suffix' },
  { key: 'qimmah:achievements:v1', kind: 'user', scoped: false, exported: true, synced: true, owner: 'achievements/engine', migration: 'owner-suffix' },
  { key: 'qimmah:healthkit:v1', kind: 'user', scoped: false, exported: false, synced: false, owner: 'healthKit', migration: 'owner-suffix', note: 'حالة ربط لكل مقياس' },
  // P14: مفتاحا طبقة الصحة الواسعة (P9) لم يكونا مسجّلين — تسجيلهما يدخلهما في
  // بوابة التبنّي/الحجر ويجعل الهجرة القادمة تراهما. لا يُصدَّران ولا يُزامَنان:
  // العيّنات المستوردة من صحة Apple تبقى على الجهاز وحده (خصوصية App Review 27.3).
  { key: 'qimmah:health:samples:v1', kind: 'user', scoped: false, exported: false, synced: false, owner: 'health/store', migration: 'owner-suffix', note: 'عيّنات HealthKit المستوردة + مراسي الاستعلام (P9) — محلية فقط، لا تُرفع ولا تُصدَّر' },
  { key: 'qimmah:health:connection:v1', kind: 'user', scoped: false, exported: false, synced: false, owner: 'health/connect', migration: 'owner-suffix', note: 'حالة الطلب المجمّع/التفعيل/آخر مزامنة لكل مقياس (P9)' },
  { key: 'qimmah:handedness', kind: 'user', scoped: false, exported: false, synced: false, owner: 'handedness', migration: 'owner-suffix', note: 'تفضيل حساب (وضع اليد)' },
  { key: 'qimmah:reminders:v1', kind: 'user', scoped: false, exported: true, synced: false, owner: 'reminderPrefs', migration: 'owner-suffix' },
  { key: 'qimmah:workoutCalendar:v1', kind: 'user', scoped: false, exported: true, synced: true, owner: 'workoutCalendar', migration: 'owner-suffix', note: 'الجدول الأسبوعي (يوم أسبوع → يوم خطة/راحة) + تجاوزات اليوم الفائت — يُزامَن (P12: workout_schedule، شاهد قبر عند المسح)' },

  // ── بيانات مستخدم موسومة بالمالك اليوم ──
  { key: 'qimmah:active-workout:v2', kind: 'user', scoped: true, exported: true, synced: false, owner: 'WorkoutV2', migration: 'already-scoped' },
  { key: 'qimmah:recovery-log:v1', kind: 'user', scoped: true, exported: true, synced: false, owner: 'recovery', migration: 'already-scoped', note: 'ترشيح مزامنة لاحقًا' },
  { key: 'qimmah:recovery-log:v2', kind: 'user', scoped: true, exported: false, synced: true, owner: 'recoveryEngine', migration: 'already-scoped', note: 'سجلّ محرّك التعافي v2 (P11) — يُزامَن (P12: recovery_logs؛ عيّنات الصحة الخام لا تُرفع)؛ غير مُصدَّر بعد' },
  { key: 'qimmah:workout-summary:v2', kind: 'user', scoped: true, exported: true, synced: false, owner: 'workoutSummary', migration: 'already-scoped' },
  { key: 'qimmah:todo:v1', kind: 'user', scoped: true, exported: true, synced: true, owner: 'features/todo', migration: 'already-scoped' },
  { key: 'qimmah:plates:v1', kind: 'user', scoped: true, exported: true, synced: false, owner: 'strength/plates', migration: 'already-scoped' },
  { key: 'qimmah:warmup-pref:v1', kind: 'user', scoped: true, exported: true, synced: false, owner: 'strength/warmup', migration: 'already-scoped' },
  { key: 'qimmah:coach:lessons:v1', kind: 'user', scoped: true, exported: true, synced: false, owner: 'coaching', migration: 'already-scoped' },
  { key: 'qimmah:notifications:v1', kind: 'user', scoped: true, exported: true, synced: false, owner: 'notifications/prefs', migration: 'already-scoped' },
  // P14: أثر إشعار نهاية الراحة المعلّق — طابع زمني واحد (endsAt) لا بيانات تمرين.
  // موسوم بالمالك، ولا يُصدَّر ولا يُزامَن؛ يُمسح عند الإلغاء وعند مصالحة الإقلاع البارد.
  { key: 'qimmah:restEndPending:v1', kind: 'user', scoped: true, exported: false, synced: false, owner: 'notifications/restEnd', migration: 'already-scoped', note: 'endsAt لإشعار الراحة المجدول — يتيح تنظيف الإشعار البائت عند الإقلاع البارد' },
  { key: 'qimmah:customPlan:v1', kind: 'user', scoped: true, exported: true, synced: true, owner: 'features/customPlan', migration: 'already-scoped' },
  { key: 'qimmah:planTemplates:v1', kind: 'user', scoped: true, exported: true, synced: true, owner: 'features/customPlan/builder', migration: 'already-scoped', note: 'قوالب جداول مسمّاة لكل مالك (P6) — تُزامَن (P12: plan_templates، شاهد قبر للحذف)' },
  { key: 'qimmah:nutritionHistory:v1', kind: 'user', scoped: true, exported: true, synced: true, owner: 'nutritionHistory', migration: 'already-scoped', note: 'دفتر تغذية مؤرَّخ لكل مالك (P7) — يُزامَن (P12: nutrition_ledger صف لكل يوم، شاهد قبر لمسح اليوم)؛ المجاميع تبقى عبر daily_logs' },
  { key: 'qimmah:personalFoods:v1', kind: 'user', scoped: true, exported: true, synced: false, owner: 'nutritionHistory', migration: 'already-scoped', note: 'أطعمة شخصية يدوية لكل مالك (P7)' },
  { key: 'qimmah:workoutHydration:v1', kind: 'user', scoped: false, exported: false, synced: false, owner: 'workoutHydration', migration: 'owner-suffix', note: 'تفضيل ترطيب' },
  { key: 'qimmah:syncQueue:v1', kind: 'user', scoped: true, exported: false, synced: false, owner: 'syncQueue', migration: 'already-scoped' },
  { key: 'qimmah:syncBackup:v1', kind: 'user', scoped: true, exported: false, synced: false, owner: 'syncQueue', migration: 'already-scoped' },
  { key: 'qimmah:sync:meta:v1', kind: 'user', scoped: true, exported: false, synced: false, owner: 'syncService', migration: 'already-scoped' },
  { key: 'qimmah:portability:undoBackup:v1', kind: 'user', scoped: true, exported: false, synced: false, owner: 'portability', migration: 'already-scoped' },
  // [CTO-68] أحداث الاستخدام المحلية — مخزن دوّار (١٠٠٠ حدث) موسوم بالمالك.
  // `kind: 'user'` عمدًا لا `device`: يحمل نصّ بحث المستخدم ويجب أن يُمسح مع بياناته
  // عند التبديل/الخروج/الحذف (خارج قائمة السماح العامّة في accountScope).
  // `synced: false` قاطع — لا وجهة سحابية لهذه الأحداث بأي حال.
  { key: 'qimmah:tracking:events:v1', kind: 'user', scoped: true, exported: true, synced: false, owner: 'tracking/store', migration: 'already-scoped', note: 'أحداث محلية فقط — صفر endpoint؛ تُصدَّر يدويًا لتحليل الميدان ولا تُزامَن' },

  // ── legacy تُحذف بعد هجرة مثبتة ──
  { key: 'qimmah:workoutSessions:v1', kind: 'user', scoped: false, exported: false, synced: false, owner: 'historyStore(legacy)', migration: 'retire' },
  { key: 'qimmah:exerciseHistory:v1', kind: 'user', scoped: false, exported: false, synced: false, owner: 'historyStore(legacy)', migration: 'retire' },
  { key: 'qimmah:measurementLogs:v1', kind: 'user', scoped: false, exported: false, synced: false, owner: 'historyStore(legacy)', migration: 'retire' },
  { key: 'qimmah:nutritionToday:v1', kind: 'user', scoped: false, exported: false, synced: false, owner: 'nutritionTracking(legacy)', migration: 'retire' },
  { key: 'qimmah:activeSession:v1', kind: 'user', scoped: true, exported: true, synced: false, owner: 'activeSession(dead)', migration: 'retire' },

  // ── إعدادات جهاز تبقى عامة ──
  { key: 'qimmah:prefs:v1', kind: 'device', scoped: false, exported: false, synced: false, owner: 'appPreferences', migration: 'keep-global', note: 'لغة/ثيم/هابتكس' },
  { key: 'qimmah:uiMode:v1', kind: 'device', scoped: false, exported: false, synced: false, owner: 'uiMode', migration: 'keep-global' },
  { key: 'qimmah:off:cache:v1', kind: 'device', scoped: false, exported: false, synced: false, owner: 'openFoodFacts', migration: 'keep-global' },
  { key: 'qimmah:products:v1', kind: 'device', scoped: false, exported: false, synced: false, owner: 'products', migration: 'keep-global' },
  { key: 'qimmah:products:audit:v1', kind: 'device', scoped: false, exported: false, synced: false, owner: 'products', migration: 'keep-global' },
  { key: 'qimmah:products:saudi-seed-done:v1', kind: 'device', scoped: false, exported: false, synced: false, owner: 'products', migration: 'keep-global' },
  { key: 'qimmah:installPromptDismissed:v1', kind: 'device', scoped: false, exported: false, synced: false, owner: 'installState', migration: 'keep-global' },
  { key: 'qimmah:install-banner:dismissed', kind: 'device', scoped: false, exported: false, synced: false, owner: 'InstallBanner', migration: 'keep-global' },
  { key: 'qimmah:history:migrated:v1', kind: 'device', scoped: false, exported: false, synced: false, owner: 'historyStore', migration: 'keep-global' },
  { key: 'qimmah:onboarding:accounts:v1', kind: 'device', scoped: false, exported: false, synced: false, owner: 'onboarding', migration: 'keep-global', note: 'سجل حسابات الجهاز' },
  { key: 'qimmah:supabase-auth:v1', kind: 'device', scoped: false, exported: false, synced: false, owner: 'supabaseClient', migration: 'keep-global', note: 'رمز الجلسة — لا يُصدَّر أبدًا' },
  { key: 'qimmah:lastUser:v1', kind: 'device', scoped: false, exported: false, synced: false, owner: 'accountScope', migration: 'keep-global' },
  { key: 'qimmah:design-preview', kind: 'device', scoped: false, exported: false, synced: false, owner: 'dev', migration: 'keep-global' },
] as const

/** مفاتيح بيانات المستخدم العالمية (غير الموسومة) — هدف الحجر/التبنّي والهجرة القادمة. */
export function unscopedUserKeys(): string[] {
  return DATA_KEYS.filter((d) => d.kind === 'user' && !d.scoped && d.migration !== 'retire').map((d) => d.key)
}

/** المفاتيح legacy المرشّحة للإحالة بعد الهجرة المثبتة. */
export function retiredKeys(): string[] {
  return DATA_KEYS.filter((d) => d.migration === 'retire').map((d) => d.key)
}
