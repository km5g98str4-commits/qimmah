import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import { getExerciseMedia } from '@/data/exerciseMedia'
import { muscleLabelAr } from '@/data/muscleGroups'
import type { MuscleId } from '@/types/muscles'

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
 * إطار وسائط التمرين — يعرض صورة حقيقية من قاعدة بيانات عامة (free-exercise-db)
 * مع تلاشٍ متبادل بين إطار البداية والنهاية لمحاكاة الحركة، أو GIF متحرّك عند توفّره.
 * التمارين غير المطابِقة (كارديو/مرونة/نادرة) تعرض بديلًا أنيقًا — لا صورة مكسورة أبدًا.
 */
export function ExerciseMedia({ exerciseId, muscles = [], heightClass = 'h-40', hideChips = false }: ExerciseMediaProps) {
  const media = getExerciseMedia(exerciseId)
  const [frame, setFrame] = useState(0)
  const [failed, setFailed] = useState(false)

  const animated = !!media?.gifUrl
  const twoFrame = !!media && !animated && media.img1 !== media.img0

  useEffect(() => {
    setFrame(0)
    setFailed(false)
  }, [exerciseId])

  useEffect(() => {
    if (!twoFrame || failed) return
    const t = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 1100)
    return () => clearInterval(t)
  }, [twoFrame, failed])

  // بديل أنيق: عند غياب المطابقة أو فشل تحميل الصورة (لا صورة مكسورة).
  if (!media || failed) {
    return <ExercisePlaceholder muscles={muscles} heightClass={heightClass} hideChips={hideChips} />
  }

  return (
    // خلفية داكنة بالهوية تحت الصورة — تبقى أنيقة أثناء التحميل وتحافظ على وضوح النص فوقها.
    <div className={cn('relative w-full overflow-hidden bg-gradient-to-br from-ink-900 via-ink-700 to-ink-900', heightClass)}>
      {animated ? (
        <img
          src={media.gifUrl}
          alt=""
          aria-hidden="true"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <>
          <img
            src={media.img0}
            alt=""
            aria-hidden="true"
            onError={() => setFailed(true)}
            className={cn('absolute inset-0 h-full w-full object-cover transition-opacity duration-700', frame === 0 ? 'opacity-100' : 'opacity-0')}
          />
          {twoFrame && (
            <img
              src={media.img1}
              alt=""
              aria-hidden="true"
              onError={() => setFailed(true)}
              className={cn('absolute inset-0 h-full w-full object-cover transition-opacity duration-700', frame === 1 ? 'opacity-100' : 'opacity-0')}
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
