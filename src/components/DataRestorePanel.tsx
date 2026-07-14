import { useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { dataRestoreCopy } from '@/data/dataRestoreCopy'
import type { Lang } from '@/lib/appPreferences'
import {
  applyPreparedDataImport,
  DataImportError,
  MAX_DATA_EXPORT_BYTES,
  prepareQimmahDataImport,
  type PreparedDataImport,
} from '@/lib/dataPortability'

interface DataRestorePanelProps {
  lang: Lang
  ownerId: string | null
  email?: string | null
  recoveryActive: boolean
  compact?: boolean
}

type RestoreState = 'idle' | 'reading' | 'preview' | 'applying' | 'success' | 'error'

export function DataRestorePanel({ lang, ownerId, email, recoveryActive, compact = false }: DataRestorePanelProps) {
  const copy = dataRestoreCopy(lang)
  const fileRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<RestoreState>('idle')
  const [prepared, setPrepared] = useState<PreparedDataImport | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const chooseFile = async (file: File) => {
    setError(null)
    setPrepared(null)
    setConfirmed(false)
    if (file.size > MAX_DATA_EXPORT_BYTES) {
      setError(copy.errors['too-large'])
      setState('error')
      return
    }
    setState('reading')
    try {
      const text = await file.text()
      const next = prepareQimmahDataImport(text, { ownerId, email, recoveryActive })
      setPrepared(next)
      setState('preview')
    } catch (reason) {
      const code = reason instanceof DataImportError ? reason.code : 'invalid-data'
      setError(copy.errors[code])
      setState('error')
    }
  }

  const apply = () => {
    if (!prepared || !confirmed || state === 'applying') return
    setState('applying')
    setError(null)
    try {
      applyPreparedDataImport(prepared, { ownerId, email, recoveryActive })
      setState('success')
    } catch (reason) {
      const code = reason instanceof DataImportError ? reason.code : 'apply-failed'
      setError(copy.errors[code])
      setState('error')
    }
  }

  const reset = () => {
    setPrepared(null)
    setConfirmed(false)
    setError(null)
    setState('idle')
  }

  return (
    <section className={compact ? '' : 'rounded-3xl border border-line bg-surface p-5'} aria-labelledby="data-restore-title">
      <div className="flex items-start gap-3">
        <span className="v2-bg-blue-soft v2-text-blue grid h-9 w-9 shrink-0 place-items-center rounded-xl"><Icon name="RefreshCw" className="h-4.5 w-4.5" /></span>
        <div className="min-w-0 flex-1">
          <h2 id="data-restore-title" className="text-sm font-black">{copy.title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-500">{copy.description}</p>
        </div>
      </div>

      {state === 'success' ? (
        <div className="mt-4">
          <p role="status" className="flex items-start gap-2 rounded-xl border border-[color:var(--v2-green)] px-3 py-2.5 text-sm font-bold">
            <Icon name="CheckCircle2" className="v2-text-green mt-0.5 h-4 w-4 shrink-0" /><span>{copy.success}</span>
          </p>
          <button type="button" onClick={() => window.location.reload()} className="v2-pressable v2-bg-blue mt-3 w-full rounded-xl py-3 text-sm font-black text-white">{copy.reload}</button>
        </div>
      ) : (
        <>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={state === 'reading' || state === 'applying'} aria-busy={state === 'reading'} className="v2-pressable mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-page py-3 text-sm font-black disabled:opacity-60">
            <Icon name="FileText" className="h-4 w-4" />{state === 'reading' ? copy.reading : copy.choose}
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" aria-label={copy.choose} className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void chooseFile(file); event.target.value = '' }} />
        </>
      )}

      {(state === 'preview' || state === 'applying') && prepared && (
        <div className="mt-4 rounded-2xl border border-line bg-page p-4">
          <h3 className="text-sm font-black">{copy.previewTitle}</h3>
          <p className="mt-1 text-xs text-ink-500">{copy.exportedAt}: <time dateTime={prepared.preview.exportedAt}>{new Intl.DateTimeFormat(lang === 'en' ? 'en' : 'ar-SA', { dateStyle: 'medium' }).format(new Date(prepared.preview.exportedAt))}</time></p>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label={copy.previewTitle}>
            {copy.previewSummary(prepared.preview).map((item) => <li key={item} className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-bold tabular-nums">{item}</li>)}
          </ul>
          <label className="mt-4 flex items-start gap-2 text-xs font-bold leading-relaxed">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[color:var(--v2-blue)]" />
            <span>{copy.confirmation}</span>
          </label>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={reset} disabled={state === 'applying'} className="v2-pressable rounded-xl border border-line bg-surface py-3 text-sm font-black disabled:opacity-60">{copy.cancel}</button>
            <button type="button" onClick={apply} disabled={!confirmed || state === 'applying'} aria-busy={state === 'applying'} className="v2-pressable v2-bg-blue rounded-xl py-3 text-sm font-black text-white disabled:opacity-40">{state === 'applying' ? copy.applying : copy.apply}</button>
          </div>
        </div>
      )}

      {state === 'error' && error && (
        <p role="alert" className="v2-error-panel mt-4 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold">
          <Icon name="AlertCircle" className="v2-error-icon mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
        </p>
      )}
      <p className="mt-3 text-xs leading-relaxed text-ink-500">{copy.safety}</p>
    </section>
  )
}
