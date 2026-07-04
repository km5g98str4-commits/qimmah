import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import type { Lang } from '@/lib/appPreferences'
import { installGuideStrings } from '@/i18n/dict/installGuide'
import { canPromptInstall, isStandalone, onInstallStateChange, promptInstall } from '@/lib/pwa'
import { dismissInstallPrompt, isIOSSafari, isInstallPromptDismissed } from '@/lib/installState'

/**
 * دعوة تثبيت التطبيق (P12) — بطاقة سفلية قابلة للإغلاق تظهر على الويب المحمول فقط:
 *  - أندرويد/كروم: زر «ثبّت التطبيق» أصلي (beforeinstallprompt الملتقَط → prompt()).
 *  - آيفون/سفاري: تلميح «أضف إلى الشاشة الرئيسية» (لا مربّع أصلي على iOS).
 * لا تظهر إطلاقًا إذا كان التطبيق مثبّتًا (standalone) أو بعد إغلاق المستخدم لها (علم دائم).
 * لا تحجب الواجهة أبدًا (شريط سفلي ضمن المساحة الآمنة).
 */
export function InstallPrompt({ lang }: { lang: Lang }) {
  const s = installGuideStrings[lang]
  const [installable, setInstallable] = useState(canPromptInstall())
  const [standalone, setStandalone] = useState(isStandalone())
  const [dismissed, setDismissed] = useState(isInstallPromptDismissed())
  // منصّة آيفون/سفاري ثابتة خلال الجلسة (لا تتغيّر) — تُحسب مرّة.
  const [ios] = useState(isIOSSafari)

  useEffect(
    () =>
      onInstallStateChange(() => {
        setInstallable(canPromptInstall())
        setStandalone(isStandalone())
      }),
    [],
  )

  // مثبّت أو مُغلق → لا شيء. غير ذلك: زر أصلي (أندرويد) أو تلميح (آيفون/سفاري).
  if (standalone || dismissed) return null
  const showAndroid = installable
  const showIos = !installable && ios
  if (!showAndroid && !showIos) return null

  const close = () => {
    dismissInstallPrompt()
    setDismissed(true)
  }

  const onInstall = async () => {
    await promptInstall()
    setInstallable(canPromptInstall())
    setStandalone(isStandalone())
  }

  return (
    <div
      dir={lang === 'en' ? 'ltr' : 'rtl'}
      data-testid="install-prompt"
      role="dialog"
      aria-label={s.promptTitle}
      className="fixed inset-x-0 bottom-0 z-[60] px-3 pt-3"
      style={{ paddingBottom: 'calc(var(--safe-bottom, 0px) + 0.75rem)' }}
    >
      <div className="card mx-auto flex max-w-md items-center gap-3 p-3 shadow-xl">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
          <Icon name={showIos ? 'Share2' : 'Download'} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 text-start">
          <p className="text-sm font-black text-ink-900">{s.promptTitle}</p>
          <p className="text-xs leading-snug text-ink-500">{showIos ? s.promptIosHint : s.promptBody}</p>
        </div>
        {showAndroid && (
          <button
            type="button"
            onClick={onInstall}
            data-testid="install-prompt-cta"
            className="btn-primary shrink-0 px-3 py-2 text-xs"
          >
            <Icon name="Download" className="h-4 w-4" />
            {s.installBtn}
          </button>
        )}
        <button
          type="button"
          onClick={close}
          data-testid="install-prompt-dismiss"
          aria-label={s.dismiss}
          className="shrink-0 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-900/5"
        >
          <Icon name="X" className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
