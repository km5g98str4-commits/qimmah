// ============================================================================
// test:email-templates — إثبات قوالب بريد المعاملات.
// ============================================================================
// كل حارس هنا مقرون بتأكيد مضادّ يزرع العلّة ويطالب الكاشف بأن **يسقط باسمها**
// (الميثاق §4.2). حارسٌ لم يُهاجَم ليس حارسًا.
//
// التشغيل: npm run test:email-templates
// ============================================================================
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import {
  TEMPLATE_IDS, TEMPLATES, LANGS, getDocument, documentStrings,
  requiredTokens, callerTokens,
} from '../supabase/functions/_shared/email/templates.mjs'
import {
  renderDocument, FORBIDDEN_PHRASES, FORBIDDEN_TOKEN_NAMES,
  APPROVED_PREMIUM_LINE, MAX_HTML_BYTES,
} from '../supabase/functions/_shared/email/render.mjs'
import { renderAll, sampleData } from '../supabase/functions/qimmah-mailer/preview.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const RENDERED = join(ROOT, 'docs/commerce/email/rendered')

const results = []
function check(name, pass, detail = '') {
  results.push({ name, pass })
  console.log(`  ${pass ? '✓' : '✗ FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  return pass
}

// ════════════════════════════════════════════════════════════════════════════
// الكواشف — تُطبَّق على القوالب الحقيقية **وعلى مسوخ مزروعة**، فتُقاس بكلَيهما.
// ════════════════════════════════════════════════════════════════════════════

/** يعيد كل مخالفة عبارة ممنوعة، **مسمّاةً** بالقالب واللغة والعبارة والسطر. */
function scanForbiddenPhrases(strings, label) {
  const hits = []
  for (const s of strings) {
    const norm = String(s).replace(/\s+/g, ' ')
    for (const p of FORBIDDEN_PHRASES) {
      // بلا حساسية لحالة الأحرف — "LIFETIME" و"Lifetime" و"lifetime" سواء.
      if (norm.toLowerCase().includes(p.toLowerCase())) {
        hits.push({ label, phrase: p, text: norm.slice(0, 60) })
      }
    }
  }
  return hits
}

/** مصطلحات الفوترة المتكرّرة — الادّعاء ممنوع، والنفي مطلوب. */
const BILLING_TERMS = ['اشتراك', 'تجديد', 'يتجدّد', 'subscription', 'renewal', 'renew', 'recurring', 'billing']
// «ما فيه» نافٍ عامّي أصيل ويجب أن يُعدّ نافيًا — وإلا سقط نصّ سليم.
const NEGATORS = ['بلا', 'ولا', 'لا ', 'ليس', 'ما فيه', 'ما في', 'no ', 'never', 'not ', 'without']

/**
 * أي ذكرٍ لمصطلح فوترة **لا يسبقه نفي في الجملة نفسها** ⇒ ادّعاء اشتراك متجدّد.
 * الفحص بالسَّبق لا بمجرّد الحضور: «اشتراك شهري متجدّد ولا يمكن إلغاؤه» تحمل
 * نافيًا، لكنه بعد الادّعاء فلا ينفيه — وهذا بالضبط ما يلتقطه شرط السَّبق.
 */
function scanRecurringClaims(strings, label) {
  const hits = []
  for (const s of strings) {
    const norm = String(s).replace(/\s+/g, ' ')
    const lower = norm.toLowerCase()
    for (const term of BILLING_TERMS) {
      const at = lower.indexOf(term.toLowerCase())
      if (at < 0) continue
      const before = lower.slice(0, at)
      if (!NEGATORS.some((n) => before.includes(n.toLowerCase()))) {
        hits.push({ label, term, text: norm.slice(0, 70) })
      }
    }
  }
  return hits
}

/** أي رمز أو نصّ يوحي بكلمة مرور مُولَّدة أو مُرسَلة. */
// ⚠️ الكشف عن **إفشاء** كلمة مرور لا عن ذكرها. «your password is not from us»
// جملة سليمة بل مطلوبة (تحذير تصيّد)، فاشتراط قيمةٍ تشبه سرًّا بعد «هي/is» هو
// ما يفرّق الإفشاء عن التحذير — بلا هذا الشرط يُسقط الحارسُ النصَّ الصحيح.
const PASSWORD_GIVEAWAY = [
  /\{\{\s*(password|passcode|pin|generatedPassword|tempPassword)\s*\}\}/i,
  /كلمة\s+(ال)?مرور\s*(المؤقّتة|الجديدة)?\s*(هي|:)\s*\S/,
  /(your|the)\s+(new\s+|temporary\s+)?password\s+is\s*:?\s*["'`]?[A-Za-z0-9!@#$%^&*_-]{6,}/i,
]
function scanPasswordGiveaway(strings, label) {
  const hits = []
  for (const s of strings) {
    for (const re of PASSWORD_GIVEAWAY) {
      if (re.test(String(s))) hits.push({ label, pattern: String(re), text: String(s).slice(0, 60) })
    }
  }
  return hits
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n▶ ١) الجرد — خمسة قوالب × لغتان، وكلها تُصاغ\n')
// ════════════════════════════════════════════════════════════════════════════
check('خمسة قوالب مُعلَنة', TEMPLATE_IDS.length === 5, TEMPLATE_IDS.join(', '))
check('لغتان: عربي وإنجليزي', LANGS.join(',') === 'ar,en')

const rendered = {}
for (const id of TEMPLATE_IDS) {
  for (const lang of LANGS) {
    const data = { ...sampleData(id, lang) }
    for (const n of TEMPLATES[id].lateTokens ?? []) data[n] = 'https://example.com/invite/sample-token'
    rendered[`${id}.${lang}`] = renderDocument(getDocument(id, lang), lang, data)
  }
}
check('كل قالب × لغة يُصاغ بلا استثناء', Object.keys(rendered).length === 10)

check('مجموعتا رموز العربي والإنجليزي متطابقتان في كل قالب',
  TEMPLATE_IDS.every((id) => requiredTokens(id, 'ar').join() === requiredTokens(id, 'en').join()),
  TEMPLATE_IDS.map((id) => `${id}:${requiredTokens(id, 'ar').length}`).join(' '))

// ════════════════════════════════════════════════════════════════════════════
console.log('\n▶ ٢) العبارات الممنوعة — الفحص، ثم التأكيد المضادّ\n')
// ════════════════════════════════════════════════════════════════════════════
const allHits = []
for (const id of TEMPLATE_IDS) {
  for (const lang of LANGS) {
    const label = `${id}.${lang}`
    allHits.push(...scanForbiddenPhrases(documentStrings(getDocument(id, lang)), label))
    // والمصاغ أيضًا — لا القوالب وحدها: التصيير قد يركّب عبارة لم تكن في مصدرها.
    allHits.push(...scanForbiddenPhrases([rendered[label].html, rendered[label].text, rendered[label].subject], `${label}#rendered`))
  }
}
check(`لا عبارة ممنوعة في أي قالب أو مصاغ (${FORBIDDEN_PHRASES.length} عبارة × ٢٠ سطحًا)`,
  allHits.length === 0, allHits.map((h) => `${h.label}:${h.phrase}`).join(' '))

// التأكيد المضادّ: تُزرع كل عبارة ممنوعة في مستند مستنسَخ، ويجب أن يسقط الكاشف
// **باسم العبارة** — لا بانهيار تقني ولا بصمت.
let plantedCaught = 0
for (const phrase of FORBIDDEN_PHRASES) {
  const doc = JSON.parse(JSON.stringify(getDocument('premium_purchase', 'ar')))
  doc.blocks.push({ type: 'text', text: `قِمّة Premium — ${phrase} لكل المشتركين` })
  // بعض العبارات الممنوعة تتضمّن بعضها («كل التحديثات الحالية» داخل الأطول)،
  // فالمعيار حضور العبارة المزروعة **باسمها** لا عدد المطابقات.
  const hits = scanForbiddenPhrases(documentStrings(doc), 'planted')
  if (hits.some((h) => h.phrase === phrase)) plantedCaught++
}
check('انتهاك مزروع لكل عبارة ممنوعة يُسقط الفحص باسم العبارة',
  plantedCaught === FORBIDDEN_PHRASES.length, `${plantedCaught}/${FORBIDDEN_PHRASES.length}`)

// وبحالة أحرف مختلفة — الحظر «بأي حالة أحرف» (قواعد الكتابة).
{
  const doc = JSON.parse(JSON.stringify(getDocument('premium_purchase', 'en')))
  doc.blocks.push({ type: 'text', text: 'Qimmah Premium is a LiFeTiMe deal' })
  const hits = scanForbiddenPhrases(documentStrings(doc), 'planted-case')
  check('«lifetime» بحالة أحرف مخلوطة تُلتقط أيضًا',
    hits.some((h) => h.phrase === 'lifetime'), JSON.stringify(hits))
}

// وبعد إزالة الزرع يعود الفحص نظيفًا — كي لا يكون الكاشف «يسقط دائمًا».
check('بلا زرع يعود الكاشف نظيفًا',
  scanForbiddenPhrases(documentStrings(getDocument('premium_purchase', 'ar')), 'clean').length === 0)

// ════════════════════════════════════════════════════════════════════════════
console.log('\n▶ ٣) النصّ المعتمد لـPremium — حاضر حيث يُوصَف Premium\n')
// ════════════════════════════════════════════════════════════════════════════
for (const id of ['premium_purchase', 'trial_started']) {
  for (const lang of LANGS) {
    check(`${id}.${lang} يحمل النصّ المعتمد وحده`,
      rendered[`${id}.${lang}`].text.includes(APPROVED_PREMIUM_LINE[lang]))
  }
}
check('لا رقم سعر مكتوب في أي قالب (§0.1 — سلة هي من تعرضه)',
  !Object.values(rendered).some((r) => /\b19[.,]99\b|\b1999\b|\b26\s*(ر\.?س|SAR)\b/.test(r.text)))

// ════════════════════════════════════════════════════════════════════════════
console.log('\n▶ ٤) لا ادّعاء اشتراك متجدّد — والنفي يجب أن يسبق المصطلح\n')
// ════════════════════════════════════════════════════════════════════════════
const claimHits = []
for (const id of TEMPLATE_IDS) {
  for (const lang of LANGS) {
    claimHits.push(...scanRecurringClaims(documentStrings(getDocument(id, lang)), `${id}.${lang}`))
  }
}
check('لا ذكر لفوترة متجدّدة بلا نفي سابق له',
  claimHits.length === 0, claimHits.map((h) => `${h.label}:${h.term}`).join(' '))

{
  const doc = JSON.parse(JSON.stringify(getDocument('trial_started', 'ar')))
  doc.blocks.push({ type: 'text', text: 'يتجدّد اشتراكك شهريًا تلقائيًا بعد انتهاء التجربة' })
  const hits = scanRecurringClaims(documentStrings(doc), 'planted')
  check('ادّعاء تجديد تلقائي مزروع يُسقط الفحص باسم المصطلح',
    hits.length > 0 && hits.some((h) => h.term === 'يتجدّد'), JSON.stringify(hits.map((h) => h.term)))
}
{
  // النافي المتأخّر لا يشفع — وهذا ما يميّز فحص السَّبق عن فحص الحضور.
  const doc = JSON.parse(JSON.stringify(getDocument('trial_started', 'ar')))
  doc.blocks.push({ type: 'text', text: 'اشتراك شهري متجدّد ولا يمكن إلغاؤه' })
  check('نافٍ بعد الادّعاء لا يمرّره',
    scanRecurringClaims(documentStrings(doc), 'planted-late-neg').length > 0)
}
{
  const doc = JSON.parse(JSON.stringify(getDocument('trial_started', 'en')))
  doc.blocks.push({ type: 'text', text: 'Your subscription renews automatically every month.' })
  check('ادّعاء إنجليزي مزروع يُلتقط',
    scanRecurringClaims(documentStrings(doc), 'planted-en').length > 0)
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n▶ ٥) الحظر المطلق لكلمات المرور\n')
// ════════════════════════════════════════════════════════════════════════════
const pwHits = []
for (const id of TEMPLATE_IDS) {
  for (const lang of LANGS) pwHits.push(...scanPasswordGiveaway(documentStrings(getDocument(id, lang)), `${id}.${lang}`))
}
check('لا قالب يولّد كلمة مرور أو يعرضها', pwHits.length === 0, JSON.stringify(pwHits))

const tokenViolations = []
for (const id of TEMPLATE_IDS) {
  for (const lang of LANGS) {
    for (const t of requiredTokens(id, lang)) {
      if (FORBIDDEN_TOKEN_NAMES.includes(t)) tokenViolations.push(`${id}.${lang}:${t}`)
    }
  }
}
check('لا رمز باسم سرّي في أي قالب', tokenViolations.length === 0, tokenViolations.join(' '))

{
  const doc = JSON.parse(JSON.stringify(getDocument('premium_purchase', 'ar')))
  doc.blocks.push({ type: 'text', text: 'كلمة المرور المؤقّتة هي {{password}}' })
  const hits = scanPasswordGiveaway(documentStrings(doc), 'planted')
  check('قالب مزروع يمنح كلمة مرور يُسقط الفحص', hits.length >= 1, `${hits.length} مطابقة`)
}
{
  const doc = JSON.parse(JSON.stringify(getDocument('premium_purchase', 'en')))
  doc.blocks.push({ type: 'text', text: 'Your temporary password is 4f9x-22a' })
  check('الصيغة الإنجليزية مزروعةً تُلتقط أيضًا',
    scanPasswordGiveaway(documentStrings(doc), 'planted-en').length >= 1)
}
// والرسائل تقول العكس صراحةً — لا سكوتًا.
check('رسالة الشراء تنصّ أن كلمة المرور من المستخدم لا منّا',
  rendered['premium_purchase.ar'].text.includes('ما نرسل لك كلمة مرور')
  && rendered['premium_purchase.en'].text.includes('never send you a password'))

// ════════════════════════════════════════════════════════════════════════════
console.log('\n▶ ٦) الاتجاه — RTL للعربية و LTR للإنجليزية، بنيويًا\n')
// ════════════════════════════════════════════════════════════════════════════
for (const id of TEMPLATE_IDS) {
  const ar = rendered[`${id}.ar`].html
  const en = rendered[`${id}.en`].html
  const arTables = [...ar.matchAll(/<table[^>]*>/g)].map((m) => m[0])
  const enTables = [...en.matchAll(/<table[^>]*>/g)].map((m) => m[0])
  check(`${id}: جذر العربية rtl وكل جداولها rtl`,
    ar.includes('<html lang="ar" dir="rtl">') && arTables.every((t) => t.includes('dir="rtl"')),
    `${arTables.length} جدولًا`)
  check(`${id}: جذر الإنجليزية ltr وكل جداولها ltr`,
    en.includes('<html lang="en" dir="ltr">') && enTables.every((t) => t.includes('dir="ltr"')),
    `${enTables.length} جدولًا`)
}
// التأكيد المضادّ للاتجاه: لو صُيِّرت العربية بلغة `en` لسقط الفحص.
{
  const wrong = renderDocument(getDocument('trial_started', 'ar'), 'en', sampleData('trial_started', 'ar'))
  check('تصيير مستند عربي باتجاه إنجليزي يُسقط فحص الجذر',
    !wrong.html.includes('<html lang="ar" dir="rtl">'))
}
// خصائص فيزيائية تكسر العربية — لا وجود لها.
/**
 * الخاصية الفيزيائية تكسر العربية **حين تكون غير متماثلة**. زوجٌ متماثل
 * (`padding-left:18px` مع `padding-right:18px`) محايد اتجاهيًا ولا يكسر شيئًا،
 * وحظره حظرُ الشكل لا المعنى. فالفحص على عدم التماثل وعلى `margin`/`float`.
 */
function directionalHazards(html) {
  const bad = []
  if (/margin-(left|right)\s*:/.test(html)) bad.push('margin-left/right')
  if (/float\s*:/.test(html)) bad.push('float')
  const l = [...html.matchAll(/padding-left\s*:\s*([^;!}]+)/g)].map((m) => m[1].trim())
  const r = [...html.matchAll(/padding-right\s*:\s*([^;!}]+)/g)].map((m) => m[1].trim())
  if (l.length !== r.length || l.some((v, i) => v !== r[i])) bad.push(`padding غير متماثل L=${l} R=${r}`)
  return bad
}
const physical = Object.entries(rendered)
  .map(([k, r]) => [k, directionalHazards(r.html)])
  .filter(([, bad]) => bad.length > 0)
