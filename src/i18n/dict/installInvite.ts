// نصوص دعوة التثبيت — [R4-UX-INSTALL].
//
// ═══ القاعدة التي تحكم كل سطر ═══
// **لا نَعِد بمربّع لن يظهر.** لكل حالة نصّها الخاص لأن الأفعال مختلفة فعلًا:
//   • أندرويد/كروم: مربّع أصلي موجود ⇒ زرّ يفتحه.
//   • سفاري آيفون: لا مربّع على iOS إطلاقًا ⇒ خطوات مكتوبة، لا زرّ «ثبّت».
//   • مربّع استُهلك في هذه الجلسة: المتصفّح لا يعيد فتحه ⇒ نقول مسار القائمة.
// وحين لا يوجد مسار تثبيت أصلًا، الصمت هو الصدق — ولذلك لا نصّ هنا لتلك الحالة.
//
// النبرة عامية بيضاء (§6)، والإنجليزية غير رسمية.

import type { Lang } from '@/lib/appPreferences'

export interface InstallInviteStrings {
  title: string
  /** أندرويد/كروم — المربّع الأصلي متاح. */
  bodyPrompt: string
  installCta: string
  /** سفاري آيفون — لا مربّع أصلي على iOS. */
  bodyIos: string
  iosCta: string
  /** المربّع أُطلق واستُهلك — مسار قائمة المتصفّح. */
  bodyMenu: string
  /** بعد القبول — تأكيد قصير ثم تختفي الدعوة. */
  accepted: string
  /** بعد إغلاق المستخدم للمربّع الأصلي — بلا لوم وبلا إعادة محاولة كاذبة. */
  afterDismissed: string
  /** الإغلاق يؤجّل شهرًا — نقول المدّة لأنها وعد نلتزم به. */
  later: string
  laterAria: string
}

const ar: InstallInviteStrings = {
  title: 'ثبّت قِمّة على جهازك',
  bodyPrompt: 'يفتح كتطبيق مستقل بلا شريط متصفّح، ويوصلك أسرع كل مرّة.',
  installCta: 'ثبّت الحين',
  bodyIos: 'في سفاري: اضغط زر المشاركة، وبعدها «أضف إلى الشاشة الرئيسية». ما فيه زر تثبيت تلقائي على آيفون.',
  iosCta: 'ورّني الخطوات',
  bodyMenu: 'مربّع التثبيت ما يفتح مرّة ثانية في نفس الجلسة. تقدر تثبّته من قائمة المتصفّح (⋮) ← «تثبيت التطبيق».',
  accepted: 'تمام — بتلقى قِمّة على شاشتك الرئيسية.',
  afterDismissed: 'ولا يهمّك. لو غيّرت رأيك، من قائمة المتصفّح (⋮) ← «تثبيت التطبيق».',
  later: 'مو الحين',
  laterAria: 'مو الحين — ما نسألك عنها شهر',
}

const en: InstallInviteStrings = {
  title: 'Install Qimmah on your device',
  bodyPrompt: 'It opens as its own app with no browser bar, and it is quicker to get to.',
  installCta: 'Install now',
  bodyIos: 'In Safari: tap Share, then “Add to Home Screen”. iPhone has no automatic install button.',
  iosCta: 'Show me how',
  bodyMenu: 'The install dialog will not open again this session. You can still install from the browser menu (⋮) → “Install app”.',
  accepted: 'Done — you will find Qimmah on your home screen.',
  afterDismissed: 'No problem. If you change your mind: browser menu (⋮) → “Install app”.',
  later: 'Not now',
  laterAria: 'Not now — we will not ask again for a month',
}

export const installInviteStrings: Record<Lang, InstallInviteStrings> = { ar, en }
