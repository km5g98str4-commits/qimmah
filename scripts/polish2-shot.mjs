// لقطتا إثبات لموجة الصقل ٢ (iPhone 15 · 393×852pt @2x):
// (أ) هيرو العودة بالنص الصادق (أول ١٥ دقيقة من خطتك — لا جلسة منفصلة).
// (ب) سطح التمرين النشط (modal focus).
// التشغيل: PREVIEW_URL=http://localhost:5204 node scripts/polish2-shot.mjs

import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const URL = process.env.PREVIEW_URL || 'http://localhost:5204'
const OUT = 'docs/proof/polish-2'
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
const base = {
  'qimmah:supabase-auth:v1': JSON.stringify(session),
  'qimmah:lastUser:v1': UID,
  'qimmah:onboarding:accounts:v1': JSON.stringify({ [UID]: { email: 'appreview@qimmah.app', createdAt: 1784301294642 } }),
  'qimmah:onboarding:v1': JSON.stringify({ completed: true, lastStep: 0 }),
  'qimmah:onboarding:profile:v1': JSON.stringify({ bodyMetrics: {}, goalType: 'cutting' }),
  'qimmah:history:migrated:v1': 'done',
  'qimmah:prefs:v1': JSON.stringify({ language: 'ar', hapticsEnabled: true, theme: 'light' }),
}

const browser = await chromium.launch()

// (أ) هيرو العودة — جلسة منتهية قبل ٥ أيام.
{
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, locale: 'ar' })
  await ctx.addInitScript((seed) => {
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
    const d = new Date(); d.setDate(d.getDate() - 5)
    const past = d.toLocaleDateString('en-CA')
    localStorage.setItem('qimmah:history:workoutSessions:v1', JSON.stringify([
      { id: 'sPast', date: past, startedAt: `${past}T07:00:00.000Z`, finishedAt: `${past}T07:40:00.000Z`, workoutDayId: 'd1', workoutDayName: 'يوم كامل', exercises: [{ exerciseId: 'x', targetSets: 4, targetReps: '8', targetRestSec: 90, completed: true }] },
    ]))
  }, base)
  const page = await ctx.newPage()
  await page.goto(`${URL}/#/dashboard`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2700)
  await page.getByText('عُد بلطف').first().waitFor({ state: 'visible', timeout: 15000 })
  await page.screenshot({ path: `${OUT}/20-return-honest.png` })
  await ctx.close()
}

// (ب) سطح التمرين النشط.
{
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, locale: 'ar' })
  await ctx.addInitScript((seed) => { for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v) }, base)
  const page = await ctx.newPage()
  await page.goto(`${URL}/#/workout`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2700)
  await page.getByRole('button', { name: 'ابدأ الجلسة' }).click()
  await page.getByRole('button', { name: 'أنهِ المجموعة' }).waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT}/27-active-workout-modal.png` })
  await ctx.close()
}

console.log('✅ polish-2 shots saved to', OUT)
await browser.close()
