/**
 * غرفة العمليات — [COMMISSIONING §4 · §7 · §11]
 *
 * ═══ لماذا وُجدت هذه الشاشة ═══
 * اللوحة كانت تجيب «كم؟» ولا تجيب «مَن؟». و«فشل ٣ طلبات» رقمٌ **غير قابل
 * للفعل**: لا طريق منه إلى الثلاثة عملاء. هذه الشاشة تحوّل أربعة أعداد إلى
 * أربع قوائم يُفعل بها شيء:
 *   طلبات لم تُسلَّم · طابور بريد متعثّر · مصادر الوصول · بلاغات طعام ناقص.
 *
 * ═══ ثلاث قواعد تحكم كل سطر هنا ═══
 * ① **الغياب ليس صفرًا.** «ما فيه طلب فاشل» و«ما قدرنا نسأل» حالتان مختلفتان
 *    تمامًا، ولكلٍّ نصّها. قائمةٌ فارغة لأن النداء فشل لا تُعرض «كل شيء تمام».
 * ② **القراءة للدعم والتغيير للمؤسس.** الأزرار لا تظهر لمن لا يملكها — زرٌّ
 *    يظهر ثم يُرفض من الخادم أسوأ من زرٍّ غائب (§ الصدق قبل الطمأنينة).
 * ③ **أرقام المستخدم دليلٌ لا مصدر.** بلاغ الطعام يعرض ما كتبه المُبلِّغ
 *    موسومًا بذلك صراحةً، فلا يُقرأ يومًا على أنه قيمة كتالوج معتمدة.
 */
import { useCallback, useEffect, useState } from 'react'

import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { adminStrings } from '@/i18n/dict/admin'

import type { AdminRoleDecision } from '../auth/adminRole'
import { canWrite } from '../auth/adminRole'
import {
  loadEmailHealth,
  loadFailedOrders,
  loadFoodSubmissions,
  loadGrantsBySource,
  reviewFoodSubmission,
} from '../contract/liveSource'
import type {
  EmailHealth,
  FailedOrderRow,
  FoodSubmissionRow,
} from '../contract/types'

interface Props {
  readonly lang: Lang
  readonly decision: AdminRoleDecision
}

/** قراءةٌ لم تُحسم بعد، أو حُسمت بغياب **مسمّى**. لا حالة ثالثة صامتة. */
type Loaded<T> = { kind: 'loading' } | { kind: 'rows'; rows: readonly T[] } | { kind: 'gap'; why: string }

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4 text-start sm:p-5" data-ops-section={id}>
      <h3 className="text-base font-black">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  )
}

/** غيابٌ معلَن بسببه — لا فراغ يُقرأ نجاحًا. */
function Gap({ label, why }: { label: string; why: string }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/[0.07] p-3 text-xs leading-relaxed text-ink-700"
       data-ops-gap={why}>
      <Icon name="Info" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <span>{label} <code className="font-mono">{why}</code></span>
    </p>
  )
}

