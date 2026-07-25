// لقطة إثبات لسياق «العودة بعد انقطاع» (شاشة 20) بأبعاد iPhone 15 (393×852pt @2x).
// طرف عميل بحت: يزرع جلسة وهمية + جلسة تمرين منتهية قبل ٥ أيام (لا جلسة اليوم)
// فيُشتق السياق من فجوة نشاط حقيقية، ثم يلتقط شاشة اليوم.
// التشغيل: PREVIEW_URL=http://localhost:5200 node scripts/today-return-shot.mjs

import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const URL = process.env.PREVIEW_URL || 'http://localhost:5200'
const OUT = 'docs/proof/today-return'
const [W, H] = [393, 852]
const UID = '0000000000000040000800000000000011d0'
mkdirSync(OUT, { recursive: true })

// آخر تمرين منتهٍ قبل ٥ أيام (تُحسب من الآن داخل المتصفح لتجنّب حظر الوقت في السكربت).
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
  const d = new Date(); d.setDate(d.getDate() - 5)
  const past = d.toISOString().slice(0, 10)
  const seed = {
    'qimmah:supabase-auth:v1': JSON.stringify(session),
    'qimmah:lastUser:v1': uid,
    'qimmah:onboarding:accounts:v1': JSON.stringify({ [uid]: { email: 'appreview@qimmah.app', createdAt: 1784301294642 } }),
    'qimmah:onboarding:v1': JSON.stringify({ completed: true, lastStep: 0 }),
    'qimmah:onboarding:profile:v1': JSON.stringify({ bodyMetrics: {}, goalType: 'cutting' }),
    'qimmah:prefs:v1': JSON.stringify({ language: 'ar', hapticsEnabled: true, theme: 'light' }),
    'qimmah:history:migrated:v1': 'done',
    'qimmah:history:workoutSessions:v1': JSON.stringify([
      { id: 'sPast', date: past, startedAt: `${past}T07:00:00.000Z`, finishedAt: `${past}T07:40:00.000Z`, workoutDayId: 'd1', workoutDayName: 'يوم كامل', exercises: [{ exerciseId: 'x', targetSets: 4, targetReps: '8', targetRestSec: 90, completed: true }] },
    ]),
  }
  for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
}, { uid: UID, session })

const page = await ctx.newPage()
await page.goto(URL, { waitUntil: 'networkidle' })
await page.getByText('حيّاك من جديد').first().waitFor({ state: 'visible', timeout: 20000 })
// شاشة الإقلاع مؤقّتة (~2.15s) ثم تُزال؛ انتظر زوالها قبل اللقطة.
await page.waitForTimeout(2700)
await page.screenshot({ path: `${OUT}/20-return-after-break.png` })
console.log('✅ return-after-break shot saved to', OUT)
await browser.close()
