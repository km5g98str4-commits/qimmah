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

// ③ سلة — قراءة فقط: حالة الصفحة العامة للمنتج المعتمد والمكرَّرة (لا لوحة، لا أكواد)
const sallaPages = {}
for (const [name, url] of [['canonical', CHECKOUT], ['dup-1181109938', 'https://salla.sa/Qimmahsa/p1181109938'], ['dup-1751698501', 'https://salla.sa/Qimmahsa/p1751698501'], ['dup-973212497', 'https://salla.sa/Qimmahsa/p973212497']]) {
  if (!url) continue
  try {
    const r = await get(url)
    const text = r.text.replace(/<script[\s\S]*?<\/script>/g, ' ')
    sallaPages[name] = { status: r.status, finalUrl: r.url, has1999: /19[.,٫]99|١٩[.,٫]٩٩/.test(text), hasPremium: /Premium/.test(text), addToCart: /أضف إلى السلة|اشترِ الآن|Add to cart/.test(text), annualWording: /سنويًا|سنوياً/.test(text) }
  } catch (e) { sallaPages[name] = { error: String(e?.message ?? e) } }
}
report.sallaPages = sallaPages
const canon = sallaPages.canonical
if (canon) {
  // المخفي في سلة لا يُعرض للعموم: أي شيء غير صفحة شراء عامة (404/410 أو صفحة بلا زرّ شراء) يُقرأ «مخفي».
  const publiclyBuyable = canon.status === 200 && canon.addToCart
  check('canonical product is NOT publicly buyable yet (HIDDEN=YES expected before the controlled purchase)', !publiclyBuyable, `status ${canon.status ?? canon.error} · addToCart=${canon.addToCart}`)
  check('canonical page carries no annual wording', !canon.annualWording)
}
console.log(`\n${failed ? '❌' : '✅'} live verify: ${report.checks.length - failed} passed / ${failed} failed`)
if (OUT) { mkdirSync(dirname(OUT), { recursive: true }); writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n') }
console.log(JSON.stringify(report, null, 2))
if (STRICT && failed) process.exit(1)
