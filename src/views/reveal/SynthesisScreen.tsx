// شاشة التجهيز — قصّة قصيرة بدل دوّامة صامتة.
// [OVERNIGHT-4] الحزمة ٤ · §6.1.
//
// ═══ القاعدة الحاكمة: لا انتظار مزيّف ═══
// المراحل **تتبع العمل الحقيقي ولا تقوده**. لكل مرحلة حدّ أدنى للمكوث حتى
// تُقرأ (لا وميض)، فإذا انتهى التوليد باكرًا **قفزنا إلى النهاية بعد إنهاء
// المرحلة الجارية** ولم نكمل بقيّة القصّة لمجرّد ملء الوقت. وإذا تأخّر
// التوليد بقينا على المرحلة الأخيرة — فالشاشة تصف ما يجري، لا تمثّله.
//
// وهذا ليس تجميلًا: عدّاد يمشي بلا عمل خلفه **كذبة صغيرة**، والميثاق §٥ يمنع
// أن تَعِد الواجهة بما لا يحدث. فالمكوّن يستقبل `done` من المستدعي ولا يخترع
// تقدّمًا من عنده.

import { useEffect, useReducer, useRef, useState } from 'react'
import type { Lang } from '@/lib/appPreferences'
import { revealStrings } from '@/i18n/dict/reveal'
import { Icon } from '@/components/Icon'

/** أقلّ مكوث لمرحلة — تحت هذا الحدّ يصير النصّ وميضًا لا يُقرأ. */
const MIN_STAGE_MS = 420

/** هل طلب المستخدم تقليل الحركة؟ يُقرأ مرّة، ويُحترم بلا استثناء. */
function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export function SynthesisScreen({ lang, done }: { lang: Lang; done: boolean }) {
  const t = revealStrings[lang] ?? revealStrings.ar
  const stages = t.synthesis.stages
  const [reduced] = useState(prefersReducedMotion)
  const [stage, advance] = useReducer((s: number) => Math.min(s + 1, stages.length - 1), 0)
  const doneRef = useRef(done)
  doneRef.current = done

  useEffect(() => {
    if (reduced) return
    // مؤقّت واحد يتجدّد: يتقدّم مرحلةً كل `MIN_STAGE_MS` **ما دام العمل جاريًا**.
    // انتهى العمل ⇒ نتوقّف عن التقدّم؛ المستدعي يستبدل الشاشة كلّها.
    const id = window.setInterval(() => {
      if (doneRef.current) return
      advance()
    }, MIN_STAGE_MS)
    return () => window.clearInterval(id)
  }, [reduced])

  // تقليل الحركة: سطر واحد ساكن، بلا مراحل ولا نبض ولا انتقالات.
  if (reduced) {
    return (
      <div
        dir={lang === 'en' ? 'ltr' : 'rtl'}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={t.synthesis.ariaLabel}
        data-testid="reveal-synthesis"
        data-reduced-motion="true"
        className="v2-surface-dark fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-page px-6 text-center text-ink-900"
      >
        <h1 className="text-2xl font-black tracking-tight">{t.synthesis.reducedMotion}</h1>
      </div>
    )
  }

  return (
    <div
      dir={lang === 'en' ? 'ltr' : 'rtl'}
      role="status"
      aria-live="polite"
      aria-busy="true"
      // التسمية ثابتة عمدًا: تغييرها كل ٤٢٠ مللي ثانية يجعل الشاشة القارئة
      // تقاطع نفسها خمس مرّات. القصّة بصرية، والإعلان الصوتي واحد.
      aria-label={t.synthesis.ariaLabel}
      data-testid="reveal-synthesis"
      className="v2-surface-dark fixed inset-0 z-[60] flex flex-col items-center justify-center bg-page px-6 text-center text-ink-900"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="v2-glow-ember absolute start-1/2 top-1/3 h-[36%] w-[78%] -translate-x-1/2 rounded-full blur-[2px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-xs flex-col items-center">
        <span
          aria-hidden="true"
          className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary/25 border-t-primary"
        />

        {/* المراحل مكدّسة: المنجَزة باهتة بعلامة، والجارية بارزة، والقادمة مخفيّة.
            الارتفاع ثابت فلا يقفز التخطيط بين مرحلة وأخرى. */}
        <ul className="mt-7 w-full space-y-2.5 text-start" data-testid="reveal-synthesis-stages">
          {stages.map((label, i) => {
            const state = i < stage ? 'done' : i === stage ? 'active' : 'pending'
            return (
              <li
                key={label}
                data-stage-state={state}
                aria-hidden={state === 'pending' ? 'true' : undefined}
                className={[
                  'flex items-center gap-2.5 text-sm font-bold transition-opacity duration-300',
                  state === 'done' ? 'text-ink-400 opacity-70' : '',
                  state === 'active' ? 'text-ink-900 opacity-100' : '',
                  state === 'pending' ? 'text-ink-400 opacity-0' : '',
                ].join(' ')}
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center">
                  {state === 'done'
                    ? <Icon name="Check" className="v2-text-green h-4 w-4" strokeWidth={3} />
                    : <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </span>
                <span>{label}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
