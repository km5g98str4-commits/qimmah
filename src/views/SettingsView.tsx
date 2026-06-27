import { useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { Footer } from '@/components/Footer'
import { useCustomization } from '@/lib/customizationContext'
import { type Customization, getDefaultCustomization } from '@/lib/customization'
import { resetQimmah } from '@/lib/resetQimmah'

interface SettingsViewProps {
  onBack: () => void
  onOpenSetup: () => void
  onOpenPrivacy: () => void
  onOpenTerms: () => void
}

interface SettingRow {
  icon: string
  title: string
  desc: string
}

const PLAN_SECTIONS: SettingRow[] = [
  { icon: 'Users', title: 'بياناتي الأساسية', desc: 'الاسم، العمر، الطول، الوزن، الجنس.' },
  { icon: 'Target', title: 'هدفي', desc: 'هدفك (تنشيف/تضخيم/ثبات) والوزن المستهدف.' },
  { icon: 'CalendarDays', title: 'جدولي', desc: 'أيام التمرين والتقسيمة الأسبوعية.' },
  { icon: 'Salad', title: 'تغذيتي', desc: 'أهداف السعرات والماكروز ووجباتك.' },
  { icon: 'Pill', title: 'مكملاتي وأدويتي', desc: 'متابعة المكملات والأدوية (بلا توصية جرعات).' },
  { icon: 'Ruler', title: 'القياسات', desc: 'الوزن والمحيطات وما تتابعه.' },
]

/** عرض الإعدادات — مدخل واضح لإدارة الخطة والبيانات والخصوصية (بلا فرض إعادة الإعداد). */
export function SettingsView({ onBack, onOpenSetup, onOpenPrivacy, onOpenTerms }: SettingsViewProps) {
  const { customization, applyCustomization } = useCustomization()
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)

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

  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-line bg-surface">
        <div className="container-page flex items-center justify-between py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white">
              <Icon name="Settings" className="h-5 w-5" />
            </span>
            <h1 className="text-lg font-black text-ink-900">الإعدادات</h1>
          </div>
          <button type="button" onClick={onBack} className="btn-ghost px-4 py-2 text-xs">
            <Icon name="ChevronLeft" className="h-4 w-4 rtl:rotate-180" />
            رجوع
          </button>
        </div>
      </header>

      <main className="container-page py-10">
        {/* أقسام الخطة — كل قسم يفتح مركز التعديل (وليس الإعداد الأولي) */}
        <h2 className="mb-4 text-sm font-black text-ink-900">خطّتي وبياناتي</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLAN_SECTIONS.map((s) => (
            <button
              key={s.title}
              type="button"
              onClick={onOpenSetup}
              className="card flex items-start gap-3 p-5 text-start transition-colors hover:border-primary-c"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
                <Icon name={s.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink-900">{s.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{s.desc}</span>
              </span>
            </button>
          ))}
        </div>

        {/* الخصوصية والبيانات */}
        <h2 className="mb-4 mt-10 text-sm font-black text-ink-900">الخصوصية والبيانات</h2>
        <div className="card p-6">
          <p className="text-sm font-bold text-ink-900">بياناتك محفوظة على هذا الجهاز.</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-500">
            صدّر نسختك للاحتفاظ بها أو نقلها لجهاز آخر. الاستيراد يستبدل بياناتك الحالية.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={onExport} className="btn-ghost px-3 py-2 text-xs">
              <Icon name="Download" className="h-4 w-4" />
              تصدير نسختي
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost px-3 py-2 text-xs">
              <Icon name="TrendingUp" className="h-4 w-4" />
              استيراد نسخة
            </button>
            <button type="button" onClick={onOpenPrivacy} className="btn-ghost px-3 py-2 text-xs">
              <Icon name="ShieldCheck" className="h-4 w-4" />
              سياسة الخصوصية
            </button>
            <button type="button" onClick={onOpenTerms} className="btn-ghost px-3 py-2 text-xs">
              <Icon name="FileText" className="h-4 w-4" />
              شروط الاستخدام
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = '' }} />
          </div>
        </div>

        {/* إعادة بناء الخطة بالكامل */}
        <h2 className="mb-4 mt-10 text-sm font-black text-ink-900">إعادة بناء الخطة بالكامل</h2>
        <div className="card border-danger/30 p-6">
          <p className="text-sm font-bold text-ink-900">إعادة ضبط قِمّة من البداية</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-500">
            يحذف خطتك وبياناتك المحفوظة على هذا الجهاز ويبدأ من جديد. لا يمكن التراجع — صدّر نسختك أولًا إذا رغبت.
          </p>
          {!confirmReset ? (
            <button type="button" onClick={() => setConfirmReset(true)} className="btn-ghost mt-4 px-4 py-2 text-xs text-danger">
              <Icon name="RotateCcw" className="h-4 w-4" />
              إعادة بناء الخطة بالكامل
            </button>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-danger">متأكد؟ سيُحذف كل شيء.</span>
              <button type="button" onClick={resetQimmah} className="btn-primary px-4 py-2 text-xs">نعم، أعد الضبط</button>
              <button type="button" onClick={() => setConfirmReset(false)} className="btn-ghost px-4 py-2 text-xs">إلغاء</button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
