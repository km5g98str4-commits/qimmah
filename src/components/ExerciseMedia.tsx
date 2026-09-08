import { useEffect, useState, type ReactNode } from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import { getExerciseMedia } from '@/data/exerciseMedia'
import { getExerciseGif } from '@/data/exerciseGifs'
import { getMachineImage } from '@/data/machineImages'
import { getExerciseIllustration } from '@/data/exerciseIllustrations'
import { getExerciseCard } from '@/data/exerciseCards'
import { LEGACY_EXERCISE_ID_MAP, canonicalExerciseId, isPlaceholderOnlyMedia, getExercise } from '@/data/exercises'
import { muscleLabelAr } from '@/data/muscleGroups'
import { exerciseMediaStrings } from '@/i18n/dict/exerciseMedia'
import type { Lang } from '@/lib/appPreferences'
import type { MuscleId } from '@/types/muscles'

// (P12) خرائط الوسائط قد تكون بمفاتيح قديمة أو قانونية أثناء التوحيد — نحلّ الوسائط
// بتجربة: المعرّف كما ورد ← القانوني ← كل الأسماء القديمة المقابلة له.
const CANONICAL_TO_LEGACY: Record<string, string[]> = {}
for (const [legacy, canonical] of Object.entries(LEGACY_EXERCISE_ID_MAP)) {
  CANONICAL_TO_LEGACY[canonical] = [...(CANONICAL_TO_LEGACY[canonical] ?? []), legacy]
}

function idCandidates(exerciseId: string): string[] {
  const canonical = canonicalExerciseId(exerciseId)
  const all = [exerciseId, canonical, ...(CANONICAL_TO_LEGACY[canonical] ?? [])]
  return all.filter((id, i) => all.indexOf(id) === i)
}

function resolveByCandidates<T>(exerciseId: string, get: (id: string) => T | undefined): T | undefined {
  for (const id of idCandidates(exerciseId)) {
    const found = get(id)
    if (found) return found
  }
  return undefined
}

/** يبني سلسلة مصادر (محلّي ثم بعيد) بلا تكرار ولا قيم فارغة. */
function chain(...srcs: (string | undefined)[]): string[] {
  return srcs.filter((s): s is string => !!s).filter((s, i, a) => a.indexOf(s) === i)
}

/**
 * صورة بسلسلة مصادر بديلة: تجرّب الأول، وعند فشله تنتقل للتالي، وعند نفاد الكل تُبلّغ
 * onExhausted فيتدهور العرض إلى الحالة الصادقة — لا صورة مكسورة أبدًا.
 *
 * `loading="lazy"` + `decoding="async"`: الإطارات خارج الشاشة (قوائم التمارين، شاشة
 * التفاصيل قبل التمرير) لا تُحمَّل حتى تقترب من مجال الرؤية.
 */
function FallbackImg({
  srcs,
  alt,
  className,
  onExhausted,
}: {
  srcs: string[]
  alt: string
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
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => (idx + 1 < srcs.length ? setIdx(idx + 1) : onExhausted())}
    />
  )
}

interface ExerciseMediaProps {
  exerciseId: string
  lang?: Lang
  /** عضلات أساسية — تُعرض في شريط أسفل الإطار، لا فوق الرسم. */
  muscles?: MuscleId[]
  /** ارتفاع الإطار (Tailwind). */
  heightClass?: string
  /** إخفاء رقائق العضلات. */
  hideChips?: boolean
  /**
   * `sequence` (افتراضي): البداية والنهاية جنبًا إلى جنب مع سهم اتجاه — للأسطح الكبيرة.
   * `thumb`: إطار البداية وحده بلا تسميات — للقوائم والصور المصغّرة حيث لا تتّسع لوحتان.
   */
  variant?: 'sequence' | 'thumb'
}

