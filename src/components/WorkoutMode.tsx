import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { ExerciseMedia } from './ExerciseMedia'
import { ExerciseName } from './ExerciseName'
import { MachineAltCards } from './machine/MachineAltCards'
import { MachineHowTo } from './machine/MachineHowTo'
import { findMachineInfo } from './machine/machineInfo'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { workoutScreenStrings } from '@/i18n/dict/workoutScreen'
import type { PlanDay } from '@/types/workout'
import { exerciseDisplayName, exerciseVideoSearchUrl, planExerciseVideo } from '@/lib/workoutPlan'
import { canonicalExerciseId, detailedMuscleLabel, getAlternatives, getExercise } from '@/data/exercises'
import { getMachineAlternatives } from '@/data/machineAlternatives'
import { getRecord, progressionHint } from '@/lib/exerciseHistory'
import { exerciseGuidance } from '@/lib/exerciseGuidance'
import { muscleLabel } from '@/lib/muscles'
import { getDayStamp } from '@/lib/today'
import type { Difficulty, SetLog, WorkoutSession } from '@/lib/workoutSessions'
import { saveActiveWorkout, type ActiveWorkout } from '@/lib/activeWorkout'
import type { WriteResult } from '@/lib/safeStorage'

interface WorkoutModeProps {
  lang: Lang
  day: PlanDay
  onClose: () => void
  onFinish: (session: WorkoutSession) => void
  /** حفظ بديل في الخطة بشكل دائم (اختياري). */
  onSwapExercise?: (dayId: string, planExerciseId: string, newExerciseId: string) => void
  /** هوية صاحب الجلسة — تُعزل الجلسة الجارية بها (ضيف/حساب). */
  userId?: string | null
  /** جلسة جارية تُستأنف بدل البدء من الصفر (ح-١). */
  resume?: ActiveWorkout
  /** فشل/تعافي كتابة اللقطة الجارية — تعرضه الشاشة المالكة فوق وضع الجلسة. */
  onSaveError?: (result: WriteResult | null) => void
}

interface ExState {
  sets: SetLog[]
  difficulty?: Difficulty
  rpe?: number
  painNote: string
  notes: string
}

// حدود التحقّق
const MAX_WEIGHT = 500
const MAX_REPS = 100

/** أول رقم في نطاق التكرارات (مثال: «8–12» → «8»). */
function lowerReps(reps: string): string {
  const m = String(reps).match(/\d+/)
  return m ? m[0] : reps
}

/** تعديل قيمة رقمية نصية بمقدار، مع قصّها بين صفر والحد الأقصى. */
function adjust(value: string, delta: number, max: number): string {
  const m = String(value).match(/-?[\d.]+/)
  const n = m ? Number(m[0]) : 0
  const next = Math.min(max, Math.max(0, Math.round((n + delta) * 100) / 100))
  return `${next}`
}

const parseVal = (v: string): number => {
  const m = String(v ?? '').match(/-?[\d.]+/)
  return m ? Number(m[0]) : NaN
}

/** التحقّق من قيمة الوزن (٠–٥٠٠ كجم). فارغ = مسموح (لم يُدخل بعد). */
function weightInvalid(v: string): boolean {
  if (!String(v).trim()) return false
  const n = parseVal(v)
  return Number.isNaN(n) || n < 0 || n > MAX_WEIGHT
}

/** التحقّق من التكرارات (٠–١٠٠). فارغ = مسموح. */
function repsInvalid(v: string): boolean {
  if (!String(v).trim()) return false
  const n = parseVal(v)
  return Number.isNaN(n) || n < 0 || n > MAX_REPS
}

