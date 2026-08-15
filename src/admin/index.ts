/**
 * نقطة الدخول الوحيدة لوحدة المركز التنفيذي.
 * [QIMMAH-SOVEREIGN-PHASE-II-001] · AGENT-E.
 *
 * الوحدة **مستقلّة بذاتها**: لا تلمس `App.tsx` ولا `appRoutes.ts` ولا أي قاموس
 * مشترك. خطوة الوصل موثّقة في
 * `docs/execution/qimmah-postweb/admin/DEPENDENCIES.md` وتُنفَّذ حين يهبط الرأس
 * النهائي لسباق الويب السيادي.
 *
 * ⚠️ **التجهيزات (`contract/fixtures`) غير مُصدَّرة من هنا عمدًا.** إخراجها من
 * الباب الرئيسي يجعل استيرادها في مسار إنتاجي **سهلًا وغير ملحوظ**؛ ومن يحتاجها
 * (إثبات أو لوحة معاينة) يستوردها بمسارها الكامل، فيبقى الاستعمال ظاهرًا في
 * سطر الاستيراد نفسه.
 */

export { AdminShell } from './ui/AdminShell'
export { AdminDenied } from './ui/AdminDenied'
export { UserTable } from './ui/UserTable'
export { UserDetailPanel } from './ui/UserDetail'
export { AttentionPanel } from './ui/AttentionPanel'
export { MetricCard, AvailabilityChip } from './ui/MetricCard'
export { TrendChart, FunnelChart } from './ui/Charts'

export { resolveAdminRole, isAdmin, canRead, adminRoleProvisioning, CLOSED_DECISION, ADMIN_ROLE_CLAIM } from './auth/adminRole'
export type { AdminRole, AdminRoleDecision, DenialReason, RoleClaimSource } from './auth/adminRole'

export { loadExecutiveSnapshot, readPlatformPosture, WIRING_STATE } from './contract/source'
export type { WiringState } from './contract/source'

export { METRIC_REGISTRY, findMetric, metricsInGroup, availabilityCounts } from './contract/metrics'
export { buildAttentionQueue, detectedCount, blindCount } from './model/attention'
export { runQuery, USER_FILTERS, isFilterApplicable, virtualWindow, DEFAULT_QUERY } from './model/filters'

export * from './contract/types'
