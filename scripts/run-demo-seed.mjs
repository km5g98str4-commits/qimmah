import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'

if (!process.argv.includes('--profile=reviewer')) {
  throw new Error('Use the approved reviewer profile: --profile=reviewer')
}

const PORT = 5198
const BASE = `http://127.0.0.1:${PORT}/scripts/momentum-shot/`
const OUT = 'docs/proof/design-v21-momentum/screenshots'
const surfaces = ['welcome', 'onboarding', 'today', 'nutrition', 'progress', 'profile', 'workout', 'summary']
const widths = [320, 768, 1280]
const heights = { 320: 720, 768: 1024, 1280: 900 }
const failures = []

const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  detached: true,
  stdio: 'ignore',
})

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if ((await fetch(BASE)).ok) return
    } catch {
      // Vite is still starting.
    }
    await sleep(250)
  }
  throw new Error('visual proof server did not start')
}

async function openSurface(page, surface) {
  await page.goto(`${BASE}?surface=${surface}`, { waitUntil: 'networkidle' })
  if (surface === 'workout') {
    await page.getByRole('button', { name: 'ابدأ الجلسة' }).click()
    await page.waitForTimeout(150)
  }
  if (surface === 'summary') {
    await page.getByRole('button', { name: /تنشيف/ }).click()
    await page.getByRole('button', { name: 'التالي' }).click()
    await page.getByRole('button', { name: 'التالي' }).click()
    const choices = page.locator('fieldset button')
    await choices.nth(0).click()
    await choices.nth(3).click()
    await page.getByRole('button', { name: 'اعتمد خطتي' }).click()
    await page.getByRole('heading', { name: 'خطتك جاهزة' }).waitFor()
  }
}

function ratio(lighter, darker) {
  return (lighter + 0.05) / (darker + 0.05)
}

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map((value) => parseInt(value, 16) / 255)
  const [r, g, b] = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const pairs = [
  ['Strong ink / cream', '#0E0D0A', '#F1EEE8', 4.5],
  ['Secondary ink / cream', '#2A251E', '#F1EEE8', 4.5],
  ['Muted ink / cream', '#625F5A', '#F1EEE8', 4.5],
  ['Faint ink / cream', '#726B62', '#F1EEE8', 4.5],
  ['Dark strong / dark canvas', '#F1EEE8', '#16140F', 4.5],
  ['Dark muted / dark canvas', '#C5BFB5', '#16140F', 4.5],
  ['Blue text / white', '#245FC5', '#FFFFFF', 4.5],
  ['Green text / white', '#157F46', '#FFFFFF', 4.5],
  ['Teal text / white', '#0E8578', '#FFFFFF', 4.5],
  ['Error / white', '#E11D2E', '#FFFFFF', 4.5],
  ['White large CTA / Ember', '#FFFFFF', '#F0512A', 3],
]

await mkdir(OUT, { recursive: true })
let browser
try {
  await waitForServer()
  browser = await chromium.launch()
  for (const width of widths) {
    for (const surface of surfaces) {
      const context = await browser.newContext({ viewport: { width, height: heights[width] }, locale: 'ar-SA' })
      const page = await context.newPage()
      const consoleErrors = []
      page.on('console', (message) => message.type() === 'error' && consoleErrors.push(message.text()))
      page.on('pageerror', (error) => consoleErrors.push(String(error)))
      await openSurface(page, surface)
      // Capture settled UI, not the intentional screen-entry transition.
      await page.waitForTimeout(700)
      const audit = await page.evaluate(() => ({
        dir: document.documentElement.dir,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }))
      if (audit.dir !== 'rtl') failures.push(`${surface}-${width}: dir=${audit.dir}`)
      if (audit.overflow > 1) failures.push(`${surface}-${width}: horizontal overflow ${audit.overflow}px`)
      if (consoleErrors.length) failures.push(`${surface}-${width}: console ${consoleErrors.join(' | ')}`)
      await page.screenshot({ path: `${OUT}/${surface}-${width}.png`, fullPage: true })
      await context.close()
    }
  }

  const reduced = await browser.newContext({ viewport: { width: 320, height: 720 }, reducedMotion: 'reduce', locale: 'ar-SA' })
  const reducedPage = await reduced.newPage()
  await openSurface(reducedPage, 'today')
  const motion = await reducedPage.evaluate(() => {
    const selectors = ['.v2-screen-enter', '.v2-pressable', '.v2-fill', '.v2-earned-moment']
    return selectors.flatMap((selector) => [...document.querySelectorAll(selector)].map((node) => {
      const style = getComputedStyle(node)
      return { selector, animation: style.animationDuration, transition: style.transitionDuration }
    }))
  })
  const tooSlow = motion.filter(({ animation, transition }) => {
    const duration = (value) => Math.max(...value.split(',').map((part) => parseFloat(part) * (part.includes('ms') ? 1 : 1000)))
    return duration(animation) > 1 || duration(transition) > 1
  })
  if (tooSlow.length) failures.push(`reduced motion durations: ${JSON.stringify(tooSlow)}`)
  await reduced.close()

  const contrastRows = pairs.map(([label, fg, bg, minimum]) => {
    const l1 = luminance(fg)
    const l2 = luminance(bg)
    const value = ratio(Math.max(l1, l2), Math.min(l1, l2))
    if (value + 0.001 < minimum) failures.push(`${label}: ${value.toFixed(2)} < ${minimum}`)
    return `| ${label} | \`${fg}\` | \`${bg}\` | ${value.toFixed(2)}:1 | ${minimum}:1 | ${value >= minimum ? 'Pass' : 'Fail'} |`
  })
  await writeFile(
    'docs/proof/design-v21-momentum/contrast.md',
    `# Momentum contrast proof\n\nWCAG 2.2 AA contrast pairs used across the recolored v2 surfaces. The Ember CTA is 19px bold, so the 3:1 large-text threshold applies. Errors always include an icon and text.\n\n| Role | Foreground | Background | Ratio | AA minimum | Result |\n|---|---:|---:|---:|---:|---|\n${contrastRows.join('\n')}\n`,
  )
} finally {
  if (browser) await browser.close()
  try { process.kill(-server.pid, 'SIGTERM') } catch { server.kill('SIGTERM') }
}

if (failures.length) {
  console.error(failures.map((failure) => `FAIL ${failure}`).join('\n'))
  process.exitCode = 1
} else {
  console.log(`PASS ${surfaces.length * widths.length} RTL screenshots, zero console errors, no horizontal overflow`)
  console.log('PASS reduced-motion fallbacks and WCAG AA token contrast')
}
