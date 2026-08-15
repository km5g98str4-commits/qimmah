/**
 * بوّابة دور المسؤول — الملف الأمني الوحيد في هذه الحارة.
 * [QIMMAH-SOVEREIGN-PHASE-II-001] · AGENT-E.
 *
 * ═══ القاعدة الواحدة ═══
 *   **«مسجّل دخول» ليس «مسؤولًا».**
 * وجود جلسة يثبت أن أحدًا أثبت هويته، ولا يقول شيئًا عمّا يحقّ له. فالدور
 * **تصريح صريح يصدره الخادم**، والافتراض منعٌ، **و«لا نعرف» تمنع كما يمنع
 * «ليس مسؤولًا»** — لأن الفشل هنا يجب أن يكون آمنًا لا متساهلًا.
 *
 * ═══ التمييز الذي يحمل هذا الملف: `app_metadata` لا `user_metadata` ═══
 * في Supabase يمكن للمستخدم أن يكتب في `user_metadata` الخاصّ به (مسار
 * `updateUser` مفتوح لصاحب الحساب — وهو المسار الذي يُخزَّن فيه `display_name`
 * في `authContext.tsx`). أمّا `app_metadata` فلا يُكتب إلا من الخادم بمفتاح
 * مميّز.
 *
 * فقراءة الدور من `user_metadata` تعني حرفيًّا أن **أي مستخدم يرقّي نفسه
 * مسؤولًا بنداء واحد**. ولذلك هذا الملف:
 *   ١) يقرأ `app_metadata` وحده،
 *   ٢) و**يرفض صراحةً** أي دور مُعلَن في `user_metadata` — لا يتجاهله بصمت
 *      فحسب، بل يعيد سببًا مسمّى (`forged-claim`) يجعل المحاولة **مرئية**.
 * ويحرس السلوكين معًا `test:admin-access-denial` بتأكيد مضادّ (الميثاق §4.2).
 *
 * ═══ وحدّ هذا الملف ═══
 * هذا حارس **واجهة**، وليس سلطة أمنية. السلطة النهائية سياسات RLS في قاعدة
 * البيانات — وهي اليوم تمنع الجميع من كل صفّ ليس لهم (§1 من عقد البيانات).
 * فحتى لو انخدع هذا الملف، لا يعود المتصفّح بصفّ مستخدم آخر. الطبقتان
 * تتعاضدان، ولا تُغني إحداهما عن الأخرى.
 */

/** نتيجة الحسم — دور واحد مسمّى أو منع. لا حالة ثالثة متساهلة. */
export type AdminRole = 'founder' | 'denied'

/** سبب المنع — مسمّى دائمًا، فيسقط الاختبار بالاسم لا بـ`TypeError` عابر. */
export type DenialReason =
  /** لا جلسة إطلاقًا — زائر. */
  | 'no-session'
  /** جلسة صحيحة بلا أي تصريح دور — **الحالة الطبيعية لكل مستخدم عادي**. */
  | 'no-role-claim'
  /** تصريح موجود لكن قيمته ليست دورًا معروفًا. */
  | 'unknown-role'
  /** دور مُعلَن في `user_metadata` — مصدر يكتبه المستخدم نفسه. محاولة انتحال. */
  | 'forged-claim'
  /** لم يُحسم بعد — تمنع كما يمنع الرفض. */
  | 'not-resolved'

export interface AdminRoleDecision {
  readonly role: AdminRole
  readonly reason: DenialReason | null
}

/** **الحالة الابتدائية مغلقة.** لا نبدأ متفائلين ثم نتراجع. */
export const CLOSED_DECISION: AdminRoleDecision = { role: 'denied', reason: 'not-resolved' }

/**
 * أقلّ شكل جلسة يلزم للحسم. مُعرَّف محليًا وبنيويًا (لا `import` من
 * `@supabase/supabase-js`) كي يستطيع الإثبات بناء جلسات ملفّقة بلا شبكة
 * ولا مكتبة — فيُهاجَم الحارس فعلًا بدل أن يُقرأ.
 */
export interface RoleClaimSource {
  readonly app_metadata?: Record<string, unknown> | null
  readonly user_metadata?: Record<string, unknown> | null
}

/** اسم الادّعاء الذي يجب أن يصدره الخادم. */
export const ADMIN_ROLE_CLAIM = 'qimmah_role'

/** القيمة الوحيدة المقبولة. قائمة بيضاء: كل ما عداها `unknown-role`. */
const ACCEPTED_ROLE = 'founder'

function claimOf(bag: Record<string, unknown> | null | undefined): unknown {
  if (!bag || typeof bag !== 'object') return undefined
  return bag[ADMIN_ROLE_CLAIM]
}

/**
 * يحسم الدور من الجلسة.
 *
 * الترتيب مقصود: **يُفحص الانتحال قبل القبول**. فلو حمل مستخدمٌ الادّعاء في
 * `user_metadata` وحده صار الجواب `forged-claim` **لا** `no-role-claim` — أي
 * أن المحاولة تُسمّى بدل أن تُبتلع في «لا يوجد دور».
 */
export function resolveAdminRole(session: RoleClaimSource | null | undefined): AdminRoleDecision {
  if (!session) return { role: 'denied', reason: 'no-session' }

  const appClaim = claimOf(session.app_metadata)
  const userClaim = claimOf(session.user_metadata)

  // ١) مصدر يكتبه المستخدم نفسه لا يمنح شيئًا — ويُسمّى.
  if (userClaim !== undefined && appClaim === undefined) {
    return { role: 'denied', reason: 'forged-claim' }
  }

  // ٢) لا تصريح من الخادم ⇒ مستخدم عادي. **هذا هو المسار الغالب.**
  if (appClaim === undefined || appClaim === null) {
    return { role: 'denied', reason: 'no-role-claim' }
  }

  // ٣) قائمة بيضاء صارمة.
  if (appClaim !== ACCEPTED_ROLE) {
    return { role: 'denied', reason: 'unknown-role' }
  }

  return { role: 'founder', reason: null }
}

/** السؤال الوحيد الذي تسأله الواجهة. لا مسار آخر للسماح. */
export function isAdmin(decision: AdminRoleDecision): boolean {
  return decision.role === 'founder'
}

/**
 * فحص الصلاحية لحقل بعينه.
 *
 * `founder+drilldown` ليست درجة أعلى بل **نيّة معلَنة**: صنف `product` لا
 * يُقرأ إلا في مسار تعمّق صريح. فتمرير `false` في `drilldown` يمنع حقول
 * المنتج حتى للمؤسس — وهو المقصود: **ما لا تعرضه الشاشة لا يُطلب**.
 */
export function canRead(
  decision: AdminRoleDecision,
  required: 'founder' | 'founder+drilldown',
  drilldown = false,
): boolean {
  if (!isAdmin(decision)) return false
  if (required === 'founder+drilldown') return drilldown
  return true
}

/**
 * حالة تصريح الدور في هذا البناء.
 *
 * لا يوجد اليوم في `supabase/migrations/` أي مصدر يصدر `qimmah_role`، ولا دور
 * `admin` في أي سياسة. فالجواب الصادق ثابت: **لم يُزوَّد بعد**. تعرضه اللوحة
 * صراحةً كي لا يظنّ المؤسس أن الحجب عطل.
 */
export function adminRoleProvisioning(): 'not-provisioned' {
  return 'not-provisioned'
}
