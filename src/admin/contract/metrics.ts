/**
 * سجلّ المقاييس — مرآة الكود لجدول §5 من عقد البيانات.
 * [QIMMAH-SOVEREIGN-PHASE-II-001] · AGENT-E.
 *
 * ═══ لماذا سجلّ بيانات لا شرط في كل مكوّن ═══
 * لو حملت كل بطاقة KPI حكمها الخاص («هل هذا متاح؟») لتفرّق الحكم على عشرين
 * ملفًا، ولانحرف أحدها بصمت في أول موجة. فالحكم هنا **مرّة واحدة كبيانات**،
 * والمكوّنات تقرأه ولا تعيد اشتقاقه.
 *
 * وهذا أيضًا ما يجعل الإثبات ممكنًا: `test:admin-dashboard` يقرأ هذا السجلّ
 * ويقارنه بالوثيقة، فأي مقياس يُضاف في الكود بلا بند في الوثيقة — أو بالعكس —
 * يُسقط البوابة **بفحص مسمّى** لا بانحراف يُكتشف بعد شهر.
 *
 * ⚠️ **الثابت الحاكم:** أي مدخل بـ`AVAILABLE_NOW` يجب أن يكون مصدره ملاحظة
 * العميل لنفسه (بناء/علم/إعداد). ما إن يقرأ صفّ مستخدم فهو ليس متاحًا اليوم
 * مهما بدا قريبًا — ويحرس هذا تأكيدٌ مضادّ في الإثبات (الميثاق §4.2).
 */

import type { MetricDefinition } from './types'

/**
 * أسماء الجداول غير الموجودة — تُذكر بوصفها **مطلوبة** لا قائمة.
 * وجودها كثوابت مسمّاة يمنع أن يقرأها قارئ لاحقًا فيظنّها جداول حيّة.
 */
export const MISSING_SOURCE_TABLES = ['entitlements', 'activation_codes', 'activation_redemptions'] as const

