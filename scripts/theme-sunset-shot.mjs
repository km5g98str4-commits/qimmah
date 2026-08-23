// لقطتا إثبات لجدولة الثيم حسب الغروب (شاشة 66) بأبعاد iPhone 15 (393×852pt @2x).
// (أ) الجدولة مفعّلة بمدينة (يظهر الأساس «يتبع الغروب · الرياض»).
// (ب) البديل اليدوي: عند رفض الموقع تظهر قائمة المدن.
// التشغيل: PREVIEW_URL=http://localhost:5202 node scripts/theme-sunset-shot.mjs

import { mkdirSync } from 'node:fs'
import { chromium } from './e2e/lib/engine.mjs'

const URL = process.env.PREVIEW_URL || 'http://localhost:5202'
const OUT = 'docs/proof/theme-sunset'
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
const baseSeed = {
  'qimmah:supabase-auth:v1': JSON.stringify(session),
  'qimmah:lastUser:v1': UID,
  'qimmah:onboarding:accounts:v1': JSON.stringify({ [UID]: { email: 'appreview@qimmah.app', createdAt: 1784301294642 } }),
  'qimmah:onboarding:v1': JSON.stringify({ completed: true, lastStep: 0 }),
  'qimmah:onboarding:profile:v1': JSON.stringify({ bodyMetrics: {}, goalType: 'cutting' }),
  'qimmah:history:migrated:v1': 'done',
}

const browser = await chromium.launch()

async function openSettings(page) {
  await page.goto(`${URL}/#/profile`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2700) // انتظر زوال شاشة الإقلاع
  await page.getByText('الإعدادات والخصوصية').first().click()
  await page.getByText('جدولة حسب الغروب').first().waitFor({ state: 'visible', timeout: 15000 })
  await page.getByText('جدولة حسب الغروب').first().scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
}

// (أ) مفعّلة بمدينة — نزرع الجدولة مباشرةً.
{
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, locale: 'ar' })
  await ctx.addInitScript((seed) => { for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v) }, {
    ...baseSeed,
    'qimmah:prefs:v1': JSON.stringify({ language: 'ar', hapticsEnabled: true, theme: 'system', themeSchedule: { enabled: true, lat: 24.71, lon: 46.68, cityLabel: 'الرياض' } }),
  })
  const page = await ctx.newPage()
  await openSettings(page)
  await page.screenshot({ path: `${OUT}/66-schedule-enabled.png` })
  await ctx.close()
}

// (ب) البديل اليدوي — الموقع مرفوض (لا إذن جيولوكيشن) → قائمة المدن.
{
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, locale: 'ar' })
  // لا نمنح إذن الموقع → getCurrentPosition يفشل → البديل اليدوي.
  await ctx.addInitScript((seed) => { for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v) }, baseSeed)
  const page = await ctx.newPage()
  await openSettings(page)
  await page.getByRole('switch', { name: 'جدولة حسب الغروب' }).click()
  await page.getByText('اختر مدينة').first().waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT}/66-manual-city-fallback.png` })
  await ctx.close()
}

console.log('✅ theme sunset shots saved to', OUT)
await browser.close()
