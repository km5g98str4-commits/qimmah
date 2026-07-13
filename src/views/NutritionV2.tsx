import { useMemo, useState } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { useCustomization } from '@/lib/customizationContext'
import { foodItems, type FoodItem } from '@/data/foodItems'
import { ScanFoodPanel } from '@/features/barcode/ScanFoodPanel'
import {
  addFoodToDay,
  addWaterToDay,
  buildNutritionV2Model,
  type MealSlot,
  type Nudge,
} from '@/lib/nutritionV2Model'

interface NutritionV2Props {
  lang: Lang
}

/**
 * Qimmah v2.1 Momentum data palette (Slice 5). Protein green + water/recovery
 * teal are semantic per the v2.1 spec; carbs/fat ride the blue/amber data
 * series; calories use Ember (the app primary). Kept as raw hex here — same
 * pattern as v1 MacroCard — until the Momentum token hex lands in tokens.css.
 */
const CLR = {
  protein: '#1F9D57', // green — protein
  water: '#12A594', // teal — water / recovery
  carbs: '#2A6CE0', // blue — data / trends
  fat: '#C9821C', // amber — data
  calorie: '#F0512A', // ember — primary / calories
} as const

/**
 * AA-safe (≥4.5:1 with white) shades of the same hues, used ONLY where white
 * text sits on the accent (nudge pills, water quick-add). The spec hexes above
 * stay for decorative use (rings, borders, icon tints, progress bars — all pass
 * the 3:1 UI-component bar). Keeps the palette identity while meeting WCAG 1.4.3.
 */
