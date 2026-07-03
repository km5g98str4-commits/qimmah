import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import { getExerciseMedia } from '@/data/exerciseMedia'
import { getExerciseGif } from '@/data/exerciseGifs'
import { LEGACY_EXERCISE_ID_MAP, canonicalExerciseId } from '@/data/exercises'
import { muscleLabelAr } from '@/data/muscleGroups'
import type { MuscleId } from '@/types/muscles'

// (P12) خرائط الوسائط (exerciseGifs/exerciseMedia) قد تكون بمفاتيح قديمة أو قانونية أثناء
// التوحيد — نحلّ الوسائط بتجربة: المعرّف كما ورد ← القانوني ← كل الأسماء القديمة المقابلة له.
const CANONICAL_TO_LEGACY: Record<string, string[]> = {}
for (const [legacy, canonical] of Object.entries(LEGACY_EXERCISE_ID_MAP)) {
  CANONICAL_TO_LEGACY[canonical] = [...(CANONICAL_TO_LEGACY[canonical] ?? []), legacy]
}

/** مرشّحو المعرّف بالترتيب: كما ورد ← القانوني ← الأسماء القديمة (بلا تكرار). */
function idCandidates(exerciseId: string): string[] {
  const canonical = canonicalExerciseId(exerciseId)
  const all = [exerciseId, canonical, ...(CANONICAL_TO_LEGACY[canonical] ?? [])]
  return all.filter((id, i) => all.indexOf(id) === i)
}

/** يحلّ وسيطًا بأول مرشّح مطابق (يعمل مع أي من المفاتيح القديمة/القانونية). */
function resolveByCandidates<T>(exerciseId: string, get: (id: string) => T | undefined): T | undefined {
  for (const id of idCandidates(exerciseId)) {
    const found = get(id)
    if (found) return found
  }
  return undefined
}

interface ExerciseMediaProps {
  exerciseId: string
  /** عضلات أساسية تُعرض كرقائق فوق الصورة/البديل. */
  muscles?: MuscleId[]
  /** ارتفاع الإطار (Tailwind) — افتراضي h-40 لرأس بطاقة التفاصيل. */
  heightClass?: string
  /** إخفاء رقائق العضلات (للصور المصغّرة). */
  hideChips?: boolean
}

/**
 * صورة بسلسلة مصادر بديلة: تجرّب المصدر الأول، وعند فشله تنتقل للتالي، وعند نفاد الكل تُبلّغ onExhausted.
 * تُستخدم لتفضيل الملف المحلّي (المُلتزَم في المستودع) ثم الرجوع للرابط البعيد عند تعذّره.
 */
function FallbackImg({
  srcs,
  className,
  onExhausted,
}: {
  srcs: string[]
  className: string
  onExhausted: () => void
}) {
  const key = srcs.join('|')
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    setIdx(0)
  }, [key])
  const src = srcs[idx]
  if (!src) return null
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={className}
      onError={() => (idx + 1 < srcs.length ? setIdx(idx + 1) : onExhausted())}
    />
  )
}

/** يبني سلسلة مصادر (محلّي ثم بعيد) بلا تكرار ولا قيم فارغة. */
function chain(...srcs: (string | undefined)[]): string[] {
  return srcs.filter((s): s is string => !!s).filter((s, i, a) => a.indexOf(s) === i)
}

/**
 * إطار وسائط التمرين — يعرض صورة حقيقية من قاعدة بيانات عامة (free-exercise-db) مُنزَّلة محليًا،
 * مع تلاشٍ متبادل بين إطار البداية والنهاية لمحاكاة الحركة، أو GIF متحرّك عند توفّره.
 * سلسلة الرجوع: ملف محلّي → رابط بعيد → بديل أنيق. لا صورة مكسورة أبدًا.
 */