check('لا خطر اتجاهي: بلا margin-left/right · بلا float · وpadding الأفقي متماثل',
  physical.length === 0, physical.map(([k, b]) => `${k}:${b.join('/')}`).join(' '))
// التأكيد المضادّ: حشوة غير متماثلة مزروعة تُلتقط باسمها.
check('padding أفقي غير متماثل مزروع يُلتقط',
  directionalHazards('<p style="padding-left:18px;padding-right:4px">x</p>').length === 1)
check('margin فيزيائي مزروع يُلتقط',
  directionalHazards('<p style="margin-left:8px">x</p>').some((b) => b.includes('margin')))

// ════════════════════════════════════════════════════════════════════════════
console.log('\n▶ ٧) صلاحية عملاء البريد — بلا أصول خارجية، وتحت حدّ القصّ\n')
// ════════════════════════════════════════════════════════════════════════════
const external = Object.entries(rendered).filter(([, r]) =>
  /<img|src\s*=|url\(|@import|<link|<script/i.test(r.html))
check('لا أصل خارجي في أي رسالة (img · src · url() · @import · link · script)',
  external.length === 0, external.map(([k]) => k).join(' '))

const oversized = Object.entries(rendered).filter(([, r]) => r.bytes > MAX_HTML_BYTES)
check(`كل رسالة تحت حدّ قصّ Gmail (${MAX_HTML_BYTES} بايت)`,
  oversized.length === 0,
  `الأكبر: ${Math.max(...Object.values(rendered).map((r) => r.bytes))} بايت`)

check('كل رسالة تُعلن نظامي الألوان (سلامة الوضع الداكن)',
  Object.values(rendered).every((r) =>
    r.html.includes('name="color-scheme" content="light dark"')
    && r.html.includes('@media (prefers-color-scheme: dark)')))
check('كل نصّ في الرسالة يحمل لونًا صريحًا (لا يُترك للقلب التلقائي)',
  Object.values(rendered).every((r) => !/<p style="(?![^"]*color:)/.test(r.html)))
