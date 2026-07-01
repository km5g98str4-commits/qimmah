import { Icon } from '@/components/Icon'
import { inputClass } from './Field'
import type { Lang } from '@/lib/appPreferences'
import { onboardingStrings } from '@/i18n/dict/onboarding'

export interface ColumnDef<T> {
  key: keyof T
  label: string
  type?: 'text' | 'number'
  options?: { value: string; label: string }[]
  span?: string // أصناف grid-column مثل 'sm:col-span-2'
}

interface EditableTableProps<T> {
  items: T[]
  columns: ColumnDef<T>[]
  onChange: (items: T[]) => void
  makeEmpty: () => T
  addLabel: string
  lang: Lang
}

/** جدول قابل للتعديل: صفوف بحقول + إضافة/حذف. عام لكل أقسام البيانات. */
export function EditableTable<T extends object>({
  items,
  columns,
  onChange,
  makeEmpty,
  addLabel,
  lang,
}: EditableTableProps<T>) {
  const d = onboardingStrings[lang]
  const update = (index: number, key: keyof T, raw: string, type?: string) => {
    const next = items.slice()
    const value = type === 'number' ? Number(raw) || 0 : raw
    next[index] = { ...next[index], [key]: value } as T
    onChange(next)
  }

  const remove = (index: number) => onChange(items.filter((_, i) => i !== index))
  const add = () => onChange([...items, makeEmpty()])

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-beige p-3 sm:grid-cols-12"
        >
          {columns.map((col) => (
            <div key={String(col.key)} className={`col-span-1 ${col.span ?? 'sm:col-span-3'}`}>
              <span className="mb-1 block text-[10px] font-medium text-ink-400">{col.label}</span>
              {col.options ? (
                <select
                  className={inputClass}
                  value={String(item[col.key])}
                  onChange={(e) => update(i, col.key, e.target.value)}
                >
                  {col.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className={inputClass}
                  type={col.type === 'number' ? 'number' : 'text'}
                  value={String(item[col.key])}
                  onChange={(e) => update(i, col.key, e.target.value, col.type)}
                />
              )}
            </div>
          ))}
          <div className="col-span-2 flex items-end justify-end sm:col-span-1">
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={d.deleteRow}
              className="grid h-9 w-9 place-items-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-300 transition-colors hover:bg-rose-500/20"
            >
              <Icon name="X" className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-beige py-3 text-sm font-bold text-ink-700 transition-colors hover:border-brand-500/40 hover:text-brand-300"
      >
        <Icon name="Plus" className="h-4 w-4" />
        {addLabel}
      </button>
    </div>
  )
}
