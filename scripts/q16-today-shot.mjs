// لقطات إثبات Q16: بطاقة «تمرين اليوم» + الترحيب بالاسم + عبارة اليوم — في الثيمين.
// اللقطة ليست صورة فقط: نقيس الألوان **المرسومة فعليًا** للبطاقة المميّزة ونحسب
// نسبة التباين من البكسل الحقيقي، فلا نعتمد على التوكن وحده.
// التشغيل: PREVIEW_URL=http://localhost:5216 node scripts/q16-today-shot.mjs

import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const URL = process.env.PREVIEW_URL || 'http://localhost:5216'
const OUT = 'docs/proof/q16-today'
const [W, H] = [393, 852]
const UID = '0000000000000040000800000000000011d0'
mkdirSync(OUT, { recursive: true })

const session = {
  access_token: `mock.${Buffer.from(JSON.stringify({ sub: UID, role: 'authenticated' })).toString('base64')}.sig`,
  token_type: 'bearer', expires_in: 3600, expires_at: 1815837294, refresh_token: 'mock-refresh-token',
  user: { id: UID, aud: 'authenticated', role: 'authenticated', email: 'ziyad@qimmah.app', email_confirmed_at: '2026-01-01T00:00:00.000Z', confirmed_at: '2026-01-01T00:00:00.000Z', user_metadata: { display_name: 'زياد' }, app_metadata: {}, created_at: '2026-01-01T00:00:00.000Z' },
}

const seedFor = (theme, lang, name) => ({
  'qimmah:supabase-auth:v1': JSON.stringify(session),
  'qimmah:lastUser:v1': UID,
  'qimmah:dataOwner:v1': JSON.stringify({ ownerId: UID, stampedAt: 1784301294642 }),
  'qimmah:onboarding:accounts:v1': JSON.stringify({ [UID]: { email: 'ziyad@qimmah.app', createdAt: 1784301294642 } }),
  'qimmah:onboarding:v1': JSON.stringify({ completed: true, lastStep: 0 }),
  'qimmah:onboarding:profile:v1': JSON.stringify({ bodyMetrics: {}, goalType: 'cutting' }),
  'qimmah:history:migrated:v1': 'done',
  'qimmah:customization:v1': JSON.stringify({ profile: { name } }),
  'qimmah:prefs:v1': JSON.stringify({ language: lang, hapticsEnabled: true, theme }),
  // خطوات اليوم = تاريخ حقيقي، فتكون حالة الصفحة `normal` (لا مستخدم جديد) وتظهر
  // صياغة الترحيب المطلوبة «هلا <الاسم>، يومك في قِمّة».
  'qimmah:steps:v1': JSON.stringify({ [new Date().toLocaleDateString('en-CA')]: 6400 }),
})