export function OperationsPanel({ lang, decision }: Props) {
  const t = adminStrings[lang].ops
  const writable = canWrite(decision)

  const [orders, setOrders] = useState<Loaded<FailedOrderRow>>({ kind: 'loading' })
  const [food, setFood] = useState<Loaded<FoodSubmissionRow>>({ kind: 'loading' })
  const [email, setEmail] = useState<{ kind: 'loading' } | { kind: 'ok'; health: EmailHealth } | { kind: 'gap'; why: string }>({ kind: 'loading' })
  const [sources, setSources] = useState<{ kind: 'loading' } | { kind: 'ok'; bySource: Readonly<Record<string, number>> } | { kind: 'gap'; why: string }>({ kind: 'loading' })
  const [busy, setBusy] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const [o, f, e, g] = await Promise.all([
      loadFailedOrders(decision, 50),
      loadFoodSubmissions(decision, 'pending', 50),
      loadEmailHealth(decision),
      loadGrantsBySource(decision),
    ])
    setOrders(o.ok ? { kind: 'rows', rows: o.rows } : { kind: 'gap', why: o.live })
    setFood(f.ok ? { kind: 'rows', rows: f.rows } : { kind: 'gap', why: f.live })
    setEmail(e.ok ? { kind: 'ok', health: e.health } : { kind: 'gap', why: e.live })
    setSources(g.ok ? { kind: 'ok', bySource: g.bySource } : { kind: 'gap', why: g.live })
  }, [decision])

  useEffect(() => { void reload() }, [reload])

  const decide = useCallback(
    async (row: FoodSubmissionRow, verdict: 'approved' | 'rejected' | 'needs_info') => {
      // السبب إلزامي لكل قرار غير الاعتماد — نفس قاعدة الخادم، فلا تُرسل
      // الشاشة طلبًا تعرف أنه سيُرفض.
      const note = window.prompt(t.foodNotePrompt) ?? ''
      if (verdict !== 'approved' && note.trim() === '') return
      const published = verdict === 'approved' ? (window.prompt(t.foodPublishedPrompt) ?? '') : ''
      setBusy(row.id)
      setFailure(null)
      const out = await reviewFoodSubmission(decision, row.id, verdict, note, published.trim() || undefined)
      setBusy(null)
      if (!out.ok) { setFailure(out.live); return }
      await reload()
    },
    [decision, reload, t.foodNotePrompt, t.foodPublishedPrompt],
  )

  return (
    <div className="mt-4 flex flex-col gap-4" data-admin-ops="true">
      <h2 className="text-lg font-black">{t.heading}</h2>

      {!writable ? (
        <p className="flex items-start gap-2 rounded-xl border border-line bg-surface p-3 text-xs leading-relaxed text-ink-700"
           data-ops-readonly="true">
          <Icon name="Eye" className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
          {t.readOnly}
        </p>
      ) : null}

      {failure ? (
        <p role="alert" className="rounded-xl border border-danger/40 bg-danger/[0.07] p-3 text-xs font-bold text-danger">
          {t.actionFailed} <code className="font-mono">{failure}</code>
        </p>
      ) : null}

      {/* ——— طلبات لم تُسلَّم ——— */}
      <Section id="failed-orders" title={t.failedHeading}>
        {orders.kind === 'loading' ? <p className="text-xs text-ink-500">…</p>
          : orders.kind === 'gap' ? <Gap label={t.failedUnavailable} why={orders.why} />
          : orders.rows.length === 0 ? <p className="text-xs text-ink-500">{t.failedEmpty}</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-start text-xs">
                <thead>
                  <tr className="text-ink-500">
                    <th className="p-2 text-start font-bold">{t.colOrder}</th>
                    <th className="p-2 text-start font-bold">{t.colWhy}</th>
                    <th className="p-2 text-start font-bold">{t.colWhen}</th>
                    <th className="p-2 text-start font-bold">{t.colWho}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.rows.map((r) => (
                    <tr key={r.providerOrderId + r.receivedAt} className="border-t border-line">
                      <td className="p-2 font-mono font-bold">{r.providerOrderId}</td>
                      <td className="p-2">{r.reason ?? r.classification}</td>
                      <td className="p-2 text-ink-500">{r.receivedAt.slice(0, 16).replace('T', ' ')}</td>
                      {/* مرجعٌ لا هوية — يكفي للمطابقة ولا يكشف بريد أحد. */}
                      <td className="p-2 font-mono text-ink-500">{r.identityRef ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Section>

      {/* ——— طابور البريد ——— */}
      <Section id="email-health" title={t.emailHeading}>
        {email.kind === 'loading' ? <p className="text-xs text-ink-500">…</p>
          : email.kind === 'gap' ? <Gap label={t.failedUnavailable} why={email.why} />
          : (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                {Object.entries(email.health.byState).map(([state, n]) => (
                  <span key={state} className="rounded-lg border border-line bg-page px-2.5 py-1 text-xs font-bold">
                    {state}: {n}
                  </span>
                ))}
              </div>
              {email.health.dead.length === 0 ? (
                <p className="text-xs text-ink-500">{t.emailEmpty}</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {email.health.dead.map((d) => (
                    <li key={d.idempotencyKey} className="rounded-lg border border-line bg-page p-2 text-xs">
                      <span className="font-bold">{d.templateId}</span>
                      <span className="ms-2 text-ink-500">{t.emailDead} · {d.attempts} {t.emailAttempts}</span>
                      {d.lastReason ? <div className="mt-1 font-mono text-[11px] text-danger">{d.lastReason}</div> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
      </Section>

      {/* ——— مصادر الوصول ——— */}
      <Section id="grants-by-source" title={t.sourcesHeading}>
        {sources.kind === 'loading' ? <p className="text-xs text-ink-500">…</p>
          : sources.kind === 'gap' ? <Gap label={t.failedUnavailable} why={sources.why} />
          : Object.keys(sources.bySource).length === 0 ? <p className="text-xs text-ink-500">{t.sourcesEmpty}</p>
          : (
            <div className="flex flex-wrap gap-2">
              {/* مصدرٌ بلا أحد **لا يظهر** — الخادم لا يرسله، ولا نخترع له صفرًا. */}
              {Object.entries(sources.bySource).map(([src, n]) => (
                <span key={src} className="rounded-lg border border-line bg-page px-2.5 py-1 text-xs font-bold">
                  {src}: {n}
                </span>
              ))}
            </div>
          )}
      </Section>

      {/* ——— بلاغات الطعام ——— */}
      <Section id="food-submissions" title={t.foodHeading}>
        {food.kind === 'loading' ? <p className="text-xs text-ink-500">…</p>
          : food.kind === 'gap' ? <Gap label={t.failedUnavailable} why={food.why} />
          : food.rows.length === 0 ? <p className="text-xs text-ink-500">{t.foodEmpty}</p>
          : (
            <ul className="flex flex-col gap-3">
              {food.rows.map((r) => (
                <li key={r.id} className="rounded-xl border border-line bg-page p-3" data-food-submission={r.id}>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-black">{r.productName}</span>
                    {r.brand ? <span className="text-xs text-ink-500">{r.brand}</span> : null}
                    {r.barcode ? (
                      <span className="font-mono text-[11px] text-ink-500">{t.foodBarcode} {r.barcode}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-[11px] font-bold text-warning">{t.foodEvidenceNote}</p>
                  <div className="mt-1 text-xs text-ink-700">
                    <span className="font-bold">{t.foodEvidence}: </span>
                    {/* «—» لا صفر: قيمةٌ لم يكتبها المستخدم ليست صفرًا. */}
                    {[
                      ['kcal', r.evidenceKcal],
                      ['P', r.evidenceProteinG],
                      ['C', r.evidenceCarbsG],
                      ['F', r.evidenceFatG],
                    ].map(([k, v]) => `${k as string} ${v === null ? '—' : String(v)}`).join(' · ')}
                    {r.servingDesc ? ` · ${r.servingDesc}` : ''}
                  </div>
                  {r.evidenceNote ? <p className="mt-1 text-xs text-ink-500">{r.evidenceNote}</p> : null}

                  {writable ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {([
                        ['approved', t.foodApprove, 'btn-primary'],
                        ['needs_info', t.foodNeedInfo, 'btn-ghost'],
                        ['rejected', t.foodReject, 'btn-ghost'],
                      ] as const).map(([verdict, label, cls]) => (
                        <button
                          key={verdict}
                          type="button"
                          disabled={busy === r.id}
                          onClick={() => void decide(r, verdict)}
                          data-food-action={verdict}
                          className={cn(cls, 'tap-target px-3 py-2 text-xs', busy === r.id && 'opacity-60')}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
      </Section>
    </div>
  )
}
