// ============================================================================
// مِهاد المزوّد — واجهة واحدة، والمزوّد الحقيقي يدخل بمتغيّرات بيئة فقط.
// ============================================================================
// **لا مزوّد بريد مُهيَّأ في هذا المستودع ولا على هذا الجهاز.** وهذه ليست حالة
// نقص تُخفى بل حالة مُعلَنة تُبرمَج: المزوّد الافتراضي `blocked`، وردّه سبب
// مسمّى `EMAIL_PROVIDER_EXTERNAL` **غير قابل للإعادة**. فالنظام لا يتظاهر
// بالإرسال، ولا يعيد المحاولة على حاجزٍ خارجي لن يزول بالإعادة.
//
// الواجهة:
//   send({ to, subject, html, text, headers }) →
//     { ok: true,  id }                         نجاح
//     { ok: false, retryable: boolean, reason }  فشل مصنَّف
//
// **لا يرمي المزوّد استثناءات للفشل المتوقَّع** — يعيد تصنيفًا. الاستثناء يخلط
// «الشبكة سقطت» بـ«الكود مكسور»، والطابور يحتاج التفرقة كي يقرّر الإعادة.
// ============================================================================

/** رموز التصنيف — يقرؤها الطابور ولا يفسّر نصًّا حرًّا. */
export const REASONS = {
  external: 'EMAIL_PROVIDER_EXTERNAL',
  network: 'EMAIL_PROVIDER_NETWORK',
  throttled: 'EMAIL_PROVIDER_THROTTLED',
  serverError: 'EMAIL_PROVIDER_SERVER_ERROR',
  rejected: 'EMAIL_PROVIDER_REJECTED',
  misconfigured: 'EMAIL_PROVIDER_MISCONFIGURED',
}

/** 429 وكل 5xx قابلة للإعادة؛ ما عداها رفض دائم لا تصلحه إعادة. */
export function classifyHttpStatus(status) {
  if (status >= 200 && status < 300) return { ok: true }
  if (status === 429) return { ok: false, retryable: true, reason: REASONS.throttled }
  if (status >= 500) return { ok: false, retryable: true, reason: REASONS.serverError }
  return { ok: false, retryable: false, reason: REASONS.rejected }
}

/** المزوّد الافتراضي: يرفض بصدق ويقول لماذا. */
export function createBlockedProvider() {
  return {
    name: 'blocked',
    async send() {
      return { ok: false, retryable: false, reason: REASONS.external }
    },
  }
}

/**
 * مزوّد التمرين الجاف — يسجّل الرسالة في `sink` ولا يلمس الشبكة إطلاقًا.
 * هو ما يُصيِّر المعاينات في `docs/commerce/email/rendered/`.
 */
export function createDryRunProvider({ sink } = {}) {
  const sent = []
  return {
    name: 'dryrun',
    sent,
    async send(message) {
      sent.push(message)
      if (sink) await sink(message)
      return { ok: true, id: `dryrun-${sent.length}` }
    },
  }
}

/**
 * أشكال حمولات المزوّدين الشائعة. إضافة مزوّد = سطر هنا، لا تعديل في الطابور.
 * القيم كلها من `cfg` (بيئة) — **لا مفتاح ولا عنوان مكتوب في المستودع**.
 */
export const PROVIDER_SHAPES = {
  resend: (cfg, m) => ({
    url: cfg.endpoint || 'https://api.resend.com/emails',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey}` },
    body: { from: cfg.from, to: [m.to], subject: m.subject, html: m.html, text: m.text },
  }),
  postmark: (cfg, m) => ({
    url: cfg.endpoint || 'https://api.postmarkapp.com/email',
    headers: { 'content-type': 'application/json', accept: 'application/json', 'x-postmark-server-token': cfg.apiKey },
    body: { From: cfg.from, To: m.to, Subject: m.subject, HtmlBody: m.html, TextBody: m.text, MessageStream: cfg.stream || 'outbound' },
  }),
  generic: (cfg, m) => ({
    url: cfg.endpoint,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey}` },
    body: { from: cfg.from, to: m.to, subject: m.subject, html: m.html, text: m.text },
  }),
}

/**
 * مزوّد HTTP عام. `fetchImpl` مُحقَن كي يُختبَر بلا شبكة (§4.2: الحارس يُهاجَم).
 */
export function createHttpProvider(cfg, fetchImpl) {
  const shape = PROVIDER_SHAPES[cfg.kind]
  return {
    name: cfg.kind,
    async send(message) {
      if (!shape) return { ok: false, retryable: false, reason: REASONS.misconfigured }
      if (!cfg.apiKey || !cfg.from) return { ok: false, retryable: false, reason: REASONS.misconfigured }
      const req = shape(cfg, message)
      if (!req.url) return { ok: false, retryable: false, reason: REASONS.misconfigured }
      let res
      try {
        res = await fetchImpl(req.url, {
          method: 'POST', headers: req.headers, body: JSON.stringify(req.body),
        })
      } catch {
        // ⚠️ الالتقاط أعمى عمدًا: نصّ خطأ الشبكة قد يحمل الرابط أو الترويسة،
        // وتمريره للأعلى يضعه في سجلّ. التصنيف وحده يعبر.
        return { ok: false, retryable: true, reason: REASONS.network }
      }
      const verdict = classifyHttpStatus(res.status)
      if (!verdict.ok) return verdict
      return { ok: true, id: `${cfg.kind}-${res.status}` }
    },
  }
}

/**
 * يختار المزوّد من البيئة. **غياب الإعداد ⇒ `blocked`** لا تخمين ولا صمت.
 * `EMAIL_PROVIDER_KIND` = dryrun | resend | postmark | generic
 */
export function resolveProvider(env = {}, fetchImpl) {
  const kind = String(env.EMAIL_PROVIDER_KIND || '').trim().toLowerCase()
  if (!kind) return createBlockedProvider()
  if (kind === 'dryrun') return createDryRunProvider()
  return createHttpProvider({
    kind,
    endpoint: env.EMAIL_PROVIDER_ENDPOINT,
    apiKey: env.EMAIL_PROVIDER_API_KEY,
    from: env.EMAIL_FROM_ADDRESS,
    stream: env.EMAIL_PROVIDER_STREAM,
  }, fetchImpl)
}
