import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { StateBlock } from '@/components/StateBlock'
import type { Lang } from '@/lib/appPreferences'
import { eStepsCopy } from '@/i18n/dict/eSteps'
import { todayCoherenceStrings } from '@/i18n/dict/todayCoherence'
import { buildStepsPageModel, type StepsPageModel } from '@/lib/eStepsModel'
import { isHealthKitPlatform, metricState, refreshHealthKitStepsIfEnabled } from '@/lib/healthKit'
import { clampGoal, getSteps, loadStepGoal, saveStepGoal, setSteps } from '@/lib/stepCounter'
import { foldDigits, formatNumber, formatNumeralsIn, resolveNumeralSystem } from '@/lib/numberFormat'

interface StepsViewProps {
  lang: Lang
  onBack: () => void
  onOpenSettings: () => void
}

type StepsScreenState =
  | { status: 'loading' }
  | { status: 'ready'; model: StepsPageModel }
  | { status: 'error'; model: StepsPageModel }

/**
 * تقويم **ميلادي مثبَّت صراحةً** ونظام أرقام مأخوذ من التفضيل.
 *
 * كان السطران يُمرّران `'ar-SA'` عاريًا: التقويم المفضَّل لـ`ar-SA` في CLDR هو
 * `islamic-umalqura`، وبعض المتصفّحات تحسمه كذلك — فتُرقَّم أيام الأسبوع هجريًا
 * فوق بيانات ميلادية. `-u-ca-gregory` يقفلها بلا كلفة.
 */
function dateLocale(lang: Lang): string {
  const base = lang === 'ar' ? 'ar-SA' : 'en'
  return `${base}-u-ca-gregory-nu-${resolveNumeralSystem(lang)}`
}

function localDate(date: string, lang: Lang): string {
  const value = new Date(`${date}T12:00:00`)
  return value.toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' })
}

function localDayNumber(date: string, lang: Lang): string {
  const value = new Date(`${date}T12:00:00`)
  return value.toLocaleDateString(dateLocale(lang), { day: 'numeric' })
}

/**
 * المنسّق المركزي لا `toLocaleString('ar-SA')`: النسخة المحلية كانت مصدر حقيقة
 * خامسًا لا يصله تفضيل «شكل الأرقام»، ويكفي سقوط لاحقة إقليم واحدة حتى يقلب
 * `'ar'` وحدها المخرجات إلى اللاتينية.
 */
function number(value: number, lang: Lang, maximumFractionDigits = 0): string {
  return formatNumber(value, lang, { maximumFractionDigits })
}

/** جرعات الإضافة السريعة — أرقام مستديرة يفهمها المستخدم، لا اشتقاق من هدفه. */
const QUICK_ADD = [1000, 2000, 5000] as const

/**
 * كتابة **مؤكَّدة** لخطوات اليوم — [SOVEREIGN-003].
 *
 * `setSteps` يمرّ على `safeStorage` أصلًا، لكنّه يعيد القيمة المطلوبة لا نتيجة
 * الكتابة: عند امتلاء التخزين أو حجبه يبتلع الفشل ويعيد الرقم كأنّه حُفظ. فلو
 * بنينا رسالة «محفوظ» على مخرجه لصار السطر يكذب في اللحظة الوحيدة التي يهمّ
 * فيها ألّا يكذب.
 *
 * فالتأكيد هنا **قراءة بعد الكتابة** من نفس المتجر: إن لم تستقرّ القيمة، لا
 * رسالة نجاح، ولا يتحرّك الرقم المعروض، ويُقال للمستخدم صراحةً إن رقمه القديم
 * باقٍ. وهي أقوى من فحص `WriteResult` لا أضعف: تفحص **الحالة** لا نيّة الكاتب.
 */
function commitStepsChecked(value: number): { ok: boolean; steps: number } {
  const requested = setSteps(value)
  const persisted = getSteps()
  return { ok: persisted === requested, steps: persisted }
}

/** نفس عقد التأكيد للهدف اليومي: يُقرأ بعد الكتابة، ولا يُعلَن نجاح بلا استقرار. */
function commitGoalChecked(value: number): { ok: boolean; goal: number } {
  const requested = clampGoal(value)
  saveStepGoal(requested)
  const persisted = loadStepGoal()
  return { ok: persisted === requested, goal: persisted }
}

/** يطوي الأرقام العربية إلى لاتينية قانونية ثم يُبقي الأرقام وحدها. */
function digitsOnly(raw: string): string {
  return foldDigits(raw).replace(/[^\d]/g, '')
}

