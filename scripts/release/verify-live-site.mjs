#!/usr/bin/env node
/**
 * تحقّق الموقع الحيّ — [SALLA-CLOSURE-001]
 *
 * يقرأ الإنتاج المنشور (لا المصدر): ينتظر أن يحمل `index.html` بصمة البناء المتوقّعة
 * (`<meta name="qimmah-build">`)، ثم يجلب حزم JS المنشورة ويستخرج كل رابط `salla.sa`
 * فيها، ويؤكّد أن الوجهة **واحدة** وهي المنتج المعتمد. ثم فحص قراءة فقط لصفحات سلة:
 * حالة HTTP للمنتج المعتمد (المخفي يُتوقَّع ألّا يكون 200 عامًّا) وللمنتجات المكرَّرة.
 *
 *   node scripts/release/verify-live-site.mjs --url https://qimmah-8qp.pages.dev \
 *        --expect-sha abc1234 --checkout <url> [--strict] [--out report.json]
 *
 * يُشغَّل في CI (شبكة العدّاء مفتوحة؛ بيئة الوكلاء تحجب pages.dev وsalla.sa). لا كود ولا سرّ.
 */
/* global process */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const args = process.argv.slice(2)
const argOf = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d }
const SITE = (argOf('--url', 'https://qimmah-8qp.pages.dev')).replace(/\/$/, '')
const EXPECT = argOf('--expect-sha', '')
const CHECKOUT = argOf('--checkout', '')
const OUT = argOf('--out', '')
const STRICT = args.includes('--strict')
const WAIT_MS = Number(argOf('--wait-ms', '900000'))
const UA = 'Qimmah-LiveVerify/1.0 (github-actions; read-only)'

const get = async (url) => {
  const res = await fetch(url, { headers: { 'user-agent': UA, 'cache-control': 'no-cache' }, redirect: 'follow', signal: AbortSignal.timeout(45000) })
  return { status: res.status, text: await res.text(), url: res.url }
}

