import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { canPromptInstall, isIOS, isNativePlatform, isStandalone, onInstallStateChange, promptInstall } from '@/lib/pwa'

const DISMISS_KEY = 'qimmah:install-banner:dismissed'

function wasDismissed(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * شريط تثبيت خفيف قابل للإغلاق (يظهر أعلى التبويبات).
 * يظهر فقط إن لم يكن التطبيق مثبّتًا، ولم يُغلقه المستخدم، وكان قابلًا للتثبيت (أندرويد) أو على آيفون.
 * على آيفون يفتح الإعدادات (تعليمات الإضافة للشاشة الرئيسية) بدل مربّع أصلي غير متاح.
 */
export function InstallBanner({ lang, onOpenSettings }: { lang: Lang; onOpenSettings: () => void }) {
  const t = getStrings(lang)
  const [installable, setInstallable] = useState(canPromptInstall())
  const [dismissed, setDismissed] = useState(wasDismissed())
  const ios = isIOS()
  const standalone = isStandalone()

  useEffect(() => onInstallStateChange(() => setInstallable(canPromptInstall())), [])

  // داخل الغلاف الأصلي (Capacitor) لا شريط تثبيت PWA إطلاقًا — التطبيق مثبّت أصلًا (خطر رفض App Store).
  if (isNativePlatform() || standalone || dismissed || (!installable && !ios)) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      window.localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // تخزين غير متاح (خصوصية صارمة) — نُغلق للجلسة فقط.
    }
  }

  const onInstall = async () => {
    if (ios && !installable) {
      onOpenSettings() // تعليمات آيفون تعيش في الإعدادات (لا مربّع تثبيت أصلي على آيفون).
      dismiss()
      return
    }
    await promptInstall()
    setInstallable(canPromptInstall())
  }

  return (
    <div className="flex items-center gap-2 border-b border-line/60 bg-primary-soft px-4 py-2.5">
      <Icon name="Smartphone" className="h-4 w-4 shrink-0 text-primary-c" />
      <p className="flex-1 text-[11px] font-bold leading-snug text-ink-700">{t.pwa.bannerText}</p>
      <button type="button" onClick={onInstall} className="btn-primary shrink-0 px-3 py-1.5 text-[11px]">
        {t.pwa.bannerInstall}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t.pwa.bannerDismiss}
        className="shrink-0 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-900/5"
      >
        <Icon name="X" className="h-4 w-4" />
      </button>
    </div>
  )
}
