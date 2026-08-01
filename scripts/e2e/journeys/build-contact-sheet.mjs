// ورقة التوثيق البصري — يقرأ بيانات الرحلات ويبني صفحة واحدة يشاهدها المؤسس.
//
// لماذا: اللقطات المتفرّقة في مجلدات لا تُشاهَد. الورقة تعرض الرحلة كما جرت —
// لقطة تلو لقطة بترتيبها ووصفها — مع الفحوص والالتقاطات فوقها.
//
// التشغيل: node scripts/e2e/journeys/build-contact-sheet.mjs

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'docs/proof/journeys'
if (!existsSync(ROOT)) {
  console.error(`لا توجد رحلات في ${ROOT}`)
  process.exit(1)
}

const runs = []
for (const journey of readdirSync(ROOT)) {
  const jDir = join(ROOT, journey)
  if (!statSync(jDir).isDirectory()) continue
  for (const variant of readdirSync(jDir)) {
    const manifest = join(jDir, variant, 'manifest.json')
    if (existsSync(manifest)) {
      runs.push({ journey, variant, ...JSON.parse(readFileSync(manifest, 'utf8')) })
    }
  }
}
runs.sort((a, b) => a.journey.localeCompare(b.journey) || a.variant.localeCompare(b.variant))

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

const section = (run) => {
  const passed = run.checks.filter((c) => c.ok).length
  const failed = run.checks.filter((c) => !c.ok)
  const frames = run.frames
    .map(
      (f) => `
      <figure>
        <img src="${esc(run.journey)}/${esc(run.variant)}/${esc(f.file)}" alt="${esc(f.captionAr)}" loading="lazy">
        <figcaption><span class="n">${f.seq}</span> ${esc(f.captionAr)}<br><span class="en">${esc(f.captionEn)}</span></figcaption>
      </figure>`,
    )
    .join('')

  const findings = (run.findings ?? [])
    .map((f) => `<li class="sev-${f.severity === 'عالٍ' ? 'high' : 'mid'}"><b>${esc(f.title)}</b><p>${esc(f.evidence)}</p></li>`)
    .join('')

  const skipped = (run.skipped ?? [])
    .map((s) => `<li><b>${esc(s.name)}</b> — محجوب بـ: ${esc(s.blockedBy)}</li>`)
    .join('')

  return `
  <section>
    <h2>${esc(run.titleAr)} <span class="meta">${esc(run.lang)} · ${esc(run.variant)}</span></h2>
    <p class="sub">${esc(run.titleEn)}</p>
    <p class="ground">📍 الأرض: <code>${esc(run.ground?.branch ?? 'غير مسجَّلة')}</code> @ <code>${esc(run.ground?.commit ?? '—')}</code>${run.ground?.dirty ? ' <b>(شجرة غير نظيفة)</b>' : ''}${run.ground?.subject ? ` — ${esc(run.ground.subject)}` : ''}</p>
    <div class="stats">
      <span class="ok">${passed} فحصًا ناجحًا</span>
      ${failed.length ? `<span class="bad">${failed.length} ساقطًا</span>` : ''}
      <span>${run.frames.length} لقطة</span>
      ${(run.findings ?? []).length ? `<span class="warn">${run.findings.length} التقاطة</span>` : ''}
      ${(run.skipped ?? []).length ? `<span class="skip">${run.skipped.length} خطوة محجوبة</span>` : ''}
    </div>
    ${findings ? `<div class="box"><h3>التقاطات مرفوعة — لا تُصلَح في هذه الحارة</h3><ul class="findings">${findings}</ul></div>` : ''}
    ${skipped ? `<div class="box"><h3>خطوات متخطّاة (معلَنة)</h3><ul class="skips">${skipped}</ul></div>` : ''}
    ${failed.length ? `<div class="box"><h3>فحوص ساقطة</h3><ul>${failed.map((f) => `<li>${esc(f.name)}${f.detail ? ` — ${esc(f.detail)}` : ''}</li>`).join('')}</ul></div>` : ''}
    <div class="strip">${frames}</div>
  </section>`
}

