import { Icon } from '@/components/Icon'
import { ProfileData } from '@/sections/ProfileData'
import { MyTargets } from '@/sections/MyTargets'
import { HealthNotice } from '@/sections/HealthNotice'
import { useAuth } from '@/lib/authContext'
import { getStrings } from '@/config/strings'
import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'

interface ProfileViewProps {
  lang: Lang
  onNavigate: (route: AppRoute) => void
}

/** تبويب حسابي — الحساب + بيانات الجسم + الأهداف + روابط الإعدادات والقانون. */
export function ProfileView({ lang, onNavigate }: ProfileViewProps) {
  const t = getStrings(lang)
  const auth = useAuth()

  const statusText = !auth.configured
    ? t.auth.disabledTitle
    : auth.user
      ? t.auth.cloudNote
      : t.auth.guestNote

  return (
    <div className="space-y-4 px-4 py-4">
      {/* بطاقة الحساب */}
      <div className="card p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
            <Icon name={auth.user ? 'CheckCircle2' : 'User'} className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-ink-900">
              {auth.displayName ?? t.badge.guest}
            </p>
            <p className="text-xs leading-relaxed text-ink-500">{statusText}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {auth.user ? (
            <button type="button" onClick={() => auth.signOut()} className="btn-ghost flex-1 py-2.5 text-sm">
              <Icon name="LogOut" className="h-4 w-4" />
              {t.auth.logout}
            </button>
          ) : (
            <button type="button" onClick={() => onNavigate('login')} className="btn-primary flex-1 py-2.5 text-sm">
              <Icon name="LogIn" className="h-4 w-4" />
              {t.auth.login}
            </button>
          )}
          <button type="button" onClick={() => onNavigate('settings')} className="btn-ghost flex-1 py-2.5 text-sm">
            <Icon name="Settings" className="h-4 w-4" />
            {t.nav.settings}
          </button>
        </div>
      </div>

      {/* بيانات الجسم + الأهداف */}
      <ProfileData lang={lang} />
      <MyTargets lang={lang} />

      {/* روابط الثقة */}
      <div className="card p-5">
        <h2 className="text-base font-black text-ink-900">{t.settings.groupPrivacy}</h2>
        <div className="mt-3 flex flex-col divide-y divide-line">
          <LinkRow icon="Lock" label={t.settings.privacyLink} onClick={() => onNavigate('privacy')} />
          <LinkRow icon="FileText" label={t.settings.termsLink} onClick={() => onNavigate('terms')} />
        </div>
      </div>

      <HealthNotice lang={lang} />
    </div>
  )
}

function LinkRow({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 py-3 text-start">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-beige text-ink-500">
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <span className="text-sm font-bold text-ink-700">{label}</span>
      <Icon name="ChevronLeft" className="ms-auto h-4 w-4 text-ink-400 rtl:rotate-180" />
    </button>
  )
}
