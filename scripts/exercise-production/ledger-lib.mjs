import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { build } from 'esbuild'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const BASELINE_COMMIT = 'cc60adfc0da0f893b101230269d4847d33490429'
export const LEDGER_PATH = resolve(ROOT, 'data/exercise-production/review-ledger.json')

export const SOURCE_FILES = [
  'src/data/exercises.ts',
  'src/data/exerciseMediaManifest.generated.ts',
  'src/data/machineImages.ts',
  'scripts/media/provenance-manifest.json',
]

const IMAGE_REVIEW_KEYS = [
  'exerciseMatch',
  'equipmentMatch',
  'startEndOrder',
  'anatomy',
  'movementReadability',
  'safeMechanics',
  'duplicateOrWrongImage',
  'mobileCrop',
]

const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const fileSha256 = (path) => sha256(readFileSync(path))
const publicFile = (publicPath) => resolve(ROOT, 'public', publicPath.replace(/^\//, ''))

function assertBaselineSources() {
  const result = spawnSync('git', ['diff', '--quiet', BASELINE_COMMIT, '--', ...SOURCE_FILES], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  if (result.status === 1) {
    throw new Error(`BASELINE_SOURCE_DRIFT: authoritative sources differ from ${BASELINE_COMMIT}`)
  }
  if (result.status !== 0) {
    throw new Error(`BASELINE_SOURCE_CHECK: git diff failed (${result.status}): ${result.stderr.trim()}`)
  }
}

async function loadProductSources() {
  const result = await build({
    stdin: {
      contents: `
        export { exercises } from '@/data/exercises'
        export { exerciseMediaManifest } from '@/data/exerciseMediaManifest.generated'
        export { machineImages } from '@/data/machineImages'
      `,
      loader: 'ts',
      resolveDir: ROOT,
    },
    absWorkingDir: ROOT,
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    alias: { '@': resolve(ROOT, 'src') },
    define: {
      'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false, VITE_SYNC_ENABLED: '' }),
    },
    logLevel: 'silent',
  })
  const source = result.outputFiles[0].text
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null
  let offset = 2
  const startOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1
      continue
    }
    const marker = buffer[offset + 1]
    if (startOfFrame.has(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) }
    }
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01) {
      offset += 2
      continue
    }
    const length = buffer.readUInt16BE(offset + 2)
    if (length < 2) return null
    offset += 2 + length
  }
  return null
}

function svgDimensions(buffer) {
  const head = buffer.toString('utf8', 0, Math.min(buffer.length, 2048))
  const width = Number(head.match(/\bwidth="([0-9.]+)"/)?.[1])
  const height = Number(head.match(/\bheight="([0-9.]+)"/)?.[1])
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null
  return { width, height }
}

export function inspectAsset(publicPath) {
  if (typeof publicPath !== 'string' || !publicPath.startsWith('/')) {
    throw new Error(`MEDIA_FILE_INTEGRITY: invalid public path ${String(publicPath)}`)
  }
  const diskPath = publicFile(publicPath)
  if (!existsSync(diskPath)) throw new Error(`MEDIA_FILE_INTEGRITY: missing ${publicPath}`)
  const bytes = readFileSync(diskPath)
  if (bytes.length === 0) throw new Error(`MEDIA_FILE_INTEGRITY: zero-byte ${publicPath}`)
  const dimensions = publicPath.endsWith('.svg') ? svgDimensions(bytes) : jpegDimensions(bytes)
  if (!dimensions) throw new Error(`MEDIA_FILE_INTEGRITY: unreadable dimensions ${publicPath}`)
  return {
    path: publicPath,
    sha256: sha256(bytes),
    width: dimensions.width,
    height: dimensions.height,
    bytes: bytes.length,
  }
}

function sourceInventory() {
  const sourceFiles = SOURCE_FILES.map((path) => ({ path, sha256: fileSha256(resolve(ROOT, path)) }))
  const sourceFingerprint = sha256(sourceFiles.map(({ path, sha256: digest }) => `${path}\0${digest}\n`).join(''))
  return { sourceFiles, sourceFingerprint }
}

