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
import type { IssuedPurchaseBatch, PurchaseBatchRow, SallaInventoryRow, CodeLookupRow } from '../contract/types'
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
  /** [SALLA-PROD-001] قناة سلة: المخزون المسجَّل، تسجيل التصدير، بحث الدعم. */
  sallaInventory: PanelList<SallaInventoryRow>
  onMarkExported: (input: { label: string; count: number; digest: string; note: string | null }) => void
  markBusy: boolean
  markResult: { label: string; expectedCount: number } | null
  onDismissMarkResult: () => void
  markError: LiveReadState | null
  onLookupCode: (code: string) => void
  lookupBusy: boolean
  lookupResult: PanelList<CodeLookupRow> | null
}

export const SALLA_LABEL_SHAPE = /^SALLA-(TEST|LAUNCH|SUPPORT)-[0-9]{3}$/
const DIGEST_SHAPE = /^[0-9a-f]{64}$/i

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
  sallaInventory, onMarkExported, markBusy, markResult, onDismissMarkResult, markError, onLookupCode, lookupBusy, lookupResult,
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
  const [markLabel, setMarkLabel] = useState('')
  const [markCount, setMarkCount] = useState('')
  const [markDigest, setMarkDigest] = useState('')
  const [markNote, setMarkNote] = useState('')
  const [markLocalError, setMarkLocalError] = useState<string | null>(null)
  const [lookup, setLookup] = useState('')
  const lowStock = sallaInventory.kind === 'rows' ? sallaInventory.rows.filter((r) => r.lowStock && r.label) : []
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
                  <th scope="col" className="px-3 py-2 text-start font-black">{t.colChannel}</th>
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
                    <td dir="ltr" className="px-3 py-2 text-ink-700" data-testid="purchase-batch-channel">{b.exportedChannel ? `${b.exportedChannel} · ${when(b.exportedAt)}` : t.notExported}</td>
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

      {/* ── [SALLA-PROD-001] قناة سلة: إنذار النفاد · تسجيل التصدير · المخزون · بحث الدعم ── */}
      <div className="rounded-2xl border border-line bg-surface p-4" data-testid="salla-channel">
        <h3 className="text-sm font-black text-ink-900">{t.sallaHeading}</h3>
        <p className="mt-1 text-[0.75rem] leading-relaxed text-ink-500">{t.sallaNote}</p>
        {lowStock.length > 0 ? (
          <p role="alert" data-testid="salla-low-stock" className="mt-3 rounded-xl border border-warning/60 bg-warning/[0.08] px-3 py-2 text-[0.8rem] font-bold text-ink-900">
            {t.lowStockBanner(lowStock.map((r) => r.label).join(' · '))}
          </p>
        ) : null}
        <p className="mt-1 text-[0.7rem] text-ink-400">{t.lowStockHint}</p>

        <h4 className="mt-4 text-[0.8rem] font-black text-ink-900">{t.inventoryTitle}</h4>
        {sallaInventory.kind === 'loading' ? (
          <p className="mt-2 text-sm text-ink-500">{t.loading}</p>
        ) : sallaInventory.kind === 'gap' ? (
          <p className="mt-2 text-sm font-bold text-danger" data-testid="salla-inventory-gap">{t.gap(sallaInventory.why)}</p>
        ) : sallaInventory.rows.length === 0 ? (
          <p className="mt-2 text-sm text-ink-500" data-testid="salla-inventory-empty">{t.inventoryEmpty}</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-start text-xs" data-testid="salla-inventory-table">
              <thead className="text-ink-500">
                <tr className="border-b border-line">
                  <th scope="col" className="px-3 py-2 text-start font-black">{t.colLabel}</th>
                  <th scope="col" className="px-3 py-2 text-start font-black">{t.colExpected}</th>
                  <th scope="col" className="px-3 py-2 text-start font-black">{t.colIssued}</th>
                  <th scope="col" className="px-3 py-2 text-start font-black">{t.colRedeemed}</th>
                  <th scope="col" className="px-3 py-2 text-start font-black">{t.colDisabled}</th>
                  <th scope="col" className="px-3 py-2 text-start font-black">{t.colStock}</th>
                  <th scope="col" className="px-3 py-2 text-start font-black">{t.colMatch}</th>
                </tr>
              </thead>
              <tbody>
                {sallaInventory.rows.map((r) => (
                  <tr key={r.label ?? '—'} className={`border-b border-line/60 ${r.lowStock ? 'bg-warning/[0.06]' : ''}`} data-low-stock={r.lowStock ? 'true' : 'false'}>
                    <td dir="ltr" className="px-3 py-2 font-bold text-ink-900">{r.label ?? '—'}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-700">{num(r.expectedCount)}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-700">{num(r.codesIssued)}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-700">{num(r.codesRedeemed)}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-700">{num(r.codesDisabledUnredeemed)}</td>
                    <td className="px-3 py-2 tabular-nums font-bold text-ink-900">{num(r.codesUnredeemed)}</td>
                    <td className="px-3 py-2 text-ink-700">{r.countMatches ? '✓' : <span className="font-bold text-danger">{t.countMismatch}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {canIssue ? (
          <div className="mt-4 rounded-xl border border-line bg-page p-3" data-testid="salla-mark-exported">
            <h4 className="text-[0.8rem] font-black text-ink-900">{t.markHeading}</h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="block text-[0.72rem] font-bold text-ink-700">{t.markLabelLabel}
                <input dir="ltr" data-testid="salla-mark-label" value={markLabel} onChange={(e) => { setMarkLabel(e.target.value.toUpperCase()); setMarkLocalError(null) }} autoComplete="off" className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2 text-base font-bold text-ink-900 outline-none focus:border-primary-c" />
              </label>
              <label className="block text-[0.72rem] font-bold text-ink-700">{t.markCountLabel}
                <input dir="ltr" inputMode="numeric" data-testid="salla-mark-count" value={markCount} onChange={(e) => { setMarkCount(e.target.value); setMarkLocalError(null) }} className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2 text-base font-bold text-ink-900 outline-none focus:border-primary-c" />
              </label>
              <label className="block text-[0.72rem] font-bold text-ink-700 sm:col-span-2">{t.markDigestLabel}
                <input dir="ltr" data-testid="salla-mark-digest" value={markDigest} onChange={(e) => { setMarkDigest(e.target.value.trim().toLowerCase()); setMarkLocalError(null) }} autoComplete="off" spellCheck={false} className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2 font-mono text-base text-ink-900 outline-none focus:border-primary-c" />
                <span className="mt-1 block text-[0.68rem] font-normal text-ink-400">{t.markDigestHint}</span>
              </label>
              <label className="block text-[0.72rem] font-bold text-ink-700 sm:col-span-2">{t.markNoteLabel}
                <input data-testid="salla-mark-note" value={markNote} onChange={(e) => setMarkNote(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2 text-base text-ink-900 outline-none focus:border-primary-c" />
              </label>
            </div>
            <button
              type="button" disabled={markBusy} aria-busy={markBusy} data-testid="salla-mark-submit"
              onClick={() => {
                const count = Number(markCount)
                if (!SALLA_LABEL_SHAPE.test(markLabel.trim()) || !Number.isInteger(count) || count < 1 || !DIGEST_SHAPE.test(markDigest)) { setMarkLocalError(t.markInvalid); return }
                onMarkExported({ label: markLabel.trim(), count, digest: markDigest, note: markNote.trim() || null })
              }}
              className="btn-primary mt-3 min-h-[44px] px-4 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              {markBusy ? t.markWorking : t.markButton}
            </button>
            <p role="status" aria-live="polite" data-testid="salla-mark-message" className={`text-xs font-bold ${markLocalError || markError ? 'mt-2.5 text-danger' : markResult ? 'mt-2.5 text-ink-900' : ''}`}>
              {markLocalError ?? (markError ? t.markFailed(markError) : markResult ? t.markDone(markResult.label, markResult.expectedCount) : '')}
            </p>
            {markResult ? <button type="button" onClick={onDismissMarkResult} className="btn-ghost mt-1 min-h-[36px] px-3 text-xs">{t.dismiss}</button> : null}
          </div>
        ) : null}

        <div className="mt-4 rounded-xl border border-line bg-page p-3" data-testid="salla-lookup">
          <h4 className="text-[0.8rem] font-black text-ink-900">{t.lookupHeading}</h4>
          <p className="mt-1 text-[0.7rem] text-ink-500">{t.lookupNote}</p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="block min-w-0 flex-1 text-[0.72rem] font-bold text-ink-700">{t.lookupLabel}
              <input dir="ltr" data-testid="salla-lookup-input" value={lookup} onChange={(e) => setLookup(e.target.value)} autoComplete="off" spellCheck={false} className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2 font-mono text-base text-ink-900 outline-none focus:border-primary-c" />
            </label>
            <button type="button" disabled={lookupBusy || !lookup.trim()} aria-busy={lookupBusy} data-testid="salla-lookup-submit" onClick={() => onLookupCode(lookup)} className="btn-ghost min-h-[44px] px-4 text-sm disabled:opacity-40">{t.lookupButton}</button>
          </div>
          {lookupResult ? (
            <p role="status" aria-live="polite" data-testid="salla-lookup-result" className="mt-2 text-[0.8rem] font-bold text-ink-900">
              {lookupResult.kind === 'gap' ? t.gap(lookupResult.why)
                : lookupResult.kind === 'loading' ? t.loading
                : lookupResult.rows[0]?.status === 'malformed' ? t.lookupMalformed
                : !lookupResult.rows[0]?.found ? t.lookupNotFound
                : `${t.lookupStatus(lookupResult.rows[0].status)} · ${lookupResult.rows[0].label ?? '—'}${lookupResult.rows[0].exportedChannel ? ` · ${lookupResult.rows[0].exportedChannel}` : ''}${lookupResult.rows[0].lastRedeemedAt ? ` · ${when(lookupResult.rows[0].lastRedeemedAt)}` : ''}${lookupResult.rows[0].disabledReason ? ` · ${lookupResult.rows[0].disabledReason}` : ''}`}
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4">
        <h3 className="text-sm font-black text-ink-900">{t.killHeading}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-500">{t.killNote}</p>
      </div>
    </section>
  )
}
