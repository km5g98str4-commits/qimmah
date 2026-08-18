// لقطات إثبات لشاشة المعيار 68 «آبل هيلث والأجهزة» بأبعاد iPhone 15 (393×852pt @2x).
// طرف عميل بحت: يزرع جلسة Supabase وهمية في مفتاح التطبيق (qimmah:supabase-auth:v1)
// على غرار سلسلة الإثباتات، ثم يتنقّل عبر الواجهة الحقيقية إلى الإعدادات ويلتقط
// مصادر المقاييس (خطوات/وزن) + حالة معدّل القلب «غير متوفّر» بلا رقم مُختلق.
// التشغيل: PREVIEW_URL=http://localhost:5199 node scripts/apple-health-shots.mjs

import { mkdirSync } from 'node:fs'
import { chromium } from './e2e/lib/engine.mjs'

const URL = process.env.PREVIEW_URL || 'http://localhost:5199'
const OUT = 'docs/proof/apple-health'
const W = 393
const H = 852
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
  'qimmah:prefs:v1': JSON.stringify({ language: 'ar', hapticsEnabled: true, theme: 'light' }),
  'qimmah:history:migrated:v1': 'done',
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, locale: 'ar' })
await ctx.addInitScript((s) => {
  for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v)
}, seed)
const page = await ctx.newPage()

await page.goto(`${URL}/#/profile`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1200)

await page.getByText('الإعدادات والخصوصية').first().click()
await page.getByText('آبل هيلث والأجهزة').first().waitFor({ state: 'visible' })

// لقطة 1: رأس الشاشة + الخطوات (المصدر + الإدخال اليدوي).
await page.getByText('آبل هيلث والأجهزة').first().scrollIntoViewIfNeeded()
await page.waitForTimeout(300)
await page.screenshot({ path: `${OUT}/68-steps.png` })

// لقطة 2: الوزن + معدّل القلب «غير متوفّر».
await page.getByText('معدّل القلب', { exact: true }).first().scrollIntoViewIfNeeded()
await page.waitForTimeout(300)
await page.screenshot({ path: `${OUT}/68-weight-heart.png` })

// لقطة 3 (بونص): مجموعة الصحة كاملة (fullPage) للمرجع.
await page.screenshot({ path: `${OUT}/68-health-full.png`, fullPage: true })

console.log('✅ apple-health shots saved to', OUT)
await browser.close()