export const METRIC_REGISTRY: readonly MetricDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────
  // وضع المنصّة — الكتلة الوحيدة المتاحة اليوم.
  // لا تقرأ صفّ أحد، فلا تعبر أي بوّابة من البوّابات الثلاث.
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'platform.buildLabel',
    labelKey: 'platform.buildLabel',
    group: 'platform',
    source: 'src/lib/buildInfo.ts (BUILD_LABEL)',
    aggregation: 'scalar',
    privacyClass: 'aggregate',
    requiredRole: 'founder',
    refresh: 'on-load',
    owner: 'client',
    availability: 'AVAILABLE_NOW',
    unavailableReasonKey: 'reason.none',
  },
  {
    id: 'platform.syncPipeline',
    labelKey: 'platform.syncPipeline',
    group: 'platform',
    source: 'import.meta.env.VITE_SYNC_ENABLED',
    aggregation: 'scalar',
    privacyClass: 'aggregate',
    requiredRole: 'founder',
    refresh: 'on-load',
    owner: 'client',
    availability: 'AVAILABLE_NOW',
    unavailableReasonKey: 'reason.none',
  },
  {
    id: 'platform.entitlementSource',
    labelKey: 'platform.entitlementSource',
    group: 'platform',
    source: 'src/lib/access/entitlementSource.ts',
    aggregation: 'scalar',
    privacyClass: 'aggregate',
    requiredRole: 'founder',
    refresh: 'on-load',
    owner: 'client',
    availability: 'AVAILABLE_NOW',
    unavailableReasonKey: 'reason.none',
  },
  {
    id: 'platform.backendConfigured',
    labelKey: 'platform.backendConfigured',
    group: 'platform',
    source: 'src/lib/supabaseClient.ts (isSupabaseConfigured)',
    aggregation: 'scalar',
    privacyClass: 'aggregate',
    requiredRole: 'founder',
    refresh: 'on-load',
    owner: 'client',
    availability: 'AVAILABLE_NOW',
    unavailableReasonKey: 'reason.none',
  },

  // ─────────────────────────────────────────────────────────────────────
  // الحسابات — مقامها كامل بحكم مُشغّل `handle_new_user`.
  // أرخص دفعة Backend ذات قيمة حقيقية، والتوصية أن تكون الأولى.
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'users.total',
    labelKey: 'users.total',
    group: 'users',
    source: 'public.profiles → count(*)',
    aggregation: 'count',
    privacyClass: 'aggregate',
    requiredRole: 'founder',
    refresh: '5m',
    owner: 'backend',
    availability: 'NEEDS_BACKEND',
    backendGap: 'endpoint-missing',
    unavailableReasonKey: 'reason.noAdminRead',
  },
  {
    id: 'users.newToday',
    labelKey: 'users.newToday',
    group: 'users',
    source: 'public.profiles.created_at ≥ منتصف ليل الرياض',
    aggregation: 'count',
    privacyClass: 'aggregate',
    requiredRole: 'founder',
    refresh: '5m',
    owner: 'backend',
    availability: 'NEEDS_BACKEND',
    backendGap: 'endpoint-missing',
    unavailableReasonKey: 'reason.noAdminRead',
  },
  {
    id: 'users.new7d',
    labelKey: 'users.new7d',
    group: 'users',
    source: 'public.profiles.created_at ≥ now() - 7d',
    aggregation: 'count',
    privacyClass: 'aggregate',
    requiredRole: 'founder',
    refresh: '5m',
    owner: 'backend',
    availability: 'NEEDS_BACKEND',
    backendGap: 'endpoint-missing',
    unavailableReasonKey: 'reason.noAdminRead',
  },
  {
    id: 'users.new30d',
    labelKey: 'users.new30d',
    group: 'users',
    source: 'public.profiles.created_at ≥ now() - 30d',
    aggregation: 'count',
    privacyClass: 'aggregate',
    requiredRole: 'founder',
    refresh: '5m',
    owner: 'backend',
    availability: 'NEEDS_BACKEND',
    backendGap: 'endpoint-missing',
    unavailableReasonKey: 'reason.noAdminRead',
  },
  {
    id: 'users.verified',
    labelKey: 'users.verified',
    group: 'users',
    source: 'auth.users.email_confirmed_at (يحتاج دالة خادم)',
    aggregation: 'count',
    privacyClass: 'aggregate',
    requiredRole: 'founder',
    refresh: '5m',
    owner: 'backend',
    availability: 'NEEDS_BACKEND',
    backendGap: 'endpoint-missing',
    unavailableReasonKey: 'reason.authSchemaClosed',
  },
  {
    id: 'users.growthSeries',
    labelKey: 'users.growthSeries',
    group: 'users',
    source: 'public.profiles.created_at مجمّعًا يوميًا (٩٠ يومًا)',
    aggregation: 'series',
    privacyClass: 'aggregate',
    requiredRole: 'founder',
    refresh: '1h',
    owner: 'backend',
    availability: 'NEEDS_BACKEND',
    backendGap: 'endpoint-missing',
    unavailableReasonKey: 'reason.noAdminRead',
  },

  // ─────────────────────────────────────────────────────────────────────
  // النشاط — شقّان لا واحد. الخلط بينهما هو الخطأ الشائع في هذه اللوحة.
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'activity.signedIn7d',
    labelKey: 'activity.signedIn7d',
    group: 'activity',
    source: 'auth.users.last_sign_in_at ≥ now() - 7d',
    aggregation: 'count',
    privacyClass: 'aggregate',
    requiredRole: 'founder',
    refresh: '5m',
    owner: 'backend',
    availability: 'NEEDS_BACKEND',
    backendGap: 'endpoint-missing',
    unavailableReasonKey: 'reason.authSchemaClosed',
  },
  {
    id: 'activity.signedIn30d',
    labelKey: 'activity.signedIn30d',
    group: 'activity',
    source: 'auth.users.last_sign_in_at ≥ now() - 30d',
    aggregation: 'count',
    privacyClass: 'aggregate',
    requiredRole: 'founder',
    refresh: '5m',
    owner: 'backend',
    availability: 'NEEDS_BACKEND',
    backendGap: 'endpoint-missing',
    unavailableReasonKey: 'reason.authSchemaClosed',
  },
  {
    id: 'activity.dormant30d',
    labelKey: 'activity.dormant30d',
    group: 'activity',
    source: 'auth.users.last_sign_in_at < now() - 30d',
    aggregation: 'count',
    privacyClass: 'aggregate',
    requiredRole: 'founder',
    refresh: '5m',
    owner: 'backend',
    availability: 'NEEDS_BACKEND',
    backendGap: 'endpoint-missing',
    unavailableReasonKey: 'reason.authSchemaClosed',
  },
  {
    id: 'activity.productActive7d',
    labelKey: 'activity.productActive7d',
    group: 'activity',
    source: 'daily_logs · workout_sessions (متحيّز بالموافقة)',
    aggregation: 'count-distinct',
    privacyClass: 'aggregate',
    requiredRole: 'founder',
    refresh: '1h',
    owner: 'product-decision',
    availability: 'IMPOSSIBLE_WITHOUT_CONSENT_CHANGE',
    unavailableReasonKey: 'reason.consentBias',
  },
  {
    id: 'activity.workoutsCompleted7d',
    labelKey: 'activity.workoutsCompleted7d',
    group: 'activity',
    source: 'workout_sessions.finished_at (متحيّز بالموافقة)',
    aggregation: 'count',
    privacyClass: 'product',
    requiredRole: 'founder',
    refresh: '1h',
    owner: 'product-decision',
    availability: 'IMPOSSIBLE_WITHOUT_CONSENT_CHANGE',
    unavailableReasonKey: 'reason.consentBias',
  },
  {
    id: 'activity.nutritionLogged7d',
    labelKey: 'activity.nutritionLogged7d',
    group: 'activity',
    source: 'nutrition_ledger · daily_logs.data (jsonb · متحيّز بالموافقة)',
    aggregation: 'count',
    privacyClass: 'product',
    requiredRole: 'founder',
    refresh: '1h',
    owner: 'product-decision',
    availability: 'IMPOSSIBLE_WITHOUT_CONSENT_CHANGE',
    unavailableReasonKey: 'reason.consentBias',
  },
  {
    id: 'activity.measurementsLogged30d',
    labelKey: 'activity.measurementsLogged30d',
    group: 'activity',
    source: 'measurement_logs → عدد أحداث لا قيم (متحيّز بالموافقة)',
    aggregation: 'count',
    privacyClass: 'product',
    requiredRole: 'founder',
    refresh: '1h',
    owner: 'product-decision',
    availability: 'IMPOSSIBLE_WITHOUT_CONSENT_CHANGE',
    unavailableReasonKey: 'reason.consentBias',
  },
  {
    id: 'activity.activeSeries',
    labelKey: 'activity.activeSeries',
    group: 'activity',
    source: 'daily_logs مجمّعًا يوميًا (متحيّز بالموافقة)',
    aggregation: 'series',
    privacyClass: 'aggregate',
    requiredRole: 'founder',
    refresh: '1h',
    owner: 'product-decision',
    availability: 'IMPOSSIBLE_WITHOUT_CONSENT_CHANGE',
    unavailableReasonKey: 'reason.consentBias',
  },
  {
    id: 'activity.retentionCohorts',
    labelKey: 'activity.retentionCohorts',
    group: 'activity',
    source: 'مشتق من نشاط المنتج حسب أسبوع التسجيل',
    aggregation: 'series',
    privacyClass: 'aggregate',
    requiredRole: 'founder',
    refresh: '1h',
    owner: 'product-decision',
    availability: 'IMPOSSIBLE_WITHOUT_CONSENT_CHANGE',
    unavailableReasonKey: 'reason.consentBias',
  },

  // ─────────────────────────────────────────────────────────────────────
  // الاستحقاق والتفعيل — **لا جدول ولا صفّ ولا عمود**. `source-system-missing`.
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'entitlement.premiumActive',
    labelKey: 'entitlement.premiumActive',
    group: 'entitlement',
    source: 'entitlements (جدول غير موجود)',
    aggregation: 'count',
    privacyClass: 'account',
    requiredRole: 'founder',
    refresh: '5m',
    owner: 'backend',
    availability: 'NEEDS_BACKEND',
    backendGap: 'source-system-missing',
    unavailableReasonKey: 'reason.noEntitlementSystem',
  },
  {
    id: 'entitlement.trialActive',
    labelKey: 'entitlement.trialActive',
    group: 'entitlement',
    source: 'entitlements (جدول غير موجود)',
    aggregation: 'count',
    privacyClass: 'account',
    requiredRole: 'founder',
    refresh: '5m',
    owner: 'backend',
    availability: 'NEEDS_BACKEND',
    backendGap: 'source-system-missing',
    unavailableReasonKey: 'reason.noEntitlementSystem',
  },
  {
    id: 'entitlement.previewOnly',
    labelKey: 'entitlement.previewOnly',
    group: 'entitlement',
    source: 'مشتق: users.total − المستحقّون',
    aggregation: 'count',
    privacyClass: 'aggregate',
    requiredRole: 'founder',
    refresh: '5m',
    owner: 'backend',
    availability: 'NEEDS_BACKEND',
    backendGap: 'source-system-missing',
    unavailableReasonKey: 'reason.noEntitlementSystem',
  },
  {
    id: 'entitlement.activationRedeemed',
    labelKey: 'entitlement.activationRedeemed',
    group: 'entitlement',
    source: 'activation_redemptions (جدول غير موجود)',
    aggregation: 'count',
    privacyClass: 'account',
    requiredRole: 'founder',
    refresh: '5m',
    owner: 'backend',
    availability: 'NEEDS_BACKEND',
    backendGap: 'source-system-missing',
    unavailableReasonKey: 'reason.noEntitlementSystem',
  },
  {
    id: 'entitlement.activationPending',
    labelKey: 'entitlement.activationPending',
    group: 'entitlement',
    source: 'activation_codes (جدول غير موجود)',
    aggregation: 'count',
    privacyClass: 'aggregate',
    requiredRole: 'founder',
    refresh: '5m',
    owner: 'backend',
    availability: 'NEEDS_BACKEND',
    backendGap: 'source-system-missing',
    unavailableReasonKey: 'reason.noEntitlementSystem',
  },
  {
    id: 'entitlement.activationFailed24h',
    labelKey: 'entitlement.activationFailed24h',
    group: 'entitlement',
    source: 'سجلّ تدقيق مجمّع بالنافذة (غير موجود · بلا كود مُدخَل)',
    aggregation: 'count',
    privacyClass: 'aggregate',
    requiredRole: 'founder',
    refresh: '1m',
    owner: 'backend',
    availability: 'NEEDS_BACKEND',
    backendGap: 'source-system-missing',
    unavailableReasonKey: 'reason.noAuditLog',
  },
  {
    id: 'entitlement.conversionOfAccounts',
    labelKey: 'entitlement.conversionOfAccounts',
    group: 'entitlement',
    source: 'مشتق: premiumActive ÷ users.total',
    aggregation: 'ratio',
    privacyClass: 'aggregate',
    requiredRole: 'founder',
    refresh: '5m',
    owner: 'backend',
    availability: 'NEEDS_BACKEND',
    backendGap: 'source-system-missing',
    unavailableReasonKey: 'reason.noEntitlementSystem',
  },

  // ─────────────────────────────────────────────────────────────────────
  // إكمال التخصيص — المقام كامل والبسط متحيّز. انظر §5.5 من الوثيقة.
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'onboarding.completionRate',
    labelKey: 'onboarding.completionRate',
    group: 'onboarding',
    source: 'profiles.data._meta.completed (بسط متحيّز بالموافقة)',
    aggregation: 'ratio',
    privacyClass: 'aggregate',
    requiredRole: 'founder',
    refresh: '1h',
    owner: 'product-decision',
    availability: 'IMPOSSIBLE_WITHOUT_CONSENT_CHANGE',
    unavailableReasonKey: 'reason.onboardingBias',
  },
  {
    id: 'onboarding.stuckCount',
    labelKey: 'onboarding.stuckCount',
    group: 'onboarding',
    source: 'profiles: created_at < now()-24h بلا لقطة إكمال',
    aggregation: 'count',
    privacyClass: 'aggregate',
    requiredRole: 'founder',
    refresh: '1h',
    owner: 'product-decision',
    availability: 'IMPOSSIBLE_WITHOUT_CONSENT_CHANGE',
    unavailableReasonKey: 'reason.onboardingBias',
  },
] as const

/** بحث بالمعرّف — يعيد `undefined` ولا يخترع تعريفًا افتراضيًا. */
export function findMetric(id: string): MetricDefinition | undefined {
  return METRIC_REGISTRY.find((m) => m.id === id)
}

/** كل المقاييس في مجموعة. */
export function metricsInGroup(group: MetricDefinition['group']): readonly MetricDefinition[] {
  return METRIC_REGISTRY.filter((m) => m.group === group)
}

/**
 * إحصاء الإتاحة — يقرأه الإثبات والوثيقة معًا، فيبقى الرقمان مربوطين
 * ولا ينحرف أحدهما عن الآخر بصمت.
 */
export function availabilityCounts(): Record<string, number> {
  const counts: Record<string, number> = {
    AVAILABLE_NOW: 0,
    NEEDS_BACKEND: 0,
    IMPOSSIBLE_WITHOUT_CONSENT_CHANGE: 0,
  }
  for (const m of METRIC_REGISTRY) counts[m.availability] += 1
  return counts
}
