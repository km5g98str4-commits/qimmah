// ============================================================================
// qimmah-mailer — طرفية بريد المعاملات.
// ============================================================================
// النقل وحده. كل قرار في `contract.mjs` و`../_shared/email/*` (منطق خالص قابل
// للاختبار من Node)، وكل ذرّية في دوال `email_outbox_*`. هذا الملف يصل الثلاثة.
//
// ─────────────────────────────────────────────────────────────────────────────
// قراران أمنيان يستحقّان التسمية:
//
//  ① **لا جسد رسالة في أي سجلّ.** المُسجِّل قائمة سماح (`redact.mjs`)، فالحقل
//     الذي لا يُذكر فيها **يسقط افتراضيًا**. الجسد المُصاغ لا يبلغ المُسجِّل
//     أصلًا: يُبنى في `outbox.mjs` ويُمرَّر للمزوّد ثم يُنسى.
//
//  ② **قالب الكود لا يمرّ بالطابور.** يُرسَل بالتمرير المباشر (`sendNow`)،
//     ويبقى في القاعدة أثرٌ بلا حمولة. السبب في ترويسة
//     `../_shared/email/templates.mjs`: الكود مبصوم في القاعدة ولا نصّ له.
//
// المتغيّرات المطلوبة (تُضبط بلوحة Supabase — لا في المستودع):
//   SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
//   QIMMAH_MAILER_SECRET      سرّ نداء خادم-إلى-خادم (٢٤ محرفًا فأكثر)
//   EMAIL_FROM_ADDRESS        المُرسِل المعتمد على النطاق الموثَّق
//   EMAIL_SUPPORT_ADDRESS     عنوان الدعم المعروض في الرسائل
//   EMAIL_DEFAULT_LANG        ar | en   (افتراض ar)
//   EMAIL_PROVIDER_KIND       dryrun | resend | postmark | generic
//   EMAIL_PROVIDER_API_KEY · EMAIL_PROVIDER_ENDPOINT · EMAIL_PROVIDER_STREAM
//   EMAIL_ACTIVATION_REDIRECT_URL  وجهة رابط الدعوة بعد وضع كلمة المرور
// ============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { readMailerPolicy, parseSendRequest, httpStatusFor } from './contract.mjs'
import { resolveProvider } from '../_shared/email/provider.mjs'
import { createMailer, delayFor, DEFAULT_POLICY } from '../_shared/email/outbox.mjs'
import { createSafeLogger } from '../_shared/email/redact.mjs'
import { authorizeCall } from '../_shared/email/auth.mjs'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any

const json = (outcome: string, extra: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({ outcome, ...extra }), {
    status: httpStatusFor(outcome),
    headers: { 'content-type': 'application/json' },
  })