export function ExerciseMedia({ exerciseId, muscles = [], heightClass = 'h-40', hideChips = false }: ExerciseMediaProps) {
  const media = resolveByCandidates(exerciseId, getExerciseMedia)
  const [frame, setFrame] = useState(0)
  const [baseFailed, setBaseFailed] = useState(false) // نفاد مصادر الإطار الأساسي → بديل أنيق
  const [secondFailed, setSecondFailed] = useState(false) // نفاد مصادر الإطار الثاني → إيقاف التبديل
  const [gifFailed, setGifFailed] = useState(false) // فشل الـ GIF → الرجوع للصور الثابتة

  // يُفضّل GIF المتحرّك المُنزَّل محليًا (public/exercise-gifs) ثم الرابط البعيد إن وُجد، ثم الصور الثابتة.
  const gifSrcs = chain(resolveByCandidates(exerciseId, getExerciseGif), media?.gifUrl)
  const useGif = gifSrcs.length > 0 && !gifFailed
  const src0 = chain(media?.img0, media?.img0Remote)
  const src1 = chain(media?.img1, media?.img1Remote)
  const twoFrame = !useGif && src1.length > 0 && src1.join('|') !== src0.join('|') && !secondFailed

  useEffect(() => {
    setFrame(0)
    setBaseFailed(false)
    setSecondFailed(false)
    setGifFailed(false)
  }, [exerciseId])

  useEffect(() => {
    if (!twoFrame) return
    const t = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 1100)
    return () => clearInterval(t)
  }, [twoFrame])

  // بديل أنيق: عند غياب أي وسيط (لا gif ولا صورة) أو نفاد مصادر الإطار الأساسي (لا صورة مكسورة).
  // نُبقي الـ gif ظاهرًا حتى لو لم توجد صورة ثابتة مطابِقة لهذا التمرين.
  if (!useGif && (!media || baseFailed)) {
    return <ExercisePlaceholder muscles={muscles} heightClass={heightClass} hideChips={hideChips} />
  }

  return (
    // خلفية داكنة بالهوية تحت الصورة — تبقى أنيقة أثناء التحميل وتحافظ على وضوح النص فوقها.
    <div className={cn('relative w-full overflow-hidden bg-gradient-to-br from-ink-900 via-ink-700 to-ink-900', heightClass)}>
      {useGif ? (
        <FallbackImg
          srcs={gifSrcs}
          onExhausted={() => setGifFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <>
          <FallbackImg
            srcs={src0}
            onExhausted={() => setBaseFailed(true)}
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-700',
              frame === 0 ? 'opacity-100' : 'opacity-0',
            )}
          />
          {twoFrame && (
            <FallbackImg
              srcs={src1}
              onExhausted={() => setSecondFailed(true)}
              className={cn(
                'absolute inset-0 h-full w-full object-cover transition-opacity duration-700',
                frame === 1 ? 'opacity-100' : 'opacity-0',
              )}
            />
          )}
        </>
      )}
      {/* تعتيم سفلي ليبقى النص فوق الصورة مقروءًا (الصور بخلفية فاتحة). */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/20 to-ink-900/10" />
      {!hideChips && muscles.length > 0 && (
        <div className="absolute start-3 top-3 flex flex-wrap gap-1.5">
          {muscles.slice(0, 3).map((m) => (
            <span key={m} className="rounded-full bg-ink-900/55 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
              {muscleLabelAr(m)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/** البديل الفاخر — تدرّج داكن + أيقونة + رقائق العضلات (مطابق للتصميم السابق). */
function ExercisePlaceholder({ muscles, heightClass, hideChips }: { muscles: MuscleId[]; heightClass: string; hideChips: boolean }) {
  return (
    <div className={cn('relative w-full bg-gradient-to-br from-ink-900 via-ink-700 to-ink-900', heightClass)}>
      <div className="absolute inset-0 opacity-20 bg-grid-faint" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/90 text-white shadow-glow">
          <Icon name="Dumbbell" className="h-8 w-8" strokeWidth={2.5} />
        </span>
      </div>
      {!hideChips && muscles.length > 0 && (
        <div className="absolute start-3 top-3 flex flex-wrap gap-1.5">
          {muscles.slice(0, 3).map((m) => (
            <span key={m} className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
              {muscleLabelAr(m)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
