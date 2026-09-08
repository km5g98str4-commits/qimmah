import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { formatNumber } from '@/lib/numberFormat'
import { resourceIdFromHash, setExerciseHash } from '@/lib/appRoutes'
import type { ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { ExerciseDetail } from '@/components/ExerciseDetail'
import { ExerciseName } from '@/components/ExerciseName'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { libraryStrings, type LibraryStrings } from '@/i18n/dict/library'
import { detailedMuscleLabel, exercises, getExercise } from '@/data/exercises'
import { equipmentLabel } from '@/lib/exerciseLabels'
import { filterExerciseLibrary } from '@/lib/exerciseLibrary'
import { muscleLabel } from '@/lib/muscles'
import { getExerciseMedia } from '@/data/exerciseMedia'
import { getExerciseGif } from '@/data/exerciseGifs'
import { approvedImageFor, productionEntryFor } from '@/lib/exerciseProductionMedia'
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

/** عرض مكتبة التمارين — بحث + فلاتر + ترتيب أبجدي + فتح تفاصيل التمرين. */
export function ExerciseLibraryView({ lang }: ExerciseLibraryViewProps) {
  const d = libraryStrings[lang]
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<Muscle | 'all'>('all')
  const [equip, setEquip] = useState<string>('all')
  /**
   * [QIM-WEB-FOUNDER-UX-006/حزمة ٦] تفصيل التمرين **حالة مسار** لا حالة مكوّن.
   *
   * كان `useState` هنا، فلا يُدفع مدخل تاريخ عند الفتح. والنتيجة المقيسة: «رجوع»
   * لا يجد ما يعود إليه داخل المكتبة فيقفز إلى ما قبلها (اليوم/الإعدادات)،
   * والتحديث يفقد التمرين المفتوح، ولا رابط يمكن مشاركته.
   * الآن `#/exercises/<id>` — والمكتبة تتبع الـhash لا العكس.
   */
  const [openId, setOpenId] = useState<string | null>(() => resourceIdFromHash())
  const openedFromLibrary = useRef(false)
  useEffect(() => {
    const sync = () => setOpenId(resourceIdFromHash())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  /**
   * معرّف مجهول (رابط عميق قديم أو مكتوب يدويًا) **يفشل بأمان إلى المكتبة**.
   *
   * والاستبدال هنا لا `history.back()`: الرابط العميق المباشر لا تاريخ قبله
   * داخل التطبيق، فالرجوع يخرج المستخدم من قِمّة كلها. `setExerciseHash(null)`
   * يهبط به على المكتبة أيًّا كان طريق وصوله.
   */
  useEffect(() => {
    if (openId && !getExercise(openId)) setExerciseHash(null, 'replace')
  }, [openId])
  /**
   * [BUG-029] استعادة البؤرة بعد إغلاق التفصيل — **هنا لا داخل الحوار**.
   *
   * الحوار لا يستطيع استعادتها بنفسه: تنظيف `useEffect` يجري **قبل** إزالته من DOM،
   * وWebKit عند الإزالة يُسند البؤرة إلى أقرب سلف قابل للتركيز (`<main tabIndex={-1}>`)
   * فيدهس أي `focus()` سبقه. وتأجيلها بإطار (`requestAnimationFrame`) داهن السباق ولم
   * يُنهِه: تحت حِمل حقيقي لم يكن الإطار قد جرى بعدُ لحظةَ الفحص، فقِيست البؤرة `BODY`.
   *
   * ومالك المُشغِّل هو هذه الشاشة لا الحوار. و`useLayoutEffect` يجري **بعد** تثبيت
   * تغييرات DOM مباشرةً — أي بعد إزالة الحوار وبعد إسناد المحرّك — فتكون استعادتنا
   * الأخيرة **حتمًا، بلا اعتماد على توقيت إطار**.
   *
   * والرابط العميق يستفيد أيضًا: لا مُشغِّل هناك أصلًا، وكانت البؤرة تضيع.
   */
  const lastOpenedRef = useRef<string | null>(null)
  useLayoutEffect(() => {
    if (openId) { lastOpenedRef.current = openId; return }
    const justClosed = lastOpenedRef.current
    if (!justClosed) return
    lastOpenedRef.current = null
    document.querySelector<HTMLElement>(`[data-exercise-id="${justClosed}"]`)?.focus()
  }, [openId])
  const openExercise = useCallback((exerciseId: string) => {
    openedFromLibrary.current = true
    setExerciseHash(exerciseId)
  }, [])
  const closeExercise = useCallback(() => {
    if (openedFromLibrary.current) {
      openedFromLibrary.current = false
      window.history.back()
      return
    }
    // الرابط العميق المباشر لا يملك مدخل مكتبة قبله؛ نبدّل المدخل الحالي كي
    // يرجع زر الواجهة للمكتبة ولا يخرج المستخدم من التطبيق.
    setExerciseHash(null, 'replace')
  }, [])
  // وضع العرض: كل التمارين (الافتراضي — السلوك القديم) أو كتالوج الأجهزة للمبتدئين.
  const [view, setView] = useState<'all' | 'machines'>('all')

  // قائمة المعدّات الفريدة من البيانات
  const equipList = useMemo(() => {
    const set = new Set<string>()
    exercises.forEach((e) => e.equipment.forEach((x) => set.add(x)))
    return ['all', ...Array.from(set).sort()]
  }, [])

  const filtered = useMemo(() => {
    return filterExerciseLibrary({ search: q, muscle, equipment: equip, lang })
  }, [q, muscle, equip, lang])

  const filtersActive = muscle !== 'all' || equip !== 'all' || q.trim() !== ''
  const clearAll = () => { setQ(''); setMuscle('all'); setEquip('all') }

  return (
    <div data-testid="library-screen" className="v2-surface-light bg-page px-4 pb-24 pt-4 text-ink-900">
      <div className="v2-screen-enter mx-auto w-full max-w-2xl">
        {/* ترويسة — عنوان واحد واضح، والعدّ سطر ثانوي لا بطاقة. */}
        <header>
          <span className="eyebrow">
            <Icon name="Boxes" className="h-3.5 w-3.5" />
            {d.eyebrow}
          </span>
          <h1 className="mt-3 text-2xl font-black leading-tight text-ink-900 sm:text-3xl">{d.title}</h1>
          <p data-testid="exercise-library-count" className="mt-1.5 text-sm leading-relaxed text-ink-500">{formatNumber(exercises.length, lang)} {d.countSuffix}</p>
        </header>

        {/* مبدّل العرض — قسمان متساويان بعرض كامل: هدف لمس أكبر ووزن بصري متوازن. */}
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl border border-line bg-surface p-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'all'}
            aria-controls="exercise-library-all-panel"
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
            aria-controls="exercise-library-machine-panel"
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
        <div id="exercise-library-all-panel" role="tabpanel">
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
              data-testid="exercise-library-search"
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
              <Chip key={o.value} active={muscle === o.value} filterKind="muscle" filterValue={o.value} onClick={() => setMuscle(o.value)}>{d[o.key]}</Chip>
            ))}
          </FilterRow>
          <FilterRow icon="SlidersHorizontal" label={d.filterEquipment}>
            {equipList.map((eq) => (
              <Chip key={eq} active={equip === eq} filterKind="equipment" filterValue={eq} onClick={() => setEquip(eq)}>
                {eq === 'all' ? d.all : equipmentLabel(eq, lang)}
              </Chip>
            ))}
          </FilterRow>
        </div>

        {/* سطر النتائج — ومعه مخرج واحد يعيد كل شيء، فلا يعلق أحد داخل فلتر. */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-ink-400">{formatNumber(filtered.length, lang)} {d.resultsSuffix}</p>
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
                  onClick={() => openExercise(e.id)}
                  data-exercise-id={e.id}
                  data-testid="exercise-card"
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
                          {equipmentLabel(e.equipment[0], lang)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        </div>
      )}

      {view === 'machines' && <MachineCatalogBrowser onOpen={openExercise} d={d} lang={lang} />}
      </div>

      {openId && (
        <ExerciseDetail
          lang={lang}
          exerciseId={openId}
          /* من بطاقة المكتبة: رجوع تاريخي. من رابط عميق مباشر: استبدال آمن
             إلى المكتبة، فلا يخرج زر الواجهة من قِمّة. */
          onClose={closeExercise}
        />
      )}
    </div>
  )
}

