// لقطة إثبات لتذكير الترطيب أثناء التمرين (شاشة 46) بأبعاد iPhone 15 (393×852pt @2x).
// طرف عميل بحت: يزرع جلسة، يبدأ تمرينًا عبر الواجهة الحقيقية، يُرجِع بداية الجلسة ٢٥ دقيقة
// للخلف (وقت فعلي) فيصبح التذكير مستحقًّا، ثم يلتقط الشاشة النشطة.
// التشغيل: PREVIEW_URL=http://localhost:5201 node scripts/hydration-shot.mjs

import { mkdirSync } from 'node:fs'
import { chromium } from './e2e/lib/engine.mjs'

const URL = process.env.PREVIEW_URL || 'http://localhost:5201'
const OUT = 'docs/proof/workout-hydration'
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

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, locale: 'ar' })
await ctx.addInitScript(({ uid, session }) => {
  const seed = {
    'qimmah:supabase-auth:v1': JSON.stringify(session),
    'qimmah:lastUser:v1': uid,
    'qimmah:onboarding:accounts:v1': JSON.stringify({ [uid]: { email: 'appreview@qimmah.app', createdAt: 1784301294642 } }),
    'qimmah:onboarding:v1': JSON.stringify({ completed: true, lastStep: 0 }),
    'qimmah:onboarding:profile:v1': JSON.stringify({ bodyMetrics: {}, goalType: 'cutting' }),
    'qimmah:prefs:v1': JSON.stringify({ language: 'ar', hapticsEnabled: true, theme: 'light' }),
    'qimmah:history:migrated:v1': 'done',
  }
  for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
}, { uid: UID, session })

const page = await ctx.newPage()
await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(2700) // انتظر زوال شاشة الإقلاع

// افتح تبويب التمارين وابدأ الجلسة عبر الواجهة الحقيقية.
await page.getByRole('button', { name: 'التمارين' }).click()
await page.getByRole('button', { name: 'ابدأ الجلسة' }).click()
await page.getByRole('button', { name: 'أنهِ المجموعة' }).waitFor({ state: 'visible', timeout: 15000 })

// أرجِع بداية الجلسة ٢٥ دقيقة للخلف فيصبح تذكير الـ٢٠ دقيقة مستحقًّا.
await page.evaluate((uid) => {
  const key = `qimmah:active-workout:v2:${uid}`
  const s = JSON.parse(localStorage.getItem(key))
  s.startedAt = Date.now() - 25 * 60_000
  localStorage.setItem(key, JSON.stringify(s))
}, UID)
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2700)
await page.getByText('وقت الترطيب').first().waitFor({ state: 'visible', timeout: 15000 })
await page.waitForTimeout(300)
await page.screenshot({ path: `${OUT}/46-hydration-reminder.png` })
console.log('✅ hydration reminder shot saved to', OUT)
await browser.close()
