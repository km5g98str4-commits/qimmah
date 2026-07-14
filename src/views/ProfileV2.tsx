import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'
import { useCustomization } from '@/lib/customizationContext'
import { useAuth } from '@/lib/authContext'
import { dataPortabilityCopy } from '@/data/dataPortabilityCopy'
import { buildQimmahDataExport, deliverQimmahDataExport } from '@/lib/dataPortability'
import { buildProfileV2Model, COMMITMENT_WEEKS, type CommitmentWeek, type ProfileV2Model } from '@/lib/profileV2Model'

interface ProfileV2Props {
  lang: Lang
  onNavigate: (route: AppRoute) => void
}

type Screen = 'home' | 'privacy' | 'settings'

/**
 * Profile v2 — «ملفك التدريبي» — Qimmah v2.1 (§06). Preview-gated (ProfileView
 * branches here under isDesignV2). An earned training identity, not a settings
 * drawer: real stats, a program card, and a commitment heatmap wired to the
 * actual stores. Qimmah+ is ONE quiet line at the base — no filled block, no
 * banner, no modal, no fake scarcity. Destructive + account actions route to the
 * EXISTING safe Settings flow; they are never reimplemented or weakened here.
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

  useEffect(() => {
    // Internal sub-screens replace the profile body in place. Reset retained
    // page scroll so their heading and first action stay inside the viewport.
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [screen])

  if (screen === 'privacy') {
    return (
      <Privacy
        lang={lang}
        model={model}
        ownerId={auth.user?.id ?? null}
        email={auth.user?.email ?? null}
        recoveryActive={auth.recoveryActive}
        onBack={() => setScreen('home')}
        onDelete={() => onNavigate('settings')}
      />
    )
  }
  if (screen === 'settings') return <Settings lang={lang} model={model} onBack={() => setScreen('home')} onAccount={() => onNavigate('settings')} onPrivacy={() => setScreen('privacy')} />

  const numerals = (n: number) => (ar ? n.toLocaleString('ar-EG') : String(n))

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-light min-h-screen bg-page px-4 pb-28 pt-3 text-ink-900">
      <div className="v2-screen-enter mx-auto w-full max-w-md space-y-5">
        <h1 className="pt-1 text-2xl font-black tracking-tight">{t('ملفك التدريبي', 'Your training profile')}</h1>

        {/* Earned-identity header — avatar · name · goal badge */}
        <section className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-5 shadow-card">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-beige text-2xl font-black text-ink-700">{model.user.initials}</span>
          <div className="min-w-0">
            <p className="truncate text-lg font-black">{model.user.displayName}</p>
            {model.trainingIdentity.goalLabel && (
              <span className="v2-bg-blue-soft v2-text-blue mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black">
                {t('الهدف', 'Goal')} · {model.trainingIdentity.goalLabel}
              </span>
            )}
          </div>
        </section>

        {/* Three stat blocks — real data only (RTL: تمرين · أيام متتالية · أرقام قياسية) */}
        <section className="grid grid-cols-3 gap-3">
          <Stat value={numerals(model.stats.workoutCount)} label={t('تمرين', 'Workouts')} />
          <Stat value={numerals(model.stats.streakDays)} label={t('أيام متتالية', 'Day streak')} />
          <Stat value={numerals(model.stats.prCount)} label={t('أرقام قياسية', 'PRs')} />
        </section>
        {!model.stats.hasData && (
          <p className="-mt-2 px-1 text-center text-[0.7rem] text-ink-500">{t('نحتاج بيانات أكثر — أكمل تمرينك الأول.', 'We need more data — complete your first workout.')}</p>
        )}

        {/* Program card */}
        <ProgramCard model={model} t={t} numerals={numerals} onOpen={() => onNavigate(model.program.onboarded ? 'workout' : 'setup')} />

        {/* Commitment heatmap — «الالتزام · آخر 10 أسابيع» */}
        <CommitmentHeatmap model={model} lang={lang} t={t} numerals={numerals} />

        {/* Rows */}
        <section className="space-y-2.5">
          <Row icon="LayoutGrid" label={t('القياسات والصور', 'Measurements & photos')} onClick={() => onNavigate('progress')} />
          <Row icon="Pill" label={t('الأدوية والمكمّلات', 'Supplements & meds')} onClick={() => onNavigate('settings')} />
          <Row icon="Settings" label={t('الإعدادات والخصوصية', 'Settings & privacy')} onClick={() => setScreen('settings')} />
        </section>

        {/* Qimmah+ — ONE quiet line at the base. No filled block, no paywall. */}
        {model.subscription.showQuietLine && (
          <p className="px-1 pt-1 text-center text-xs leading-relaxed text-ink-500">
            {model.subscription.text}
            {' — '}
            <button type="button" onClick={() => setScreen('settings')} className="font-bold text-ink-500 underline decoration-line underline-offset-2 transition-colors hover:text-ink-900">
              {model.subscription.cta}
            </button>
          </p>
        )}
      </div>
    </div>
  )
}

