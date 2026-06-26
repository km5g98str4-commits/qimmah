import { useMemo, useState } from 'react'
import { Icon } from './Icon'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import { mealIngredients } from '@/data/mealIngredients'
import { ingredientDisplayName } from '@/lib/nutritionPlan'
import type { IngredientCategory } from '@/types/nutrition'

interface IngredientPickerProps {
  lang: Lang
  onAdd: (ingredientId: string) => void
  onClose: () => void
}

const categoryOptions: { value: IngredientCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'كل الأصناف' },
  { value: 'protein', label: 'بروتين' },
  { value: 'carb', label: 'كربوهيدرات' },
  { value: 'fat', label: 'دهون' },
  { value: 'vegetable', label: 'خضار' },
  { value: 'fruit', label: 'فواكه' },
  { value: 'dairy', label: 'ألبان' },
  { value: 'drink', label: 'مشروبات' },
  { value: 'other', label: 'أخرى' },
]

const selectClass = 'rounded-lg border border-line bg-surface px-2.5 py-2 text-xs font-bold text-ink-700 focus:outline-none'

/** منتقي مكوّن من مكتبة التغذية. */
export function IngredientPicker({ lang, onAdd, onClose }: IngredientPickerProps) {
  const t = getStrings(lang).nutrition
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<IngredientCategory | 'all'>('all')

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return mealIngredients.filter((i) => {
      if (cat !== 'all' && i.category !== cat) return false
      if (query && !`${i.nameAr} ${i.nameEn}`.toLowerCase().includes(query)) return false
      return true
    })
  }, [q, cat])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-900/40 p-0 sm:items-center sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-3xl bg-surface shadow-card sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h3 className="text-base font-bold text-ink-900">مكتبة المكونات</h3>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-beige">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2 border-b border-line p-4">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-page px-3">
            <Icon name="Salad" className="h-4 w-4 text-ink-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="w-full bg-transparent py-2.5 text-sm text-ink-900 focus:outline-none" />
          </div>
          <select className={selectClass} value={cat} onChange={(e) => setCat(e.target.value as IngredientCategory | 'all')}>
            {categoryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-400">ما فيه نتائج.</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((i) => (
                <li key={i.id} className="flex items-center gap-2 rounded-xl border border-line bg-page p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink-900">{ingredientDisplayName(i.nameAr, i.nameEn, lang)}</p>
                    <p className="truncate text-[11px] text-ink-400">
                      {lang === 'en' ? i.servingLabelEn : i.servingLabelAr} · {i.calories} {t.calories} · {i.protein}غ {t.protein}
                    </p>
                  </div>
                  <button type="button" onClick={() => onAdd(i.id)} className="btn-primary px-3 py-2 text-xs">
                    <Icon name="Plus" className="h-4 w-4" />
                    أضف
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
