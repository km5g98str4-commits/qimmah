import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { ExerciseDetail } from '@/components/ExerciseDetail'
import { ExerciseName } from '@/components/ExerciseName'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { libraryStrings, type LibraryStrings } from '@/i18n/dict/library'
import { exercises, getExercise, targetMuscleAr } from '@/data/exercises'
import { getExerciseMedia } from '@/data/exerciseMedia'
import { getExerciseGif } from '@/data/exerciseGifs'
import { machineCatalog } from '@/data/machineCatalog'
import type { Muscle } from '@/types/workout'

interface ExerciseLibraryViewProps {
  lang: Lang
}

const MUSCLE_FILTERS: { value: Muscle | 'all'; key: keyof LibraryStrings }[] = [
  { value: 'all', key: 'muscleAll' },
  { value: 'chest', key: 'muscleChest' },
  { value: 'back', key: 'muscleBack' },
  { value: 'shoulders', key: 'muscleShoulders' },
  { value: 'biceps', key: 'muscleBiceps' },
  { value: 'triceps', key: 'muscleTriceps' },
  { value: 'quads', key: 'muscleQuads' },
  { value: 'hamstrings', key: 'muscleHamstrings' },
  { value: 'glutes', key: 'muscleGlutes' },
  { value: 'calves', key: 'muscleCalves' },
  { value: 'core', key: 'muscleCore' },
  { value: 'cardio', key: 'muscleCardio' },
]

const EQUIP_KEY: Record<string, keyof LibraryStrings> = {
  barbell: 'equipBarbell',
  dumbbell: 'equipDumbbell',
  machine: 'equipMachine',
  cable: 'equipCable',
  bodyweight: 'equipBodyweight',
  bench: 'equipBench',
  kettlebell: 'equipKettlebell',
  smith: 'equipSmith',
  'ez-bar': 'equipEzBar',
}

function equipLabel(eq: string, d: LibraryStrings): string {
  const k = EQUIP_KEY[eq]
  return k ? d[k] : eq
}

/** عرض مكتبة التمارين — بحث + فلاتر + ترتيب أبجدي + فتح تفاصيل التمرين. */
export function ExerciseLibraryView({ lang }: ExerciseLibraryViewProps) {
  const d = libraryStrings[lang]
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<Muscle | 'all'>('all')
  const [equip, setEquip] = useState<string>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  // وضع العرض: كل التمارين (الافتراضي — السلوك القديم) أو كتالوج الأجهزة للمبتدئين.
  const [view, setView] = useState<'all' | 'machines'>('all')

  // قائمة المعدّات الفريدة من البيانات
  const equipList = useMemo(() => {
    const set = new Set<string>()
    exercises.forEach((e) => e.equipment.forEach((x) => set.add(x)))
    return ['all', ...Array.from(set).sort()]
  }, [])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return exercises
      .filter((e) => {
        if (muscle !== 'all' && e.primaryMuscle !== muscle) return false
        if (equip !== 'all' && !e.equipment.includes(equip)) return false
        if (query && !`${e.nameAr} ${e.nameEn}`.toLowerCase().includes(query)) return false
        return true
      })
      .sort((a, b) => a.nameAr.localeCompare(b.nameAr, 'ar'))
  }, [q, muscle, equip])

  return (
    <div className="px-4 py-4">
      <div>
        {/* ترويسة */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="eyebrow">
              <Icon name="Boxes" className="h-3.5 w-3.5" />
              {d.eyebrow}
            </span>
            <h1 className="mt-3 text-2xl font-black text-ink-900 sm:text-3xl">{d.title}</h1>
            <p className="mt-1 text-sm text-ink-500">{exercises.length} {d.countSuffix}</p>
          </div>
          <button
            type="button"
            disabled
            title={d.soon}
            className="btn-ghost shrink-0 cursor-not-allowed px-3 py-2.5 text-xs opacity-60"
          >
            <Icon name="Plus" className="h-4 w-4" />
            <span className="hidden sm:inline">{d.newExercise}</span>
          </button>
        </div>

        {/* مبدّل العرض: كل التمارين (افتراضي) / الأجهزة للمبتدئين */}
        <div className="mt-5 inline-flex rounded-xl border border-line bg-surface p-1">
          <button
            type="button"
            onClick={() => setView('all')}
            className={cn('rounded-lg px-3 py-2 text-xs font-bold transition-colors', view === 'all' ? 'bg-primary text-white' : 'text-ink-700 hover:bg-beige')}
          >
            {d.allExercises}
          </button>
          <button
            type="button"
            onClick={() => setView('machines')}
            className={cn('flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors', view === 'machines' ? 'bg-primary text-white' : 'text-ink-700 hover:bg-beige')}
          >
            <Icon name="Boxes" className="h-3.5 w-3.5" />
            {d.machinesForBeginners}
          </button>
        </div>

      {view === 'all' && (
        <>
        {/* بحث */}
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-line bg-surface px-3">
          <Icon name="Search" className="h-4 w-4 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={d.searchPlaceholder}
            className="w-full bg-transparent py-3 text-sm text-ink-900 focus:outline-none"
            aria-label={d.searchAria}
          />
          {q && (
            <button type="button" onClick={() => setQ('')} aria-label={d.clearSearchAria} className="text-ink-400 hover:text-ink-900">
              <Icon name="X" className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* فلاتر */}
        <div className="mt-3 space-y-2">
          <FilterRow icon="Target" label={d.filterMuscle}>
            {MUSCLE_FILTERS.map((o) => (
              <Chip key={o.value} active={muscle === o.value} onClick={() => setMuscle(o.value)}>{d[o.key]}</Chip>
            ))}
          </FilterRow>
          <FilterRow icon="SlidersHorizontal" label={d.filterEquipment}>
            {equipList.map((eq) => (
              <Chip key={eq} active={equip === eq} onClick={() => setEquip(eq)}>
                {eq === 'all' ? d.all : equipLabel(eq, d)}
              </Chip>
            ))}
          </FilterRow>
        </div>

        <p className="mt-4 text-xs font-bold text-ink-400">{filtered.length} {d.resultsSuffix}</p>

        {/* القائمة */}
        {filtered.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
            <Icon name="Search" className="mx-auto h-7 w-7 text-ink-400" />
            <p className="mt-2 text-sm text-ink-500">{d.noResults}</p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {filtered.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(e.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-start shadow-card transition-shadow hover:shadow-soft"
                >
                  <ExerciseThumb exerciseId={e.id} />
                  <div className="min-w-0 flex-1">
                    {/* الاسم العربي أساسي، الإنجليزي سطر ثانوي أصغر (موحّد) */}
                    <ExerciseName
                      nameAr={e.nameAr}
                      nameEn={e.nameEn}
                      lang={lang}
                      className="truncate text-sm font-bold text-ink-900"
                      secondaryClassName="truncate text-[11px] text-ink-500"
                    />
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-400">
                      <span className="rounded-full bg-primary-soft px-1.5 py-0.5 font-bold text-primary-c">{targetMuscleAr(e)}</span>
                      <span className="truncate">{e.equipment.map((eq) => equipLabel(eq, d)).join(' · ')}</span>
                    </p>
                  </div>
                  <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400" />
                </button>
              </li>
            ))}
          </ul>
        )}
        </>
      )}

      {view === 'machines' && <MachineCatalogBrowser onOpen={setOpenId} d={d} />}
      </div>

      {openId && <ExerciseDetail lang={lang} exerciseId={openId} onClose={() => setOpenId(null)} />}
    </div>
  )
}

