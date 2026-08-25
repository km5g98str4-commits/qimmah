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
  // SVG متجهي — الرسوم الداخلية (IN-HOUSE) لبطاقات الأجهزة. صورة صالحة يعرضها المتصفّح/WKWebView.
  const head = bytes.subarray(0, 64).toString('latin1').replace(/^\uFEFF/, '').trimStart()
  if (head.startsWith('<svg') || head.startsWith('<?xml')) return 'image/svg+xml'
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

// الأصول الأربعة والعشرون السابقة (٢٣ UNKNOWN + ١ FITWILL RESTRICTED) حُذفت من مسار الشحن
// واستُبدلت برسوم توضيحية متجهية أصلية (SVG) مُولّدة من scripts/media/build-machine-placeholders.mjs.
// عمل داخلي 100% بلا مصدر طرف ثالث ولا علامة تجارية → IN-HOUSE، سلسلة حقوق كاملة قابلة لإعادة التوليد.
const INHOUSE_SOURCE_ID = 'qimmah-inhouse-schematic'
const INHOUSE_GENERATOR = 'scripts/media/build-machine-placeholders.mjs'
const INHOUSE_EVIDENCE = `https://github.com/km5g98str4-commits/gym-os-template/blob/design/v21-promotion/${INHOUSE_GENERATOR}`
const INHOUSE_LICENSE = 'In-house original vector illustration — Qimmah owns full rights (no third-party source, no watermark)'

function machineEntries() {
  const source = readFileSync(resolve(ROOT, 'src/data/machineImages.ts'), 'utf8')
  return [...source.matchAll(/^[ ]{2}'([^']+)': '([^']+)',/gm)].map(([, slug, localPath]) => {
    if (!localPath.endsWith('.svg')) {
      throw new Error(`${slug}: in-house machine asset must be an .svg schematic, got ${localPath}`)
    }
    return {
      id: `machine:${slug}`,
      localPath,
      upstreamUrl: null,
      sourceId: INHOUSE_SOURCE_ID,
      sourceRepo: null,
      evidenceUrl: INHOUSE_EVIDENCE,
      evidenceReadmeUrl: 'docs/content/MEDIA-RIGHTS.md',
      license: INHOUSE_LICENSE,
      verdict: 'IN-HOUSE',
      attributionRequired: false,
      risk: 'clean',
      note: `Original branded schematic generated deterministically by ${INHOUSE_GENERATOR}; no third-party photo, watermark, or restricted material.`,
    }
  })
}

const ILLUS_GENERATOR = 'scripts/media/build-exercise-illustrations.mjs'

// رسوم الحركة الداخلية — تمارين بلا لقطة مرخّصة لنمط حركتها (كارديو/إحماء/كيبل خارج
// تغطية free-exercise-db، وتمرينان سُحبت صورتاهما لأنهما كانتا لنمط حركة مختلف).
// عمل داخلي 100% كالأجهزة تمامًا → IN-HOUSE.
function illustrationEntries() {
  const source = readFileSync(resolve(ROOT, 'src/data/exerciseIllustrations.ts'), 'utf8')
  return [...source.matchAll(/^[ ]{2}'([^']+)': '([^']+)',/gm)].map(([, slug, localPath]) => {
    if (!localPath.endsWith('.svg')) {
      throw new Error(`${slug}: in-house illustration must be an .svg, got ${localPath}`)
    }
    return {
      id: `illustration:${slug}`,
      localPath,
      upstreamUrl: null,
      sourceId: INHOUSE_SOURCE_ID,
      sourceRepo: null,
      evidenceUrl: INHOUSE_EVIDENCE,
      evidenceReadmeUrl: 'docs/content/MEDIA-RIGHTS.md',
      license: INHOUSE_LICENSE,
      verdict: 'IN-HOUSE',
      attributionRequired: false,
      risk: 'clean',
      note: `Original branded movement illustration generated deterministically by ${ILLUS_GENERATOR}; no third-party photo, watermark, or restricted material.`,
    }
  })
}

function liveInventory() {
  const entries = [...exerciseEntries(), ...machineEntries(), ...illustrationEntries()]
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

// بوابة «URL مجهول» + «magic bytes خاطئة» لكل نوع أصل (تُطبَّق حتى أثناء --bootstrap).
const TRUSTED_UPSTREAM = /^https:\/\/raw\.githubusercontent\.com\/yuhonas\/free-exercise-db\//
for (const e of live) {
  if (e.upstreamUrl !== null && !TRUSTED_UPSTREAM.test(e.upstreamUrl)) {
    throw new Error(`${e.id}: untrusted/unknown upstream URL: ${e.upstreamUrl}`)
  }
  // قاعدة الشكل بالفئة: الأصول الداخلية (أجهزة + رسوم حركة) متجهية دائمًا؛
  // وإطارات اللقطات المرخّصة خام دائمًا. SVG في فئة اللقطات = خلطٌ يلتقطه هذا.
  const isInHouseVector = e.id.startsWith('machine:') || e.id.startsWith('illustration:')
  if (isInHouseVector && e.magicMime !== 'image/svg+xml') {
    throw new Error(`${e.id}: in-house asset must be image/svg+xml, got ${e.magicMime}`)
  }
  if (!isInHouseVector && e.magicMime === 'image/svg+xml') {
    throw new Error(`${e.id}: exercise frame unexpectedly SVG (raster expected)`)
  }
}

if (BOOTSTRAP) bootstrap(live)
if (!existsSync(MANIFEST)) throw new Error('provenance manifest missing; reviewed bootstrap required')
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
const reviewed = [...manifest.entries].sort((a, b) => a.id.localeCompare(b.id))

// كان 274. التغيير المقصود [مهمة الصور]: −8 إطارات أُزيلت (٤ خرائط خاطئة نمط حركة ×٢ إطار)
// +2 رسما جهازَي ضغط الصدر +37 رسم حركة داخليًا = 305. أي انحراف عن هذا الرقم غير مقصود.
if (live.length !== 305) throw new Error(`inventory count changed: expected 305, found ${live.length}`)
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
// بوابة الحقوق النهائية: صفر UNKNOWN وصفر RESTRICTED؛ لا يُسمح إلا بـ CLEARLY-LICENSED أو IN-HOUSE.
const ALLOWED_VERDICTS = new Set(['CLEARLY-LICENSED', 'IN-HOUSE'])
const launchBlockers = reviewed.filter((e) => !ALLOWED_VERDICTS.has(e.verdict))
if (launchBlockers.length) {
  throw new Error(`launch-blocking verdicts present (${launchBlockers.length}): ${launchBlockers.map((b) => `${b.id}=${b.verdict}`).join(', ')}`)
}
console.log(`MEDIA_RIGHTS_PROOF_OK inventory=${live.length} magic=${live.length} http=${httpPassed}`)
if (REMOTE) console.log(`UPSTREAM_PROOF_OK http_magic_digest=${upstreamPassed}`)
console.log(`VERDICTS ${Object.entries(counts).map(([key, value]) => `${key}=${value}`).join(' ')}`)
