import { useState } from 'react'
import { Icon } from '../Icon'
import type { Lang } from '@/lib/appPreferences'
import { getMachineHowTo } from '@/data/machineHowTo'
import { workoutScreenStrings } from '@/i18n/dict/workoutScreen'

interface MachineHowToProps {
  exerciseId: string
  lang: Lang
}

/**
 * (P12) «طريقة استخدام الجهاز» — ٣–٤ خطوات مرقّمة للمبتدئ من machineHowTo،
 * قابلة للطي (مطوية افتراضيًا لتبقى البطاقة مضغوطة). لا تُرسم إن لم توجد خطوات.
 * استخدم key={exerciseId} عند التركيب ليعود الطي للوضع الافتراضي عند تبديل التمرين.
 */
export function MachineHowTo({ exerciseId, lang }: MachineHowToProps) {
  const [open, setOpen] = useState(false)
  const steps = getMachineHowTo(exerciseId)?.[lang]
  if (!steps || steps.length === 0) return null
  const d = workoutScreenStrings[lang]
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-line bg-page">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-bold text-ink-900"
      >
        <span className="flex items-center gap-2">
          <Icon name="ListChecks" className="h-4 w-4 text-primary-c" />
          {d.howToTitle}
        </span>
        <Icon name={open ? 'Minus' : 'Plus'} className="h-4 w-4 text-ink-400" />
      </button>
      {open && (
        <ol className="space-y-2 border-t border-line px-3 py-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs leading-relaxed text-ink-700">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-soft text-[10px] font-black text-primary-c">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
