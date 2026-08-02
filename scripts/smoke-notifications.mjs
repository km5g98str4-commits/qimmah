// فحص دخان (smoke) لشاشة إعدادات الإشعارات — Playwright headless، بلا حساب حقيقي (جلسة
// Supabase وهمية في localStorage، نفس أسلوب scripts/notifications-proof.ts). يتنقّل
// الملف الشخصي ← الإعدادات ← التذكيرات، يلتقط لقطتين، ويتحقّق من صفر أخطاء console وأن
// المفاتيح تُعرض بصدق كمعطّلة على الويب («متاح على التطبيق»).
//
// التشغيل:  VITE_DESIGN_V2=true npm run build && node scripts/smoke-notifications.mjs

import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const PORT = 5194
const URL = `http://localhost:${PORT}`
mkdirSync('docs/features/smoke', { recursive: true })
const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })

async function waitForServer(ms = 20000) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    try { const r = await fetch(URL); if (r.ok) return true } catch {}
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('no server')
}

function seedMockSession(uid) {
  const nowSec = Math.floor(Date.now() / 1000)
  return {
    access_token: `mock.${Buffer.from(JSON.stringify({ sub: uid, role: 'authenticated' })).toString('base64')}.sig`,
    token_type: 'bearer', expires_in: 3600, expires_at: nowSec + 365 * 24 * 3600,
    refresh_token: 'mock-refresh-token',
    user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'smoke@qimmah.app',
      email_confirmed_at: '2026-01-01T00:00:00.000Z', confirmed_at: '2026-01-01T00:00:00.000Z',
      user_metadata: { display_name: 'قِمّة' }, app_metadata: {}, created_at: '2026-01-01T00:00:00.000Z' },
  }
}

const consoleErrors = []
let browser
try {
  await waitForServer()
  browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 420, height: 1200 }, deviceScaleFactor: 2, locale: 'ar' })
  const page = await ctx.newPage()
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message))

  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  const uid = 'smoke-user-0001'
  await page.evaluate((s) => localStorage.setItem('qimmah:supabase-auth:v1', JSON.stringify(s)), seedMockSession(uid))
  await page.evaluate((u) => localStorage.setItem('qimmah:onboarding:accounts:v1', JSON.stringify({ [u]: { completedAt: new Date().toISOString() } })), uid)
  await page.goto(`${URL}/#/profile`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  console.log('landed on:', page.url())
  console.log('body head:', (await page.locator('body').innerText()).slice(0, 120).replace(/\n/g, ' | '))

  const settingsRow = page.getByText('الإعدادات والخصوصية', { exact: true }).first()
  const settingsVisible = await settingsRow.isVisible().catch(() => false)
  console.log('settings row visible:', settingsVisible)
  if (settingsVisible) {
    await settingsRow.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'docs/features/smoke/01-settings-list.png' })

    const remindersRow = page.getByText('التذكيرات', { exact: true }).first()
    const remindersVisible = await remindersRow.isVisible().catch(() => false)
    console.log('reminders row visible:', remindersVisible)
    if (remindersVisible) {
      await remindersRow.click()
      await page.waitForTimeout(500)
      console.log('reminders screen text head:', (await page.locator('body').innerText()).slice(0, 300).replace(/\n/g, ' | '))
      await page.screenshot({ path: 'docs/features/smoke/02-notifications-settings.png' })

      const masterToggle = page.locator('#notif-master')
      console.log('master toggle present:', await masterToggle.count())
      console.log('master toggle disabled (expected true on web):', await masterToggle.isDisabled().catch(() => 'ERR'))
      console.log('master toggle aria-pressed:', await masterToggle.getAttribute('aria-pressed').catch(() => 'ERR'))
      console.log('web note present:', (await page.locator('body').innerText()).includes('متاح على التطبيق'))
    }
  }

  console.log('\nconsole errors:', consoleErrors.length)
  consoleErrors.forEach((e) => console.log('  -', e))
} finally {
  await browser?.close()
  preview.kill()
}
