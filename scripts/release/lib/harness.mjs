// Release-convergence harness primitives — [QIMMAH-SOVEREIGN-PHASE-II-001] AGENT-A.
//
// Why a separate namespace from `scripts/e2e/`: the Web Sovereign run is still
// landing packages inside `scripts/e2e/**`. Everything this program adds lives
// under `scripts/release/**` so a later rebase onto the final HEAD cannot
// collide with that run's files.
//
// Design contract of this file:
//   • ONE build per artifact mode, reused by every persona (the existing suites
//     each rebuild; that is ~7 redundant production builds per full pass).
//   • Every assertion is recorded with its evidence so the verdict document can
//     cite a machine-readable record instead of prose.
//   • No `|| true`, no soft-fail, no inflated timeouts. A suite that cannot run
//     is reported as BLOCKED with a named reason, never as a pass.

import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

/** Artifact modes. `prod` is what ships; `mock` exists only for the sanctioned test seam. */
export const ARTIFACTS = {
  prod: { outDir: 'dist-release/prod', port: 5411, env: {}, label: 'production build (no entitlement seam)' },
  mock: {
    outDir: 'dist-release/mock',
    port: 5412,
    env: { VITE_ENTITLEMENT_MODE: 'mock' },
    label: 'test-only build (VITE_ENTITLEMENT_MODE=mock)',
  },
}

// ─────────────────────────── recording ───────────────────────────

/**
 * A recorder collects named assertions. `check` is the ONLY way a suite may
 * report a result: it always stores the observed evidence, so a later reader can
 * tell a real pass from a vacuous one.
 */
export function createRecorder(suite) {
  const checks = []
  let section = '(unsectioned)'
  const rec = {
    suite,
    checks,
    section(name) {
      section = name
      console.log(`\n  ── ${name}`)
    },
    check(label, ok, evidence = '') {
      const entry = { section, label, ok: !!ok, evidence: String(evidence).slice(0, 600) }
      checks.push(entry)
      console.log(`    ${ok ? '✓' : '✗ FAIL:'} ${label}${ok || !entry.evidence ? '' : ` — ${entry.evidence}`}`)
      return !!ok
    },
    /** A capability that genuinely cannot be exercised here. Never counted as a pass. */
    blocked(label, reason) {
      checks.push({ section, label, ok: null, blocked: true, evidence: reason })
      console.log(`    ⛔ EXTERNALLY_BLOCKED: ${label} — ${reason}`)
    },
    get pass() { return checks.filter((c) => c.ok === true).length },
    get fail() { return checks.filter((c) => c.ok === false).length },
    get blockedCount() { return checks.filter((c) => c.blocked).length },
    summary() {
      return {
        suite,
        pass: rec.pass,
        fail: rec.fail,
        blocked: rec.blockedCount,
        failures: checks.filter((c) => c.ok === false).map((c) => ({ section: c.section, label: c.label, evidence: c.evidence })),
        checks,
      }
    },
  }
  return rec
}

// ─────────────────────────── build & serve ───────────────────────────

/** Builds one artifact with the real production Vite pipeline into its own outDir. */
export function buildArtifact(mode) {
  const spec = ARTIFACTS[mode]
  if (!spec) throw new Error(`unknown artifact mode: ${mode}`)
  const abs = resolve(ROOT, spec.outDir)
  rmSync(abs, { recursive: true, force: true })
  mkdirSync(abs, { recursive: true })
  const t0 = Date.now()
  const run = spawnSync('npx', ['vite', 'build', '--outDir', spec.outDir, '--emptyOutDir'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...spec.env },
  })
  if (run.status !== 0) throw new Error(`vite build failed for artifact "${mode}" (exit ${run.status})`)
  if (!existsSync(resolve(abs, 'index.html'))) throw new Error(`artifact "${mode}" produced no index.html`)
  return { mode, outDir: spec.outDir, absDir: abs, ms: Date.now() - t0 }
}

/** Serves a built artifact with `vite preview` — the shipped bytes, not the dev server. */
export function serveArtifact(mode) {
  const spec = ARTIFACTS[mode]
  const proc = spawn(
    'npx',
    ['vite', 'preview', '--outDir', spec.outDir, '--port', String(spec.port), '--strictPort'],
    { cwd: ROOT, stdio: 'ignore', env: process.env },
  )
  return { proc, url: `http://localhost:${spec.port}` }
}

export async function waitForServer(url, ms = 40000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try { if ((await fetch(url)).ok) return true } catch { /* not yet listening */ }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`preview server did not start at ${url} within ${ms}ms`)
}

// ─────────────────────────── browsers ───────────────────────────

/**
 * Probes an engine without pretending. If WebKit is absent the caller records
 * VALIDATION_DOWNGRADE = WEBKIT_UNAVAILABLE rather than silently using Chromium
 * and calling it an iPhone result.
 */
export async function engineAvailable(playwright, name) {
  try {
    const b = await playwright[name].launch()
    const v = b.version()
    await b.close()
    return { available: true, version: v }
  } catch (e) {
    return { available: false, reason: String(e).split('\n')[0] }
  }
}

