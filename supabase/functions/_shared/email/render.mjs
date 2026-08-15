// ============================================================================
// مُصيِّر البريد — منطق خالص، بلا شبكة وبلا Deno وبلا وقت.
// ============================================================================
// مفصول عن كل شيء آخر عمدًا: يُستورَد من Node مباشرةً فتُثبَت القوالب بلا
// طرفية ولا مزوّد ولا متصفّح.
//
// ─────────────────────────────────────────────────────────────────────────────
// ثلاثة ثوابت بنيوية، كلٌّ منها يمنع خطأً وقع في بريد معاملات قبلنا:
//
//  ① **القالب بنية لا نصّ.** كل رسالة تُعلَن كقائمة كتل (`blocks`)، ومنها
//     يُشتقّ HTML **والنصّ الصِّرف معًا**. الشائع أن يُكتبا يدويًا فيتباعدا:
//     يُصحَّح الـHTML وينسى النص، فيقرأ عميلُ بريدٍ نصّيّ نسخةً بائتة. هنا
//     التباعد **مستحيل** لأن المصدر واحد.
//
//  ② **الصيرورة حتميّة.** لا `Date.now()` ولا عشوائية ولا ترتيب كائنات متغيّر.
//     كل قيمة متغيّرة تدخل **رمزًا مُعلَنًا** (`{{token}}`) من المستدعي. فلو
//     أخذ القالب الوقت بنفسه لصار «نفس الرسالة» بايتين مختلفين كل ثانية،
//     ولانهار كل فحص مقارنة وكل مفتاح منع تكرار مبنيّ على المحتوى.
//
//  ③ **الرمز الناقص خطأ مسمّى لا فراغ صامت.** قالب يطلب `{{orderRef}}` ولا
//     يجده يرفع `EMAIL_TOKEN_MISSING:orderRef`. البديل الشائع — ترك الفراغ —
//     يُرسل للعميل رسالة فيها «طلبك رقم » ولا أحد يعلم.
// ============================================================================

/** أقصى حجم لجسم HTML. Gmail يقصّ ما تجاوز ~102KB ويخفي آخر الرسالة. */
export const MAX_HTML_BYTES = 102 * 1024

/** رموز ممنوعة في أي حمولة قالب — منعًا بنيويًا لا نيّةً (§0.1 · حظر كلمات المرور). */
export const FORBIDDEN_TOKEN_NAMES = ['password', 'passcode', 'pin', 'secret', 'apiKey', 'token']

/**
 * العبارات الممنوعة في كل سطح يراه المستخدم — الميثاق §0.1 وقواعد الكتابة.
 * تُفحَص **بلا حساسية لحالة الأحرف** وبعد تطبيع المسافات.
 */
export const FORBIDDEN_PHRASES = [
  'مدى الحياة',
  'lifetime',
  'كل التحديثات الحالية والمستقبلية',
  // زيادتان يفرضهما `test:premium-copy` المخطَّط في وثيقة المعمار §4.5.
  'للأبد',
  'كل التحديثات الحالية',
]

/** النصّ المعتمد وحده لوصف Premium — لا صيغة ثانية. */
export const APPROVED_PREMIUM_LINE = {
  ar: 'يشمل تحديثات قِمّة — بلا اشتراك شهري',
  en: 'Includes Qimmah updates — no monthly subscription',
}

// ── لوحة الألوان ───────────────────────────────────────────────────────────
// قيم صريحة على **كل** عنصر نصّي عمدًا. عملاء البريد الذين يقلبون الألوان في
// الوضع الداكن (Gmail على أندرويد، Outlook.com) يقلبون ما لم يُصرَّح به فقط،
// فالنصّ بلا `color` صريح يصير أسود على أسود.
const C = {
  pageBg: '#F5F1EA',
  cardBg: '#FFFFFF',
  ink: '#1F1B16',
  inkSoft: '#4A423A',
  inkMuted: '#6B6055',
  line: '#E3DACD',
  brand: '#B0440B',
  brandBg: '#FEF3EB',
  codeBg: '#FBF6EF',
  legalBg: '#F2EEE7',
}

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Tahoma,'Helvetica Neue',Arial,sans-serif"
const MONO = "'SF Mono',SFMono-Regular,Menlo,Consolas,'Courier New',monospace"

