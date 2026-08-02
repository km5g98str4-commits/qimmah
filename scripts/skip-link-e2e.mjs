// QEA-005 — إثبات رابط التخطّي: التركيز الأول بالتاب من عنوان الصفحة يجب أن يكون رابط
// «تخطَّ إلى المحتوى الرئيسي»، مخفيًا بصريًا حتى التركيز، ونشطًا (Enter) ينقل التركيز
// فعليًا إلى #main-content. يُختبَر على شاشة ضيف (بلا حساب) وشاشة مُصادَق (تبويبات رئيسية)
// إذ تختلف قشرة كل منهما.
//
// مجلّد الأدلة قابل للحقن (نفس اصطلاح offline-session-e2e.mjs).

import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { completeOnboarding, seedMockSession } from './lib/onboarding-driver.mjs'

const EVIDENCE_DIR = resolve(process.argv[2] || process.env.EVIDENCE_DIR || join(tmpdir(), `qimmah-skiplink-evidence-${Date.now()}`))
mkdirSync(EVIDENCE_DIR, { recursive: true })

const PORT = 5191
const URL = `http://localhost:${PORT}`
const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
}

async function firstTabFocusesSkipLink(page) {
  await page.evaluate(() => document.body.focus())
  await page.keyboard.press('Tab')
  return page.evaluate(() => {
    const el = document.activeElement
    return { tag: el?.tagName, href: el?.getAttribute('href'), text: el?.textContent?.trim() }
  })
}

let browser
try {
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
  await new Promise((res, rej) => {
    const start = Date.now()
    const poll = async () => {
      try { const r = await fetch(URL); if (r.ok) return res() } catch {}
      if (Date.now() - start > 20000) return rej(new Error('preview did not start'))
      setTimeout(poll, 300)
    }
    poll()
  })

  browser = await chromium.launch({ headless: true })

  // ————— ١) شاشة ضيف (بلا جلسة) — أول شاشة يراها أي زائر. —————
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'ar' })
    const page = await ctx.newPage()
    await page.goto(URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2600) // زوال الشاشة الافتتاحية

    const first = await firstTabFocusesSkipLink(page)
    check('ضيف: أول Tab من الصفحة يركّز رابط التخطّي', first.tag === 'A' && /main-content/.test(first.href || ''), JSON.stringify(first))

    // مخفي بصريًا قبل التركيز — نتحقّق أنه يحمل صنف sr-only (لا يظهر افتراضيًا).
    const hiddenByDefault = await page.evaluate(() => {
      const a = document.querySelector('a[href="#main-content"]')
      return a ? a.className.includes('sr-only') : null
    })
    check('ضيف: الرابط مخفي بصريًا افتراضيًا (sr-only) لا يظهر بلا تركيز', hiddenByDefault === true, String(hiddenByDefault))

    // تفعيل الرابط (Enter) ينقل التركيز فعليًا إلى #main-content.
    await page.keyboard.press('Enter')
    await page.waitForTimeout(200)
    const afterActivate = await page.evaluate(() => document.activeElement?.id)
    check('ضيف: تفعيل الرابط ينقل التركيز إلى #main-content', afterActivate === 'main-content', String(afterActivate))

    await ctx.close()
  }

  // ————— ٢) شاشة مُصادَق (تبويبات رئيسية) — قشرة مختلفة (MobileShell). —————
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'ar' })
    const page = await ctx.newPage()
    const uid = 'skiplink-qa-user'
    await page.goto(URL, { waitUntil: 'domcontentloaded' })
    await page.evaluate((s) => localStorage.setItem('qimmah:supabase-auth:v1', JSON.stringify(s)), seedMockSession(uid))
    await page.goto(URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2400)
    const onboarded = await completeOnboarding(page)
    check('مُصادَق: الإعداد اكتمل (وصول للوحة)', onboarded)

    // إعادة تحميل فعلية قبل فحص ترتيب Tab: يحاكي السيناريو الحقيقي في التدقيق («Tab من
    // عنوان الصفحة») بدل تفقّد الترتيب مباشرة بعد سلسلة نقرات الإعداد — عندها قد يبقى
    // التركيز على آخر عنصر نُقر عليه (سلوك متصفّح طبيعي)، لا على أول عنصر في ترتيب DOM.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)

    const first = await firstTabFocusesSkipLink(page)
    check('مُصادَق: أول Tab من الصفحة يركّز رابط التخطّي (فوق قشرة MobileShell)', first.tag === 'A' && /main-content/.test(first.href || ''), JSON.stringify(first))

    await page.keyboard.press('Enter')
    await page.waitForTimeout(200)
    const afterActivate = await page.evaluate(() => document.activeElement?.id)
    check('مُصادَق: تفعيل الرابط ينقل التركيز إلى #main-content', afterActivate === 'main-content', String(afterActivate))

    // #main-content يجب أن يحتوي فعليًا على المحتوى الرئيسي (لا عنصر فارغ).
    const mainHasContent = await page.evaluate(() => (document.getElementById('main-content')?.textContent?.trim().length ?? 0) > 20)
    check('مُصادَق: #main-content يحتوي محتوى حقيقيًا (ليس هدفًا فارغًا)', mainHasContent)

    await ctx.close()
  }

  preview.kill()
} catch (e) {
  check('اكتمل السيناريو بلا استثناء غير متوقّع', false, e.stack || e.message)
} finally {
  await browser?.close()
}

const failed = results.filter((r) => !r.ok)
writeFileSync(join(EVIDENCE_DIR, 'skip-link-e2e.json'), JSON.stringify({ total: results.length, passed: results.length - failed.length, failed: failed.length, results }, null, 2))
console.log(`\nالأدلة: ${join(EVIDENCE_DIR, 'skip-link-e2e.json')}`)
console.log(failed.length === 0 ? `\n✅ نجحت كل الفحوص — ${results.length} فحصًا.` : `\n❌ فشل ${failed.length} من ${results.length} فحصًا.`)
process.exit(failed.length === 0 ? 0 : 1)
