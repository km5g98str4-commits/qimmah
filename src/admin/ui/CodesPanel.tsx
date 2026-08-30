/**
 * لوحة أكواد الوصول — **إصدار وقائمة وتعطيل**، بلا وعد بما ليس هنا.
 * [ADMIN-R4] · حارة لوحة المؤسس.
 *
 * ═══ الخطّ الفاصل الذي ترسمه هذه الشاشة ═══
 * ما يظهر هنا يفعل شيئًا واحدًا من اثنين: **يسحب وصولًا**، أو **يمنح وصولًا
 * موقوتًا قابلًا للسحب**. ولا يوجد زرّ «امنح Premium»: سكّ منحة دائمة يبقى فعل
 * مفتاح خادم، وكذلك رفع الحظر. وسبب الغياب **مكتوب في الشاشة** لا مدفونًا في
 * تعليق — الزرّ الغائب بلا تفسير يُقرأ «ميزة ناقصة»، والمكتوب يُقرأ «قرار».
 *
 * ═══ ولماذا الكود يظهر مرّة واحدة ═══
 * الجدول يحفظ بصمة مملّحة لا نصًّا. فالنصّ الخام يعيش في هذه الشاشة وحدها
 * وللحظة واحدة، ويُقال ذلك صراحةً بدل أن يكتشفه المؤسس بعد أن يغلقها.
 *
 * ═══ [ADMIN-CONV] وما زاد في هذه الموجة ═══
 * ثلاثة أسئلة كانت بلا جواب من الشاشة:
 *   «من استخدم هذا الكود؟» ⇐ سجلّ مستبدلين يُفتح لكل كود (كان الغلاف مكتوبًا
 *   بلا مستدعٍ واحد). · «كيف أشغّل حملة؟» ⇐ إصدار دفعيّ: وسم واحد فوق أكواد
 *   فردية مولَّدة (حكم المؤسس في `20260824120005`). · «ما حال حملاتي؟» ⇐
 *   عرض مجمّع بالوسم. وكلّها بنفس عقد الغياب: الفشل يُسمّى ولا يصير قائمة
 *   فارغة تبدو جوابًا.
 */

import { Fragment, useState } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import { adminStrings } from '@/i18n/dict/admin'
import { useLang } from '@/i18n'
import type { LiveReadState } from '../contract/liveSource'
import type {
  AdminCodePage,
  CodeBatchRow,
  CodeRedemptionRow,
  IssuedCode,
  IssuedCodeBatch,
  MetricValue,
} from '../contract/types'

/** قائمة لوحة: تحميل، أو صفوف، أو غياب **مسمّى بسببه** — لا حالة رابعة صامتة. */
export type PanelList<T> =
  | { readonly kind: 'loading' }
  | { readonly kind: 'rows'; readonly rows: readonly T[] }
  | { readonly kind: 'gap'; readonly why: LiveReadState }

export interface CodesPanelProps {
  page: MetricValue<AdminCodePage>
  live: LiveReadState
  search: string
  onSearch: (s: string) => void
  onIssue: (input: { reason: string; label?: string; durationDays: number; maxRedemptions: number }) => void
  onToggle: (codeId: string, enabled: boolean, reason: string) => void
  /** الكود الصادر للتوّ — يُعرض حتى يصرفه المؤسس بنفسه، لا بمؤقّت. */
  issued: IssuedCode | null
  onDismissIssued: () => void
  /** فشل آخر فعل كتابة — **مسمّى**، فلا زرّ يُضغط ولا يُعرف ما جرى. */
  writeError: LiveReadState | null
  busy?: boolean
  /** [ADMIN-CONV] الإصدار الدفعيّ — النصوص الخام تظهر مرّة واحدة ولا تُخزَّن. */
  onIssueBatch: (input: {
    reason: string
    label?: string
    durationDays: number
    maxRedemptions: number
    expiresAt: string | null
    count: number
  }) => void
  issuedBatch: IssuedCodeBatch | null
  onDismissIssuedBatch: () => void
  /** [ADMIN-CONV] الحملات مجمّعة بالوسم. */
  batches: PanelList<CodeBatchRow>
  /** [ADMIN-CONV] سجلّ مستبدلي الكود المفتوح — كودٌ واحد مفتوح في كل لحظة. */
  redemptions: { readonly codeId: string; readonly list: PanelList<CodeRedemptionRow> } | null
  onToggleRedemptions: (codeId: string) => void
}

