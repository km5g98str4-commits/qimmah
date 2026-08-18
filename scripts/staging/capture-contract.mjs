// ============================================================================
// التقاط عقد سلة — [CTO-BACKEND-003] §4
// ============================================================================
// يحوّل حمولة webhook **واحدة متحقَّقًا منها** إلى «رصدٍ» صالح للحفظ في
// المستودع: يثبت البنية التي نحتاجها للعقد، ولا يحمل بريدًا ولا اسمًا ولا
// جوالًا ولا سرًّا ولا توقيعًا.
//
// ─────────────────────────────────────────────────────────────────────────────
// التوتّر الذي يحلّه هذا الملف:
//
//   نحتاج أن **نرى** حمولة حقيقية لنغلق المجهولات (أي شريحة تعني «وصل المال»؟
//   أين معرّف الطلب؟). ولا نريد أن نحتفظ بحمولة عميل حقيقي في Git إلى الأبد.
//
//   الحلّ: **الشكل بلا القيم.** يُسجَّل مسار كل مفتاح ونوعه (`data.order.id:
//   number`) — وهذا يكفي تمامًا للتحقّق من العقد — وتُستخرج القيم **للحقول
//   الثمانية المسمّاة في الأمر وحدها**. ما عداها لا يُكتب أصلًا؛ ليس مُنقَّحًا
//   بعد الكتابة بل **غير مكتوب**، والفرق بينهما هو الفرق بين تسريب مؤجَّل
//   وعدمه.
//
//   والبريد يُختزل إلى بصمة قصيرة: تكفي لتأكيد «نفس المشتري» عبر رصدين، ولا
//   تُعيد العنوان.
//
// الاستعمال (على staging فقط، بعد الحارس):
//   node scripts/staging/capture-contract.mjs --body ./payload.json \
//        --signature <hex> --secret-env SALLA_WEBHOOK_SECRET > docs/proof/salla/observation-1.json
// ============================================================================
import { readFileSync } from 'node:fs'
import { verifyAuthenticity, parseSallaEvent, bodyFingerprint } from
  '../../supabase/functions/salla-webhook/contract.mjs'

/** مفاتيح لا تُقرأ قيمتها أبدًا — ولا حتى لتُنقَّح. */
const NEVER_READ = /(^|[._-])(email|mobile|phone|first_name|last_name|name|avatar|address|street|postal|token|secret|signature|password|key|authorization|ip|user-agent)($|[._-])/i

/** الحقول الثمانية المسمّاة في §4 — وحدها تُستخرج بقيمها. */
export const CONTRACT_FIELDS = [
  'eventName', 'outerId', 'orderId', 'statusSlug',
  'pendingPayment', 'productIds', 'amountMinor', 'currency',
]

const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v)

/**
 * شكل الحمولة: مسارات ومُعرِّفات أنواع، **بلا أي قيمة**.
 * المصفوفات تُختزل إلى عنصرها الأول (`items[]`) — تكرار العناصر لا يضيف عقدًا
 * ويضاعف احتمال تسرّب قيمة.
 */
export function structuralShape(value, path = '', out = [], depth = 0) {
  if (depth > 8) { out.push(`${path}: …(عمق)`); return out }
  const t = typeOf(value)
  if (t === 'object') {
    for (const k of Object.keys(value).sort()) {
      structuralShape(value[k], path ? `${path}.${k}` : k, out, depth + 1)
    }
  } else if (t === 'array') {
    if (value.length === 0) out.push(`${path}[]: empty`)
    else structuralShape(value[0], `${path}[]`, out, depth + 1)
  } else {
    out.push(`${path}: ${t}`)
  }
  return out
}

/** بصمة قصيرة غير عكوسة — تؤكّد «نفس المشتري» ولا تعيد العنوان. */
export async function shortDigest(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text ?? '')))
  return [...new Uint8Array(d)].slice(0, 6).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * ينتج الرصد. **لا يكتب ملفًا** — يُرجع كائنًا، والكاتب هو المشغّل.
 *
 * @returns {{ok: true, observation: object} | {ok: false, reason: string}}
 */
export async function captureObservation({ rawBody, headers, secret, token }) {
  const auth = await verifyAuthenticity({ headers, rawBody, secret, token })

  // حمولة غير متحقَّق منها لا تُلتقط أصلًا: رصدٌ من مجهول ليس دليلًا على عقد
  // سلة، وقد يكون مصنوعًا ليضلّلنا عن الشريحة المدفوعة.
  if (!auth.ok) return { ok: false, reason: `unverified:${auth.reason}` }

  let body
  try { body = JSON.parse(rawBody) } catch { return { ok: false, reason: 'malformed_json' } }

  const parsed = parseSallaEvent(rawBody)
  const d = body && typeof body === 'object' ? body.data : null
  const outerId = d && typeof d === 'object' && d.id !== undefined && d.id !== null
    ? String(d.id) : null

  const contract = parsed.ok ? {
    eventName: parsed.event.eventName,
    outerId,
    orderId: parsed.event.orderId,
    statusSlug: parsed.event.statusSlug || null,
    pendingPayment: parsed.event.pendingPayment,
    productIds: parsed.event.productIds,
    amountMinor: parsed.event.amountMinor,
    currency: parsed.event.currency || null,
    nestedShape: parsed.event.nestedShape,
  } : { parseFailed: parsed.reason }

  return {
    ok: true,
    observation: {
      capturedFor: 'CTO-BACKEND-003 §4 — contract verification only',
      signatureVerification: { outcome: 'verified', strategy: auth.strategy },
      bodyFingerprint: await bodyFingerprint(rawBody),
      buyerDigest: parsed.ok && parsed.event.email ? await shortDigest(parsed.event.email) : null,
      contract,
      // الشكل بلا القيم — هذا هو الدليل البنيوي على العقد.
      shape: structuralShape(body),
      redaction: {
        policy: 'values captured for the 8 contract fields only; every other value omitted, not masked',
        neverRead: NEVER_READ.source,
      },
    },
  }
}

/** يفحص رصدًا قبل حفظه: هل تسرّبت قيمة ممنوعة؟ */
export function auditObservation(observation) {
  const violations = []
  const json = JSON.stringify(observation)
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(json)) violations.push('plaintext_email')
  // توقيع/بصمة HMAC بطول ٦٤: البصمة المقصودة معلَنة في حقلها، وأي ٦٤ خانة أخرى مشبوهة.
  const hex64 = json.match(/\b[0-9a-f]{64}\b/g) ?? []
  if (hex64.length > 1) violations.push('multiple_64hex_values')
  if (/"(secret|token|password|authorization|signature)"\s*:\s*"[^"]+"/i.test(json)) {
    violations.push('secret_like_field')
  }
  for (const p of observation?.shape ?? []) {
    const key = String(p).split(':')[0]
    // الشكل مسارات وأنواع؛ لو حمل قيمة نصّية لمفتاح حسّاس فذلك تسريب.
    if (NEVER_READ.test(key) && !/:\s*(string|number|boolean|null|array|object|empty|…)/.test(p)) {
      violations.push(`value_in_shape:${key}`)
    }
  }
  return { clean: violations.length === 0, violations }
}
