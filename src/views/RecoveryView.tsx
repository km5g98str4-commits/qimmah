import { useMemo, useState, type ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'
import { useAuth } from '@/lib/authContext'
import {
  loadRecoveryLog, saveRecoveryEntry, todaysRecovery,
  type RecoveryInput, type RecoveryRec, type Sleep, type Soreness, type Energy, type RecoveryEntry,
} from '@/lib/recovery'

interface RecoveryViewProps {
  lang: Lang
  onBack: () => void
  onNavigate: (route: AppRoute) => void
}

// Teal is the recovery surface accent (v3.0 §F1: Teal = rest/recovery, #159AA0).
const TEAL = 'var(--v2-teal)'
const TEAL_TEXT = 'var(--v2-teal-text)'

type Screen = 'checkin' | 'result'

/**
 * Recovery — v3.0 area (screens 37–39). SELF-REPORT ONLY: the recommendation is
 * built from what the user reports (effort · sleep · soreness · energy), never
 * from supplements and never medical. Every output is labelled accordingly, and
 * nothing here changes the plan (Rule D) — a lighter session is a suggestion.
 */
export function RecoveryView({ lang, onBack, onNavigate }: RecoveryViewProps) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const userId = useAuth().user?.id ?? null

  const existing = useMemo(() => todaysRecovery(userId), [userId])
  const [screen, setScreen] = useState<Screen>('checkin')
  const [input, setInput] = useState<RecoveryInput>(() => existing ?? {})
  const [result, setResult] = useState<RecoveryEntry | null>(existing)
  // Small local read; re-runs on each render so a fresh save shows up on return.
  const log = loadRecoveryLog(userId)

  const submit = () => {
    const entry = saveRecoveryEntry(userId, input)
    setResult(entry)
    setScreen('result')
  }

  if (screen === 'result' && result) {
    return <ResultScreen lang={lang} entry={result} onBack={() => setScreen('checkin')} onExit={onBack} onNavigate={onNavigate} />
  }

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="app-scroll v2-surface-light h-[100dvh] overflow-y-auto overscroll-y-contain bg-page px-4 text-ink-900" style={{ paddingTop: 'max(0.75rem, var(--safe-top))', paddingBottom: 'max(1.5rem, var(--safe-bottom))' }}>
      <div className="v2-screen-enter mx-auto w-full max-w-md space-y-5">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onBack} aria-label={t('رجوع', 'Back')} className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface"><Icon name="ChevronRight" className="h-5 w-5 rtl:rotate-0 ltr:rotate-180" /></button>
          <h1 className="text-lg font-black">{t('التعافي', 'Recovery')}</h1>
        </div>

        <header className="rounded-3xl border p-5" style={{ borderColor: TEAL, background: 'color-mix(in srgb, var(--v2-teal) 8%, transparent)' }}>
          <span className="flex items-center gap-1.5 text-xs font-black" style={{ color: TEAL_TEXT }}><Icon name="Activity" className="h-4 w-4" />{t('تسجيل التعافي', 'Recovery check-in')}</span>
          <h2 className="mt-2 text-2xl font-black leading-tight">{t('كيف تشعر اليوم؟', 'How do you feel today?')}</h2>
          <p className="mt-1 text-sm text-ink-500">{t('سجّل ما تشعر به — كله اختياري. نبني توصية من إجابتك أنت، وليست قياسًا طبيًا.', 'Log what you feel — all optional. We build a suggestion from your own answers, not a medical measure.')}</p>
        </header>

        {/* Effort 1–10 (perceived exertion of the last session) */}
        <Field icon="Flame" label={t('جهد آخر تمرين', 'Last session effort')} hint={t('اختياري · 1–10', 'Optional · 1–10')}>
          <div className="flex items-center gap-3">
            <input
              type="range" min={0} max={10} step={1}
              value={input.effort ?? 0}
              onChange={(e) => setInput((s) => ({ ...s, effort: Number(e.target.value) }))}
              aria-label={t('جهد آخر تمرين من 1 إلى 10', 'Last session effort 1 to 10')}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-full"
              style={{ accentColor: '#159AA0', background: 'var(--c-beige, #e9e5de)' }}
            />
            <span className="w-10 text-center text-sm font-black tabular-nums" style={{ color: TEAL_TEXT }}>{input.effort ? toAr(input.effort, lang) : '—'}</span>
          </div>
        </Field>

        <Field icon="Moon" label={t('جودة النوم', 'Sleep quality')} hint={t('اختياري', 'Optional')}>
          <Segmented<Sleep>
            value={input.sleep} lang={lang}
            options={[{ v: 'poor', ar: 'سيّئ', en: 'Poor' }, { v: 'ok', ar: 'عادي', en: 'OK' }, { v: 'good', ar: 'جيد', en: 'Good' }]}
            onChange={(v) => setInput((s) => ({ ...s, sleep: v }))}
          />
        </Field>

        <Field icon="Activity" label={t('آلام العضلات', 'Muscle soreness')} hint={t('اختياري', 'Optional')}>
          <Segmented<Soreness>
            value={input.soreness} lang={lang}
            options={[{ v: 'none', ar: 'لا شيء', en: 'None' }, { v: 'mild', ar: 'خفيفة', en: 'Mild' }, { v: 'moderate', ar: 'متوسطة', en: 'Moderate' }, { v: 'severe', ar: 'شديدة', en: 'Severe' }]}
            onChange={(v) => setInput((s) => ({ ...s, soreness: v }))}
          />
        </Field>

        <Field icon="Zap" label={t('طاقتك', 'Energy')} hint={t('اختياري', 'Optional')}>
          <Segmented<Energy>
            value={input.energy} lang={lang}
            options={[{ v: 'low', ar: 'منخفضة', en: 'Low' }, { v: 'ok', ar: 'عادية', en: 'OK' }, { v: 'high', ar: 'عالية', en: 'High' }]}
            onChange={(v) => setInput((s) => ({ ...s, energy: v }))}
          />
        </Field>

        <Field icon="Info" label={t('ملاحظة', 'Note')} hint={t('اختياري', 'Optional')}>
          <textarea
            value={input.note ?? ''}
            onChange={(e) => setInput((s) => ({ ...s, note: e.target.value }))}
            rows={2}
            placeholder={t('أي شيء تريد تذكّره…', 'Anything you want to remember…')}
            className="w-full rounded-xl border border-line bg-beige px-3 py-2 text-base text-ink-900 focus:border-[color:var(--v2-teal)] focus:outline-none focus:ring-2"
          />
        </Field>

        <button type="button" onClick={submit} className="press w-full rounded-2xl py-4 text-[1.1875rem] font-black text-white" style={{ background: TEAL }}>
          {t('اعرض توصيتي', 'See my suggestion')}
        </button>

        {log.length > 0 && <RecoveryLog lang={lang} log={log} />}
      </div>
    </div>
  )
}

