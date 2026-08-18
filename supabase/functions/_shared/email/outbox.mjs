// ============================================================================
// الطابور — منع تكرار · إعادة بتراجع أسّي · صندوق رسائل ميتة.
// ============================================================================
// منطق خالص: الوقت والتخزين والمزوّد والمُسجِّل **كلها مُحقَنة**. لا `Date.now()`
// ولا `setTimeout` ولا شبكة هنا — ولذلك يُختبَر السلوك الزمني كاملًا بلا انتظار
// ثانية واحدة، ويُصوَّر «بعد أربع دقائق» بسطر واحد.
//
// ─────────────────────────────────────────────────────────────────────────────
// المساران، والفرق بينهما بنيويّ لا تفضيليّ:
//
//   • **`enqueue`** — للقوالب التي لا تحمل سرًّا. يُحفظ الطلب (المعرّف واللغة
//     والمستلم والرموز) ويُصاغ الجسد **لحظة التسليم** ثم يُنسى. الجسد المُصاغ
//     لا يُخزَّن أبدًا: تخزينه يحوّل الطابور إلى نسخة ثانية من المحتوى تشيخ،
//     وإلى وعاءٍ لبيانات شخصية بلا داعٍ.
//
//   • **`sendNow`** — للقوالب الحاملة للسرّ (`carriesSecret`). لا تُطابَر
//     **إطلاقًا**: الكود يعيش في ذاكرة العملية لحظةً واحدة ولا يوجد في القاعدة
//     إلا مبصومًا، فطابورٌ يعد بإعادة إرساله يعد بما لا يملك. يبقى في السجلّ
//     أثرٌ بلا حمولة — يُثبت أن إرسالًا وقع ولا يمكّن من تكراره.
//
// ومنع التكرار واحد للمسارين: `idempotencyKey` مفتاح فريد في المخزن. إعادة
// إدراجه ⇒ `duplicate` بلا إرسال ثانٍ. هذا ما يجعل إعادة سلة الثلاثية (~٥ دقائق
// بين المحاولة والأخرى) لا تُنتج ثلاث رسائل تفعيل لطلب واحد.
// ============================================================================

import { TEMPLATES, getDocument, callerTokens } from './templates.mjs'
import { renderDocument } from './render.mjs'
import { recipientDomain } from './redact.mjs'

/** رموز ممنوع مرورها في حمولة مطابَرة — الطابور يُخزَّن، والسرّ لا يُخزَّن. */
export const NON_QUEUEABLE_TOKENS = [
  'code', 'activationCode', 'password', 'passcode', 'pin',
  'activationUrl', 'inviteUrl', 'oneTimeUrl', 'token', 'secret',
]

export const DEFAULT_POLICY = {
  maxAttempts: 5,
  baseDelayMs: 1000,
  factor: 4,
  capMs: 15 * 60 * 1000,
}

/**
 * تراجع أسّي محسوب من عدد المحاولات الفاشلة.
 * حتمي بلا عشوائية عمدًا: التشويش (jitter) يُحقَن من فوق حين يُراد، فيبقى
 * السلوك الافتراضي قابلًا للإثبات بالمقارنة بدل «قريب من».
 */
export function delayFor(attempt, policy = DEFAULT_POLICY) {
  const raw = policy.baseDelayMs * Math.pow(policy.factor, Math.max(0, attempt - 1))
  return Math.min(raw, policy.capMs)
}

/** يرفض أي حمولة مطابَرة تحمل اسم رمز سرّي. خطأ **مسمّى** لا تجاهل صامت. */
export function assertQueueableData(data) {
  for (const k of Object.keys(data || {})) {
    if (NON_QUEUEABLE_TOKENS.includes(k)) {
      throw new Error(`EMAIL_SECRET_IN_QUEUE:${k}`)
    }
  }
}

/** مخزن في الذاكرة — للإثباتات وللتمرين الجاف. القاعدة تنفّذ نفس الواجهة. */
export function createMemoryStore() {
  const byKey = new Map()
  let seq = 0
  return {
    async insert(job) {
      if (byKey.has(job.idempotencyKey)) return { inserted: false, job: byKey.get(job.idempotencyKey) }
      const row = { ...job, id: `job-${++seq}` }
      byKey.set(job.idempotencyKey, row)
      return { inserted: true, job: row }
    },
    async get(key) { return byKey.get(key) || null },
    async update(key, patch) {
      const row = byKey.get(key)
      if (!row) return null
      Object.assign(row, patch)
      return row
    },
    async listDue(now) {
      return [...byKey.values()]
        .filter((j) => j.state === 'queued' && j.nextAttemptAt <= now)
        .sort((a, b) => (a.nextAttemptAt - b.nextAttemptAt) || a.id.localeCompare(b.id))
    },
    async all() { return [...byKey.values()] },
  }
}

