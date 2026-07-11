import { useMemo, useState, type ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'
import { useCustomization } from '@/lib/customizationContext'
import { useAuth } from '@/lib/authContext'
import { buildProfileV2Model } from '@/lib/profileV2Model'

interface ProfileV2Props {
  lang: Lang
  onNavigate: (route: AppRoute) => void
}

type Screen = 'home' | 'privacy' | 'settings'

/**
 * Profile v2 — Qimmah v2.1 (Slice 7). Preview-gated (ProfileView branches here
 * under isDesignV2). A trusted training identity — not a settings drawer.
 * Internal screens: Home → Privacy & Data / Settings. Destructive + account
 * actions (delete, logout) route to the EXISTING safe Settings flow; they are
 * never reimplemented or weakened here. No fake stats, no real paywall.
 */
export function ProfileV2({ lang, onNavigate }: ProfileV2Props) {
  const { customization } = useCustomization()
  const auth = useAuth()
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const [screen, setScreen] = useState<Screen>('home')
  const model = useMemo(
    () => buildProfileV2Model(customization, { displayName: auth.displayName, email: auth.user?.email ?? null, signedIn: !!auth.user }, lang),
    [customization, auth.displayName, auth.user, lang],
  )

  if (screen === 'privacy') return <Privacy lang={lang} model={model} onBack={() => setScreen('home')} onDelete={() => onNavigate('settings')} />
  if (screen === 'settings') return <Settings lang={lang} model={model} onBack={() => setScreen('home')} onAccount={() => onNavigate('settings')} />

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="min-h-screen bg-page px-4 pb-28 pt-3 text-ink-900">
      <div className="mx-auto w-full max-w-md space-y-5 animate-fade-up">
        <h1 className="pt-1 text-2xl font-black tracking-tight">{t('ملفك التدريبي', 'Your training profile')}</h1>

        {/* Identity card */}
        <section className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-5 shadow-card">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary text-2xl font-black text-white">{model.user.initials}</span>
          <div className="min-w-0">
            <p className="truncate text-lg font-black">{model.user.displayName}</p>
            {model.trainingIdentity.goalLabel && <p className="mt-0.5 text-sm text-ink-500">{t('الهدف', 'Goal')} · <span className="font-bold text-primary">{model.trainingIdentity.goalLabel}</span></p>}
          </div>
        </section>

        {/* Quick stats — real only */}
        <section className="grid grid-cols-3 gap-3">
          <Stat value={model.stats.workoutCount} label={t('تمارين', 'Workouts')} />
          <Stat value={model.stats.streakDays} label={t('أيام متتالية', 'Streak')} />
          <Stat value={model.stats.prCount} label={t('أرقام قياسية', 'PRs')} />
        </section>
        {!model.stats.hasData && <p className="-mt-1 px-1 text-center text-[0.7rem] text-ink-400">{t('نحتاج بيانات أكثر — أكمل تمرينك الأول.', 'We need more data — complete your first workout.')}</p>}

        {/* Plan status */}
        <section className="rounded-2xl border border-line bg-surface p-4">
          <p className="flex items-center gap-2 text-sm font-black"><Icon name="Dumbbell" className="h-4.5 w-4.5 text-primary" />{model.trainingIdentity.planTitle}</p>
          <p className="mt-1 text-xs text-ink-500">
            {model.trainingIdentity.onboarded
              ? model.trainingIdentity.trainingDaysPerWeek
                ? t(`${model.trainingIdentity.trainingDaysPerWeek} أيام/أسبوع · مبنية على إعدادك`, `${model.trainingIdentity.trainingDaysPerWeek} days/week · from your setup`)
                : t('مبنية على إعدادك', 'from your setup')
              : t('أكمل الإعداد لبناء خطتك', 'Finish setup to build your plan')}
          </p>
        </section>

        {/* Rows */}
        <section className="space-y-2.5">
          <Row icon="TrendingUp" label={t('القياسات والصور', 'Measurements & photos')} onClick={() => onNavigate('progress')} />
          <Row icon="Pill" label={t('الأدوية والمكملات', 'Supplements & meds')} onClick={() => onNavigate('settings')} />
          <Row icon="Settings" label={t('الإعدادات', 'Settings')} onClick={() => setScreen('settings')} />
          <Row icon="ShieldCheck" label={t('الخصوصية والبيانات', 'Privacy & data')} onClick={() => setScreen('privacy')} />
        </section>

        {/* Qimmah+ quiet line — one calm line, no paywall */}
        {model.subscription.showQuietLine && (
          <button type="button" onClick={() => setScreen('settings')} className="flex w-full items-center justify-between gap-2 rounded-2xl border border-line bg-beige/40 px-4 py-3 text-start">
            <span className="min-w-0 text-sm font-bold text-ink-700">{model.subscription.label}</span>
            <span className="shrink-0 text-xs font-black text-ink-500">{model.subscription.reason}</span>
          </button>
        )}
      </div>
    </div>
  )
}

