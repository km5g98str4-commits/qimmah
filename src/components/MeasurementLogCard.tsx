import { useMemo, useState } from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import { addLog, latestLog, loadLogs, trendFor } from '@/lib/measurementLog'
import { getMeasurementType, measurementTypes } from '@/data/measurementTypes'
import { useCustomization } from '@/lib/customizationContext'
import { getDayStamp } from '@/lib/today'
import type { MeasurementLog } from '@/types/progress'

// بطاقة تسجيل القياسات — الوزن أولًا، وبقية القياسات المختارة في خطة المستخدم.
//
// لماذا وُجدت: كان القارئ الوحيد للقياسات في تبويب التقدّم يعرض «سجّل وزنك من قسم
// القياسات» بينما لا يوجد أي مسار لتسجيلها في التطبيق الحقيقي (المُسجِّل الوحيد
// كان داخل شاشة العرض التوضيحي فقط). هذه البطاقة تغلق تلك الحلقة.
//
// كل قيمة تُحفظ في measurementLog (ومنه إلى المتجر التاريخي الدائم).

/** الحدود المعقولة لكل نوع — تمنع أرقامًا مستحيلة من دخول السجلّ. */
const LIMITS: Record<string, { min: number; max: number }> = {
  weightKg: { min: 25, max: 300 },
  waistCm: { min: 40, max: 200 },
  chestCm: { min: 50, max: 200 },
  armCm: { min: 15, max: 80 },
  thighCm: { min: 25, max: 110 },
  neckCm: { min: 20, max: 70 },
  hipCm: { min: 50, max: 200 },
  bodyFatPercent: { min: 3, max: 70 },
  sleepHours: { min: 0, max: 16 },
  energyLevel: { min: 0, max: 10 },
}

/** أنواع تُسجَّل من شاشات أخرى — لا نكرّرها هنا. */
const HANDLED_ELSEWHERE = new Set(['steps', 'mood'])

function parseNum(v: string): number {
  const m = String(v ?? '').match(/-?[\d.]+/)
  return m ? Number(m[0]) : NaN
}

/** رسالة خطأ للقيمة، أو undefined إن كانت مقبولة. */
function errorFor(typeId: string, raw: string): string | undefined {
  if (!raw.trim()) return undefined
  const n = parseNum(raw)
  if (Number.isNaN(n)) return 'أدخل رقمًا.'
  const lim = LIMITS[typeId]
  if (lim && (n < lim.min || n > lim.max)) return `القيمة المتوقّعة بين ${lim.min} و${lim.max}.`
  return undefined
}

interface MeasurementLogCardProps {
  className?: string
  /** يُستدعى بعد حفظ قياس ويمرّر القائمة المحدّثة — كي تُحدّث البطاقات القارئة نفسها فورًا. */
  onSaved?: (logs: MeasurementLog[]) => void
}

export function MeasurementLogCard({ className, onSaved }: MeasurementLogCardProps) {
  const { customization } = useCustomization()
  const [logs, setLogs] = useState<MeasurementLog[]>(() => loadLogs())
  const [values, setValues] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState(false)
  const [saved, setSaved] = useState(false)

  const latest = latestLog(logs)

  /** الأنواع المعروضة: ما اختاره المستخدم في خطته، والوزن دائمًا أولًا. */
  const shown = useMemo(() => {
    const selected = customization.measurementPlan?.selectedTypeIds ?? []
    const ids = selected.length ? selected : ['weightKg', 'waistCm', 'bodyFatPercent']
    const unique = ['weightKg', ...ids.filter((id) => id !== 'weightKg')]
    return unique
      .filter((id) => !HANDLED_ELSEWHERE.has(id))
      .map((id) => getMeasurementType(id) ?? measurementTypes.find((m) => m.id === id))
      .filter((m): m is NonNullable<typeof m> => !!m)
  }, [customization.measurementPlan])

  const visible = expanded ? shown : shown.slice(0, 1)
  const errors = shown.map((m) => errorFor(m.id, values[m.id] ?? '')).filter(Boolean)
  const filled = shown.filter((m) => (values[m.id] ?? '').trim() !== '')
  const canSave = filled.length > 0 && errors.length === 0

  const save = () => {
    if (!canSave) return
    const entry: MeasurementLog = {
      id: `m-${Date.now()}`,
      date: getDayStamp(),
      values: Object.fromEntries(filled.map((m) => [m.id, (values[m.id] ?? '').trim()])),
    }
    const next = addLog(entry)
    setLogs(next)
    setValues({})
    setSaved(true)
    onSaved?.(next)
    window.setTimeout(() => setSaved(false), 2200)
  }

  const weightTrend = trendFor(logs, 'weightKg')

  return (
    <div className={cn('card p-5', className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary-c">
            <Icon name="Ruler" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-black text-ink-900">سجّل قياساتك</p>
            <p className="text-[11px] font-bold text-ink-400">
              {latest ? `آخر تسجيل: ${latest.date}` : 'ما سجّلت أي قياس بعد'}
            </p>
          </div>
        </div>
        {latest?.values?.weightKg !== undefined && (
          <span className="flex items-center gap-1 rounded-lg bg-beige px-2.5 py-1 text-xs font-black text-ink-700">
            {latest.values.weightKg} كجم
            {weightTrend && (
              <Icon
                name={weightTrend === 'up' ? 'TrendingUp' : weightTrend === 'down' ? 'TrendingDown' : 'Minus'}
                className="h-3.5 w-3.5 text-primary-c"
              />
            )}
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {visible.map((m) => {
          const raw = values[m.id] ?? ''
          const err = errorFor(m.id, raw)
          return (
            <div key={m.id}>
              <label
                htmlFor={`measure-${m.id}`}
                className="mb-1 block text-xs font-bold text-ink-500"
              >
                {m.nameAr} {m.unit && <span className="text-ink-400">({m.unit})</span>}
              </label>
              <input
                id={`measure-${m.id}`}
                type="text"
                inputMode="decimal"
                dir="ltr"
                autoComplete="off"
                value={raw}
                onChange={(e) => setValues((p) => ({ ...p, [m.id]: e.target.value }))}
                placeholder="—"
                aria-invalid={!!err}
                aria-describedby={err ? `measure-${m.id}-err` : undefined}
                className={cn(
                  'min-h-[44px] w-full rounded-xl border bg-page px-3 py-2.5 text-start text-base text-ink-900 outline-none transition-colors',
                  err ? 'border-danger' : 'border-line focus:border-primary-c',
                )}
              />
              {err && (
                <p id={`measure-${m.id}-err`} className="mt-1 text-[11px] font-bold text-danger">
                  {err}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {shown.length > 1 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-1.5 text-xs font-bold text-ink-500 hover:text-ink-900"
        >
          <Icon name={expanded ? 'ChevronUp' : 'ChevronDown'} className="h-4 w-4" />
          {expanded ? 'إخفاء بقية القياسات' : `قياسات أخرى (${shown.length - 1})`}
        </button>
      )}

      <button
        type="button"
        onClick={save}
        disabled={!canSave}
        className="btn-primary mt-3 w-full py-3 text-sm disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Icon name="Check" className="h-4 w-4" />
        {saved ? 'تم الحفظ ✓' : 'احفظ قياس اليوم'}
      </button>

      <p className="mt-2 text-center text-[11px] text-ink-400">
        القياسات للمتابعة الشخصية فقط — ليست تشخيصًا طبيًا.
      </p>
    </div>
  )
}