function rightsFor(paths, provenanceByPath) {
  const rows = paths.map((path) => provenanceByPath.get(path))
  if (rows.some((row) => !row)) {
    const missing = paths.filter((path, index) => !rows[index])
    throw new Error(`RIGHTS_PROVENANCE: no provenance row for ${missing.join(', ')}`)
  }
  for (const [index, row] of rows.entries()) {
    const actual = inspectAsset(paths[index])
    if (row.sha256 !== actual.sha256) {
      throw new Error(`MEDIA_FILE_INTEGRITY: provenance digest mismatch for ${paths[index]}`)
    }
  }
  const evidence = [...new Set(rows.flatMap((row) => [row.evidenceUrl, row.evidenceReadmeUrl].filter(Boolean)))].sort()
  return {
    sourceId: [...new Set(rows.map((row) => row.sourceId))].sort().join(' + '),
    license: [...new Set(rows.map((row) => row.license))].sort().join(' + '),
    rightsEvidence: evidence.join(' | '),
  }
}

function emptyImageReview() {
  return Object.fromEntries(IMAGE_REVIEW_KEYS.map((key) => [key, null]))
}

function duplicateGroups(entries) {
  const byDigest = new Map()
  for (const entry of Object.values(entries)) {
    if (!entry.image || entry.image.kind !== 'START_END_PAIR') continue
    const digest = entry.image.assets.map((asset) => asset.sha256).join(':')
    const ids = byDigest.get(digest) ?? []
    ids.push(entry.exerciseId)
    byDigest.set(digest, ids)
  }
  return [...byDigest.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([assetPairDigest, exerciseIds]) => ({ assetPairDigest, exerciseIds: exerciseIds.sort() }))
    .sort((a, b) => a.exerciseIds[0].localeCompare(b.exerciseIds[0]))
}

export async function buildLedger() {
  assertBaselineSources()
  const [{ exercises, exerciseMediaManifest, machineImages }, provenance] = await Promise.all([
    loadProductSources(),
    Promise.resolve(JSON.parse(readFileSync(resolve(ROOT, 'scripts/media/provenance-manifest.json'), 'utf8'))),
  ])
  const provenanceByPath = new Map(provenance.entries.map((entry) => [entry.localPath, entry]))
  const ids = exercises.map((exercise) => exercise.id)
  if (new Set(ids).size !== ids.length) throw new Error('METADATA_PRIMARY_KEY: duplicate canonical exercise IDs')

  const entries = {}
  for (const exercise of [...exercises].sort((a, b) => a.id.localeCompare(b.id))) {
    const media = exerciseMediaManifest[exercise.id]
    if (!media) throw new Error(`MEDIA_COVERAGE: no runtime manifest row for ${exercise.id}`)
    if (media.id !== exercise.id) throw new Error(`MEDIA_KEY_MISMATCH: ${exercise.id} != ${media.id}`)

    let image = null
    if (media.status === 'stills' && media.stillStart && media.stillEnd) {
      const assets = [inspectAsset(media.stillStart.path), inspectAsset(media.stillEnd.path)]
      for (const [index, expected] of [media.stillStart, media.stillEnd].entries()) {
        const actual = assets[index]
        if (actual.width !== expected.width || actual.height !== expected.height || actual.bytes !== expected.bytes) {
          throw new Error(`MEDIA_FILE_INTEGRITY: runtime metadata mismatch for ${actual.path}`)
        }
      }
      image = {
        kind: 'START_END_PAIR',
        version: 1,
        assets,
        ...rightsFor(assets.map((asset) => asset.path), provenanceByPath),
        originalProduction: null,
        review: emptyImageReview(),
      }
    } else if (media.status === 'placeholder-only' && machineImages[exercise.id]) {
      const asset = inspectAsset(machineImages[exercise.id])
      image = {
        kind: 'MACHINE_DIAGRAM',
        version: 1,
        assets: [asset],
        ...rightsFor([asset.path], provenanceByPath),
        originalProduction: null,
        review: emptyImageReview(),
      }
    }

    entries[exercise.id] = {
      exerciseId: exercise.id,
      image,
      imageStatus: image ? 'NEEDS_REVIEW' : 'MISSING',
      video: null,
      videoStatus: 'MISSING',
      source: { image: image?.sourceId ?? null, video: null },
      reviewedAt: { image: null, video: null },
      reviewer: { image: null, video: null },
      notes: [...(image ? ['CANDIDATE_UNREVIEWED'] : ['NO_MATCHED_IMAGE_CANDIDATE']), 'NO_EXACT_REVIEWED_VIDEO'],
    }
  }

  const duplicates = duplicateGroups(entries)
  const duplicateIds = new Set(duplicates.flatMap((group) => group.exerciseIds))
  for (const id of duplicateIds) entries[id].notes.push('DUPLICATE_CONTENT_PAIR_REQUIRES_REVIEW')

  const { sourceFiles, sourceFingerprint } = sourceInventory()
  const values = Object.values(entries)
  return {
    schemaVersion: 1,
    baselineCommit: BASELINE_COMMIT,
    sourceFingerprint,
    sourceFiles,
    grain: 'one-record-per-canonical-exercise-id',
    summary: {
      catalogTotal: values.length,
      image: {
        APPROVED: values.filter((entry) => entry.imageStatus === 'APPROVED').length,
        NEEDS_REVIEW: values.filter((entry) => entry.imageStatus === 'NEEDS_REVIEW').length,
        REJECTED: values.filter((entry) => entry.imageStatus === 'REJECTED').length,
        MISSING: values.filter((entry) => entry.imageStatus === 'MISSING').length,
      },
      video: {
        APPROVED: values.filter((entry) => entry.videoStatus === 'APPROVED').length,
        NEEDS_REVIEW: values.filter((entry) => entry.videoStatus === 'NEEDS_REVIEW').length,
        REJECTED: values.filter((entry) => entry.videoStatus === 'REJECTED').length,
        MISSING: values.filter((entry) => entry.videoStatus === 'MISSING').length,
      },
      duplicateContentGroups: duplicates.length,
    },
    duplicateContentGroups: duplicates,
    exercises: entries,
  }
}