function ProgramCard({ model, t, numerals, onOpen }: { model: ProfileV2Model; t: (a: string, e: string) => string; numerals: (n: number) => string; onOpen: () => void }) {
  const { program } = model
  const sub = !program.onboarded
    ? t('أكمل الإعداد لبناء خطتك', 'Finish setup to build your plan')
    : program.daysPerWeek
      ? t(`الأسبوع ${numerals(program.weekOf)} من ${numerals(program.totalWeeks)} · ${numerals(program.daysPerWeek)} أيام/أسبوع`, `Week ${program.weekOf} of ${program.totalWeeks} · ${program.daysPerWeek} days/week`)
      : t(`الأسبوع ${numerals(program.weekOf)} من ${numerals(program.totalWeeks)}`, `Week ${program.weekOf} of ${program.totalWeeks}`)
  return (
    <button type="button" onClick={onOpen} className="v2-pressable flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-start hover:border-[color:var(--v2-blue)]">
      <span className="v2-bg-blue-soft v2-text-blue grid h-10 w-10 shrink-0 place-items-center rounded-xl"><Icon name="Dumbbell" className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black">{program.title}</span>
        <span className="mt-0.5 block text-xs text-ink-500">{sub}</span>
      </span>
      <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400 rtl:rotate-0 ltr:rotate-180" />
    </button>
  )
}

function CommitmentHeatmap({ model, lang, t, numerals }: { model: ProfileV2Model; lang: Lang; t: (a: string, e: string) => string; numerals: (n: number) => string }) {
  const ar = lang !== 'en'
  const active = model.commitment.weeks.filter((w) => w.count > 0).length
  const summary = model.commitment.hasData
    ? t(`تمرّنت في ${numerals(active)} من آخر ${numerals(COMMITMENT_WEEKS)} أسابيع`, `Trained in ${active} of the last ${COMMITMENT_WEEKS} weeks`)
    : t('لا تمارين مسجّلة بعد', 'No workouts logged yet')
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <p className="flex items-center justify-between gap-2">
        <span className="text-sm font-black">{t('الالتزام', 'Consistency')}</span>
        <span className="text-[0.7rem] font-bold text-ink-500">{t(`آخر ${numerals(COMMITMENT_WEEKS)} أسابيع`, `Last ${COMMITMENT_WEEKS} weeks`)}</span>
      </p>
      <div className="mt-3 flex items-center gap-1.5" role="img" aria-label={summary}>
        {model.commitment.weeks.map((w, i) => (
          <span key={i} aria-hidden="true" className={cn('h-7 flex-1 rounded-md', HEAT[w.level])} />
        ))}
      </div>
      <p className="mt-2 text-[0.7rem] text-ink-500" dir={ar ? 'rtl' : 'ltr'}>{summary}</p>
    </section>
  )
}

