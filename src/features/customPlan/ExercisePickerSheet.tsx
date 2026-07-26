import { useMemo, useState } from 'react'
import { Icon } from '@/components/Icon'
import { ExerciseName } from '@/components/ExerciseName'
import { ExerciseMedia } from '@/components/ExerciseMedia'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { exercises, getExercise } from '@/data/exercises'
import { machineCatalog, machineCatalogIdSet, type MachineGroupKey } from '@/data/machineCatalog'
import type { Exercise, Muscle } from '@/types/workout'
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

// أي مجموعة كتالوج تخدم كل رقاقة عضلة؟ (عضلات الأرجل التفصيلية → مجموعة «الأرجل»، البطن → abs).
const GROUP_FOR_MUSCLE: Partial<Record<Muscle, MachineGroupKey>> = {
  chest: 'chest',
  back: 'back',
  shoulders: 'shoulders',
  biceps: 'biceps',
  triceps: 'triceps',
  quads: 'legs',
  hamstrings: 'legs',
  glutes: 'legs',
  calves: 'legs',
  core: 'abs',
}

interface MachineRow {
  exercise: Exercise
  /** اسم الجهاز من الكتالوج (قد يختلف عن اسم التمرين). */
  nameAr: string
  nameEn: string
}
interface MachineSub {
  title: string
  rows: MachineRow[]
}
interface MachineSection {
  key: MachineGroupKey | 'accessories'
  title: string
  subs: MachineSub[]
}

/**
 * منتقي تمارين لباني الجدول المخصّص — بحث + فلتر عضلة + صورة/GIF مصغّرة لكل تمرين + نقر للإضافة.
 * P12: أجهزة الكتالوج أولًا دائمًا (مجموعة ← تصنيف فرعي بعناوين ثنائية اللغة)،
 * ثم التمارين الحرة أسفلها تحت قسم «تمارين حرة (متقدّم)».
 * ورقة سفلية على الجوال، بطاقة على الشاشات الأكبر. RTL بالهوية الداكنة.
 */
export function ExercisePickerSheet({ lang, onAdd, onClose }: ExercisePickerSheetProps) {
  const d = customPlanStrings[lang]
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<MuscleFilter>('all')
  const [justAdded, setJustAdded] = useState<Record<string, number>>({})

  const query = q.trim().toLowerCase()

  // — قسم الأجهزة: من الكتالوج المعتمد، مجموعة ← تصنيف فرعي — يتقدّم القائمة دائمًا.
  const machineSections = useMemo<MachineSection[]>(() => {
    const allowedGroup = muscle === 'all' ? null : GROUP_FOR_MUSCLE[muscle as Muscle]
    if (muscle !== 'all' && !allowedGroup) return [] // كارديو ونحوه: لا أجهزة كتالوج
    // أجهزة الذراعين/البطن ليست أساسية (قرار زياد P12) — تُجمَّع تحت عنوان «إضافات» أسفل الأساسيات.
    const ACCESSORY_GROUPS = new Set<MachineGroupKey>(['biceps', 'triceps', 'abs'])
    const primarySections: MachineSection[] = []
    const accessorySubs: MachineSub[] = []
    for (const group of machineCatalog) {
      if (allowedGroup && group.key !== allowedGroup) continue
      const subs: MachineSub[] = []
      for (const item of group.items) {
        const ex = getExercise(item.exerciseId)
        if (!ex) continue
        if (muscle !== 'all' && ex.primaryMuscle !== (muscle as Muscle)) continue
        if (query) {
          const haystack = `${ex.nameAr} ${ex.nameEn} ${item.nameAr} ${item.nameEn} ${(item.aliasesEn ?? []).join(' ')}`.toLowerCase()
          if (!haystack.includes(query)) continue
        }
        const subTitle = lang === 'en' ? item.subGroup.en : item.subGroup.ar
        const last = subs[subs.length - 1]
        const row: MachineRow = { exercise: ex, nameAr: item.nameAr, nameEn: item.nameEn }
        if (last && last.title === subTitle) last.rows.push(row)
        else subs.push({ title: subTitle, rows: [row] })
      }
      if (!subs.length) continue
      if (ACCESSORY_GROUPS.has(group.key)) accessorySubs.push(...subs)
      else primarySections.push({ key: group.key, title: lang === 'en' ? group.titleEn : group.titleAr, subs })
    }
    const sections = [...primarySections]
    if (accessorySubs.length) {
      sections.push({ key: 'accessories', title: customPlanStrings[lang].accessoriesSection, subs: accessorySubs })
    }
    return sections
  }, [lang, muscle, query])

  // — التمارين الحرة (كل ما ليس في الكتالوج) — قسم سفلي بعنوان واضح.
  const freeExercises = useMemo(() => {
    return exercises.filter((e) => {
      if (machineCatalogIdSet.has(e.id)) return false
      if (muscle !== 'all' && e.primaryMuscle !== (muscle as Muscle)) return false
      if (query && !`${e.nameAr} ${e.nameEn}`.toLowerCase().includes(query)) return false
      return true
    })
  }, [muscle, query])

  const machineCount = machineSections.reduce((n, s) => n + s.subs.reduce((m, sub) => m + sub.rows.length, 0), 0)
  const isEmpty = machineCount === 0 && freeExercises.length === 0

  const handleAdd = (id: string) => {
    onAdd(id)
    setJustAdded((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
  }

  const renderRow = (e: Exercise, machineName?: { nameAr: string; nameEn: string }) => {
    const added = (justAdded[e.id] ?? 0) > 0
    return (
      <li key={e.id} className="flex items-center gap-3 rounded-xl border border-line bg-page p-2.5">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line">
          <ExerciseMedia exerciseId={e.id} lang={lang} heightClass="h-14" hideChips variant="thumb" />
        </div>
        <div className="min-w-0 flex-1">
          <ExerciseName
            nameAr={machineName?.nameAr ?? e.nameAr}
            nameEn={machineName?.nameEn ?? e.nameEn}
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

        {/* القائمة: الأجهزة أولًا (مجموعة ← تصنيف فرعي)، ثم التمارين الحرة */}
        <div className="flex-1 overflow-y-auto p-3">
          {isEmpty ? (
            <p className="py-12 text-center text-sm text-ink-400">{d.noResults}</p>
          ) : (
            <div className="space-y-5">
              {machineSections.map((section) => (
                <section key={section.key}>
                  <h4 className="mb-2 flex items-center gap-1.5 text-sm font-black text-ink-900">
                    <Icon name="Dumbbell" className="h-4 w-4 text-primary-c" />
                    {section.title}
                  </h4>
                  <div className="space-y-3">
                    {section.subs.map((sub) => (
                      <div key={`${section.key}-${sub.title}`}>
                        <p className="mb-1.5 text-[11px] font-bold text-ink-500">{sub.title}</p>
                        <ul className="space-y-2">
                          {sub.rows.map((row) => renderRow(row.exercise, { nameAr: row.nameAr, nameEn: row.nameEn }))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              {freeExercises.length > 0 && (
                <section>
                  <h4 className="mb-2 flex items-center gap-1.5 border-t border-line pt-4 text-sm font-black text-ink-700">
                    <Icon name="AlertTriangle" className="h-4 w-4 text-gold-600" />
                    {d.freeWeightsSection}
                  </h4>
                  <ul className="space-y-2">{freeExercises.map((e) => renderRow(e))}</ul>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
