// تدقيق مطابقة v3 — لقطات تمثيلية 393×852 لكل منطقة (تقرير فقط، لا تعديل).
// التشغيل: PREVIEW_URL=http://localhost:5206 node scripts/fidelity-shots.mjs

import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const URL = process.env.PREVIEW_URL || 'http://localhost:5206'
const OUT = 'docs/audit/v3-fidelity-shots'
const [W, H] = [393, 852]
const UID = '0000000000000040000800000000000011d0'
mkdirSync(OUT, { recursive: true })

const session = {
  access_token: `mock.${Buffer.from(JSON.stringify({ sub: UID, role: 'authenticated' })).toString('base64')}.sig`,
  token_type: 'bearer', expires_in: 3600, expires_at: 1815837294, refresh_token: 'mock-refresh-token',
  user: { id: UID, aud: 'authenticated', role: 'authenticated', email: 'appreview@qimmah.app', email_confirmed_at: '2026-01-01T00:00:00.000Z', confirmed_at: '2026-01-01T00:00:00.000Z', user_metadata: { display_name: 'قِمّة' }, app_metadata: {}, created_at: '2026-01-01T00:00:00.000Z' },
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
async function ctxWith(extra = {}, theme = 'light') {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, locale: 'ar' })
  const seed = { ...base, ...extra }
  if (theme === 'dark') seed['qimmah:prefs:v1'] = JSON.stringify({ language: 'ar', hapticsEnabled: true, theme: 'dark' })
  await ctx.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v) }, seed)
  return ctx
}
async function shot(ctx, hash, waitText, file) {
  const page = await ctx.newPage()
  await page.goto(`${URL}/${hash}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2700)
  try { if (waitText) await page.getByText(waitText).first().waitFor({ state: 'visible', timeout: 12000 }) } catch { /* capture anyway */ }
  await page.screenshot({ path: `${OUT}/${file}` })
  await ctx.close()
}

// Area 15–21 · Today (normal, seeded steps+meal)
await shot(await ctxWith({ 'qimmah:steps:v1': JSON.stringify({ [new Date().toLocaleDateString('en-CA')]: 8000 }) }), '#/dashboard', 'مسار اليوم', 'a15-today.png')
// Area 22–36 · Workout plan (core loop entry)
await shot(await ctxWith(), '#/workout', 'ابدأ الجلسة', 'a22-workout-plan.png')
// Area 37–47 · Nutrition (honest data + sources)
await shot(await ctxWith(), '#/nutrition', 'السعرات', 'a37-nutrition.png')
// Area 48–62 · Progress
await shot(await ctxWith(), '#/progress', null, 'a48-progress.png')
// Area 63–80 · Profile shell (5-tab structure + header)
await shot(await ctxWith(), '#/profile', 'ملفك التدريبي', 'a63-profile.png')
// Dark surface (Graphite) — settings in dark theme
{
  const ctx = await ctxWith({}, 'dark')
  const page = await ctx.newPage()
  await page.goto(`${URL}/#/profile`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2700)
  try { await page.getByText('الإعدادات والخصوصية').first().click(); await page.waitForTimeout(500) } catch { /* */ }
  await page.screenshot({ path: `${OUT}/dark-surface-settings.png` })
  await ctx.close()
}
// Empty state (new user) — states audit
await shot(await ctxWith({ 'qimmah:onboarding:profile:v1': '', 'qimmah:onboarding:v1': JSON.stringify({ completed: false, lastStep: 0 }) }), '#/dashboard', null, 'state-empty-newuser.png')

console.log('✅ fidelity shots saved to', OUT)
await browser.close()
