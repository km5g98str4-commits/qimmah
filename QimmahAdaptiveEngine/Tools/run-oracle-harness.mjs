// QAE Oracle Harness runner ([CTO-QAE-002] Phase 1).
// Bundles oracle-adapter.ts (legacy imports via @→src) with the repo's standard
// esbuild + mocked-localStorage pattern, executes the legacy engines on every
// fixture whose blocks are CHARACTERIZED_EXISTING + goldenPending, and writes
// canonical goldens to Fixtures/golden/. Deterministic: run twice, byte-identical.
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { readFileSync, writeFileSync, readdirSync, mkdirSync, mkdtempSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '../..')
const qae = resolve(root, 'QimmahAdaptiveEngine')

const banner = `
const __store = new Map();
const __ls = {
  get length() { return __store.size; },
  key(i) { return Array.from(__store.keys())[i] ?? null; },
  getItem: (k) => (__store.has(k) ? __store.get(k) : null),
  setItem: (k, v) => { __store.set(k, String(v)); },
  removeItem: (k) => { __store.delete(k); },
  clear: () => { __store.clear(); },
};
globalThis.localStorage = __ls;
globalThis.window = { localStorage: __ls, addEventListener() {}, removeEventListener() {} };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`

const result = await build({
  entryPoints: [resolve(qae, 'Tools/oracle-adapter.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  logLevel: 'silent',
})

const outDir = mkdtempSync(join(tmpdir(), 'qae-oracle-'))
const bundlePath = join(outDir, 'oracle-adapter.bundle.mjs')
writeFileSync(bundlePath, result.outputFiles[0].text)
const adapter = await import(pathToFileURL(bundlePath).href)

// Canonical serialization mirrored from Domain/Shared/canonical.ts (pure, tiny).
const canonical = (v) => {
  if (v === null) return 'null'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') {
    if (!Number.isSafeInteger(v)) throw new Error('golden float violation: ' + v)
    return String(v)
  }
  if (typeof v === 'string') return JSON.stringify(v)
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']'
  const keys = Object.keys(v).sort()
  return '{' + keys.filter((k) => v[k] !== undefined).map((k) => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}'
}
const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex')

const specDir = resolve(qae, 'Fixtures/spec')
const goldenDir = resolve(qae, 'Fixtures/golden')
mkdirSync(goldenDir, { recursive: true })

const fixtures = readdirSync(specDir).filter((f) => f.endsWith('.json')).sort()
let generated = 0
const skipped = []
const coverage = []

for (const file of fixtures) {
  const fx = JSON.parse(readFileSync(join(specDir, file), 'utf8'))
  const blocks = Object.entries(fx.expected).filter(
    ([, b]) => b.label === 'CHARACTERIZED_EXISTING' && b.goldenPending === true,
  )
  if (blocks.length === 0) {
    skipped.push(fx.scenarioId)
    continue
  }
  if (fx.requestKind !== 'initialPlan') {
    coverage.push({ scenario: fx.scenarioId, status: 'pending-later-phase', reason: 'oracle adapter covers initialPlan in Phase 1' })
    continue
  }
  const oracle = adapter.runOracle(fx.input.profile)
  const golden = {
    scenarioId: fx.scenarioId,
    generatedBy: 'legacy-ts-oracle',
    oracleModules: ['src/lib/calculators.ts', 'src/lib/planGenerator.ts'],
    determinism: fx.determinism,
    goldenFor: blocks.map(([name]) => name),
    canonical: oracle,
  }
  const body = canonical(golden)
  const payload = { ...golden, contentHash: sha256(body) }
  writeFileSync(join(goldenDir, `${fx.scenarioId}.golden.json`), JSON.stringify(payload, null, 2) + '\n')
  coverage.push({ scenario: fx.scenarioId, status: 'golden', hash: payload.contentHash.slice(0, 12) })
  generated++
}

const report = {
  fixturesTotal: fixtures.length,
  goldensGenerated: generated,
  pendingLaterPhase: coverage.filter((c) => c.status === 'pending-later-phase').map((c) => c.scenario),
  noGoldenNeeded: skipped,
  coverage,
}
writeFileSync(join(goldenDir, 'COVERAGE.json'), JSON.stringify(report, null, 2) + '\n')
console.log(`oracle harness: ${generated} goldens generated, ${report.pendingLaterPhase.length} pending later phases, ${skipped.length} fixtures need no golden`)
for (const c of coverage) console.log(`  ${c.scenario}: ${c.status}${c.hash ? ' ' + c.hash : ''}`)
