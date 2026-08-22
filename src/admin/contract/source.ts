/**
 * حدّ مصدر البيانات — **الطريق الإنتاجي الوحيد** إلى أرقام اللوحة.
 * [QIMMAH-SOVEREIGN-PHASE-II-001] · AGENT-E.
 *
 * ═══ الحالة المعلَنة: `EXTERNALLY_BLOCKED` ═══
 * لا يوجد اليوم مسار قراءة مُصرَّح واحد يعيد صفّ مستخدم آخر:
 *   • سياسات RLS كلها `(select auth.uid()) = user_id` بلا استثناء إداري،
 *   • ولا دور `qimmah_role` يُصدره أي شيء في `supabase/migrations/`،
 *   • ولا جدول استحقاق أو تفعيل من الأساس.
 * فهذا الملف **لا يتصل بشيء**، ولا يحاول، ولا يفشل بصمت. يعيد الغياب
 * **بدرجته الصحيحة** من سجلّ المقاييس، وينتهي.
 *
 * ═══ ولماذا لا يحاول أصلًا ═══
 * نداءٌ بمفتاح `anon` على `profiles` **ينجح** ويعيد **مصفوفة فارغة** (سياسة
 * المالك لا تطابق شيئًا). فمحاولة «التجربة ثم الرجوع للغياب» تنتج **صفرًا
 * يبدو مقيسًا**: `total = 0` لا يميّزه أحد عن «لا مستخدمين». وذلك بالضبط
 * الكذب الذي يمنعه عقد البيانات §7.
 * فالامتناع هنا **قرار صدق لا كسل**، والصفر الوحيد المسموح هو الصفر الذي
 * يعيده خادم مُصرَّح له أن يعدّ.
 *
 * ═══ عند وصول الخادم ═══
 * يُستبدل جسم `loadExecutiveSnapshot` وحده. الأنواع وحالات اللاإتاحة والواجهة
 * كلها جاهزة، ولا يتغيّر مستدعٍ واحد.
 */

import { BUILD_LABEL } from '@/lib/buildInfo'
import { isSupabaseConfigured } from '@/lib/supabaseClient'
import { METRIC_REGISTRY } from './metrics'
import type {
  ActivitySnapshot,
  CommerceSnapshot,
  EntitlementSnapshot,
  ErrorsSnapshot,
  ExecutiveSnapshot,
  MetricAvailability,
  MetricValue,
  OnboardingSnapshot,
  PlatformPosture,
  UsersSnapshot,
} from './types'
import { unavailable } from './types'

/**
 * ⚠️ **حدّ هذا الملف بعد [OVERNIGHT-ADMIN]:** بقي هو **بانِي لقطة الغياب**،
 * وصار فوقه `liveSource.ts` يحاول القراءة الحقيقية عبر
 * `founder_executive_snapshot()`. و`WIRING_STATE` أدناه ما زال صادقًا اليوم:
 * الهجرتان اللتان تُنشئان الدور والدالة **لم تُطبَّقا على أي قاعدة**
 * (APPLY_PENDING)، فلا مسار قراءة مُصرَّح قائم — والحجب من **خارج** المستودع
 * بالضبط كما يقول الاسم. يُقلَب إلى `'LIVE'` في الموجة التي تلي التطبيق، ويحرس
 * الربط `test:admin-db`.
 */

/** حالة التوصيل الحيّ — معلَنة في النوع كي تُقرأ في الواجهة والتقارير. */
export type WiringState = 'EXTERNALLY_BLOCKED' | 'LIVE'

export const WIRING_STATE: WiringState = 'EXTERNALLY_BLOCKED'

/**
 * درجة الغياب لمقياس بعينه — **تُقرأ من السجلّ لا تُخمَّن**.
 * فلو تغيّرت درجة مقياس في الوثيقة والسجلّ، تبعتها الواجهة تلقائيًا.
 */
function gapOf<T>(id: string): MetricValue<T> {
  const def = METRIC_REGISTRY.find((m) => m.id === id)
  // مقياس غير معلَن في السجلّ: أشدّ الدرجات. الافتراض منع لا تساهل.
  if (!def) return unavailable<T>('NEEDS_BACKEND')
  return unavailable<T>(def.availability as MetricAvailability)
}

/**
 * وضع المنصّة — **الكتلة الوحيدة الحقيقية**. كل قيمة هنا ملاحظة العميل لنفسه:
 * لا تقرأ صفّ أحد، فلا تعبر أي بوّابة، ولا تحتاج دورًا في قاعدة البيانات.
 */