/** حبّة حالة — المعنى بالنصّ لا باللون وحده (الميثاق §9). */
function StatusChip({ status }: { status: string }) {
  const lang = useLang()
  const t = adminStrings[lang]
  const tone =
    status === 'issued'
      ? 'border-success/40 bg-success/[0.08] text-ink-700'
      : status === 'disabled'
        ? 'border-danger/40 bg-danger/[0.07] text-ink-700'
        : 'border-line bg-beige text-ink-600'
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold', tone)}>
      {t.codeStatus[status] ?? status}
    </span>
  )
}

/** عدد حملة — **الغياب «—» لا صفرًا**: عددٌ لم يصل ليس «صفر أكواد». */
const batchNum = (v: number | null): string => (v === null ? '—' : String(v))

export function CodesPanel({
  page,
  live,
  search,
  onSearch,
  onIssue,
  onToggle,
  issued,
  onDismissIssued,
  writeError,
  busy,
  onIssueBatch,
  issuedBatch,
  onDismissIssuedBatch,
  batches,
  redemptions,
  onToggleRedemptions,
}: CodesPanelProps) {
  const lang = useLang()
  const t = adminStrings[lang]

  const [reason, setReason] = useState('')
  const [label, setLabel] = useState('')
  const [days, setDays] = useState(14)
  const [maxUses, setMaxUses] = useState(1)
  // [ADMIN-CONV] حقول الدفعة — الوسم مستقلّ عن وسم الإصدار المفرد عمدًا:
  // الحملة اسمها ثابت، والمفرد قد يكون لعميل واحد بلا حملة.
  const [batchCount, setBatchCount] = useState(10)
  const [batchLabel, setBatchLabel] = useState('')
  const [batchDays, setBatchDays] = useState(14)
  const [batchExpiry, setBatchExpiry] = useState('')

  // السبب إلزامي في القاعدة أيضًا — والواجهة تمنع الرحلة الضائعة لا أكثر.
  const canIssue = reason.trim().length > 0 && !busy

  return (
    <div className="flex flex-col gap-4">
      {/* ——— لماذا لا يوجد زرّ منح دائم ——— */}
      <section className="card p-4 text-start sm:p-5" data-codes-panel="true">
        <div className="flex items-center gap-2">
          <Icon name="KeyRound" className="h-5 w-5 text-ink-500" />
          <h2 className="text-base font-extrabold text-ink-900">{t.codes.heading}</h2>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-ink-500">{t.codes.note}</p>
        <p className="mt-2 flex items-start gap-2 rounded-xl border border-line bg-beige p-3 text-[11px] leading-relaxed text-ink-500">
          <Icon name="ShieldCheck" className="mt-0.5 h-4 w-4 shrink-0" />
          {t.codes.grantNote}
        </p>
        {live !== 'live' ? (
          <p
            data-codes-live-state={live}
            className="mt-2 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/[0.07] p-3 text-xs leading-relaxed text-ink-700"
          >
            <Icon name="Info" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            {t.live[live]}
          </p>
        ) : null}
      </section>

      {/* ——— الكود الصادر: ظهور واحد معلَن ——— */}
      {issued ? (
        <section className="card border-success/40 p-4 text-start sm:p-5" data-issued-code="true">
          <div className="flex items-center gap-2">
            <Icon name="CheckCircle2" className="h-5 w-5 text-success" />
            <h3 className="text-sm font-extrabold text-ink-900">{t.codes.issuedHeading}</h3>
          </div>
          <p className="mt-2 select-all break-all rounded-xl border border-line bg-beige p-3 font-mono text-lg font-extrabold tracking-widest text-ink-900">
            {issued.code}
          </p>
          <p className="mt-2 text-xs font-bold text-warning">{t.codes.issuedOnce}</p>
          <p className="mt-1 text-[11px] text-ink-500">
            {issued.label ?? t.codes.noLabel} · {issued.durationDays} {t.codes.days} · {t.codes.colUses}:{' '}
            {issued.maxRedemptions}
          </p>
          <button type="button" className="btn-ghost tap-target mt-3" onClick={onDismissIssued}>
            <span className="text-xs">{t.codes.dismiss}</span>
          </button>
        </section>
      ) : null}

      {/* ——— [ADMIN-CONV] الدفعة الصادرة: الظهور الوحيد لنصوصها الخام ——— */}
      {issuedBatch ? (
        <section className="card border-success/40 p-4 text-start sm:p-5" data-issued-batch="true">
          <div className="flex items-center gap-2">
            <Icon name="CheckCircle2" className="h-5 w-5 text-success" />
            <h3 className="text-sm font-extrabold text-ink-900">{t.codes.batchIssuedHeading}</h3>
          </div>
          <p className="mt-1 text-[11px] text-ink-500">
            {issuedBatch.label ?? t.codes.noLabel} · {issuedBatch.count} {t.codes.rows} · {issuedBatch.durationDays}{' '}
            {t.codes.days}
          </p>
          {/* قائمة واحدة قابلة للتحديد كاملة — النسخ فعل المؤسس، لا زرّ يدّعيه. */}
          <ul className="mt-2 select-all rounded-xl border border-line bg-beige p-3 font-mono text-sm font-extrabold tracking-widest text-ink-900">
            {issuedBatch.codes.map((c) => (
              <li key={c} className="break-all py-0.5" data-batch-code={c}>
                {c}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs font-bold text-warning">{t.codes.batchIssuedOnce}</p>
          <button type="button" className="btn-ghost tap-target mt-3" onClick={onDismissIssuedBatch}>
            <span className="text-xs">{t.codes.dismiss}</span>
          </button>
        </section>
      ) : null}

      {writeError ? (
        <p
          data-code-write-error={writeError}
          className="flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/[0.07] p-3 text-xs leading-relaxed text-ink-700"
        >
          <Icon name="AlertCircle" className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <span>
            {t.codes.writeFailed} {t.live[writeError]}
          </span>
        </p>
      ) : null}

      {/* ——— الإصدار ——— */}
      <section className="card p-4 text-start sm:p-5">
        <h3 className="text-sm font-extrabold text-ink-900">{t.codes.issueHeading}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="code-reason" className="mb-1 block text-xs font-bold text-ink-500">
              {t.codes.reasonLabel}
            </label>
            <input
              id="code-reason"
              className="input"
              value={reason}
              placeholder={t.codes.reasonPlaceholder}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="code-label" className="mb-1 block text-xs font-bold text-ink-500">
              {t.codes.labelLabel}
            </label>
            <input
              id="code-label"
              className="input"
              value={label}
              placeholder={t.codes.labelPlaceholder}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="code-days" className="mb-1 block text-xs font-bold text-ink-500">
              {t.codes.durationLabel}
            </label>
            <input
              id="code-days"
              className="input tabular-nums"
              type="number"
              min={1}
              max={3650}
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.trunc(Number(e.target.value))))}
            />
          </div>
          <div>
            <label htmlFor="code-max" className="mb-1 block text-xs font-bold text-ink-500">
              {t.codes.maxLabel}
            </label>
            <input
              id="code-max"
              className="input tabular-nums"
              type="number"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(Math.max(1, Math.trunc(Number(e.target.value))))}
            />
          </div>
          {/*
            [STAGING-COMMISSIONING §8] **حقل «كود بخطّ يدك» نُزع.**
            الخادم يرفضه الآن (`code_must_be_generated`)، وحقلٌ يبقى على الشاشة
            بينما الخادم يردّه ليس تشدّدًا بل فخّ: يُملأ ثم يُرفض. والأسوأ أن
            نصّه المشحون كان **يُرشد** إلى ما مُنع: «خلّه فاضي إلا إذا كانت
            حملة باسم معروف». والحملة اسمها في حقل «الحملة» أعلاه — لا في السرّ.
          */}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-primary tap-target"
            disabled={!canIssue}
            onClick={() =>
              onIssue({
                reason: reason.trim(),
                label: label.trim() === '' ? undefined : label.trim(),
                durationDays: days,
                maxRedemptions: maxUses,
              })
            }
          >
            <span className="text-sm">{busy ? t.codes.issuing : t.codes.issueButton}</span>
          </button>
          {reason.trim() === '' ? <span className="text-[11px] text-ink-500">{t.codes.needReason}</span> : null}
        </div>
      </section>

      {/* ——— [ADMIN-CONV] الإصدار الدفعيّ: حملة = وسم فوق أكواد فردية ——— */}
      <section className="card p-4 text-start sm:p-5" data-batch-issue="true">
        <h3 className="text-sm font-extrabold text-ink-900">{t.codes.batchHeading}</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-500">{t.codes.batchNote}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="batch-count" className="mb-1 block text-xs font-bold text-ink-500">
              {t.codes.batchCountLabel}
            </label>
            <input
              id="batch-count"
              className="input tabular-nums"
              type="number"
              min={1}
              max={500}
              value={batchCount}
              // السقف ٥٠٠ سقف الخادم نفسه (`batch_count_out_of_range`) — القصّ
              // هنا يمنع رحلة ضائعة، والخادم يبقى السلطة.
              onChange={(e) => setBatchCount(Math.min(500, Math.max(1, Math.trunc(Number(e.target.value)))))}
            />
          </div>
          <div>
            <label htmlFor="batch-label" className="mb-1 block text-xs font-bold text-ink-500">
              {t.codes.labelLabel}
            </label>
            <input
              id="batch-label"
              className="input"
              value={batchLabel}
              placeholder={t.codes.labelPlaceholder}
              onChange={(e) => setBatchLabel(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="batch-days" className="mb-1 block text-xs font-bold text-ink-500">
              {t.codes.durationLabel}
            </label>
            <input
              id="batch-days"
              className="input tabular-nums"
              type="number"
              min={1}
              max={3650}
              value={batchDays}
              onChange={(e) => setBatchDays(Math.max(1, Math.trunc(Number(e.target.value))))}
            />
          </div>
          <div>
            <label htmlFor="batch-expiry" className="mb-1 block text-xs font-bold text-ink-500">
              {t.codes.batchExpiryLabel}
            </label>
            <input
              id="batch-expiry"
              className="input tabular-nums"
              type="date"
              value={batchExpiry}
              onChange={(e) => setBatchExpiry(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-primary tap-target"
            disabled={!canIssue}
            onClick={() =>
              onIssueBatch({
                reason: reason.trim(),
                label: batchLabel.trim() === '' ? undefined : batchLabel.trim(),
                durationDays: batchDays,
                maxRedemptions: 1,
                // نهاية اليوم المختار بتوقيت UTC — تاريخ بلا ساعة يعني «حتى آخره».
                expiresAt: batchExpiry === '' ? null : `${batchExpiry}T23:59:59.999Z`,
                count: batchCount,
              })
            }
          >
            <span className="text-sm">{busy ? t.codes.batchIssuing : t.codes.batchIssueButton}</span>
          </button>
          {reason.trim() === '' ? <span className="text-[11px] text-ink-500">{t.codes.needReason}</span> : null}
        </div>
      </section>

      {/* ——— [ADMIN-CONV] الحملات مجمّعة بالوسم ——— */}
      <section className="card p-4 text-start sm:p-5" data-code-batches="true">
        <h3 className="text-sm font-extrabold text-ink-900">{t.codes.batchesHeading}</h3>
        {batches.kind === 'loading' ? (
          <p className="mt-3 text-xs text-ink-500">…</p>
        ) : batches.kind === 'gap' ? (
          // الغياب مسمّى بسببه — «الهجرة ما انطبقت» تتدهور بأدب لا إلى جدول فارغ.
          <p
            data-code-batches-state={batches.why}
            className="mt-3 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/[0.07] p-3 text-xs leading-relaxed text-ink-700"
          >
            <Icon name="Info" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>
              {t.codes.batchesUnavailable} {t.live[batches.why]}
            </span>
          </p>
        ) : batches.rows.length === 0 ? (
          <p className="mt-3 text-xs text-ink-500">{t.codes.batchesEmpty}</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[560px] border-collapse text-start text-sm">
              <thead className="bg-beige">
                <tr className="text-start text-xs font-bold text-ink-500">
                  <th scope="col" className="px-3 py-2 text-start">
                    {t.codes.colLabel}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start">
                    {t.codes.colBatchIssued}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start">
                    {t.codes.colBatchRedeemed}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start">
                    {t.codes.colBatchRemaining}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start">
                    {t.codes.colBatchDisabled}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start">
                    {t.codes.colBatchLast}
                  </th>
                </tr>
              </thead>
              <tbody>
                {batches.rows.map((b) => (
                  <tr key={b.label ?? '∅'} className="border-t border-line" data-code-batch={b.label ?? ''}>
                    <td className="px-3 py-2 font-bold text-ink-900">{b.label ?? t.codes.noLabel}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-700">{batchNum(b.codesIssued)}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-700">{batchNum(b.codesRedeemed)}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-700">{batchNum(b.codesRemaining)}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-700">{batchNum(b.codesDisabled)}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-500">
                      {b.lastIssuedAt ? b.lastIssuedAt.slice(0, 10) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ——— القائمة ——— */}
      <section className="card p-4 text-start sm:p-5" aria-labelledby="admin-codes-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="admin-codes-heading" className="text-sm font-extrabold text-ink-900">
            {t.codes.searchLabel}
          </h3>
          {page.state === 'ready' ? (
            <span className="text-xs tabular-nums text-ink-500">
              {page.value.total} {t.codes.rows}
            </span>
          ) : null}
        </div>
        <input
          id="admin-code-search"
          type="search"
          className="input mt-2"
          aria-label={t.codes.searchLabel}
          placeholder={t.codes.searchPlaceholder}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />

        {page.state !== 'ready' ? (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-dashed border-line p-4">
            <Icon name="CircleSlash" className="mt-0.5 h-5 w-5 shrink-0 text-ink-400" />
            <div>
              <p className="text-sm font-bold text-ink-500">{t.states.unavailable}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-400">{t.live[live]}</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 overflow-auto rounded-xl border border-line">
            <table className="w-full min-w-[760px] border-collapse text-start text-sm">
              <thead className="bg-beige">
                <tr className="text-start text-xs font-bold text-ink-500">
                  <th scope="col" className="px-3 py-2 text-start">
                    {t.codes.colLabel}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start">
                    {t.codes.colStatus}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start">
                    {t.codes.colUses}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start">
                    {t.codes.colDuration}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start">
                    {t.codes.colReason}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start">
                    {t.codes.colCreatedAt}
                  </th>
                  <th scope="col" className="px-3 py-2 text-end">
                    <span className="sr-only">{t.codes.disable}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {page.value.rows.map((r) => (
                  <Fragment key={r.codeId}>
                    <tr className="border-t border-line" data-code-row={r.codeId}>
                      <td className="px-3 py-2">
                        <span className="font-bold text-ink-900">{r.label ?? t.codes.noLabel}</span>
                        <span className="block text-[11px] text-ink-400">{r.createdBy}</span>
                        {/*
                          [COMMISSIONING §5] قوّة الكود — **سطرٌ لا عمود**: التصميم
                          مجمَّد ولا يُوسَّع الجدول. والغياب يُقال بنصّه ولا يُعرض
                          صفرًا: كودٌ صدر قبل القياس «ما تُقاس قوّته»، لا «صفر بت».
                        */}
                        <span className="block text-[11px] text-ink-400" data-code-strength={r.codeId}>
                          {r.entropyCeilingBits === null
                            ? t.codes.strengthUnknown
                            : (r.generatedServerSide ? t.codes.strengthGenerated : t.codes.strengthManual)
                                .replace('{bits}', String(r.entropyCeilingBits))}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <StatusChip status={r.status} />
                      </td>
                      <td className="px-3 py-2 tabular-nums text-ink-500">
                        {r.redemptionCount} / {r.maxRedemptions}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-ink-500">
                        {r.durationDays === null ? t.codes.durationPermanent : `${r.durationDays} ${t.codes.days}`}
                      </td>
                      <td className="px-3 py-2 text-ink-500">{r.createdReason}</td>
                      <td className="px-3 py-2 tabular-nums text-ink-500">{r.createdAt.slice(0, 10)}</td>
                      <td className="px-3 py-2 text-end">
                        {/* [ADMIN-CONV] «من استخدمه؟» — قراءة، فلا تحتاج سببًا. */}
                        <button
                          type="button"
                          className="tap-target inline-flex items-center gap-1 rounded-lg px-2 text-xs font-bold text-ink-700"
                          data-code-redemptions-toggle={r.codeId}
                          onClick={() => onToggleRedemptions(r.codeId)}
                        >
                          {redemptions?.codeId === r.codeId ? t.codes.redemptionsHide : t.codes.redemptionsShow}
                        </button>
                        <button
                          type="button"
                          className="tap-target inline-flex items-center gap-1 rounded-lg px-2 text-xs font-bold text-primary-c"
                          disabled={busy || reason.trim() === ''}
                          // السبب المكتوب في نموذج الإصدار هو سبب هذا الفعل أيضًا:
                          // فعل إداري بلا سبب أثرٌ مجهول، والقاعدة ترفضه أصلًا.
                          title={reason.trim() === '' ? t.codes.needReason : undefined}
                          onClick={() => onToggle(r.codeId, r.status === 'disabled', reason.trim())}
                        >
                          {r.status === 'disabled' ? t.codes.enable : t.codes.disable}
                        </button>
                      </td>
                    </tr>
                    {/* ——— [ADMIN-CONV] سجلّ المستبدلين — يُفتح تحت صفّ الكود ——— */}
                    {redemptions?.codeId === r.codeId ? (
                      <tr className="border-t border-dashed border-line bg-beige/50">
                        <td colSpan={7} className="px-3 py-2" data-code-redemptions={r.codeId}>
                          {redemptions.list.kind === 'loading' ? (
                            <p className="text-xs text-ink-500">…</p>
                          ) : redemptions.list.kind === 'gap' ? (
                            // فشلٌ مسمّى — لا قائمة فارغة تُقرأ «ما استخدمه أحد».
                            <p
                              data-code-redemptions-state={redemptions.list.why}
                              className="flex items-start gap-2 text-xs leading-relaxed text-ink-700"
                            >
                              <Icon name="Info" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                              <span>
                                {t.codes.redemptionsUnavailable} {t.live[redemptions.list.why]}
                              </span>
                            </p>
                          ) : redemptions.list.rows.length === 0 ? (
                            <p className="text-xs text-ink-500">{t.codes.redemptionsEmpty}</p>
                          ) : (
                            <table className="w-full text-start text-xs">
                              <thead>
                                <tr className="text-ink-500">
                                  <th scope="col" className="py-1 pe-3 text-start font-bold">
                                    {t.codes.colRedeemedAt}
                                  </th>
                                  <th scope="col" className="py-1 pe-3 text-start font-bold">
                                    {t.codes.colRedeemerId}
                                  </th>
                                  <th scope="col" className="py-1 text-start font-bold">
                                    {t.codes.colRedeemerEmail}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {redemptions.list.rows.map((rd) => (
                                  <tr key={`${rd.userId}-${rd.redeemedAt}`} data-code-redemption-row={rd.userId}>
                                    <td className="py-1 pe-3 tabular-nums text-ink-700">
                                      {rd.redeemedAt.slice(0, 16).replace('T', ' ')}
                                    </td>
                                    <td className="py-1 pe-3 font-mono text-ink-700">{rd.userId}</td>
                                    {/* مُقنَّع في SQL — لا مسار هنا يحمل بريدًا كاملًا. */}
                                    <td className="py-1 font-mono text-ink-500">{rd.maskedEmail ?? '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
                {page.value.rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-sm text-ink-500">
                      {t.codes.noRows}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
