// لقطتا إثبات لموجة الصقل ١ (iPhone 15 · 393×852pt @2x):
// (أ) شريط التنقل بالإنجليزية (مترجَم، بلا تسريب عربي).
// (ب) بطاقة تغذية بالعربية بأرقام صحيحة الاتجاه (مستهلك / هدف).
// التشغيل: PREVIEW_URL=http://localhost:5203 node scripts/polish1-shot.mjs

import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const URL = process.env.PREVIEW_URL || 'http://localhost:5203'
const OUT = 'docs/proof/polish-1'
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
function baseSeed(lang) {
  return {
    'qimmah:supabase-auth:v1': JSON.stringify(session),
    'qimmah:lastUser:v1': UID,
    'qimmah:onboarding:accounts:v1': JSON.stringify({ [UID]: { email: 'appreview@qimmah.app', createdAt: 1784301294642 } }),
    'qimmah:onboarding:v1': JSON.stringify({ completed: true, lastStep: 0 }),
    'qimmah:onboarding:profile:v1': JSON.stringify({ bodyMetrics: {}, goalType: 'cutting' }),
    'qimmah:history:migrated:v1': 'done',
    'qimmah:prefs:v1': JSON.stringify({ language: lang, hapticsEnabled: true, theme: 'light' }),
  }
}

const browser = await chromium.launch()

// (أ) شريط التنقل بالإنجليزية.
{
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, locale: 'en' })
  await ctx.addInitScript((seed) => { for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v) }, baseSeed('en'))
  const page = await ctx.newPage()
  await page.goto(`${URL}/#/dashboard`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2700)
  await page.getByText('Progress', { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 })
  await page.screenshot({ path: `${OUT}/en-tabbar.png` })
  await ctx.close()
}

// (ب) بطاقة تغذية بالعربية بأرقام صحيحة الاتجاه.
{
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, locale: 'ar' })
  await ctx.addInitScript((seed) => {
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
    const stamp = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD محلي
    localStorage.setItem('qimmah:history:nutritionLogs:v1', JSON.stringify({
      [stamp]: { date: stamp, doneMeals: {}, waterMl: 250, loggedFood: { calories: 248, protein: 30, carbs: 20, fat: 8 }, updatedAt: new Date().toISOString() },
    }))
  }, baseSeed('ar'))
  const page = await ctx.newPage()
  await page.goto(`${URL}/#/nutrition`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2700)
  await page.getByText('السعرات').first().waitFor({ state: 'visible', timeout: 15000 })
  await page.screenshot({ path: `${OUT}/ar-nutrition-numbers.png` })
  await ctx.close()
}

console.log('✅ polish-1 shots saved to', OUT)
await browser.close()
