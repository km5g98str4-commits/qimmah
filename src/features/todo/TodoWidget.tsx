import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import { useAuth } from '@/lib/authContext'
import type { Lang } from '@/lib/appPreferences'
import { useTodos } from './useTodos'
import { todoStrings } from './strings'
import type { TodoItem } from './store'

// كم عنصرًا يظهر في الوضع المضغوط (الافتراضي) قبل «عرض الكل».
const COMPACT_COUNT = 2

/**
 * ودجة «مهام اليوم» — قائمة مهام يومية خفيفة على الرئيسية.
 * مضغوطة بالافتراض (عدّاد + أول عنصرين)، تتوسّع لعرض الكل.
 * الإضافة السريعة زرّ بارز أسفل البطاقة (سهل الوصول بالإبهام على الجوال).
 */
export function TodoWidget({ lang }: { lang: Lang }) {
  const auth = useAuth()
  const ownerId = auth.user?.id ?? null
  const { items, remaining, add, toggle, remove } = useTodos(ownerId)
  const s = todoStrings[lang]

  const [expanded, setExpanded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  const hasOverflow = items.length > COMPACT_COUNT
  const visible = expanded ? items : items.slice(0, COMPACT_COUNT)

  const submit = () => {
    const t = draft.trim()
    if (!t) {
      setAdding(false)
      return
    }
    add(t)
    setDraft('')
    // نُبقي حقل الإدخال مفتوحًا لإضافة متتالية بلا احتكاك.
    inputRef.current?.focus()
  }

  return (
    <section className="card p-4" aria-label={s.title}>
      {/* رأس: عنوان + عدّاد المتبقّي + زرّ الطيّ/العرض */}
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow bg-primary-soft text-primary-c">
          <Icon name="ListChecks" className="h-3.5 w-3.5" />
          {s.title}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink-500">
            {items.length === 0
              ? ''
              : remaining === 0
                ? s.allDone
                : `${remaining} ${s.remainingSuffix}`}
          </span>
          {hasOverflow && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="grid h-11 w-11 place-items-center rounded-lg text-ink-500 transition-colors hover:text-primary-c"
              aria-expanded={expanded}
              aria-label={expanded ? s.collapse : s.expand}
            >
              <Icon name={expanded ? 'ChevronUp' : 'ChevronDown'} className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* القائمة */}
      {items.length === 0 && !adding ? (
        <p className="mt-3 text-sm leading-relaxed text-ink-500">{s.empty}</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {visible.map((it) => (
            <TodoRow key={it.id} item={it} lang={lang} onToggle={() => toggle(it.id)} onDelete={() => remove(it.id)} />
          ))}
        </ul>
      )}

      {/* عدد مخفي في الوضع المضغوط */}
      {!expanded && hasOverflow && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 text-xs font-bold text-primary-c transition-opacity hover:opacity-80"
        >
          +{items.length - COMPACT_COUNT} · {s.expand}
        </button>
      )}

      {/* الإضافة السريعة — بارزة أسفل البطاقة، ودّية للإبهام */}
      <div className="mt-3">
        {adding ? (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
                if (e.key === 'Escape') {
                  setDraft('')
                  setAdding(false)
                }
              }}
              onBlur={() => {
                if (!draft.trim()) setAdding(false)
              }}
              placeholder={s.inputPlaceholder}
              aria-label={s.fieldAria}
              className="min-h-[44px] flex-1 rounded-xl border border-line bg-page px-3 text-base text-ink-900 outline-none transition-colors focus:border-primary-soft"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={submit}
              className="btn-primary min-w-[44px] px-3 py-3"
              aria-label={s.saveAria}
            >
              <Icon name="Plus" className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="btn-primary w-full justify-center py-3 text-sm"
            aria-label={s.addAria}
          >
            <Icon name="Plus" className="h-4 w-4" />
            {s.addCta}
          </button>
        )}
      </div>
    </section>
  )
}

/** صفّ مهمة — تبديل بعلامة صح مُرضية + حذف، ووسم «من الأمس» للمُرحّلة. */
function TodoRow({
  item,
  lang,
  onToggle,
  onDelete,
}: {
  item: TodoItem
  lang: Lang
  onToggle: () => void
  onDelete: () => void
}) {
  const s = todoStrings[lang]
  return (
    <li className="group flex items-center gap-2.5 rounded-xl px-1 py-1">
      <button
        type="button"
        onClick={onToggle}
        aria-label={s.toggleAria}
        aria-pressed={item.done}
        className={cn(
          'grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-all duration-200 active:scale-90',
          item.done
            ? 'border-primary bg-primary text-white shadow-glow'
            : 'border-line text-transparent hover:border-primary-soft',
        )}
      >
        <Icon name="Check" className={cn('h-4 w-4 transition-transform duration-200', item.done ? 'scale-100' : 'scale-0')} strokeWidth={3} />
      </button>

      <div className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-sm transition-colors',
            item.done ? 'text-ink-400 line-through' : 'text-ink-900',
          )}
        >
          {item.text}
        </span>
        {item.rolledOver && !item.done && (
          <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-gold-300">
            <Icon name="Sunrise" className="h-3 w-3" />
            {s.fromYesterday}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onDelete}
        aria-label={s.deleteAria}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-400 opacity-60 transition-all hover:text-danger hover:opacity-100"
      >
        <Icon name="Trash2" className="h-4 w-4" />
      </button>
    </li>
  )
}