/** وضع التمرين النشط — شاشة كاملة، تمرين واحد في كل خطوة، تسجيل سريع. */
export function WorkoutMode({ lang, day, onClose, onFinish, onSwapExercise, userId = null, resume, onSaveError }: WorkoutModeProps) {
  const t = getStrings(lang).workout
  const d = workoutScreenStrings[lang]
  // (P10.1) أسهم التنقّل تتبع اتجاه اللغة: «التالي» مع اتجاه القراءة و«السابق/الرجوع» عكسه.
  const nextChevron = lang === 'en' ? 'ChevronRight' : 'ChevronLeft'
  const prevChevron = lang === 'en' ? 'ChevronLeft' : 'ChevronRight'
  // الاستئناف (ح-١): وقت البدء والموضع يأتيان من الجلسة المحفوظة إن وُجدت.
  const [startedAt] = useState(() => resume?.startedAt ?? new Date().toISOString())
  const [current, setCurrent] = useState(() =>
    resume ? Math.min(resume.current, Math.max(0, day.exercises.length - 1)) : 0,
  )
  const [openGuide, setOpenGuide] = useState(false)
  const [openAlt, setOpenAlt] = useState(false)
  const [openDetails, setOpenDetails] = useState(false)
  /**
   * [CTO-73] الشاشة ١ — طيّة «تفاصيل التمرين»: الرسم · العضلات · طريقة الجهاز ·
   * الفيديو · البدائل. مغلقة افتراضيًا، و`key` على `exId` يُعيد إغلاقها عند
   * تبديل التمرين — فمرجعٌ فُتح لتمرين لا يبقى مفتوحًا للتالي.
   */
  const [openRef, setOpenRef] = useState(false)
  const [swap, setSwap] = useState<Record<string, string>>(() => resume?.swap ?? {})
  // (P12) محتوى بطاقتي البديل الصغيرتين لكل عنصر خطة (يتبدّل مع البطاقة الكبيرة في هذه الجلسة فقط).
  const [altSlots, setAltSlots] = useState<Record<string, [string, string]>>({})
  const [savedFlash, setSavedFlash] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const flashTimer = useRef<number | null>(null)
  /** لا نعلن «حُفظت الجولة» إلا بعد نتيجة التخزين الفعلية للّقطة الجديدة. */
  const flashAfterPersist = useRef(false)

  const effExId = (peId: string, exerciseId: string) => swap[peId] ?? exerciseId

  const [state, setState] = useState<Record<string, ExState>>(() => {
    const init: Record<string, ExState> = {}
    day.exercises.forEach((pe) => {
      // الاستئناف: ما حُفظ لهذا العنصر يفوز على القيم الافتراضية.
      const saved = resume?.exercises[pe.id]
      if (saved) {
        init[pe.id] = { sets: saved.sets, painNote: saved.painNote, notes: saved.notes }
        return
      }
      const rec = getRecord(pe.exerciseId)
      const w = rec?.lastWeight ?? pe.startingWeight ?? ''
      const r = rec?.lastReps ?? lowerReps(pe.reps)
      const count = Math.max(1, pe.sets)
      init[pe.id] = {
        sets: Array.from({ length: count }, (_, i) => ({
          setNumber: i + 1,
          targetReps: pe.reps,
          actualReps: r,
          weightKg: w,
          completed: false,
        })),
        painNote: '',
        notes: pe.notes ?? '',
      }
    })
    return init
  })

  // (ح-١) حفظ الجلسة الجارية بعد كل تغيير — فإن قُتل التطبيق أو أُعيد التحميل عاد
  // المستخدم إلى موضعه وجولاته. المخزَّن قيم ثابتة (معرّفات وأرقام) لا نصوص معروضة.
  useEffect(() => {
    // «تمرين فارغ» (بلا عناصر خطة) لا جلسة له تُستأنف.
    if (day.exercises.length === 0) return
    const result = saveActiveWorkout(userId, {
      dayId: day.id,
      dayNameAr: day.nameAr,
      dayNameEn: day.nameEn,
      startedAt,
      current,
      exercises: Object.fromEntries(
        Object.entries(state).map(([id, st]) => [
          id,
          {
            sets: st.sets.map((s) => ({
              setNumber: s.setNumber,
              targetReps: s.targetReps,
              actualReps: s.actualReps,
              weightKg: s.weightKg,
              completed: s.completed,
            })),
            painNote: st.painNote,
            notes: st.notes,
          },
        ]),
      ),
      swap,
    })
    onSaveError?.(result === 'ok' ? null : result)
    if (flashAfterPersist.current) {
      flashAfterPersist.current = false
      if (result === 'ok') flash()
      else setSavedFlash(false)
    }
  }, [userId, day.id, day.nameAr, day.nameEn, day.exercises.length, startedAt, current, state, swap, onSaveError])

  // مؤقّت الراحة
  const [timer, setTimer] = useState<{ left: number; running: boolean }>({ left: 0, running: false })
  useEffect(() => {
    if (!timer.running) return
    if (timer.left <= 0) {
      setTimer((p) => ({ ...p, running: false }))
      return
    }
    const id = window.setTimeout(() => setTimer((p) => ({ ...p, left: p.left - 1 })), 1000)
    return () => window.clearTimeout(id)
  }, [timer.running, timer.left])

  useEffect(() => () => {
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
  }, [])

  /**
   * [CTO-73] الشاشة ١ — «زرّ + العائم يختفي في هذه الشاشة».
   *
   * القشرة تملك آليّة الانغماس أصلًا (`MobileShell` يسمع `qimmah:immersive`
   * فيُخفي شريط التنقّل وزرّ «تسجيل» ويجعل الخلفية `inert`) — لكن الذي كان
   * يُطلقها هو `WorkoutV2` **اليتيم**. فالشاشة الحيّة تُركت خارجها: الشريط
   * والزرّ يبقيان مركَّبين خلف الغطاء، مغطَّيين بصريًا لكن **قابلين للوصول
   * بالتركيز وقارئ الشاشة** — نافذة مشروعة على ما خلف النافذة.
   *
   * فتُطلقها الشاشة الحيّة الآن. لا آليّة جديدة — توصيل القائمة إلى مكانها.
   */
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('qimmah:immersive', { detail: true }))
    return () => { window.dispatchEvent(new CustomEvent('qimmah:immersive', { detail: false })) }
  }, [])

  // أعد ضبط اللوحات عند الانتقال بين التمارين
  useEffect(() => {
    setOpenGuide(false)
    setOpenAlt(false)
    setOpenDetails(false)
    // [CTO-73] الشاشة ١ — طيّة المرجع تتبع القاعدة نفسها: مرجعٌ فُتح لتمرين
    // لا يبقى مفتوحًا للتمرين التالي.
    setOpenRef(false)
  }, [current])

  // حارس: يوم بلا تمارين (مثل «تمرين فارغ») — لا نلمس مرجعًا غير موجود؛ نعرض حالة آمنة.
  if (day.exercises.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-page">
        <header className="sticky top-0 z-10 glass border-b border-line">
          <div className="container-page flex h-16 items-center justify-between gap-3">
            <button type="button" onClick={onClose} aria-label={d.close} className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-ink-700">
              <Icon name="X" className="h-5 w-5" />
            </button>
            <p dir="auto" className="truncate text-sm font-black text-ink-900">{lang === 'en' ? day.nameEn || day.nameAr : day.nameAr || day.nameEn}</p>
            <div className="h-11 w-11" />
          </div>
        </header>
        <main className="container-page flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary-c">
            <Icon name="Dumbbell" className="h-7 w-7" />
          </span>
          <p className="text-base font-bold text-ink-900">{t.emptyPlan}</p>
          <button type="button" onClick={onClose} className="btn-primary px-6 py-3 text-sm">
            <Icon name={prevChevron} className="h-4 w-4" />
            {t.backToToday}
          </button>
        </main>
      </div>
    )
  }

  const pe = day.exercises[current]
  const exId = effExId(pe.id, pe.exerciseId)
  const ex = getExercise(exId)
  const s = state[pe.id]
  const rec = getRecord(exId)
  const hint = progressionHint(rec)
  const total = day.exercises.length

  const setMeta = (partial: Partial<ExState>) =>
    setState((prev) => ({ ...prev, [pe.id]: { ...prev[pe.id], ...partial } }))
  const setSet = (idx: number, partial: Partial<SetLog>) =>
    setState((prev) => ({
      ...prev,
      [pe.id]: { ...prev[pe.id], sets: prev[pe.id].sets.map((x, i) => (i === idx ? { ...x, ...partial } : x)) },
    }))

  const flash = () => {
    setSavedFlash(true)
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setSavedFlash(false), 1600)
  }

  const startRest = (sec: number) => setTimer({ left: sec > 0 ? sec : 60, running: true })

  const markDone = (idx: number) => {
    const set = s.sets[idx]
    // امنع اعتماد جولة بقيم خارج النطاق
    if (!set.completed && (weightInvalid(set.weightKg) || repsInvalid(set.actualReps))) return
    const willComplete = !set.completed
    flashAfterPersist.current = willComplete
    setSet(idx, { completed: willComplete })
    if (willComplete) {
      startRest(pe.restSec)
    }
  }

  const repeatLast = () => {
    if (!rec?.lastWeight && !rec?.lastReps) return
    setState((prev) => ({
      ...prev,
      [pe.id]: {
        ...prev[pe.id],
        sets: prev[pe.id].sets.map((x) => ({
          ...x,
          weightKg: rec?.lastWeight ?? x.weightKg,
          actualReps: rec?.lastReps ?? x.actualReps,
        })),
      },
    }))
    flash()
  }

  const doSwap = (newId: string, persist: boolean) => {
    setSwap((prev) => ({ ...prev, [pe.id]: newId }))
    setOpenAlt(false)
    if (persist && onSwapExercise) onSwapExercise(day.id, pe.id, newId)
    flash()
  }

  // (P12) الأجهزة الأساسية: بديلا دمبل/كيبل من الكتالوج — تبديل بضغطة واحدة لهذه الجلسة فقط.
  const machineAlt = getMachineAlternatives(pe.exerciseId)
  const machineSlots: [string, string] | null = machineAlt
    ? altSlots[pe.id] ?? [machineAlt.dumbbell, machineAlt.cable]
    : null

  /** يرقّي بديلًا للبطاقة الكبيرة وينزل المعروض حاليًا لمكانه — يمتد effExId فيسجّل تحت المؤدَّى فعلًا. */
  const switchMachineAlt = (slotIdx: 0 | 1, newId: string) => {
    if (!machineSlots) return
    const demotedId = effExId(pe.id, pe.exerciseId)
    setAltSlots((prev) => {
      const next: [string, string] = [...machineSlots]
      next[slotIdx] = demotedId
      return { ...prev, [pe.id]: next }
    })
    setSwap((prev) => {
      const next = { ...prev }
      // العودة للجهاز الأساسي = إزالة التبديل (تعود الأسماء/الفيديو المخصّصة في الخطة).
      if (canonicalExerciseId(newId) === canonicalExerciseId(pe.exerciseId)) delete next[pe.id]
      else next[pe.id] = newId
      return next
    })
    flash()
  }

  const exDone = (peId: string) => {
    const st = state[peId]
    return st?.sets.length > 0 && st.sets.every((x) => x.completed)
  }
  const doneCount = day.exercises.filter((p) => exDone(p.id)).length

  const isLast = current >= total - 1
  const goNext = () => {
    if (isLast) return setConfirmOpen(true)
    setCurrent((c) => Math.min(total - 1, c + 1))
    setTimer({ left: 0, running: false })
  }
  const goPrev = () => {
    setCurrent((c) => Math.max(0, c - 1))
    setTimer({ left: 0, running: false })
  }

  const doFinish = () => {
    setConfirmOpen(false)
    const session: WorkoutSession = {
      id: `session-${startedAt}`,
      date: getDayStamp(),
      startedAt,
      finishedAt: new Date().toISOString(),
      workoutDayId: day.id,
      workoutDayName: lang === 'en' ? day.nameEn : day.nameAr,
      exercises: day.exercises.map((p) => {
        const st = state[p.id]
        const eId = effExId(p.id, p.exerciseId)
        const e = getExercise(eId)
        return {
          exerciseId: eId,
          exerciseNameAr: e?.nameAr,
          exerciseNameEn: e?.nameEn,
          targetSets: p.sets,
          targetReps: p.reps,
          targetRestSec: p.restSec,
          completed: exDone(p.id),
          sets: st.sets.map((x) => (st.rpe ? { ...x, rpe: st.rpe } : x)),
          difficulty: st.difficulty,
          painNote: st.painNote,
          notes: st.notes,
        }
      }),
    }
    onFinish(session)
  }

  // معلومات العرض
  const nameAr = swap[pe.id] ? ex?.nameAr ?? '' : pe.customNameAr || ex?.nameAr || ''
  const nameEn = swap[pe.id] ? ex?.nameEn ?? '' : pe.customNameEn || ex?.nameEn || ''
  const muscles = ex ? muscleLabel(ex.primaryMuscle, lang) : ''
  const guide = exerciseGuidance(exId, lang)
  // (P12) زر «شاهد الطريقة»: videoUrl إن وُجد، وإلا بحث يوتيوب عن أداء التمرين بالاسم الإنجليزي.
  const videoUrl =
    (swap[pe.id] ? ex?.videoUrl ?? '' : planExerciseVideo(pe)) ||
    (ex?.nameEn ? exerciseVideoSearchUrl(ex.nameEn) : '')
  // (P12) وسوم الجهاز (التصنيف الفرعي ثنائي اللغة) للتمرين المعروض إن كان جهاز كتالوج.
  const machineInfo = findMachineInfo(exId)
  const alts = getAlternatives(exId).slice(0, 5)
  const difficulties: { value: Difficulty; label: string }[] = [
    { value: 'easy', label: t.easy },
    { value: 'medium', label: t.medium },
    { value: 'hard', label: t.hard },
  ]

  // التالي في مؤقّت الراحة: جولة لم تكتمل، وإلا التمرين التالي
  const nextSetNum = s.sets.find((x) => !x.completed)?.setNumber
  const nextEx = day.exercises[current + 1]
  const restNext = nextSetNum
    ? `${d.setSingular} ${nextSetNum}`
    : nextEx
      ? exerciseDisplayName(getExercise(effExId(nextEx.id, nextEx.exerciseId))?.nameAr ?? '', getExercise(effExId(nextEx.id, nextEx.exerciseId))?.nameEn ?? '', lang)
      : t.finish

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-page">
      {/* الترويسة + شريط التقدّم */}
      <header className="sticky top-0 z-10 glass border-b border-line">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <button type="button" onClick={onClose} aria-label={d.close} className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-ink-700">
            <Icon name="X" className="h-5 w-5" />
          </button>
          <div className="min-w-0 text-center">
            <p dir="auto" className="truncate text-base font-black text-ink-900">{lang === 'en' ? day.nameEn || day.nameAr : day.nameAr || day.nameEn}</p>
            <p className="text-sm text-ink-500">{current + 1} {t.of} {total}</p>
          </div>
          <div className="h-11 w-11" />
        </div>
        <div className="container-page pb-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }} />
          </div>
        </div>
      </header>

      <main className="container-page flex-1 space-y-4 overflow-y-auto py-5 pb-40">
        {/* ═══ [CTO-73] الشاشة ١ — «وش أسوي الحين؟» ═══
            كان فوق الطية ١٩ عنصرًا متنافسًا، والمجموعة — وهي **الفعل** — تحت
            التمرير: رسمٌ بارتفاع ١٩٢px، ثم الاسم مكرّرًا (داخل الرسم وتحته)،
            ثم «١ من ٢» مرّة ثانية بجانبه، ثم **بطاقتان تحملان جملة الفراغ
            نفسها حرفيًا**، ثم الهدف، ثم طريقة الجهاز، ثم الفيديو، ثم بطاقتا
            بديل بصور فوتوغرافية تكسر لغة الرسم.

            الترتيب الآن يتبع السؤال: **مَن أنا الآن → ماذا سجّلت سابقًا →
            سجّل الآن**. وكل ما هو **مرجع** لا أمرَ تنفيذ (الرسم · طريقة الجهاز
            · الفيديو · البدائل) نزل خلف طيّة واحدة بضغطة — لم يُحذف منه شيء. */}

        {/* ١) هويّة التمرين — مرّة واحدة: الاسم والهدف في كتلة واحدة. */}
        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-x-2">
            <ExerciseName
              nameAr={nameAr}
              nameEn={nameEn}
              lang={lang}
              className="text-lg font-black leading-tight text-ink-900"
              secondaryClassName="mt-0.5 text-sm font-bold text-ink-400"
            />
            {pe.optional && (
              <span className="shrink-0 rounded-full bg-beige px-2 py-0.5 text-sm font-bold text-ink-500">
                {d.optionalTag}
              </span>
            )}
          </div>
          {/* الهدف سطر داخل الهويّة لا بطاقة مستقلّة — هو وصفُ التمرين لا مهمّة ثانية. */}
          <p className="mt-1.5 flex items-center gap-2 text-base font-bold text-ink-700">
            <Icon name="Target" className="h-4 w-4 shrink-0 text-primary-c" />
            {t.target}: {pe.sets} {t.setsDone} × {pe.reps}
          </p>

          {/* ٢) السجلّ — سطر واحد. بلا سجلّ: دعوة خفيفة بدل بطاقتَي فراغ
                 متطابقتين. بسجلّ: الرقمان في سطر واحد ومعهما «كرّر آخر مرة». */}
          {rec?.lastWeight || rec?.bestWeight ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line pt-3">
              {rec?.lastWeight && (
                <span className="text-base font-bold text-ink-700">
                  <span className="text-ink-500">{d.historyLast}:</span> {rec.lastWeight} {t.volumeUnit}
                  {rec.lastReps ? ` × ${rec.lastReps}` : ''}
                </span>
              )}
              {rec?.bestWeight && (
                <span className="text-base font-bold text-ink-700">
                  <span className="text-ink-500">{d.historyBest}:</span> {rec.bestWeight} {t.volumeUnit}
                </span>
              )}
              {(rec?.lastWeight || rec?.lastReps) && (
                <button type="button" onClick={repeatLast} className="ms-auto inline-flex min-h-[44px] items-center gap-1.5 text-base font-bold text-primary-c">
                  <Icon name="Repeat" className="h-4 w-4" />
                  {t.repeatLast}
                </button>
              )}
            </div>
          ) : (
            <p className="mt-3 border-t border-line pt-3 text-base text-ink-500">{d.firstTimeHint}</p>
          )}
          {hint && <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-primary-c"><Icon name="TrendingUp" className="h-4 w-4" />{hint}</p>}
        </div>

        {/* جولات التمرين الحالي */}
        <div className="space-y-3">
          {s.sets.map((st, i) => {
            const wErr = weightInvalid(st.weightKg)
            const rErr = repsInvalid(st.actualReps)
            const invalid = wErr || rErr
            return (
              <div
                key={i}
                className={cn(
                  'rounded-2xl border p-4 transition-colors',
                  st.completed ? 'border-primary-soft bg-primary-soft' : 'border-line bg-surface',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-black text-ink-900">{d.setSingular} {st.setNumber}</span>
                  <span className="text-sm font-bold text-ink-500">{t.target}: {st.targetReps}</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Stepper
                    label={t.weightKg}
                    value={st.weightKg}
                    onChange={(v) => setSet(i, { weightKg: v })}
                    onStep={(d) => setSet(i, { weightKg: adjust(st.weightKg, d, MAX_WEIGHT) })}
                    step={2.5}
                    mode="decimal"
                    invalid={wErr}
                  />
                  <Stepper
                    label={t.repsDone}
                    value={st.actualReps}
                    placeholder={lowerReps(pe.reps)}
                    onChange={(v) => setSet(i, { actualReps: v })}
                    onStep={(d) => setSet(i, { actualReps: adjust(st.actualReps, d, MAX_REPS) })}
                    step={1}
                    mode="numeric"
                    invalid={rErr}
                  />
                </div>

                {invalid && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-danger">
                    <Icon name="AlertTriangle" className="h-3.5 w-3.5 shrink-0" />
                    {wErr ? t.errWeight : t.errReps}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => markDone(i)}
                  aria-pressed={st.completed}
                  disabled={!st.completed && invalid}
                  className={cn(
                    'mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl py-3 text-base font-bold transition-colors',
                    st.completed ? 'bg-primary text-white' : 'border border-line bg-beige text-ink-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40',
                  )}
                >
                  <Icon name={st.completed ? 'CheckCircle2' : 'Check'} className="h-5 w-5" strokeWidth={st.completed ? 2 : 3} />
                  {st.completed ? t.setSaved : d.done}
                </button>
              </div>
            )
          })}
        </div>

        {/* ═══ [CTO-73] المرجع خلف طيّة واحدة — نُقل ولم يُحذف ═══
            الرسم التوضيحي · رقائق العضلات · طريقة استخدام الجهاز · الفيديو ·
            البدائل. كلّها كانت **فوق** المجموعة تزاحمها، وكلّها متاحة بضغطة. */}
        <div className="card overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenRef((o) => !o)}
            aria-expanded={openRef}
            className="flex min-h-[44px] w-full items-center justify-between px-4 py-3.5 text-base font-bold text-ink-900"
          >
            <span className="flex items-center gap-2">
              <Icon name="Info" className="h-4 w-4 text-primary-c" />
              {d.detailsToggle}
            </span>
            <Icon name={openRef ? 'Minus' : 'Plus'} className="h-4 w-4 text-ink-400" />
          </button>
          {openRef && (
            <div className="border-t border-line">
              <ExerciseMedia exerciseId={exId} heightClass="h-48" hideChips />
              <div className="space-y-3 p-4">
                {machineInfo ? (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-primary-soft px-2.5 py-1 text-sm font-bold text-primary-c">
                      {lang === 'en' ? machineInfo.item.subGroup.en : machineInfo.item.subGroup.ar}
                    </span>
                    <span className="rounded-full bg-beige px-2.5 py-1 text-sm font-bold text-ink-700">
                      {lang === 'en' ? machineInfo.group.titleEn : machineInfo.group.titleAr}
                    </span>
                  </div>
                ) : (
                  <>
                    {muscles && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-beige px-2.5 py-1 text-sm font-bold text-ink-700">
                        <Icon name="Target" className="h-3.5 w-3.5 text-primary-c" />
                        {muscles}
                      </span>
                    )}
                    {ex?.primaryMusclesDetailed?.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {ex.primaryMusclesDetailed.map((m) => (
                          <span key={`p-${m}`} className="rounded-full bg-primary-soft px-2 py-0.5 text-sm font-bold text-primary-c">
                            {detailedMuscleLabel(m, lang)}
                          </span>
                        ))}
                        {ex.secondaryMusclesDetailed.map((m) => (
                          <span key={`s-${m}`} className="rounded-full border border-line bg-surface px-2 py-0.5 text-sm font-medium text-ink-500">
                            {detailedMuscleLabel(m, lang)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </>
                )}

                <MachineHowTo key={exId} exerciseId={exId} lang={lang} />

                {videoUrl && (
                  <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost min-h-[44px] w-full py-2.5 text-base">
                    <Icon name="Video" className="h-4 w-4 text-primary-c" />
                    {d.watchVideo}
                  </a>
                )}

                {machineAlt && machineSlots && (
                  <MachineAltCards
                    lang={lang}
                    machineId={pe.exerciseId}
                    alt={machineAlt}
                    slots={machineSlots}
                    onSwitch={switchMachineAlt}
                    noMedia
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* شرح سريع */}
        <div className="card overflow-hidden">
          <button type="button" onClick={() => setOpenGuide((o) => !o)} className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-bold text-ink-900">
            <span className="flex items-center gap-2"><Icon name="Lightbulb" className="h-4 w-4 text-primary-c" />{t.quickGuide}</span>
            <Icon name={openGuide ? 'Minus' : 'Plus'} className="h-4 w-4 text-ink-400" />
          </button>
          {openGuide && (
            <div className="border-t border-line px-4 py-4">
              <p className="mb-2 text-xs font-black text-ink-700">{t.techniquePoints}</p>
              <ul className="space-y-1.5">
                {guide.tips.slice(0, 3).map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-ink-700">
                    <Icon name="Check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-c" strokeWidth={3} />
                    {tip}
                  </li>
                ))}
              </ul>
              {guide.mistakes.length > 0 && (
                <>
                  <p className="mb-2 mt-3 text-xs font-black text-ink-700">{t.commonMistakes}</p>
                  <ul className="space-y-1.5">
                    {guide.mistakes.map((mk, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-ink-500">
                        <Icon name="AlertTriangle" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-600" />
                        {mk}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {videoUrl && (
                <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-3 w-full py-2.5 text-sm">
                  <Icon name="Video" className="h-4 w-4 text-primary-c" />
                  {t.videoLabel}
                </a>
              )}
            </div>
          )}
        </div>

        {/* بدائل — الجهاز مشغول؟ (لغير أجهزة الكتالوج فقط؛ الأجهزة لها بطاقتا البديل أعلاه) */}
        {!machineAlt && alts.length > 0 && (
          <div className="card overflow-hidden">
            <button type="button" onClick={() => setOpenAlt((o) => !o)} className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-bold text-ink-900">
              <span className="flex items-center gap-2"><Icon name="Layers" className="h-4 w-4 text-primary-c" />{t.altPrompt}</span>
              <Icon name={openAlt ? 'Minus' : 'Plus'} className="h-4 w-4 text-ink-400" />
            </button>
            {openAlt && (
              <ul className="space-y-2 border-t border-line px-4 py-4">
                {alts.map((a) => (
                  <li key={a.id} className="rounded-xl border border-line bg-page p-3">
                    <p className="text-sm font-bold text-ink-900">{exerciseDisplayName(a.nameAr, a.nameEn, lang)}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {muscleLabel(a.primaryMuscle, lang)} · {a.equipment.join(lang === 'en' ? ', ' : '، ')}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" onClick={() => doSwap(a.id, false)} className="btn-primary px-3 py-2 text-xs">
                        <Icon name="Repeat" className="h-3.5 w-3.5" />{t.swapForToday}
                      </button>
                      {onSwapExercise && (
                        <button type="button" onClick={() => doSwap(a.id, true)} className="btn-ghost px-3 py-2 text-xs">
                          <Icon name="Check" className="h-3.5 w-3.5" />{t.saveToPlan}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* تفاصيل إضافية (اختيارية) */}
        <div className="card overflow-hidden">
          <button type="button" onClick={() => setOpenDetails((o) => !o)} className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-bold text-ink-900">
            <span className="flex items-center gap-2"><Icon name="Sparkles" className="h-4 w-4 text-ink-400" />{t.moreDetails}</span>
            <Icon name={openDetails ? 'Minus' : 'Plus'} className="h-4 w-4 text-ink-400" />
          </button>
          {openDetails && (
            <div className="space-y-3 border-t border-line px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-ink-500">{t.difficulty}:</span>
                {difficulties.map((d) => (
                  <button key={d.value} type="button" onClick={() => setMeta({ difficulty: d.value })} className={cn('rounded-full border px-3 py-1 text-xs font-bold', s.difficulty === d.value ? 'border-primary-soft bg-primary text-white' : 'border-line bg-surface text-ink-700')}>{d.label}</button>
                ))}
              </div>
              <div>
                <span className="text-xs text-ink-500">{t.rpe}:</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {[6, 7, 8, 9, 10].map((v) => (
                    <button key={v} type="button" onClick={() => setMeta({ rpe: s.rpe === v ? undefined : v })} className={cn('h-11 w-11 rounded-lg border text-xs font-bold', s.rpe === v ? 'border-primary-soft bg-primary text-white' : 'border-line bg-surface text-ink-700')}>{v}</button>
                  ))}
                </div>
              </div>
              <input className="w-full rounded-lg border border-line bg-beige px-3 py-2.5 text-sm text-ink-900 focus:outline-none" value={s.painNote} onChange={(e) => setMeta({ painNote: e.target.value })} placeholder={t.painLabel} />
              <input className="w-full rounded-lg border border-line bg-beige px-3 py-2.5 text-sm text-ink-900 focus:outline-none" value={s.notes} onChange={(e) => setMeta({ notes: e.target.value })} placeholder={t.notes} />
            </div>
          )}
        </div>

        <p className="flex items-start gap-2 rounded-xl border border-gold-400/40 bg-gold-200/40 p-3 text-xs leading-relaxed text-ink-700">
          <Icon name="AlertTriangle" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />{t.safety}
        </p>
      </main>

      {/* إشعار حفظ الجولة */}
      {savedFlash && (
        <div className="pointer-events-none fixed inset-x-0 bottom-44 z-30 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white shadow-glow">
            <Icon name="CheckCircle2" className="h-4 w-4" />{t.setSaved}
          </span>
        </div>
      )}

      {/* مؤقّت الراحة النشط */}
      {timer.running && (
        <div className="fixed inset-x-0 bottom-[4.75rem] z-20 border-t border-primary-soft bg-surface backdrop-blur">
          <div className="container-page flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3">
              <span className="relative grid h-12 w-12 shrink-0 place-items-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
                <span className="relative grid h-12 w-12 place-items-center rounded-full bg-primary text-base font-black text-white">{timer.left}</span>
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-primary-c">{t.rest}</p>
                {/* عزل اتجاه المحتوى: اسم التمرين قد يكون عربيًا داخل واجهة إنجليزية (LTR) والعكس. */}
                <p className="truncate text-xs text-ink-500">{t.nextUp}: <bdi>{restNext}</bdi></p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button type="button" onClick={() => setTimer((p) => ({ ...p, left: p.left + 30 }))} className="min-h-[44px] rounded-lg border border-line bg-surface px-2.5 py-2 text-xs font-bold text-ink-700">{t.restAdd30}</button>
              <button type="button" onClick={() => setTimer({ left: 0, running: false })} className="min-h-[44px] rounded-lg border border-line bg-surface px-2.5 py-2 text-xs font-bold text-ink-700">{t.skipRest}</button>
            </div>
          </div>
        </div>
      )}

      {/* شريط الإجراءات السفلي */}
      <div className="sticky bottom-0 z-10 border-t border-line bg-page/95 backdrop-blur">
        <div className="container-page flex items-center gap-2 py-3">
          <button type="button" onClick={goPrev} disabled={current === 0} className="btn-ghost h-12 w-12 shrink-0 p-0 disabled:opacity-40" aria-label={t.prevExercise}>
            <Icon name={prevChevron} className="h-5 w-5" />
          </button>
          {isLast ? (
            <button type="button" onClick={() => setConfirmOpen(true)} className="btn-primary flex-1 py-3.5 text-base">
              <Icon name="CheckCircle2" className="h-5 w-5" />{t.finish}
            </button>
          ) : (
            <button type="button" onClick={goNext} className="btn-primary flex-1 py-3.5 text-base">
              {t.nextExercise}<Icon name={nextChevron} className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* تأكيد إنهاء التمرين (داخل التطبيق — لا confirm متصفح) */}
      {confirmOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink-900/40 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-card">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary-c">
              <Icon name="CheckCircle2" className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-lg font-black text-ink-900">{t.finishTitle}</h3>
            <p className="mt-1 text-sm text-ink-500">{doneCount < total ? t.finishBodyUnfinished : t.finishBodyDone}</p>
            <p className="mt-3 text-xs font-bold text-ink-700">{t.progress}: {doneCount}/{total}</p>
            <div className="mt-5 flex flex-col gap-2">
              <button type="button" onClick={doFinish} className="btn-primary w-full py-3 text-base">
                <Icon name="CheckCircle2" className="h-5 w-5" />{t.confirmFinish}
              </button>
              <button type="button" onClick={() => setConfirmOpen(false)} className="btn-ghost w-full py-2.5 text-sm">
                {t.keepGoing}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// [CTO-73] الشاشة ١ — `PerfCard` أُزيلت: كانت تُرسَم مرّتين لتقول الجملة نفسها
// («ما فيه سجل سابق») في بطاقتين متجاورتين. **الوظيفة باقية** — آخر أداء وأفضل
// أداء يُعرضان الآن في سطر السجلّ المضغوط داخل بطاقة الهويّة، وحين لا سجلّ يحلّ
// محلّهما سطر دعوة واحد (`firstTimeHint`). لا معلومة فُقدت، والبطاقتان اندمجتا.

interface StepperProps {
  label: string
  value: string
  placeholder?: string
  step: number
  mode: 'decimal' | 'numeric'
  invalid?: boolean
  onChange: (v: string) => void
  onStep: (delta: number) => void
}

function Stepper({ label, value, placeholder, step, mode, invalid, onChange, onStep }: StepperProps) {
  return (
    <div>
      {/* [CTO-73] سلّم الخطوط — ١١px كان أصغر نصّ في الشاشة (ملاحظة الميدان ٥).
          تسمية الحقل ليست زخرفًا: بلا قراءتها لا يُعرف أيّ رقم يُدخَل. رُفعت إلى ١٤px. */}
      <p className="mb-1 text-center text-sm font-bold text-ink-500">{label}</p>
      <div className="flex items-stretch gap-1.5">
        <button type="button" onClick={() => onStep(-step)} aria-label={`${label} -${step}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-line bg-surface text-ink-700 active:scale-95">
          <Icon name="Minus" className="h-4 w-4" />
        </button>
        <input
          className={cn(
            'w-full min-w-0 rounded-lg border bg-beige px-1 text-center text-base font-black text-ink-900 focus:outline-none',
            invalid ? 'border-danger focus:border-danger' : 'border-line focus:border-brand-500/50',
          )}
          inputMode={mode}
          aria-label={label}
          aria-invalid={invalid}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        <button type="button" onClick={() => onStep(step)} aria-label={`${label} +${step}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-line bg-surface text-ink-700 active:scale-95">
          <Icon name="Plus" className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