function issue(issues, code, message) {
  issues.push({ code, message })
}

function validIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value
}

export async function validateLedger(ledger) {
  const expected = await buildLedger()
  const issues = []
  const expectedIds = Object.keys(expected.exercises)
  const actualEntries = ledger?.exercises && typeof ledger.exercises === 'object' ? ledger.exercises : {}
  const actualIds = Object.keys(actualEntries)

  for (const id of expectedIds.filter((id) => !(id in actualEntries))) {
    issue(issues, 'MEDIA_COVERAGE', `missing canonical media row: ${id}`)
  }
  for (const id of actualIds.filter((id) => !(id in expected.exercises))) {
    issue(issues, 'MEDIA_ORPHAN', `media row is not canonical: ${id}`)
  }

  for (const key of actualIds.filter((id) => id in expected.exercises)) {
    const entry = actualEntries[key]
    if (!entry || entry.exerciseId !== key) {
      issue(issues, 'MEDIA_KEY_MISMATCH', `object key ${key} != exerciseId ${entry?.exerciseId}`)
      continue
    }

    if (entry.image) {
      if (!Array.isArray(entry.image.assets) || entry.image.assets.length === 0) {
        issue(issues, 'MEDIA_FILE_INTEGRITY', `${key} has no image assets`)
      } else {
        for (const asset of entry.image.assets) {
          try {
            const actual = inspectAsset(asset.path)
            if (!isDeepStrictEqual(actual, asset)) {
              issue(issues, 'MEDIA_FILE_INTEGRITY', `${key} metadata/digest mismatch for ${asset.path}`)
            }
          } catch (error) {
            issue(issues, 'MEDIA_FILE_INTEGRITY', `${key}: ${error.message}`)
          }
        }
      }
    }

    if (entry.imageStatus === 'APPROVED') {
      const reviewComplete = entry.image && IMAGE_REVIEW_KEYS.every((name) => entry.image.review?.[name] === true)
      const provenanceRows = entry.image?.assets?.map((asset) => {
        const manifest = JSON.parse(readFileSync(resolve(ROOT, 'scripts/media/provenance-manifest.json'), 'utf8'))
        return manifest.entries.find((row) => row.localPath === asset.path)
      }) ?? []
      const rightsAllowed = provenanceRows.length > 0 && provenanceRows.every((row) => ['CLEARLY-LICENSED', 'IN-HOUSE'].includes(row?.verdict))
      const rightsRecorded = Boolean(entry.image?.sourceId && entry.image?.license && entry.image?.rightsEvidence)
      if (!reviewComplete || !rightsAllowed || !rightsRecorded || !entry.reviewer?.image || !validIsoDate(entry.reviewedAt?.image)) {
        issue(issues, 'IMAGE_APPROVAL_EVIDENCE', `${key} is approved without complete review, rights, reviewer, and timestamp evidence`)
      }
    }

    if (entry.video) {
      const idValid = /^[A-Za-z0-9_-]{11}$/.test(entry.video.youtubeVideoId ?? '')
      const exactUrl = entry.video.canonicalUrl === `https://www.youtube.com/watch?v=${entry.video.youtubeVideoId}`
      const searchUrl = /youtube\.com\/results\?|[?&]search_query=/.test(entry.video.canonicalUrl ?? '')
      if (!idValid || !exactUrl || searchUrl || entry.video.exerciseId !== key) {
        issue(issues, 'VIDEO_REFERENCE_EXACT', `${key} does not contain an exact canonical YouTube reference`)
      }
    }
    if (entry.videoStatus === 'APPROVED') {
      const video = entry.video
      if (
        !video || !video.channel || !video.videoTitle || !video.reviewer ||
        !validIsoDate(video.verifiedAt) || !(video.matchConfidence > 0 && video.matchConfidence <= 1) ||
        video.publicAvailability !== 'PUBLIC' || !entry.reviewer?.video || !validIsoDate(entry.reviewedAt?.video) ||
        entry.reviewer.video !== video.reviewer || entry.reviewedAt.video !== video.verifiedAt
      ) {
        issue(issues, 'VIDEO_APPROVAL_EVIDENCE', `${key} is approved without complete video review evidence`)
      }
    }
  }

  const actualDuplicates = duplicateGroups(actualEntries)
  for (const group of actualDuplicates) {
    if (group.exerciseIds.some((id) => actualEntries[id]?.imageStatus === 'APPROVED')) {
      issue(issues, 'DUPLICATE_CONTENT_PAIR', `approved duplicate pair: ${group.exerciseIds.join(', ')}`)
    }
  }

  if (ledger?.baselineCommit !== BASELINE_COMMIT || ledger?.sourceFingerprint !== expected.sourceFingerprint || !isDeepStrictEqual(ledger?.sourceFiles, expected.sourceFiles)) {
    issue(issues, 'SOURCE_FINGERPRINT', 'baseline commit or ordered source fingerprint does not match current baseline sources')
  }

  const values = Object.values(actualEntries)
  const computedSummary = {
    catalogTotal: values.length,
    image: Object.fromEntries(['APPROVED', 'NEEDS_REVIEW', 'REJECTED', 'MISSING'].map((status) => [status, values.filter((entry) => entry.imageStatus === status).length])),
    video: Object.fromEntries(['APPROVED', 'NEEDS_REVIEW', 'REJECTED', 'MISSING'].map((status) => [status, values.filter((entry) => entry.videoStatus === status).length])),
    duplicateContentGroups: actualDuplicates.length,
  }
  if (!isDeepStrictEqual(ledger?.summary, computedSummary) || !isDeepStrictEqual(ledger?.duplicateContentGroups, actualDuplicates)) {
    issue(issues, 'SUMMARY_DRIFT', 'committed summary or duplicate queue does not match ledger records')
  }

  return { issues, duplicateContentGroups: actualDuplicates, computedSummary }
}

export function serializeLedger(ledger) {
  return `${JSON.stringify(ledger, null, 2)}\n`
}