// ─────────────────────────── viewport matrix ───────────────────────────

/** Mandated widths. Heights approximate real devices; only width drives layout. */
export const WIDTHS = [
  { w: 320, h: 568, name: 'iPhone SE (1st gen) — narrowest supported' },
  { w: 360, h: 740, name: 'small Android' },
  { w: 375, h: 667, name: 'iPhone SE (2/3)' },
  { w: 390, h: 844, name: 'iPhone 12/13/14' },
  { w: 393, h: 852, name: 'iPhone 15/16' },
  { w: 414, h: 896, name: 'iPhone 11 / XR' },
  { w: 430, h: 932, name: 'iPhone Pro Max' },
  { w: 768, h: 1024, name: 'tablet portrait' },
  { w: 1024, h: 768, name: 'tablet landscape' },
  { w: 1280, h: 900, name: 'desktop' },
]

// ─────────────────────────── page helpers ───────────────────────────

export const settle = (page, ms = 1400) => page.waitForTimeout(ms)

/** Click the first visible button/link whose text matches. Never force-clicks. */
export async function tap(page, re, { timeout = 10000 } = {}) {
  await page.locator('button, a').filter({ hasText: re }).first().click({ timeout })
}

export async function tapIfPresent(page, re, { timeout = 2500 } = {}) {
  const loc = page.locator('button, a').filter({ hasText: re }).first()
  if (await loc.count().catch(() => 0)) {
    if (await loc.isVisible().catch(() => false)) {
      await loc.click({ timeout }).catch(() => {})
      return true
    }
  }
  return false
}

export const gateVisible = (page) =>
  page.locator('[data-testid="premium-gate"]').isVisible().catch(() => false)

export async function dismissGate(page) {
  const gate = page.locator('[data-testid="premium-gate"]')
  if (!(await gate.isVisible().catch(() => false))) return false
  await gate.locator('[data-testid="premium-gate-dismiss"]').click({ timeout: 8000 })
  await gate.waitFor({ state: 'hidden', timeout: 8000 })
  return true
}

export const goRoute = async (page, route, ms = 2200) => {
  await page.evaluate((h) => { window.location.hash = '/' + h }, route)
  await settle(page, ms)
}

/**
 * Full snapshot of every registered user-data key. The judgement of "did the
 * paid action happen?" is always a byte comparison of this, never button
 * visibility — hiding a control is not a boundary.
 */
export const storageSnapshot = (page) => page.evaluate(() => {
  const out = {}
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i)
      if (k && k.startsWith('qimmah:')) out[k] = window.localStorage.getItem(k)
    }
  } catch { /* storage unavailable — caller sees an empty map and its own probe */ }
  return out
})

/** Keys whose value differs between two snapshots (added, removed or changed). */
export function storageDiff(before, after) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  const changed = []
  for (const k of keys) if (before[k] !== after[k]) changed.push(k)
  return changed.sort()
}

/** Raw text of the visible page — used to prove no stack trace reaches the user. */
export const bodyText = (page) => page.evaluate(() => document.body.innerText || '')

/** Does the page show a raw exception / stack trace / dev artefact to the user? */
export const RAW_EXCEPTION_RE =
  /PaidActionDenied|NutritionStorageError|QuotaExceededError|SecurityError|TypeError|ReferenceError|undefined is not|Cannot read propert|at Object\.<anonymous>|\bstack\b:/i

/** Attaches error collectors to a page and returns the live arrays. */
export function collectErrors(page) {
  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', (e) => pageErrors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  return { pageErrors, consoleErrors }
}

/**
 * Console noise that is a legitimate part of the shipped experience and is not a
 * defect. Kept as a NAMED allowlist so §4.2 applies: anything outside it is a
 * finding, and the list itself is printed in the evidence.
 */
export const BENIGN_CONSOLE = [
  /Failed to load resource.*favicon/i,
  /ServiceWorker|sw\.js/i,
  /Download the React DevTools/i,
]

/**
 * Page errors that are ENVIRONMENT artefacts of running a production artifact
 * over plain http on localhost, not product defects. Named, not blanket:
 *  • WebKit refuses to register a service worker from a non-secure origin, so it
 *    raises "Cannot load http://…/sw.js due to access control checks". On the
 *    real https origin the same registration succeeds. `main.tsx` already
 *    tolerates a failed registration.
 *  • A deliberately aborted lazy chunk surfaces as a dynamic-import failure —
 *    that IS the condition under test, and the assertion is about what the USER
 *    is shown, not about the absence of the injected failure.
 */
export const ENVIRONMENT_PAGE_ERRORS = [
  /Cannot load http:\/\/[^\s]*sw\.js due to access control checks/i,
  /Failed to register a ServiceWorker/i,
]

export const realPageErrors = (errors) => errors.filter((e) => !ENVIRONMENT_PAGE_ERRORS.some((re) => re.test(e)))

export const realConsoleErrors = (errors) => errors.filter((e) => !BENIGN_CONSOLE.some((re) => re.test(e)))
