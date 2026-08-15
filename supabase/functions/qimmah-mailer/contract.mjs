// ============================================================================
// عقد المُرسِل — منطق خالص، بلا شبكة وبلا قاعدة وبلا Deno.
// ============================================================================
// نفس تقسيم `salla-webhook`: القرارات هنا وقابلة للاختبار من Node، والطرفية
// (`index.ts`) نقلٌ لا يقرّر شيئًا.
// ============================================================================

import { TEMPLATES, TEMPLATE_IDS, LANGS, callerTokens } from '../_shared/email/templates.mjs'

/** ترجمة النتيجة إلى حالة HTTP. الرفض الدائم ٢٠٠ كي لا يُعاد بلا فائدة. */
export function httpStatusFor(outcome) {
  switch (outcome) {
    case 'queued':
    case 'sent':
    case 'duplicate':      return 200
    case 'dead':           return 200
    case 'unauthorized':   return 401
    case 'malformed':      return 400
    case 'misconfigured':  return 500
    case 'failed':         return 500
    case 'method_not_allowed': return 405
    default:               return 200
  }
}

/**
 * التهيئة الإلزامية. **بلا افتراضات صامتة** — نفس مبدأ `readPolicy` في سلة:
 * متغيّر ناقص ⇒ توقّف مُعلَن، لا سلوك مخمَّن.
 */
export function readMailerPolicy(env = {}) {
  const missing = []
  const from = String(env.EMAIL_FROM_ADDRESS || '').trim()
  const support = String(env.EMAIL_SUPPORT_ADDRESS || '').trim()
  const secret = String(env.QIMMAH_MAILER_SECRET || '')
  if (!from) missing.push('EMAIL_FROM_ADDRESS')
  if (!support) missing.push('EMAIL_SUPPORT_ADDRESS')
  if (secret.length < 24) missing.push('QIMMAH_MAILER_SECRET')
  if (missing.length) return { ok: false, reason: `missing:${missing.join(',')}` }

  const defaultLang = String(env.EMAIL_DEFAULT_LANG || 'ar').trim().toLowerCase()
  if (!LANGS.includes(defaultLang)) return { ok: false, reason: 'bad:EMAIL_DEFAULT_LANG' }

  return { ok: true, policy: { from, support, secret, defaultLang } }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * يقرأ طلب إرسال ويتحقّق من شكله بالكامل.
 * الرموز الناقصة تُكتشف **هنا** لا عند التصيير: رفض ٤٠٠ للمستدعي أوضح من
 * وظيفة تقبل ثم تموت في الطابور.
 */
export function parseSendRequest(rawBody, policy) {
  let body
  try { body = JSON.parse(rawBody) } catch { return { ok: false, reason: 'not_json' } }
  if (!body || typeof body !== 'object') return { ok: false, reason: 'not_object' }

  const templateId = String(body.template || '')
  if (!TEMPLATE_IDS.includes(templateId)) return { ok: false, reason: 'unknown_template' }

  const lang = String(body.lang || policy.defaultLang).toLowerCase()
  if (!LANGS.includes(lang)) return { ok: false, reason: 'unknown_lang' }

  const to = String(body.to || '').trim()
  if (!EMAIL_RE.test(to)) return { ok: false, reason: 'bad_recipient' }

  const key = String(body.idempotencyKey || '').trim()
  if (key.length < 6 || key.length > 200) return { ok: false, reason: 'bad_idempotency_key' }

  const supplied = (body.data && typeof body.data === 'object') ? { ...body.data } : {}
  // `supportEmail` من التهيئة لا من المستدعي: عنوان دعم يُحقَن من طرف خارجي
  // يحوّل رسالتنا إلى صفحة تصيّد تحمل علامتنا.
  supplied.supportEmail = policy.support

  // الرموز المسكوكة متأخّرًا **يُرفض** تمريرها من الخارج: رابط دعوة يصلنا من
  // مستدعٍ هو رابط لا نعرف مصدره نضعه في رسالة تحمل علامتنا — تصيّد جاهز.
  const late = TEMPLATES[templateId].lateTokens ?? []
  const intruding = late.filter((n) => supplied[n] !== undefined)
  if (intruding.length) return { ok: false, reason: `late_token_not_accepted:${intruding.join(',')}` }

  const needed = callerTokens(templateId, lang)
  const missing = needed.filter((n) => supplied[n] === undefined || supplied[n] === null || supplied[n] === '')
  if (missing.length) return { ok: false, reason: `missing_tokens:${missing.join(',')}` }

  for (const [k, v] of Object.entries(supplied)) {
    if (typeof v !== 'string' && typeof v !== 'number') return { ok: false, reason: `bad_token_type:${k}` }
  }

  return {
    ok: true,
    request: { templateId, lang, to, idempotencyKey: key, data: supplied,
               carriesSecret: TEMPLATES[templateId].carriesSecret },
  }
}
