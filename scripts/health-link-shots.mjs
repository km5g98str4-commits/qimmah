// لقطات إثبات لبطاقة «صحتي من Apple» (Q18) — الحالات الأربع، عربي وإنجليزي،
// بأبعاد iPhone 15 (393×852pt @2x).
//
// طرف عميل بحت: يزرع جلسة Supabase وهمية (نفس نمط سلسلة الإثباتات)، ويحاكي منصّة
// iOS الأصلية عبر ختم `window.Capacitor` قبل تحميل الحزمة — لأن `isHealthReadPlatform()`
// تشترط منصّة أصلية، ولا يمكن الوصول للحالات الثلاث الأخرى من متصفّح عادي.
// **لا يلمس مصدر التطبيق**، ولا يزرع أي قيمة صحية — فقط أعلام الاتصال.
//
// التشغيل: PREVIEW_URL=http://localhost:5211 node scripts/health-link-shots.mjs

import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const URL = process.env.PREVIEW_URL || 'http://localhost:5211'
const OUT = 'docs/proof/health-link'
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

const baseSeed = (lang) => ({
  'qimmah:supabase-auth:v1': JSON.stringify(session),
  'qimmah:lastUser:v1': UID,
  'qimmah:onboarding:accounts:v1': JSON.stringify({ [UID]: { email: 'appreview@qimmah.app', createdAt: 1784301294642 } }),
  'qimmah:onboarding:v1': JSON.stringify({ completed: true, lastStep: 0 }),
  'qimmah:prefs:v1': JSON.stringify({ language: lang, hapticsEnabled: true, theme: 'light' }),
  'qimmah:history:migrated:v1': 'done',
})

const CONNECTION_KEY = 'qimmah:health:connection:v1'
const SAMPLES_KEY = 'qimmah:health:samples:v1'

/** أعلام الاتصال لكل حالة — بلا أي قيمة صحية إلا عيّنة خطوات واحدة للحالة «مربوط». */
const STATES = {
  'not-connected': { native: true, extra: {} },
  'needs-review': {
    native: true,
    extra: {
      [CONNECTION_KEY]: JSON.stringify({
        version: 1, requested: true, requestedAt: '2026-07-26T09:00:00.000Z',
        requestedMetrics: ['steps', 'bodyMass'], enabled: { steps: true, bodyMass: true }, lastSync: {},
      }),
    },
  },
  connected: {
    native: true,
    extra: {
      [CONNECTION_KEY]: JSON.stringify({
        version: 1, requested: true, requestedAt: '2026-07-26T09:00:00.000Z',
        requestedMetrics: ['steps', 'bodyMass'], enabled: { steps: true, bodyMass: true },
        lastSync: { steps: '2026-07-26T09:05:00.000Z' },
      }),
      // عيّنة واحدة فقط لإظهار حالة «مربوط» — قيمة صورية في لقطة إثبات، لا بيانات مستخدم.
      [SAMPLES_KEY]: JSON.stringify({ version: 1, anchors: {}, metrics: { steps: [{ metric: 'steps', start: '2026-07-26T08:00:00.000Z', end: '2026-07-26T09:00:00.000Z', value: 1234, unit: 'count', source: 'iPhone' }] } }),
    },
  },
  unavailable: { native: false, extra: {} },
}

const browser = await chromium.launch()
let shots = 0

for (const lang of ['ar', 'en']) {
  for (const [state, cfg] of Object.entries(STATES)) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, locale: lang })
    await ctx.addInitScript(
      ({ seed, native }) => {
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
        if (!native) return
        // محاكاة الغلاف الأصلي عبر نقطة الحقن الرسمية في Capacitor.
        // isHealthReadPlatform() تشترط منصّة أصلية، ولا يمكن بلوغ الحالات الثلاث
        // الأخرى من متصفّح عادي. الجسر هنا يعلن التوفّر ولا يُرجع أي عيّنة.
        const okPage = async () => ({ status: 'ok', samples: [] })
        globalThis.CapacitorCustomPlatform = {
          name: 'ios',
          plugins: {
            HealthKitSteps: {
              isAvailable: async () => ({ available: true }),
              supportedMetrics: async () => ({ available: true, metrics: ['steps', 'bodyMass'] }),
              requestAuthorization: async () => ({ permission: 'unknown' }),
              getQuantitySamples: okPage,
              getSleepSamples: okPage,
              getWorkouts: okPage,
            },
            // إسكات إضافات لا شأن لها بهذه اللقطات.
            LocalNotifications: {
              checkPermissions: async () => ({ display: 'granted' }),
              requestPermissions: async () => ({ display: 'granted' }),
              schedule: async () => ({ notifications: [] }),
              cancel: async () => ({}),
              getPending: async () => ({ notifications: [] }),
              registerActionTypes: async () => ({}),
              addListener: () => ({ remove: async () => {} }),
            },
            Haptics: { impact: async () => ({}), notification: async () => ({}), selectionStart: async () => ({}), selectionEnd: async () => ({}) },
          },
        }
      },
      { seed: { ...baseSeed(lang), ...cfg.extra }, native: cfg.native },
    )

    const page = await ctx.newPage()
    await page.goto(`${URL}/#/settings`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3500)
    await page.screenshot({ path: `${OUT}/card-${state}-${lang}.png` })
    shots++

    // صفحة الربط نفسها للحالات المتاحة
    if (cfg.native) {
      await page.goto(`${URL}/#/health`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2500)
      await page.screenshot({ path: `${OUT}/page-${state}-${lang}.png`, fullPage: true })
      shots++
    }
    await ctx.close()
  }
}

await browser.close()
console.log(`✅ ${shots} لقطة في ${OUT}/`)
