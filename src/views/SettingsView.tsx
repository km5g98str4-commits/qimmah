import { useState, type ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { DeviceSettings } from '@/components/DeviceSettings'
import { DataManagementPanel } from '@/components/DataManagementPanel'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { installGuideStrings } from '@/i18n/dict/installGuide'
import { isIOSSafari } from '@/lib/installState'
import { LanguageToggle } from '@/i18n'
import { useAuth } from '@/lib/authContext'
import { useCustomization } from '@/lib/customizationContext'
import { resetQimmah } from '@/lib/resetQimmah'
import { getConsent, setConsent } from '@/lib/analytics'
import { generatePlan } from '@/lib/planGenerator'
import { getSyncUiState, markPendingSync } from '@/lib/syncService'
import { BUILD_LABEL } from '@/lib/buildInfo'
import { NotificationSettingsPanel } from '@/components/NotificationSettingsPanel'
import { NativeSettingsPanel } from '@/components/NativeSettingsPanel'
import { NATIVE_SETTINGS_COPY } from '@/data/nativeSettings'
import type { AppRoute } from '@/lib/appRoutes'
import { eSettingsCopy } from '@/i18n/dict/eSettings'

/**
 * يترجم حالة المزامنة الحقيقية إلى جملة صادقة للمستخدم.
 *
 * لا يُدّعى «متزامن مع حسابك السحابي» إلا عند `state === 'synced'`، أي بعد أول
 * مزامنة ناجحة فعلًا (getSyncUiState لا يُرجع 'synced' قبل `lastSyncedAt`).
 */
function syncNote(t: ReturnType<typeof getStrings>, sync: ReturnType<typeof getSyncUiState>): string {
  if (sync.state === 'synced') return t.auth.cloudNote
  if (sync.state === 'attention') return t.auth.cloudNoteAttention
  if (sync.state === 'syncing') return t.auth.cloudNotePending
  // state === 'local'
  if (sync.reason === 'sync-disabled') return t.auth.cloudNoteLocalOnly
  return t.auth.cloudNoteNeverSynced
}

interface SettingsViewProps {
  lang: Lang
  onNavigate: (view: AppRoute) => void
  onEditPlan: () => void
  onLogin: () => void
  onOpenPrivacy: () => void
  onOpenTerms: () => void
  onOpenProductReview: () => void
  onOpenCalc: () => void
}

/** صفحة الإعدادات — مجموعات: الحساب / البيانات / خطتي / الخصوصية والثقة. (ليست تعديل الخطة) */
export function SettingsView({
  lang,
  onNavigate,
  onEditPlan,
  onLogin,
  onOpenPrivacy,
  onOpenTerms,
  onOpenProductReview,
  onOpenCalc,
}: SettingsViewProps) {
  const t = getStrings(lang)
  const e = eSettingsCopy[lang]
  const auth = useAuth()
  const { customization, applyCustomization } = useCustomization()

  // — البيانات: تصدير/استيراد يمرّان حصريًّا عبر <DataManagementPanel> (المسار المحصّن) —
  // المستورد القديم (FileReader + JSON.parse بلا تحقّق) أُزيل: كان يقبل إصدارًا غير مدعوم
  // وحقنًا من حساب آخر ويعرض «نجاحًا» دون تطبيق فعلي. QEA-001.
  // — البيانات: إعادة ضبط —
  const onReset = () => {
    if (window.confirm(t.settings.resetConfirm)) resetQimmah()
  }

  // — الحساب: حذف نهائي (Apple 5.1.1(v)) — تأكيد صريح ثم حذف سحابي best-effort + مسح محلي كامل —
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteWord, setDeleteWord] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteFailed, setDeleteFailed] = useState(false)
  const canConfirmDelete = deleteWord.trim() === t.auth.deleteConfirmWord && !deleting

  const onDeleteAccount = async () => {
    if (!canConfirmDelete) return
    setDeleting(true)
    setDeleteFailed(false)
    // الحذف يكتمل فقط عند تأكيد إزالة مستخدم المصادقة على الخادم (أو في الوضع المحلي/الضيف).
    // res.ok يعكس ذلك بصدق: لا نمسح ونُعيد التحميل (ما يُقرأ كنجاح) إلا عند اكتمال الحذف فعلًا.
    let ok = false
    try {
      const res = await auth.deleteAccount()
      ok = res.ok
    } catch {
      ok = false
    }
    if (ok) {
      // حذف مؤكَّد → مسح كامل لبيانات قِمّة على الجهاز ثم إعادة التحميل لشاشة الحساب.
      resetQimmah()
      return
    }
    // لم يُؤكَّد حذف مستخدم المصادقة — لا ندّعي نجاحًا. نُبقي الجلسة ونعرض خطأً صادقًا مع خيار
    // إعادة المحاولة أو التواصل (الجلسة ما زالت قائمة لأنّ authContext لم يُنهِها عند الفشل).
    setDeleting(false)
    setDeleteFailed(true)
  }

  const cancelDelete = () => {
    setConfirmDelete(false)
    setDeleteWord('')
    setDeleteFailed(false)
  }

  // — خطتي: إعادة توليد —
  const regenerateFromProfile = () => {
    const g = generatePlan(customization.profile)
    applyCustomization({
      ...customization,
      targets: g.targets,
      workoutPlan: g.workoutPlan,
      routine: g.weeklySchedule,
      nutritionPlan: g.nutritionPlan,
      commitmentPlan: g.commitmentPlan,
      measurementPlan: g.measurementPlan,
    })
    markPendingSync()
  }

  const onRegenerate = () => {
    if (!window.confirm(t.settings.regenerateConfirm)) return
    regenerateFromProfile()
    window.alert(t.settings.regenerateSuccess)
  }

  // — خطتي: التحويل لنسخة الأجهزة (P12) — اختياري: يعيد توليد الخطة التلقائية عبر المولّد
  // (أجهزة الكتالوج فقط في النادي). لا يمسّ الجدول المخصّص المحفوظ ولا سجلّ التمارين.
  const onSwitchToMachines = () => {
    if (!window.confirm(t.settings.switchMachinesConfirm)) return
    regenerateFromProfile()
    window.alert(t.settings.switchMachinesSuccess)
  }

  // — الخصوصية: موافقة التحليلات المجهولة (opt-out، تُحفظ محليًا فورًا) —
  const [analyticsOn, setAnalyticsOn] = useState(() => getConsent() === 'granted')
  const toggleAnalytics = () => {
    const next = !analyticsOn
    setAnalyticsOn(next)
    setConsent(next ? 'granted' : 'denied')
  }

  // — الحساب: حالة + خروج —
  // لا نعد المستخدم بمزامنة سحابية إلا إذا كانت حاصلة فعلًا. `VITE_SYNC_ENABLED`
  // مطفأة افتراضيًا، فالنص الثابت القديم («محفوظة على هذا الجهاز وعلى حسابك السحابي»)
  // كان يكذب على كل مستخدم مسجّل في التهيئة الافتراضية للشحن. المصدر الوحيد للحقيقة
  // هو getSyncUiState() — كان موجودًا بلا مستدعٍ واحد.
  const accountStatus = !auth.configured
    ? t.auth.disabledTitle
    : auth.user
      ? syncNote(t, getSyncUiState())
      : t.auth.guestNote

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-page">
      <header className="shrink-0 border-b border-line bg-surface" style={{ paddingTop: 'var(--safe-top)' }}>
        <div className="mx-auto flex min-h-16 w-full max-w-md items-center gap-3 px-4 py-2">
          <button type="button" onClick={() => onNavigate('profile')} className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-ink-700" aria-label={e.backToProfile}>
            <Icon name={lang === 'ar' ? 'ChevronRight' : 'ChevronLeft'} className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-black text-ink-900">{e.title}</h1>
            <p className="text-xs leading-relaxed text-ink-500">{e.subtitle}</p>
          </div>
        </div>
      </header>

      <main className="app-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4" style={{ paddingBottom: 'calc(var(--safe-bottom) + 1rem)' }}>
        <div className="mx-auto w-full max-w-md space-y-3" data-testid="e-settings-groups">
          <SettingsGroup
            icon="User"
            title={e.groups.account.title}
            description={e.groups.account.description}
            testId="settings-group-account"
            defaultOpen
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black ' +
                    (auth.user ? 'bg-primary-soft text-primary-c' : 'border border-line bg-surface text-ink-700')
                  }
                >
                  <Icon name={auth.user ? 'CheckCircle2' : 'User'} className="h-3.5 w-3.5" />
                  {auth.user ? t.badge.account : t.badge.guest}
                </span>
                <div className="min-w-0">
                  {auth.displayName && <p className="truncate text-sm font-bold text-ink-900">{auth.displayName}</p>}
                  <p className="text-xs leading-relaxed text-ink-500">{accountStatus}</p>
                </div>
              </div>
              {auth.user ? (
                <button type="button" onClick={() => auth.signOut()} className="btn-ghost min-h-11 px-4 py-2 text-xs">
                  <Icon name="LogOut" className="h-4 w-4" />
                  {t.auth.logout}
                </button>
              ) : (
                <button type="button" onClick={onLogin} className="btn-primary min-h-11 px-4 py-2 text-xs">
                  <Icon name="LogIn" className="h-4 w-4" />
                  {t.auth.login}
                </button>
              )}
            </div>

            {auth.user && (
              <div className="mt-4 border-t border-line pt-4">
                {!confirmDelete ? (
                  <>
                    <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-danger/40 px-4 py-2 text-xs font-bold text-danger transition-colors hover:bg-danger/10">
                      <Icon name="Trash2" className="h-4 w-4" />
                      {t.auth.deleteAccount}
                    </button>
                    <p className="mt-2 text-[11px] leading-relaxed text-ink-400">{t.auth.deleteAccountDesc}</p>
                  </>
                ) : (
                  <div className="rounded-xl border border-danger/40 bg-danger/[0.06] p-4">
                    <p className="flex items-center gap-1.5 text-sm font-black text-danger">
                      <Icon name="AlertTriangle" className="h-4 w-4" />
                      {t.auth.deleteConfirmTitle}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-ink-700">{t.auth.deleteConfirmBody}</p>
                    <label htmlFor="delete-confirm" className="mt-3 block text-[11px] font-bold text-ink-500">{t.auth.deleteConfirmHint}</label>
                    <input
                      id="delete-confirm"
                      type="text"
                      value={deleteWord}
                      onChange={(event) => setDeleteWord(event.target.value)}
                      aria-label={t.auth.deleteConfirmHint}
                      autoComplete="off"
                      className="mt-1 min-h-11 w-full max-w-xs rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-900 outline-none focus:border-danger"
                    />
                    {deleteFailed && (
                      <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/[0.08] p-3 text-xs leading-relaxed text-ink-700">
                        <Icon name="AlertTriangle" className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                        <span>
                          {t.auth.deleteFailed}{' '}
                          <a href="#/contact" className="font-bold text-danger underline underline-offset-2">{t.auth.deleteContactCta}</a>
                        </span>
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={onDeleteAccount} disabled={!canConfirmDelete} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-danger px-4 py-2 text-xs font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40">
                        <Icon name="Trash2" className="h-4 w-4" />
                        {deleting ? t.auth.deleting : deleteFailed ? t.auth.deleteRetry : t.auth.deleteConfirmCta}
                      </button>
                      <button type="button" onClick={cancelDelete} disabled={deleting} className="btn-ghost min-h-11 px-4 py-2 text-xs">{t.auth.cancel}</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </SettingsGroup>

          <SettingsGroup
            icon="SlidersHorizontal"
            title={e.groups.preferences.title}
            description={e.groups.preferences.description}
            testId="settings-group-preferences"
          >
            <SettingsSubsection icon="Palette" title={e.sections.plan}>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={onEditPlan} className="btn-primary min-h-11 px-4 py-2.5 text-sm">
                  <Icon name="Palette" className="h-4 w-4" />
                  {t.settings.editPlan}
                </button>
                <button type="button" onClick={onRegenerate} className="btn-ghost min-h-11 px-4 py-2.5 text-sm">
                  <Icon name="RotateCcw" className="h-4 w-4" />
                  {t.settings.regenerate}
                </button>
                <button type="button" onClick={onSwitchToMachines} className="btn-ghost min-h-11 px-4 py-2.5 text-sm">
                  <Icon name="Dumbbell" className="h-4 w-4" />
                  {t.settings.switchMachines}
                </button>
              </div>
            </SettingsSubsection>
            <SettingsSubsection icon="Globe" title={e.sections.language}>
              <div className="space-y-3">
                <LanguageToggle />
                <p className="text-xs leading-relaxed text-ink-500">{t.settings.languageHint}</p>
              </div>
            </SettingsSubsection>
            <SettingsSubsection icon="Activity" title={e.sections.healthDevice}>
              <p className="mb-4 text-xs font-bold text-ink-500">{NATIVE_SETTINGS_COPY[lang].group}</p>
              <NativeSettingsPanel lang={lang} />
            </SettingsSubsection>
          </SettingsGroup>

          <SettingsGroup
            icon="Bell"
            title={e.groups.notifications.title}
            description={e.groups.notifications.description}
            testId="settings-group-notifications"
          >
            <NotificationSettingsPanel lang={lang} />
          </SettingsGroup>

          <SettingsGroup
            icon="ShieldCheck"
            title={e.groups.privacyData.title}
            description={e.groups.privacyData.description}
            testId="settings-group-privacy-data"
          >
            <SettingsSubsection icon="Lock" title={e.sections.privacy}>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={onOpenPrivacy} className="btn-ghost min-h-11 px-4 py-2.5 text-sm">
                  <Icon name="Lock" className="h-4 w-4" />
                  {t.settings.privacyLink}
                </button>
                <button type="button" onClick={onOpenTerms} className="btn-ghost min-h-11 px-4 py-2.5 text-sm">
                  <Icon name="FileText" className="h-4 w-4" />
                  {t.settings.termsLink}
                </button>
              </div>
              <div className="mt-4 flex items-start justify-between gap-3 border-t border-line pt-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink-900">{t.settings.analyticsTitle}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-500">{t.settings.analyticsDesc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={analyticsOn}
                  aria-label={t.settings.analyticsToggle}
                  onClick={toggleAnalytics}
                  className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors ${analyticsOn ? 'bg-primary' : 'bg-line'}`}
                >
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${analyticsOn ? 'start-1' : 'end-1'}`} />
                </button>
              </div>
              <p className="mt-3 flex items-start gap-2 rounded-xl border border-gold-400/40 bg-gold-200/40 p-3 text-xs leading-relaxed text-ink-700">
                <Icon name="AlertTriangle" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                {t.settings.healthDisclaimer}
              </p>
            </SettingsSubsection>
            <SettingsSubsection icon="Database" title={e.sections.data}>
              <DataManagementPanel lang={lang} uid={auth.user?.id ?? null} recoveryActive={auth.recoveryActive} />
              <div className="mt-3 border-t border-line pt-3">
                <button type="button" onClick={onReset} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-danger/40 px-4 py-2.5 text-sm font-bold text-danger transition-colors hover:bg-danger/10">
                  <Icon name="RotateCcw" className="h-4 w-4" />
                  {t.settings.reset}
                </button>
              </div>
            </SettingsSubsection>
          </SettingsGroup>

          <SettingsGroup
            icon="Info"
            title={e.groups.about.title}
            description={e.groups.about.description}
            testId="settings-group-about"
          >
            <SettingsSubsection icon="Info" title={e.sections.app}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink-700">{t.settings.versionLabel}</span>
                <span dir="ltr" data-testid="settings-build-label" className="rounded-lg bg-beige px-2.5 py-1 font-mono text-xs font-bold text-ink-500">{BUILD_LABEL}</span>
              </div>
              <button type="button" onClick={onOpenCalc} data-testid="settings-calc-link" className="btn-ghost mt-3 min-h-11 w-full justify-start px-4 py-2.5 text-sm">
                <Icon name="Calculator" className="h-4 w-4" />
                {t.settings.calcLink}
              </button>
            </SettingsSubsection>
            <DeviceSettings lang={lang} embedded />
            <InstallGuideSection lang={lang} />
            {import.meta.env.DEV && (
              <SettingsSubsection icon="Wrench" title={e.sections.internal}>
                <button type="button" onClick={onOpenProductReview} className="btn-ghost min-h-11 justify-start px-4 py-2.5 text-sm">
                  <Icon name="ClipboardList" className="h-4 w-4" />
                  {t.settings.devReviewProducts}
                </button>
                <p className="mt-2 text-xs leading-relaxed text-ink-500">{t.settings.devReviewHint}</p>
              </SettingsSubsection>
            )}
          </SettingsGroup>
        </div>
      </main>
    </div>
  )
}

/** بطاقة مجموعة إعدادات. */
function SettingsGroup({
  icon,
  title,
  description,
  testId,
  defaultOpen = false,
  children,
}: {
  icon: string
  title: string
  description: string
  testId?: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details className="group overflow-hidden rounded-3xl border border-line bg-surface shadow-card" data-testid={testId} open={defaultOpen}>
      <summary className="flex min-h-[4.75rem] cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-c">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-black text-ink-900">{title}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{description}</span>
        </span>
        <Icon name="ChevronDown" className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-line px-4 pb-4 pt-4">{children}</div>
    </details>
  )
}

function SettingsSubsection({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="mb-3 flex items-center gap-2 text-ink-900">
        <Icon name={icon} className="h-4 w-4 text-primary-c" />
        <h3 className="text-sm font-black">{title}</h3>
      </div>
      {children}
    </section>
  )
}

/**
 * قسم «ثبّت التطبيق» — خطوات مصوّرة بالكلمات لآيفون (Safari) وأندرويد (Chrome/Edge).
 * تُعرض منصّة الجهاز المكتشفة أولًا، والأخرى بعدها (كلاهما متاح دائمًا). RTL-آمن وثنائي اللغة.
 */
function InstallGuideSection({ lang }: { lang: Lang }) {
  const g = installGuideStrings[lang]
  const iosFirst = isIOSSafari()
  const e = eSettingsCopy[lang]

  const ios = (
    <PlatformSteps
      icon="Share2"
      title={g.iosTitle}
      steps={g.iosSteps}
      badge={iosFirst ? g.currentDeviceBadge : undefined}
    />
  )
  const android = (
    <PlatformSteps
      icon="Smartphone"
      title={g.androidTitle}
      steps={g.androidSteps}
      badge={!iosFirst ? g.currentDeviceBadge : undefined}
    />
  )

  return (
    <SettingsSubsection icon="Download" title={e.sections.install}>
      <div data-testid="install-guide-section">
      <h4 className="mb-1 text-sm font-black text-ink-900">{g.sectionTitle}</h4>
      <p className="mb-4 text-xs leading-relaxed text-ink-500">{g.sectionIntro}</p>
      <div className="space-y-3">
        {iosFirst ? (
          <>
            {ios}
            {android}
          </>
        ) : (
          <>
            {android}
            {ios}
          </>
        )}
      </div>
      </div>
    </SettingsSubsection>
  )
}

/** بطاقة خطوات منصّة واحدة (قائمة مرقّمة). */
function PlatformSteps({
  icon,
  title,
  steps,
  badge,
}: {
  icon: string
  title: string
  steps: string[]
  badge?: string
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-beige text-primary-c">
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <h3 className="min-w-0 flex-1 break-words text-sm font-black text-ink-900">{title}</h3>
        {badge && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-black text-primary-c">
            <Icon name="CheckCircle2" className="h-3 w-3" />
            {badge}
          </span>
        )}
      </div>
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2.5 text-xs leading-relaxed text-ink-700">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-black text-white">
              {i + 1}
            </span>
            <span className="min-w-0 break-words text-start">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
