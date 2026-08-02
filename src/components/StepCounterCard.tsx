import { useState } from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import { progressScreenStrings } from '@/i18n/dict/progressScreen'
import type { Lang } from '@/lib/appPreferences'
import {
  loadStepGoal,
  saveStepGoal,
  clampGoal,
  getSteps,
  setSteps,
  weeklySteps,
  type DaySteps,
} from '@/lib/stepCounter'

// بطاقة عدّاد الخطوات — إدخال يدوي + حلقة تقدّم نحو هدف يومي + رسم أسبوعي مصغّر.
// لا مزامنة صحّية (مؤجَّلة) — الخطوات تُدخل يدويًا وتُحفظ محليًا لكل يوم.

const QUICK_ADD = [250, 500, 1000] as const

/** اسم اليوم المختصر من ختم YYYY-MM-DD. */
function shortDay(date: string, lang: Lang): string {
  const d = new Date(`${date}T12:00:00`)
  try {
    return new Intl.DateTimeFormat(lang, { weekday: 'short' }).format(d)
  } catch {
    return progressScreenStrings[lang].weekdayShort[d.getDay()]
  }
}

export function StepCounterCard({ className, lang }: { className?: string; lang: Lang }) {
  const dict = progressScreenStrings[lang]
  const [goal, setGoalState] = useState<number>(loadStepGoal)
  const [steps, setStepsState] = useState<number>(() => getSteps())
  const [draft, setDraft] = useState<string>(() => {
    const s = getSteps()
    return s ? String(s) : ''
  })
  const [week, setWeek] = useState<DaySteps[]>(weeklySteps)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalDraft, setGoalDraft] = useState<string>('')

  const pct = goal > 0 ? Math.min(1, steps / goal) : 0
  const reached = steps >= goal && steps > 0
  const remaining = Math.max(0, goal - steps)

  // حلقة التقدّم (SVG)
  const R = 58
  const STROKE = 11
  const C = 2 * Math.PI * R
  const dashOffset = C * (1 - pct)

  /** يطبّق قيمة خطوات مطلقة على اليوم ويُحدّث الحالة + الرسم. */
  function applySteps(value: number) {
    const saved = setSteps(value)
    setStepsState(saved)
    setDraft(saved ? String(saved) : '')
    setWeek(weeklySteps())
  }

  function onDraftChange(raw: string) {
    // نسمح بحقل فارغ أثناء الكتابة، ونحفظ الرقم الصالح مباشرة
    const cleaned = raw.replace(/[^\d]/g, '')
    setDraft(cleaned)
    const n = cleaned === '' ? 0 : Number(cleaned)
    if (Number.isFinite(n)) {
      const saved = setSteps(n)
      setStepsState(saved)
      setWeek(weeklySteps())
    }
  }

  function startEditGoal() {
    setGoalDraft(String(goal))
    setEditingGoal(true)
  }

  function commitGoal() {
    const next = clampGoal(goalDraft === '' ? goal : Number(goalDraft))
    saveStepGoal(next)
    setGoalState(next)
    setEditingGoal(false)
  }

  const weekMax = Math.max(goal, ...week.map((d) => d.steps), 1)

  return (
    <div className={cn('card p-5', className)}>
      {/* العنوان */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary-c">
            <Icon name="Footprints" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-black text-ink-900">{dict.stepsTodayTitle}</p>
            <p className="text-[11px] font-bold text-ink-400">{dict.manualEntry}</p>
          </div>
        </div>
        {/* الهدف اليومي — قابل للتعديل */}
        {editingGoal ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              inputMode="numeric"
              value={goalDraft}
              autoFocus
              min={1000}
              max={100000}
              step={500}
              onChange={(e) => setGoalDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && commitGoal()}
              aria-label={dict.goalDailyAria}
              className="w-20 rounded-lg border border-line bg-page px-2 py-1 text-sm text-ink-900 outline-none focus:border-primary-c"
            />
            <button
              type="button"
              onClick={commitGoal}
              aria-label={dict.saveGoalAria}
              className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white"
            >
              <Icon name="Check" className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEditGoal}
            className="flex items-center gap-1.5 rounded-lg bg-beige px-2.5 py-1.5 text-xs font-bold text-ink-700 hover:bg-line"
          >
            <Icon name="Target" className="h-3.5 w-3.5 text-primary-c" />
            {dict.goalPrefix} {goal.toLocaleString('en-US')}
            <Icon name="SlidersHorizontal" className="h-3 w-3 text-ink-400" />
          </button>
        )}
      </div>

      {/* الحلقة + الرقم */}
      <div className="flex flex-col items-center">
        <div className="relative grid place-items-center">
          <svg width="148" height="148" viewBox="0 0 148 148" className="-rotate-90">
            <circle cx="74" cy="74" r={R} fill="none" stroke="currentColor" strokeWidth={STROKE} className="text-beige" />
            <circle
              cx="74"
              cy="74"
              r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={dashOffset}
              className={cn('transition-[stroke-dashoffset] duration-500', reached ? 'text-success' : 'text-primary')}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-2xl font-black tabular-nums text-ink-900">{steps.toLocaleString('en-US')}</span>
            <span className="text-[11px] font-bold text-ink-400">{dict.ofGoalPrefix} {goal.toLocaleString('en-US')}</span>
            <span className={cn('mt-0.5 text-[11px] font-black', reached ? 'text-success' : 'text-primary-c')}>
              {Math.round(pct * 100)}%
            </span>
          </div>
        </div>

        {/* رسالة تحفيزية صادقة بلا أحكام */}
        <p className="mt-2 text-center text-xs font-bold text-ink-500">
          {reached
            ? dict.goalReached
            : `${dict.remainingPrefix ? `${dict.remainingPrefix} ` : ''}${remaining.toLocaleString('en-US')} ${dict.stepsRemainingSuffix}`}
        </p>
      </div>

      {/* الإدخال اليدوي + إضافة سريعة */}
      <div className="mt-4 flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={draft}
          placeholder="0"
          onChange={(e) => onDraftChange(e.target.value)}
          aria-label={dict.stepsInputAria}
          className="w-full rounded-xl border border-line bg-page px-3 py-2.5 text-center text-base font-bold text-ink-900 outline-none focus:border-primary-c"
        />
        <button
          type="button"
          onClick={() => applySteps(0)}
          aria-label={dict.resetStepsAria}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line text-ink-500 hover:bg-beige"
        >
          <Icon name="RotateCcw" className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {QUICK_ADD.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => applySteps(steps + q)}
            className="flex items-center justify-center gap-1 rounded-xl bg-primary-soft py-2 text-xs font-black text-primary-c hover:brightness-95"
          >
            <Icon name="Plus" className="h-3.5 w-3.5" />
            {q.toLocaleString('en-US')}
          </button>
        ))}
      </div>

      {/* الرسم الأسبوعي المصغّر */}
      <div className="mt-5 border-t border-line pt-4">
        <p className="mb-2 text-[11px] font-bold text-ink-500">{dict.last7Days}</p>
        <div className="flex items-end justify-between gap-1.5" style={{ height: 64 }}>
          {week.map((d, i) => {
            const isToday = i === week.length - 1
            const h = Math.max(4, Math.round((d.steps / weekMax) * 56))
            const hitGoal = d.steps >= goal && d.steps > 0
            return (
              <div key={d.date} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${d.steps.toLocaleString('en-US')} ${dict.stepsUnit}`}>
                <div
                  className={cn(
                    'w-full max-w-[22px] rounded-t-md transition-all',
                    d.steps === 0 ? 'bg-line' : hitGoal ? 'bg-success' : isToday ? 'bg-primary' : 'bg-primary/45',
                  )}
                  style={{ height: h }}
                />
                <span className={cn('text-[9px]', isToday ? 'font-black text-ink-700' : 'text-ink-400')}>{shortDay(d.date, lang)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