// ---- حساب التباين من البكسل المرسوم فعليًا ----
// المتصفح يعيد الشفافية كما هي (`color(srgb 1 1 1 / 0.74)`)، فنركّبها فوق خلفية
// البطاقة قبل الحساب — وإلا قِسنا لونًا غير الذي تراه العين.
const parse = (s) => {
  const nums = (s.match(/[\d.]+/g) || []).map(Number)
  const srgbFloat = s.startsWith('color(srgb')
  const [r, g, b] = nums.slice(0, 3).map((c) => (srgbFloat ? c * 255 : c))
  const a = nums.length > 3 ? nums[3] : 1
  return { rgb: [r, g, b], a }
}
const over = (fg, bgRgb) => fg.rgb.map((c, i) => c * fg.a + bgRgb[i] * (1 - fg.a))
const lum = ([r, g, b]) => {
  const f = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (fgStr, bgStr) => {
  const bg = parse(bgStr).rgb
  const [x, y] = [lum(over(parse(fgStr), bg)), lum(bg)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

const browser = await chromium.launch()
let failed = false

for (const theme of ['light', 'dark']) {
  for (const lang of theme === 'light' ? ['ar', 'en'] : ['ar']) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, locale: lang === 'en' ? 'en' : 'ar', colorScheme: theme })
    await ctx.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v) }, seedFor(theme, lang, 'زياد الفهاد'))
    const page = await ctx.newPage()
    await page.goto(`${URL}/#/dashboard`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2600)

    const probe = await page.evaluate(() => {
      const card = document.querySelector('.col-span-2.v2-pressable, .v2-pressable.col-span-2')
      if (!card) return { missing: true }
      const title = card.querySelector('span.text-lg')
      const body = title?.nextElementSibling
      const cta = card.querySelector('span.mt-auto')
      const cs = getComputedStyle(card)
      // هيدر الصفحة نفسها (داخل غلاف الشاشة)، لا هيدر القوقعة العام.
      const header = document.querySelector('.v2-screen-enter > header')
      return {
        cardBg: cs.backgroundColor,
        pageBg: getComputedStyle(document.body).backgroundColor,
        titleColor: title ? getComputedStyle(title).color : null,
        titleText: title?.textContent?.trim() ?? null,
        bodyColor: body ? getComputedStyle(body).color : null,
        ctaColor: cta ? getComputedStyle(cta).color : null,
        greeting: header?.querySelector('h2')?.textContent?.trim() ?? null,
        phrase: header?.querySelector('p:not(.text-xs)')?.textContent?.trim() ?? null,
        dir: document.querySelector('[dir]')?.getAttribute('dir') ?? null,
      }
    })

    const tag = `${theme}-${lang}`
    if (probe.missing) { console.error(`✗ ${tag}: featured card not found`); failed = true; await ctx.close(); continue }

    const rTitle = ratio(probe.titleColor, probe.cardBg)
    const rBody = ratio(probe.bodyColor, probe.cardBg)
    const rCta = ratio(probe.ctaColor, probe.cardBg)
    const sep = ratio(probe.cardBg, probe.pageBg)
    console.log(`\n— ${tag} — card ${probe.cardBg} on page ${probe.pageBg}`)
    console.log(`  title "${probe.titleText}" ${probe.titleColor} → ${rTitle.toFixed(2)}:1`)
    console.log(`  body  ${probe.bodyColor} → ${rBody.toFixed(2)}:1`)
    console.log(`  cta   ${probe.ctaColor} → ${rCta.toFixed(2)}:1`)
    console.log(`  card/page separation → ${sep.toFixed(2)}:1 | dir=${probe.dir}`)
    console.log(`  greeting: ${probe.greeting}`)
    console.log(`  phrase:   ${probe.phrase}`)

    for (const [label, r, min] of [['title', rTitle, 4.5], ['body', rBody, 4.5], ['cta', rCta, 4.5]]) {
      if (!(r >= min)) { console.error(`  ✗ ${tag} ${label} painted contrast ${r.toFixed(2)} < ${min}`); failed = true }
    }
    if (!(sep > 1.03)) { console.error(`  ✗ ${tag} card does not separate from page`); failed = true }
    if (!probe.greeting || !probe.phrase) { console.error(`  ✗ ${tag} greeting/phrase missing`); failed = true }
    if (probe.dir !== (lang === 'en' ? 'ltr' : 'rtl')) { console.error(`  ✗ ${tag} wrong dir`); failed = true }

    await page.screenshot({ path: `${OUT}/today-${tag}.png` })
    await ctx.close()
  }
}

// بلا اسم: يجب ألا يظهر اسم وهمي.
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, locale: 'ar', colorScheme: 'light' })
await ctx.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v) }, seedFor('light', 'ar', ''))
const noNamePage = await ctx.newPage()
await noNamePage.goto(`${URL}/#/dashboard`, { waitUntil: 'networkidle' })
await noNamePage.waitForTimeout(2600)
const noName = await noNamePage.evaluate(() => ({
  greeting: document.querySelector('.v2-screen-enter > header h2')?.textContent?.trim() ?? '',
  phrase: document.querySelector('.v2-screen-enter > header p:not(.text-xs)')?.textContent?.trim() ?? '',
}))
console.log(`\n— no-name — greeting: ${noName.greeting} | phrase: ${noName.phrase}`)
// الشرط الحقيقي: لا اسم (ولا بقايا placeholder) عند غياب الاسم — والصياغة سليمة.
if (/زياد|undefined|null|\{|\}/.test(noName.greeting) || noName.greeting === '') {
  console.error('  ✗ fabricated name / broken wording when profile name is empty'); failed = true
} else { console.log('  ✓ generic wording, no fabricated name') }
if (!noName.phrase) { console.error('  ✗ daily phrase missing in no-name state'); failed = true }
await noNamePage.screenshot({ path: `${OUT}/today-no-name.png` })
await ctx.close()

await browser.close()
console.log(failed ? '\n❌ q16 shots FAILED' : `\n✅ q16 shots saved to ${OUT} (painted contrast verified in both themes)`)
process.exitCode = failed ? 1 : 0