/** تهريب HTML لكل قيمة مُستبدَلة — بلا استثناء. */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** روابط: يُقبل http/https/mailto فقط. أي مخطّط آخر ⇒ خطأ مسمّى. */
export function assertSafeHref(href) {
  const h = String(href || '').trim()
  if (!/^(https:\/\/|mailto:)/i.test(h)) {
    throw new Error(`EMAIL_UNSAFE_HREF:${h.slice(0, 40)}`)
  }
  return h
}

/**
 * يستبدل `{{token}}` من `data`.
 * @throws EMAIL_TOKEN_MISSING:<name>  رمز مطلوب غير مُمرَّر.
 */
export function substitute(text, data) {
  return String(text).replace(/\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g, (_m, name) => {
    const v = data[name]
    if (v === undefined || v === null || v === '') {
      throw new Error(`EMAIL_TOKEN_MISSING:${name}`)
    }
    return String(v)
  })
}

/** يجمع أسماء الرموز المذكورة في نصّ. */
export function tokensIn(text) {
  return [...String(text).matchAll(/\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g)].map((m) => m[1])
}

const esc = (s, data) => escapeHtml(substitute(s, data))
const plain = (s, data) => substitute(s, data)

// ── تصيير الكتل ────────────────────────────────────────────────────────────
// كل كتلة تُنتج صفًّا في جدول واحد. لا `div` تخطيطي ولا flex ولا grid: Outlook
// على ويندوز يستخدم محرّك Word ولا يفهم أيًّا منها.

function cell(inner, { pad = '0 28px' } = {}) {
  return `<tr><td style="padding:${pad};">${inner}</td></tr>`
}

