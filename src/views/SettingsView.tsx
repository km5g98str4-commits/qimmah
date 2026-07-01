import { useRef, type ReactNode } from 'react'
import { AppNav, type AppView } from '@/components/AppNav'
import { Footer } from '@/components/Footer'
import { Icon } from '@/components/Icon'
import { DeviceSettings } from '@/components/DeviceSettings'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { LanguageToggle } from '@/i18n'
import { useAuth } from '@/lib/authContext'
import { useCustomization } from '@/lib/customizationContext'
import { type Customization, getDefaultCustomization } from '@/lib/customization'
import { exportHistory, importHistory, type HistorySnapshot } from '@/lib/historyStore'
import { loadPreferences, savePreferences, type AppPreferences } from '@/lib/appPreferences'
import { resetQimmah } from '@/lib/resetQimmah'
import { generatePlan } from '@/lib/planGenerator'
import { markPendingSync } from '@/lib/syncService'

const EXPORT_VERSION = 2

interface QimmahExport {
  version: number
  exportedAt: string
  customization: Customization
  history: HistorySnapshot
  preferences: AppPreferences
}

interface SettingsViewProps {
  lang: Lang
  onNavigate: (view: AppView) => void
  onEditPlan: () => void
  onLogin: () => void
  onOpenPrivacy: () => void
  onOpenTerms: () => void
}

/** صفحة الإعدادات — مجموعات: الحساب / البيانات / خطتي / الخصوصية والثقة. (ليست تعديل الخطة) */
export function SettingsView({ lang, onNavigate, onEditPlan, onLogin, onOpenPrivacy, onOpenTerms }: SettingsViewProps) {
  const t = getStrings(lang)
  const auth = useAuth()
  const { customization, applyCustomization } = useCustomization()
  const fileRef = useRef<HTMLInputElement>(null)

  const badge: 'guest' | 'account' = auth.user ? 'account' : 'guest'

  // — البيانات: تصدير —
  const onExport = () => {
    const payload: QimmahExport = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      customization,
      history: exportHistory(),
      preferences: loadPreferences(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qimmah-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // — البيانات: استيراد —
  const onImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<QimmahExport> & Partial<Customization>
        if (!window.confirm(t.settings.importConfirm)) return
        const base = getDefaultCustomization()
        const cust = (parsed.customization ?? (parsed as Partial<Customization>)) as Partial<Customization>
        applyCustomization({
          ...base,
          ...cust,
          identity: { ...base.identity, ...(cust.identity ?? {}) },
          profile: { ...base.profile, ...(cust.profile ?? {}) },
          targets: { ...base.targets, ...(cust.targets ?? {}) },
        })
        if (parsed.history) importHistory(parsed.history)
        if (parsed.preferences) savePreferences({ ...loadPreferences(), ...parsed.preferences })
        markPendingSync()
        window.alert('تم استيراد نسختك بنجاح.')
      } catch {
        window.alert('تعذّرت قراءة الملف. تأكّد أنّه نسخة قِمّة صحيحة.')
      }
    }
    reader.readAsText(file)
  }

  // — البيانات: إعادة ضبط —
  const onReset = () => {
    if (window.confirm(t.settings.resetConfirm)) resetQimmah()
  }

  // — خطتي: إعادة توليد —
  const onRegenerate = () => {
    if (!window.confirm(t.settings.regenerateConfirm)) return
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
    window.alert('تم إعادة توليد خطتك من بياناتك الحالية.')
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
                  (auth.user ? 'bg-primary-soft text-primary-c' : 'border border-line bg-surface text-ink-600')
                }
              >
                <Icon name={auth.user ? 'CheckCircle2' : 'User'} className="h-3.5 w-3.5" />
                {auth.user ? t.badge.account : t.badge.guest}
              </span>
              <div>
                {auth.user && <p className="text-sm font-bold text-ink-900">{auth.user.email}</p>}
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
        </SettingsGroup>

        {/* 2) البيانات */}
        <SettingsGroup icon="Database" title={t.settings.groupData}>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onExport} className="btn-ghost px-4 py-2.5 text-sm">
              <Icon name="TrendingDown" className="h-4 w-4" />
              {t.settings.export}
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost px-4 py-2.5 text-sm">
              <Icon name="TrendingUp" className="h-4 w-4" />
              {t.settings.import}
            </button>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-danger/40 px-4 py-2.5 text-sm font-bold text-danger transition-colors hover:bg-danger/10"
            >
              <Icon name="RotateCcw" className="h-4 w-4" />
              {t.settings.reset}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onImport(f)
                e.target.value = ''
              }}
            />
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

        {/* 6) اللغة — تبديل حيّ عربي/English (يبدّل النص والاتجاه فورًا). */}
        <SettingsGroup icon="Globe" title={t.settings.groupLanguage}>
          <div className="flex flex-col gap-3">
            <LanguageToggle />
            <p className="text-xs leading-relaxed text-ink-500">{t.settings.languageHint}</p>
          </div>
        </SettingsGroup>
      </main>

      <Footer />
    </div>
  )
}

/** بطاقة مجموعة إعدادات. */
function SettingsGroup({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <section className="card p-6">
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