const report = { site: SITE, expectSha: EXPECT || null, checkout: CHECKOUT || null, checkedAt: new Date().toISOString(), checks: [] }
let failed = 0
const check = (label, ok, detail = '') => { report.checks.push({ label, ok, detail }); if (!ok) failed++; console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`) }

// ① انتظار النشر: البصمة في index.html
let index = null, deployedSha = null
const t0 = Date.now()
for (;;) {
  try {
    index = await get(`${SITE}/?nocache=${Date.now()}`)
    const m = /<meta name="qimmah-build" content="v[^·"]+·([0-9a-f]{7})/.exec(index.text)
    deployedSha = m?.[1] ?? null
  } catch (e) { index = { status: 0, text: '', error: String(e?.message ?? e) } }
  if (!EXPECT || deployedSha === EXPECT || Date.now() - t0 > WAIT_MS) break
  console.log(`… deployed=${deployedSha ?? '?'} expected=${EXPECT} — waiting`)
  await new Promise((r) => setTimeout(r, 20000))
}
report.deployedSha = deployedSha
check('index.html reachable', index?.status === 200, `status ${index?.status}`)
check('deployed build label present', !!deployedSha, deployedSha ?? '')
if (EXPECT) check(`deployed commit = ${EXPECT}`, deployedSha === EXPECT, `deployed ${deployedSha}`)

// ② حزم JS: من index (script + modulepreload) ثم مستوى ثانٍ من الاستيرادات
const assetRefs = new Set()
for (const m of index.text.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)) assetRefs.add(m[1])
const fetched = new Map()
const queue = [...assetRefs]
while (queue.length && fetched.size < 120) {
  const p = queue.shift()
  if (fetched.has(p)) continue
  try {
    const r = await get(`${SITE}${p}`)
    fetched.set(p, r.text)
    for (const m of r.text.matchAll(/["'`](?:\.?\/)?assets\/([A-Za-z0-9_.-]+\.js)["'`]/g)) queue.push(`/assets/${m[1]}`)
  } catch (e) { fetched.set(p, '') }
}
const SALLA = /https:\/\/salla\.sa\/[A-Za-z0-9%_~!$&'()*+,;=:@?#.\/-]*/g
const sallaRefs = new Set()
for (const txt of fetched.values()) for (const m of txt.matchAll(SALLA)) sallaRefs.add(m[0])
report.assetsScanned = fetched.size
report.sallaUrls = [...sallaRefs]
check('at least one Salla checkout URL ships in the bundle', sallaRefs.size >= 1, `${fetched.size} assets scanned`)
check('exactly one Salla destination ships', sallaRefs.size === 1, [...sallaRefs].join(' | '))
if (CHECKOUT) check('shipped destination = canonical product', sallaRefs.size === 1 && [...sallaRefs][0] === CHECKOUT, [...sallaRefs].join(' | '))
for (const old of ['1181109938', '1751698501', '973212497']) check(`no reference to retired product ${old}`, ![...fetched.values()].some((t) => t.includes(old)))
check('no annual/renewal wording in shipped bundle', ![...fetched.values()].some((t) => /سنويًا|سنوياً|تجديد تلقائي|auto-renew|yearly subscription/.test(t)))

// ③ سلة — قراءة فقط. **الإخفاء يُقاس بالفهرس العامّ لا بالرابط المباشر:** المنتج المخفيّ في سلة
// يبقى مفتوحًا برابطه (وهذا ما يحتاجه الشراء المضبوط)، والفرق أنه لا يظهر في المتجر ولا خريطة الموقع.
// وبناء رابط من المعرّف وحده يعيد 410 دائمًا (المقطع العربي إلزامي) — فلا يصلح دليلًا على شيء.
const CANON_ID = '2106415557'
const RETIRED_IDS = ['1181109938', '1751698501', '973212497']
const STORE = 'https://salla.sa/Qimmahsa'
const catalog = {}
const catalogText = []
for (const [name, url] of [
  ['store-root', STORE],
  ['sitemap', `${STORE}/sitemap.xml`],
  ['sitemap-products', 'https://salla.sa/sitemap.xml'],
  ['search-premium', `${STORE}/search?q=Premium`],
  ['search-qimmah', `${STORE}/search?q=%D9%82%D9%85%D8%A9`],
]) {
  try {
    const r = await get(url)
    catalogText.push(r.text)
    catalog[name] = {
      status: r.status,
      bytes: r.text.length,
      canonicalListed: r.text.includes(CANON_ID),
      retiredListed: RETIRED_IDS.filter((id) => r.text.includes(id)),
    }
  } catch (e) { catalog[name] = { error: String(e?.message ?? e) } }
}
report.sallaCatalog = catalog
const reachable = Object.values(catalog).filter((c) => c.status === 200)
const canonicalInCatalog = Object.values(catalog).some((c) => c.canonicalListed)
const retiredInCatalog = [...new Set(Object.values(catalog).flatMap((c) => c.retiredListed ?? []))]
check('public catalog readable (store root / sitemap / search)', reachable.length >= 1, `${reachable.length} of ${Object.keys(catalog).length} returned 200`)
check(`canonical product ${CANON_ID} is NOT in the public catalog (HIDDEN=YES)`, !canonicalInCatalog, canonicalInCatalog ? 'appears in a public listing — the product is PUBLISHED' : 'absent from every public listing read')
check('no retired product appears in the public catalog', retiredInCatalog.length === 0, retiredInCatalog.join(', '))

// الرابط المباشر — المؤسس يشتري منه، فيجب أن يفتح ويحمل العقد الصحيح.
//
// ⚠️ **يُقاس ثلاث مرّات لا مرّة:** قياسان متتاليان في ١٤ سبتمبر اختلفا — الأوّل
// أعاد صفحة المنتج (٢٠٠ + زرّ شراء + ١٩٫٩٩)، والثاني **حوّل إلى جذر المتجر**.
// سببان محتملان لا ثالث معروف: تبدُّل رؤية المنتج، أو حماية سلة من الطلبات
// المتكرّرة. فالمحاولات تُسجَّل كلّها ولا يُعلَن حكم من قياس واحد.
const sallaPages = {}
if (CHECKOUT) {
  const attempts = []
  for (let i = 0; i < 3; i++) {
    if (i) await new Promise((r) => setTimeout(r, 6000))
    try {
      const r = await get(CHECKOUT)
      const text = r.text.replace(/<script[\s\S]*?<\/script>/g, ' ')
      const redirectedToRoot = /\/Qimmahsa\/?$/.test(r.url)
      attempts.push({
        status: r.status, finalUrl: r.url, redirectedToRoot,
        onProductPage: r.status === 200 && !redirectedToRoot,
        has1999: /19[.,٫]99|١٩[.,٫]٩٩/.test(text),
        hasPremium: /Premium/.test(text),
        buyable: /أضف إلى السلة|اشترِ الآن|Add to cart/.test(text),
        annualWording: /سنويًا|سنوياً|شهريًا|شهرياً/.test(text),
        renewalWording: /تجديد تلقائي|auto.?renew/i.test(text),
        strikethroughPrice: /89[.,٫]99|٨٩[.,٫]٩٩/.test(text),
      })
    } catch (e) { attempts.push({ error: String(e?.message ?? e) }) }
  }
  sallaPages.attempts = attempts
  const onProduct = attempts.filter((a) => a.onProductPage)
  sallaPages.stable = onProduct.length === attempts.length ? 'always-product-page'
    : onProduct.length === 0 ? 'never-product-page' : 'unstable'
  check('canonical product page opens by direct link on every attempt (the founder buys here)',
    sallaPages.stable === 'always-product-page',
    `${onProduct.length}/${attempts.length} attempts landed on the product page · ${sallaPages.stable}`)
  // العقد يُحكم عليه من القياسات التي وصلت الصفحة فعلًا — لا من تحويل إلى الجذر.
  if (onProduct.length) {
    check('canonical page is buyable', onProduct.every((a) => a.buyable))
    check('canonical page shows 19.99', onProduct.every((a) => a.has1999))
    check('canonical page carries no annual/monthly wording', !onProduct.some((a) => a.annualWording))
    check('canonical page carries no auto-renewal wording', !onProduct.some((a) => a.renewalWording))
    check('canonical page carries no struck-through 89.99', !onProduct.some((a) => a.strikethroughPrice))
  }
}
report.sallaPages = sallaPages

console.log(`\n${failed ? '❌' : '✅'} live verify: ${report.checks.length - failed} passed / ${failed} failed`)
if (OUT) { mkdirSync(dirname(OUT), { recursive: true }); writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n') }
console.log(JSON.stringify(report, null, 2))
if (STRICT && failed) process.exit(1)
