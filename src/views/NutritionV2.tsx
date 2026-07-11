import { useMemo, useState } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { useCustomization } from '@/lib/customizationContext'
import { foodItems } from '@/data/foodItems'
import { buildNutritionV2Model, addFoodToDay, type MealSlot } from '@/lib/nutritionV2Model'

interface NutritionV2Props {
  lang: Lang
}

const SLOTS: { slot: MealSlot; ar: string; en: string; icon: string }[] = [
  { slot: 'breakfast', ar: 'الفطور', en: 'Breakfast', icon: 'Sunrise' },
  { slot: 'lunch', ar: 'الغداء', en: 'Lunch', icon: 'Utensils' },
  { slot: 'dinner', ar: 'العشاء', en: 'Dinner', icon: 'Moon' },
  { slot: 'snack', ar: 'وجبة خفيفة', en: 'Snack', icon: 'Egg' },
]

/**
 * Nutrition v2 — Qimmah v2.1 (Slice 5). Preview-gated (NutritionView branches
 * here under isDesignV2). Goal-aware home + a working Add-Meal search over the
 * existing local food list. Adding food updates a v2-local day log
 * (qimmah:nutrition:v2) and the home totals. No fake logs, no barcode faking,
 * no cloud write.
 */
export function NutritionV2({ lang }: NutritionV2Props) {
  const { customization } = useCustomization()
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const [tick, setTick] = useState(0)
  const [screen, setScreen] = useState<'home' | 'add'>('home')
  const [targetSlot, setTargetSlot] = useState<MealSlot>('lunch')
  // `tick` forces a recompute after a food is added (the model reads localStorage,
  // which the deps linter can't observe).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const model = useMemo(() => buildNutritionV2Model(customization, lang), [customization, lang, tick])

  const openAdd = (slot: MealSlot) => { setTargetSlot(slot); setScreen('add') }
  const onAdded = () => { setTick((x) => x + 1); setScreen('home') }

  if (screen === 'add') return <AddMeal lang={lang} slot={targetSlot} onAdd={onAdded} onBack={() => setScreen('home')} />

  const heroClr = model.hero.category === 'protein' ? 'text-primary' : model.hero.category === 'fuel' ? 'text-primary' : 'text-ink-900'
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="min-h-screen bg-page px-4 pb-8 pt-3 text-ink-900">
      <div className="mx-auto w-full max-w-md space-y-4">
        <header className="flex items-center justify-between pt-1">
          <h1 className="text-2xl font-black tracking-tight">{t('التغذية · اليوم', 'Nutrition · Today')}</h1>
          {model.goalLabel && <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{model.goalLabel}</span>}
        </header>

        {/* Goal-aware hero */}
        <section className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-card">
          <p className="text-xs font-black uppercase tracking-wider text-primary">{model.hero.priorityLabel}</p>
          <h2 className={cn('mt-2 text-2xl font-black leading-tight', heroClr)}>{model.hero.title}</h2>
          <p className="mt-2 text-sm text-ink-500">{model.hero.subtitle}</p>
          <button type="button" onClick={() => openAdd(targetSlot)} className="btn-primary mt-4 w-full py-3.5">{model.hero.ctaLabel}</button>
        </section>

        {/* Summary */}
        <section className="grid grid-cols-4 gap-2">
          <Metric label={t('سعرة متبقّية', 'kcal left')} value={model.calories.target > 0 ? model.calories.remaining : '—'} />
          <Metric label={t('بروتين g', 'protein g')} value={model.protein.targetGrams > 0 ? model.protein.remainingGrams : '—'} accent />
          <Metric label={t('كارب g', 'carbs g')} value={model.macros.carbsGrams || '—'} />
          <Metric label={t('دهون g', 'fat g')} value={model.macros.fatGrams || '—'} />
        </section>

        {/* Meals */}
        <section className="space-y-2.5">
          {model.meals.map((m) => {
            const meta = SLOTS.find((s) => s.slot === m.slot)!
            return (
              <button key={m.slot} type="button" onClick={() => openAdd(m.slot)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-start transition-colors hover:border-primary/40">
                <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', m.logged ? 'bg-primary/12 text-primary' : 'bg-beige text-ink-500')}><Icon name={meta.icon} className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{ar ? m.nameAr : m.nameEn}</span>
                  <span className="block text-xs text-ink-500">{m.logged ? `${m.calories} ${t('سعرة', 'kcal')} · ${m.proteinGrams}g ${t('بروتين', 'protein')}` : t('لم تُسجّل بعد', 'Not logged yet')}</span>
                </span>
                <Icon name={m.logged ? 'Plus' : 'Plus'} className="h-4.5 w-4.5 shrink-0 text-primary" />
              </button>
            )
          })}
        </section>

        {/* Suggestions */}
        {model.suggestions.length > 0 && (
          <section className="space-y-2">
            <p className="text-sm font-black">{t('اقتراحات', 'Suggestions')}</p>
            {model.suggestions.map((s, i) => (
              <button key={i} type="button" onClick={() => openAdd(targetSlot)} className="flex w-full items-center justify-between gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-start hover:border-primary/40">
                <span className="min-w-0"><span className="block text-sm font-bold">{s.label}</span><span className="block text-xs text-ink-500">{s.reason}</span></span>
                <span className="shrink-0 text-xs font-black text-primary">{s.actionLabel}</span>
              </button>
            ))}
          </section>
        )}

        <p className="px-1 text-center text-[0.7rem] text-ink-400">{t('القيم تقديرية · محفوظة على هذا الجهاز.', 'Values are estimates · saved on this device.')}</p>
      </div>
    </div>
  )
}

