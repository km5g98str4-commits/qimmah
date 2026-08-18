// لقطة إثبات لسطح Sand (v3.0 §F1 #EFEAE2) + قياس اللون المرسوم فعليًا.
// التشغيل: PREVIEW_URL=http://localhost:5207 node scripts/sand-shot.mjs

import { mkdirSync } from 'node:fs'
import { chromium } from './e2e/lib/engine.mjs'

const URL = process.env.PREVIEW_URL || 'http://localhost:5207'
const OUT = 'docs/proof/sand-surface'
const [W, H] = [393, 852]
const UID = '0000000000000040000800000000000011d0'
mkdirSync(OUT, { recursive: true })

const session = {
  access_token: `mock.${Buffer.from(JSON.stringify({ sub: UID, role: 'authenticated' })).toString('base64')}.sig`,
  token_type: 'bearer', expires_in: 3600, expires_at: 1815837294, refresh_token: 'mock-refresh-token',
  user: { id: UID, aud: 'authenticated', role: 'authenticated', email: 'appreview@qimmah.app', email_confirmed_at: '2026-01-01T00:00:00.000Z', confirmed_at: '2026-01-01T00:00:00.000Z', user_metadata: { display_name: 'قِمّة' }, app_metadata: {}, created_at: '2026-01-01T00:00:00.000Z' },
}
const seed = {
  'qimmah:supabase-auth:v1': JSON.stringify(session),
  'qimmah:lastUser:v1': UID,
  'qimmah:onboarding:accounts:v1': JSON.stringify({ [UID]: { email: 'appreview@qimmah.app', createdAt: 1784301294642 } }),
  'qimmah:onboarding:v1': JSON.stringify({ completed: true, lastStep: 0 }),
  'qimmah:onboarding:profile:v1': JSON.stringify({ bodyMetrics: {}, goalType: 'cutting' }),
  'qimmah:history:migrated:v1': 'done',
  'qimmah:prefs:v1': JSON.stringify({ language: 'ar', hapticsEnabled: true, theme: 'light' }),
  'qimmah:steps:v1': JSON.stringify({ [new Date().toLocaleDateString('en-CA')]: 8000 }),
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, locale: 'ar' })
await ctx.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v) }, seed)
const page = await ctx.newPage()
await page.goto(`${URL}/#/dashboard`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2700)

// قياس اللون المرسوم فعليًا للصفحة (لا التوكن فقط).
const painted = await page.evaluate(() => {
  const cs = getComputedStyle(document.body)
  return { bg: cs.backgroundColor, pageVar: cs.getPropertyValue('--c-page').trim() }
})
console.log('painted body background:', painted.bg, '| --c-page:', painted.pageVar)
if (painted.bg.replace(/\s/g, '') !== 'rgb(239,234,226)') {
  console.error('✗ painted surface is NOT Sand #EFEAE2:', painted.bg)
  process.exitCode = 1
} else {
  console.log('✓ painted surface == Sand #EFEAE2 (rgb(239, 234, 226))')
}

await page.screenshot({ path: `${OUT}/sand-today.png` })
console.log('✅ sand shot saved to', OUT)
await browser.close()
