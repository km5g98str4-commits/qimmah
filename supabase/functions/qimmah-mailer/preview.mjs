// ============================================================================
// التمرين الجاف — يصيّر كل قالب × كل لغة إلى ملفات يفتحها إنسان.
// ============================================================================
// لا مزوّد ولا شبكة ولا قاعدة. يمرّ عبر **نفس** مسار الإرسال الحقيقي
// (`createMailer` + مزوّد التمرين الجاف)، فما يُقرأ هنا هو ما سيصل البريد
// حرفيًا — لا مسار معاينة موازٍ يشيخ وحده.
//
// التشغيل: node scripts/run-email-render-proof.mjs   (يستدعي `renderAll`)
// ============================================================================

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { TEMPLATE_IDS, TEMPLATES, LANGS, getDocument } from '../_shared/email/templates.mjs'
import { renderDocument } from '../_shared/email/render.mjs'
import { createDryRunProvider } from '../_shared/email/provider.mjs'
import { createMailer, createMemoryStore } from '../_shared/email/outbox.mjs'
import { createSafeLogger } from '../_shared/email/redact.mjs'

/**
 * بيانات معاينة **موسومة بوضوح** (الميثاق §5: لا بيانات وهمية بلا وسم).
 * كلها ثابتة — وهذا ما يجعل المعاينة قابلة للمقارنة بايتًا ببايت.
 */
export const SAMPLE = {
  ar: {
    premium_purchase:     { orderRef: 'عيّنة-١٠٢٩', recipientEmail: 'sample@example.com' },
    access_code:          { code: 'SAMPLE-CODE-0000', durationDays: '١٤ يومًا' },
    trial_started:        { trialEndsAt: 'الأحد ١٩ أغسطس ٢٠٢٦، ٩:٤٠ مساءً (عيّنة)' },
    activation_succeeded: { grantLabel: 'قِمّة Premium', grantDetail: 'مربوطة ببريدك — بلا تاريخ انتهاء' },
    support_fallback:     { reference: 'عيّنة-REF-8842' },
  },
  en: {
    premium_purchase:     { orderRef: 'SAMPLE-1029', recipientEmail: 'sample@example.com' },
    access_code:          { code: 'SAMPLE-CODE-0000', durationDays: '14 days' },
    trial_started:        { trialEndsAt: 'Sunday 19 August 2026, 9:40 PM (sample)' },
    activation_succeeded: { grantLabel: 'Qimmah Premium', grantDetail: 'Tied to your email — no expiry date' },
    support_fallback:     { reference: 'SAMPLE-REF-8842' },
  },
}

export const SAMPLE_SUPPORT = 'qimmah.support@gmail.com'

/** يبني حمولة رموز قالب بلغة، بما فيها عنوان الدعم. */
export function sampleData(templateId, lang) {
  return { ...SAMPLE[lang][templateId], supportEmail: SAMPLE_SUPPORT }
}

/**
 * يصيّر كل شيء عبر مسار الإرسال الحقيقي ويعيد الملفات في الذاكرة.
 * @returns {Promise<Array<{ name: string, content: string }>>}
 */
export async function renderAll() {
  const captured = []
  const provider = createDryRunProvider()
  const mailer = createMailer({
    store: createMemoryStore(),
    provider,
    clock: () => 0,                       // زمن مجمَّد ⇒ صيرورة حتميّة تمامًا.
    // سكّاك معاينة: رابط وهمي ثابت على نطاق محجوز، بدل نداء Supabase Auth.
    resolveLateTokens: async () => ({ activationUrl: 'https://example.com/invite/sample-token' }),
    log: createSafeLogger(() => {}),      // لا ضجيج، ولا تسريب — نفس المُسجِّل الآمن.
  })

  for (const templateId of TEMPLATE_IDS) {
    for (const lang of LANGS) {
      const data = sampleData(templateId, lang)
      const req = {
        idempotencyKey: `preview:${templateId}:${lang}`,
        templateId, lang, to: 'sample@example.com', data,
      }
      // نفس التفرّع الحقيقي: الحامل للسرّ يمرّ بـ`sendNow`، وغيره بالطابور.
      if (TEMPLATES[templateId].carriesSecret) await mailer.sendNow(req)
      else { await mailer.enqueue(req); await mailer.runDue() }

      const msg = provider.sent[provider.sent.length - 1]
      captured.push({ name: `${templateId}.${lang}.html`, content: msg.html })
      captured.push({ name: `${templateId}.${lang}.txt`, content: `Subject: ${msg.subject}\n\n${msg.text}` })
    }
  }
  captured.push({ name: 'index.html', content: contactSheet() })
  return captured
}

/** فهرس يفتحه إنسان — روابط لكل نسخة، وبيان صريح أن البيانات عيّنة. */
function contactSheet() {
  const rows = TEMPLATE_IDS.map((id) => {
    const secret = TEMPLATES[id].carriesSecret
    const links = LANGS.flatMap((l) => [
      `<a href="./${id}.${l}.html">${l.toUpperCase()} HTML</a>`,
      `<a href="./${id}.${l}.txt">${l.toUpperCase()} نص</a>`,
    ]).join(' · ')
    const tokens = getDocument(id, 'ar') && Object.keys(SAMPLE.ar[id]).join(', ')
    return `<tr><td><code>${id}</code>${secret ? ' <b>· يحمل سرًّا · لا يُطابَر</b>' : ''}</td>`
      + `<td>${links}</td><td><code>${tokens}</code></td></tr>`
  }).join('\n')
  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>معاينات بريد قِمّة</title>
<style>
 body{font-family:system-ui,sans-serif;margin:0;padding:28px;background:#F5F1EA;color:#1F1B16}
 table{border-collapse:collapse;width:100%;max-width:1000px;background:#fff;border-radius:10px;overflow:hidden}
 td,th{padding:12px 14px;border-bottom:1px solid #E3DACD;text-align:right;font-size:14px;vertical-align:top}
 a{color:#B0440B}
 .warn{max-width:1000px;background:#FEF3EB;border:1px solid #F8A06A;border-radius:10px;padding:14px 16px;margin:0 0 18px;font-size:14px}
</style></head><body>
<h1 style="font-size:20px;margin:0 0 12px">معاينات بريد المعاملات — قِمّة</h1>
<p class="warn"><b>بيانات عيّنة موسومة.</b> كل قيمة هنا ثابتة ووهمية (<code>SAMPLE-…</code> · <code>example.com</code>) وُلِّدت بلا مزوّد بريد وبلا شبكة. ولا يوجد كود حقيقي في أي ملف — الأكواد الحقيقية تُخزَّن مبصومة ولا تُصاغ إلا لحظة توليدها.</p>
<table><tr><th>القالب</th><th>النسخ</th><th>الرموز</th></tr>
${rows}
</table></body></html>
`
}

/** يكتب المعاينات إلى مجلّد. */
export function writeAll(files, outDir) {
  mkdirSync(outDir, { recursive: true })
  for (const f of files) writeFileSync(join(outDir, f.name), f.content, 'utf8')
  return files.map((f) => f.name)
}