function Metric({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-1 py-3 text-center">
      <p className={cn('text-lg font-black tabular-nums', accent ? 'text-primary' : 'text-ink-900')}>{typeof value === 'number' ? value.toLocaleString('en-US') : value}</p>
      <p className="mt-0.5 text-[0.6rem] font-bold text-ink-500">{label}</p>
    </div>
  )
}

function AddMeal({ lang, slot, onAdd, onBack }: { lang: Lang; slot: MealSlot; onAdd: () => void; onBack: () => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const [q, setQ] = useState('')
  const [highProtein, setHighProtein] = useState(false)
  const slotLabel = SLOTS.find((s) => s.slot === slot)!
  const results = useMemo(() => {
    let list = foodItems
    if (q.trim()) list = list.filter((f) => f.nameAr.includes(q.trim()))
    if (highProtein) list = list.filter((f) => f.protein >= 15)
    return list.slice(0, 30)
  }, [q, highProtein])

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="min-h-screen bg-page px-4 pb-8 pt-3 text-ink-900">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} aria-label={ar ? 'رجوع' : 'Back'} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface"><Icon name="ChevronRight" className="h-5 w-5" /></button>
          <h1 className="text-xl font-black">{t(`أضف لـ ${slotLabel.ar}`, `Add to ${slotLabel.en}`)}</h1>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3">
          <Icon name="Search" className="h-5 w-5 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('ابحث عن طعام…', 'Search food…')} aria-label={t('بحث', 'Search')} className="w-full bg-transparent text-base text-ink-900 placeholder:text-ink-400 focus:outline-none" />
        </div>
        <button type="button" onClick={() => setHighProtein((v) => !v)} aria-pressed={highProtein} className={cn('mt-3 rounded-full border px-3.5 py-1.5 text-xs font-bold', highProtein ? 'border-primary bg-primary/15 text-primary' : 'border-line bg-surface text-ink-700')}>{t('عالي البروتين', 'High protein')}</button>

        <div className="mt-4 space-y-2">
          {results.map((f) => (
            <div key={f.id ?? f.nameAr} className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{f.nameAr}</span>
                <span className="block text-xs text-ink-500">{f.calories} {t('سعرة', 'kcal')} · {f.protein}g {t('بروتين', 'protein')} / {f.servingLabelAr}</span>
              </span>
              <button type="button" onClick={() => { addFoodToDay({ id: String(f.id ?? f.nameAr), nameAr: f.nameAr, calories: f.calories, protein: f.protein, meal: slot }); onAdd() }} aria-label={t('أضف', 'Add')} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-white"><Icon name="Plus" className="h-5 w-5" /></button>
            </div>
          ))}
          {results.length === 0 && <p className="py-8 text-center text-sm text-ink-500">{t('لا نتائج', 'No results')}</p>}
        </div>
      </div>
    </div>
  )
}
