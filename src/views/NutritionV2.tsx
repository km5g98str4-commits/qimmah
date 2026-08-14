import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/Icon'
import { AllergyNotice } from '@/components/AllergyNotice'
import { ProgressBar } from '@/components/ProgressBar'
import { ScreenHeader } from '@/components/ScreenHeader'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { useCustomization } from '@/lib/customizationContext'
import { useAppScrollReset } from '@/lib/useAppScrollReset'
import { searchFood, type FoodItem } from '@/data/foodItems'
import { nutritionScreenStrings } from '@/i18n/dict/nutritionScreen'
import { servingSummary } from '@/lib/servingDisplay'
import {
  addFoodToDay,
  addWaterToDay,
  buildNutritionV2Model,
  type MealSlot,
  type Nudge,
} from '@/lib/nutritionV2Model'
import { copyMealToToday, getDayEntries, getWeeklyNutritionStats } from '@/lib/nutritionHistory'
import { getDayStamp } from '@/lib/today'
import { formatNumber } from '@/lib/numberFormat'

// الماسح (ScanFoodPanel → BarcodeCamera → @zxing) يُحمَّل كسولًا: محرّك الباركود
// الثقيل (~443kB) لا يدخل حزمة شاشة التغذية، ويُجلب فقط عند فتح المستخدم للماسح.
const ScanFoodPanel = lazy(() => import('@/features/barcode/ScanFoodPanel').then((m) => ({ default: m.ScanFoodPanel })))

interface NutritionV2Props {
  lang: Lang
}

/**
 * لوحة بيانات التغذية بالهوية الكلاسيكية: نفس ألوان الماكروز التي كانت قبل موجة
 * v2 (بروتين أخضر · كارب أزرق · دهون كهرماني) والماء بلون الهوية. الألوان هنا
 * تزيينية (حلقات، أشرطة، تلوين أيقونات) وكلّها تتجاوز عتبة 3:1 لعناصر الواجهة.
 */
const CLR = {
  protein: '#3E9E6B',
  water: 'var(--c-primary)',
  carbs: '#0ea5e9',
  fat: '#e0941f',
  calorie: 'var(--c-primary)',
} as const

/**
 * درجات داكنة آمنة (≥4.5:1 مع الأبيض) من نفس الأطياف، لأي نصّ ملوّن على خلفية
 * فاتحة داخل بطاقات التنبيه — التزامًا بـWCAG 1.4.3.
 */
const CLR_ON = {
  protein: '#2F7B53',
  water: 'var(--c-primary)',
  trend: '#0369a1',
  calorie: 'var(--c-primary)',
} as const

const SLOTS: { slot: MealSlot; ar: string; en: string; icon: string }[] = [
  { slot: 'breakfast', ar: 'الفطور', en: 'Breakfast', icon: 'Sunrise' },
  { slot: 'lunch', ar: 'الغداء', en: 'Lunch', icon: 'Utensils' },
  { slot: 'dinner', ar: 'العشاء', en: 'Dinner', icon: 'Moon' },
  { slot: 'snack', ar: 'وجبة خفيفة', en: 'Snack', icon: 'Egg' },
]

/** Tone → { decorative accent, AA-safe fill for white text }. */
const NUDGE_CLR: Record<Nudge['tone'], { accent: string; on: string }> = {
  protein: { accent: CLR.protein, on: CLR_ON.protein },
  water: { accent: CLR.water, on: CLR_ON.water },
  trend: { accent: CLR.carbs, on: CLR_ON.trend },
  calorie: { accent: CLR.calorie, on: CLR_ON.calorie },
}

/**
 * Nutrition v2 — Qimmah v2.1 (Slice 5). NutritionView routes
 * here under isDesignV2). Goal-driven day view: calories + macros vs targets,
 * verb-first nudges, on-device water, fast logging + barcode. Adding food/water
 * updates a v2-local day log (qimmah:nutrition:v2). No fake logs, no cloud write.
 */
