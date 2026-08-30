// لوحة صكوك الشراء — [PREMIUM-UX-W2 · PART D/E]
//
// ═══ لماذا لوحة مستقلّة عن الأكواد الموقوتة ═══
// صكّ الشراء **يمنح Premium دائمًا** ولا مدّة له؛ والكود الموقوت وصولٌ مؤقّت.
// خلطهما في لوحة واحدة يوقع المؤسس في نفس اللبس الذي يمنعه التكليف: «ميّز
// Premium المشترى عن الوصول الموقوت». فلكلٍّ لوحته، ولكلٍّ عدّه.
//
// ═══ حدّها ═══
// **عرضٌ ومدخل، لا سلطة.** الإصدار والعدّ يمرّان بدوالّ المؤسس المحروسة على
// الخادم (`founder_issue_purchase_batch` · `founder_purchase_batches`)؛ الحدّ
// الأقصى (٥٠٠) يفرضه الخادم باسمه، والواجهة تمنع الرحلة الضائعة لا أكثر.
// النصوص الخام **تظهر مرّة واحدة** وتعيش في الحالة وحدها — لا تخزين، لا سجلّ،
// لا تحليلات. والتصدير فعلٌ محلّيّ (Blob) لا يمرّ بأي خادم.

import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { useLang } from '@/i18n'
import { adminStrings } from '@/i18n/dict/admin'
import type { IssuedPurchaseBatch, PurchaseBatchRow } from '../contract/types'
import type { LiveReadState } from '../contract/liveSource'
import type { PanelList } from './CodesPanel'

/** الحدّ الأقصى للدفعة — **يُقرأ من عقد الخادم لا يُخترع**. */
export const PURCHASE_BATCH_MAX = 500

export interface PurchaseBatchPanelProps {
  onIssue: (input: { reason: string; label: string; count: number; expiresAt: string | null }) => void
  issued: IssuedPurchaseBatch | null
  onDismiss: () => void
  batches: PanelList<PurchaseBatchRow>
  live: LiveReadState
  writeError: LiveReadState | null
  busy?: boolean
}

/** عدد — الغياب «—» لا صفرًا (عددٌ لم يصل ليس «صفر صكوك»). */
const num = (v: number | null): string => (v === null ? '—' : String(v))

