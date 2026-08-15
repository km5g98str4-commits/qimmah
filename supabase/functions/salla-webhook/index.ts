// ============================================================================
// salla-webhook — أول كود خادم في المستودع.
// ============================================================================
// النقل وحده. كل قرار أمني في `contract.mjs` (منطق خالص قابل للاختبار من
// Node)، وكل ذرّية في `public.salla_ingest_event` (معاملة واحدة في القاعدة).
// هذا الملف يصل الثلاثة ولا يقرّر شيئًا بنفسه.
//
// ─────────────────────────────────────────────────────────────────────────────
// قرار أمني يستحقّ التسمية: **لا يُكتب سطر تدقيق قبل التحقّق من التوقيع.**
//
//   الترتيب البديهي «سجّل كل ما يصل ثم افحص» يحوّل الطرفية إلى **مضخّة كتابة
//   غير موثَّقة**: أي طرف على الإنترنت يملأ جدول التدقيق بما شاء بلا سرّ.
//   فالتحقّق أولًا، والمرفوض توقيعه يُردّ ٤٠١ ولا يترك أثرًا في القاعدة.
//   ثمن ذلك أننا لا نرى محاولات التزوير في الجدول — وهي تُرى في سجلّ الطرفية،
//   وهو الموضع الصحيح لها.
//
// المتغيّرات المطلوبة (تُضبط بلوحة Supabase — لا في المستودع):
//   SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
//   SALLA_WEBHOOK_SECRET   (استراتيجية التوقيع)
//   SALLA_WEBHOOK_TOKEN    (استراتيجية الرمز — إن استُخدمت)
//   SALLA_AMOUNT_POLICY    = exact | off      ← إلزامي، بلا افتراض
//   SALLA_EXPECTED_AMOUNT_MINOR               ← إلزامي مع exact
//   SALLA_EXPECTED_CURRENCY   (افتراض SAR)
//   SALLA_PAID_STATUS_SLUGS   (افتراض completed)
//   SALLA_EXPECTED_PRODUCT_IDS (اختياري)
// ============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  verifyAuthenticity, parseSallaEvent, decideGrant, readPolicy,
  bodyFingerprint, httpStatusFor,
} from './contract.mjs'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any

const json = (outcome: string, extra: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({ outcome, ...extra }), {
    status: httpStatusFor(outcome),
    headers: { 'content-type': 'application/json' },
  })

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json('method_not_allowed')

  const env = Deno.env.toObject()

  // تهيئة ناقصة ⇒ توقّف. لا تمنح طرفيةُ دفعٍ لأن متغيّرًا لم يُضبط.
  const pol = readPolicy(env)
  if (!pol.ok) {
    console.error('[salla-webhook] misconfigured:', pol.reason)
    return json('misconfigured')
  }

  const rawBody = await req.text()

  // ① الأصالة قبل أي كتابة — انظر ترويسة الملف.
  const auth = await verifyAuthenticity({
    headers: req.headers,
    rawBody,
    secret: env.SALLA_WEBHOOK_SECRET,
    token: env.SALLA_WEBHOOK_TOKEN,
  })
  if (!auth.ok) {
    console.warn('[salla-webhook] unauthorized:', auth.reason)
    return json('unauthorized', { reason: auth.reason })
  }

  // ② التحليل. مشوَّه ⇒ ٤٠٠ بلا سطر تدقيق: بصمة جسمٍ لا يُفهَم لا تفيد قارئًا.
  const parsed = parseSallaEvent(rawBody)
  if (!parsed.ok) {
    console.warn('[salla-webhook] malformed:', parsed.reason)
    return json('malformed', { reason: parsed.reason })
  }

  const event = parsed.event
  const decision = decideGrant(event, pol.policy)
  const fingerprint = await bodyFingerprint(rawBody)

  // ③ الاستيعاب الذرّي — منع التكرار والكتابة والتصنيف في معاملة واحدة.
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.rpc('salla_ingest_event', {
    p_fingerprint: fingerprint,
    p_event_name: event.eventName,
    p_order_id: event.orderId,
    p_email: event.email || null,
    p_amount_minor: event.amountMinor,
    p_currency: event.currency || null,
    p_status_slug: event.statusSlug || null,
    p_should_grant: decision.grant,
    p_reason: decision.reason,
  })

  if (error) {
    // عطل قاعدة: ٥٠٠ كي **تعيد** سلة المحاولة — هذا بالضبط ما تنفع فيه الإعادة.
    console.error('[salla-webhook] ingest failed:', error.message)
    return json('failed', { reason: 'ingest_error' })
  }

  const outcome = String(data)
  console.log('[salla-webhook]', JSON.stringify({
    outcome, event: event.eventName, order: event.orderId,
    status: event.statusSlug, reason: decision.reason,
  }))

  // رفض دائم يُردّ ٢٠٠ عمدًا: الإعادة ثلاثًا لن تغيّره. (`httpStatusFor`)
  return json(
    ['processed', 'duplicate'].includes(outcome) ? outcome
      : outcome === 'rejected' ? 'rejected' : 'ignored',
    { reason: decision.reason },
  )
})
