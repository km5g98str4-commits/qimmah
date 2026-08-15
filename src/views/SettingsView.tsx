import { useState, type ReactNode } from 'react'
import { AppNav, type AppView } from '@/components/AppNav'
import { Footer } from '@/components/Footer'
import { Icon } from '@/components/Icon'
import { DeleteAccountDialog } from '@/components/DeleteAccountDialog'
import { DataManagementPanel } from '@/components/DataManagementPanel'
import { setHashRoute } from '@/lib/appRoutes'
import { DeviceSettings } from '@/components/DeviceSettings'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { getSyncUiState } from '@/lib/syncService'
import { installGuideStrings } from '@/i18n/dict/installGuide'
import { isIOSSafari } from '@/lib/installState'
import { LanguageToggle } from '@/i18n'
import { useAuth } from '@/lib/authContext'
import { useCustomization } from '@/lib/customizationContext'
import { resetQimmah } from '@/lib/resetQimmah'
import { generatePlan } from '@/lib/planGenerator'
import { markPendingSync } from '@/lib/syncService'
import { BUILD_LABEL } from '@/lib/buildInfo'
import { settingsPreferencesStrings } from '@/i18n/dict/settingsPreferences'
import { formatNumber } from '@/lib/numberFormat'
import { useAccess } from '@/lib/access/useAccess'