export function StepsView({ lang, onBack, onOpenSettings }: StepsViewProps) {
  const ar = lang !== 'en'
  const copy = eStepsCopy(lang)
  const coherence = todayCoherenceStrings[lang]
  const [screen, setScreen] = useState<StepsScreenState>({ status: 'loading' })
  const health = metricState('steps')
  /**
   * [SOVEREIGN-003] **حدّ القدرة، لا حدّ التفضيل.**
   *
   * المتصفّح لا يقرأ HealthKit ولا Google Fit — لا بإذن ولا بدونه. فكل سطح
   * «اربط/حدّث من Apple Health» على الويب وعدٌ لا يُسلَّم مهما ضغط المستخدم.
   * هذا العلم يقصر تلك الأسطح على الغلاف الأصلي، ويترك للويب ما يستطيعه فعلًا:
   * تسجيلًا يدويًّا كاملًا. والمزامنة تُذكَر بوصفها قدرة **التطبيق**، لا وعدًا
   * معلّقًا في شاشة لا تملكه.
   */
  const native = isHealthKitPlatform()
  const manualInputRef = useRef<HTMLInputElement>(null)
  const focusManual = useCallback(() => manualInputRef.current?.focus(), [])

  const loadSaved = useCallback(() => {
    try {
      setScreen({ status: 'ready', model: buildStepsPageModel() })
    } catch {
      setScreen({ status: 'error', model: buildStepsPageModel() })
    }
  }, [])

  useEffect(() => {
    loadSaved()
    window.addEventListener('qimmah:steps-updated', loadSaved)
    return () => window.removeEventListener('qimmah:steps-updated', loadSaved)
  }, [loadSaved])

  const refresh = async () => {
    setScreen({ status: 'loading' })
    const result = await refreshHealthKitStepsIfEnabled()
    if (result && result.permission === 'authorized') {
      loadSaved()
      return
    }
    setScreen({ status: 'error', model: buildStepsPageModel() })
  }

  const model = screen.status === 'loading' ? null : screen.model
  const healthNote = health.enabled
    ? health.permission === 'authorized'
      ? copy.healthConnected
      : copy.healthUnknown
    : copy.healthNotConnected

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-light min-h-[100dvh] bg-page px-4 pb-8 pt-3 text-ink-900">
      <div className="v2-screen-enter mx-auto w-full max-w-md space-y-5">
        <header className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onBack}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink-700 shadow-sm"
            aria-label={copy.back}
          >
            <Icon name={ar ? 'ChevronRight' : 'ChevronLeft'} className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-[color:var(--v2-ember-text)]">{copy.eyebrow}</p>
            <h1 className="text-2xl font-black tracking-tight">{copy.title}</h1>
          </div>
        </header>

        {screen.status === 'loading' && (
          <StateBlock
            variant="loading"
            title={copy.loadingTitle}
            body={copy.loadingBody}
            testId="steps-loading"
          />
        )}

        {screen.status === 'error' && (
          <StateBlock
            variant="error"
            title={copy.errorTitle}
            body={copy.errorBody}
            actions={[
              { label: copy.retry, onClick: () => (native ? void refresh() : loadSaved()), primary: true },
              { label: coherence.logStepsCta, onClick: focusManual },
            ]}
            testId="steps-error"
          />
        )}

        {screen.status === 'ready' && !screen.model.hasData && (
          <StateBlock
            variant="empty"
            icon="Footprints"
            title={copy.emptyTitle}
            body={native ? copy.emptyBody : coherence.manualBody}
            actions={
              native
                ? [
                    { label: coherence.logStepsCta, onClick: focusManual, primary: true },
                    { label: copy.openSettings, onClick: onOpenSettings },
                  ]
                : [{ label: coherence.logStepsCta, onClick: focusManual, primary: true }]
            }
            testId="steps-empty"
          />
        )}

        {model?.hasData && (
          <>
            <section className="overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-card" data-testid="steps-filled">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink-500">{copy.today}</p>
                  <p dir="ltr" className="mt-1 text-start font-mono text-4xl font-black tracking-tight text-[color:var(--v2-ember-text)]">
                    {number(model.today, lang)}
                  </p>
                </div>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={model.goalProgress}
                  aria-label={copy.ofGoal}
                  className="grid h-20 w-20 shrink-0 place-items-center rounded-full"
                  style={{ background: `conic-gradient(var(--v2-ember) ${model.goalProgress}%, rgb(var(--c-line)) 0)` }}
                >
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-surface font-mono text-sm font-black">{model.goalProgress}%</span>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-beige" aria-hidden="true">
                <div className="h-full rounded-full bg-[color:var(--v2-ember)]" style={{ width: `${model.goalProgress}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                <span className="font-bold text-ink-700">{model.remaining === 0 ? copy.goalReached : copy.remaining(number(model.remaining, lang))}</span>
                <span className="text-ink-500">{number(model.today, lang)} / {number(model.goal, lang)} · {copy.ofGoal}</span>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3" aria-label={copy.weeklyPattern}>
              <StatCard icon="CalendarDays" label={formatNumeralsIn(copy.week, lang)} value={number(model.weekTotal, lang)} />
              <StatCard icon="BarChart3" label={formatNumeralsIn(copy.month, lang)} value={number(model.monthTotal, lang)} />
              <StatCard
                icon="Trophy"
                label={copy.bestDay}
                value={model.best ? number(model.best.steps, lang) : '—'}
                detail={model.best ? localDate(model.best.date, lang) : undefined}
              />
              <StatCard icon="Flame" label={copy.streak} value={number(model.streakDays, lang)} unit={copy.days} />
            </section>

            <section className="rounded-2xl border border-[color:var(--v2-amber)] bg-surface p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="grid h-10 w-10 place-items-center rounded-xl text-ink-900"
                    style={{ background: 'color-mix(in srgb, var(--v2-amber) 16%, transparent)' }}
                  >
                    <Icon name="Ruler" className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-ink-500">{copy.distance}</p>
                    <p dir="ltr" className="font-mono text-xl font-black text-ink-900">{number(model.estimatedDistanceKm, lang, 2)} km</p>
                  </div>
                </div>
                <span className="rounded-full border border-[color:var(--v2-amber)] px-2.5 py-1 text-[11px] font-black text-ink-900">{copy.approximate}</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-500">{formatNumeralsIn(copy.distanceBasis, lang)}</p>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-4 shadow-card">
              <h2 className="text-sm font-black">{copy.weeklyPattern}</h2>
              <div className="mt-4 flex h-36 items-stretch gap-2" role="img" aria-label={`${formatNumeralsIn(copy.week, lang)}: ${number(model.weekTotal, lang)}`}>
                {model.week.map((day) => {
                  const max = Math.max(...model.week.map((item) => item.steps), 1)
                  const height = day.steps > 0 ? Math.max(8, Math.round((day.steps / max) * 100)) : 3
                  return (
                    <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                      <span className="text-[10px] font-bold tabular-nums text-ink-500">{day.steps > 0 ? number(day.steps, lang) : '—'}</span>
                      <span className="flex min-h-0 w-full flex-1 items-end justify-center" aria-hidden="true">
                        <span
                          className="w-full max-w-8 rounded-t-lg bg-[color:var(--v2-ember)]"
                          style={{ height: `${height}%`, opacity: day.steps > 0 ? 1 : 0.18 }}
                        />
                      </span>
                      <span className="text-[10px] font-bold text-ink-500">{localDayNumber(day.date, lang)}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}

        {/*
          [SOVEREIGN-003] التسجيل اليدوي **على هذه الشاشة**، لا خلف رحلة إعدادات.
          كانت الشاشة تعرض الأرقام ولا تملك بابًا واحدًا لإدخالها: كل أفعالها
          «افتح إعدادات البيانات» أو «حدّث من Apple Health». والأولى تحيل إلى
          سطح آخر، والثانية مستحيلة على الويب — فبقي المستخدم أمام شاشة خطوات
          لا يستطيع أن يسجّل فيها خطوة.
        */}
        {screen.status !== 'loading' && (
          <ManualStepsCard
            lang={lang}
            todaySteps={model?.today ?? 0}
            goal={model?.goal ?? 0}
            inputRef={manualInputRef}
            onCommitted={loadSaved}
          />
        )}

        {screen.status !== 'loading' && (
          <section className="rounded-2xl border border-line bg-surface p-4 shadow-card">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-beige text-ink-700">
                <Icon name={native && health.enabled ? 'CheckCircle2' : 'Footprints'} className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">{copy.dataSource}</p>
                {/* على الويب لا تُذكر حالة ربط — لا ربط أصلًا. تُذكر القدرة وأين تعيش. */}
                <p className="mt-1 text-xs leading-relaxed text-ink-500">{native ? healthNote : coherence.syncNativeOnlyBody}</p>
                {model?.hasData && (
                  <p className="mt-2 text-xs font-bold text-ink-700">
                    {copy.sourceLabels[model.source]}
                    {native && health.lastUpdate ? ` · ${copy.lastUpdated(new Date(health.lastUpdate).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en', { dateStyle: 'medium', timeStyle: 'short' }))}` : ''}
                  </p>
                )}
                {!native && <p className="mt-2 text-xs font-bold text-ink-700">{coherence.manualProvenance}</p>}
              </div>
            </div>
            {/*
              الزرّان يظهران على الغلاف الأصلي وحده. «حدّث من Apple Health» على
              الويب زرٌّ لا يستطيع النجاح مهما ضُغط، و«فتح إعدادات البيانات» على
              الويب يقود إلى لوحة ربطٍ لا تربط. الغياب أصدق من زرٍّ معطَّل.
            */}
            {native && (model?.hasData || health.enabled) && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                {health.enabled && (
                  <button type="button" onClick={() => void refresh()} data-testid="steps-refresh" className="btn-primary px-4 py-2.5 text-sm">
                    <Icon name="RefreshCw" className="h-4 w-4" />
                    {copy.refresh}
                  </button>
                )}
                <button type="button" onClick={onOpenSettings} className="btn-ghost px-4 py-2.5 text-sm">
                  <Icon name="Settings" className="h-4 w-4" />
                  {copy.openSettings}
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

/**
 * بطاقة التسجيل اليدوي — [SOVEREIGN-003].
 *
 * ═══ لماذا «مجموع اليوم» لا «أضف خطوات» ═══
 * المتجر يخزّن **قيمة مطلقة لليوم** (`setSteps`)، والإضافة السريعة تُقرأ من
 * المخزن لحظة الضغط ثم تكتب المجموع الجديد. فلو أدار المستخدم تبويبين، أو
 * أضاف من هنا بعد ما أدخل رقمًا هناك، بقي المعروض هو المحفوظ لا فرقًا متراكمًا.
 *
 * ═══ الصدق قبل الطمأنينة (§5) ═══
 * لا رسالة «محفوظ» قبل أن تُقرأ القيمة من المتجر مرّة ثانية. وعند الفشل: يبقى
 * الرقم القديم معروضًا، وتُقال العلّة صريحة («التخزين ممتلئ أو محجوب») مع
 * التطمين الصادق الوحيد المتاح: **بياناتك السابقة ما راحت**.
 */
function ManualStepsCard({
  lang,
  todaySteps,
  goal,
  inputRef,
  onCommitted,
}: {
  lang: Lang
  todaySteps: number
  goal: number
  inputRef: React.RefObject<HTMLInputElement>
  /** يُستدعى **بعد** تأكّد الكتابة وحدها، فتُعاد قراءة النموذج من المتجر. */
  onCommitted: () => void
}) {
  const c = todayCoherenceStrings[lang]
  const [draft, setDraft] = useState(() => (todaySteps > 0 ? String(todaySteps) : ''))
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const [goalDraft, setGoalDraft] = useState(() => (goal > 0 ? String(goal) : ''))
  const [goalStatus, setGoalStatus] = useState<{ ok: boolean; text: string } | null>(null)

  const commit = (value: number) => {
    const result = commitStepsChecked(value)
    if (!result.ok) {
      // لا تحديث للمعروض ولا رسالة نجاح — الحالة لم تتغيّر، فلا يُقال إنها تغيّرت.
      setStatus({ ok: false, text: c.manualFailed })
      return
    }
    setDraft(result.steps > 0 ? String(result.steps) : '')
    setStatus({ ok: true, text: c.manualSaved(formatNumber(result.steps, lang)) })
    onCommitted()
  }

  const commitGoal = () => {
    const parsed = digitsOnly(goalDraft)
    const result = commitGoalChecked(parsed === '' ? goal : Number(parsed))
    if (!result.ok) {
      setGoalStatus({ ok: false, text: c.goalFailed })
      return
    }
    setGoalDraft(String(result.goal))
    setGoalStatus({ ok: true, text: c.goalSaved(formatNumber(result.goal, lang)) })
    onCommitted()
  }

  return (
    <section aria-labelledby="steps-manual-title" data-testid="steps-manual" className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <h2 id="steps-manual-title" className="text-sm font-black">{c.manualTitle}</h2>
      <p className="mt-1 text-xs leading-relaxed text-ink-500">{c.manualBody}</p>

      <label htmlFor="steps-manual-input" className="mt-4 block text-xs font-bold text-ink-900">{c.manualLabel}</label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="steps-manual-input"
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={draft}
          onChange={(event) => { setDraft(digitsOnly(event.target.value)); setStatus(null) }}
          onKeyDown={(event) => { if (event.key === 'Enter') commit(Number(digitsOnly(draft) || '0')) }}
          className="min-h-[44px] w-full rounded-xl border border-line bg-page px-3 text-center font-mono text-base font-black text-ink-900 outline-none focus:border-[color:var(--c-primary)]"
        />
        <button
          type="button"
          onClick={() => commit(Number(digitsOnly(draft) || '0'))}
          className="btn-primary min-h-[44px] shrink-0 px-4 text-sm"
        >
          <Icon name="Check" className="h-4 w-4" />
          {c.manualSave}
        </button>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        {QUICK_ADD.map((amount) => (
          <button
            key={amount}
            type="button"
            // القراءة من المتجر لحظة الضغط لا من الخاصيّة: الخاصيّة قد تكون لقطة قديمة.
            onClick={() => commit(getSteps() + amount)}
            aria-label={c.manualAddAria(formatNumber(amount, lang))}
            className="flex min-h-[44px] items-center justify-center gap-1 rounded-xl bg-primary-soft text-xs font-black text-[color:var(--c-primary)]"
          >
            <Icon name="Plus" className="h-3.5 w-3.5" />
            <bdi dir="ltr">{formatNumber(amount, lang)}</bdi>
          </button>
        ))}
      </div>

      {status && (
        <p
          role="status"
          className={`mt-3 text-xs font-bold leading-relaxed ${status.ok ? 'text-[color:var(--v2-green-text)]' : 'text-[color:var(--v2-feedback-error)]'}`}
        >
          {status.text}
        </p>
      )}

      <div className="mt-4 border-t border-line pt-4">
        <label htmlFor="steps-goal-input" className="block text-xs font-bold text-ink-900">{c.goalTitle}</label>
        <p className="mt-0.5 text-[11px] text-ink-500">{c.goalLabel}</p>
        <div className="mt-1.5 flex gap-2">
          <input
            id="steps-goal-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={goalDraft}
            onChange={(event) => { setGoalDraft(digitsOnly(event.target.value)); setGoalStatus(null) }}
            onKeyDown={(event) => { if (event.key === 'Enter') commitGoal() }}
            className="min-h-[44px] w-full rounded-xl border border-line bg-page px-3 text-center font-mono text-base font-black text-ink-900 outline-none focus:border-[color:var(--c-primary)]"
          />
          <button type="button" onClick={commitGoal} className="btn-ghost min-h-[44px] shrink-0 px-4 text-sm">
            <Icon name="Target" className="h-4 w-4" />
            {c.goalSave}
          </button>
        </div>
        {goalStatus && (
          <p
            role="status"
            className={`mt-2 text-xs font-bold leading-relaxed ${goalStatus.ok ? 'text-[color:var(--v2-green-text)]' : 'text-[color:var(--v2-feedback-error)]'}`}
          >
            {goalStatus.text}
          </p>
        )}
      </div>
    </section>
  )
}

/**
 * [SOVEREIGN-003] الوحدة **خارج** المدى اليساري المفروض.
 *
 * كانت بطاقة «السلسلة الحالية» تمرّر `«٣ أيام»` كاملةً إلى فقرة `dir="ltr"`.
 * و«أيام» حرف عربي قويّ يمينًا في آخر فقرة يسارية، فترفعه الخوارزمية إلى مدًى
 * معكوس يبتلع الرقم قبله: المعروض فعليًّا **«أيام ٣»**. نفس عطل سطر التاريخ،
 * على بعد شاشة واحدة — ولذلك عولج بنفس الأداة لا بترتيب يدوي.
 *
 * الآن: الرقم وحده داخل `<bdi dir="ltr">` (القسمة والأرقام تُقرأ يسارًا في
 * اللغتين)، والوحدة نصٌّ تابع لاتجاه الفقرة. فلا حرفَ عربيًّا داخل مدًى مفروض.
 */
function StatCard({ icon, label, value, unit, detail }: { icon: string; label: string; value: string; unit?: string; detail?: string }) {
  return (
    <article className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <Icon name={icon} className="h-4 w-4 text-[color:var(--v2-ember-text)]" />
      <p className="mt-3 text-xs font-bold text-ink-500">{label}</p>
      <p className="mt-1 text-start font-mono text-lg font-black text-ink-900">
        <bdi dir="ltr">{value}</bdi>
        {unit ? ` ${unit}` : ''}
      </p>
      {detail && <p className="mt-1 text-[11px] text-ink-500">{detail}</p>}
    </article>
  )
}