const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>حارس الرحلات — التوثيق البصري | قِمّة</title>
<style>
  :root { --bg:#F4F1EC; --card:#fff; --ink:#161513; --mut:#6b675f; --line:#e2ddd4; --ok:#1f8a4c; --bad:#c0392b; --warn:#b8571b; }
  @media (prefers-color-scheme: dark) { :root { --bg:#141312; --card:#1d1b19; --ink:#f1eee8; --mut:#a49e94; --line:#2e2b27; } }
  * { box-sizing: border-box }
  body { margin:0; background:var(--bg); color:var(--ink); font-family:-apple-system,"SF Arabic","IBM Plex Sans Arabic",system-ui,sans-serif; line-height:1.6 }
  header { padding:40px 24px 8px; max-width:1200px; margin:0 auto }
  h1 { margin:0 0 4px; font-size:2rem; letter-spacing:-.02em }
  header p { margin:0; color:var(--mut) }
  section { max-width:1200px; margin:32px auto; padding:24px; background:var(--card); border:1px solid var(--line); border-radius:18px }
  h2 { margin:0; font-size:1.35rem }
  h2 .meta { font-size:.8rem; color:var(--mut); font-weight:400 }
  .ground { margin:0 0 14px; font-size:.8rem; color:var(--mut) }
  .ground code { background:rgba(128,128,128,.15); padding:1px 6px; border-radius:5px }
  .sub { margin:2px 0 4px; color:var(--mut); direction:ltr; text-align:start; font-size:.9rem }
  .stats { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px }
  .stats span { font-size:.8rem; padding:4px 10px; border-radius:999px; border:1px solid var(--line) }
  .stats .ok { color:var(--ok) } .stats .bad { color:var(--bad) } .stats .warn { color:var(--warn) } .stats .skip { color:var(--mut) }
  .box { border:1px solid var(--line); border-radius:12px; padding:12px 16px; margin-bottom:16px }
  .box h3 { margin:0 0 8px; font-size:.95rem }
  .box ul { margin:0; padding-inline-start:18px }
  .findings li { margin-bottom:10px }
  .findings p { margin:2px 0 0; color:var(--mut); font-size:.85rem }
  .sev-high > b { color:var(--bad) } .sev-mid > b { color:var(--warn) }
  .strip { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:16px }
  figure { margin:0 }
  figure img { width:100%; border-radius:12px; border:1px solid var(--line); display:block; background:#000 }
  figcaption { font-size:.78rem; color:var(--mut); margin-top:6px }
  figcaption .n { display:inline-grid; place-items:center; width:20px; height:20px; border-radius:6px; background:var(--ink); color:var(--bg); font-size:.7rem; margin-inline-end:4px }
  figcaption .en { direction:ltr; display:inline-block; opacity:.75 }
  footer { max-width:1200px; margin:0 auto 60px; padding:0 24px; color:var(--mut); font-size:.85rem }
</style>
</head>
<body>
<header>
  <h1>حارس الرحلات</h1>
  <p>التطبيق كما يشغّله إنسان — رحلة كاملة، شاشة شاشة.</p>
</header>
${runs.map(section).join('')}
<footer>
  <p>تُبنى هذه الورقة آليًا من <code>docs/proof/journeys/*/manifest.json</code>. كل لقطة من تشغيل حقيقي لحزمة الإنتاج.</p>
</footer>
</body>
</html>`

writeFileSync(join(ROOT, 'index.html'), html)
const totalFrames = runs.reduce((n, r) => n + r.frames.length, 0)
const totalFindings = runs.reduce((n, r) => n + (r.findings?.length ?? 0), 0)
console.log(`✅ ورقة التوثيق: ${runs.length} تشغيلًا · ${totalFrames} لقطة · ${totalFindings} التقاطة → ${join(ROOT, 'index.html')}`)