// NOTE: `primary` is a var()-based color, so the Tailwind `/opacity` shorthand
// renders transparent. Use element `opacity-*` utilities for the intensity ramp.
const HEAT: Record<CommitmentWeek['level'], string> = {
  0: 'bg-beige',
  1: 'v2-heat-1',
  2: 'v2-heat-2',
  3: 'v2-heat-3',
}

type ExportState = 'idle' | 'preparing' | 'success' | 'error'

function Privacy({ lang, model, ownerId, email, recoveryActive, onBack, onDelete }: { lang: Lang; model: ProfileV2Model; ownerId: string | null; email: string | null; recoveryActive: boolean; onBack: () => void; onDelete: () => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const copy = dataPortabilityCopy(lang)
  const [exportState, setExportState] = useState<ExportState>('idle')

  const exportData = async () => {
    if (exportState === 'preparing') return
    setExportState('preparing')
    try {
      const bundle = buildQimmahDataExport({ ownerId, email, recoveryActive })
      const result = await deliverQimmahDataExport(bundle)
      setExportState(result === 'cancelled' ? 'idle' : 'success')
    } catch {
      setExportState('error')
    }
  }

  return (
    <SubScreen title={t('الخصوصية والبيانات', 'Privacy & data')} onBack={onBack} lang={lang}>
      <section className="rounded-3xl border border-line bg-surface p-5">
        <h2 className="text-xl font-black">{t('بياناتك ملكك', 'Your data is yours')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">{t('نجمع الحد الأدنى فقط. كل التقديرات شفافة وقابلة للتعديل، ويمكنك تصدير أو حذف بياناتك في أي وقت.', 'We collect the minimum. Every estimate is transparent and editable, and you can export or delete your data anytime.')}</p>
      </section>
      <section className="mt-4 space-y-2.5">
        <InfoRow icon="BarChart3" title={t('تحليلات مجهولة', 'Anonymous analytics')} sub={t('لتحسين التطبيق فقط', 'To improve the app only')} state={model.privacy.analyticsAnonymousEnabled ? t('مفعّل', 'On') : t('مطفأ', 'Off')} />
        <InfoRow icon="Activity" title={t('مشاركة بيانات الصحة', 'Health sharing')} sub={t('غير مربوطة بعد', 'Not connected yet')} disabled />
        <button
          type="button"
          onClick={() => void exportData()}
          disabled={exportState === 'preparing'}
          aria-busy={exportState === 'preparing'}
          className="v2-pressable flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-start hover:border-[color:var(--v2-blue)] disabled:cursor-wait disabled:opacity-70"
        >
          <span className="v2-bg-blue-soft v2-text-blue grid h-9 w-9 shrink-0 place-items-center rounded-xl"><Icon name="Download" className="h-4.5 w-4.5" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{copy.actionTitle}</span><span className="block text-xs text-ink-500">{exportState === 'preparing' ? copy.preparing : copy.actionDescription}</span></span>
          <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400 rtl:rotate-0 ltr:rotate-180" />
        </button>
        {exportState === 'success' && (
          <p role="status" className="flex items-start gap-2 rounded-xl border border-[color:var(--v2-green)] bg-surface px-3 py-2.5 text-xs font-bold text-ink-900">
            <Icon name="CheckCircle2" className="v2-text-green mt-0.5 h-4 w-4 shrink-0" />
            <span>{copy.success}</span>
          </p>
        )}
        {exportState === 'error' && (
          <p role="alert" className="v2-error-panel flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold text-ink-900">
            <Icon name="AlertCircle" className="v2-error-icon mt-0.5 h-4 w-4 shrink-0" />
            <span>{copy.error}</span>
          </p>
        )}
        <p className="px-2 text-xs leading-relaxed text-ink-500">{copy.safetyNote}</p>
        <button type="button" onClick={onDelete} className="v2-error-panel v2-pressable flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-start">
          <span className="v2-error-icon grid h-9 w-9 shrink-0 place-items-center rounded-xl"><Icon name="Trash2" className="h-4.5 w-4.5" /></span>
          <span className="min-w-0 flex-1"><span className="v2-error-icon block text-sm font-bold">{t('حذف الحساب نهائيًا', 'Delete account permanently')}</span><span className="block text-xs text-ink-500">{t('لا يمكن التراجع · يتطلب تأكيدًا', 'Irreversible · requires confirmation')}</span></span>
          <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400 rtl:rotate-0 ltr:rotate-180" />
        </button>
      </section>
    </SubScreen>
  )
}

function Settings({ lang, model, onBack, onAccount, onPrivacy }: { lang: Lang; model: ProfileV2Model; onBack: () => void; onAccount: () => void; onPrivacy: () => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  return (
    <SubScreen title={t('الإعدادات والخصوصية', 'Settings & privacy')} onBack={onBack} lang={lang}>
      <Group title={t('المظهر', 'Appearance')}>
        <InfoRow icon="Sun" title={t('السمة', 'Theme')} sub={model.settings.appearance} disabled subNote={t('فاتح حاليًا', 'Light for now')} />
      </Group>
      <Group title={t('عام', 'General')}>
        <InfoRow icon="Globe" title={t('اللغة', 'Language')} sub={model.settings.language} state="" />
        <InfoRow icon="Ruler" title={t('الوحدات', 'Units')} sub={model.settings.units} state="" />
        <InfoRow icon="Calculator" title={t('الأرقام', 'Numerals')} sub={model.settings.numerals} state="" />
      </Group>
      <Group title={t('الإشعارات', 'Notifications')}>
        <InfoRow icon="Bell" title={t('التذكيرات', 'Reminders')} sub={t('تمرين · وجبات · مكملات', 'Workout · meals · supplements')} state="" onClick={onAccount} />
      </Group>
      <Group title={t('الخصوصية والبيانات', 'Privacy & data')}>
        <InfoRow icon="ShieldCheck" title={t('الخصوصية والبيانات', 'Privacy & data')} sub={t('التحكم في بياناتك', 'Control your data')} onClick={onPrivacy} />
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
    <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-light min-h-screen bg-page px-4 pb-28 pt-3 text-ink-900">
      <div className="v2-screen-enter mx-auto w-full max-w-md">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} aria-label={ar ? 'رجوع' : 'Back'} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface"><Icon name="ChevronRight" className="h-5 w-5 rtl:rotate-0 ltr:rotate-180" /></button>
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

function Stat({ value, label }: { value: string; label: string }) {
  return <div className="rounded-2xl border border-line bg-surface py-3 text-center"><p className="text-2xl font-black tabular-nums">{value}</p><p className="mt-0.5 text-[0.65rem] font-bold text-ink-500">{label}</p></div>
}
function Row({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="v2-pressable flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-start hover:border-[color:var(--v2-blue)]">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-beige text-ink-500"><Icon name={icon} className="h-4.5 w-4.5" /></span>
      <span className="flex-1 text-sm font-bold">{label}</span>
      <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400 rtl:rotate-0 ltr:rotate-180" />
    </button>
  )
}
function InfoRow({ icon, title, sub, state, disabled, subNote, onClick }: { icon: string; title: string; sub: string; state?: string; disabled?: boolean; subNote?: string; onClick?: () => void }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp type={onClick ? 'button' : undefined} onClick={onClick} className={cn('flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-start', disabled && 'opacity-70', onClick && 'v2-pressable hover:border-[color:var(--v2-blue)]')}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-beige text-ink-500"><Icon name={icon} className="h-4.5 w-4.5" /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{title}</span><span className="block text-xs text-ink-500">{subNote ?? sub}</span></span>
      {state != null && state !== '' && <span className="shrink-0 text-xs font-black text-ink-500">{state}</span>}
      {disabled && <span className="shrink-0 text-[0.65rem] font-bold text-ink-500">{subNote ? '' : sub}</span>}
    </Comp>
  )
}