/** كتالوج الأجهزة — مرتّب حسب المجموعة العضلية، صديق للمبتدئ. النقر يفتح تفاصيل/شرح التمرين. */
function MachineCatalogBrowser({ onOpen, d }: { onOpen: (id: string) => void; d: LibraryStrings }) {
  const total = machineCatalog.reduce((n, g) => n + g.items.length, 0)
  return (
    <div className="mt-5">
      <p className="mb-3 flex items-start gap-2 rounded-xl border border-primary-soft bg-primary-soft/40 p-3 text-[11px] leading-relaxed text-ink-700">
        <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-c" />
        {d.machineHint} {total} {d.machineHintSuffix}
      </p>
      <div className="space-y-6">
        {machineCatalog.map((group) => (
          <section key={group.key}>
            <h2 className="mb-2.5 flex items-center gap-2 text-sm font-black text-ink-900">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary-soft text-primary-c">
                <Icon name="Dumbbell" className="h-4 w-4" />
              </span>
              {group.titleEn}
              <span className="text-xs font-bold text-ink-400">· {group.titleAr}</span>
            </h2>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {group.items.map((item) => {
                const ex = getExercise(item.exerciseId)
                if (!ex) return null
                return (
                  <li key={item.exerciseId}>
                    <button
                      type="button"
                      onClick={() => onOpen(item.exerciseId)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-start shadow-card transition-shadow hover:shadow-soft"
                    >
                      <ExerciseThumb exerciseId={item.exerciseId} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink-900">{item.nameEn}</p>
                        <p className="truncate text-[11px] text-ink-500">{item.nameAr}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-400">
                          <span className="rounded-full bg-primary-soft px-1.5 py-0.5 font-bold text-primary-c">{item.targetMuscleAr}</span>
                          {item.subGroupAr && <span className="truncate">{item.subGroupAr}</span>}
                        </p>
                      </div>
                      <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

/** صورة مصغّرة — صورة حقيقية (إطار البداية) عند توفّر مطابقة، وإلا بديل فاخر بالأيقونة. */
function ExerciseThumb({ exerciseId }: { exerciseId: string }) {
  const media = getExerciseMedia(exerciseId)
  const src = getExerciseGif(exerciseId) || media?.gifUrl || media?.img0
  const [failed, setFailed] = useState(false)
  if (src && !failed) {
    return (
      <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-ink-900 to-ink-700">
        <img
          src={src}
          alt=""
          aria-hidden="true"
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      </span>
    )
  }
  return (
    <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-ink-900 to-ink-700 text-white">
      <Icon name="Dumbbell" className="h-5 w-5" />
    </span>
  )
}

function FilterRow({ icon, label, children }: { icon: string; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1 flex shrink-0 items-center gap-1 text-[11px] font-bold text-ink-400">
        <Icon name={icon} className="h-3.5 w-3.5" />
        {label}
      </span>
      <div className="-mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1 pb-1">{children}</div>
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
        active ? 'border-primary-soft bg-primary text-white' : 'border-line bg-surface text-ink-700 hover:bg-beige',
      )}
    >
      {children}
    </button>
  )
}
