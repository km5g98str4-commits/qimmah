import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import type { MuscleId } from '@/types/muscles'
import { muscleLabelAr } from '@/data/muscleGroups'
import { getExerciseDemo } from '@/data/exerciseDemos'

interface ExerciseDemoProps {
  exerciseId: string
  nameEn: string
  lang: Lang
  /** رابط بحث/فيديو يوتيوب — يظهر كبديل «شاهد على يوتيوب». */
  videoUrl?: string
  /** العضلات الأساسية — لرقائق الإطار البديل. */
  primaryMuscles: MuscleId[]
}

// مدة بقاء كل إطار قبل التبديل (يحاكي إيقاع الحركة).
const FRAME_MS = 1100

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

/**
 * عرض تمرين متحرك — يبدّل بين إطار البداية والنهاية لمحاكاة الحركة.
 * عند غياب العرض أو فشل تحميله يظهر إطار بديل أنيق («العرض قريبًا») — لا صورة مكسورة أبدًا.
 */
export function ExerciseDemo({ exerciseId, nameEn, lang, videoUrl, primaryMuscles }: ExerciseDemoProps) {
  const demo = getExerciseDemo(exerciseId)
  const [failed, setFailed] = useState(false)
  const [playing, setPlaying] = useState(() => !prefersReducedMotion())
  const [frame, setFrame] = useState(0)
  const [ready, setReady] = useState(false)

  const hasDemo = Boolean(demo) && !failed

  // إعادة الضبط عند تغيّر التمرين.
  useEffect(() => {
    setFailed(false)
    setFrame(0)
    setReady(false)
    setPlaying(!prefersReducedMotion())
  }, [exerciseId])

  useEffect(() => {
    if (!hasDemo || !playing || !demo || !ready) return
    const n = demo.frames.length
    const t = window.setInterval(() => setFrame((f) => (f + 1) % n), FRAME_MS)
    return () => window.clearInterval(t)
  }, [hasDemo, playing, demo, ready])

  const ytLabel = lang === 'en' ? 'Watch on YouTube' : 'شاهد على يوتيوب'

  // — الإطار البديل (لا عرض مربوط أو فشل التحميل) —
  // المسرح داكن ثابت في الوضعين (الفاتح/الداكن) كمشغّل وسائط — لا يعتمد على رموز الثيم المتبدّلة.
  if (!hasDemo || !demo) {
    return (
      <div className="relative h-52 w-full overflow-hidden bg-gradient-to-br from-[#10131a] via-[#171b24] to-[#0d0f14] sm:h-56">
        <div className="absolute inset-0 opacity-20 bg-grid-faint" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-white shadow-glow">
            <Icon name="Dumbbell" className="h-8 w-8" strokeWidth={2.5} />
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-white/85 backdrop-blur">
            {lang === 'en' ? 'Demo coming soon' : 'العرض قريبًا'}
          </span>
        </div>
        <div className="absolute start-3 top-3 flex flex-wrap gap-1.5">
          {primaryMuscles.slice(0, 3).map((m) => (
            <span key={m} className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
              {muscleLabelAr(m)}
            </span>
          ))}
        </div>
        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 end-3 flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur transition-colors hover:bg-white/25"
          >
            <Icon name="Video" className="h-3.5 w-3.5" />
            {ytLabel}
          </a>
        )}
      </div>
    )
  }

  // — العرض المتحرك — (مسرح داكن ثابت لإبراز الصور مهما كان ثيم التطبيق)
  return (
    <div className="relative h-52 w-full overflow-hidden bg-gradient-to-br from-[#10131a] via-[#171b24] to-[#0d0f14] sm:h-56">
      {/* هيكل تحميل بسيط حتى يجهز أول إطار */}
      {!ready && <div className="absolute inset-0 animate-pulse bg-[#171b24]" />}

      {demo.frames.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={`${nameEn} — ${i === 0 ? (lang === 'en' ? 'start' : 'البداية') : lang === 'en' ? 'end' : 'النهاية'}`}
          loading="lazy"
          decoding="async"
          onLoad={() => { if (i === 0) setReady(true) }}
          onError={() => setFailed(true)}
          className={cn(
            'absolute inset-0 h-full w-full object-contain transition-opacity duration-500',
            i === frame ? 'opacity-100' : 'opacity-0',
          )}
        />
      ))}

      {/* شارة «عرض متحرك» */}
      <span className="absolute start-3 top-3 flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold text-white/90 backdrop-blur">
        <span className={cn('h-1.5 w-1.5 rounded-full bg-primary', playing && 'animate-pulse')} />
        {lang === 'en' ? 'Animated demo' : 'عرض متحرك'}
      </span>

      {/* عناصر التحكم: تشغيل/إيقاف + يوتيوب */}
      <div className="absolute bottom-3 end-3 flex items-center gap-2">
        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={ytLabel}
            className="grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:bg-black/70"
          >
            <Icon name="Video" className="h-4 w-4" />
          </a>
        )}
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? (lang === 'en' ? 'Pause demo' : 'إيقاف العرض') : lang === 'en' ? 'Play demo' : 'تشغيل العرض'}
          className="grid h-9 w-9 place-items-center rounded-full bg-primary text-white shadow-glow transition-transform hover:scale-105"
        >
          <Icon name={playing ? 'Pause' : 'Play'} className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
