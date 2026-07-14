import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { plateCopy } from '@/data/plateCopy'
import type { Lang } from '@/lib/appPreferences'
import { BAR_OPTIONS_KG, calculatePlateLoad, DEFAULT_PLATES_KG } from '@/lib/plates'

interface PlateCalculatorPanelProps {
  open: boolean
  lang: Lang
  initialTargetKg: number
  surface?: 'light' | 'dark'
  onClose: () => void
  onApply?: (weightKg: number) => void
}

export function PlateCalculatorPanel({ open, lang, initialTargetKg, surface = 'light', onClose, onApply }: PlateCalculatorPanelProps) {
  const copy = plateCopy(lang)
  const [target, setTarget] = useState(String(initialTargetKg || 20))
  const [barKg, setBarKg] = useState<number>(20)
  const [enabled, setEnabled] = useState<number[]>([...DEFAULT_PLATES_KG])
  const panelRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  const dark = surface === 'dark'

  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (open) setTarget(String(initialTargetKg || 20))
  }, [initialTargetKg, open])

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable.at(-1)!
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); previouslyFocused?.focus() }
  }, [open])

  const result = useMemo(() => calculatePlateLoad(Number(target), barKg, enabled), [barKg, enabled, target])
  if (!open) return null

  const togglePlate = (kg: number) => setEnabled((current) => current.includes(kg) ? current.filter((value) => value !== kg) : [...current, kg])
  const panelClass = dark ? 'v2-surface-dark bg-page text-ink-900' : 'v2-surface-light bg-page text-ink-900'

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-ink-900/65 px-0 pt-10 sm:items-center sm:px-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plate-calculator-title"
        className={`v2-screen-enter max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-line p-5 shadow-card sm:rounded-3xl ${panelClass}`}
      >
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="v2-text-blue"><Icon name="Calculator" className="h-5 w-5" /></span>
            <h2 id="plate-calculator-title" className="text-lg font-black">{copy.title}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={copy.close} className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink-700">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </header>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="rounded-2xl border border-line bg-surface p-3">
            <span className="text-xs font-bold text-ink-500">{copy.target} · {copy.kg}</span>
            <input
              value={target}
              onChange={(event) => setTarget(event.target.value.replace(/[^\d.]/g, '').slice(0, 6))}
              inputMode="decimal"
              aria-label={`${copy.target} · ${copy.kg}`}
              className="mt-1 w-full bg-transparent text-2xl font-black tabular-nums outline-none"
            />
          </label>
          <div className="rounded-2xl border border-line bg-surface p-3">
            <p className="text-xs font-bold text-ink-500">{copy.bar} · {copy.kg}</p>
            <div className="mt-2 flex gap-1" role="group" aria-label={copy.bar}>
              {BAR_OPTIONS_KG.map((kg) => (
                <button
                  key={kg}
                  type="button"
                  aria-pressed={barKg === kg}
                  onClick={() => setBarKg(kg)}
                  className={`v2-pressable flex-1 rounded-lg border px-1 py-2 text-sm font-black tabular-nums ${barKg === kg ? 'v2-bg-blue-soft v2-text-blue border-[color:var(--v2-blue)]' : 'border-line text-ink-500'}`}
                >{kg}</button>
              ))}
            </div>
          </div>
        </div>

        <fieldset className="mt-4">
          <legend className="text-sm font-black">{copy.available}</legend>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {DEFAULT_PLATES_KG.map((kg) => {
              const selected = enabled.includes(kg)
              return (
                <button
                  key={kg}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => togglePlate(kg)}
                  className={`v2-pressable rounded-xl border py-2.5 text-sm font-black tabular-nums ${selected ? 'v2-bg-blue-soft v2-text-blue border-[color:var(--v2-blue)]' : 'border-line bg-surface text-ink-400'}`}
                >{kg}</button>
              )
            })}
          </div>
        </fieldset>

        {result.status === 'error' ? (
          <p role="alert" className="v2-error-panel mt-4 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold">
            <Icon name="AlertCircle" className="v2-error-icon mt-0.5 h-4 w-4 shrink-0" />
            <span>{copy.errors[result.error]}</span>
          </p>
        ) : (
          <div className="mt-4 rounded-2xl border border-line bg-surface p-4" aria-live="polite">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-xs font-black ${result.exact ? 'v2-text-green' : 'v2-text-blue'}`}>{result.exact ? copy.exact : copy.nearest}</p>
                <p className="mt-1 text-2xl font-black tabular-nums">{result.loadedKg} <span className="text-sm text-ink-500">{copy.kg}</span></p>
              </div>
              {!result.exact && <p className="text-xs font-bold text-ink-500">{copy.remaining} · {result.differenceKg} {copy.kg}</p>}
            </div>

            <p className="mt-4 text-xs font-black text-ink-500">{copy.eachSide} · {result.perSideKg} {copy.kg}</p>
            {result.pairs.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2" aria-label={copy.eachSide}>
                {result.pairs.map((pair) => (
                  <li key={pair.kg} className="v2-bg-blue-soft v2-text-blue rounded-full border border-[color:var(--v2-blue)] px-3 py-1.5 text-sm font-black tabular-nums">
                    {pair.kg} × {pair.countPerSide}
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-ink-500">{copy.emptyBar}</p>}

            {onApply && (
              <button
                type="button"
                onClick={() => { onApply(result.loadedKg); onClose() }}
                className="v2-pressable v2-bg-blue mt-4 w-full rounded-xl py-3 text-sm font-black text-white"
              >{copy.apply}</button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