check('التخطيط بالجداول لا بـflex/grid (محرّك Word في Outlook)',
  Object.values(rendered).every((r) => !/display\s*:\s*(flex|grid)/.test(r.html)))

// ════════════════════════════════════════════════════════════════════════════
console.log('\n▶ ٨) الكتلة القانونية — واحدة، مفصولة بصريًا، معنونة\n')
// ════════════════════════════════════════════════════════════════════════════
for (const id of TEMPLATE_IDS) {
  const doc = getDocument(id, 'ar')
  const legal = doc.blocks.filter((b) => b.type === 'legal')
  check(`${id}: كتلة قانونية واحدة لا أكثر`, legal.length === 1, `${legal.length}`)
  check(`${id}: الكتلة معنونة ومفصولة بخلفية مغايرة`,
    !!legal[0]?.title && rendered[`${id}.ar`].html.includes('background:#F2EEE7'))
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n▶ ٩) الحتميّة، والمعاينات المودَعة تطابق ما يُصاغ الآن\n')
// ════════════════════════════════════════════════════════════════════════════
const twice = TEMPLATE_IDS.every((id) => LANGS.every((lang) => {
  const data = { ...sampleData(id, lang) }
  for (const n of TEMPLATES[id].lateTokens ?? []) data[n] = 'https://example.com/invite/sample-token'
  const a = renderDocument(getDocument(id, lang), lang, data).html
  const b = renderDocument(getDocument(id, lang), lang, data).html
  return a === b
}))
check('التصيير حتمي — نداءان بنفس المُدخل يعطيان نفس البايتات', twice)