const CLR_ON = {
  protein: '#157F46', // 5.05:1
  water: '#0E8578', // 4.52:1
  trend: '#2A6CE0', // 4.86:1
  calorie: '#C2410C', // 5.18:1
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
 * Nutrition v2 — Qimmah v2.1 (Slice 5). Preview-gated (NutritionView branches
 * here under isDesignV2). Goal-driven day view: calories + macros vs targets,
 * verb-first nudges, on-device water, fast logging + barcode. Adding food/water
 * updates a v2-local day log (qimmah:nutrition:v2). No fake logs, no cloud write.
 */
export function NutritionV2({ lang }: NutritionV2Props) {
  const { customization } = useCustomization()
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const [tick, setTick] = useState(0)
  const [screen, setScreen] = useState<'home' | 'add'>('home')
  const [targetSlot, setTargetSlot] = useState<MealSlot>('lunch')
  // `tick` forces a recompute after a food/water is added (the model reads
  // localStorage, which the deps linter can't observe).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const model = useMemo(() => buildNutritionV2Model(customization, lang), [customization, lang, tick])

  const bump = () => setTick((x) => x + 1)
  const openAdd = (slot: MealSlot) => { setTargetSlot(slot); setScreen('add') }
  const onAdded = () => { bump(); setScreen('home') }

  const runNudge = (n: Nudge) => {
    if (n.action === 'water250') { addWaterToDay(250); bump() }
    else if (n.action === 'water500') { addWaterToDay(500); bump() }
    else openAdd(targetSlot)
  }

  if (screen === 'add') return <AddMeal lang={lang} slot={targetSlot} onAdd={onAdded} onBack={() => setScreen('home')} />

  const { calories, macros, water } = model
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="min-h-screen bg-page px-4 pb-28 pt-3 text-ink-900">
      <div className="mx-auto w-full max-w-md space-y-5 animate-fade-up">
        <header className="flex items-center justify-between pt-1">
          <h1 className="text-2xl font-black tracking-tight">{t('التغذية · اليوم', 'Nutrition · Today')}</h1>
          {model.goalLabel && (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              {t('الهدف · ', 'Goal · ')}{model.goalLabel}
            </span>
          )}
        </header>

        {/* Goal-driven hero */}
        <section className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-card">
          <p className="text-xs font-black uppercase tracking-wider text-primary">{model.hero.priorityLabel}</p>
          <h2 className="mt-2 text-2xl font-black leading-tight">{model.hero.title}</h2>
          <p className="mt-2 text-sm text-ink-500">{model.hero.subtitle}</p>
          {calories.target > 0 && (
            <div className="mt-4">
              <div className="flex items-baseline justify-between text-xs font-bold">
                <span className="text-ink-500">{t('السعرات', 'Calories')}</span>
                <span className="tabular-nums text-ink-700">
                  {calories.consumed.toLocaleString('en-US')}
                  <span className="text-ink-400"> / {calories.target.toLocaleString('en-US')} {t('سعرة', 'kcal')}</span>
                </span>
              </div>
              <Bar pct={pct(calories.consumed, calories.target)} color={CLR.calorie} className="mt-1.5" />
            </div>
          )}
          <button type="button" onClick={() => openAdd(targetSlot)} className="btn-primary mt-4 w-full py-3.5 text-[1.0625rem]">
            <Icon name="Plus" className="h-5 w-5" />
            {model.hero.ctaLabel}
          </button>
        </section>

        {/* Verb-first nudges */}
        {model.nudges.length > 0 && (
          <section className="space-y-2.5" aria-label={t('تنبيهات اليوم', 'Today’s nudges')}>
            {model.nudges.map((n) => (
              <NudgeRow key={n.id} lang={lang} nudge={n} onAction={() => runNudge(n)} />
            ))}
          </section>
        )}

        {/* Macros vs targets */}
        <section>
          <h3 className="mb-2.5 text-sm font-black">{t('الماكروز مقابل هدفك', 'Macros vs your goal')}</h3>
          <div className="grid grid-cols-4 gap-2">
            <MacroRing label={t('بروتين', 'Protein')} consumed={macros.protein.consumed} target={macros.protein.target} unit="g" color={CLR.protein} />
            <MacroRing label={t('كارب', 'Carbs')} consumed={macros.carbs.consumed} target={macros.carbs.target} unit="g" color={CLR.carbs} />
            <MacroRing label={t('دهون', 'Fat')} consumed={macros.fat.consumed} target={macros.fat.target} unit="g" color={CLR.fat} />
            <MacroRing
              label={t('ماء', 'Water')}
              consumed={water.consumedMl / 1000}
              target={water.targetMl / 1000}
              unit={t('ل', 'L')}
              decimals={1}
              color={CLR.water}
            />
          </div>
        </section>

        {/* Water — teal quick-add */}
        {water.targetMl > 0 && (
          <section className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-bold text-ink-700">
                <Icon name="Droplets" className="h-4 w-4" style={{ color: CLR.water }} />
                {t('الماء', 'Water')}
              </span>
              <span className="text-sm font-black tabular-nums" style={{ color: CLR_ON.water }}>
                {(water.consumedMl / 1000).toFixed(2)} / {(water.targetMl / 1000).toFixed(1)} {t('ل', 'L')}
              </span>
            </div>
            <Bar pct={pct(water.consumedMl, water.targetMl)} color={CLR.water} className="mt-2.5" />
            <div className="mt-3 flex gap-2">
              <WaterBtn label={t('+ ٢٥٠ مل', '+250 ml')} onClick={() => { addWaterToDay(250); bump() }} />
              <WaterBtn label={t('+ ٥٠٠ مل', '+500 ml')} onClick={() => { addWaterToDay(500); bump() }} />
            </div>
          </section>
        )}

        {/* Meals */}
        <section className="space-y-2.5" aria-label={t('وجبات اليوم', 'Today’s meals')}>
          {model.meals.map((m) => {
            const meta = SLOTS.find((s) => s.slot === m.slot)!
            return (
              <button
                key={m.slot}
                type="button"
                onClick={() => openAdd(m.slot)}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-start transition-colors hover:border-primary/40"
              >
                <span
                  className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', m.logged ? 'text-white' : 'bg-beige text-ink-500')}
                  style={m.logged ? { backgroundColor: CLR.protein } : undefined}
                >
                  <Icon name={m.logged ? 'Check' : meta.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{ar ? m.nameAr : m.nameEn}</span>
                  <span className="block text-xs text-ink-500">
                    {m.logged ? `${m.calories} ${t('سعرة', 'kcal')} · ${m.proteinGrams}g ${t('بروتين', 'protein')}` : t('لم تُسجّل بعد', 'Not logged yet')}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-black text-primary">{t('أضف', 'Add')} ‹</span>
              </button>
            )
          })}
        </section>

        <p className="px-1 text-center text-[0.7rem] text-ink-400">
          {t('القيم تقديرية · محفوظة على هذا الجهاز.', 'Values are estimates · saved on this device.')}
        </p>
      </div>
    </div>
  )
}

const pct = (consumed: number, target: number) => (target > 0 ? Math.min(1, consumed / target) : 0)

/** Verb-first nudge row — colored inline-start accent + icon + action pill. */
function NudgeRow({ lang, nudge, onAction }: { lang: Lang; nudge: Nudge; onAction: () => void }) {
  const ar = lang !== 'en'
  const { accent, on } = NUDGE_CLR[nudge.tone]
  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-line bg-surface py-3 pe-4 ps-3.5"
      style={{ borderInlineStartWidth: 3, borderInlineStartColor: accent }}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${accent}1A`, color: on }}>
        <Icon name={nudge.icon} className="h-4.5 w-4.5" />
      </span>
      <p className="min-w-0 flex-1 text-sm font-bold leading-snug text-ink-800">{nudge.text}</p>
      <button
        type="button"
        onClick={onAction}
        className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-black text-white"
        style={{ backgroundColor: on }}
      >
        {nudge.actionLabel} {ar ? '‹' : '›'}
      </button>
    </div>
  )
}

/** Local SVG progress ring (no libs) — consumed / target. */
function MacroRing({ label, consumed, target, unit, color, decimals = 0 }: { label: string; consumed: number; target: number; unit: string; color: string; decimals?: number }) {
  const p = pct(consumed, target)
  const r = 16
  const c = 2 * Math.PI * r
  const dash = p * c
  const hasTarget = target > 0
  const consumedText = consumed.toFixed(decimals)
  const targetText = target.toFixed(decimals)
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface px-1 py-3">
      <div className="relative h-14 w-14">
        <svg viewBox="0 0 40 40" className="h-14 w-14 -rotate-90" role="img" aria-label={`${label}: ${consumedText} / ${hasTarget ? targetText : '—'} ${unit}`}>
          <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-line" />
          {hasTarget && p > 0 && (
            <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`} />
          )}
        </svg>
        <span className="absolute inset-0 grid place-items-center text-[0.68rem] font-black tabular-nums text-ink-900">
          {hasTarget ? consumedText : '—'}
        </span>
      </div>
      <span className="text-[0.68rem] font-bold text-ink-500">{label}</span>
      <span className="text-[0.6rem] tabular-nums text-ink-400">{hasTarget ? `${targetText}${unit}` : '—'}</span>
    </div>
  )
}