/** تصدير محلّيّ: CSV بعمود واحد `code` — أصغر أثر صالح لمخزون سلة الرقميّ. */
function exportCsv(batch: IssuedPurchaseBatch) {
  // لا أسرار غير الأكواد نفسها، ولا بصمات ولا معرّفات داخلية ولا بيانات مستخدم.
  const lines = ['code', ...batch.codes]
  const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeLabel = (batch.label || 'batch').replace(/[^A-Za-z0-9._-]/g, '_')
  a.download = `qimmah-purchase-${safeLabel}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function PurchaseBatchPanel({ onIssue, issued, onDismiss, batches, live, writeError, busy }: PurchaseBatchPanelProps) {
  const lang = useLang()
  const t = adminStrings[lang]
  const p = t.purchase

  const [reason, setReason] = useState('')
  const [label, setLabel] = useState('')
  const [count, setCount] = useState(10)

  const trimmedLabel = label.trim()
  const clampedCount = Math.max(1, Math.min(PURCHASE_BATCH_MAX, Math.trunc(count) || 1))
  // الوسم إلزامي (الخادم يرفض دفعة بلا وسم)، والسبب إلزامي كذلك.
  const canIssue = trimmedLabel.length > 0 && reason.trim().length > 0 && !busy

  return (
    <div className="flex flex-col gap-4" data-purchase-panel="true">
      {/* ——— ما هي صكوك الشراء ——— */}
      <section className="card p-4 text-start sm:p-5">
        <div className="flex items-center gap-2">
          <Icon name="Sparkles" className="h-5 w-5 text-primary-c" />
          <h2 className="text-base font-extrabold text-ink-900">{p.heading}</h2>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-ink-500">{p.note}</p>
        {live !== 'live' ? (
          <p data-purchase-live-state={live} className="mt-2 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/[0.07] p-3 text-xs leading-relaxed text-ink-700">
            <Icon name="Info" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            {t.live[live]}
          </p>
        ) : null}
      </section>

      {/* ——— إصدار دفعة ——— */}
      <section className="card p-4 text-start sm:p-5">
        <h3 className="text-sm font-black text-ink-900">{p.issueHeading}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-ink-700">
            {p.labelLabel}
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={p.labelPlaceholder}
              data-testid="purchase-label" autoComplete="off"
              className="mt-1 min-h-11 w-full rounded-xl border border-line bg-page px-3 py-2 text-sm font-bold text-ink-900 outline-none focus:border-primary-c" />
          </label>
          <label className="text-xs font-bold text-ink-700">
            {p.countLabel}
            <input type="number" min={1} max={PURCHASE_BATCH_MAX} value={count}
              onChange={(e) => setCount(Number(e.target.value))} data-testid="purchase-count"
              className="mt-1 min-h-11 w-full rounded-xl border border-line bg-page px-3 py-2 text-sm font-bold text-ink-900 outline-none focus:border-primary-c" />
            <span className="mt-1 block text-[11px] font-normal text-ink-400">{p.countHint(PURCHASE_BATCH_MAX)}</span>
          </label>
        </div>
        <label className="mt-3 block text-xs font-bold text-ink-700">
          {p.reasonLabel}
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={p.reasonPlaceholder}
            data-testid="purchase-reason" autoComplete="off"
            className="mt-1 min-h-11 w-full rounded-xl border border-line bg-page px-3 py-2 text-sm font-bold text-ink-900 outline-none focus:border-primary-c" />
        </label>
        <button type="button" disabled={!canIssue} data-testid="purchase-issue"
          onClick={() => onIssue({ reason: reason.trim(), label: trimmedLabel, count: clampedCount, expiresAt: null })}
          className="btn-primary mt-4 min-h-[44px] w-full justify-center text-sm disabled:cursor-not-allowed disabled:opacity-40">
          {busy ? p.issuing : p.issueButton}
        </button>
        {writeError ? (
          <p role="status" data-testid="purchase-write-error" className="mt-2 text-xs font-bold text-danger">{t.live[writeError] ?? p.writeFailed}</p>
        ) : null}
      </section>

      {/* ——— الدفعة الصادرة: ظهور واحد معلَن + تصدير ——— */}
      {issued ? (
        <section className="card border-success/40 p-4 text-start sm:p-5" data-testid="purchase-issued">
          <div className="flex items-center gap-2">
            <Icon name="CheckCircle2" className="h-5 w-5 text-success" />
            <h3 className="text-sm font-black text-ink-900">{p.issuedHeading}</h3>
          </div>
          <p className="mt-1 text-xs font-bold text-ink-700">
            {issued.label} · {issued.count} {p.rows}
          </p>
          {/* ⚠️ التحذير الأبرز: لا استعادة بعد الآن. */}
          <p className="mt-2 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/[0.06] p-3 text-xs font-black leading-relaxed text-ink-900"
            data-testid="purchase-cannot-recover">
            <Icon name="AlertTriangle" className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            {p.cannotRecover}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => exportCsv(issued)} data-testid="purchase-export"
              className="btn-primary min-h-[44px] flex-1 justify-center gap-2 text-sm">
              <Icon name="Download" className="h-4 w-4" />
              {p.exportCsv}
            </button>
            <button type="button" onClick={onDismiss} data-testid="purchase-dismiss"
              className="btn-ghost min-h-[44px] flex-1 text-sm">
              {p.dismiss}
            </button>
          </div>
          {/* النصوص الخام — تُعرض للنسخ اليدوي كذلك، بلا زرّ نسخ يدّعي فعلًا. */}
          <ul dir="ltr" data-testid="purchase-codes" className="mt-3 max-h-60 space-y-1 overflow-y-auto rounded-xl border border-line bg-page p-3 font-mono text-xs text-ink-800">
            {issued.codes.map((c) => (
              <li key={c} className="select-all">{c}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ——— مخزون الدفعات: عدٌّ صادق ——— */}
      <section className="card p-4 text-start sm:p-5">
        <h3 className="text-sm font-black text-ink-900">{p.inventoryHeading}</h3>
        {/* ⚠️ «غير مستردّ» **لا** يعني «متبقٍ في سلة»: بلا webhook لا نعلم أين الصكّ. */}
        <p className="mt-1 text-[11px] leading-relaxed text-ink-400">{p.inventoryNote}</p>
        {batches.kind === 'loading' ? (
          <p className="mt-3 text-xs text-ink-400">{t.states.loading}</p>
        ) : batches.kind === 'gap' ? (
          <p data-testid="purchase-inventory-gap" className="mt-3 text-xs text-ink-500">{t.live[batches.why] ?? p.inventoryUnavailable}</p>
        ) : batches.rows.length === 0 ? (
          <p data-testid="purchase-inventory-empty" className="mt-3 text-xs text-ink-500">{p.inventoryEmpty}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-start text-xs">
              <thead>
                <tr className="border-b border-line text-ink-500">
                  <th className="py-2 pe-3 text-start font-bold">{p.colLabel}</th>
                  <th className="py-2 pe-3 text-start font-bold">{p.colIssued}</th>
                  <th className="py-2 pe-3 text-start font-bold">{p.colRedeemed}</th>
                  <th className="py-2 pe-3 text-start font-bold">{p.colUnredeemed}</th>
                  <th className="py-2 pe-3 text-start font-bold">{p.colDisabled}</th>
                  <th className="py-2 pe-3 text-start font-bold">{p.colExpired}</th>
                </tr>
              </thead>
              <tbody data-testid="purchase-inventory-rows">
                {batches.rows.map((b, i) => (
                  <tr key={`${b.label ?? '—'}-${i}`} className="border-b border-line/60">
                    <td className="py-2 pe-3 font-black text-ink-900">{b.label ?? p.noLabel}</td>
                    <td className="py-2 pe-3">{num(b.codesIssued)}</td>
                    <td className="py-2 pe-3">{num(b.codesRedeemed)}</td>
                    <td className="py-2 pe-3 font-bold text-ink-900">{num(b.codesUnredeemed)}</td>
                    <td className="py-2 pe-3">{num(b.codesDisabledUnredeemed)}</td>
                    <td className="py-2 pe-3">{num(b.codesExpiredUnredeemed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* مِفتاح الإطفاء: تعطيل صكٍّ **مفرد** غير مستردّ يمرّ من صفحة الأكواد
            (تعرض صكوك الشراء كذلك بعد إصلاح `duration_days=null`). التعطيل الدفعيّ
            ليس في نموذج السلطة — يُرفَع ولا يُخترَع. */}
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-line bg-beige p-3 text-[11px] leading-relaxed text-ink-500">
          <Icon name="ShieldCheck" className="mt-0.5 h-4 w-4 shrink-0" />
          {p.killSwitchNote}
        </p>
      </section>
    </div>
  )
}
