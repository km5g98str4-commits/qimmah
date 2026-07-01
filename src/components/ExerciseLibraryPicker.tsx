import { useMemo, useState } from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { exercises } from '@/data/exercises'
import { ExerciseName } from './ExerciseName'
import type { ExEnvironment, ExLevel, Muscle } from '@/types/workout'

interface ExerciseLibraryPickerProps {
  lang: Lang
  onAdd: (exerciseId: string) => void
  onClose: () => void
}

const muscleOptions: { value: Muscle | 'all'; label: string }[] = [
  { value: 'all', label: 'كل العضلات' },
  { value: 'chest', label: 'صدر' },
  { value: 'back', label: 'ظهر' },
  { value: 'shoulders', label: 'أكتاف' },
  { value: 'biceps', label: 'بايسبس' },
  { value: 'triceps', label: 'ترايسبس' },
  { value: 'quads', label: 'أرجل (أمامي)' },
  { value: 'hamstrings', label: 'خلفي الفخذ' },
  { value: 'glutes', label: 'جلوتس' },
  { value: 'calves', label: 'سمانة' },
  { value: 'core', label: 'كور' },
  { value: 'cardio', label: 'كارديو' },
]
const envOptions: { value: ExEnvironment | 'all'; label: string }[] = [
  { value: 'all', label: 'أي مكان' },
  { value: 'gym', label: 'نادي' },
  { value: 'home', label: 'منزل' },
  { value: 'both', label: 'الاثنين' },
]
const levelOptions: { value: ExLevel | 'all'; label: string }[] = [
  { value: 'all', label: 'أي مستوى' },
  { value: 'beginner', label: 'مبتدئ' },
  { value: 'intermediate', label: 'متوسط' },
  { value: 'advanced', label: 'متقدّم' },
]

const selectClass =
  'rounded-lg border border-line bg-surface px-2.5 py-2 text-xs font-bold text-ink-700 focus:outline-none'

/** منتقي تمارين من المكتبة — بحث وفلاتر وزر إضافة وشرح. */
export function ExerciseLibraryPicker({ lang, onAdd, onClose }: ExerciseLibraryPickerProps) {
  const t = getStrings(lang).workout
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<Muscle | 'all'>('all')
  const [env, setEnv] = useState<ExEnvironment | 'all'>('all')
  const [level, setLevel] = useState<ExLevel | 'all'>('all')

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return exercises.filter((e) => {
      if (muscle !== 'all' && e.primaryMuscle !== muscle) return false
      if (level !== 'all' && e.level !== level) return false
      if (env !== 'all' && e.environment !== env && e.environment !== 'both') return false
      if (query && !`${e.nameAr} ${e.nameEn}`.toLowerCase().includes(query)) return false
      return true
    })
  }, [q, muscle, env, level])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-900/40 p-0 sm:items-center sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-3xl bg-surface shadow-card sm:rounded-3xl">
        {/* رأس */}
        <div className="flex items-center justify-between border-b border-line p-4">
          <h3 className="text-base font-bold text-ink-900">مكتبة التمارين</h3>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-beige">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </div>

        {/* بحث وفلاتر */}
        <div className="space-y-2 border-b border-line p-4">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-page px-3">
            <Icon name="Sparkles" className="h-4 w-4 text-ink-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث عن تمرين…"
              className="w-full bg-transparent py-2.5 text-sm text-ink-900 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select className={selectClass} value={muscle} onChange={(e) => setMuscle(e.target.value as Muscle | 'all')}>
              {muscleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className={selectClass} value={env} onChange={(e) => setEnv(e.target.value as ExEnvironment | 'all')}>
              {envOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className={selectClass} value={level} onChange={(e) => setLevel(e.target.value as ExLevel | 'all')}>
              {levelOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* القائمة */}
        <div className="flex-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-400">ما فيه نتائج مطابقة.</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((e) => (
                <li key={e.id} className="flex items-center gap-2 rounded-xl border border-line bg-page p-3">
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
                  <a
                    href={e.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-ink-500 hover:bg-beige"
                    aria-label={t.watch}
                  >
                    <Icon name="Globe" className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => onAdd(e.id)}
                    className={cn('btn-primary px-3 py-2 text-xs')}
                  >
                    <Icon name="Plus" className="h-4 w-4" />
                    أضف
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
