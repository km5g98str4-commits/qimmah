import { useMemo, useState } from 'react'
import { Icon } from '@/components/Icon'
import { ProgressBar } from '@/components/ProgressBar'
import { FOOD_ESTIMATE_NOTE, searchFood, type FoodItem } from '@/data/foodItems'
import { useNutritionToday } from '@/lib/nutritionTracking'
import { NUM_LIMITS, parseSafeNumber, sanitizeNumericInput } from '@/lib/validation'
import { getStrings } from '@/config/strings'
import type { Lang } from '@/lib/appPreferences'

interface QuickMealLoggerProps {
  lang: Lang
  targetCalories: number
  targetProtein: number
}

type Tab = 'search' | 'custom'

function round(n: number): number {
  return Math.round(n)
}

/** مسجّل وجبات سريع — بحث في قاعدة الأطعمة أو إضافة سعرات/بروتين مخصّصة، مع تقدّم يومي. */
export function QuickMealLogger({ lang, targetCalories, targetProtein }: QuickMealLoggerProps) {
  const t = getStrings(lang).nutrition
  const { state, totals, addLog, removeLog } = useNutritionToday()

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('search')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<FoodItem | null>(null)
  const [servings, setServings] = useState('1')

  // إضافة سريعة / طعام مخصّص
  const [cName, setCName] = useState('')
  const [cCal, setCCal] = useState('')
  const [cProt, setCProt] = useState('')
  const [cCarb, setCCarb] = useState('')
  const [cFat, setCFat] = useState('')

  const results = useMemo(() => searchFood(query).slice(0, 10), [query])

  const eatenCal = round(totals.calories)
  const eatenProt = round(totals.protein)
  const remCal = Math.max(0, targetCalories - eatenCal)
  const remProt = Math.max(0, targetProtein - eatenProt)

  const addSelected = () => {
    if (!selected) return
    const q = parseSafeNumber(servings, { min: 0.25, max: 50, fallback: 1 })
    const name = lang === 'en' ? selected.nameEn : selected.nameAr
    addLog({
      label: `${name} ×${q}`,
      servings: q,
      calories: round(selected.calories * q),
      protein: round(selected.protein * q),
      carbs: round(selected.carbs * q),
      fat: round(selected.fat * q),
    })
    setSelected(null)
    setQuery('')
    setServings('1')
  }

  // سعرات/بروتين الإضافة الحالية (محصورة ضمن الحدود — لا قيم سالبة أو مستحيلة)
  const cal = parseSafeNumber(cCal, { min: 0, max: NUM_LIMITS.quickCalories.max })
  const prot = parseSafeNumber(cProt, { min: 0, max: NUM_LIMITS.quickProtein.max })
  const canAddCustom = cal > 0 || prot > 0

  const addCustom = () => {
    if (!canAddCustom) return
    addLog({
      label: cName.trim() || (lang === 'en' ? 'Quick add' : 'إضافة سريعة'),
      servings: 1,
      calories: round(cal),
      protein: round(prot),
      carbs: round(parseSafeNumber(cCarb, { min: 0, max: NUM_LIMITS.quickMacro.max })),
      fat: round(parseSafeNumber(cFat, { min: 0, max: NUM_LIMITS.quickMacro.max })),
      note: cName.trim() || undefined,
    })
    setCName('')
    setCCal('')
    setCProt('')
    setCCarb('')
    setCFat('')
  }

  return (
    <div className="card p-5">
      {/* التقدّم اليومي */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-ink-700">{t.calories}</span>
            <span className="text-ink-500">
              <span className="font-bold text-ink-900">{eatenCal}</span> / {targetCalories}
            </span>
          </div>
          <ProgressBar current={eatenCal} target={targetCalories || 1} color="bg-orange-500" className="mt-2" />
          <p className="mt-1 text-[11px] text-ink-400">{t.remainingCalories}: <span className="font-bold text-ink-700">{remCal}</span></p>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-ink-700">{t.protein}</span>
            <span className="text-ink-500">
              <span className="font-bold text-ink-900">{eatenProt}</span> / {targetProtein}غ
            </span>
          </div>
          <ProgressBar current={eatenProt} target={targetProtein || 1} color="bg-brand-500" className="mt-2" />
          <p className="mt-1 text-[11px] text-ink-400">{t.remainingProtein}: <span className="font-bold text-ink-700">{remProt}غ</span></p>
        </div>
      </div>

      {/* أزرار الفتح */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => { setOpen((v) => !v); setTab('search') }}
          className="btn-primary px-4 py-2 text-xs"
        >
          <Icon name="Utensils" className="h-4 w-4" />
          {t.logMeal}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(true); setTab('custom') }}
          className="btn-ghost px-4 py-2 text-xs"
        >
          <Icon name="Plus" className="h-4 w-4" />
          {t.quickAdd}
        </button>
      </div>

      {open && (
        <div className="mt-4 rounded-xl border border-line bg-page p-4">
          {/* تبويبات */}
          <div className="mb-3 flex gap-2">
            <TabBtn active={tab === 'search'} onClick={() => setTab('search')} label={t.searchFood} />
            <TabBtn active={tab === 'custom'} onClick={() => setTab('custom')} label={t.customQuickAdd} />
          </div>

          {tab === 'search' ? (
            <div>
              <div className="relative">
                <Icon name="Search" className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400 ms-3" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelected(null) }}
                  placeholder={t.searchFood}
                  className="w-full rounded-lg border border-line bg-surface py-2 ps-9 pe-3 text-sm text-ink-900 outline-none focus:border-primary-c"
                />
              </div>

              {!selected && query.trim() && (
                <ul className="mt-2 max-h-56 divide-y divide-line overflow-y-auto rounded-lg border border-line">
                  {results.length === 0 && (
                    <li className="p-3 text-xs text-ink-400">{lang === 'en' ? 'No results' : 'لا نتائج'}</li>
                  )}
                  {results.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => { setSelected(f); setServings('1') }}
                        className="flex w-full items-center justify-between gap-3 p-3 text-start hover:bg-beige"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-ink-900">{lang === 'en' ? f.nameEn : f.nameAr}</span>
                          <span className="block text-[11px] text-ink-400">{f.servingLabelAr} · {f.category}</span>
                        </span>
                        <span className="shrink-0 text-[11px] font-bold text-orange-300">{f.calories} · {f.protein}غ</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {selected && (
                <div className="mt-3 rounded-lg border border-line bg-surface p-3">
                  <p className="text-sm font-bold text-ink-900">{lang === 'en' ? selected.nameEn : selected.nameAr}</p>
                  <p className="text-[11px] text-ink-400">{selected.servingLabelAr}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <label className="text-xs text-ink-500">{t.servingsCount}</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0.25"
                      max="50"
                      step="0.25"
                      value={servings}
                      onChange={(e) => setServings(sanitizeNumericInput(e.target.value, { max: 50, decimal: true }))}
                      className="w-20 rounded-lg border border-line bg-page px-2 py-1.5 text-sm text-ink-900 outline-none focus:border-primary-c"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-500">
                    <Stat label={t.calories} value={round(selected.calories * (Number(servings) || 1))} />
                    <Stat label={t.protein} value={`${round(selected.protein * (Number(servings) || 1))}غ`} />
                    <Stat label={t.carbs} value={`${round(selected.carbs * (Number(servings) || 1))}غ`} />
                    <Stat label={t.fat} value={`${round(selected.fat * (Number(servings) || 1))}غ`} />
                  </div>
                  <button type="button" onClick={addSelected} className="btn-primary mt-3 w-full justify-center py-2 text-xs">
                    <Icon name="Plus" className="h-4 w-4" />
                    {t.addToLog}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-ink-500">{t.foodName} — {t.optional}</label>
                <input
                  type="text"
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  placeholder={lang === 'en' ? 'e.g. Home kabsa plate' : 'مثال: صحن كبسة بيت'}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-900 outline-none focus:border-primary-c"
                />
              </div>
              <Field label={`${t.calories} (0–${NUM_LIMITS.quickCalories.max})`} value={cCal} onChange={setCCal} max={NUM_LIMITS.quickCalories.max} placeholder="0" />
              <Field label={`${t.protein} (غ)`} value={cProt} onChange={setCProt} max={NUM_LIMITS.quickProtein.max} placeholder="0" />
              <Field label={`${t.carbs} (غ) — ${t.optional}`} value={cCarb} onChange={setCCarb} max={NUM_LIMITS.quickMacro.max} placeholder="0" />
              <Field label={`${t.fat} (غ) — ${t.optional}`} value={cFat} onChange={setCFat} max={NUM_LIMITS.quickMacro.max} placeholder="0" />
              <button type="button" onClick={addCustom} disabled={!canAddCustom} className="btn-primary col-span-2 justify-center py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40">
                <Icon name="Plus" className="h-4 w-4" />
                {t.addToLog}
              </button>
              {!canAddCustom && (
                <p className="col-span-2 text-[11px] text-ink-400">{t.quickAddHint}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* سجل اليوم */}
      <div className="mt-4">
        <p className="text-xs font-bold text-ink-700">{t.todayLog}</p>
        {state.log.length === 0 ? (
          <p className="mt-2 text-xs text-ink-400">{t.emptyLog}</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {state.log.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink-900">{e.label}</span>
                  <span className="block text-[11px] text-ink-400">{e.calories} سعرة · {e.protein}غ بروتين</span>
                </span>
                <button
                  type="button"
                  onClick={() => removeLog(e.id)}
                  aria-label={t.removeEntry}
                  className="shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-beige hover:text-danger"
                >
                  <Icon name="Trash2" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 flex items-start gap-2 text-[11px] text-ink-400">
        <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {FOOD_ESTIMATE_NOTE}
      </p>
    </div>
  )
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
        active ? 'bg-primary text-white' : 'bg-beige text-ink-500 hover:text-ink-900'
      }`}
    >
      {label}
    </button>
  )
}

function Field({ label, value, onChange, placeholder, max }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; max?: number }) {
  return (
    <div>
      <label className="text-xs text-ink-500">{label}</label>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        max={max}
        value={value}
        onChange={(e) => onChange(sanitizeNumericInput(e.target.value, { max }))}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-900 outline-none focus:border-primary-c"
      />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-bold text-ink-900">{value}</span>
      <span>{label}</span>
    </span>
  )
}