/**
 * مخزن الطابور فوق دوال القاعدة — نفس واجهة `createMemoryStore` بالضبط، فما
 * تُثبته الإثباتات على الذاكرة يسري هنا حرفيًا.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createDbStore(supabase: any, clock: () => number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rpc = async (fn: string, args: Record<string, unknown>): Promise<any> => {
    const { data, error } = await supabase.rpc(fn, args)
    if (error) throw new Error(`EMAIL_DB:${fn}:${error.message}`)
    return data
  }
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async insert(job: any) {
      const outcome = String(await rpc('email_outbox_enqueue', {
        p_idempotency_key: job.idempotencyKey,
        p_template_id: job.templateId,
        p_lang: job.lang,
        p_carries_secret: job.data === null && job.to === null,
        p_recipient_email: job.to,
        p_payload: job.data,
      }))
      return { inserted: outcome !== 'duplicate', job: { ...job, id: job.idempotencyKey } }
    },
    async get() { return null },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async update(key: string, patch: any) {
      if (patch.state === 'sent') {
        await rpc('email_outbox_mark_sent', { p_idempotency_key: key, p_attempts: patch.attempts ?? 0 })
      } else if (patch.state === 'dead') {
        await rpc('email_outbox_mark_dead', {
          p_idempotency_key: key, p_attempts: patch.attempts ?? 0, p_reason: patch.lastReason ?? null,
        })
      } else {
        await rpc('email_outbox_reschedule', {
          p_idempotency_key: key, p_attempts: patch.attempts ?? 0,
          p_delay_ms: Math.max(0, (patch.nextAttemptAt ?? clock()) - clock()),
          p_reason: patch.lastReason ?? null,
        })
      }
      return null
    },
    async listDue() {
      const rows = (await rpc('email_outbox_due', { p_limit: 50 })) || []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rows.map((r: any) => ({
        id: r.idempotency_key, idempotencyKey: r.idempotency_key,
        templateId: r.template_id, lang: r.lang, to: r.recipient_email,
        data: r.payload, attempts: r.attempts, state: 'queued',
      }))
    },
    async all() { return [] },
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json('method_not_allowed')

  const env = Deno.env.toObject()

  const pol = readMailerPolicy(env)
  if (!pol.ok) {
    console.error('[qimmah-mailer] misconfigured:', pol.reason)
    return json('misconfigured', { reason: pol.reason })
  }

  // ① التفويض قبل أي شيء — قبل القراءة وقبل أي كتابة.
  const auth = authorizeCall(req.headers, pol.policy.secret)
  if (!auth.ok) {
    console.warn('[qimmah-mailer] unauthorized:', auth.reason)
    return json('unauthorized', { reason: auth.reason })
  }

  const rawBody = await req.text()
  const log = createSafeLogger()
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const clock = () => Date.now()

  /**
   * سكّ الرموز المتأخّرة لحظة التسليم. رابط الدعوة **لا يُخزَّن ولا يُستقبَل**:
   * يُسكّ هنا من Supabase Auth، يدخل الرسالة، ويُنسى. الإعادة تسكّ رابطًا جديدًا
   * صالحًا لنفس الهوية — ولذلك جاز لهذا القالب أن يُطابَر أصلًا.
   */
  const resolveLateTokens = async (
    names: string[],
    ctx: { to: string },
  ): Promise<Record<string, string>> => {
    const out: Record<string, string> = {}
    for (const n of names) {
      if (n !== 'activationUrl') throw new Error(`EMAIL_UNKNOWN_LATE_TOKEN:${n}`)
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'invite',
        email: ctx.to,
        options: { redirectTo: env.EMAIL_ACTIVATION_REDIRECT_URL },
      })
      // ⚠️ رسالة الخطأ تُقصَر ولا تُمرَّر كاملة: قد تعكس الرابط أو الهوية.
      if (error) throw new Error(`EMAIL_INVITE_MINT_FAILED:${String(error.message).slice(0, 40)}`)
      const link = data?.properties?.action_link
      if (!link) throw new Error('EMAIL_INVITE_MINT_EMPTY')
      out[n] = link
    }
    return out
  }

  const mailer = createMailer({
    store: createDbStore(supabase, clock),
    provider: resolveProvider(env, fetch),
    clock, log, policy: DEFAULT_POLICY, resolveLateTokens,
  })

  // ② التصريف: مهمّة مجدولة تعالج ما حان وقته ولا تُرسل شيئًا جديدًا.
  let parsedBody: Record<string, unknown> = {}
  try { parsedBody = JSON.parse(rawBody || '{}') } catch { return json('malformed', { reason: 'not_json' }) }

  if (parsedBody.action === 'drain') {
    try {
      const outcomes = await mailer.runDue()
      log('drain', { outcome: 'done', queued: outcomes.length })
      return json('queued', { processed: outcomes.length })
    } catch (e) {
      console.error('[qimmah-mailer] drain failed:', (e as Error).message)
      return json('failed', { reason: 'drain_error' })
    }
  }

  // ③ إرسال.
  const parsed = parseSendRequest(rawBody, pol.policy)
  if (!parsed.ok) {
    console.warn('[qimmah-mailer] malformed:', parsed.reason)
    return json('malformed', { reason: parsed.reason })
  }
  const r = parsed.request

  try {
    const result = r.carriesSecret
      ? await mailer.sendNow(r)   // ← لا حمولة تُخزَّن. انظر ترويسة الملف ②.
      : await mailer.enqueue(r)
    // ملاحظة: `result` لا يحمل جسدًا ولا رمزًا — بنية `outbox.mjs` تضمن ذلك.
    return json(result.outcome, result.reason ? { reason: result.reason } : {})
  } catch (e) {
    const msg = (e as Error).message || 'unknown'
    // رسائل الأخطاء هنا رموز مسمّاة (`EMAIL_*`) لا نصوص تحمل حمولات.
    console.error('[qimmah-mailer] send failed:', msg.slice(0, 120))
    return json('failed', { reason: msg.split(':')[0] })
  }
})

export { delayFor }
