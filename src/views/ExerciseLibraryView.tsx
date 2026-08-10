import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { ExerciseDetail } from '@/components/ExerciseDetail'
import { ExerciseName } from '@/components/ExerciseName'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { libraryStrings, type LibraryStrings } from '@/i18n/dict/library'
import { detailedMuscleLabel, exercises, getExercise } from '@/data/exercises'
import { muscleLabel } from '@/lib/muscles'
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
      // ترتيب أبجدي بحسب لغة الواجهة (الاسم المعروض فعليًا)
      .sort((a, b) => (lang === 'en' ? a.nameEn.localeCompare(b.nameEn, 'en') : a.nameAr.localeCompare(b.nameAr, 'ar')))
  }, [q, muscle, equip, lang])

  const filtersActive = muscle !== 'all' || equip !== 'all' || q.trim() !== ''
  const clearAll = () => { setQ(''); setMuscle('all'); setEquip('all') }

  return (
    <div className="v2-surface-light bg-page px-4 pb-24 pt-4 text-ink-900">
      <div className="v2-screen-enter mx-auto w-full max-w-2xl">
        {/* ترويسة — عنوان واحد واضح، والعدّ سطر ثانوي لا بطاقة. */}
        <header>
          <span className="eyebrow">
            <Icon name="Boxes" className="h-3.5 w-3.5" />
            {d.eyebrow}
          </span>
          <h1 className="mt-3 text-2xl font-black leading-tight text-ink-900 sm:text-3xl">{d.title}</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{exercises.length} {d.countSuffix}</p>
        </header>

        {/* مبدّل العرض — قسمان متساويان بعرض كامل: هدف لمس أكبر ووزن بصري متوازن. */}
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl border border-line bg-surface p-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'all'}
            onClick={() => setView('all')}
            className={cn(
              'min-h-[44px] rounded-xl px-3 text-xs font-bold transition-colors',
              view === 'all' ? 'bg-primary text-white shadow-card' : 'text-ink-700 hover:bg-beige',
            )}
          >
            {d.allExercises}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'machines'}
            onClick={() => setView('machines')}
            className={cn(
              'flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-colors',
              view === 'machines' ? 'bg-primary text-white shadow-card' : 'text-ink-700 hover:bg-beige',
            )}
          >
            <Icon name="Boxes" className="h-3.5 w-3.5" />
            {d.machinesForBeginners}
          </button>
        </div>

      {view === 'all' && (
        <>
        {/* البحث يلتصق أعلى الشاشة عند التمرير — القائمة طويلة (١٨١ تمرينًا)،
            والعودة للأعلى لتغيير كلمة البحث كانت أطول رحلة في الصفحة. */}
        <div className="sticky top-0 z-10 -mx-4 mt-5 bg-page/95 px-4 py-2 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 shadow-card focus-within:border-primary">
            <Icon name="Search" className="h-4 w-4 shrink-0 text-ink-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={d.searchPlaceholder}
              className="min-h-[44px] w-full bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
              aria-label={d.searchAria}
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                aria-label={d.clearSearchAria}
                className="-me-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-400 transition-colors hover:bg-beige hover:text-ink-900"
              >
                <Icon name="X" className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* فلاتر */}
        <div className="mt-3 space-y-2.5">
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

        {/* سطر النتائج — ومعه مخرج واحد يعيد كل شيء، فلا يعلق أحد داخل فلتر. */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-ink-400">{filtered.length} {d.resultsSuffix}</p>
          {filtersActive && (
            <button
              type="button"
              onClick={clearAll}
              className="flex min-h-[36px] shrink-0 items-center gap-1 rounded-full border border-line bg-surface px-3 text-[11px] font-bold text-ink-700 transition-colors hover:bg-beige"
            >
              <Icon name="X" className="h-3 w-3" />
              {d.clearFilters}
            </button>
          )}
        </div>

        {/* الشبكة — بطاقة بصرية أولًا: الوسيط يشغل رأس البطاقة بدل مربّع ٤٨بكسل. */}
        {filtered.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-line bg-surface px-6 py-14 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-beige text-ink-400">
              <Icon name="Search" className="h-6 w-6" />
            </span>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-ink-500">{d.noResults}</p>
            {filtersActive && (
              <button type="button" onClick={clearAll} className="btn-ghost mt-4 min-h-[44px] px-4 text-sm">
                {d.clearFilters}
              </button>
            )}
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(e.id)}
                  className="group flex h-full w-full flex-col overflow-hidden rounded-3xl border border-line bg-surface text-start shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ExerciseCardMedia exerciseId={e.id} />
                  <div className="flex flex-1 flex-col gap-2 p-3.5">
                    {/* الاسم العربي أساسي، الإنجليزي سطر ثانوي أصغر (موحّد) */}
                    <ExerciseName
                      nameAr={e.nameAr}
                      nameEn={e.nameEn}
                      lang={lang}
                      className="text-sm font-bold leading-snug text-ink-900"
                      secondaryClassName="mt-0.5 truncate text-[11px] leading-snug text-ink-400"
                    />
                    <div className="mt-auto flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary-c">
                        {muscleLabel(e.primaryMuscle, lang)}
                      </span>
                      {e.equipment[0] && (
                        <span className="truncate rounded-full bg-beige px-2 py-0.5 text-[10px] font-bold text-ink-500">
                          {equipLabel(e.equipment[0], d)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        </>
      )}

      {view === 'machines' && <MachineCatalogBrowser onOpen={setOpenId} d={d} lang={lang} />}
      </div>

      {openId && <ExerciseDetail lang={lang} exerciseId={openId} onClose={() => setOpenId(null)} />}
    </div>
  )
}

/** كتالوج الأجهزة — مرتّب حسب المجموعة العضلية، صديق للمبتدئ. النقر يفتح تفاصيل/شرح التمرين. */
function MachineCatalogBrowser({ onOpen, d, lang }: { onOpen: (id: string) => void; d: LibraryStrings; lang: Lang }) {
  const total = machineCatalog.reduce((n, g) => n + g.items.length, 0)
  return (
    <div className="mt-5">
      <p className="mb-3 flex items-start gap-2 rounded-xl border border-primary-soft bg-primary-soft p-3 text-[11px] leading-relaxed text-ink-700">
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
            {/* نفس بطاقة الشبكة في وضع «كل التمارين» — لغة واحدة لا لغتان داخل الشاشة. */}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {group.items.map((item) => {
                const ex = getExercise(item.exerciseId)
                if (!ex) return null
                return (
                  <li key={item.exerciseId}>
                    <button
                      type="button"
                      onClick={() => onOpen(item.exerciseId)}
                      className="group flex h-full w-full flex-col overflow-hidden rounded-3xl border border-line bg-surface text-start shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <ExerciseCardMedia exerciseId={item.exerciseId} />
                      <div className="flex flex-1 flex-col gap-2 p-3.5">
                        <div>
                          <p className="text-sm font-bold leading-snug text-ink-900">{item.nameEn}</p>
                          <p className="mt-0.5 truncate text-[11px] leading-snug text-ink-400">{item.nameAr}</p>
                        </div>
                        <div className="mt-auto flex flex-wrap items-center gap-1.5">
                          {/* العضلة الهدف بلغة الواجهة — بالإنجليزية تُحلّ من قاموس العضلات التفصيلي */}
                          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary-c">
                            {lang === 'en'
                              ? ex.primaryMusclesDetailed[0]
                                ? detailedMuscleLabel(ex.primaryMusclesDetailed[0], lang)
                                : muscleLabel(ex.primaryMuscle, lang)
                              : item.targetMuscleAr}
                          </span>
                          {lang !== 'en' && item.subGroupAr && (
                            <span className="truncate rounded-full bg-beige px-2 py-0.5 text-[10px] font-bold text-ink-500">
                              {item.subGroupAr}
                            </span>
                          )}
                        </div>
                      </div>
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

/**
 * رأس البطاقة — الوسيط بعرض البطاقة كاملًا بدل مربّع ٤٨بكسل جانبي.
 *
 * ثلاث حالات صادقة لا اثنتان:
 *   • صورة حقيقية (إطار البداية) — تُعرض بعد التحميل.
 *   • **هيكل تحميل** أثناء الجلب — لا وميض من فراغ إلى صورة، ولا قفزة تخطيط:
 *     الإطار محجوز بنسبة ثابتة منذ أول رسم.
 *   • بديل بالأيقونة حين لا وسيط (٦٠ تمرينًا من ١٨١ بلا صورة مطابقة) — ولا
 *     يتظاهر بأنه شرح.
 */
function ExerciseCardMedia({ exerciseId }: { exerciseId: string }) {
  const media = getExerciseMedia(exerciseId)
  const src = getExerciseGif(exerciseId) || media?.gifUrl || media?.img0
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>(src ? 'loading' : 'failed')

  if (!src || state === 'failed') {
    return (
      /* ⚠️ `bg-beige` لا `from-ink-900`: رموز `ink` **تنقلب مع الثيم** — فما كان
         لوحًا داكنًا في الفاتح صار لوحًا أبيض ساطعًا في الداكن، وهو ما كانت
         البطاقة القديمة تفعله بصمت لأن مربّع ٤٨بكسل لا يُلاحَظ. بعرض البطاقة
         كاملًا ظهر الخطأ فورًا. رمز السطح يتبع الثيم، ورمز الحبر لا يصلح سطحًا. */
      <span
        aria-hidden="true"
        className="grid aspect-[4/3] w-full place-items-center bg-beige text-ink-400"
      >
        <Icon name="Dumbbell" className="h-7 w-7" />
      </span>
    )
  }
  return (
    <span className="relative block aspect-[4/3] w-full overflow-hidden bg-beige">
      {state === 'loading' && (
        <span aria-hidden="true" className="absolute inset-0 animate-pulse bg-gradient-to-br from-beige to-line" />
      )}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        onLoad={() => setState('ready')}
        onError={() => setState('failed')}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300 group-hover:scale-[1.03]',
          state === 'ready' ? 'opacity-100' : 'opacity-0',
        )}
      />
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
        // [CTO-82] ≥44بكسل: كانت ٣٠ — وهي ٢١ رقاقة فلتر تُضغط كثيرًا.
        'inline-flex min-h-[44px] shrink-0 items-center rounded-full border px-3.5 text-xs font-bold transition-colors',
        active ? 'border-primary-soft bg-primary text-white' : 'border-line bg-surface text-ink-700 hover:bg-beige',
      )}
    >
      {children}
    </button>
  )
}