export function readPlatformPosture(): PlatformPosture {
  const configured = isSupabaseConfigured()
  return {
    buildLabel: BUILD_LABEL,
    syncPipeline: import.meta.env.VITE_SYNC_ENABLED === 'true' ? 'enabled' : 'disabled',
    /*
      ═══ الشريحة التي لم تكن تستطيع أن تخضرّ ═══
      كان السطر: `VITE_ENTITLEMENT_MODE === 'mock' ? 'mock' : 'none'` — أي أن
      `'backend'` قيمةٌ **مُعلَنة في النوع ولا يُصدرها أحد**، وشرط «سليم» في
      `AdminShell` يطلبها. فالشريحة كهرمانية أبدًا مهما وصل الخادم.

      والقراءة الآن تطابق `resolveEntitlement()` حرفًا بحرف: وضع التقليد يسبق
      كل شيء (قرار وقت بناء) · ثم `backendAvailable()` وهي `isSupabaseConfigured()`
      نفسها · وغيابها يُسمّى `backend-unconfigured` **لا `none`**: عطل إعداد
      يُصلَح بمتغيّر بيئة، لا غياب معماري.

      ⚠️ **وحدّ هذه القراءة معلَن:** «مضبوط» ≠ «الهجرات مطبَّقة». تُثبت هذه
      القيمة أن للعميل طريقًا إلى الخادم، ولا تُثبت أن الدوال موجودة عليه —
      وذلك ما يقوله شريط `data-live-state` وحده.
    */
    entitlementSource: import.meta.env.VITE_ENTITLEMENT_MODE === 'mock'
      ? 'mock'
      : configured
        ? 'backend'
        : 'backend-unconfigured',
    backendConfigured: configured,
    asOf: new Date().toISOString(),
  }
}

function usersGap(): UsersSnapshot {
  return {
    total: gapOf('users.total'),
    newToday: gapOf('users.newToday'),
    new7d: gapOf('users.new7d'),
    new30d: gapOf('users.new30d'),
    verified: gapOf('users.verified'),
    growthSeries: gapOf('users.growthSeries'),
  }
}

function activityGap(): ActivitySnapshot {
  return {
    signedIn7d: gapOf('activity.signedIn7d'),
    signedIn30d: gapOf('activity.signedIn30d'),
    dormant30d: gapOf('activity.dormant30d'),
    productActive7d: gapOf('activity.productActive7d'),
    workoutsCompleted7d: gapOf('activity.workoutsCompleted7d'),
    nutritionLogged7d: gapOf('activity.nutritionLogged7d'),
    measurementsLogged30d: gapOf('activity.measurementsLogged30d'),
    activeSeries: gapOf('activity.activeSeries'),
  }
}

function entitlementGap(): EntitlementSnapshot {
  return {
    premiumActive: gapOf('entitlement.premiumActive'),
    trialActive: gapOf('entitlement.trialActive'),
    trialExpired: gapOf('entitlement.trialExpired'),
    previewOnly: gapOf('entitlement.previewOnly'),
    activationRedeemed: gapOf('entitlement.activationRedeemed'),
    activationPending: gapOf('entitlement.activationPending'),
    activationFailed24h: gapOf('entitlement.activationFailed24h'),
    conversionOfAccounts: gapOf('entitlement.conversionOfAccounts'),
    activationFunnel: [
      { id: 'issued', labelKey: 'funnel.issued', count: gapOf('entitlement.activationPending') },
      { id: 'redeemed', labelKey: 'funnel.redeemed', count: gapOf('entitlement.activationRedeemed') },
      { id: 'active', labelKey: 'funnel.active', count: gapOf('entitlement.premiumActive') },
    ],
  }
}

/**
 * كتلة التجارة غائبة بدرجتها. `redemptionFailures24h` أشدّها: لا مصدر أصلًا،
 * فلا يرفعها تطبيق الهجرة.
 */
function commerceGap(): CommerceSnapshot {
  return {
    ordersSeen: gapOf('commerce.ordersSeen'),
    ordersPaid: gapOf('commerce.ordersPaid'),
    ordersFailed: gapOf('commerce.ordersFailed'),
    codesIssued: gapOf('commerce.codesIssued'),
    codesRedeemed: gapOf('commerce.codesRedeemed'),
    codesUnused: gapOf('commerce.codesUnused'),
    redemptionFailures24h: gapOf('commerce.redemptionFailures24h'),
    revokedActive: gapOf('commerce.revokedActive'),
  }
}

/** الأخطاء — بلا مسار، فالكتلة غائبة بالكامل ولا تُحذف من الشاشة. */
function errorsGap(): ErrorsSnapshot {
  return {
    clientErrors24h: gapOf('errors.clientErrors24h'),
    rpcFailures24h: gapOf('errors.rpcFailures24h'),
  }
}

function onboardingGap(): OnboardingSnapshot {
  return {
    completionRate: gapOf('onboarding.completionRate'),
    stuckCount: gapOf('onboarding.stuckCount'),
    funnel: [
      { id: 'signed_up', labelKey: 'funnel.signedUp', count: gapOf('users.total') },
      { id: 'started', labelKey: 'funnel.started', count: gapOf('onboarding.completionRate') },
      { id: 'completed', labelKey: 'funnel.completed', count: gapOf('onboarding.completionRate') },
    ],
  }
}

/**
 * يحمّل لقطة اللوحة.
 *
 * `async` رغم أنه لا ينتظر شيئًا اليوم: التوقيع هو العقد مع الواجهة، وتغييره
 * لاحقًا كان سيعني تعديل كل مستدعٍ. **وطابور الاهتمام لا يُبنى هنا** — يُشتقّ
 * في `model/attention.ts` من هذه اللقطة نفسها، فيبقى للاشتقاق مصدر واحد.
 */
export async function loadExecutiveSnapshot(): Promise<ExecutiveSnapshot> {
  return {
    platform: readPlatformPosture(),
    users: usersGap(),
    activity: activityGap(),
    entitlement: entitlementGap(),
    commerce: commerceGap(),
    errors: errorsGap(),
    onboarding: onboardingGap(),
    attention: [],
    users_page: gapOf('users.total'),
  }
}