/** كتالوج الأجهزة — مرتّب حسب المجموعة العضلية، صديق للمبتدئ. النقر يفتح تفاصيل/شرح التمرين. */
function MachineCatalogBrowser({ onOpen, d, lang }: { onOpen: (id: string) => void; d: LibraryStrings; lang: Lang }) {
  const total = machineCatalog.reduce((n, g) => n + g.items.length, 0)
  return (
    <div id="exercise-library-machine-panel" role="tabpanel" data-testid="exercise-machine-browser" className="mt-5">
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
              {lang === 'en' ? group.titleEn : group.titleAr}
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
                      data-exercise-id={item.exerciseId}
                      data-testid="exercise-machine-card"
                      className="group flex h-full w-full flex-col overflow-hidden rounded-3xl border border-line bg-surface text-start shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <ExerciseCardMedia exerciseId={item.exerciseId} />
                      <div className="flex flex-1 flex-col gap-2 p-3.5">
                        <ExerciseName
                          nameAr={ex.nameAr}
                          nameEn={ex.nameEn}
                          lang={lang}
                          className="text-sm font-bold leading-snug text-ink-900"
                          secondaryClassName="mt-0.5 truncate text-[11px] leading-snug text-ink-400"
                        />
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
  // ── [FINAL-CONVERGENCE] البطاقة تتبع نفس سلطة الوسائط التي يتبعها التفصيل ──
  // كانت البطاقة تقرأ الطبقات القديمة (`exerciseGifs` / `exerciseMedia`) بينما
  // التفصيل يقرأ المانيفست الإنتاجي. فمثلًا `chest-press-machine` **معلَن
  // MISSING** في المانيفست (ضمن `PRODUCTION_IMAGE_GAP_IDS`) ومع ذلك كان له
  // مدخل في `exerciseMedia.ts` — فيرى المستخدم على البطاقة صورةً لم توقّع
  // عليها بوابة الحقوق. وهذا نصّ ما يمنعه عقد الوسائط: NEEDS_REVIEW/MISSING
  // تعني حالة فارغة صادقة، لا صورة قديمة تُملأ بها الفجوة.
  //
  // المعتمد أولًا؛ والطبقات القديمة تبقى بديلًا **فقط** لمن لا مدخل له في
  // المانيفست إطلاقًا، فلا تُسحب صورة صحيحة من تمرين خارج الجرد.
  const approved = approvedImageFor(exerciseId)
  const legacyMedia = getExerciseMedia(exerciseId)
  const legacy = getExerciseGif(exerciseId) || legacyMedia?.gifUrl || legacyMedia?.img0
  const src = approved?.start || (productionEntryFor(exerciseId) ? undefined : legacy)
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>(src ? 'loading' : 'failed')

  if (!src || state === 'failed') {
    return (
      /* ⚠️ `bg-beige` لا `from-ink-900`: رموز `ink` **تنقلب مع الثيم** — فما كان
         لوحًا داكنًا في الفاتح صار لوحًا أبيض ساطعًا في الداكن، وهو ما كانت
         البطاقة القديمة تفعله بصمت لأن مربّع ٤٨بكسل لا يُلاحَظ. بعرض البطاقة
         كاملًا ظهر الخطأ فورًا. رمز السطح يتبع الثيم، ورمز الحبر لا يصلح سطحًا. */
      <span
        aria-hidden="true"
        data-testid="exercise-card-media"
        data-media-state="fallback"
        className="grid aspect-[4/3] w-full place-items-center bg-beige text-ink-400"
      >
        <Icon name="Dumbbell" className="h-7 w-7" />
      </span>
    )
  }
  return (
    <span data-testid="exercise-card-media" data-media-state={state} data-media-kind={approved?.kind ?? 'legacy'} className={cn('relative block aspect-[4/3] w-full overflow-hidden', approved?.kind === 'card' ? 'bg-[#141a2a]' : 'bg-beige')}>
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
          // [FOUNDER-CARDS-001] البطاقة تحمل عنوانها داخل الصورة — contain لا cover كي لا يُقصّ.
          approved?.kind === 'card' ? 'h-full w-full object-contain transition-opacity duration-300' : 'h-full w-full object-cover transition-opacity duration-300 group-hover:scale-[1.03]',
          state === 'ready' ? 'opacity-100' : 'opacity-0',
        )}
      />
    </span>
  )
}

function FilterRow({ icon, label, children }: { icon: string; label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex items-start gap-2">
      <span className="mt-1 flex shrink-0 items-center gap-1 text-[11px] font-bold text-ink-400">
        <Icon name={icon} className="h-3.5 w-3.5" />
        {label}
      </span>
      <div className="-mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1 pb-1">{children}</div>
    </div>
  )
}

function Chip({
  active,
  onClick,
  filterKind,
  filterValue,
  children,
}: {
  active: boolean
  onClick: () => void
  filterKind: 'muscle' | 'equipment'
  filterValue: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-filter-kind={filterKind}
      data-filter-value={filterValue}
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
