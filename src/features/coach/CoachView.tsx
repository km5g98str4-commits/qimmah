// ═══════════════════════════════════════════════════════════════════════════
//  شاشة المرشد — [SOVEREIGN-COACH-002] · المسار `#/coach`.
//
//  ═══ ما تفعله هذه الشاشة، وما لا تفعله ═══
//  تقرأ حالة المستخدم من مخازنه، تنادي المزوّد المُعَدّ، وترسم الجواب من
//  `renderCoachAnswer` وحده. **لا تكتب حرفًا** في أي مخزن، ولا تبني نصًّا،
//  ولا تحسب رقمًا: كل رقم على الشاشة خرج من حقيقة مُسنَدة مرّت بحارس الإسناد.
//
//  ═══ ثلاث صدقيّات مرئية ═══
//  ① **من أين جاء الجواب:** الإفصاح يُقرأ من الجواب نفسه (`disclosure`) لا من
//     ادّعاء مكتوب في الواجهة — فلو وُصِل مزوّد خارجي يومًا تبدّل السطر بنفسه.
//     وحين لا جواب بعد، يُقرأ من المزوّد الذي **سيُجيب** (`resolveCoachProvider`).
//  ② **لا ذاكرة ولا تكيّف:** `noMemoryNote` مكتوب على الشاشة لا في وثيقة.
//  ③ **الفشل لا يُبتلع:** سقوط عقد الإسناد يعرض `answerBlocked` — لا نصف جواب
//     ولا رقم بلا مصدر (§5 من الميثاق).
//
//  ═══ الطقم مغلق ═══
//  ستة أسئلة معروضة كأزرار، وحقل نصّ يمرّ على `matchCoachQuestion`. ما لا
//  يطابق ⇒ `unrecognised` ⇒ قائمة القدرات. لا تخمين ولا «أقرب سؤال».
// ═══════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { setExerciseHash, type AppRoute } from '@/lib/appRoutes'
import { useAuth } from '@/lib/authContext'
import { coachStrings } from '@/i18n/dict/coach'
// اللوحة في نفس الحزمة الكسولة — الشاشة بلا جوابها ليست شاشة.
import { CoachAnswerPanel } from './CoachAnswerPanel'
import {
  COACH_QUESTIONS,
  CoachProviderUnavailableError,
  buildCoachContext,
  localDeterministicProvider,
  matchCoachQuestion,
  readCoachEnvironment,
  renderCoachAnswer,
  resolveCoachProvider,
  type CoachAnswerSubject,
  type CoachQuestionId,
  type RenderedAnswer,
} from '@/lib/coach'

interface CoachViewProps {
  lang: Lang
  onBack: () => void
  onNavigate: (route: AppRoute) => void
}

/** نتيجة محاولة الجواب: إمّا جواب مرسوم، وإمّا فشل **مسمّى** لا صامت. */
type AttemptResult = { answer: RenderedAnswer; failure: null } | { answer: null; failure: string }

