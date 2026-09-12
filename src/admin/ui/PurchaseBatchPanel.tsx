/**
 * لوحة صكوك الشراء — **إصدار دفعة، ظهورٌ واحد، ومخزون صادق**.
 * [WAVE2-PURCHASE-OPS] · حارة لوحة المؤسس.
 *
 * ═══ حدّ هذه اللوحة ═══
 * لا تملك سلطة. `founder_issue_purchase_batch` هي التي تولّد وتحدّ وتتحقّق من
 * الدور؛ وهذه الشاشة **تنادي وتعرض**. الحدّ الأقصى (٥٠٠) مقروء من الخادم ولا
 * يُخترع أعلى منه هنا، وتجاوزه يُردّ بـ`batch_count_out_of_range` مهما فعلت
 * الواجهة.
 *
 * ═══ لماذا النصّ الخام لا يُخزَّن — ولا حتى للحظة ═══
 * الجدول يحفظ `sha256(normalize(code) || pepper)` لا نصًّا. فالنصوص الخام تعيش
 * في **حالة React وحدها** (ذاكرة اللحظة)، ولا تُكتب في:
 *   localStorage · sessionStorage · IndexedDB · console · تحليلات · تقارير خطأ.
 * والتنزيل يبني Blob في الذاكرة ويُبطل عنوانه فور الاستعمال. وحرسُ ذلك دائم في
 * `test:purchase-ops-ui` — لا اعتمادًا على انضباط الكاتب.
 *
 * ═══ الصدق المفروض على العدّ ═══
 * «غير مستردّ» تُعرض ومعها معناها **في الشاشة**: ما استُهلك عندنا. ولا تُسمّى
 * «متبقٍ في سلة» — بلا webhook لا نملك دليلًا على مكان الصكّ، وادّعاء المكان
 * أسوأ من الصمت عنه.
 */

import { useId, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { purchaseBatchStrings } from '@/i18n/dict/purchaseBatches'
import { useLang } from '@/i18n'
import type { LiveReadState } from '../contract/liveSource'
import type { IssuedPurchaseBatch, PurchaseBatchRow } from '../contract/types'
import type { PanelList } from './CodesPanel'

/**
 * الحدّ الخادميّ، مُعادًا هنا **كمرآة لا كمصدر**.
 * `20260829120001_purchase_credentials.sql`: `if n < 1 or n > 500 then raise`.
 * فلو تغيّر الخادم وبقي هذا، فالردّ يبقى هو الحاكم والواجهة تعرض رفضه.
 */
export const PURCHASE_BATCH_MAX = 500

export interface PurchaseBatchPanelProps {
  canIssue: boolean
  busy: boolean
  onIssue: (input: { reason: string; label: string; count: number; expiresAt: string | null }) => void
  /** الدفعة الصادرة للتوّ — تبقى حتى يصرفها المؤسس بنفسه، لا بمؤقّت. */
  issued: IssuedPurchaseBatch | null
  onDismissIssued: () => void
  batches: PanelList<PurchaseBatchRow>
  writeError: LiveReadState | null
  /**
   * [WAVE3] إطفاء غير المستردّ في دفعة — **الاتجاه الوحيد المتاح**: يسحب ولا
   * يمنح. التنفيذ في الحاوي (نداء `disablePurchaseBatch`)، وهنا التأكيد والسبب.
   */
  onDisableBatch: (input: { label: string; reason: string }) => void
  disableBusy: boolean
  /** آخر نتيجة إطفاء — تُعرض بعددها الحرفي، ويصرفها المؤسس بنفسه. */
  disableResult: { label: string; disabledCount: number } | null
  onDismissDisableResult: () => void
  disableError: LiveReadState | null
}

/** عدد أو «—». **الغياب لا يصير صفرًا** (نفس عقد `metricValue`). */
function num(n: number | null): string {
  return n === null ? '—' : String(n)
}

function when(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 16).replace('T', ' ')
}

