import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * إثبات واجهة حذف الحساب — [CTO-65] البند ١ · متطلَّب App Store 5.1.1(v).
 *
 * **ساكن عمدًا، بلا Docker وبلا متصفح.** العقد السلوكي الكامل موجود في
 * `scripts/e2e-auth/run.mjs` لكنه محجوب بـPostgres/Docker وخارج البوابة — فبقيت
 * الفجوة سنةً بلا كاشف: عقد مكتوب لا يُشغَّل. هذا الإثبات يشتغل في كل بوابة.
 *
 * يفحص أمرين لا واحدًا:
 *   ١) المعرّفات الحرفية التي يطابقها عقد e2e-auth (اسم متاح · id · نصّ زرّ).
 *   ٢) **اقتران** استدعاء `deleteAccount()` بمعالجة `ok === false` — لا وجودهما متفرّقين.
 *
 * §4.2: كل شدّ بوابة يُرفَق بمحاكاة التفاف تفشل بفحص مسمّى — انظر آخر الملف.
 */

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
let pass = 0
const check = (label, condition) => {
  if (!condition) throw new Error(`FAIL: ${label}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}

const settings = read('src/views/SettingsView.tsx')
const dialog = read('src/components/DeleteAccountDialog.tsx')
const strings = read('src/config/strings.ts')
const profileModel = read('src/lib/profileV2Model.ts')

console.log('\nإثبات واجهة حذف الحساب (App Store 5.1.1(v))')

// ─────────── ١) المدخل موجود ومحصور بالمسجَّل ───────────
check(
  'صفّ الحذف موجود في الإعدادات ويستدعي فتح النافذة',
  settings.includes('DeleteAccountDialog') && /setDeleteOpen\(true\)/.test(settings),
)
check(
  'المدخل داخل فرع auth.user حصرًا (لا يُعرض للضيف)',
  /\{auth\.user && \([\s\S]{0,900}?settings-delete-account/.test(settings),
)
check(
  'اسم زرّ الفتح هو نصّ القاموس «حذف الحساب» بلا وصف داخل الزرّ',
  settings.includes('{t.auth.deleteAccount}') && strings.includes("deleteAccount: 'حذف الحساب'"),
)
check(
  'الوصف خارج الزرّ (لا يلوّث الاسم المتاح الذي يطابقه العقد بـexact)',
  /\{t\.auth\.deleteAccount\}\s*<\/button>\s*<p[^>]*>\{t\.auth\.deleteAccountDesc\}/.test(
    settings.replace(/\n\s*/g, ' '),
  ),
)

// ─────────── ٢) معرّفات العقد الحرفية ───────────
check('حقل التأكيد يحمل id="delete-confirm" كما يطابقه العقد', dialog.includes('id="delete-confirm"'))
check('التسمية مربوطة بالحقل عبر htmlFor="delete-confirm"', dialog.includes('htmlFor="delete-confirm"'))
check(
  'زرّ التنفيذ يعرض نصّ «احذف حسابي نهائيًا» من القاموس',
  /t\.deleteConfirmCta/.test(dialog) && strings.includes("deleteConfirmCta: 'احذف حسابي نهائيًا'"),
)
check(
  'زرّ الإلغاء يعرض «إلغاء» من القاموس',
  dialog.includes('{t.cancel}') && strings.includes("cancel: 'إلغاء',"),
)
check(
  'الإلغاء يُزيل النافذة من الشجرة (فيختفي #delete-confirm كما يفحص العقد)',
  /\{deleteOpen && \(/.test(settings) && /onClose=\{\(\) => setDeleteOpen\(false\)\}/.test(settings),
)

// ─────────── ٣) التأكيد المكتوب فعّال لا زخرفة ───────────
check(
  'زرّ التنفيذ محجوب حتى تُطابق الكلمة المكتوبة',
  /const canConfirm = matches && phase === 'confirm'/.test(dialog) &&
    /aria-disabled=\{!canConfirm\}/.test(dialog),
)
check(
  'المطابقة تقرأ كلمة التأكيد من القاموس لا من نصّ صلب',
  /t\.deleteConfirmWord/.test(dialog) && strings.includes("deleteConfirmWord: 'حذف'"),
)
check('التنفيذ يخرج مبكرًا إن لم يكتمل التأكيد', /if \(!canConfirm\) return/.test(dialog))

// ─────────── ٤) الاقتران: النداء + معالجة الفشل في نفس التدفّق ───────────
// لا يكفي وجود الاثنين في الملف؛ يجب أن يكون فرع الفشل داخل الدالة التي تنادي
// deleteAccount، وقبل أي مسح أو إعادة تحميل.
const runFn = dialog.match(/const run = async \(\) => \{[\s\S]*?\n  \}/)
check('دالة التنفيذ موجودة ككتلة واحدة قابلة للفحص', Boolean(runFn))
const body = runFn ? runFn[0] : ''
check('التدفّق ينادي auth.deleteAccount()', /await auth\.deleteAccount\(\)/.test(body))
check(
  'فرع صريح يعالج ok === false داخل نفس التدفّق',
  /if \(!result\.ok\)/.test(body) && /setPhase\('failed'\)/.test(body),
)
check(
  'الفشل يخرج قبل أي مسح محلي أو إعادة تحميل (لا حذف جزئي ولا نجاح كاذب)',
  body.indexOf('if (!result.ok)') < body.indexOf('resetQimmah') &&
    body.indexOf('return') < body.indexOf('resetQimmah') &&
    /if \(!result\.ok\)[\s\S]*?return[\s\S]*?\}/.test(body),
)
check(
  'المسح وإعادة التحميل بعد ok===true حصرًا',
  /setPhase\('done'\)[\s\S]{0,200}resetQimmah\(\)[\s\S]{0,200}location\.reload\(\)/.test(body),
)
check(
  'حالة الفشل تعرض نصّ الفشل وإعادة المحاولة والتواصل',
  /t\.deleteFailed/.test(dialog) && /t\.deleteRetry/.test(dialog) && /t\.deleteContactCta/.test(dialog),
)
check('سبب الخادم يُعرض للمستخدم ولا يُبتلع', /setFailReason\(result\.error\)/.test(dialog))

// ─────────── ٥) الادّعاء في النموذج صار صحيحًا ───────────
check(
  'profileV2Model لم يعد يحيل إلى مسار إعدادات غير موجود',
  profileModel.includes('routes to the delete-account row in SettingsView') &&
    !profileModel.includes('routes to the existing safe Settings flow'),
)

// ─────────── §4.2 محاكاة التفاف — يجب أن تسقط بفحص مسمّى ───────────
// نسخة تعرض الزرّ وتنادي الدالة لكنها تحذف فرع الفشل وتمسح دائمًا.
const circumvented = dialog
  .replace(/if \(!result\.ok\) \{[\s\S]*?\n      return\n    \}/, '')
const runFnC = circumvented.match(/const run = async \(\) => \{[\s\S]*?\n  \}/)
const bodyC = runFnC ? runFnC[0] : ''
const circumventionCaught =
  /await auth\.deleteAccount\(\)/.test(bodyC) && !(/if \(!result\.ok\)/.test(bodyC) && /setPhase\('failed'\)/.test(bodyC))
check(
  '§4.2 محاكاة الالتفاف (نداء بلا معالجة ok:false) تسقط بفحص «فرع صريح يعالج ok === false»',
  circumventionCaught,
)

console.log(`\n✅ واجهة حذف الحساب: ${pass} فحصًا، 0 فشل.`)
