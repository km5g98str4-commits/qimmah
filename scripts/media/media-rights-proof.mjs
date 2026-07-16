#!/usr/bin/env node
/**
 * Media-rights inventory and proof.
 *
 * Bootstrap the reviewed manifest once:
 *   node scripts/media/media-rights-proof.mjs --bootstrap
 *
 * Enforce that every shipped exercise-media reference has an explicit rights
 * decision and prove the local payload over HTTP:
 *   node scripts/media/media-rights-proof.mjs
 *
 * Bootstrap is intentionally opt-in. Normal runs never add a new asset to the
 * ledger automatically: a new reference without a reviewed manifest row fails.
 */
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PUBLIC = resolve(ROOT, 'public')
const MANIFEST = resolve(dirname(fileURLToPath(import.meta.url)), 'provenance-manifest.json')
const BOOTSTRAP = process.argv.includes('--bootstrap')
const REMOTE = process.argv.includes('--remote')
const FREE_DB_REF = 'b0eed061e1c832b3ed815fbaa4b45b3cdc14df49'
const ROOT_DATASET_REF = '5994bea047eee4d39a2c0872be3dd8fdd258ba31'

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

function magic(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (bytes.length >= 6 && /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString('ascii'))) return 'image/gif'
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  return null
}

function exerciseEntries() {
  const source = readFileSync(resolve(ROOT, 'src/data/exerciseMedia.ts'), 'utf8')
  const entries = []
  const blocks = source.matchAll(/^[ ]{2}"([^"]+)": \{([\s\S]*?)^[ ]{2}\}(?:,|$)/gm)
  for (const [, exerciseId, body] of blocks) {
    for (const frame of ['img0', 'img1']) {
      const localPath = body.match(new RegExp(`"${frame}":\\s*"([^"]+)"`))?.[1]
      const upstreamUrl = body.match(new RegExp(`"${frame}Remote":\\s*"([^"]+)"`))?.[1]
      if (!localPath || !upstreamUrl) throw new Error(`${exerciseId}.${frame}: missing local or upstream URL`)
      entries.push({
        id: `exercise:${exerciseId}:${frame}`,
        localPath,
        upstreamUrl,
        sourceId: 'yuhonas/free-exercise-db',
        sourceRepo: 'https://github.com/yuhonas/free-exercise-db',
        evidenceUrl: `https://github.com/yuhonas/free-exercise-db/blob/${FREE_DB_REF}/LICENSE.md`,
        evidenceReadmeUrl: `https://github.com/yuhonas/free-exercise-db/blob/${FREE_DB_REF}/README.md`,
        upstreamRootRepo: 'https://github.com/wrkout/exercises.json',
        upstreamRootEvidenceUrl: `https://github.com/wrkout/exercises.json/blob/${ROOT_DATASET_REF}/LICENSE.md`,
        license: 'Unlicense / public-domain dedication',
        verdict: 'CLEARLY-LICENSED',
        attributionRequired: false,
        risk: 'clean',
      })
    }
  }
  return entries
}