export function NutritionV2({ lang }: NutritionV2Props) {
  const { customization } = useCustomization()
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const num = (value: number, options?: Intl.NumberFormatOptions) => formatNumber(value, lang, options)
  const [tick, setTick] = useState(0)
  const [screen, setScreen] = useState<'home' | 'add'>('home')
  useAppScrollReset(screen)
  const [targetSlot, setTargetSlot] = useState<MealSlot>('lunch')
  const [copyNote, setCopyNote] = useState<string | null>(null)
  // `tick` forces a recompute after a food/water is added (the model reads
  // localStorage, which the deps linter can't observe).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const model = useMemo(() => buildNutritionV2Model(customization, lang), [customization, lang, tick])
  // tick invalidates the read-only historical snapshot after copying a meal.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const savedDays = useMemo(() => getWeeklyNutritionStats().filter((day) => day.date !== getDayStamp() && day.source === 'entries'), [tick])

  const bump = () => setTick((x) => x + 1)
  const openAdd = (slot: MealSlot) => { setTargetSlot(slot); setScreen('add') }
  const onAdded = () => { bump(); setScreen('home') }
  const copySavedMeal = (date: string, slot: MealSlot) => {
    const result = copyMealToToday(date, slot)
    if (result.status === 'ok') {
      setCopyNote(t(`نسخنا ${num(result.copied)} أصناف لليوم.`, `Copied ${num(result.copied)} items to today.`))
      bump()
    } else {
      setCopyNote(ar ? result.errors[0]?.messageAr ?? 'ما فيه أصناف للنسخ.' : result.errors[0]?.messageEn ?? 'There are no items to copy.')
    }
  }

  useEffect(() => {
    const applyQuickLog = (target: 'meal' | 'water' | 'routine') => {
      if (target === 'meal') {
        setTargetSlot('lunch')
        setScreen('add')
      } else if (target === 'water') {
        window.requestAnimationFrame(() => document.getElementById('nutrition-water')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      }
      if (target !== 'routine') window.sessionStorage.removeItem('qimmah:quick-log-intent')
    }
    const onQuickLog = (event: Event) => {
      applyQuickLog((event as CustomEvent<'meal' | 'water' | 'routine'>).detail)
    }
    const pending = window.sessionStorage.getItem('qimmah:quick-log-intent')
    if (pending === 'meal' || pending === 'water') applyQuickLog(pending)
    window.addEventListener('qimmah:quick-log', onQuickLog)
    return () => window.removeEventListener('qimmah:quick-log', onQuickLog)
  }, [])

  const runNudge = (n: Nudge) => {
    if (n.action === 'water250') { addWaterToDay(250); bump() }
    else if (n.action === 'water500') { addWaterToDay(500); bump() }
    else openAdd(targetSlot)
  }

  if (screen === 'add') return <AddMeal lang={lang} slot={targetSlot} onAdd={onAdded} onBack={() => setScreen('home')} />

  const { calories, macros, water } = model
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="overflow-x-hidden px-4 py-4 text-ink-900">
      <ScreenHeader
        icon="Salad"
        title={t('التغذية', 'Nutrition')}
        action={
          model.goalLabel ? (
            <span className="shrink-0 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary-c">
              {t('الهدف · ', 'Goal · ')}{model.goalLabel}
            </span>
          ) : undefined
        }
      />

      <div className="space-y-4">
        {/* تحذير الحساسيات — يظهر فقط لمن سجّل حساسية. الخطة لا تُفلترها تلقائيًا
            بعد، فنقولها صراحةً بدل الصمت عنها. */}
        <AllergyNotice lang={lang} />

        {/* بطاقة اليوم — الأولوية + السعرات مقابل الهدف + زر التسجيل */}
        <section className="card p-5">
          <p className="text-xs font-bold text-ink-500">{model.hero.priorityLabel}</p>
          <h2 className="mt-2 text-lg font-black leading-tight text-ink-900">{model.hero.title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{model.hero.subtitle}</p>
          {calories.target > 0 && (
            <div className="mt-4">
              <div className="flex items-baseline justify-between text-xs font-bold">
                <span className="text-ink-500">{t('السعرات', 'Calories')}</span>
                <span dir="ltr" className="tabular-nums text-ink-700">
                  {num(calories.consumed)}
                  <span className="text-ink-400"> / {num(calories.target)} {t('سعرة', 'kcal')}</span>
                </span>
              </div>
              <ProgressBar current={calories.consumed} target={calories.target || 1} color="bg-primary" className="mt-2" />
            </div>
          )}
          <button type="button" onClick={() => openAdd(targetSlot)} className="btn-primary mt-4 w-full py-3">
            <Icon name="Plus" className="h-5 w-5" />
            {model.hero.ctaLabel}
          </button>
        </section>

        {/* خطوة تالية واحدة تُبقي الشاشة هادئة. */}
        {model.nudges.length > 0 && (
          <section className="space-y-3" aria-label={t('خطوتك التالية', 'Your next step')}>
            {model.nudges.slice(0, 1).map((n) => (
              <NudgeRow key={n.id} lang={lang} nudge={n} onAction={() => runNudge(n)} />
            ))}
          </section>
        )}

        {/* ملخّص الماكروز + الماء — بطاقات حلقات كلاسيكية */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MacroCard lang={lang} label={t('بروتين', 'Protein')} consumed={macros.protein.consumed} target={macros.protein.target} unit="g" color={CLR.protein} />
          <MacroCard lang={lang} label={t('كارب', 'Carbs')} consumed={macros.carbs.consumed} target={macros.carbs.target} unit="g" color={CLR.carbs} />
          <MacroCard lang={lang} label={t('دهون', 'Fat')} consumed={macros.fat.consumed} target={macros.fat.target} unit="g" color={CLR.fat} />
          <MacroCard
            lang={lang}
            label={t('ماء', 'Water')}
            consumed={water.consumedMl / 1000}
            target={water.targetMl / 1000}
            unit={t('ل', 'L')}
            decimals={1}
            color={CLR.water}
          />
        </div>

        {/* الماء */}
        {water.targetMl > 0 && (
          <section id="nutrition-water" className="card p-5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-bold text-ink-700">
                <Icon name="Droplets" className="h-4 w-4 text-primary-c" />
                {t('الماء', 'Water')}
              </span>
              <span dir="ltr" className="text-sm font-black tabular-nums text-primary-c">
                {num(water.consumedMl / 1000, { maximumFractionDigits: 2 })} / {num(water.targetMl / 1000, { maximumFractionDigits: 1 })} {t('ل', 'L')}
              </span>
            </div>
            <ProgressBar current={water.consumedMl} target={water.targetMl || 1} color="bg-primary" className="mt-3 h-1.5" />
            <div className="mt-3 flex flex-wrap gap-2">
              <WaterBtn label={t('+ ٢٥٠ مل', '+250 ml')} onClick={() => { addWaterToDay(250); bump() }} />
              <WaterBtn label={t('+ ٥٠٠ مل', '+500 ml')} onClick={() => { addWaterToDay(500); bump() }} />
            </div>
            <WaterCustomAdd lang={lang} onAdd={(ml) => { addWaterToDay(ml); bump() }} />
          </section>
        )}

        {/* الوجبات */}
        <section className="space-y-3" aria-label={t('وجبات اليوم', 'Today’s meals')}>
          {model.meals.map((m) => {
            const meta = SLOTS.find((s) => s.slot === m.slot)!
            return (
              <button
                key={m.slot}
                type="button"
                onClick={() => openAdd(m.slot)}
                className="card flex w-full items-center gap-3 p-4 text-start transition-colors hover:border-primary-soft"
              >
                <span
                  className={cn(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-xl',
                    m.logged ? 'bg-primary text-white' : 'bg-primary-soft text-primary-c',
                  )}
                >
                  <Icon name={m.logged ? 'Check' : meta.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-ink-900">{ar ? m.nameAr : m.nameEn}</span>
                  <span className="block text-[11px] text-ink-400">
                    {m.logged ? `${num(m.calories)} ${t('سعرة', 'kcal')} · ${num(m.proteinGrams)}g ${t('بروتين', 'protein')}` : t('لم تُسجّل بعد', 'Not logged yet')}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-black text-primary-c">{t('أضف', 'Add')} ‹</span>
              </button>
            )
          })}
        </section>

        {savedDays.length > 0 && (
          <details className="rounded-2xl border border-line bg-surface" open>
            <summary className="flex min-h-[3.75rem] cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-beige text-ink-500"><Icon name="History" className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black">{t('وجبات محفوظة', 'Saved meals')}</span>
                <span className="block text-xs text-ink-500">{t('انسخ وجبة من الأيام الماضية لليوم.', 'Copy a meal from a previous day to today.')}</span>
              </span>
              <Icon name="ChevronDown" className="h-4 w-4 text-ink-400" />
            </summary>
            <div className="space-y-2 border-t border-line px-3 pb-3 pt-3">
              {savedDays.map((day) => {
                const slots = new Set(getDayEntries(day.date).map((entry) => entry.meal))
                return (
                  <div key={day.date} className="rounded-xl border border-line bg-page px-3 py-2.5">
                    <p className="text-xs font-black text-ink-700" dir="ltr">{day.date}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {SLOTS.filter((slot) => slots.has(slot.slot)).map((slot) => (
                        <button key={slot.slot} type="button" onClick={() => copySavedMeal(day.date, slot.slot)} className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-bold text-ink-700 hover:border-[color:var(--v2-blue)]">
                          {t(`انسخ ${slot.ar}`, `Copy ${slot.en}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </details>
        )}
        {copyNote && <p role="status" className="rounded-xl border border-line bg-surface px-3 py-2 text-center text-xs font-bold text-ink-600">{copyNote}</p>}

        <p className="mt-6 flex items-start gap-2 text-[11px] text-ink-400">
          <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {t('القيم تقديرية · محفوظة على هذا الجهاز.', 'Values are estimates · saved on this device.')}
        </p>
      </div>
    </div>
  )
}

const pct = (consumed: number, target: number) => (target > 0 ? Math.min(1, consumed / target) : 0)

/** سطر الخطوة التالية — بطاقة كلاسيكية بأيقونة ملوّنة وزر إجراء. */
function NudgeRow({ lang, nudge, onAction }: { lang: Lang; nudge: Nudge; onAction: () => void }) {
  const ar = lang !== 'en'
  const { accent } = NUDGE_CLR[nudge.tone]
  return (
    <div className="card flex items-center gap-3 p-4">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
        style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}
      >
        <Icon name={nudge.icon} className="h-4 w-4" />
      </span>
      <p className="min-w-0 flex-1 text-sm font-bold leading-snug text-ink-900">{nudge.text}</p>
      <button type="button" onClick={onAction} className="btn-primary shrink-0 px-3 py-1.5 text-xs">
        {nudge.actionLabel} {ar ? '‹' : '›'}
      </button>
    </div>
  )
}

/**
 * بطاقة ماكرو كلاسيكية — حلقة SVG محلية (بلا مكتبات) بجانب التسمية والقيمة.
 */
function MacroCard({ lang, label, consumed, target, unit, color, decimals = 0 }: { lang: Lang; label: string; consumed: number; target: number; unit: string; color: string; decimals?: number }) {
  const p = pct(consumed, target)
  const hasTarget = target > 0
  const digits = { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
  const consumedText = formatNumber(consumed, lang, digits)
  const targetText = formatNumber(target, lang, digits)
  return (
    <div className="card flex items-center gap-3 p-4">
      <Ring pct={p} color={color} label={`${label}: ${consumedText} / ${hasTarget ? targetText : '—'} ${unit}`} />
      <div className="min-w-0">
        <p className="truncate text-xs text-ink-500">{label}</p>
        <p className="mt-0.5 text-sm font-black tabular-nums text-ink-900">
          {hasTarget ? consumedText : '—'}
          <span className="text-[11px] font-bold text-ink-400"> / {hasTarget ? `${targetText}${unit}` : '—'}</span>
        </p>
      </div>
    </div>
  )
}

/** حلقة تقدّم SVG محلية (بلا مكتبات) — نسبة المستهلَك إلى الهدف. */
function Ring({ pct: p, color, label }: { pct: number; color: string; label: string }) {
  const r = 15
  const c = 2 * Math.PI * r
  const dash = Math.max(0, Math.min(1, p)) * c
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10 shrink-0 -rotate-90" role="img" aria-label={label}>
      <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-line" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
      />
    </svg>
  )
}

/**
 * A search result with an adjustable serving count. Calories/protein recompute
 * live and stay tagged as an estimate («~ · تقدير»); the logged values scale by
 * the chosen servings before being added.
 */
function FoodRow({ f, lang, onLog }: { f: FoodItem; lang: Lang; onLog: (servings: number) => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const [servings, setServings] = useState(1)
  const cal = Math.round(f.calories * servings)
  const pro = Math.round(f.protein * servings)
  const step = (d: number) => setServings((s) => Math.min(20, Math.max(0.5, Math.round((s + d) * 2) / 2)))
  // تسمية الحصة: العربية تعرض التسمية الأصلية كما هي («صحن (350غ)»)، والإنجليزية تُشتق
  // من الجرامات نفسها عبر servingDisplay («350 g · plate») — لا نصّ عربي في واجهة إنجليزية،
  // ولا وحدة مخترعة: الجرام هو مصدر الحقيقة في الحالتين.
  const servingText = ar
    ? f.servingLabelAr
    : servingSummary(f, lang, nutritionScreenStrings[lang].gramsUnit) ?? f.servingLabelAr
  return (
    <div className="card px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-ink-900">{ar ? f.nameAr : f.nameEn}</span>
          <span className="block text-[11px] text-ink-400">
            ~{formatNumber(cal, lang)} {t('سعرة', 'kcal')} · {formatNumber(pro, lang)}g {t('بروتين', 'protein')} · {t('تقدير', 'est.')} / {servingText}
          </span>
        </span>
        <button
          type="button"
          onClick={() => onLog(servings)}
          aria-label={t(`أضف ${f.nameAr} ×${formatNumber(servings, lang, { maximumFractionDigits: 1 })}`, `Add ${f.nameEn} ×${formatNumber(servings, lang, { maximumFractionDigits: 1 })}`)}
          className="btn-primary grid h-11 w-11 shrink-0 place-items-center rounded-xl px-0 py-0"
        >
          <Icon name="Plus" className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
        <span className="text-xs font-bold text-ink-500">{t('عدد الحصص', 'Servings')}</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => step(-0.5)} aria-label={t('أقل', 'Fewer')} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-700 hover:bg-beige"><Icon name="Minus" className="h-4 w-4" /></button>
          <span className="w-8 text-center text-sm font-black tabular-nums text-ink-900">{formatNumber(servings, lang, { maximumFractionDigits: 1 })}</span>
          <button type="button" onClick={() => step(0.5)} aria-label={t('أكثر', 'More')} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-700 hover:bg-beige"><Icon name="Plus" className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  )
}

/** Custom water amount (ml) — beyond the 250/500 quick-adds. Writes the same source. */
function WaterCustomAdd({ lang, onAdd }: { lang: Lang; onAdd: (ml: number) => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const [ml, setMl] = useState('')
  const submit = () => {
    const v = Number(ml)
    if (Number.isFinite(v) && v > 0) { onAdd(Math.min(5000, Math.round(v))); setMl('') }
  }
  return (
    <div className="mt-2 flex gap-2">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={ml}
        onChange={(e) => setMl(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        aria-label={t('كمية ماء مخصّصة بالمل', 'Custom water amount in ml')}
        placeholder={t('مخصّص (مل)', 'Custom (ml)')}
        className="input min-h-[44px] flex-1 text-start tabular-nums"
      />
      <button type="button" onClick={submit} className="btn-primary shrink-0 px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40" disabled={!ml}>
        {t('أضف', 'Add')}
      </button>
    </div>
  )
}

function WaterBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="btn-ghost px-3 py-2 text-xs">
      {label}
    </button>
  )
}

function AddMeal({ lang, slot, onAdd, onBack }: { lang: Lang; slot: MealSlot; onAdd: () => void; onBack: () => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const [q, setQ] = useState('')
  const [highProtein, setHighProtein] = useState(false)
  const [scanning, setScanning] = useState(false)
  const slotLabel = SLOTS.find((s) => s.slot === slot)!
  // البحث يمرّ عبر searchFood: تطبيع عربي (كبسة/كبسه) + الكلمات المفتاحية (المنطقة،
  // الكتابات البديلة، الأسماء اللاتينية) + ترتيب بالصلة. مطابقة النص الخام كانت تُسقط
  // كل ذلك: «كبسه» و«عسير» و«قهوه» كانت تُرجع صفر نتائج مع أنّ البيانات موجودة.
  const results = useMemo(() => {
    let list = searchFood(q)
    if (highProtein) list = list.filter((f) => f.protein >= 15)
    return list.slice(0, 30)
  }, [q, highProtein])

  const logFood = (f: Pick<FoodItem, 'id' | 'nameAr' | 'nameEn' | 'calories' | 'protein' | 'carbs' | 'fat'>, servings = 1) => {
    addFoodToDay({
      id: String(f.id ?? f.nameAr),
      nameAr: f.nameAr,
      nameEn: f.nameEn,
      calories: Math.round(f.calories * servings),
      protein: Math.round(f.protein * servings),
      carbs: Math.round(f.carbs * servings),
      fat: Math.round(f.fat * servings),
      meal: slot,
    })
    onAdd()
  }

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="overflow-x-hidden px-4 py-4 text-ink-900">
      <div>
        <div className="mb-4 flex items-center gap-2.5">
          <button type="button" onClick={onBack} aria-label={t('رجوع', 'Back')} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink-700 hover:bg-beige">
            <Icon name="ChevronRight" className={cn('h-5 w-5', !ar && 'rotate-180')} />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-black text-ink-900">{t(`أضف لـ ${slotLabel.ar}`, `Add to ${slotLabel.en}`)}</h1>
        </div>

        {/* التسجيل السريع: بحث + باركود */}
        <div className="flex items-center gap-2">
          <div className="card flex flex-1 items-center gap-2 px-4 py-3">
            <Icon name="Search" className="h-5 w-5 text-ink-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('ابحث عن طعام…', 'Search food…')}
              aria-label={t('بحث عن طعام', 'Search food')}
              className="w-full bg-transparent text-base text-ink-900 placeholder:text-ink-400 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setScanning(true)}
            aria-label={t('مسح باركود', 'Scan barcode')}
            className="btn-primary grid h-[3.25rem] w-[3.25rem] shrink-0 place-items-center rounded-xl px-0 py-0"
          >
            <Icon name="ScanLine" className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setHighProtein((v) => !v)}
          aria-pressed={highProtein}
          className={cn(
            'mt-3 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors',
            highProtein ? 'border-primary-soft bg-primary-soft text-primary-c' : 'border-line bg-surface text-ink-700 hover:bg-beige',
          )}
        >
          {t('عالي البروتين', 'High protein')}
        </button>

        <div className="mt-4 space-y-3">
          {results.map((f) => (
            <FoodRow key={f.id ?? f.nameAr} f={f} lang={lang} onLog={(servings) => logFood(f, servings)} />
          ))}
          {results.length === 0 && <p className="py-8 text-center text-sm text-ink-500">{t('لا نتائج', 'No results')}</p>}
        </div>
      </div>

      {scanning && (
        <Suspense fallback={null}>
          <ScanFoodPanel
            lang={lang}
            onResolved={(item) => { setScanning(false); logFood(item) }}
            onManualFallback={() => setScanning(false)}
            onClose={() => setScanning(false)}
          />
        </Suspense>
      )}
    </div>
  )
}
