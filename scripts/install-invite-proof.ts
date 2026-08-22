// إثبات سلوكي لقرار دعوة التثبيت — [R4-UX-INSTALL].
//
// القرار **خالص** عمدًا: كلّ حالة يراها المستخدم تُفحص هنا بلا متصفّح ولا DOM،
// فلا تختبئ حالةٌ خلف «ما قدرنا نحاكيها».

import { installInviteKind, isInstallInviteSnoozed, snoozeInstallInvite, INSTALL_SNOOZE_DAYS, INSTALL_PROMPT_DISMISSED_KEY, INSTALL_INVITE_SNOOZED_AT_KEY, type InstallInviteInput } from '@/lib/installState'

let pass = 0
let fail = 0
const check = (label: string, cond: boolean): void => {
  if (cond) { pass++; console.log(`  ✓ ${label}`) } else { fail++; console.log(`  ✗ FAIL: ${label}`) }
}

const base: InstallInviteInput = { native: false, standalone: false, canPrompt: false, promptFired: false, iosSafari: false, snoozed: false }
const kind = (over: Partial<InstallInviteInput>) => installInviteKind({ ...base, ...over })
const ls = globalThis.localStorage
const DAY = 86_400_000

console.log('\n① لكل حالة فعلٌ حقيقي — أو صمت')
check('أندرويد/كروم والحدث ملتقَط ⇒ مربّع أصلي', kind({ canPrompt: true }) === 'native-prompt')
check('سفاري آيفون ⇒ خطوات مكتوبة لا زرّ تثبيت', kind({ iosSafari: true }) === 'ios-steps')
check('مربّع أُطلق ثم استُهلك ⇒ مسار قائمة المتصفّح', kind({ promptFired: true }) === 'browser-menu')
check('متصفّح بلا مسار تثبيت ⇒ صمت (لا زرّ ميّت)', kind({}) === 'hidden')

console.log('\n② لا تظهر حين لا معنى لها')
check('داخل الغلاف الأصلي ⇒ مخفيّة (خطر رفض App Store)', kind({ native: true, canPrompt: true }) === 'hidden')
check('يعمل standalone (مثبَّت) ⇒ مخفيّة', kind({ standalone: true, canPrompt: true }) === 'hidden')
check('standalone يغلب حتى على سفاري آيفون', kind({ standalone: true, iosSafari: true }) === 'hidden')
check('المؤجَّلة مخفيّة ولو كان المربّع جاهزًا', kind({ snoozed: true, canPrompt: true }) === 'hidden')
check('والمؤجَّلة مخفيّة على آيفون كذلك', kind({ snoozed: true, iosSafari: true }) === 'hidden')

console.log('\n③ الأولوية: المربّع الحيّ قبل أي بديل مكتوب')
check('canPrompt يغلب iosSafari (لو اجتمعا)', kind({ canPrompt: true, iosSafari: true }) === 'native-prompt')
check('iosSafari يغلب «مستهلَك» (آيفون لا مربّع له أصلًا)', kind({ iosSafari: true, promptFired: true }) === 'ios-steps')

console.log('\n④ الإغلاق تأجيل لا أبد')
ls.clear()
check('بلا إغلاق سابق: غير مؤجَّلة', !isInstallInviteSnoozed())
const now = Date.UTC(2026, 7, 1, 12)
snoozeInstallInvite(now)
check('بعد الإغلاق مباشرة: مؤجَّلة', isInstallInviteSnoozed(now))
check(`بعد ${INSTALL_SNOOZE_DAYS - 1} يومًا: ما زالت مؤجَّلة`, isInstallInviteSnoozed(now + (INSTALL_SNOOZE_DAYS - 1) * DAY))
check(`بعد ${INSTALL_SNOOZE_DAYS} يومًا: تعود`, !isInstallInviteSnoozed(now + INSTALL_SNOOZE_DAYS * DAY + 1))

console.log('\n⑤ ترحيل العلم الأبدي القديم — لا يُهجَر أحد ولا يُقفَل أحد')
ls.clear()
ls.setItem(INSTALL_PROMPT_DISMISSED_KEY, '1')
check('من أغلقها قديمًا يُعامَل كمؤجَّل الآن لا كمحروم أبدًا', isInstallInviteSnoozed())
check('ويُكتب له ختم زمني فعلي', (Number(ls.getItem(INSTALL_INVITE_SNOOZED_AT_KEY)) || 0) > 0)
const stamped = Number(ls.getItem(INSTALL_INVITE_SNOOZED_AT_KEY))
check('فتنتهي مدّته كما تنتهي مدّة غيره', !isInstallInviteSnoozed(stamped + INSTALL_SNOOZE_DAYS * DAY + 1))

console.log('\n⑥ ختم تالف لا يقفل الدعوة إلى الأبد')
ls.clear()
ls.setItem(INSTALL_INVITE_SNOOZED_AT_KEY, 'لا-رقم')
check('قيمة غير رقمية تُقرأ «غير مؤجَّلة» لا «مؤجَّلة للأبد»', !isInstallInviteSnoozed())

if (fail > 0) {
  console.log(`\n❌ دعوة التثبيت (سلوكي): ${pass} نجحت، ${fail} فشلت.`)
  process.exit(1)
}
console.log(`\n✓ دعوة التثبيت (سلوكي): ${pass} فحصًا، 0 فشل.`)
