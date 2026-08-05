import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import {
  buildExportBundle,
  deliverBundle,
  parseImportFile,
  applyImport,
  hasUndo,
  undoImport,
  readFileText,
  PortabilityError,
  portabilityErrorText,
  type ImportPreview,
} from '@/lib/portability'

/**
 * لوحة «البيانات» المحصّنة لصفحة الإعدادات (#/settings) — قِمّة (PDPL R-1).
 *
 * تستبدل مستورد الإعدادات القديم (FileReader + JSON.parse مباشر) الذي كان يقبل
 * إصدارًا غير مدعوم وحقنًا من حساب آخر ويعرض «نجاحًا» دون أي تحقّق أو تطبيق ذرّي.
 *
 * كل عمليات الاستيراد/التصدير تمرّ حصريًّا عبر المسار المحصّن في src/lib/portability:
 *   readFileText → parseImportFile (حجم/JSON/تلويث النموذج/الإصدار/الشكل/متاجر معروفة)
 *   → معاينة → applyImport (لقطة تراجع + إعادة ترميز للمالك الحالي + تطبيق ذرّي + تحقّق
 *   بالمُحمِّلات الحقيقية) → لا تُعرَض رسالة نجاح إلا بعد اكتمال التطبيق فعليًّا.
 *
 * الاستيراد مرفوض أثناء جلسة استعادة كلمة المرور. لا شبكة، لا Supabase — كتابة محلّية فقط.
 */
