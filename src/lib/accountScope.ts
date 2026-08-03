// عزل بيانات الحساب على الجهاز — الضمان القابل للإثبات لعدم تسرّب بيانات مستخدم لآخر.
//
// المشكلة (#4 الحرجة): معظم بيانات المستخدم تُخزَّن تحت مفاتيح localStorage عامّة
// (مشتركة بين كل الحسابات على الجهاز)، وتسجيل الخروج/حذف الحساب لا يمسحها بإثبات.
// هذا خطر خصوصية ويعطّل المزامنة الآمنة.
//
// المبدأ هنا: **قائمة سماح (allowlist)** لا قائمة حظر. كل مفتاح `qimmah:*` يُعتبر
// بيانات مستخدم ويُمسح، إلا ما كان في قائمة السماح العامّة الصريحة (اللغة، تفضيلات
// الجهاز، الكاش المجهول، رمز الجلسة الحالي…). هذا يعكس خلل resetQimmah القديم
// (قائمة تضمين ثابتة كانت تُغفل مفاتيح): أي مفتاح جديد يُمسح افتراضيًا، فلا تتسرّب
// بيانات مستخدم عبر مفتاح نُسي.

import { clearSyncArtifacts } from './syncQueue'
import { markAdoptionPendingIfUnowned, stampDataOwner } from './dataOwnership'

const PREFIX = 'qimmah:'

/** المفتاح الذي يتتبّع آخر حساب رأيناه (لكشف تبديل الحساب). عامّ آمن — يبقى. */
const LAST_USER_KEY = 'qimmah:lastUser:v1'

/**
 * قائمة السماح العامّة — مفاتيح تبقى عبر مسح بيانات المستخدم لأنها:
 * تفضيل جهاز (لغة/واجهة)، أو علم واجهة، أو كاش/عدّاد مجهول غير مرتبط بالهوية،
 * أو رمز الجلسة الحالي (مسحه يُخرج المستخدم الجديد فورًا وسط التبديل).
 * أي مفتاح `qimmah:*` غير مذكور هنا = بيانات مستخدم تُمسح.
 */
const GLOBAL_SAFE_KEYS: ReadonlySet<string> = new Set([
  'qimmah:prefs:v1', // اللغة — يجب أن تبقى (متطلّب صريح)
  'qimmah:uiMode:v1', // كثافة الواجهة (بسيط/متقدّم) — تفضيل جهاز
  'qimmah:design-preview', // علم معاينة v2 (تطوير فقط)
  'qimmah:installPromptDismissed:v1', // علم واجهة (تثبيت PWA)
  'qimmah:install-banner:dismissed', // علم واجهة
  'qimmah:off:cache:v1', // كاش Open Food Facts المجهول (بيانات عامّة قابلة لإعادة الجلب)
  'qimmah:products:v1', // كتالوج منتجات على مستوى الجهاز
  'qimmah:products:audit:v1', // سجلّ تدقيق المنتجات على مستوى الجهاز
  'qimmah:products:saudi-seed-done:v1', // علم اكتمال البذرة
  'qimmah:history:migrated:v1', // علم هجرة (بيان محاسبي على مستوى الجهاز)
  'qimmah:migrations:v1', // سجل هجرات dataOwnership (محاسبة جهاز — لا بيانات مستخدم)
  'qimmah:onboarding:accounts:v1', // سجلّ الحسابات التي أكملت الإعداد (يُبقى فلا يُعاد الإعداد عند عودة نفس الحساب)
  'qimmah:supabase-auth:v1', // رمز الجلسة الحالي — يجب أن يبقى عبر مسح التبديل
  LAST_USER_KEY, // مؤشّر هذه الوحدة نفسه
])

/** هل يُبقى هذا المفتاح عبر مسح بيانات المستخدم؟ */
function isGlobalSafe(key: string): boolean {
  return GLOBAL_SAFE_KEYS.has(key)
}

/**
 * يمسح **كل** مفاتيح بيانات المستخدم على الجهاز عبر مسح بالبادئة — لا بقائمة ثابتة.
 * كل مفتاح `qimmah:*` غير مذكور في قائمة السماح العامّة يُحذف (fail-safe). لا يمسّ
 * مفاتيح غير `qimmah:` إطلاقًا. آمن للاستدعاء المتكرّر ولا يرمي.
 */
