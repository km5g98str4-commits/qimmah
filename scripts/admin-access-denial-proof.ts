// إثبات المنع — **الفحص الحرج في هذه الحارة**.
// [QIMMAH-SOVEREIGN-PHASE-II-001] · AGENT-E.
//
// السؤال الذي يجيبه: **هل يحصل مستخدم مسجّل دخول تمامًا على شيء؟**
// والجواب المطلوب: لا شيء إطلاقًا. وجود جلسة يثبت هوية، ولا يمنح حقًّا.
//
// يُشغَّل عبر `scripts/run-admin-access-denial-proof.mjs`، الذي يضيف عليه
// **اختبار طفرات**: يُفسد الحارس عمدًا ويتأكّد أن هذه البطارية **تسقط** —
// فبوابة لم تُهاجَم ليست بوابة (الميثاق §4.2).

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  CLOSED_DECISION,
  canRead,
  isAdmin,
  resolveAdminRole,
  adminRoleProvisioning,
  ADMIN_ROLE_CLAIM,
  ROLE_PROVISIONING_MIGRATION,
  type RoleClaimSource,
} from '@/admin/auth/adminRole'

let pass = 0
const check = (label: string, condition: boolean) => {
  if (!condition) throw new Error(`FAIL: ${label}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}

console.log('\nإثبات منع غير المسؤول — المركز التنفيذي')

// ═══ ١) الغياب يمنع ═══
check('لا جلسة ⇒ منع', !isAdmin(resolveAdminRole(null)))
check('لا جلسة ⇒ السبب مسمّى no-session', resolveAdminRole(null).reason === 'no-session')
check('undefined ⇒ منع', !isAdmin(resolveAdminRole(undefined)))
check('الحالة الابتدائية مغلقة', !isAdmin(CLOSED_DECISION) && CLOSED_DECISION.reason === 'not-resolved')

// ═══ ٢) الجوهر: «مسجّل دخول» ليس «مسؤولًا» ═══
// جلسة سليمة تمامًا لمستخدم عادي — بحقول تبدو بريئة وبحقول تبدو مغرية.
const ORDINARY: RoleClaimSource[] = [
  {},
  { app_metadata: {}, user_metadata: {} },
  { app_metadata: { provider: 'email' }, user_metadata: { display_name: 'زياد' } },
  { app_metadata: { providers: ['email'] }, user_metadata: {} },
  { app_metadata: null, user_metadata: null },
]
check(
  `مستخدم مسجّل دخول بلا تصريح دور ⇒ منع (${ORDINARY.length} أشكال جلسة)`,
  ORDINARY.every((s) => !isAdmin(resolveAdminRole(s))),
)
check(
  'سبب منع المستخدم العادي مسمّى no-role-claim',
  ORDINARY.every((s) => resolveAdminRole(s).reason === 'no-role-claim'),
)

// ═══ ٣) محاولات الترقية الذاتية ═══
// كل صفّ هنا مصدر **يكتبه المستخدم نفسه** أو قيمة خارج القائمة البيضاء.
const ESCALATION: { name: string; session: RoleClaimSource }[] = [
  { name: 'الدور في user_metadata وحده', session: { user_metadata: { [ADMIN_ROLE_CLAIM]: 'founder' } } },
  {
    name: 'user_metadata يحمل الدور و app_metadata فارغ',
    session: { app_metadata: {}, user_metadata: { [ADMIN_ROLE_CLAIM]: 'founder' } },
  },
  { name: 'دور غير معروف في app_metadata', session: { app_metadata: { [ADMIN_ROLE_CLAIM]: 'admin' } } },
  { name: 'قيمة صحيحة منطقية بدل السلسلة', session: { app_metadata: { [ADMIN_ROLE_CLAIM]: true } } },
  { name: 'الدور بحروف كبيرة', session: { app_metadata: { [ADMIN_ROLE_CLAIM]: 'FOUNDER' } } },
  { name: 'الدور بمسافة زائدة', session: { app_metadata: { [ADMIN_ROLE_CLAIM]: ' founder' } } },
  { name: 'الدور داخل مصفوفة', session: { app_metadata: { [ADMIN_ROLE_CLAIM]: ['founder'] } } },
  { name: 'اسم ادّعاء آخر', session: { app_metadata: { role: 'founder' } } },
  { name: 'الدور تحت مفتاح متداخل', session: { app_metadata: { claims: { [ADMIN_ROLE_CLAIM]: 'founder' } } } },
]
for (const e of ESCALATION) {
  check(`محاولة ترقية مرفوضة — ${e.name}`, !isAdmin(resolveAdminRole(e.session)))
}

// ولا يكفي المنع: **يُسمّى**. `user_metadata` وحده ⇒ انتحال لا «لا دور».
check(
  'الدور من user_metadata يُسمّى forged-claim لا no-role-claim',
  resolveAdminRole({ user_metadata: { [ADMIN_ROLE_CLAIM]: 'founder' } }).reason === 'forged-claim',
)
check(
  'قيمة غير معروفة في app_metadata تُسمّى unknown-role',
  resolveAdminRole({ app_metadata: { [ADMIN_ROLE_CLAIM]: 'admin' } }).reason === 'unknown-role',
)

// ═══ ٤) المسار الصحيح الوحيد ═══
const GRANTED: RoleClaimSource = { app_metadata: { [ADMIN_ROLE_CLAIM]: 'founder' }, user_metadata: {} }
check('تصريح خادم صحيح ⇒ سماح', isAdmin(resolveAdminRole(GRANTED)))
check('السماح بلا سبب منع', resolveAdminRole(GRANTED).reason === null)

// ولا يفسده وجود انتحال بجانبه: `app_metadata` هو المرجع، و`user_metadata` لا
// يرفع ولا يخفض.
check(
  'تصريح خادم صحيح + انتحال في user_metadata ⇒ يبقى السماح على أساس app_metadata',
  isAdmin(resolveAdminRole({ app_metadata: { [ADMIN_ROLE_CLAIM]: 'founder' }, user_metadata: { [ADMIN_ROLE_CLAIM]: 'x' } })),
)

// ═══ ٥) أقلّ صلاحية داخل السماح ═══
const founder = resolveAdminRole(GRANTED)
check('المؤسس يقرأ حقول الحساب', canRead(founder, 'founder'))
check('حقول المنتج ممنوعة بلا تعمّق صريح', !canRead(founder, 'founder+drilldown', false))
check('حقول المنتج تُقرأ بالتعمّق', canRead(founder, 'founder+drilldown', true))
check('غير المسؤول لا يقرأ شيئًا حتى بالتعمّق', !canRead(resolveAdminRole({}), 'founder+drilldown', true))
check('الحالة المغلقة لا تقرأ شيئًا', !canRead(CLOSED_DECISION, 'founder'))

// ═══ ٦) حالة التزويد معلَنة ═══
// ═══ حالة التزويد **مشتقّة من الجلسة** ═══
// كانت الدالة ثابتًا يعيد `'not-provisioned'` في كل مسار — أي أنها تكذب على
// المؤسس المزوَّد. الفحص الآن يغطّي **كل** الحالات الخمس، فلا يمكن أن تعود
// ثابتًا وتمرّ: قيمة واحدة لا تُرضي خمسة تأكيدات متناقضة.
check('بلا جلسة ⇒ no-session', adminRoleProvisioning(resolveAdminRole(null)) === 'no-session')
check(
  'مسجّل بلا ادّعاء ⇒ claim-absent',
  adminRoleProvisioning(resolveAdminRole({ app_metadata: { provider: 'email' } })) === 'claim-absent',
)
check(
  'ادّعاء مزوّر ⇒ claim-rejected',
  adminRoleProvisioning(resolveAdminRole({ user_metadata: { [ADMIN_ROLE_CLAIM]: 'founder' } })) === 'claim-rejected',
)
check(
  'دور غير معروف ⇒ claim-rejected',
  adminRoleProvisioning(resolveAdminRole({ app_metadata: { [ADMIN_ROLE_CLAIM]: 'admin' } })) === 'claim-rejected',
)
check('القرار المغلق ⇒ unresolved', adminRoleProvisioning(CLOSED_DECISION) === 'unresolved')
check(
  'تصريح خادم صحيح ⇒ claim-present',
  adminRoleProvisioning(resolveAdminRole({ app_metadata: { [ADMIN_ROLE_CLAIM]: 'founder' } })) === 'claim-present',
)
// والهجرة التي **تُصدر** الدور موجودة فعلًا وتعرّف الدالة — لا إشارة إلى ملفّ وهمي.
check('هجرة التزويد موجودة', existsSync(resolve(process.cwd(), 'supabase/migrations', ROLE_PROVISIONING_MIGRATION)))
check(
  'هجرة التزويد تعرّف admin_set_role',
  readFileSync(resolve(process.cwd(), 'supabase/migrations', ROLE_PROVISIONING_MIGRATION), 'utf8').includes(
    'function public.admin_set_role',
  ),
)

// ═══ ٧) تأكيد مضادّ: لا مصدر دور خارج تصريح الخادم ═══
// لو تسرّب مصدر من التخزين أو العنوان لصار المنع قابلًا للالتفاف من المتصفّح.
const forbidden = ['localStorage', 'sessionStorage', 'location', 'document.cookie', 'URLSearchParams']
// النصّ يُقرأ في المُشغّل `.mjs`؛ هنا نتأكّد من السلوك: لا شيء في البيئة يغيّر الجواب.
;(globalThis as unknown as { localStorage?: unknown }).localStorage = {
  getItem: () => 'founder',
}
check(
  `تلويث البيئة لا يمنح دورًا (${forbidden.length} مصادر محظورة)`,
  !isAdmin(resolveAdminRole({})) && !isAdmin(resolveAdminRole(null)),
)

console.log(`\n✅ ${pass} فحصًا — لا شيء يُمنح بلا تصريح خادم صريح\n`)
