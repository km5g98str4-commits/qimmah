// ============================================================================
// سلامة السجلّات — **قائمة سماح، لا قائمة منع**.
// ============================================================================
// القاعدة القاطعة: **جسد رسالة يحمل كودًا لا يُكتب في أي سجلّ، أبدًا.**
//
// ─────────────────────────────────────────────────────────────────────────────
// لماذا سماح لا منع، وهذا هو بيت القصيد:
//
//   قائمة المنع تحرس ما فكّرنا فيه يوم كتابتها. أضِف غدًا حقلًا اسمه
//   `inviteLink` أو `oneTimeUrl` ولم تُحدِّث القائمة ⇒ يتسرّب **بصمت**، ولا
//   شيء في المستودع يشتكي. قائمة السماح تعكس الاتجاه: الحقل الجديد **يسقط
//   افتراضيًا** حتى يُضاف عمدًا، فالسهو يُنتج نقصًا في السجلّ لا تسريبًا فيه.
//
//   وهذا ليس افتراضًا نظريًا: `activationUrl` **رابط دعوة لمرّة واحدة**، أي
//   بيانات اعتماد كاملة بشكل رابط. من يراه يستطيع وضع كلمة مرور على الحساب.
//   قائمة منع تحرس كلمة «password» تمرّره بلا تردّد.
// ============================================================================

/**
 * الحقول الوحيدة المسموح خروجها في سجلّ. كل ما عداها يسقط.
 * لا تُضِف هنا حقلًا يحمل — أو قد يحمل — قيمة تفتح وصولًا.
 */
export const LOGGABLE_FIELDS = new Set([
  'event', 'outcome', 'reason', 'templateId', 'lang', 'attempt', 'attempts',
  'maxAttempts', 'nextAttemptInMs', 'idempotencyKey', 'provider', 'status',
  'durationMs', 'bytes', 'recipientDomain', 'jobId', 'queued', 'deadLettered',
])

/**
 * نطاق البريد وحده — لا العنوان. `ziyad@example.com` ⇒ `example.com`.
 * يكفي لتشخيص «كل رسائل هذا المزوّد ترتدّ» ولا يبني قائمة بريدية من السجلّ.
 */
export function recipientDomain(address) {
  const at = String(address || '').lastIndexOf('@')
  return at > 0 ? String(address).slice(at + 1).toLowerCase() : 'unknown'
}

/**
 * يبني سطر سجلّ آمنًا بالبناء: يمرّ ما في قائمة السماح فقط، وتُقصَر القيم.
 * لا يقبل كائنات متداخلة إطلاقًا — التداخل هو ما يهرّب الحمولات.
 */
export function safeLogFields(fields) {
  const out = {}
  for (const [k, v] of Object.entries(fields || {})) {
    if (!LOGGABLE_FIELDS.has(k)) continue
    if (v === null || v === undefined) continue
    if (typeof v === 'object') continue
    out[k] = typeof v === 'string' ? v.slice(0, 120) : v
  }
  return out
}

/** مُسجِّل آمن جاهز للحقن. `sink` افتراضه `console.log`. */
export function createSafeLogger(sink = (line) => console.log(line)) {
  return (event, fields = {}) => {
    sink(`[qimmah-mailer] ${JSON.stringify({ event, ...safeLogFields(fields) })}`)
  }
}

/**
 * فحص تدقيقي يستعمله الإثبات: هل ظهر أيٌّ من الأسرار في أي سطر؟
 * @returns {{ leaked: boolean, secret?: string, line?: string }}
 */
export function findSecretLeak(lines, secrets) {
  for (const line of lines) {
    for (const s of secrets) {
      if (s && String(line).includes(s)) return { leaked: true, secret: s, line: String(line) }
    }
  }
  return { leaked: false }
}