export function wipeUserData(userId?: string): void {
  if (typeof window === 'undefined') return
  if (userId) clearSyncArtifacts(userId)
  const ls = window.localStorage
  const toRemove: string[] = []
  for (let i = 0; i < ls.length; i += 1) {
    const k = ls.key(i)
    if (!k || !k.startsWith(PREFIX)) continue // لا نلمس مفاتيح خارج مساحة قِمّة
    if (isGlobalSafe(k)) continue // نُبقي تفضيلات/كاش/جلسة الجهاز
    toRemove.push(k)
  }
  for (const k of toRemove) {
    try {
      ls.removeItem(k)
    } catch {
      /* تجاهل أخطاء التخزين */
    }
  }
}

/**
 * آخر مالك رأيناه: `undefined` = لم يُضبط قط (تشغيل أول)، `null` = ضيف، نص = معرّف حساب.
 * التمييز بين «لم يُضبط» و«ضيف» ضروري: عند التشغيل الأول لا نمسح (نحترم بيانات المستخدم
 * الحالي عند ترقية الميزة)، بينما تبديل حساب فعلي (قيمة → قيمة مختلفة) يُطلق المسح.
 */
export function getLastUser(): string | null | undefined {
  if (typeof window === 'undefined') return undefined
  const raw = window.localStorage.getItem(LAST_USER_KEY)
  if (raw === null) return undefined
  return raw === 'guest' ? null : raw
}

/** يثبّت آخر مالك (ضيف = 'guest'). عامّ آمن (يبقى عبر المسح). */
export function setLastUser(uid: string | null): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LAST_USER_KEY, uid ?? 'guest')
  } catch {
    /* تجاهل */
  }
}

/**
 * يوفّق نطاق الحساب مع المستخدم الحالي. شبكة أمان تُستدعى بمجرّد جهوزية المصادقة وعند
 * كل تغيّر معرّف. تعيد `{ wiped }` ليقرّر المستدعي فرض إعادة تحميل نظيفة.
 *
 * المسح يقتصر على **تبديل بين حسابين حقيقيين مختلفين** (كلاهما غير null)، مثل استعادة
 * جلسة لحساب آخر دون مرور بتسجيل خروج. الانتقالات من/إلى الضيف (null) لا تمسح هنا —
 * تسجيل الخروج يمسح صراحةً في signOut، وتقييد المسح بالحسابين الحقيقيين يمنع أن يُفسَّر
 * وميض null عابر أثناء إقلاع المصادقة كتبديل حساب (الذي كان يسبّب حلقة إعادة تحميل).
 *
 *   • آخر حساب حقيقي = null/غير مضبوط، أو الحالي = ضيف → لا مسح؛ فقط نثبّت المالك الحقيقي.
 *   • حساب حقيقي مختلف عن آخر حساب حقيقي → امسح البقايا، ثبّت الحالي، `wiped: true`.
 */
export function reconcileAccountScope(uid: string | null): { wiped: boolean } {
  if (typeof window === 'undefined') return { wiped: false }
  const last = getLastUser()
  // تبديل بين حسابين حقيقيين مختلفين فقط يُطلق المسح.
  if (uid !== null && last !== undefined && last !== null && last !== uid) {
    wipeUserData()
    setLastUser(uid)
    stampDataOwner(uid) // الجهاز نظيف الآن — البيانات القادمة ملك الحساب الحالي
    return { wiped: true }
  }
  // خلاف ذلك: سجّل المالك الحقيقي الحالي (فيُلتقط أي حساب حقيقي مختلف لاحقًا) بلا مسح.
  if (uid !== null && last !== uid) setLastUser(uid)
  if (uid !== null) {
    // لا تبنٍّ تلقائيًا لبيانات مجهولة المالك: بيانات بلا ختم (أو بختم ضيف) تحت حساب
    // حقيقي تدخل حالة تعليق — تبقى محلية ولا تُرفع للسحابة حتى قرار صريح
    // (adoptPendingData/discardPendingData في dataOwnership).
    markAdoptionPendingIfUnowned(uid)
  }
  return { wiped: false }
}