export function DataManagementPanel({
  lang,
  uid,
  recoveryActive,
}: {
  lang: Lang
  uid: string | null
  recoveryActive: boolean
}) {
  const t = getStrings(lang)
  type Phase = 'idle' | 'preview' | 'done'
  const [phase, setPhase] = useState<Phase>('idle')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [undoable, setUndoable] = useState(() => hasUndo(uid))
  const fileRef = useRef<HTMLInputElement>(null)
  const importButtonRef = useRef<HTMLButtonElement>(null)
  const previewRef = useRef<HTMLElement>(null)
  const successRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (phase === 'preview' && preview) previewRef.current?.focus()
    if (phase === 'done') successRef.current?.focus()
  }, [phase, preview])

  const onExport = async () => {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const method = await deliverBundle(buildExportBundle(uid))
      if (method === 'unavailable') throw new PortabilityError(t.settings.exportFailed)
      setNote(method === 'download' ? t.settings.exportDownloaded : t.settings.exportShared)
    } catch {
      // لا نسرّب تفاصيل داخلية للمستخدم؛ رسالة عربية عامّة، ولا PII في أي مسار.
      setError(t.settings.exportFailed)
    } finally {
      setBusy(false)
    }
  }

  const onPickFile = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = '' // اسمح بإعادة اختيار نفس الملفّ
    if (!file) return
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      // كل التحقّق (حجم/JSON/تلويث/إصدار/شكل/مالك) داخل parseImportFile — لا نقرأ الحزمة قبله.
      const p = parseImportFile(await readFileText(file), uid)
      setPreview(p)
      setPhase('preview')
    } catch (e) {
      // خطأ النقل يحمل رسالة عربية آمنة تسمّي المتجر الفاشل؛ غيره → رسالة عامّة.
      setError(e instanceof PortabilityError ? portabilityErrorText(e, lang) : t.settings.importInvalidFile)
      setPhase('idle')
    } finally {
      setBusy(false)
    }
  }

  const onConfirm = () => {
    if (!preview) return
    if (recoveryActive) {
      setError(t.settings.importRecoveryBlocked)
      setPhase('idle')
      setPreview(null)
      return
    }
    setBusy(true)
    setError(null)
    try {
      // تطبيق ذرّي: أي فشل يرمي ويُرجِع الحالة تمامًا — فلا نصل لـ setPhase('done').
      applyImport(preview.bundle, uid, preview.ownerId)
      setUndoable(true)
      setPhase('done')
      setPreview(null)
    } catch (e) {
      setError(e instanceof PortabilityError ? portabilityErrorText(e, lang) : t.settings.importError)
      setPhase('idle')
      setPreview(null)
    } finally {
      setBusy(false)
    }
  }

  const onCancel = () => {
    setPreview(null)
    setPhase('idle')
    window.requestAnimationFrame(() => importButtonRef.current?.focus())
  }

  const onUndo = () => {
    if (undoImport(uid)) window.location.reload()
  }

  const numerals = (n: number) => (lang === 'ar' ? n.toLocaleString('ar-EG') : n.toLocaleString('en-US'))

  // — معاينة الاستيراد: عدّ لكل متجر + تأكيد صريح (لا تطبيق قبل الضغط) —
  if (phase === 'preview' && preview) {
    return (
      <section ref={previewRef} tabIndex={-1} aria-labelledby="settings-import-preview-title" data-testid="settings-import-preview" className="rounded-xl border border-line bg-surface p-4">
        <h3 id="settings-import-preview-title" className="text-sm font-black text-ink-900">{t.settings.importPreviewTitle}</h3>
        <p className="mt-1 text-xs leading-relaxed text-ink-500">{t.settings.importPreviewNote}</p>
        <ul className="mt-3 divide-y divide-line">
          {preview.lines
            .filter((l) => l.count > 0)
            .map((l) => (
              <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-bold text-ink-900">{l.labelAr}</span>
                <span className="font-black tabular-nums text-ink-500">{numerals(l.count)}</span>
              </li>
            ))}
        </ul>
        {preview.exportedAt && (
          <p className="mt-3 text-[11px] text-ink-400">
            {t.settings.importBackedUp}: {preview.exportedAt.slice(0, 16).replace('T', ' ')}
          </p>
        )}
        {recoveryActive && (
          <p className="mt-3 rounded-lg border border-line bg-beige/60 p-2.5 text-[11px] font-bold text-ink-700">
            {t.settings.importRecoveryBlocked}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="settings-import-confirm"
            onClick={onConfirm}
            disabled={busy || recoveryActive}
            className="btn-primary px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="CheckCircle2" className="h-4 w-4" />
            {t.settings.importConfirmBtn}
          </button>
          <button type="button" data-testid="settings-import-cancel" onClick={onCancel} className="btn-ghost px-4 py-2.5 text-sm">
            {t.settings.importCancel}
          </button>
        </div>
      </section>
    )
  }

  // — تمّ الاستيراد فعليًّا (بعد تطبيق ذرّي ناجح فقط) —
  if (phase === 'done') {
    return (
      <section ref={successRef} tabIndex={-1} aria-labelledby="settings-import-success-title" data-testid="settings-import-success" role="status" className="rounded-xl border border-line bg-surface p-4 text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-primary-c">
          <Icon name="CheckCircle2" className="h-5.5 w-5.5" />
        </span>
        <h3 id="settings-import-success-title" className="mt-2 text-sm font-black text-ink-900">{t.settings.importDoneTitle}</h3>
        <p className="mt-1 text-xs text-ink-500">{t.settings.importDoneNote}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => window.location.reload()} className="btn-primary px-4 py-2.5 text-sm">
            {t.settings.importViewData}
          </button>
          <button type="button" data-testid="settings-import-undo" onClick={onUndo} className="btn-ghost px-4 py-2.5 text-sm">
            <Icon name="RotateCcw" className="h-4 w-4" />
            {t.settings.importUndo}
          </button>
        </div>
      </section>
    )
  }

  // — الحالة الافتراضية: تصدير / استيراد + رسائل الحالة —
  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p data-testid="settings-import-error" role="alert" className="flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/[0.06] p-3 text-xs font-bold leading-relaxed text-danger">
          <Icon name="AlertTriangle" className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
      {note && (
        <p data-testid="settings-export-note" role="status" className="flex items-start gap-2 rounded-xl border border-line bg-surface p-3 text-xs font-bold leading-relaxed text-ink-800">
          <Icon name="CheckCircle2" className="mt-0.5 h-4 w-4 shrink-0 text-primary-c" />
          {note}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="settings-data-export"
          onClick={onExport}
          disabled={busy}
          className="btn-ghost px-4 py-2.5 text-sm disabled:opacity-60"
        >
          <Icon name="TrendingDown" className="h-4 w-4" />
          {t.settings.export}
        </button>
        <button
          ref={importButtonRef}
          type="button"
          data-testid="settings-data-import"
          onClick={() => fileRef.current?.click()}
          disabled={busy || recoveryActive}
          className="btn-ghost px-4 py-2.5 text-sm disabled:opacity-60"
        >
          <Icon name="TrendingUp" className="h-4 w-4" />
          {t.settings.import}
        </button>
        <input
          ref={fileRef}
          data-testid="settings-data-file"
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-hidden="true"
          onChange={(e) => onPickFile(e.target.files?.[0])}
        />
      </div>
      {undoable && (
        <button
          type="button"
          data-testid="settings-import-undo"
          onClick={onUndo}
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-line px-4 py-2 text-xs font-bold text-ink-700 transition-colors hover:bg-beige"
        >
          <Icon name="RotateCcw" className="h-4 w-4" />
          {t.settings.importUndoLast}
        </button>
      )}
      <p className="text-[11px] leading-relaxed text-ink-400">{t.settings.dataLocalNote}</p>
    </div>
  )
}
