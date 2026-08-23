// لقطتا إثبات لموجة الصقل ٣ (iPhone 15 · 393×852pt @2x):
// (أ) بطاقة الماء مع الكمية المخصّصة.  (ب) تسجيل وجبة مع عدد الحصص + تقدير.
// التشغيل: PREVIEW_URL=http://localhost:5205 node scripts/polish3-shot.mjs

import { mkdirSync } from 'node:fs'
import { chromium } from './e2e/lib/engine.mjs'

const URL = process.env.PREVIEW_URL || 'http://localhost:5205'
const OUT = 'docs/proof/polish-3'
const [W, H] = [393, 852]
const UID = '0000000000000040000800000000000011d0'
mkdirSync(OUT, { recursive: true })

const session = {
  access_token: `mock.${Buffer.from(JSON.stringify({ sub: UID, role: 'authenticated' })).toString('base64')}.sig`,
  token_type: 'bearer', expires_in: 3600, expires_at: 1815837294, refresh_token: 'mock-refresh-token',
  user: {
    id: UID, aud: 'authenticated', role: 'authenticated', email: 'appreview@qimmah.app',
    email_confirmed_at: '2026-01-01T00:00:00.000Z', confirmed_at: '2026-01-01T00:00:00.000Z',
    user_metadata: { display_name: 'قِمّة' }, app_metadata: {}, created_at: '2026-01-01T00:00:00.000Z',
  },
}
const seed = {
  'qimmah:supabase-auth:v1': JSON.stringify(session),
  'qimmah:lastUser:v1': UID,
  'qimmah:onboarding:accounts:v1': JSON.stringify({ [UID]: { email: 'appreview@qimmah.app', createdAt: 1784301294642 } }),
  'qimmah:onboarding:v1': JSON.stringify({ completed: true, lastStep: 0 }),
  'qimmah:onboarding:profile:v1': JSON.stringify({ bodyMetrics: {}, goalType: 'cutting' }),
  'qimmah:history:migrated:v1': 'done',
  'qimmah:prefs:v1': JSON.stringify({ language: 'ar', hapticsEnabled: true, theme: 'light' }),
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, locale: 'ar' })
await ctx.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v) }, seed)
const page = await ctx.newPage()

// (أ) بطاقة الماء + الكمية المخصّصة.
await page.goto(`${URL}/#/nutrition`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2700)
await page.getByPlaceholder('مخصّص (مل)').waitFor({ state: 'visible', timeout: 15000 })
await page.getByPlaceholder('مخصّص (مل)').scrollIntoViewIfNeeded()
await page.waitForTimeout(200)
await page.screenshot({ path: `${OUT}/nutrition-custom-water.png` })

// (ب) تسجيل وجبة بعدد حصص.
await page.getByRole('button', { name: 'أضف وجبة' }).first().click()
await page.getByText('عدد الحصص').first().waitFor({ state: 'visible', timeout: 15000 })
await page.waitForTimeout(200)
await page.screenshot({ path: `${OUT}/meal-servings.png` })

console.log('✅ polish-3 shots saved to', OUT)
await browser.close()