function blockHtml(block, data, dir) {
  const start = dir === 'rtl' ? 'right' : 'left'
  switch (block.type) {
    case 'heading':
      return cell(
        `<h1 style="margin:0 0 14px;font-family:${FONT};font-size:22px;line-height:1.45;`
        + `font-weight:700;color:${C.ink};text-align:${start};">${esc(block.text, data)}</h1>`,
        { pad: '4px 28px 0' },
      )
    case 'lead':
      return cell(
        `<p style="margin:0 0 16px;font-family:${FONT};font-size:17px;line-height:1.75;`
        + `color:${C.ink};text-align:${start};">${esc(block.text, data)}</p>`,
      )
    case 'text':
      return cell(
        `<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.8;`
        + `color:${C.inkSoft};text-align:${start};">${esc(block.text, data)}</p>`,
      )
    case 'steps': {
      const items = block.items.map((it, i) => (
        `<tr><td width="30" valign="top" style="padding:0 0 10px;font-family:${FONT};`
        + `font-size:15px;line-height:1.8;font-weight:700;color:${C.brand};">${i + 1}.</td>`
        + `<td valign="top" style="padding:0 0 10px;font-family:${FONT};font-size:15px;`
        + `line-height:1.8;color:${C.inkSoft};text-align:${start};">${esc(it, data)}</td></tr>`
      )).join('')
      return cell(`<table role="presentation" dir="${dir}" width="100%" cellpadding="0" cellspacing="0" border="0">${items}</table>`)
    }
    case 'bullets': {
      const items = block.items.map((it) => (
        `<tr><td width="18" valign="top" style="padding:0 0 8px;font-family:${FONT};`
        + `font-size:15px;line-height:1.8;color:${C.brand};">&bull;</td>`
        + `<td valign="top" style="padding:0 0 8px;font-family:${FONT};font-size:15px;`
        + `line-height:1.8;color:${C.inkSoft};text-align:${start};">${esc(it, data)}</td></tr>`
      )).join('')
      return cell(`<table role="presentation" dir="${dir}" width="100%" cellpadding="0" cellspacing="0" border="0">${items}</table>`)
    }
    case 'facts': {
      const rows = block.rows.map(([k, v]) => (
        `<tr><td style="padding:9px 0;border-bottom:1px solid ${C.line};font-family:${FONT};`
        + `font-size:14px;line-height:1.6;color:${C.inkMuted};text-align:${start};white-space:nowrap;">`
        + `${esc(k, data)}</td>`
        + `<td style="padding:9px 0;border-bottom:1px solid ${C.line};font-family:${FONT};`
        + `font-size:14px;line-height:1.6;font-weight:600;color:${C.ink};`
        + `text-align:${dir === 'rtl' ? 'left' : 'right'};">${esc(v, data)}</td></tr>`
      )).join('')
      return cell(
        `<table role="presentation" dir="${dir}" width="100%" cellpadding="0" cellspacing="0" border="0" `
        + `style="margin:2px 0 18px;">${rows}</table>`,
      )
    }
    case 'code':
      return cell(
        `<table role="presentation" dir="${dir}" width="100%" cellpadding="0" cellspacing="0" border="0" `
        + `style="margin:4px 0 18px;background:${C.codeBg};border:1px solid ${C.line};border-radius:10px;">`
        + `<tr><td align="center" style="padding:18px 14px;">`
        + `<p style="margin:0 0 8px;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.inkMuted};">`
        + `${esc(block.label, data)}</p>`
        + `<p dir="ltr" style="margin:0;font-family:${MONO};font-size:24px;line-height:1.4;`
        + `letter-spacing:2px;font-weight:700;color:${C.ink};word-break:break-all;">`
        + `${esc(block.value, data)}</p>`
        + `</td></tr></table>`,
      )
    case 'button': {
      const href = escapeHtml(assertSafeHref(substitute(block.href, data)))
      return cell(
        `<table role="presentation" dir="${dir}" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;">`
        + `<tr><td align="center" bgcolor="${C.brand}" style="border-radius:10px;">`
        + `<a href="${href}" style="display:inline-block;padding:14px 30px;font-family:${FONT};`
        + `font-size:16px;line-height:1;font-weight:700;color:#FFFFFF;text-decoration:none;">`
        + `${esc(block.label, data)}</a></td></tr></table>`,
      )
    }
    case 'note':
      return cell(
        `<p style="margin:0 0 14px;font-family:${FONT};font-size:13px;line-height:1.75;`
        + `color:${C.inkMuted};text-align:${start};">${esc(block.text, data)}</p>`,
      )
    case 'divider':
      return cell(`<div style="height:1px;background:${C.line};margin:6px 0 20px;line-height:1px;font-size:0;">&nbsp;</div>`)
    case 'legal': {
      // فصحى، ومفصولة **بصريًا** لا مندسّة في نبرة الرسالة (الميثاق §6/٣).
      const lines = block.lines.map((l) => (
        `<p style="margin:0 0 8px;font-family:${FONT};font-size:12px;line-height:1.85;`
        + `color:${C.inkMuted};text-align:${start};">${esc(l, data)}</p>`
      )).join('')
      return cell(
        `<table role="presentation" dir="${dir}" width="100%" cellpadding="0" cellspacing="0" border="0" `
        + `style="margin:6px 0 4px;background:${C.legalBg};border-radius:10px;">`
        + `<tr><td style="padding:16px 18px;">`
        + `<p style="margin:0 0 8px;font-family:${FONT};font-size:11px;line-height:1.6;`
        + `letter-spacing:.4px;font-weight:700;color:${C.inkMuted};text-align:${start};">`
        + `${esc(block.title, data)}</p>${lines}</td></tr></table>`,
      )
    }
    default:
      throw new Error(`EMAIL_UNKNOWN_BLOCK:${block.type}`)
  }
}

