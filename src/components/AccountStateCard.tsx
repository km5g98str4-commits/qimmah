/**
 * بطاقة حالة الحساب — [AUTH-DISCOVERABILITY-001]
 *
 * سطح واحد يجيب عن سؤال واحد: **هل أنا مسجَّل؟** ويعطي الفعل التالي مباشرة —
 * «تسجيل الدخول» للضيف، و«تسجيل الخروج» للمسجَّل — بنفس شارة الحساب/الضيف
 * ونفس أزرار الإعدادات، فلا معمارية حساب ثانية ولا لغة ثانية.
 *
 * الخروج يمسح بيانات هذا الجهاز (عزل الحساب)، فلا يُنفَّذ بلا تأكيد صريح
 * بالنصّ المعتمد `auth.logoutConfirm`.
 *
 * حين لا يكون الخادم مضبوطًا (معاينة بلا حسابات) تُقال الحقيقة ولا يُعرض
 * زرّ يَعِد بما لا يعمل.
 */
import { Icon } from '@/components/Icon'
import { getStrings } from '@/config/strings'
import { accountStateStrings } from '@/i18n/dict/accountState'
import type { Lang } from '@/lib/appPreferences'
import { useAuth } from '@/lib/authContext'

export interface AccountStateCardProps {
  lang: Lang
  onSignIn: () => void
  /** حين تُمرَّر، يظهر للمسجَّل مدخل صفحة العضوية (حيث كود التفعيل). */
  onOpenMembership?: () => void
}

export function AccountStateCard({ lang, onSignIn, onOpenMembership }: AccountStateCardProps) {
  const auth = useAuth()
  const t = getStrings(lang)
  const s = accountStateStrings[lang] ?? accountStateStrings.ar
  const signedIn = Boolean(auth.user)

  return (
    <section className="card p-5" aria-labelledby="account-state-title" data-testid="account-state" data-signed-in={signedIn ? 'true' : 'false'}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
          <Icon name={signedIn ? 'CheckCircle2' : 'User'} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="account-state-title" className="text-sm font-black text-ink-900">
              {!auth.configured ? t.auth.disabledTitle : signedIn ? s.signedInTitle : s.guestTitle}
            </h2>
            <span
              className={
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-black ' +
                (signedIn ? 'bg-primary-soft text-primary-c' : 'border border-line bg-surface text-ink-600')
              }
            >
              {signedIn ? t.badge.account : t.badge.guest}
            </span>
          </div>
          {signedIn && auth.displayName ? (
            <p className="mt-0.5 truncate text-xs font-bold text-ink-700" data-testid="account-state-name">{auth.displayName}</p>
          ) : null}
          <p className="mt-1 text-xs leading-relaxed text-ink-500">
            {!auth.configured ? t.auth.disabledNext : signedIn ? s.signedInBody : s.guestBody}
          </p>
        </div>
      </div>

      {auth.configured ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {signedIn ? (
            <>
              {onOpenMembership ? (
                <button type="button" onClick={onOpenMembership} data-testid="account-state-membership" className="btn-ghost min-h-[44px] justify-center px-4 text-xs">
                  <Icon name="Sparkles" className="h-4 w-4" />
                  {s.membership}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  // [RELEASE-REVIEW-004] الخروج يمسح بيانات الجهاز — لا يُنفَّذ بلا تأكيد صريح.
                  if (window.confirm(t.auth.logoutConfirm)) void auth.signOut()
                }}
                data-testid="account-state-sign-out"
                className="btn-ghost min-h-[44px] justify-center px-4 text-xs"
              >
                <Icon name="LogOut" className="h-4 w-4" />
                {t.auth.logout}
              </button>
            </>
          ) : (
            <button type="button" onClick={onSignIn} data-testid="account-state-sign-in" className="btn-primary min-h-[44px] justify-center px-5 text-sm">
              <Icon name="LogIn" className="h-4 w-4" />
              {t.auth.login}
            </button>
          )}
        </div>
      ) : null}
    </section>
  )
}
