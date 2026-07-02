import { useMemo, useState } from 'react'
import { Icon } from '@/components/Icon'
import { ExerciseName } from '@/components/ExerciseName'
import { ExerciseMedia } from '@/components/ExerciseMedia'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { exercises } from '@/data/exercises'
import type { Muscle } from '@/types/workout'
import { customPlanStrings, type MuscleFilter } from './strings'

interface ExercisePickerSheetProps {
  lang: Lang
  /** يُستدعى عند إضافة تمرين — لا يُغلق المنتقي ليتمكّن المستخدم من إضافة عدّة تمارين. */
  onAdd: (exerciseId: string) => void
  onClose: () => void
}

// ترتيب فلاتر العضلات — مطابق لمنتقي المكتبة (يعتمد primaryMuscle التفصيلي).
const MUSCLE_ORDER: MuscleFilter[] = [
  'all',
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'cardio',
]

/**
 * منتقي تمارين لباني الجدول المخصّص — بحث + فلتر عضلة + صورة/GIF مصغّرة لكل تمرين + نقر للإضافة.
 * ورقة سفلية على الجوال، بطاقة على الشاشات الأكبر. RTL بالهوية الداكنة.
 */
export function ExercisePickerSheet({ lang, onAdd, onClose }: ExercisePickerSheetProps) {
  const d = customPlanStrings[lang]
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<MuscleFilter>('all')
  const [justAdded, setJustAdded] = useState<Record<string, number>>({})

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return exercises.filter((e) => {
      if (muscle !== 'all' && e.primaryMuscle !== (muscle as Muscle)) return false
      if (query && !`${e.nameAr} ${e.nameEn}`.toLowerCase().includes(query)) return false
      return true
    })
  }, [q, muscle])

  const handleAdd = (id: string) => {
    onAdd(id)
    setJustAdded((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-page/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-elevated sm:rounded-3xl">
        {/* رأس */}
        <div className="flex items-center justify-between border-b border-line p-4">
          <h3 className="text-base font-black text-ink-900">{d.pickerTitle}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={d.close}
            className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 hover:bg-beige"
          >
            <Icon name="X" className="h-5 w-5" />
          </button>
        </div>

        {/* بحث */}
        <div className="space-y-3 border-b border-line p-4">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-beige px-3">
            <Icon name="Search" className="h-4 w-4 text-ink-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={d.searchPlaceholder}
              aria-label={d.searchPlaceholder}
              className="w-full bg-transparent py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
            />
          </div>
          {/* فلتر العضلات — رقائق أفقية قابلة للتمرير */}
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {MUSCLE_ORDER.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMuscle(m)}
                aria-pressed={muscle === m}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                  muscle === m
                    ? 'border-primary-soft bg-primary text-white'
                    : 'border-line bg-beige text-ink-700 hover:text-ink-900',
                )}
              >
                {d.muscleLabels[m]}
              </button>
            ))}
          </div>
        </div>

        {/* القائمة */}
        <div className="flex-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink-400">{d.noResults}</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((e) => {
                const added = (justAdded[e.id] ?? 0) > 0
                return (
                  <li key={e.id} className="flex items-center gap-3 rounded-xl border border-line bg-page p-2.5">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line">
                      <ExerciseMedia exerciseId={e.id} heightClass="h-14" hideChips />
                    </div>
                    <div className="min-w-0 flex-1">
                      <ExerciseName
                        nameAr={e.nameAr}
                        nameEn={e.nameEn}
                        lang={lang}
                        className="truncate text-sm font-bold text-ink-900"
                        secondaryClassName="truncate text-[11px] text-ink-500"
                      />
                      <p className="truncate text-[11px] text-ink-400">
                        {e.equipment.join(' · ')} · {e.defaultSets}×{e.defaultReps}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAdd(e.id)}
                      className={cn(
                        'flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors',
                        added ? 'bg-primary-soft text-primary-c' : 'btn-primary',
                      )}
                    >
                      <Icon name={added ? 'Check' : 'Plus'} className="h-4 w-4" />
                      {added ? d.added : d.add}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