function blockText(block, data) {
  switch (block.type) {
    case 'heading':   return `${plain(block.text, data)}\n${'='.repeat(Math.min(48, plain(block.text, data).length))}`
    case 'lead':
    case 'text':      return plain(block.text, data)
    case 'note':      return plain(block.text, data)
    case 'steps':     return block.items.map((it, i) => `${i + 1}. ${plain(it, data)}`).join('\n')
    case 'bullets':   return block.items.map((it) => `- ${plain(it, data)}`).join('\n')
    case 'facts':     return block.rows.map(([k, v]) => `${plain(k, data)}: ${plain(v, data)}`).join('\n')
    case 'code':      return `${plain(block.label, data)}\n    ${plain(block.value, data)}`
    case 'button':    return `${plain(block.label, data)}:\n${assertSafeHref(substitute(block.href, data))}`
    case 'divider':   return '---'
    case 'legal':     return `[ ${plain(block.title, data)} ]\n${block.lines.map((l) => plain(l, data)).join('\n')}`
    default:          throw new Error(`EMAIL_UNKNOWN_BLOCK:${block.type}`)
  }
}

/**
 * يصيّر رسالة كاملة.
 * @param {object} doc   ناتج `template.build(lang)` — `{ subject, preheader, blocks, footer }`
 * @param {'ar'|'en'} lang
 * @param {Record<string,string|number>} data  قيم الرموز
 * @returns {{ subject: string, html: string, text: string, bytes: number }}
 */
export function renderDocument(doc, lang, data) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  const subject = substitute(doc.subject, data)
  const preheader = substitute(doc.preheader, data)
  const rows = doc.blocks.map((b) => blockHtml(b, data, dir)).join('')

  const html = `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="x-ua-compatible" content="ie=edge">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(subject)}</title>
<style>
  body { margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; }
  img { border:0; outline:none; text-decoration:none; }
  a { color:${C.brand}; }
  @media only screen and (max-width:600px) {
    .q-card { width:100% !important; border-radius:0 !important; }
    .q-pad  { padding-left:18px !important; padding-right:18px !important; }
  }
  @media (prefers-color-scheme: dark) {
    /* الوضع الداكن: يُصرَّح به ولا يُترك للقلب التلقائي. */
    body, .q-page { background:#141210 !important; }
    .q-card { background:#1E1A16 !important; }
    .q-card h1, .q-card p, .q-card td { color:#F1EEE8 !important; }
    .q-muted p, .q-muted td { color:#B9B0A4 !important; }
    a { color:#F8A06A !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.pageBg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${C.pageBg};">${escapeHtml(preheader)}</div>
<table role="presentation" class="q-page" dir="${dir}" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.pageBg};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" class="q-card" dir="${dir}" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:${C.cardBg};border-radius:14px;">
<tr><td class="q-pad" style="padding:26px 28px 6px;">
<p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.4;font-weight:700;color:${C.brand};text-align:${dir === 'rtl' ? 'right' : 'left'};">${escapeHtml(doc.brand)}</p>
</td></tr>
${rows}
<tr><td class="q-pad q-muted" style="padding:6px 28px 26px;">
<div style="height:1px;background:${C.line};margin:4px 0 14px;line-height:1px;font-size:0;">&nbsp;</div>
<p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.75;color:${C.inkMuted};text-align:${dir === 'rtl' ? 'right' : 'left'};">${escapeHtml(substitute(doc.footer, data))}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`

  const text = [
    doc.brand,
    '',
    ...doc.blocks.map((b) => blockText(b, data)),
    '',
    '--',
    substitute(doc.footer, data),
  ].join('\n\n').replace(/\n{3,}/g, '\n\n') + '\n'

  // `TextEncoder` لا `Buffer`: هذا الملف يعمل على Node (الإثباتات) و Deno (الطرفية).
  const bytes = new TextEncoder().encode(html).length
  if (bytes > MAX_HTML_BYTES) {
    throw new Error(`EMAIL_TOO_LARGE:${bytes}`)
  }
  return { subject, html, text, bytes }
}
