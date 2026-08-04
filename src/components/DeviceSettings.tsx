import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import {
  canPromptInstall,
  isIOS,
  isStandalone,
  notificationPermission,
  onInstallStateChange,
  promptInstall,
  requestNotifications,
  type NotifPermission,
} from '@/lib/pwa'

/**
 * مجموعة إعدادات «التطبيق والتنبيهات»:
 *  - تثبيت PWA (زر أصلي على أندرويد/كروم، وتعليمات صريحة على آيفون).
 *  - تفعيل إذن التنبيهات حيث يُدعم — بنسخة صادقة بلا وعود خلفية.
 */
export function DeviceSettings({ lang }: { lang: Lang }) {
  const t = getStrings(lang)
  const [installable, setInstallable] = useState(canPromptInstall())
  const [standalone, setStandalone] = useState(isStandalone())
  const [perm, setPerm] = useState<NotifPermission>(notificationPermission())
  const ios = isIOS()

  useEffect(() => {
    // نتابع توفّر التثبيت (قد يصل الحدث بعد فتح الصفحة) وحالة التثبيت.
    const off = onInstallStateChange(() => {
      setInstallable(canPromptInstall())
      setStandalone(isStandalone())
    })
    return off
  }, [])

  const onInstall = async () => {
    await promptInstall()
    setInstallable(canPromptInstall())
    setStandalone(isStandalone())
  }

  const onEnableNotif = async () => {
    const result = await requestNotifications(t.pwa.notifConfirm)
    setPerm(result)
  }

  return (
    <section className="card p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary-c">
          <Icon name="Smartphone" className="h-4.5 w-4.5" />
        </span>
        <h2 className="text-base font-black text-ink-900">{t.pwa.group}</h2>
      </div>

      {/* — التثبيت — */}
      <div className="space-y-3">
        {standalone ? (
          <div className="flex items-start gap-3 rounded-xl border border-primary-soft bg-primary-soft p-3">
            <Icon name="CheckCircle2" className="mt-0.5 h-5 w-5 shrink-0 text-primary-c" />
            <div>
              <p className="text-sm font-bold text-ink-900">{t.pwa.installedTitle}</p>
              <p className="text-xs leading-relaxed text-ink-500">{t.pwa.installedBody}</p>
            </div>
          </div>
        ) : ios ? (
          <div className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3">
            <Icon name="Share2" className="mt-0.5 h-5 w-5 shrink-0 text-primary-c" />
            <div>
              <p className="text-sm font-bold text-ink-900">{t.pwa.installIosTitle}</p>
              <p className="text-xs leading-relaxed text-ink-500">{t.pwa.installIosBody}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-ink-900">{t.pwa.installTitle}</p>
              <p className="text-xs leading-relaxed text-ink-500">{t.pwa.installBody}</p>
            </div>
            {installable ? (
              <button type="button" onClick={onInstall} className="btn-primary shrink-0 px-4 py-2.5 text-sm">
                <Icon name="Download" className="h-4 w-4" />
                {t.pwa.installBtn}
              </button>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-[11px] font-bold text-ink-400">
                <Icon name="Info" className="h-3.5 w-3.5" />
                {t.pwa.installIosBody.split('.')[0]}
              </span>
            )}
          </div>
        )}

        {/* — التنبيهات — */}
        <div className="border-t border-line/60 pt-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-beige text-primary-c">
                <Icon name="Bell" className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-ink-900">{t.pwa.notifTitle}</p>
                <p className="text-xs leading-relaxed text-ink-500">{t.pwa.notifBody}</p>
              </div>
            </div>
            {perm === 'granted' ? (
              <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-[11px] font-black text-primary-c">
                <Icon name="CheckCircle2" className="h-3.5 w-3.5" />
                {t.pwa.notifGranted}
              </span>
            ) : perm === 'unsupported' ? (
              <span className="w-fit shrink-0 text-[11px] font-bold text-ink-400">{t.pwa.notifUnsupported}</span>
            ) : (
              <button type="button" onClick={onEnableNotif} className="btn-ghost shrink-0 px-4 py-2.5 text-sm">
                <Icon name="Bell" className="h-4 w-4" />
                {t.pwa.notifEnable}
              </button>
            )}
          </div>
          {perm === 'denied' && (
            <p className="mt-2 flex items-start gap-2 rounded-xl border border-gold-400/40 bg-gold-200/40 p-2.5 text-[11px] leading-relaxed text-ink-700">
              <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-600" />
              {t.pwa.notifDenied}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