/**
 * يترجم حالة المزامنة الحقيقية إلى جملة صادقة للمستخدم.
 *
 * لا يُدّعى «متزامن مع حسابك السحابي» إلا عند `state === 'synced'`، أي بعد أول
 * مزامنة ناجحة فعلًا (getSyncUiState لا يُرجع 'synced' قبل `lastSyncedAt`).
 * منقول كما هو من موجة صدق المزامنة — الشاشة عادت لتصميمها الكلاسيكي، والضمانة تبقى.
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
  onNavigate: (view: AppView) => void
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
  const auth = useAuth()
  const { customization, applyPlanEdit } = useCustomization()
  const { guard: guardPaid } = useAccess()
  const preferencesCopy = settingsPreferencesStrings[lang]
  // [CTO-65] البند ١ — نافذة حذف الحساب بتأكيد مكتوب.
  const [deleteOpen, setDeleteOpen] = useState(false)

  const badge: 'guest' | 'account' = auth.user ? 'account' : 'guest'

  // — البيانات: إعادة ضبط —
  const onReset = () => {
    if (window.confirm(t.settings.resetConfirm)) resetQimmah()
  }

  // — خطتي: إعادة توليد —
  /**
   * [REL-002] **مسار الحفظ الثالث** — وهو أوضحها أثرًا: يستدعي `generatePlan`
   * ويكتب خطة كاملة جديدة (أهداف · تمرين · تغذية · التزام · قياسات). العقد يسمّيه
   * حرفيًا: «حفظ إعدادات تنتج خطة جديدة». فلا يكفي حراسة محرّر «تعديل خطتي» وحده
   * ويُترك زرٌّ يُنتج خطة كاملة بلا سلطة.
   */
  const regenerateFromProfile = guardPaid('plan.saveEdit', () => {
    const g = generatePlan(customization.profile)
    applyPlanEdit({
      ...customization,
      targets: g.targets,
      workoutPlan: g.workoutPlan,
      routine: g.weeklySchedule,
      nutritionPlan: g.nutritionPlan,
      commitmentPlan: g.commitmentPlan,
      measurementPlan: g.measurementPlan,
    })
    markPendingSync()
  })

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

  // — الحساب: حالة + خروج —
  const accountStatus = !auth.configured
    ? t.auth.disabledTitle
    : auth.user
      ? syncNote(t, getSyncUiState())
      : t.auth.guestNote

  return (
    <div className="min-h-screen bg-page">
      <AppNav current="settings" lang={lang} badge={badge} onNavigate={onNavigate} />

      <main className="container-page space-y-6 py-8">
        <h1 className="text-2xl font-black text-ink-900">{t.settings.title}</h1>

        {/* 1) الحساب */}
        <SettingsGroup icon="User" title={t.settings.groupAccount}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span
                className={
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black ' +
                  (auth.user ? 'bg-primary-soft text-primary-c' : 'border border-line bg-surface text-ink-600')
                }
              >
                <Icon name={auth.user ? 'CheckCircle2' : 'User'} className="h-3.5 w-3.5" />
                {auth.user ? t.badge.account : t.badge.guest}
              </span>
              <div>
                {auth.displayName && <p className="text-sm font-bold text-ink-900">{auth.displayName}</p>}
                <p className="text-xs leading-relaxed text-ink-500">{accountStatus}</p>
              </div>
            </div>
            {auth.user ? (
              <button type="button" onClick={() => auth.signOut()} className="btn-ghost px-4 py-2 text-xs">
                <Icon name="LogOut" className="h-4 w-4" />
                {t.auth.logout}
              </button>
            ) : (
              <button type="button" onClick={onLogin} className="btn-primary px-4 py-2 text-xs">
                <Icon name="LogIn" className="h-4 w-4" />
                {t.auth.login}
              </button>
            )}
          </div>

          {/* [CTO-65] البند ١ — حذف الحساب داخل التطبيق (App Store 5.1.1(v)).
              الوجهة الحقيقية لزرّ «حذف الحساب نهائيًا» في شاشة الخصوصية، الذي كان
              يحوّل إلى هنا ولا يجد شيئًا. يُعرض داخل فرع auth.user حصرًا — الضيف
              لا حساب سحابيًا له، ومسح جهازه هو «إعادة الضبط» في مجموعة البيانات.

              ⚠️ عقد e2e-auth (run.mjs:303-315) يطابق الاسم المتاح «حذف الحساب»
              بـexact:true — فالوصف خارج الزرّ عمدًا لا داخله، وإلا صار الاسم
              المتاح «حذف الحساب يحذف حسابك…» وسقط العقد. */}
          {auth.user && (
            <div className="mt-4 border-t border-line pt-4" data-testid="settings-delete-account">
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-danger/40 px-4 py-3 text-sm font-bold text-danger transition-colors hover:bg-danger/10"
              >
                <Icon name="Trash2" className="h-4 w-4" />
                {t.auth.deleteAccount}
              </button>
              <p className="mt-2 text-xs leading-relaxed text-ink-500">{t.auth.deleteAccountDesc}</p>
            </div>
          )}
        </SettingsGroup>

        {/* 2) البيانات */}
        <SettingsGroup icon="Database" title={t.settings.groupData} testId="settings-group-data" collapsible>
          <DataManagementPanel lang={lang} uid={auth.user?.id ?? null} recoveryActive={auth.recoveryActive} />
          <div className="mt-3 border-t border-line pt-3">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-danger/40 px-4 py-2.5 text-sm font-bold text-danger transition-colors hover:bg-danger/10"
            >
              <Icon name="RotateCcw" className="h-4 w-4" />
              {t.settings.reset}
            </button>
          </div>
        </SettingsGroup>

        {/* 3) خطتي */}
        <SettingsGroup icon="Palette" title={t.settings.groupPlan}>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onEditPlan} className="btn-primary px-4 py-2.5 text-sm">
              <Icon name="Palette" className="h-4 w-4" />
              {t.settings.editPlan}
            </button>
            <button type="button" onClick={onRegenerate} className="btn-ghost px-4 py-2.5 text-sm">
              <Icon name="RotateCcw" className="h-4 w-4" />
              {t.settings.regenerate}
            </button>
            <button type="button" onClick={onSwitchToMachines} className="btn-ghost px-4 py-2.5 text-sm">
              <Icon name="Dumbbell" className="h-4 w-4" />
              {t.settings.switchMachines}
            </button>
          </div>
        </SettingsGroup>

        {/* 4) الخصوصية والثقة */}
        <SettingsGroup icon="ShieldCheck" title={t.settings.groupPrivacy}>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onOpenPrivacy} className="btn-ghost px-4 py-2.5 text-sm">
              <Icon name="Lock" className="h-4 w-4" />
              {t.settings.privacyLink}
            </button>
            <button type="button" onClick={onOpenTerms} className="btn-ghost px-4 py-2.5 text-sm">
              <Icon name="FileText" className="h-4 w-4" />
              {t.settings.termsLink}
            </button>
          </div>
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-gold-400/40 bg-gold-200/40 p-3 text-xs leading-relaxed text-ink-700">
            <Icon name="AlertTriangle" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
            {t.settings.healthDisclaimer}
          </p>
        </SettingsGroup>

        {/* 5) التطبيق والتنبيهات — تثبيت PWA + إذن التنبيهات (نسخة صادقة، حدود آيفون واضحة) */}
        <DeviceSettings lang={lang} />

        {/* 5.1) دليل «ثبّت التطبيق» — خطوات مكتوبة لكل منصّة (المكتشفة أولًا)، بلا صور خارجية. */}
        <InstallGuideSection lang={lang} />

        {/* 6) أدوات داخلية — مراجعة المنتجات. أداة طاقم داخلية فقط: مُقصاة تمامًا من حزمة
            الإنتاج الاستهلاكية (import.meta.env.DEV=false في البناء) فلا تظهر لأي مستخدم. */}
        {import.meta.env.DEV && (
          <SettingsGroup icon="Wrench" title={t.settings.groupDev}>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onOpenProductReview}
                className="btn-ghost justify-start px-4 py-2.5 text-sm"
              >
                <Icon name="ClipboardList" className="h-4 w-4" />
                {t.settings.devReviewProducts}
              </button>
              <p className="text-xs leading-relaxed text-ink-500">{t.settings.devReviewHint}</p>
            </div>
          </SettingsGroup>
        )}

        {/* 7) اللغة — تبديل حيّ عربي/English (يبدّل النص والاتجاه فورًا). */}
        <SettingsGroup icon="Globe" title={preferencesCopy.groupTitle}>
          <div className="flex flex-col gap-3">
            <LanguageToggle />
            <p className="text-xs leading-relaxed text-ink-500">{t.settings.languageHint}</p>
            <div className="border-t border-line pt-3" data-testid="settings-units-policy">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-beige text-primary-c">
                  <Icon name="Ruler" className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink-900">{preferencesCopy.unitsTitle}</p>
                  <p className="text-sm font-black text-ink-700">{preferencesCopy.unitsValue}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{preferencesCopy.unitsNote}</p>
                </div>
              </div>
            </div>
            <div className="border-t border-line pt-3" data-testid="settings-numbers-policy">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-beige text-primary-c">
                  <Icon name="Calculator" className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink-900">{preferencesCopy.numbersTitle}</p>
                  <p dir="ltr" data-testid="settings-numbers-sample" className="text-sm font-black tabular-nums text-ink-700">
                    {formatNumber(1234, lang)}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{preferencesCopy.numbersNote}</p>
                </div>
              </div>
            </div>
          </div>
        </SettingsGroup>

        {/* 8) عن التطبيق — إصدار البناء (BUILD_LABEL) + رابط «كيف نحسب أرقامك؟» */}
        <SettingsGroup icon="Info" title={t.settings.groupAbout}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-ink-700">{t.settings.versionLabel}</span>
              {/* معرّف البناء دائمًا LTR (لاتيني) حتى داخل الواجهة العربية */}
              <span dir="ltr" data-testid="settings-build-label" className="rounded-lg bg-beige px-2.5 py-1 font-mono text-xs font-bold text-ink-500">
                {BUILD_LABEL}
              </span>
            </div>
            <button type="button" onClick={onOpenCalc} data-testid="settings-calc-link" className="btn-ghost justify-start px-4 py-2.5 text-sm">
              <Icon name="Calculator" className="h-4 w-4" />
              {t.settings.calcLink}
            </button>
          </div>
        </SettingsGroup>

        {/* 9) الدعم — [CTO-009/WP-6]
            كان الدعم يُبلَغ من موضعين فقط: رابط ٣٢بكسل في الفوتر، ونافذة حذف
            الحساب. أي أن من يبحث عن مساعدة في «الإعدادات» لا يجد شيئًا.
            هنا صفّ صريح بالبريد نفسه، بهدف لمس ≥44بكسل، والبريد مكتوب ظاهرًا
            لمن يفضّل النسخ على فتح تطبيق بريد. */}
        <SettingsGroup icon="Mail" title={t.contact.title}>
          <div className="flex flex-col gap-3">
            <p className="text-xs leading-relaxed text-ink-500">{t.contact.intro}</p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-ink-700">{t.contact.emailLabel}</span>
              <span dir="ltr" className="select-all rounded-lg bg-beige px-2.5 py-1 font-mono text-xs font-bold text-ink-700">
                {t.contact.emailValue}
              </span>
            </div>
            <a
              href={`mailto:${t.contact.emailValue}`}
              data-testid="settings-support-email"
              className="btn-ghost min-h-[44px] justify-start px-4 text-sm"
            >
              <Icon name="Mail" className="h-4 w-4" />
              {t.contact.emailCta}
            </a>
            <button
              type="button"
              onClick={() => setHashRoute('contact')}
              data-testid="settings-support-page"
              className="btn-ghost min-h-[44px] justify-start px-4 text-sm"
            >
              <Icon name="MessageCircle" className="h-4 w-4" />
              {t.contact.reportCta}
            </button>
          </div>
        </SettingsGroup>
      </main>

      {deleteOpen && (
        <DeleteAccountDialog
          lang={lang}
          onClose={() => setDeleteOpen(false)}
          // «تواصل معنا» ليست ضمن AppView (dashboard|setup|settings) فتُفتح بمسار
          // الـhash مباشرةً — نفس وجهة رابط الفوتر أسفل هذه الشاشة (#/contact).
          onContact={() => setHashRoute('contact')}
        />
      )}

      <Footer />
    </div>
  )
}

/** بطاقة مجموعة إعدادات. */
function SettingsGroup({
  icon,
  title,
  testId,
  collapsible = false,
  children,
}: {
  icon: string
  title: string
  testId?: string
  collapsible?: boolean
  children: ReactNode
}) {
  if (collapsible) {
    return (
      <details className="group overflow-hidden rounded-2xl border border-line bg-surface shadow-card" data-testid={testId}>
        <summary className="flex min-h-[68px] cursor-pointer list-none items-center gap-2.5 px-6 py-4 [&::-webkit-details-marker]:hidden">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
            <Icon name={icon} className="h-4.5 w-4.5" />
          </span>
          <span className="min-w-0 flex-1 text-base font-black text-ink-900">{title}</span>
          <Icon name="ChevronDown" className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-line px-6 py-5">{children}</div>
      </details>
    )
  }

  return (
    <section className="card p-6" data-testid={testId}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary-c">
          <Icon name={icon} className="h-4.5 w-4.5" />
        </span>
        <h2 className="text-base font-black text-ink-900">{title}</h2>
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
    <SettingsGroup icon="Download" title={g.sectionTitle} testId="install-guide-section">
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
    </SettingsGroup>
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
