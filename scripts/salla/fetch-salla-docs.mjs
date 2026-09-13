#!/usr/bin/env node
// جالب توثيق سلة الرسمي — [SALLA-PROD-001]. يعمل في CI (شبكة مفتوحة). لكل بذرة: يرسم الصفحة
// بالمتصفّح، يحفظ نصّها، يستخرج الروابط المطابقة للكلمات المفتاحية ويجلبها بعمق واحد.
// المخرج: data/salla-docs/<slug>/<n>.txt + index.json (عنوان · رابط · حجم). لا أسرار ولا أكواد هنا.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = resolve(ROOT, 'data/salla-docs')
const cfg = JSON.parse(readFileSync(resolve(ROOT, 'scripts/salla/salla-docs-sources.json'), 'utf8'))
const { chromium } = await import('playwright')
const browser = await chromium.launch()
const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 Qimmah-DocsReader', locale: 'ar-SA' })
const index = { fetchedAt: new Date().toISOString(), seeds: [] }
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)

async function grab(url) {
  const page = await ctx.newPage()
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight && y < 30000; y += 800) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)) } }).catch(() => {})
    await page.waitForTimeout(800)
    const title = await page.title()
    const text = await page.evaluate(() => document.body.innerText)
    const links = await page.evaluate(() => Array.from(document.querySelectorAll('a[href]')).map((a) => ({ href: a.href, text: (a.textContent || '').trim().slice(0, 120) })))
    return { ok: true, title, text, links, finalUrl: page.url() }
  } catch (err) {
    return { ok: false, error: String(err?.message ?? err).slice(0, 200) }
  } finally { await page.close() }
}

for (const seed of cfg.seeds) {
  const dir = resolve(OUT, seed.slug)
  mkdirSync(dir, { recursive: true })
  const row = { slug: seed.slug, url: seed.url, pages: [] }
  const root = await grab(seed.url)
  if (!root.ok) { row.error = root.error; index.seeds.push(row); console.log(`✗ ${seed.slug}: ${root.error}`); continue }
  writeFileSync(resolve(dir, '00-seed.txt'), `# ${root.title}\n# ${root.finalUrl}\n\n${root.text}`)
  row.pages.push({ file: '00-seed.txt', title: root.title, url: root.finalUrl, bytes: Buffer.byteLength(root.text) })
  const re = new RegExp(seed.follow, 'i')
  const seen = new Set([root.finalUrl])
  const host = new URL(seed.url).host
  const candidates = root.links.filter((l) => { try { const u = new URL(l.href); return u.host === host && !seen.has(l.href) && (re.test(l.text) || re.test(decodeURIComponent(u.pathname))) } catch { return false } })
  let n = 0
  for (const l of candidates) {
    if (n >= (cfg.maxPagesPerSeed ?? 40)) break
    if (seen.has(l.href)) continue
    seen.add(l.href)
    const p = await grab(l.href)
    n += 1
    if (!p.ok) { row.pages.push({ url: l.href, error: p.error }); continue }
    const file = `${String(n).padStart(2, '0')}-${slugify(p.title || l.text || 'page')}.txt`
    writeFileSync(resolve(dir, file), `# ${p.title}\n# ${p.finalUrl}\n\n${p.text}`)
    row.pages.push({ file, title: p.title, url: p.finalUrl, bytes: Buffer.byteLength(p.text) })
  }
  index.seeds.push(row)
  console.log(`✓ ${seed.slug}: ${row.pages.length} صفحة`)
}
await browser.close()
mkdirSync(OUT, { recursive: true })
writeFileSync(resolve(OUT, 'index.json'), JSON.stringify(index, null, 2) + '\n')