const machineEvidence = {
  'chest-supported-row-machine': '163a58684c3766fc319f9a00ab8ec9102d8b104b',
  'decline-chest-press-machine': 'c53727983da8f6a895a2465bfda0ed7ed4b49625',
  'glute-kickback-machine': '600599e7bbf9c94b241a5b40183280dc93937a9a',
  'glute-machine': '77edda9770ffe59bf62fd7b19ed9b038243af8b1',
  'hack-squat-machine': '77edda9770ffe59bf62fd7b19ed9b038243af8b1',
  'hip-abduction-machine': '4f23850f0da19988280d46877b3424f0528ab14f',
  'hip-adductor-machine': '77edda9770ffe59bf62fd7b19ed9b038243af8b1',
  'iso-lateral-chest-press': '3bc50fc518fdec062358e7c65912ed1ab287403b',
  'iso-lateral-high-row': '3bc50fc518fdec062358e7c65912ed1ab287403b',
  'iso-lateral-incline-press': '966dbb209ddd10093f5ae088e9028f276f06b706',
  'iso-lateral-pulldown': '3bc50fc518fdec062358e7c65912ed1ab287403b',
  'lateral-raise-machine': '966dbb209ddd10093f5ae088e9028f276f06b706',
  'pec-deck-machine': '600599e7bbf9c94b241a5b40183280dc93937a9a',
  'preacher-curl-machine': '3e1788078676f52ee07ff165d0321a0834cb4d19',
  'rear-delt-row-machine': '600599e7bbf9c94b241a5b40183280dc93937a9a',
  'seated-calf-raise-machine': '3e1788078676f52ee07ff165d0321a0834cb4d19',
  'seated-leg-curl': '3e1788078676f52ee07ff165d0321a0834cb4d19',
  'shoulder-press-machine': '163a58684c3766fc319f9a00ab8ec9102d8b104b',
  'single-arm-lat-pulldown': 'd4acbaf18c2ab97b19e0d7abf0f1a5c54bbf92da',
  'standing-calf-raise-machine': '3e1788078676f52ee07ff165d0321a0834cb4d19',
  'standing-hip-extension-machine': 'e0a41442a5789c0286a5cd81477ead50665469bd',
  'standing-leg-curl': '163a58684c3766fc319f9a00ab8ec9102d8b104b',
  'triceps-extension-machine': 'e0a41442a5789c0286a5cd81477ead50665469bd',
  'wide-grip-iso-lateral-pulldown': '3bc50fc518fdec062358e7c65912ed1ab287403b',
}

function machineEntries() {
  const source = readFileSync(resolve(ROOT, 'src/data/machineImages.ts'), 'utf8')
  return [...source.matchAll(/^[ ]{2}'([^']+)': '([^']+)',/gm)].map(([, slug, localPath]) => {
    const commit = machineEvidence[slug]
    if (!commit) throw new Error(`${slug}: missing reviewed Git-history evidence`)
    const restricted = slug === 'decline-chest-press-machine'
    return {
      id: `machine:${slug}`,
      localPath,
      upstreamUrl: null,
      sourceId: restricted ? 'fitwill-watermarked-local-ingest' : 'unattributed-local-ingest',
      sourceRepo: null,
      evidenceUrl: `https://github.com/km5g98str4-commits/gym-os-template/commit/${commit}`,
      evidenceReadmeUrl: restricted ? 'https://fitwill.app/terms' : null,
      license: restricted ? 'No redistribution grant found; Fitwill terms reserve commercial reuse' : 'No source license or chain-of-title record found',
      verdict: restricted ? 'RESTRICTED' : 'UNKNOWN',
      attributionRequired: false,
      risk: 'launch-blocking',
      note: restricted
        ? 'Commit records explicit FITWILL watermark and approval to use, but no license grant.'
        : 'Visual approval or an owner/agent commit statement is not a transferable rights record.',
    }
  })
}