/**
 * عرض وسائط التمرين (Q20).
 *
 * لماذا أُعيد بناؤه: العرض السابق لوحة واحدة داكنة تُبدّل بين إطار البداية والنهاية كل
 * ١٫١ ثانية، فوقها تدرّج تعتيم `from-ink-900/85` بقي من زمنٍ كان اسم التمرين يُكتب فوق
 * الصورة. ثلاث مشكلات: (١) المستخدم لا يعرف أيّ إطارٍ يرى فلا يقرأ اتجاه الحركة،
 * (٢) التعتيم يُطفئ صورًا نظيفة بلا سبب فتبدو البطاقة رماديّة، (٣) التبديل التلقائي لا
 * يحترم `prefers-reduced-motion`.
 *
 * العرض الحالي يضع الوضعيتين جنبًا إلى جنب مع سهم بينهما — يُقرأ الاتجاه فورًا، وتختفي
 * الحاجة إلى أي حركة (فيُحترم تقليل الحركة بالبناء لا بشرط)، ولا تُعتَّم الصورة، ولا يُكتب
 * اسم التمرين فوق الرسم إطلاقًا (الاسم مسؤولية النداء الأعلى، أسفل الإطار).
 *
 * سلسلة الرجوع: ملف محلّي → رابط بعيد → «الشرح المرئي قيد الإضافة». لا صورة مكسورة،
 * ولا بديل يتظاهر بأنه شرح صحيح.
 */
