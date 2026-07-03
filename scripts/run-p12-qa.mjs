// P12 QA — أداء الجوال + PWA (متصفّح بلا رأس، بعد npm run build):
//  • عامل الخدمة يسجَّل ويُفعَّل، وأسماء الكاش تحمل إصدار البناء المحقون (هاش الـ commit).
//  • فتح التطبيق دون اتصال (offline) بعد أول زيارة → القشرة تُرسم من الكاش.
//  • حزمة Supabase كسولة: لا تُحمَّل قبل اكتمال DOMContentLoaded (خارج مسار الإقلاع).
//  • الإقلاع يظلّ سليمًا: شاشة البداية تُرسم بلا أخطاء صفحة غير معالَجة.
//
// التشغيل: npm run qa:p12  (يبني أولًا عبر prequa إن رُبط، وإلا: npm run build && node scripts/run-p12-qa.mjs)

import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const PORT = 4323
const BASE = `http://localhost:${PORT}`
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

const results = []
const check = (name, pass, detail = '') => {
  results.push({ name, pass })
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)
}

// حزمة Supabase تُحدَّد بمحتواها (GoTrueClient) لا باسمها المُهشّم المتغيّر.
function findSupabaseChunk() {
  const assets = join(root, 'dist/assets')
  for (const f of readdirSync(assets).filter((x) => x.endsWith('.js'))) {
    if (readFileSync(join(assets, f), 'utf-8').includes('GoTrueClient')) return f
  }
  return null
}

// إصدار عامل الخدمة كما حُقن وقت البناء.
function builtSwVersion() {
  const m = readFileSync(join(root, 'dist/sw.js'), 'utf-8').match(/VERSION = '(qimmah-[\w.-]+)'/)
  return m?.[1] ?? null
}

async function main() {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
  try {
    for (let i = 0; i < 40; i++) {
      try { const r = await fetch(BASE); if (r.ok) break } catch { /* not up yet */ }
      await sleep(500)
    }

    const supabaseChunk = findSupabaseChunk()
    const swVersion = builtSwVersion()
    check('sw.js يحمل إصدارًا محقونًا (لا __SW_VERSION__)', Boolean(swVersion) && !swVersion.includes('__SW_VERSION__'), swVersion ?? 'no version')
    check('حزمة Supabase موجودة كملف كسول منفصل', Boolean(supabaseChunk), supabaseChunk ?? 'not found')

    const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    const pageErrors = []
    page.on('pageerror', (e) => pageErrors.push(String(e)))

    // ---- الزيارة الأولى (متصل): إقلاع + تسجيل عامل الخدمة ----
    await page.goto(BASE, { waitUntil: 'load' })
    await page.evaluate(() => navigator.serviceWorker?.ready)
    await sleep(1500) // مهلة precache + كسول Supabase

    const bootText = await page.evaluate(() => document.body.innerText)
    check('الإقلاع: شاشة البداية تُرسم', bootText.includes('قِمّة') || bootText.length > 100, `${bootText.length} chars`)

    // Supabase كسولة: طلبها بدأ بعد DOMContentLoaded (ليست في مسار الإقلاع الحرج).
    if (supabaseChunk) {
      const timing = await page.evaluate((chunk) => {
        const nav = performance.getEntriesByType('navigation')[0]
        const res = performance.getEntriesByType('resource').find((r) => r.name.includes(chunk))
        return res && nav ? { start: res.startTime, dcl: nav.domContentLoadedEventStart } : null
      }, supabaseChunk)
      check(
        'حزمة Supabase تُحمَّل كسولًا بعد DOMContentLoaded',
        Boolean(timing) && timing.start >= timing.dcl,
        timing ? `start=${Math.round(timing.start)}ms ≥ DCL=${Math.round(timing.dcl)}ms` : 'chunk not requested',
      )
    }

    // أسماء الكاش تحمل إصدار البناء — أي نشر جديد يُبطل كاش سابقه.
    const cacheKeys = await page.evaluate(() => caches.keys())
    check(
      'كاش عامل الخدمة يحمل إصدار البناء',
      Boolean(swVersion) && cacheKeys.some((k) => k.startsWith(swVersion)),
      cacheKeys.join(', '),
    )

    // ---- دون اتصال: إعادة فتح التطبيق تعمل من القشرة المخزّنة ----
    await context.setOffline(true)
    await page.reload({ waitUntil: 'load' }).catch(() => {})
    await sleep(1500)
    const offlineText = await page.evaluate(() => document.body.innerText).catch(() => '')
    check('offline: التطبيق يفتح من القشرة المخزّنة', offlineText.includes('قِمّة') || offlineText.length > 100, `${offlineText.length} chars`)
    await context.setOffline(false)

    check('لا أخطاء صفحة غير معالَجة', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '))

    await browser.close()
  } finally {
    server.kill()
  }

  const failed = results.filter((r) => !r.pass)
  console.log(`\n${failed.length === 0 ? '🎉 P12 QA — ALL GREEN' : '💥 ' + failed.length + ' CHECK(S) FAILED'}`)
  process.exit(failed.length === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
