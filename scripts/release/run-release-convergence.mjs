#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
//  RELEASE CONVERGENCE — the ONE command.
//  [QIMMAH-SOVEREIGN-PHASE-II-001] AGENT-A · adversarial release QA.
//
//    node scripts/release/run-release-convergence.mjs
//
//  When the Web Sovereign run lands its FINAL HEAD, re-running the entire
//  verdict is exactly this one command again — nothing else changes.
//
//  Flags (all optional):
//    --only=p1,p5,static   run a subset (suite id prefix match)
//    --skip-build          reuse the artifacts already in dist-release/
//    --engine=chromium     restrict the browser matrix
//
//  It refuses to print a green verdict it did not earn: any suite that throws
//  is recorded as ERROR, any capability that cannot exist here is recorded as
//  EXTERNALLY_BLOCKED, and the process exit code follows the real result.
// ═══════════════════════════════════════════════════════════════════════════

import { execSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as playwright from 'playwright'
import { ROOT, buildArtifact, verifyArtifact, serveArtifact, waitForServer, engineAvailable } from './lib/harness.mjs'
import { captureGuestSeed } from './lib/drive.mjs'

const args = process.argv.slice(2)
const flag = (name, dflt = '') => (args.find((a) => a.startsWith(`--${name}=`)) || `=${dflt}`).split('=').slice(1).join('=')
const has = (name) => args.includes(`--${name}`)
const only = flag('only').split(',').map((s) => s.trim()).filter(Boolean)
const engineFilter = flag('engine')

const wanted = (id) => only.length === 0 || only.some((p) => id.startsWith(p))

const HEAD = (() => {
  try { return execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim() } catch { return 'unknown' }
})()
const HEAD_SUBJECT = (() => {
  try { return execSync('git log -1 --pretty=%s', { cwd: ROOT }).toString().trim() } catch { return '' }
})()

console.log('═'.repeat(78))
console.log('  QIMMAH RELEASE CONVERGENCE')
console.log(`  HEAD      : ${HEAD}`)
console.log(`  subject   : ${HEAD_SUBJECT}`)
console.log(`  started   : ${new Date().toISOString()}`)
console.log('═'.repeat(78))

// ── suite registry ─────────────────────────────────────────────────────────
const SUITES = [
  { id: 'static-bundle', artifact: 'prod', kind: 'static', mod: './static/bundle-safety.mjs' },
  { id: 'static-ledger', artifact: 'prod', kind: 'static', mod: './static/regression-ledger.mjs' },
  { id: 'p1-preview-user', artifact: 'prod', kind: 'browser', mod: './personas/p1-preview-user.mjs' },
  // p2 compares the mock build against the production build in the same pass, so
  // it needs BOTH artifacts served even when run alone via --only=p2.
  { id: 'p2-premium-test-state', artifact: 'mock', kind: 'browser', mod: './personas/p2-premium-test-state.mjs', alsoNeeds: ['prod'] },
  { id: 'p3-returning-guest', artifact: 'prod', kind: 'browser', mod: './personas/p3-returning-guest.mjs', needsSeed: true },
  { id: 'p4-interrupted-onboarding', artifact: 'prod', kind: 'browser', mod: './personas/p4-interrupted-onboarding.mjs' },
  { id: 'p5-dirty-state', artifact: 'prod', kind: 'browser', mod: './personas/p5-dirty-state.mjs', needsSeed: true },
  { id: 'p6-auth', artifact: 'prod', kind: 'browser', mod: './personas/p6-auth.mjs' },
  { id: 'p7-failure-conditions', artifact: 'prod', kind: 'browser', mod: './personas/p7-failure-conditions.mjs', needsSeed: true },
  { id: 'p8-responsive-matrix', artifact: 'prod', kind: 'browser', mod: './personas/p8-responsive-matrix.mjs', needsSeed: true },
]

const active = SUITES.filter((s) => wanted(s.id))
const needArtifacts = [...new Set(active.flatMap((s) => [s.artifact, ...(s.alsoNeeds || [])]))]

// ── build ──────────────────────────────────────────────────────────────────
const builds = {}
if (!has('skip-build')) {
  for (const mode of needArtifacts) {
    console.log(`\n▶ building artifact "${mode}" …`)
    builds[mode] = buildArtifact(mode)
  }
} else {
  // ── [FINAL-CONVERGENCE §15] إعادة الاستعمال تُثبَت، لا تُفترض ──────────────
  // كان `--skip-build` يعيد استعمال dist-release/ بلا أي تحقّق، ثم يختم
  // التقرير بالرأس الحالي — فنتيجة مبنيّة على SHA أقدم تُقدَّم دليلًا جاريًا.
  // الآن يرفض بفحص مسمّى (STALE_ARTIFACT_REFUSED) عند أي عدم تطابق.
  console.log('\n▶ --skip-build: verifying existing dist-release/ artifacts against HEAD …')
  for (const mode of needArtifacts) {
    builds[mode] = verifyArtifact(mode)
    console.log(`  ✓ "${mode}" built at ${String(builds[mode].head).slice(0, 9)} — matches HEAD`)
  }
}

// ── serve ──────────────────────────────────────────────────────────────────
const servers = {}
for (const mode of needArtifacts) {
  servers[mode] = serveArtifact(mode)
  await waitForServer(servers[mode].url)
  console.log(`▶ serving "${mode}" at ${servers[mode].url}`)
}

// ── engines ────────────────────────────────────────────────────────────────
const engines = []
const downgrades = []
for (const name of ['chromium', 'webkit']) {
  if (engineFilter && engineFilter !== name) continue
  const probe = await engineAvailable(playwright, name)
  if (probe.available) engines.push({ name, version: probe.version })
  else {
    downgrades.push({ code: `VALIDATION_DOWNGRADE = ${name.toUpperCase()}_UNAVAILABLE`, reason: probe.reason })
    console.log(`⚠ ${name} unavailable → VALIDATION_DOWNGRADE = ${name.toUpperCase()}_UNAVAILABLE`)
  }
}
if (engines.length === 0 && active.some((s) => s.kind === 'browser')) {
  throw new Error('no browser engine available — browser suites cannot run; refusing to report a verdict')
}
console.log(`▶ engines: ${engines.map((e) => `${e.name} ${e.version}`).join(', ') || 'none'}`)

// WebKit is the mandated engine for critical iPhone paths. It runs the persona
// subset below; Chromium runs the full matrix (it is the only engine with the
// storage-tampering surface some attacks need).
const WEBKIT_SUITES = ['p1-preview-user', 'p3-returning-guest', 'p8-responsive-matrix']

// ── run ────────────────────────────────────────────────────────────────────
const results = []
let seed = null

for (const engine of engines) {
  // نفس علاج `e2e/lib/engine.mjs`: الحاويات تحمل Chromium بنسخة بناء تخالف ما
  // تطلبه حزمة playwright، فيفشل الإطلاق ولو كان في الجهاز متصفّح صالح. هذا
  // المشغّل يختار محرّكه بالاسم فلا يمرّ بالوحدة المشتركة — فيقرأ العلَم بنفسه.
  const launchOpts = engine.name === 'chromium' && process.env.PW_CHROMIUM
    ? { executablePath: process.env.PW_CHROMIUM }
    : {}
  const browser = await playwright[engine.name].launch(launchOpts)
  try {
    for (const suite of active) {
      if (suite.kind === 'static' && engine.name !== engines[0].name) continue
      if (engine.name === 'webkit' && !WEBKIT_SUITES.includes(suite.id)) continue

      const url = servers[suite.artifact].url
      const label = suite.kind === 'static' ? suite.id : `${suite.id} @ ${engine.name}`
      console.log(`\n${'─'.repeat(78)}\n▶ ${label}`)
      try {
        const mod = await import(suite.mod)
        if (suite.needsSeed && !seed) {
          console.log('  (capturing the completed-guest seed once …)')
          seed = await captureGuestSeed(browser, servers.prod?.url || url)
        }
        const out = await mod.run({ browser, url, engine: engine.name, seed, artifactDir: `dist-release/${suite.artifact}`, playwright })
        results.push({ ...out, id: suite.id, engine: suite.kind === 'static' ? 'static' : engine.name })
      } catch (e) {
        console.log(`  ✗ SUITE ERROR: ${String(e).split('\n')[0]}`)
        results.push({
          suite: label, id: suite.id, engine: engine.name, pass: 0, fail: 1, blocked: 0,
          error: String(e).split('\n').slice(0, 4).join(' | '),
          failures: [{ section: 'suite', label: 'suite threw before completing', evidence: String(e).split('\n')[0] }],
          checks: [],
        })
      }
    }
  } finally {
    await browser.close()
  }
}

// ── teardown ───────────────────────────────────────────────────────────────
for (const s of Object.values(servers)) s.proc.kill()

// ── report ─────────────────────────────────────────────────────────────────
const totals = results.reduce((a, r) => ({
  pass: a.pass + r.pass, fail: a.fail + r.fail, blocked: a.blocked + (r.blocked || 0),
}), { pass: 0, fail: 0, blocked: 0 })

const outDir = resolve(ROOT, 'docs/execution/qimmah-postweb/release/evidence')
mkdirSync(outDir, { recursive: true })
const record = {
  contract: 'QIMMAH-SOVEREIGN-PHASE-II-001',
  agent: 'AGENT-A',
  head: HEAD,
  headSubject: HEAD_SUBJECT,
  ranAt: new Date().toISOString(),
  // الحكم «مبدئي» يُحسب ولا يُثبَّت: مبدئي فقط حين نقص محرّك أو أُقصيت أطقم.
  provisional: downgrades.length > 0 || only.length > 0,
  provisionalReason:
    downgrades.length > 0
      ? `validation downgraded: ${downgrades.map((d) => d.code).join(', ')}`
      : only.length > 0
        ? `partial run — only=${only.join(',')}`
        : null,
  artifactsReused: has('skip-build'),
  builds,
  engines,
  validationDowngrades: downgrades,
  totals,
  suites: results,
}
writeFileSync(resolve(outDir, 'latest.json'), JSON.stringify(record, null, 2))
writeFileSync(resolve(outDir, `run-${HEAD.slice(0, 7)}-${Date.now()}.json`), JSON.stringify(record, null, 2))

console.log(`\n${'═'.repeat(78)}`)
for (const r of results) {
  const mark = r.fail === 0 ? '✅' : '❌'
  console.log(`${mark} ${r.suite.padEnd(46)} pass ${String(r.pass).padStart(3)} · fail ${String(r.fail).padStart(2)} · blocked ${r.blocked || 0}`)
}
console.log('─'.repeat(78))
console.log(`TOTAL  pass ${totals.pass} · fail ${totals.fail} · externally-blocked ${totals.blocked}`)
for (const d of downgrades) console.log(`⚠ ${d.code}`)
console.log(`evidence → docs/execution/qimmah-postweb/release/evidence/latest.json`)
console.log('═'.repeat(78))

if (totals.fail > 0) {
  console.log('\nFAILURES:')
  for (const r of results) for (const f of r.failures || []) console.log(`  · [${r.suite}] ${f.section} → ${f.label}${f.evidence ? ` — ${f.evidence}` : ''}`)
  process.exit(1)
}