const files = await renderAll()
const stale = []
for (const f of files) {
  const path = join(RENDERED, f.name)
  if (!existsSync(path)) { stale.push(`${f.name}: مفقود`); continue }
  if (readFileSync(path, 'utf8') !== f.content) stale.push(`${f.name}: بائت`)
}
check(`المعاينات المودَعة (${files.length} ملفًا) تطابق ما يُصاغ الآن`,
  stale.length === 0, stale.join(' · ') || 'docs/commerce/email/rendered/')
check('المعاينة تمرّ بمسار الإرسال الحقيقي (تشمل الحامل للسرّ)',
  files.some((f) => f.name === 'access_code.ar.html'))
check('لا كود حقيقي في أي معاينة — العيّنة موسومة',
  files.filter((f) => f.name.startsWith('access_code'))
    .every((f) => f.content.includes('SAMPLE-CODE-0000')))

// ════════════════════════════════════════════════════════════════════════════
console.log('\n▶ ١٠) الرمز الناقص يسقط باسمه، لا بفراغ صامت\n')
// ════════════════════════════════════════════════════════════════════════════
function mustThrow(name, fn, expect) {
  try { fn(); return check(name, false, 'لم يُرفع أي استثناء') }
  catch (e) {
    const m = String(e.message || e)
    return check(name, m.includes(expect), m.slice(0, 90))
  }
}
mustThrow('رمز مفقود ⇒ EMAIL_TOKEN_MISSING باسمه',
  () => renderDocument(getDocument('support_fallback', 'ar'), 'ar', { supportEmail: 'a@b.co' }),
  'EMAIL_TOKEN_MISSING:reference')
