import { useEffect, useState } from 'react'
import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { installInviteStrings } from '@/i18n/dict/installInvite'
import { installInviteKind, isInstallInviteSnoozed, isIOSSafari, snoozeInstallInvite } from '@/lib/installState'
import {
  canPromptInstall,
  installPromptFired,
  isNativePlatform,
  isStandalone,
  onInstallStateChange,
  promptInstallOutcome,
} from '@/lib/pwa'

/**
 * دعوة التثبيت — [R4-UX-INSTALL]. **شريط في التدفّق، لا سطح ثابت.**
 *
 * ═══ ما الذي كان معطوبًا ═══
 * ① **زرّ ميّت.** `InstallBanner` يعرض «ثبّت التطبيق» كلّما كان الجهاز iOS —
 *    وiOS **لا يملك مربّع تثبيت أصلًا**، فالزرّ كان يفتح الإعدادات لا يثبّت.
 *    وعلى أندرويد: بعد أن يفتح المستخدم المربّع ويغلقه، لا يعيد المتصفّح إطلاق
 *    `beforeinstallprompt` في نفس الجلسة — فأي زرّ «ثبّت» بعدها زرٌّ ميّت.
 * ② **إغلاق أبدي.** العلم كان `'1'` بلا زمن: ضغطةٌ واحدة في اليوم الأول تُلغي
 *    الدعوة إلى الأبد.
 *
 * ═══ ما صار ═══
 * القرار كلّه في `installInviteKind` — دالّة **خالصة** تُفحص بلا متصفّح، ولكل
 * حالة **فعلٌ حقيقي**: مربّع أصلي · خطوات سفاري · مسار قائمة المتصفّح · أو صمت.
 * والإغلاق تأجيلٌ ثلاثين يومًا (`snoozeInstallInvite`) لا حكمٌ نهائي.
 *
 * ═══ لماذا في تدفّق القشرة ═══
 * [QIM-WEB-FOUNDER-UX-003] قاسَ أن شريطًا سفليًّا ثابتًا ابتلع نقرات التنقّل
 * الخمسة. هذا المكوّن **لا يُعلن أي `fixed`** — يعيش في مسار القشرة فوق المحتوى،
 * فلا يمكنه بنيويًّا أن يعلو شيئًا. يحرسه `test:bottom-overlay`.
 */
export function InstallInvite({ lang, onOpenGuide }: { lang: Lang; onOpenGuide: () => void }) {
  const ar = lang !== 'en'
  const d = installInviteStrings[lang]
  const [tick, setTick] = useState(0)
  const [snoozed, setSnoozed] = useState(false)
  // نتيجة آخر محاولة — تُبدّل النصّ إلى الصدق بدل إعادة عرض زرّ لن يعمل.
  const [outcome, setOutcome] = useState<'accepted' | 'dismissed' | null>(null)

  useEffect(() => {
    setSnoozed(isInstallInviteSnoozed())
    return onInstallStateChange(() => setTick((v) => v + 1))
  }, [])

  const kind = installInviteKind({
    native: isNativePlatform(),
    standalone: isStandalone(),
    canPrompt: canPromptInstall(),
    promptFired: installPromptFired(),
    iosSafari: isIOSSafari(),
    snoozed,
  })
  // `tick` يشارك في الحساب أعلاه عبر إعادة الرسم — مذكور هنا صراحةً لأن قيم
  // `pwa` ليست حالة React، فالتغيّر يصل عبر الاشتراك لا عبر الاعتماديات.
  void tick

  if (outcome === 'accepted') {
    return (
      <p data-testid="install-invite-accepted" className="border-b border-line/60 bg-primary-soft px-4 py-2.5 text-[11px] font-bold text-ink-700">
        {d.accepted}
      </p>
    )
  }
  if (kind === 'hidden') return null

  const later = () => {
    snoozeInstallInvite()
    setSnoozed(true)
  }

  const install = async () => {
    const result = await promptInstallOutcome()
    if (result === 'accepted') setOutcome('accepted')
    // 'dismissed' و'unavailable' كلتاهما: لا مربّع بعد الآن في هذه الجلسة.
    // لا نُعيد الزرّ — نقول مسار القائمة. والفرق بينهما في النصّ لا في الوعد.
    else setOutcome('dismissed')
  }

  // النصّ والفعل يُشتقّان من نفس الحالة — فلا يقول السطر شيئًا ويفعل الزرّ غيره.
  const body = outcome === 'dismissed' ? d.afterDismissed : kind === 'native-prompt' ? d.bodyPrompt : kind === 'ios-steps' ? d.bodyIos : d.bodyMenu
  const action =
    outcome === 'dismissed' || kind === 'browser-menu'
      ? null
      : kind === 'native-prompt'
        ? { label: d.installCta, onClick: () => void install(), testId: 'install-invite-cta' }
        : { label: d.iosCta, onClick: onOpenGuide, testId: 'install-invite-ios' }

  return (
    <section
      dir={ar ? 'rtl' : 'ltr'}
      data-testid="install-invite"
      data-invite-kind={kind}
      aria-label={d.title}
      className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-line/60 bg-primary-soft px-4 py-2.5"
    >
      <Icon name={kind === 'ios-steps' ? 'Share2' : 'Smartphone'} className="h-4 w-4 shrink-0 text-primary-c" />
      <p className="min-w-0 flex-1 text-[11px] font-bold leading-snug text-ink-700">
        <span className="block text-ink-900">{d.title}</span>
        <span className="block font-normal">{body}</span>
      </p>
      {action && (
        <button type="button" onClick={action.onClick} data-testid={action.testId} className="btn-primary tap-target shrink-0 px-3 py-1.5 text-[11px]">
          {action.label}
        </button>
      )}
      <button
        type="button"
        onClick={later}
        data-testid="install-invite-later"
        aria-label={d.laterAria}
        className="tap-target shrink-0 rounded-lg px-2 text-[11px] font-bold text-ink-500 underline underline-offset-4"
      >
        {d.later}
      </button>
    </section>
  )
}
