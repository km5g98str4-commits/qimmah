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
          className="table-row grid grid-cols-2 gap-2 sm:grid-cols-12"
        >
          {columns.map((col) => (
            <div key={String(col.key)} className={`col-span-1 ${col.span ?? 'sm:col-span-3'}`}>
              <span className="mb-1.5 block text-[11px] font-bold text-ink-500">{col.label}</span>
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
              className="grid h-10 w-10 place-items-center rounded-xl border border-danger/30 bg-danger/10 text-danger transition-colors hover:bg-danger/15"
            >
              <Icon name="X" className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[0.875rem] border border-dashed border-line bg-surface py-3 text-sm font-bold text-ink-700 transition-colors hover:border-primary-soft hover:text-primary-c"
      >
        <Icon name="Plus" className="h-4 w-4" />
        {addLabel}
      </button>
    </div>
  )
}