const REC_META: Record<RecoveryRec, { icon: string; ar: string; en: string; bodyAr: string; bodyEn: string }> = {
  rest: { icon: 'Moon', ar: 'راحة اليوم', en: 'Rest today', bodyAr: 'إشاراتك تميل للتعب — يوم راحة يخدمك أكثر.', bodyEn: 'Your signals lean tired — a rest day serves you better.' },
  light: { icon: 'Activity', ar: 'تمرين خفيف', en: 'Light session', bodyAr: 'جاهز لكن ليس بكامل الطاقة — خفّف الحجم أو الشدّة.', bodyEn: "Ready but not at full energy — ease the volume or intensity." },
  full: { icon: 'Flame', ar: 'تمرين كامل', en: 'Full session', bodyAr: 'إشاراتك جيدة — امضِ في تمرينك المعتاد.', bodyEn: 'Your signals look good — go for your usual session.' },
  reassess: { icon: 'Info', ar: 'أعد التقييم', en: 'Re-assess', bodyAr: 'لم تُدخل إشارات كافية بعد — سجّل شيئًا لنقترح.', bodyEn: 'Not enough signal yet — log something so we can suggest.' },
}

function ResultScreen({ lang, entry, onBack, onExit, onNavigate }: { lang: Lang; entry: RecoveryEntry; onBack: () => void; onExit: () => void; onNavigate: (r: AppRoute) => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const m = REC_META[entry.rec]
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="app-scroll v2-surface-light h-[100dvh] overflow-y-auto overscroll-y-contain bg-page px-4 text-ink-900" style={{ paddingTop: 'max(0.75rem, var(--safe-top))', paddingBottom: 'max(1.5rem, var(--safe-bottom))' }}>
      <div className="v2-screen-enter mx-auto w-full max-w-md space-y-5">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onBack} aria-label={t('رجوع', 'Back')} className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface"><Icon name="ChevronRight" className="h-5 w-5 rtl:rotate-0 ltr:rotate-180" /></button>
          <h1 className="text-lg font-black">{t('توصية التعافي', 'Recovery suggestion')}</h1>
        </div>

        <section className="rounded-3xl border p-6 text-center" style={{ borderColor: TEAL, background: 'color-mix(in srgb, var(--v2-teal) 8%, transparent)' }}>
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl" style={{ background: TEAL, color: '#fff' }}><Icon name={m.icon} className="h-8 w-8" /></span>
          <h2 className="mt-4 text-3xl font-black">{t(m.ar, m.en)}</h2>
          <p className="mt-2 text-sm text-ink-700">{t(m.bodyAr, m.bodyEn)}</p>
          {/* HONESTY LABEL — self-report + not medical, on every suggestion. */}
          <p className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-surface px-3 py-2 text-xs font-bold text-ink-500">
            <Icon name="Info" className="h-3.5 w-3.5" />
            {t('مبني على ما أدخلته بنفسك · ليست استشارة طبية.', 'Based on your own input · not medical advice.')}
          </p>
        </section>

        {/* Rule D — recovery never changes the plan. A session is only ever offered
            as a suggestion the user chooses to open; nothing is auto-applied. */}
        {(entry.rec === 'light' || entry.rec === 'full') && (
          <button type="button" onClick={() => onNavigate('workout')} className="press w-full rounded-2xl border border-line bg-surface py-3.5 text-sm font-bold text-ink-900">
            <Icon name="Dumbbell" className="me-1.5 inline h-4 w-4" />
            {entry.rec === 'light' ? t('افتح تمرين اليوم (خفّفه بنفسك)', "Open today's workout (ease it yourself)") : t('ابدأ تمرين اليوم', "Start today's workout")}
          </button>
        )}
        <button type="button" onClick={onExit} className="press w-full rounded-2xl py-3.5 text-sm font-black text-white" style={{ background: TEAL }}>{t('تم', 'Done')}</button>
        <p className="text-center text-[0.7rem] text-ink-400">{t('محفوظ على هذا الجهاز فقط.', 'Saved on this device only.')}</p>
      </div>
    </div>
  )
}