/**
 * يبني المُرسِل.
 * @param {object} deps
 * @param {object} deps.store     مخزن الطابور
 * @param {object} deps.provider  مزوّد البريد
 * @param {() => number} deps.clock  الآن بالمللي ثانية
 * @param {(event:string, fields:object) => void} deps.log  مُسجِّل آمن
 */
export function createMailer({
  store, provider, clock, log,
  policy = DEFAULT_POLICY,
  jitter = () => 0,
  /**
   * يسكّ الرموز المتأخّرة (`lateTokens`) **لحظة التسليم**.
   * افتراضه رفضٌ مسمّى لا قيمةٌ فارغة: قالبٌ يطلب رابط دعوة ولا سكّاك مربوط
   * يجب أن يتوقّف صاخبًا، لا أن يرسل رسالة بزرٍّ لا يقود إلى شيء.
   */
  resolveLateTokens = async (names) => {
    if (names.length) throw new Error(`EMAIL_NO_LATE_TOKEN_MINTER:${names.join(',')}`)
    return {}
  },
}) {
  const now = () => clock()

  /** يصيّر رسالة جاهزة. يرمي بأسماء مسمّاة عند نقص الرموز أو تجاوز الحجم. */
  function build(templateId, lang, data) {
    const doc = getDocument(templateId, lang)
    return renderDocument(doc, lang, data)
  }

  async function attemptSend(templateId, lang, to, data) {
    // الرموز المتأخّرة تُسكّ هنا وهنا فقط: بعد الخروج من هذه الدالة لا أثر لها
    // في مخزن ولا سجلّ ولا قيمة مُعادة.
    const late = TEMPLATES[templateId].lateTokens ?? []
    const minted = late.length ? await resolveLateTokens(late, { templateId, lang, to }) : {}
    for (const n of late) {
      if (!minted[n]) throw new Error(`EMAIL_LATE_TOKEN_UNMINTED:${n}`)
    }
    const msg = build(templateId, lang, { ...data, ...minted })
    // ⚠️ ما يُمرَّر للمزوّد يحمل الجسد؛ وما يُمرَّر للمُسجِّل لا يحمله.
    const res = await provider.send({
      to, subject: msg.subject, html: msg.html, text: msg.text,
      headers: { 'X-Qimmah-Template': templateId, 'X-Qimmah-Lang': lang },
    })
    return { res, bytes: msg.bytes }
  }

  return {
    /** يدرج رسالة غير حاملة لسرّ في الطابور. */
    async enqueue({ idempotencyKey, templateId, lang, to, data }) {
      const tpl = TEMPLATES[templateId]
      if (!tpl) throw new Error(`EMAIL_UNKNOWN_TEMPLATE:${templateId}`)
      if (tpl.carriesSecret) {
        // البند ① من ترويسة `templates.mjs` — بنيويّ لا اتفاقيّ.
        throw new Error(`EMAIL_SECRET_TEMPLATE_NOT_QUEUEABLE:${templateId}`)
      }
      assertQueueableData(data)
      // تحقّق مبكر من اكتمال رموز المستدعي: القالب يُصاغ الآن بـ**نائبٍ** عن
      // كل رمز متأخّر ويُرمى الناتج. الغرض كشف النقص عند الإدراج لا في الطابور.
      const placeholders = Object.fromEntries(
        (tpl.lateTokens ?? []).map((n) => [n, 'https://example.invalid/placeholder']),
      )
      const missing = callerTokens(templateId, lang)
        .filter((n) => data?.[n] === undefined || data?.[n] === null || data?.[n] === '')
      if (missing.length) throw new Error(`EMAIL_TOKEN_MISSING:${missing.join(',')}`)
      build(templateId, lang, { ...data, ...placeholders })

      const { inserted, job } = await store.insert({
        idempotencyKey, templateId, lang, to, data,
        state: 'queued', attempts: 0, nextAttemptAt: now(),
        lastReason: null, createdAt: now(), sentAt: null, deadAt: null,
      })
      log('enqueue', {
        outcome: inserted ? 'queued' : 'duplicate',
        templateId, lang, idempotencyKey, jobId: job.id,
      })
      return { outcome: inserted ? 'queued' : 'duplicate', jobId: job.id }
    },

    /** يعالج كل ما حان وقته. يُنادى من مجدول (cron) أو من الإثبات. */
    async runDue() {
      const due = await store.listDue(now())
      const outcomes = []
      for (const job of due) {
        const attempt = job.attempts + 1
        const { res, bytes } = await attemptSend(job.templateId, job.lang, job.to, job.data)
        if (res.ok) {
          await store.update(job.idempotencyKey, {
            state: 'sent', attempts: attempt, sentAt: now(), lastReason: null,
            // تُمحى الحمولة عند النجاح: انتهت حاجتها، وبقاؤها بيانات بلا سبب.
            data: null, to: null,
          })
          log('sent', { templateId: job.templateId, lang: job.lang, attempt, bytes,
            recipientDomain: recipientDomain(job.to), jobId: job.id })
          outcomes.push({ key: job.idempotencyKey, outcome: 'sent', attempt })
          continue
        }
        const permanent = !res.retryable || attempt >= policy.maxAttempts
        if (permanent) {
          // الحمولة **تبقى** عند الموت: صندوق الرسائل الميتة يُعاد تشغيله بيد
          // إنسان بعد إصلاح السبب، وإعادة تشغيله بلا حمولته مستحيلة. (وما حمل
          // سرًّا لا حمولة له أصلًا — انظر `sendNow`.) يطابق قيد الهجرة.
          await store.update(job.idempotencyKey, {
            state: 'dead', attempts: attempt, deadAt: now(), lastReason: res.reason,
          })
          log('dead_letter', { templateId: job.templateId, lang: job.lang, attempt,
            reason: res.reason, maxAttempts: policy.maxAttempts, jobId: job.id })
          outcomes.push({ key: job.idempotencyKey, outcome: 'dead', reason: res.reason, attempt })
          continue
        }
        const wait = delayFor(attempt, policy) + jitter(attempt)
        await store.update(job.idempotencyKey, {
          attempts: attempt, nextAttemptAt: now() + wait, lastReason: res.reason,
        })
        log('retry_scheduled', { templateId: job.templateId, attempt, reason: res.reason,
          nextAttemptInMs: wait, jobId: job.id })
        outcomes.push({ key: job.idempotencyKey, outcome: 'retry', reason: res.reason, attempt, wait })
      }
      return outcomes
    },

    /**
     * تمرير مباشر للقوالب الحاملة للسرّ. لا حمولة تُخزَّن — أثرٌ فقط.
     * الإعادة داخل النداء نفسه (السرّ في الذاكرة)، وبعد انتهائه لا سبيل لإعادته.
     */
    async sendNow({ idempotencyKey, templateId, lang, to, data }) {
      const tpl = TEMPLATES[templateId]
      if (!tpl) throw new Error(`EMAIL_UNKNOWN_TEMPLATE:${templateId}`)

      const { inserted, job } = await store.insert({
        idempotencyKey, templateId, lang,
        // ← لا `to` ولا `data`: أثر بلا حمولة.
        to: null, data: null,
        state: 'sending', attempts: 0, nextAttemptAt: null,
        lastReason: null, createdAt: now(), sentAt: null, deadAt: null,
      })
      if (!inserted) {
        log('send_now', { outcome: 'duplicate', templateId, lang, idempotencyKey, jobId: job.id })
        return { outcome: 'duplicate', jobId: job.id }
      }

      let last = { reason: 'EMAIL_NOT_ATTEMPTED' }
      for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
        const { res, bytes } = await attemptSend(templateId, lang, to, data)
        if (res.ok) {
          await store.update(idempotencyKey, { state: 'sent', attempts: attempt, sentAt: now() })
          log('sent', { templateId, lang, attempt, bytes,
            recipientDomain: recipientDomain(to), jobId: job.id })
          return { outcome: 'sent', attempt, jobId: job.id }
        }
        last = res
        if (!res.retryable) break
        log('retry_inline', { templateId, attempt, reason: res.reason, jobId: job.id })
      }
      await store.update(idempotencyKey, {
        state: 'dead', deadAt: now(), lastReason: last.reason,
      })
      // الصدق هنا مكلف وضروري: السرّ ضاع مع الفشل، فالمُخرَج يقول ذلك صراحةً
      // كي يُصدر المشغّل كودًا **جديدًا** بدل انتظار إعادةٍ مستحيلة.
      log('dead_letter', { templateId, lang, reason: last.reason,
        outcome: 'secret_unrecoverable', jobId: job.id })
      return { outcome: 'dead', reason: last.reason, secretUnrecoverable: true, jobId: job.id }
    },
  }
}