export function CoachView({ lang, onBack, onNavigate }: CoachViewProps) {
  const ar = lang !== 'en'
  const s = coachStrings[lang]
  const userId = useAuth().user?.id ?? null

  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState<CoachAnswerSubject | null>(null)
  // عدّاد يُجبر إعادة القراءة عند إعادة طرح **نفس** السؤال: البيانات قد تكون
  // تغيّرت بين السؤالين، والجواب المخبوء يكذب بلا أن يخطئ.
  const [nonce, setNonce] = useState(0)

  const headingRef = useRef<HTMLHeadingElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // المزوّد الذي سيُجيب فعلًا. في هذا البناء: المحلّي حتمًا (`EXTERNAL_PROVIDER_WIRED`
  // ثابت `false`)، والإفصاح يُشتقّ منه لا من نصّ مكتوب بيد.
  const provider = useMemo(() => resolveCoachProvider(), [])

  const attempt = useMemo<AttemptResult | null>(() => {
    if (!subject) return null
    void nonce
    try {
      const ctx = buildCoachContext(readCoachEnvironment(userId, lang))
      let built
      try {
        built = provider.answer(subject, ctx)
      } catch (err) {
        // مزوّد غير مُعَدّ يرمي **باسمه**؛ السقوط إلى المحلّي يحدث هنا ظاهرًا،
        // لا داخل المزوّد نفسه سرًّا.
        if (!(err instanceof CoachProviderUnavailableError)) throw err
        built = localDeterministicProvider.answer(subject, ctx)
      }
      return { answer: renderCoachAnswer(built, s, lang), failure: null }
    } catch (err) {
      const name = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
      // يُطبَع للمطوّر ويُقال للمستخدم بصدق — ولا يُعرض نصف جواب.
      console.warn('[coach] answer blocked', name)
      return { answer: null, failure: name }
    }
  }, [subject, nonce, userId, lang, provider, s])

  const rendered = attempt?.answer ?? null

  // الإفصاح من الجواب نفسه متى وُجد، وإلا من المزوّد الذي سيُجيب.
  const disclosure = rendered
    ? rendered.disclosure
    : provider.disclosure === 'localData'
      ? s.disclosureLocal
      : s.disclosureExternal

  const askSubject = useCallback((next: CoachAnswerSubject) => {
    setSubject(next)
    setNonce((n) => n + 1)
  }, [])

  const askQuestion = useCallback(
    (question: CoachQuestionId) => {
      setQuery(coachStrings[lang].questions[question])
      askSubject(question)
    },
    [askSubject, lang],
  )

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const raw = query.trim()
      if (!raw) return
      askSubject(matchCoachQuestion(raw) ?? 'unrecognised')
    },
    [askSubject, query],
  )

  const reset = useCallback(() => {
    setSubject(null)
    setQuery('')
    inputRef.current?.focus()
  }, [])

  // Escape يغلق الشاشة — سلوك متوقّع لأي سطح يُفتح فوق رحلة المستخدم.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack])

  // إدارة التركيز: الجواب الجديد يُنقل إليه التركيز فيسمعه قارئ الشاشة من عنوانه
  // بدل أن يبقى المستخدم على الزرّ ولا يدري أن شيئًا ظهر أسفل الشاشة.
  useEffect(() => {
    if (subject) headingRef.current?.focus()
  }, [subject, nonce])

  return (
    <div
      dir={ar ? 'rtl' : 'ltr'}
      className="app-scroll h-[100dvh] overflow-y-auto overscroll-y-contain bg-page px-4 text-ink-900"
      style={{ paddingTop: 'max(0.75rem, var(--safe-top))', paddingBottom: 'max(1.5rem, var(--safe-bottom))' }}
    >
      <div className="v2-screen-enter mx-auto w-full max-w-md space-y-5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label={s.back}
            className="v2-pressable grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-surface"
          >
            <Icon name="ChevronRight" className="h-5 w-5 ltr:rotate-180" />
          </button>
          <h1 className="truncate text-lg font-black">{s.title}</h1>
          <span className="h-11 w-11 shrink-0" aria-hidden="true" />
        </div>

        <header className="rounded-3xl border border-line bg-surface p-5 shadow-card">
          <span className="flex items-center gap-1.5 text-xs font-black" style={{ color: 'var(--v2-blue-text)' }}>
            <Icon name="MessageCircle" className="h-4 w-4" />
            {s.eyebrow}
          </span>
          <h2 className="mt-2 text-2xl font-black leading-tight">{s.subtitle}</h2>
          {/* الإفصاح **ليس** خلف «معلومات إضافية»: أول ما يُقرأ على الشاشة. */}
          <p className="mt-2 text-sm leading-relaxed text-ink-500">{disclosure}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.noMemoryNote}</p>
        </header>

        <form onSubmit={onSubmit} className="space-y-2">
          <label htmlFor="coach-ask" className="block text-sm font-black">
            {s.askLabel}
          </label>
          <div className="flex gap-2">
            <input
              id="coach-ask"
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={s.askPlaceholder}
              autoComplete="off"
              className="min-h-[44px] flex-1 rounded-xl border border-line bg-beige px-3 py-2 text-base text-ink-900 focus:border-[color:var(--v2-blue-text)] focus:outline-none focus:ring-2"
            />
            <button
              type="submit"
              disabled={query.trim().length === 0}
              className="v2-pressable min-h-[44px] shrink-0 rounded-xl px-4 text-base font-black text-white disabled:opacity-40"
              style={{ background: 'var(--v2-blue)' }}
            >
              {s.askSubmit}
            </button>
          </div>
        </form>

        <section aria-labelledby="coach-quick-title" className="space-y-2">
          <h2 id="coach-quick-title" className="text-sm font-black">
            {s.quickTitle}
          </h2>
          <ul className="space-y-2">
            {COACH_QUESTIONS.map((question) => (
              <li key={question}>
                <button
                  type="button"
                  onClick={() => askQuestion(question)}
                  aria-pressed={subject === question}
                  className={cn(
                    'v2-pressable flex min-h-[44px] w-full items-center justify-between gap-2 rounded-2xl border bg-surface px-3.5 py-2.5 text-start text-base font-bold',
                    subject === question ? 'border-[color:var(--v2-blue-text)]' : 'border-line',
                  )}
                >
                  <span className="min-w-0 flex-1">{s.questions[question]}</span>
                  <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400 ltr:rotate-180" />
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* منطقة الجواب — حيّة لقارئ الشاشة، وعنوانها قابل للتركيز. */}
        <section aria-labelledby="coach-answer-title" aria-live="polite" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 ref={headingRef} tabIndex={-1} id="coach-answer-title" className="text-sm font-black outline-none">
              {s.answerTitle}
            </h2>
            {subject && (
              <button
                type="button"
                onClick={reset}
                className="v2-pressable inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold underline underline-offset-4"
                style={{ color: 'var(--v2-blue-text)' }}
              >
                <Icon name="RotateCcw" className="h-4 w-4" />
                {s.reset}
              </button>
            )}
          </div>

          {!subject && <p className="text-base leading-relaxed text-ink-500">{s.askPlaceholder}</p>}

          {subject && attempt?.failure && (
            <p
              className="rounded-2xl border border-dashed p-3.5 text-base leading-relaxed"
              style={{ borderColor: 'var(--v2-amber)', color: 'var(--v2-amber)' }}
            >
              {s.answerBlocked}
            </p>
          )}

          {rendered && (
            <CoachAnswerPanel
              strings={s}
              answer={rendered}
              onOpenExercise={(exerciseId) => {
                setExerciseHash(exerciseId)
                onNavigate('exercises')
              }}
            />
          )}
        </section>
      </div>
    </div>
  )
}