function RecoveryLog({ lang, log }: { lang: Lang; log: RecoveryEntry[] }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-black"><Icon name="TrendingUp" className="h-4 w-4" style={{ color: TEAL }} />{t('سجل التعافي', 'Recovery log')}</h3>
        {/* Non-colour + honesty: labelled a self-reported indicator, not a measure. */}
        <span className="rounded-full bg-beige px-2 py-0.5 text-[0.65rem] font-bold text-ink-500">{t('مؤشّر ذاتي', 'Self-reported')}</span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {log.slice(0, 7).map((e) => {
          const m = REC_META[e.rec]
          return (
            <li key={e.date} className="flex items-center justify-between rounded-xl bg-beige px-3 py-2">
              <span className="flex items-center gap-2 text-xs font-bold text-ink-700"><Icon name={m.icon} className="h-3.5 w-3.5" style={{ color: TEAL }} />{t(m.ar, m.en)}</span>
              <span className="text-[0.7rem] tabular-nums text-ink-500">{e.date}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ── small primitives ──
function Field({ icon, label, hint, children }: { icon: string; label: string; hint: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-bold text-ink-900"><Icon name={icon} className="h-4 w-4 text-ink-500" />{label}</span>
        <span className="text-[0.7rem] font-bold text-ink-400">{hint}</span>
      </div>
      {children}
    </section>
  )
}

function Segmented<T extends string>({ value, options, onChange, lang }: { value: T | undefined; options: { v: T; ar: string; en: string }[]; onChange: (v: T) => void; lang: Lang }) {
  const ar = lang !== 'en'
  return (
    <div role="radiogroup" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const active = value === o.v
        return (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.v)}
            // [CTO-82] ≥44بكسل: كانت ٣٤.
            className={cn('press inline-flex min-h-[44px] items-center justify-center rounded-xl border px-2 text-xs font-bold transition-colors', active ? 'text-white' : 'border-line bg-page text-ink-500')}
            style={active ? { background: TEAL, borderColor: TEAL } : undefined}
          >
            {ar ? o.ar : o.en}
          </button>
        )
      })}
    </div>
  )
}

function toAr(n: number, lang: Lang): string {
  return lang === 'en' ? String(n) : n.toLocaleString('ar-EG')
}
