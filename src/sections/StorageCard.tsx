import { useRef } from 'react'
import { Icon } from '@/components/Icon'
import { useCustomization } from '@/lib/customizationContext'
import { type Customization, getDefaultCustomization } from '@/lib/customization'

/** بطاقة صدق التخزين + تصدير/استيراد النسخة. */
export function StorageCard() {
  const { customization, applyCustomization } = useCustomization()
  const fileRef = useRef<HTMLInputElement>(null)

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
        /* تجاهل */
      }
    }
    reader.readAsText(file)
  }

  return (
    <section id="storage" className="section">
      <div className="container-page">
        <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
              <Icon name="ShieldCheck" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink-900">بياناتك محفوظة على هذا الجهاز فقط.</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
                إذا فتحت قِمّة من جهاز آخر، لن تظهر بياناتك إلا إذا صدّرتها واستوردتها.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={onExport} className="btn-ghost px-3 py-2 text-xs">
              <Icon name="TrendingDown" className="h-4 w-4" />
              تصدير نسختي
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost px-3 py-2 text-xs">
              <Icon name="TrendingUp" className="h-4 w-4" />
              استيراد نسخة
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = '' }} />
          </div>
        </div>
      </div>
    </section>
  )
}