function liveInventory() {
  const entries = [...exerciseEntries(), ...machineEntries()]
  for (const entry of entries) {
    const file = resolve(PUBLIC, entry.localPath.replace(/^\//, ''))
    if (!existsSync(file)) throw new Error(`${entry.id}: local file missing: ${entry.localPath}`)
    const bytes = readFileSync(file)
    const mime = magic(bytes)
    if (!mime) throw new Error(`${entry.id}: unrecognized image magic bytes`)
    entry.sha256 = sha256(bytes)
    entry.magicMime = mime
    entry.extension = extname(entry.localPath).toLowerCase()
  }
  return entries.sort((a, b) => a.id.localeCompare(b.id))
}

function bootstrap(entries) {
  const manifest = {
    schemaVersion: 1,
    reviewedAt: '2026-07-16',
    baseCommit: '82c53ceb0e873727a38b5cfebd641e8db14f7b23',
    policy: 'Every shipped media reference requires an explicit row; UNKNOWN and RESTRICTED remain visible launch blockers.',
    entries,
  }
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`Wrote reviewed manifest: ${entries.length} entries`)
}

async function httpProof(entries) {
  const server = createServer((req, res) => {
    const entry = entries.find((item) => item.localPath === req.url)
    if (!entry) {
      res.writeHead(404).end()
      return
    }
    const bytes = readFileSync(resolve(PUBLIC, entry.localPath.slice(1)))
    res.writeHead(200, { 'content-type': magic(bytes), 'content-length': bytes.length })
    res.end(bytes)
  })
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
  const { port } = server.address()
  try {
    let passed = 0
    for (const entry of entries) {
      const response = await fetch(`http://127.0.0.1:${port}${entry.localPath}`)
      const bytes = Buffer.from(await response.arrayBuffer())
      if (response.status !== 200) throw new Error(`${entry.id}: HTTP ${response.status}`)
      if (response.headers.get('content-type') !== entry.magicMime) throw new Error(`${entry.id}: HTTP content-type mismatch`)
      if (sha256(bytes) !== entry.sha256) throw new Error(`${entry.id}: HTTP payload digest mismatch`)
      passed++
    }
    return passed
  } finally {
    await new Promise((ok, reject) => server.close((error) => error ? reject(error) : ok()))
  }
}

async function remoteProof(entries) {
  const remote = entries.filter((entry) => entry.upstreamUrl)
  let next = 0
  let passed = 0
  const worker = async () => {
    while (next < remote.length) {
      const entry = remote[next++]
      const response = await fetch(entry.upstreamUrl, { signal: AbortSignal.timeout(20_000) })
      if (!response.ok) throw new Error(`${entry.id}: upstream HTTP ${response.status}`)
      const bytes = Buffer.from(await response.arrayBuffer())
      if (!magic(bytes)) throw new Error(`${entry.id}: upstream returned non-image bytes`)
      if (sha256(bytes) !== entry.sha256) throw new Error(`${entry.id}: vendored bytes differ from declared upstream`)
      passed++
    }
  }
  await Promise.all(Array.from({ length: 12 }, worker))
  return passed
}

const live = liveInventory()
if (BOOTSTRAP) bootstrap(live)
if (!existsSync(MANIFEST)) throw new Error('provenance manifest missing; reviewed bootstrap required')
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
const reviewed = [...manifest.entries].sort((a, b) => a.id.localeCompare(b.id))

if (live.length !== 274) throw new Error(`inventory count changed: expected 274, found ${live.length}`)
if (reviewed.length !== live.length) throw new Error(`manifest count ${reviewed.length} != live count ${live.length}`)
for (let i = 0; i < live.length; i++) {
  const actual = live[i]
  const expected = reviewed[i]
  if (actual.id !== expected.id) throw new Error(`unreviewed/missing asset: live=${actual.id}, manifest=${expected.id}`)
  for (const key of ['localPath', 'upstreamUrl', 'sourceId', 'evidenceUrl', 'license', 'verdict', 'sha256', 'magicMime']) {
    if (actual[key] !== expected[key]) throw new Error(`${actual.id}: manifest drift in ${key}`)
  }
}

const httpPassed = await httpProof(reviewed)
const upstreamPassed = REMOTE ? await remoteProof(reviewed) : 0
const counts = reviewed.reduce((out, item) => ({ ...out, [item.verdict]: (out[item.verdict] || 0) + 1 }), {})
console.log(`MEDIA_RIGHTS_PROOF_OK inventory=${live.length} magic=${live.length} http=${httpPassed}`)
if (REMOTE) console.log(`UPSTREAM_PROOF_OK http_magic_digest=${upstreamPassed}`)
console.log(`VERDICTS ${Object.entries(counts).map(([key, value]) => `${key}=${value}`).join(' ')}`)