/** اسم ملف آمن من وسم يكتبه المؤسس — لا مسارات ولا محارف تكسر الحفظ. */
function safeFileName(label: string): string {
  const cleaned = label.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
  return cleaned === '' ? 'purchase-codes' : cleaned
}

export function PurchaseBatchPanel({
  canIssue, busy, onIssue, issued, onDismissIssued, batches, writeError,
  onDisableBatch, disableBusy, disableResult, onDismissDisableResult, disableError,
}: PurchaseBatchPanelProps) {
  const lang = useLang()
  const t = purchaseBatchStrings[lang === 'en' ? 'en' : 'ar']
  const uid = useId()

  const [label, setLabel] = useState('')
  const [reason, setReason] = useState('')
  const [count, setCount] = useState('1')
  const [expiresAt, setExpiresAt] = useState('')
  const [error, setError] = useState<string | null>(null)
  // [WAVE3] تأكيد الإطفاء — وسم الدفعة المفتوح للتأكيد وسببه. حالة عرضٍ محلّية
  // بحتة: القرار والسلطة في الخادم، وحتى النداء يمرّ بالحاوي لا من هنا.
  const [confirmLabel, setConfirmLabel] = useState<string | null>(null)
  const [disableReason, setDisableReason] = useState('')
  const [disableLocalError, setDisableLocalError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const objectUrlRef = useRef<string | null>(null)

  const submit = () => {
    if (busy) return
    const trimmedLabel = label.trim()
    const trimmedReason = reason.trim()
    const n = Number(count)
    if (trimmedLabel === '') { setError(t.labelRequired); return }
    if (trimmedReason === '') { setError(t.reasonRequired); return }
    if (!Number.isInteger(n) || n < 1 || n > PURCHASE_BATCH_MAX) { setError(t.countOutOfRange(PURCHASE_BATCH_MAX)); return }
    setError(null)
    onIssue({ reason: trimmedReason, label: trimmedLabel, count: n, expiresAt: expiresAt === '' ? null : new Date(expiresAt).toISOString() })
  }

  /**
   * التنزيل — **بلا أثر باقٍ**. الـBlob في الذاكرة، وعنوانه يُبطَل فورًا بعد
   * النقر: فلا يبقى مرجع حيّ لنصّ خام في الصفحة.
   *
   * والحمولة **أقلّ ما يكفي للتشغيل**: عمود الصكّ وحده. لا بصمات، ولا معرّفات
   * داخلية، ولا استحقاقات، ولا بيانات مستخدم — التصدير يذهب إلى قناة بيع.
   */
  const download = (kind: 'csv' | 'txt') => {
    if (!issued) return
    const body = kind === 'csv'
      ? ['code', ...issued.codes].join('\r\n')
      : issued.codes.join('\n')
    const blob = new Blob([body], { type: kind === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    objectUrlRef.current = url
    const a = document.createElement('a')
    a.href = url
    a.download = `${safeFileName(issued.label)}.${kind}`
    a.click()
    URL.revokeObjectURL(url)
    objectUrlRef.current = null
  }

  const copyAll = () => {
    if (!issued) return
    void navigator.clipboard?.writeText(issued.codes.join('\n')).then(
      () => setCopied(true),
      // الفشل لا يُبتلع ولا يُدّعى نجاحًا: الحافظة قد تُمنع بالإذن.
      () => setCopied(false),
    )
  }

  return (
    <section className="space-y-4" data-testid="purchase-batch-panel">
      <div>
        <h2 className="text-base font-black text-ink-900">{t.heading}</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-500">{t.note}</p>
      </div>

      {/* ── الظهور الواحد ── */}
      {issued ? (
        <div className="rounded-2xl border-2 border-warning/50 bg-warning/[0.06] p-4" data-testid="purchase-issued">
          <h3 className="text-sm font-black text-ink-900" data-testid="purchase-issued-heading">
            {t.issuedHeading(issued.count, issued.label)}
          </h3>
          <p className="mt-2 text-[0.8rem] font-bold leading-relaxed text-ink-700" data-testid="purchase-issued-warning">
            {t.issuedWarning}
          </p>

          <ol
            dir="ltr"
            data-testid="purchase-issued-codes"
            className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-line bg-page p-3 font-mono text-xs leading-relaxed text-ink-900"
          >
            {issued.codes.map((c) => <li key={c}>{c}</li>)}
          </ol>

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={copyAll} data-testid="purchase-copy-all" className="btn-ghost min-h-[44px] px-4 text-sm">
              <Icon name="ClipboardList" className="h-4 w-4" />
              {copied ? t.copied : t.copyAll}
            </button>
            <button type="button" onClick={() => download('csv')} data-testid="purchase-download-csv" className="btn-ghost min-h-[44px] px-4 text-sm">
              <Icon name="Download" className="h-4 w-4" />
              {t.downloadCsv}
            </button>
            <button type="button" onClick={() => download('txt')} data-testid="purchase-download-txt" className="btn-ghost min-h-[44px] px-4 text-sm">
              <Icon name="Download" className="h-4 w-4" />
              {t.downloadTxt}
            </button>
            <button
              type="button"
              // تأكيد قبل الإغلاق: الإغلاق فعلٌ لا رجعة فيه هنا بالمعنى الحرفي.
              onClick={() => { if (window.confirm(t.dismissConfirm)) { setCopied(false); onDismissIssued() } }}
              data-testid="purchase-dismiss-issued"
              className="btn-ghost min-h-[44px] px-4 text-sm text-danger"
            >
              {t.dismiss}
            </button>
          </div>
        </div>
      ) : null}

      {/* ── الإصدار ── */}
      {canIssue ? (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <h3 className="text-sm font-black text-ink-900">{t.issueHeading}</h3>
          <p className="mt-1 text-[0.75rem] font-bold text-ink-400" data-testid="purchase-server-limit">{t.serverLimitNote}</p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`${uid}-label`} className="block text-[0.78rem] font-bold text-ink-700">{t.labelLabel}</label>
              <input
                id={`${uid}-label`} data-testid="purchase-label-input" value={label}
                onChange={(e) => { setLabel(e.target.value); setError(null) }}
                placeholder={t.labelPlaceholder} dir="ltr" autoComplete="off"
                className="mt-1.5 min-h-11 w-full rounded-xl border border-line bg-page px-3 py-2.5 text-base font-bold text-ink-900 outline-none focus:border-primary-c"
              />
            </div>
            <div>
              <label htmlFor={`${uid}-count`} className="block text-[0.78rem] font-bold text-ink-700">{t.countLabel}</label>
              <input
                id={`${uid}-count`} data-testid="purchase-count-input" value={count}
                onChange={(e) => { setCount(e.target.value); setError(null) }}
                type="number" min={1} max={PURCHASE_BATCH_MAX} inputMode="numeric" dir="ltr"
                className="mt-1.5 min-h-11 w-full rounded-xl border border-line bg-page px-3 py-2.5 text-base font-bold text-ink-900 outline-none focus:border-primary-c"
              />
              <p className="mt-1 text-[0.7rem] font-bold text-ink-400">{t.countHint(PURCHASE_BATCH_MAX)}</p>
            </div>
            <div>
              <label htmlFor={`${uid}-reason`} className="block text-[0.78rem] font-bold text-ink-700">{t.reasonLabel}</label>
              <input
                id={`${uid}-reason`} data-testid="purchase-reason-input" value={reason}
                onChange={(e) => { setReason(e.target.value); setError(null) }}
                placeholder={t.reasonPlaceholder} autoComplete="off"
                className="mt-1.5 min-h-11 w-full rounded-xl border border-line bg-page px-3 py-2.5 text-base font-bold text-ink-900 outline-none focus:border-primary-c"
              />
            </div>
            <div>
              <label htmlFor={`${uid}-expires`} className="block text-[0.78rem] font-bold text-ink-700">{t.expiresLabel}</label>
              <input
                id={`${uid}-expires`} data-testid="purchase-expires-input" value={expiresAt}
                onChange={(e) => { setExpiresAt(e.target.value); setError(null) }}
                type="datetime-local" dir="ltr"
                className="mt-1.5 min-h-11 w-full rounded-xl border border-line bg-page px-3 py-2.5 text-base font-bold text-ink-900 outline-none focus:border-primary-c"
              />
              <p className="mt-1 text-[0.7rem] leading-relaxed text-ink-400">{t.expiresHint}</p>
            </div>
          </div>

          <button
            type="button" onClick={submit} disabled={busy} aria-busy={busy}
            data-testid="purchase-issue-submit"
            className="btn-primary mt-3 min-h-[48px] w-full justify-center text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? t.issuing : t.issueButton}
          </button>

          <p role="status" aria-live="polite" data-testid="purchase-issue-error" className={`text-xs font-bold text-danger ${error || writeError ? 'mt-2.5' : ''}`}>
            {error ?? (writeError ? t.gap(writeError) : '')}
          </p>
        </div>
      ) : null}

      {/* ── المخزون ── */}
      <div className="rounded-2xl border border-line bg-surface p-4">
        <h3 className="text-sm font-black text-ink-900">{t.inventoryHeading}</h3>
        <p className="mt-1 text-[0.75rem] leading-relaxed text-ink-500" data-testid="purchase-unredeemed-meaning">
          {t.unredeemedMeaning}
        </p>

        {batches.kind === 'loading' ? (
          <p className="mt-3 text-sm text-ink-500">{t.loading}</p>
        ) : batches.kind === 'gap' ? (
          <p className="mt-3 text-sm font-bold text-danger" data-testid="purchase-inventory-gap">{t.gap(batches.why)}</p>
        ) : batches.rows.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500" data-testid="purchase-inventory-empty">{t.empty}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[46rem] text-start text-xs" data-testid="purchase-inventory-table">
              <thead className="text-ink-500">
                <tr className="border-b border-line">
                  <th scope="col" className="px-3 py-2 text-start font-black">{t.colLabel}</th>
                  <th scope="col" className="px-3 py-2 text-start font-black">{t.colIssued}</th>
                  <th scope="col" className="px-3 py-2 text-start font-black">{t.colRedeemed}</th>
                  <th scope="col" className="px-3 py-2 text-start font-black">{t.colUnredeemed}</th>
                  <th scope="col" className="px-3 py-2 text-start font-black">{t.colDisabled}</th>
                  <th scope="col" className="px-3 py-2 text-start font-black">{t.colExpired}</th>
                  <th scope="col" className="px-3 py-2 text-start font-black">{t.colLastIssued}</th>
                  <th scope="col" className="px-3 py-2 text-start font-black">{t.colLastRedeemed}</th>
                  <th scope="col" className="px-3 py-2"><span className="sr-only">{t.batchDisableCta}</span></th>
                </tr>
              </thead>
              <tbody>
                {batches.rows.map((b) => (
                  <tr key={b.label ?? '—'} className="border-b border-line/60">
                    <td dir="ltr" className="px-3 py-2 font-bold text-ink-900">{b.label ?? '—'}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-700">{num(b.codesIssued)}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-700">{num(b.codesRedeemed)}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-700">{num(b.codesUnredeemed)}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-700">{num(b.codesDisabledUnredeemed)}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-700">{num(b.codesExpiredUnredeemed)}</td>
                    <td dir="ltr" className="px-3 py-2 tabular-nums text-ink-500">{when(b.lastIssuedAt)}</td>
                    <td dir="ltr" className="px-3 py-2 tabular-nums text-ink-500">{when(b.lastRedeemedAt)}</td>
                    <td className="px-3 py-2">
                      {canIssue && b.label ? (
                        <button
                          type="button"
                          onClick={() => { setConfirmLabel(b.label); setDisableReason(''); setDisableLocalError(null); onDismissDisableResult() }}
                          data-testid="purchase-batch-disable-open"
                          data-batch-label={b.label}
                          className="btn-ghost min-h-[36px] whitespace-nowrap px-3 text-xs text-danger"
                        >
                          {t.batchDisableCta}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── [WAVE3] تأكيد إطفاء الدفعة — فعل هدّام بسبب إلزامي ──
          الاتجاه الوحيد من المتصفّح: إطفاء. لا زرّ تمكينٍ دفعيّ هنا ولا في
          العقد ولا في القاعدة — تمكينُ دفعةٍ مخترقة أداةُ منحٍ جماعي. */}
      {confirmLabel ? (
        <div className="rounded-2xl border-2 border-danger/50 bg-danger/[0.05] p-4" data-testid="purchase-batch-disable-confirm">
          <h3 className="text-sm font-black text-ink-900">{t.batchDisableTitle(confirmLabel)}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{t.batchDisableBody}</p>
          <p className="mt-1.5 text-[0.8rem] font-bold leading-relaxed text-ink-700" data-testid="purchase-batch-disable-not-revoked">
            {t.batchDisableNotRevoked}
          </p>
          <label htmlFor="batch-disable-reason" className="mt-3 block text-[0.78rem] font-bold text-ink-700">
            {t.batchDisableReasonLabel}
          </label>
          <input
            id="batch-disable-reason"
            data-testid="purchase-batch-disable-reason"
            value={disableReason}
            onChange={(e) => { setDisableReason(e.target.value); setDisableLocalError(null) }}
            placeholder={t.batchDisableReasonPlaceholder}
            autoComplete="off"
            className="mt-1.5 min-h-11 w-full rounded-xl border border-line bg-page px-3 py-2.5 text-base font-bold text-ink-900 outline-none focus:border-danger"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disableBusy}
              aria-busy={disableBusy}
              onClick={() => {
                const reason = disableReason.trim()
                if (reason === '') { setDisableLocalError(t.batchDisableReasonRequired); return }
                onDisableBatch({ label: confirmLabel, reason })
              }}
              data-testid="purchase-batch-disable-confirm-btn"
              className="btn-primary min-h-[44px] bg-danger px-4 text-sm hover:bg-danger disabled:cursor-not-allowed disabled:opacity-40"
            >
              {disableBusy ? t.batchDisableWorking : t.batchDisableConfirm}
            </button>
            <button
              type="button"
              onClick={() => { setConfirmLabel(null); setDisableLocalError(null) }}
              data-testid="purchase-batch-disable-cancel"
              className="btn-ghost min-h-[44px] px-4 text-sm"
            >
              {t.batchDisableCancel}
            </button>
          </div>
          <p role="status" aria-live="polite" data-testid="purchase-batch-disable-error"
             className={`text-xs font-bold text-danger ${disableLocalError || disableError ? 'mt-2.5' : ''}`}>
            {disableLocalError ?? (disableError ? t.batchDisableFailed(disableError) : '')}
          </p>
        </div>
      ) : null}

      {/* النتيجة — العدد الحرفي من الخادم، ومعه الحقيقة التي لا تُترك للاستنتاج. */}
      {disableResult ? (
        <div className="rounded-2xl border border-line bg-surface p-4" data-testid="purchase-batch-disable-result" role="status">
          <p className="text-sm font-bold leading-relaxed text-ink-900">
            {t.batchDisableDone(disableResult.disabledCount, disableResult.label)}
          </p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-line bg-surface p-4">
        <h3 className="text-sm font-black text-ink-900">{t.killHeading}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-500">{t.killNote}</p>
      </div>
    </section>
  )
}