export function ExerciseMedia({
  exerciseId,
  lang = 'ar',
  muscles = [],
  heightClass = 'h-40',
  hideChips = false,
  variant = 'sequence',
}: ExerciseMediaProps) {
  const s = exerciseMediaStrings[lang]
  const canonical = canonicalExerciseId(exerciseId)
  const ex = getExercise(canonical) ?? getExercise(exerciseId)
  const name = (lang === 'en' ? ex?.nameEn : ex?.nameAr) ?? ''

  // بطاقات الأجهزة بلا لقطة مرخّصة: رسم الجهاز الداخلي فقط — لا صورة وزن حرّ مُنسوبة خطأً.
  // [FOUNDER-CARDS-001] بطاقة المؤسس تسبق كل الطبقات — صورة التمرين نفسه بعنوانه.
  const card = getExerciseCard(canonical) ?? getExerciseCard(exerciseId)
  const [cardFailed, setCardFailed] = useState(false)
  const placeholderOnly = isPlaceholderOnlyMedia(exerciseId)
  const machineImg = placeholderOnly
    ? getMachineImage(canonical) ?? `/exercise-machine-images/${canonical}.svg`
    : undefined

  const media = placeholderOnly ? undefined : resolveByCandidates(exerciseId, getExerciseMedia)
  const gif = placeholderOnly ? undefined : resolveByCandidates(exerciseId, getExerciseGif)
  // رسم الحركة الداخلي — تمارين بلا لقطة مرخّصة لنمط حركتها (يمرّ بسجلّ الحقوق كالأجهزة).
  const illustration = placeholderOnly ? undefined : resolveByCandidates(exerciseId, getExerciseIllustration)

  const [startFailed, setStartFailed] = useState(false)
  const [endFailed, setEndFailed] = useState(false)
  const [machineFailed, setMachineFailed] = useState(false)
  const [gifFailed, setGifFailed] = useState(false)
  const [illustrationFailed, setIllustrationFailed] = useState(false)

  useEffect(() => {
    setCardFailed(false)
    setStartFailed(false)
    setEndFailed(false)
    setMachineFailed(false)
    setGifFailed(false)
    setIllustrationFailed(false)
  }, [exerciseId])

  const startSrcs = chain(media?.img0, media?.img0Remote)
  const endSrcs = chain(media?.img1, media?.img1Remote)
  const gifSrcs = chain(gif, media?.gifUrl)

  const hasGif = gifSrcs.length > 0 && !gifFailed
  const hasStart = startSrcs.length > 0 && !startFailed
  const hasIllustration = !!illustration && !illustrationFailed
  const hasEnd = endSrcs.length > 0 && !endFailed && endSrcs.join('|') !== startSrcs.join('|')
  const hasMachine = !!machineImg && !machineFailed

  const chips =
    !hideChips && muscles.length > 0 ? (
      <div className="flex flex-wrap gap-1.5 border-t border-line bg-surface px-3 py-2">
        {muscles.slice(0, 3).map((m) => (
          <span key={m} className="rounded-full bg-beige px-2 py-0.5 text-[10px] font-bold text-ink-700">
            {muscleLabelAr(m)}
          </span>
        ))}
      </div>
    ) : null

  // ————— لا وسيط موثوق → الحالة الصادقة —————
  if (card && !cardFailed) {
    // خلفية داكنة ثابتة: البطاقة نفسها داكنة بعنوانها، فلا تُقصّ (contain) ولا تنقلب مع الثيم.
    if (variant === 'thumb') {
      return (
        <div className={cn('relative w-full overflow-hidden bg-[#141a2a]', heightClass)}>
          <FallbackImg srcs={[card]} alt={name} onExhausted={() => setCardFailed(true)} className="absolute inset-0 h-full w-full object-contain" />
        </div>
      )
    }
    return (
      <Shell heightClass={heightClass} chips={chips}>
        <figure className="relative h-full w-full bg-[#141a2a]" data-testid="exercise-card-figure">
          <FallbackImg srcs={[card]} alt={name} onExhausted={() => setCardFailed(true)} className="absolute inset-0 h-full w-full object-contain" />
        </figure>
      </Shell>
    )
  }

  if (placeholderOnly ? !hasMachine : !hasGif && !hasStart && !hasIllustration) {
    return (
      <Shell heightClass={heightClass} chips={chips}>
        <MediaPending lang={lang} compact={variant === 'thumb'} />
      </Shell>
    )
  }

  // ————— مصغّرة: إطار واحد بلا تسميات —————
  if (variant === 'thumb') {
    const srcs = placeholderOnly ? [machineImg!] : hasGif ? gifSrcs : hasStart ? startSrcs : [illustration!]
    const isVector = placeholderOnly || (!hasGif && !hasStart)
    const onOut = placeholderOnly
      ? () => setMachineFailed(true)
      : hasGif
        ? () => setGifFailed(true)
        : hasStart
          ? () => setStartFailed(true)
          : () => setIllustrationFailed(true)
    return (
      <div className={cn('relative w-full overflow-hidden bg-beige', heightClass)}>
        <FallbackImg
          srcs={srcs}
          alt={name}
          onExhausted={onOut}
          className={cn('absolute inset-0 h-full w-full', isVector ? 'object-contain p-1' : 'object-cover')}
        />
      </div>
    )
  }

  // ————— رسم الجهاز: لوحة واحدة موسومة بصدق (رسم لا صورة) —————
  if (placeholderOnly) {
    return (
      <Shell heightClass={heightClass} chips={chips}>
        <figure className="relative h-full w-full bg-surface">
          <FallbackImg
            srcs={[machineImg!]}
            alt={s.machineAlt(name)}
            onExhausted={() => setMachineFailed(true)}
            className="absolute inset-0 h-full w-full object-contain p-3"
          />
          <FrameLabel text={s.machineLabel} at="bottom" />
        </figure>
      </Shell>
    )
  }

  // ————— رسم الحركة الداخلي: لوحة موسومة بصدق (رسم لا صورة) —————
  if (!hasGif && !hasStart && hasIllustration) {
    return (
      <Shell heightClass={heightClass} chips={chips}>
        <figure className="relative h-full w-full bg-surface">
          <FallbackImg
            srcs={[illustration!]}
            alt={s.illustrationAlt(name)}
            onExhausted={() => setIllustrationFailed(true)}
            className="absolute inset-0 h-full w-full object-contain p-3"
          />
          <FrameLabel text={s.illustrationLabel} at="bottom" />
        </figure>
      </Shell>
    )
  }

  // ————— GIF متحرّك (إن وُجد مصدر نظيف) —————
  if (hasGif) {
    return (
      <Shell heightClass={heightClass} chips={chips}>
        <div className="relative h-full w-full bg-beige">
          <FallbackImg
            srcs={gifSrcs}
            alt={name}
            onExhausted={() => setGifFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </Shell>
    )
  }

  // ————— لقطة واحدة فقط: نقولها صراحةً ولا نوهم بحركة —————
  if (!hasEnd) {
    return (
      <Shell heightClass={heightClass} chips={chips}>
        <figure className="relative h-full w-full bg-beige">
          <FallbackImg
            srcs={startSrcs}
            alt={name}
            onExhausted={() => setStartFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <FrameLabel text={s.singleFrameLabel} />
        </figure>
      </Shell>
    )
  }

  // ————— التسلسل: البداية ← النهاية جنبًا إلى جنب —————
  // بلا أي حركة: الوضعيتان ظاهرتان معًا، فيُقرأ الاتجاه من السهم لا من التبديل الزمني.
  // هذا يحترم prefers-reduced-motion بالبناء (لا مؤقّت ولا انتقال).
  return (
    <Shell heightClass={heightClass} chips={chips}>
      <figure className="relative grid h-full w-full grid-cols-2 gap-px bg-line" aria-label={s.sequenceAlt(name)}>
        <div className="relative overflow-hidden bg-beige">
          <FallbackImg
            srcs={startSrcs}
            alt=""
            onExhausted={() => setStartFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <FrameLabel text={s.startLabel} />
        </div>
        <div className="relative overflow-hidden bg-beige">
          <FallbackImg
            srcs={endSrcs}
            alt=""
            onExhausted={() => setEndFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <FrameLabel text={s.endLabel} />
        </div>
        {/* سهم الاتجاه — يشير دائمًا من لوحة البداية إلى لوحة النهاية في الاتجاهين
            (RTL يقلب ترتيب الأعمدة، فيُقلب السهم معها عبر ltr:rotate-180). */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-white shadow-card"
        >
          <Icon name="ArrowLeft" className="h-4 w-4 ltr:rotate-180" strokeWidth={3} />
        </span>
      </figure>
    </Shell>
  )
}

/**
 * غلاف الإطار: يحمل الارتفاع المطلوب ويقسّمه — منطقة الوسيط تأخذ المتبقّي ورقائق
 * العضلات شريطًا أسفلها. مهم أن يبقى الارتفاع على الغلاف لا على الداخل: مواضع النداء
 * تمرّر `h-full` داخل حاوية `aspect-video`، فلو وُضع على عنصر داخلي لانهار إلى صفر.
 */
function Shell({ heightClass, chips, children }: { heightClass: string; chips: ReactNode; children: ReactNode }) {
  return (
    <div className={cn('flex w-full flex-col overflow-hidden', heightClass)}>
      <div className="relative min-h-0 flex-1">{children}</div>
      {chips}
    </div>
  )
}

/**
 * تسمية إطار صغيرة — بعيدة عن مركز الحركة وبخلفية تضمن التباين.
 * `at="bottom"` لرسوم الأجهزة: زاويتها العليا تحمل شعار قِمّة داخل الأصل نفسه.
 */
function FrameLabel({ text, at = 'top' }: { text: string; at?: 'top' | 'bottom' }) {
  return (
    <span
      className={cn(
        'absolute start-1.5 rounded-md bg-ink-900/70 px-1.5 py-0.5 text-[10px] font-black text-white backdrop-blur-sm',
        at === 'top' ? 'top-1.5' : 'bottom-1.5',
      )}
    >
      {text}
    </span>
  )
}

/**
 * الحالة الصادقة — تُعرض حين لا يوجد وسيط موثوق.
 *
 * لا تتظاهر بأنها شرح: لا رسم جسم، ولا وضعية مولّدة، ولا أيقونة تُقرأ كأنها الحركة.
 * سطح هادئ + نصّ يقول ما هو حاصل بالضبط ويحيل المستخدم إلى الخطوات المكتوبة.
 */
function MediaPending({ lang, compact }: { lang: Lang; compact: boolean }) {
  const s = exerciseMediaStrings[lang]
  return (
    <div
      role="note"
      className="relative flex h-full w-full flex-col items-center justify-center gap-1.5 bg-beige px-4 text-center"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface text-ink-400">
        <Icon name="ImageOff" className="h-4.5 w-4.5" />
      </span>
      {!compact && (
        <>
          <p className="text-xs font-black text-ink-700">{s.pendingTitle}</p>
          <p className="max-w-[36ch] text-[11px] leading-relaxed text-ink-500">{s.pendingBody}</p>
        </>
      )}
    </div>
  )
}