function Bar({ pct: p, color, className }: { pct: number; color: string; className?: string }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-line', className)} role="progressbar" aria-valuenow={Math.round(p * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-[width]" style={{ width: `${Math.max(0, Math.min(1, p)) * 100}%`, backgroundColor: color }} />
    </div>
  )
}

function WaterBtn({ label, onClick }: { label: string; onClick: () => void }) {
  // White on AA-safe teal (4.52:1) — the quick-add is interactive text.
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 rounded-xl py-2.5 text-xs font-black text-white transition-opacity hover:opacity-90"
      style={{ backgroundColor: CLR_ON.water }}
    >
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
  const results = useMemo(() => {
    let list = foodItems
    const query = q.trim()
    if (query) list = list.filter((f) => f.nameAr.includes(query) || f.nameEn.toLowerCase().includes(query.toLowerCase()))
    if (highProtein) list = list.filter((f) => f.protein >= 15)
    return list.slice(0, 30)
  }, [q, highProtein])

  const logFood = (f: Pick<FoodItem, 'id' | 'nameAr' | 'nameEn' | 'calories' | 'protein' | 'carbs' | 'fat'>) => {
    addFoodToDay({
      id: String(f.id ?? f.nameAr),
      nameAr: f.nameAr,
      nameEn: f.nameEn,
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      meal: slot,
    })
    onAdd()
  }

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="min-h-screen bg-page px-4 pb-28 pt-3 text-ink-900">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} aria-label={t('رجوع', 'Back')} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-surface">
            <Icon name="ChevronRight" className={cn('h-5 w-5', !ar && 'rotate-180')} />
          </button>
          <h1 className="text-xl font-black">{t(`أضف لـ ${slotLabel.ar}`, `Add to ${slotLabel.en}`)}</h1>
        </div>

        {/* Fast logging: search + barcode */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3">
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
            className="grid h-[3.25rem] w-[3.25rem] shrink-0 place-items-center rounded-2xl border text-white"
            style={{ backgroundColor: CLR.water, borderColor: CLR.water }}
          >
            <Icon name="ScanLine" className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setHighProtein((v) => !v)}
          aria-pressed={highProtein}
          className={cn('mt-3 rounded-full border px-3.5 py-1.5 text-xs font-bold', highProtein ? 'text-white' : 'border-line bg-surface text-ink-700')}
          style={highProtein ? { backgroundColor: CLR_ON.protein, borderColor: CLR_ON.protein } : undefined}
        >
          {t('عالي البروتين', 'High protein')}
        </button>

        <div className="mt-4 space-y-2">
          {results.map((f) => (
            <div key={f.id ?? f.nameAr} className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{ar ? f.nameAr : f.nameEn}</span>
                <span className="block text-xs text-ink-500">
                  {f.calories} {t('سعرة', 'kcal')} · {f.protein}g {t('بروتين', 'protein')} / {f.servingLabelAr}
                </span>
              </span>
              <button
                type="button"
                onClick={() => logFood(f)}
                aria-label={t(`أضف ${f.nameAr}`, `Add ${f.nameEn}`)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-white"
              >
                <Icon name="Plus" className="h-5 w-5" />
              </button>
            </div>
          ))}
          {results.length === 0 && <p className="py-8 text-center text-sm text-ink-500">{t('لا نتائج', 'No results')}</p>}
        </div>
      </div>

      {scanning && (
        <ScanFoodPanel
          lang={lang}
          onResolved={(item) => { setScanning(false); logFood(item) }}
          onManualFallback={() => setScanning(false)}
          onClose={() => setScanning(false)}
        />
      )}
    </div>
  )
}