mustThrow('رابط بمخطّط غير آمن ⇒ EMAIL_UNSAFE_HREF',
  () => renderDocument({ ...getDocument('premium_purchase', 'ar') }, 'ar',
    { ...sampleData('premium_purchase', 'ar'), activationUrl: 'javascript:alert(1)' }),
  'EMAIL_UNSAFE_HREF')
mustThrow('قالب مجهول ⇒ EMAIL_UNKNOWN_TEMPLATE', () => getDocument('nope', 'ar'), 'EMAIL_UNKNOWN_TEMPLATE')
mustThrow('لغة مجهولة ⇒ EMAIL_UNKNOWN_LANG', () => getDocument('trial_started', 'fr'), 'EMAIL_UNKNOWN_LANG')

// الحقن: قيمة رمز تحمل HTML تُهرَّب ولا تُنفَّذ.
{
  const r = renderDocument(getDocument('support_fallback', 'ar'), 'ar',
    { reference: '<script>alert(1)</script>', supportEmail: 'a@b.co' })
  check('قيمة رمز تحمل HTML تُهرَّب بالكامل',
    !r.html.includes('<script>') && r.html.includes('&lt;script&gt;'))
}

// رموز المستدعي لا تشمل المسكوك متأخّرًا — وهذا ما يمنع تمرير رابط دعوة إلينا.
check('رابط التفعيل ليس من رموز المستدعي',
  !callerTokens('premium_purchase', 'ar').includes('activationUrl')
  && requiredTokens('premium_purchase', 'ar').includes('activationUrl'))

// ════════════════════════════════════════════════════════════════════════════
const failed = results.filter((r) => !r.pass)
console.log(`\n${'─'.repeat(70)}`)
console.log(`  ${results.length - failed.length}/${results.length} فحصًا ناجحًا`)
if (failed.length) {
  console.log(`\n✗ ${failed.length} فحصًا ساقطًا:`)
  for (const f of failed) console.log(`   - ${f.name}`)
  process.exit(1)
}
console.log('✓ test:email-templates — كل الفحوص ناجحة\n')
