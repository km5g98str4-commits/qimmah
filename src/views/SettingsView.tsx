import { useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { Footer } from '@/components/Footer'
import { useCustomization } from '@/lib/customizationContext'
import { useAuth } from '@/lib/authContext'
import { isGuest } from '@/lib/appMode'
import { type Customization, getDefaultCustomization } from '@/lib/customization'
import { generatePlan } from '@/lib/planGenerator'
import { resetQimmah } from '@/lib/resetQimmah'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'

interface SettingsViewProps {
  lang: Lang
  onBack: () => void
  onOpenSetup: () => void
  onOpenPrivacy: () => void
  onOpenTerms: () => void
  onLogin: () => void
  onLogout: () => void | Promise<void>
}

/** عرض الإعدادات — حساب/بيانات/خطة/خصوصية في مجموعات منفصلة (لا يفتح الإعداد تلقائيًا). */
export function SettingsView({
  lang,
  onBack,
  onOpenSetup,
  onOpenPrivacy,
  onOpenTerms,
  onLogin,
  onLogout,
}: SettingsViewProps) {
  const t = getStrings(lang).account
  const { customization, applyCustomization } = useCustomization()
  const auth = useAuth()
  const guest = isGuest()
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmRegen, setConfirmRegen] = useState(false)

  const onExport = () => {
    const blob = new Blob([JSON.stringify(customization, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'qimmah-plan.json'
    a.click()
    URL.revokeObjectURL(url)
  }
  const onImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const p = JSON.parse(String(reader.result)) as Partial<Customization>
        const base = getDefaultCustomization()
        applyCustomization({ ...base, ...p, profile: { ...base.profile, ...(p.profile ?? {}) }, targets: { ...base.targets, ...(p.targets ?? {}) } })
      } catch {
        /* ملف غير صالح — تجاهل */
      }
    }
    reader.readAsText(file)
  }

  // إعادة توليد الخطة من الملف الشخصي الحالي (يستبدل التمرين/التغذية/الالتزامات/القياسات).
  const regenerate = () => {
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
    setConfirmRegen(false)
  }

  return (
    <div className="min-h-screen bg-page">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-900 text-white">
        <div className="container-page flex h-14 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white shadow-glow">
              <Icon name="Settings" className="h-5 w-5" />
            </span>
            <h1 className="text-lg font-black text-white">{getStrings(lang).nav.settings}</h1>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icon name="Home" className="h-4 w-4" />
            {getStrings(lang).nav.home}
          </button>
        </div>
      </header>

      <main className="container-page space-y-10 py-10">
        {/* 1) الحساب */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-ink-900">
            <Icon name="User" className="h-4 w-4 text-primary-c" />
            الحساب
          </h2>
          <div className="card p-6">
            {auth.user ? (
              <>
                <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
                  <Icon name="Cloud" className="h-4 w-4 text-success" />
                  {t.signedInAs} <span dir="ltr" className="text-primary-c">{auth.user.email}</span>
                </p>
                <p className="mt-1 text-xs text-ink-500">{t.cloudOn}</p>
                <button type="button" onClick={() => onLogout()} className="btn-ghost mt-4 px-4 py-2 text-xs">
                  <Icon name="LogOut" className="h-4 w-4" />
                  {t.logout}
                </button>
              </>
            ) : (
              <>
                <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
                  <Icon name="Smartphone" className="h-4 w-4 text-ink-500" />
                  {guest ? t.badgeGuest : 'بلا حساب'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-500">
                  {auth.configured ? t.guestLimit : t.cloudDisabled}
                </p>
                <button type="button" onClick={onLogin} className="btn-primary mt-4 px-4 py-2 text-xs">
                  <Icon name="LogIn" className="h-4 w-4" />
                  {auth.configured ? t.login : t.account}
                </button>
              </>
            )}
          </div>
        </section>

        {/* 2) البيانات */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-ink-900">
            <Icon name="Database" className="h-4 w-4 text-primary-c" />
            البيانات
          </h2>
          <div className="card p-6">
            <p className="text-sm font-bold text-ink-900">نسخة احتياطية على هذا الجهاز.</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">
              صدّر نسختك للاحتفاظ بها أو نقلها لجهاز آخر. الاستيراد يستبدل بياناتك الحالية.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={onExport} className="btn-ghost px-3 py-2 text-xs">
                <Icon name="Download" className="h-4 w-4" />
                تصدير نسخة احتياطية
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost px-3 py-2 text-xs">
                <Icon name="TrendingUp" className="h-4 w-4" />
                استيراد نسخة
              </button>
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = '' }} />
            </div>

            {/* إعادة ضبط البيانات */}
            <div className="mt-6 border-t border-line pt-5">
              <p className="text-sm font-bold text-ink-900">إعادة ضبط البيانات</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">
                يحذف خطتك وبياناتك المحفوظة على هذا الجهاز. لا يمكن التراجع — صدّر نسختك أولًا.
              </p>
              {!confirmReset ? (
                <button type="button" onClick={() => setConfirmReset(true)} className="btn-ghost mt-3 px-4 py-2 text-xs text-danger">
                  <Icon name="RotateCcw" className="h-4 w-4" />
                  إعادة ضبط البيانات
                </button>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-danger">متأكد؟ سيُحذف كل شيء.</span>
                  <button type="button" onClick={resetQimmah} className="btn-primary px-4 py-2 text-xs">نعم، احذف</button>
                  <button type="button" onClick={() => setConfirmReset(false)} className="btn-ghost px-4 py-2 text-xs">إلغاء</button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 3) خطتي */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-ink-900">
            <Icon name="Target" className="h-4 w-4 text-primary-c" />
            خطتي
          </h2>
          <div className="card p-6">
            <p className="text-sm font-bold text-ink-900">عدّل خطتك أو أعد توليدها.</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">
              «تعديل خطتي» يفتح محرّر الخطة. «إعادة توليد الخطة» يبني تمرينك وتغذيتك من بياناتك الحالية.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={onOpenSetup} className="btn-primary px-4 py-2 text-xs">
                <Icon name="Palette" className="h-4 w-4" />
                تعديل خطتي
              </button>
              {!confirmRegen ? (
                <button type="button" onClick={() => setConfirmRegen(true)} className="btn-ghost px-4 py-2 text-xs">
                  <Icon name="Wand2" className="h-4 w-4" />
                  إعادة توليد الخطة
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-ink-700">سيُستبدل التمرين والتغذية. متأكد؟</span>
                  <button type="button" onClick={regenerate} className="btn-primary px-4 py-2 text-xs">نعم، أعد التوليد</button>
                  <button type="button" onClick={() => setConfirmRegen(false)} className="btn-ghost px-4 py-2 text-xs">إلغاء</button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 4) الخصوصية والثقة */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-ink-900">
            <Icon name="ShieldCheck" className="h-4 w-4 text-primary-c" />
            الخصوصية والثقة
          </h2>
          <div className="card p-6">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onOpenPrivacy} className="btn-ghost px-3 py-2 text-xs">
                <Icon name="ShieldCheck" className="h-4 w-4" />
                سياسة الخصوصية
              </button>
              <button type="button" onClick={onOpenTerms} className="btn-ghost px-3 py-2 text-xs">
                <Icon name="FileText" className="h-4 w-4" />
                شروط الاستخدام
              </button>
            </div>
            <p className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-page p-3 text-[11px] leading-relaxed text-ink-500">
              <Icon name="AlertTriangle" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              قِمّة أداة لتنظيم تمرينك وتغذيتك، وليست بديلًا عن استشارة طبية. راجع مختصًا قبل أي تغيير كبير في التمرين أو الدواء.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
