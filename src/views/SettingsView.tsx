import { useState, type ReactNode } from 'react'
import { AppNav, type AppView } from '@/components/AppNav'
import { Footer } from '@/components/Footer'
import { Icon } from '@/components/Icon'
import { DeviceSettings } from '@/components/DeviceSettings'
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
import { markPendingSync } from '@/lib/syncService'
import { BUILD_LABEL } from '@/lib/buildInfo'
import { NotificationSettingsPanel } from '@/components/NotificationSettingsPanel'
import { NativeSettingsPanel } from '@/components/NativeSettingsPanel'
import { NATIVE_SETTINGS_COPY } from '@/data/nativeSettings'

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
  const { customization, applyCustomization } = useCustomization()

  const badge: 'guest' | 'account' = auth.user ? 'account' : 'guest'

  // — البيانات: إعادة ضبط —
  // ملاحظة (QEA-001): التصدير/الاستيراد القديم غير المُتحقَّق أُزيل من هنا. المسار الوحيد
  // للتصدير/الاستيراد هو خطّ «بياناتي» المُتحقَّق في ProfileV2 (بوّابة إصدار + تحقّق شكل كل
  // متجر + إعادة ترميز للمالك الحالي + معاينة/تأكيد + نسخة احتياطية/تراجع). لا مسار يتخطّى التحقّق.
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
  const accountStatus = !auth.configured
    ? t.auth.disabledTitle
    : auth.user
      ? t.auth.cloudNote
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
                  (auth.user ? 'bg-primary-soft text-primary-c' : 'border border-line bg-surface text-ink-700')
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

          {/* حذف الحساب نهائيًا — إلزامي لمتاجر التطبيقات (يُعرض فقط لمستخدم مسجّل) */}
          {auth.user && (
            <div className="mt-4 border-t border-line pt-4">
              {!confirmDelete ? (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-danger/40 px-4 py-2 text-xs font-bold text-danger transition-colors hover:bg-danger/10"
                  >
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
                  <label htmlFor="delete-confirm" className="mt-3 block text-[11px] font-bold text-ink-500">
                    {t.auth.deleteConfirmHint}
                  </label>
                  <input
                    id="delete-confirm"
                    type="text"
                    value={deleteWord}
                    onChange={(e) => setDeleteWord(e.target.value)}
                    aria-label={t.auth.deleteConfirmHint}
                    autoComplete="off"
                    className="mt-1 w-full max-w-xs rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-900 outline-none focus:border-danger"
                  />
                  {/* فشل حذف مستخدم المصادقة — رسالة صادقة (لا ادّعاء نجاح) + مسار تواصل. */}
                  {deleteFailed && (
                    <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/[0.08] p-3 text-xs leading-relaxed text-ink-700">
                      <Icon name="AlertTriangle" className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                      <span>
                        {t.auth.deleteFailed}{' '}
                        <a href="#/contact" className="font-bold text-danger underline underline-offset-2">
                          {t.auth.deleteContactCta}
                        </a>
                      </span>
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={onDeleteAccount}
                      disabled={!canConfirmDelete}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-danger px-4 py-2 text-xs font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Icon name="Trash2" className="h-4 w-4" />
                      {deleting ? t.auth.deleting : deleteFailed ? t.auth.deleteRetry : t.auth.deleteConfirmCta}
                    </button>
                    <button
                      type="button"
                      onClick={cancelDelete}
                      disabled={deleting}
                      className="btn-ghost px-4 py-2 text-xs"
                    >
                      {t.auth.cancel}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </SettingsGroup>

        {/* 2) البيانات — التصدير/الاستيراد عبر «بياناتي» المُتحقَّق في الملف الشخصي (QEA-001) */}
        <SettingsGroup icon="Database" title={t.settings.groupData}>
          <p className="mb-3 text-xs leading-relaxed text-ink-500">
            {lang === 'ar'
              ? 'لتصدير أو استيراد نسخة كاملة من بياناتك، افتح «الملف الشخصي ← بياناتي». الاستيراد هناك يتحقّق من كل متجر ويحفظ نسخة احتياطية قابلة للتراجع.'
              : 'To export or import a full copy of your data, open “Profile → My data”. Import there validates every store and keeps an undoable backup.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-danger/40 px-4 py-2.5 text-sm font-bold text-danger transition-colors hover:bg-danger/10"
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

        {/* 4) التذكيرات المحلية — نفس المحرّك المالكـي الذي يستخدمه سطح v2. */}
        <SettingsGroup icon="Bell" title={lang === 'ar' ? 'التذكيرات' : 'Reminders'}>
          <NotificationSettingsPanel lang={lang} />
        </SettingsGroup>

        <SettingsGroup icon="Activity" title={NATIVE_SETTINGS_COPY[lang].group}>
          <NativeSettingsPanel lang={lang} />
        </SettingsGroup>

        {/* 5) الخصوصية والثقة */}
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
          {/* تحليلات مجهولة اختيارية (opt-out) — بلا أي بيانات شخصية، تُحفظ محليًا. */}
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
              className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${analyticsOn ? 'bg-primary' : 'bg-line'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${analyticsOn ? 'start-0.5' : 'end-0.5'}`} />
            </button>
          </div>
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-gold-400/40 bg-gold-200/40 p-3 text-xs leading-relaxed text-ink-700">
            <Icon name="AlertTriangle" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
            {t.settings.healthDisclaimer}
          </p>
        </SettingsGroup>

        {/* 6) التطبيق والتنبيهات — تثبيت PWA + حالة إمكانات الجهاز */}
        <DeviceSettings lang={lang} />

        {/* 6.1) دليل «ثبّت التطبيق» — خطوات مكتوبة لكل منصّة (المكتشفة أولًا)، بلا صور خارجية. */}
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
        <SettingsGroup icon="Globe" title={t.settings.groupLanguage}>
          <div className="flex flex-col gap-3">
            <LanguageToggle />
            <p className="text-xs leading-relaxed text-ink-500">{t.settings.languageHint}</p>
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
      </main>

      <Footer />
    </div>
  )
}

/** بطاقة مجموعة إعدادات. */
function SettingsGroup({
  icon,
  title,
  testId,
  children,
}: {
  icon: string
  title: string
  testId?: string
  children: ReactNode
}) {
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