function Privacy({ lang, model, onBack, onDelete }: { lang: Lang; model: ReturnType<typeof buildProfileV2Model>; onBack: () => void; onDelete: () => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  return (
    <SubScreen title={t('الخصوصية والبيانات', 'Privacy & data')} onBack={onBack} lang={lang}>
      <section className="rounded-3xl border border-line bg-surface p-5">
        <h2 className="text-xl font-black">{t('بياناتك ملكك', 'Your data is yours')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">{t('نجمع الحد الأدنى فقط. كل التقديرات شفافة وقابلة للتعديل، ويمكنك تصدير أو حذف بياناتك في أي وقت.', 'We collect the minimum. Every estimate is transparent and editable, and you can export or delete your data anytime.')}</p>
      </section>
      <section className="mt-4 space-y-2.5">
        <InfoRow icon="BarChart3" title={t('تحليلات مجهولة', 'Anonymous analytics')} sub={t('لتحسين التطبيق فقط', 'To improve the app only')} state={model.privacy.analyticsAnonymousEnabled ? t('مفعّل', 'On') : t('مطفأ', 'Off')} />
        <InfoRow icon="Activity" title={t('مشاركة بيانات الصحة', 'Health sharing')} sub={t('غير مربوطة بعد', 'Not connected yet')} disabled />
        <InfoRow icon="Download" title={t('تنزيل نسخة من بياناتي', 'Export my data')} sub={t('قادم لاحقًا', 'Coming later')} disabled />
        <button type="button" onClick={onDelete} className="flex w-full items-center gap-3 rounded-2xl border border-danger/40 bg-danger/5 px-4 py-3.5 text-start">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-danger/15 text-danger"><Icon name="Trash2" className="h-4.5 w-4.5" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-danger">{t('حذف الحساب نهائيًا', 'Delete account permanently')}</span><span className="block text-xs text-ink-500">{t('لا يمكن التراجع · يتطلب تأكيدًا', 'Irreversible · requires confirmation')}</span></span>
          <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400 rtl:rotate-0 ltr:rotate-180" />
        </button>
      </section>
    </SubScreen>
  )
}

function Settings({ lang, model, onBack, onAccount }: { lang: Lang; model: ReturnType<typeof buildProfileV2Model>; onBack: () => void; onAccount: () => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  return (
    <SubScreen title={t('الإعدادات', 'Settings')} onBack={onBack} lang={lang}>
      <Group title={t('المظهر', 'Appearance')}>
        <InfoRow icon="Moon" title={t('السمة', 'Theme')} sub={model.settings.appearance} disabled subNote={t('داكن حاليًا', 'Dark for now')} />
      </Group>
      <Group title={t('عام', 'General')}>
        <InfoRow icon="Globe" title={t('اللغة', 'Language')} sub={model.settings.language} state="" />
        <InfoRow icon="Ruler" title={t('الوحدات', 'Units')} sub={model.settings.units} state="" />
        <InfoRow icon="Calculator" title={t('الأرقام', 'Numerals')} sub={model.settings.numerals} state="" />
      </Group>
      <Group title={t('الإشعارات', 'Notifications')}>
        <InfoRow icon="Bell" title={t('التذكيرات', 'Reminders')} sub={t('تمرين · وجبات · مكملات', 'Workout · meals · supplements')} state="" onClick={onAccount} />
      </Group>
      <Group title={t('الحساب', 'Account')}>
        <InfoRow icon="User" title={t('الملف والبيانات', 'Profile & data')} sub={model.user.email ?? (ar ? 'ضيف' : 'Guest')} onClick={onAccount} />
        <InfoRow icon="LogOut" title={t('تسجيل الخروج · حذف الحساب', 'Log out · delete account')} sub={t('من إعدادات الحساب', 'in account settings')} onClick={onAccount} />
      </Group>
    </SubScreen>
  )
}

function SubScreen({ title, onBack, lang, children }: { title: string; onBack: () => void; lang: Lang; children: ReactNode }) {
  const ar = lang !== 'en'
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="min-h-screen bg-page px-4 pb-28 pt-3 text-ink-900">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} aria-label={ar ? 'رجوع' : 'Back'} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface"><Icon name="ChevronRight" className="h-5 w-5" /></button>
          <h1 className="text-xl font-black">{title}</h1>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <p className="mb-2 text-xs font-black uppercase tracking-wider text-ink-500">{title}</p>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return <div className="rounded-2xl border border-line bg-surface py-3 text-center"><p className="text-2xl font-black tabular-nums">{value}</p><p className="mt-0.5 text-[0.65rem] font-bold text-ink-500">{label}</p></div>
}
function Row({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-start transition-colors hover:border-primary/40">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-beige text-ink-500"><Icon name={icon} className="h-4.5 w-4.5" /></span>
      <span className="flex-1 text-sm font-bold">{label}</span>
      <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400 rtl:rotate-0 ltr:rotate-180" />
    </button>
  )
}
function InfoRow({ icon, title, sub, state, disabled, subNote, onClick }: { icon: string; title: string; sub: string; state?: string; disabled?: boolean; subNote?: string; onClick?: () => void }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp type={onClick ? 'button' : undefined} onClick={onClick} className={cn('flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-start', disabled && 'opacity-70', onClick && 'hover:border-primary/40')}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-beige text-ink-500"><Icon name={icon} className="h-4.5 w-4.5" /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{title}</span><span className="block text-xs text-ink-500">{subNote ?? sub}</span></span>
      {state != null && state !== '' && <span className="shrink-0 text-xs font-black text-ink-500">{state}</span>}
      {disabled && <span className="shrink-0 text-[0.65rem] font-bold text-ink-400">{subNote ? '' : sub}</span>}
    </Comp>
  )
}
