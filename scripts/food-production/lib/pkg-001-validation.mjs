import { isAbsolute, posix, relative, resolve, sep, win32 } from 'node:path'
import {
  BASELINE_COMMIT,
  NORMALIZATION_VERSION,
  PIPELINE_VERSION,
  RELEASE_STATUS,
  SCHEMA_PATH,
  SOURCE_PATH,
  sha256,
} from './canonical-food-v1.mjs'

export const ARTIFACT_PATHS = Object.freeze([
  'accepted/pkg-001.json',
  'manifests/pkg-001-source.json',
  'rejected/pkg-001.json',
  'reports/pkg-001-build.json',
  'review/pkg-001.json',
])

function fail(code, detail = '') {
  return { code, detail }
}

export function computeBuildId(inputSha, schemaSha) {
  return sha256(Buffer.from([
    inputSha,
    schemaSha,
    NORMALIZATION_VERSION,
    PIPELINE_VERSION,
  ].join(':')))
}

function pathEscapesRoot(outputRoot, artifactPath) {
  const root = resolve(outputRoot)
  const resolved = resolve(root, artifactPath)
  const rel = relative(root, resolved)
  return rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)
}

function unsafeArtifactPath(outputRoot, artifactPath) {
  if (typeof artifactPath !== 'string' || !artifactPath) return true
  if (artifactPath.includes('\0') || artifactPath.includes('\\')) return true
  if (isAbsolute(artifactPath) || win32.isAbsolute(artifactPath)) return true
  const segments = artifactPath.split('/')
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) return true
  if (posix.normalize(artifactPath) !== artifactPath) return true
  return pathEscapesRoot(outputRoot, artifactPath)
}

/**
 * يعمل قبل قراءة أي مسار يورده manifest. لا تُستخدم resolvedPaths عند وجود فشل.
 */
export function validateArtifactPathManifest(manifest, outputRoot) {
  const failures = []
  const entries = Array.isArray(manifest?.artifacts) ? manifest.artifacts : null
  if (!entries) {
    return { failures: [fail('ARTIFACT_SET_DRIFT', 'manifest.artifacts_not_array')], resolvedPaths: new Map() }
  }

  const paths = []
  for (const [index, entry] of entries.entries()) {
    const artifactPath = entry && typeof entry === 'object' && !Array.isArray(entry) ? entry.path : null
    if (unsafeArtifactPath(outputRoot, artifactPath)) {
      failures.push(fail('ARTIFACT_PATH_SCOPE', `index=${index} path=${JSON.stringify(artifactPath)}`))
    }
    if (typeof artifactPath === 'string') paths.push(artifactPath)
  }
  if (failures.length) return { failures, resolvedPaths: new Map() }

  const exactOrderedSet = paths.length === ARTIFACT_PATHS.length &&
    new Set(paths).size === paths.length &&
    paths.every((artifactPath, index) => artifactPath === ARTIFACT_PATHS[index])
  if (!exactOrderedSet) {
    failures.push(fail('ARTIFACT_SET_DRIFT', `expected=${JSON.stringify(ARTIFACT_PATHS)} actual=${JSON.stringify(paths)}`))
  }

  const resolvedPaths = new Map()
  if (failures.length === 0) {
    for (const artifactPath of paths) resolvedPaths.set(artifactPath, resolve(outputRoot, artifactPath))
  }
  return { failures, resolvedPaths }
}

export function validateBuildIdentity({ manifest, sourceEnvelope, accepted, rejected, review, report, inputSha, schemaSha }) {
  const failures = []
  const expectedBuildId = computeBuildId(inputSha, schemaSha)
  const buildIdentityValid = manifest?.build_id === expectedBuildId &&
    manifest?.normalization_version === NORMALIZATION_VERSION &&
    manifest?.pipeline_version === PIPELINE_VERSION &&
    sourceEnvelope?.pipeline_version === PIPELINE_VERSION &&
    report?.normalization_version === NORMALIZATION_VERSION &&
    report?.pipeline_version === PIPELINE_VERSION
  if (!buildIdentityValid) {
    failures.push(fail('BUILD_ID_DRIFT', `expected=${expectedBuildId} actual=${String(manifest?.build_id)}`))
  }

  const identityDocuments = [sourceEnvelope, accepted, rejected, review, report]
  const baselineIdentityValid = manifest?.baseline_commit === BASELINE_COMMIT &&
    manifest?.source?.path === SOURCE_PATH &&
    manifest?.schema?.path === SCHEMA_PATH &&
    identityDocuments.every((document) => document?.baseline_commit === BASELINE_COMMIT &&
      document?.source_path === SOURCE_PATH && document?.schema_path === SCHEMA_PATH)
  if (!baselineIdentityValid) failures.push(fail('BASELINE_IDENTITY_DRIFT'))

  const releaseStatusValid = manifest?.release_status === RELEASE_STATUS &&
    identityDocuments.every((document) => document?.release_status === RELEASE_STATUS)
  if (!releaseStatusValid) failures.push(fail('RELEASE_STATUS_DRIFT'))
  return failures
}

export function validateTerminalArtifactCounts({ manifest, accepted, rejected, review }) {
  const failures = []
  const terminalArtifacts = new Map([
    ['accepted/pkg-001.json', accepted],
    ['rejected/pkg-001.json', rejected],
    ['review/pkg-001.json', review],
  ])
  const entries = new Map(Array.isArray(manifest?.artifacts)
    ? manifest.artifacts.filter((entry) => entry && typeof entry.path === 'string').map((entry) => [entry.path, entry])
    : [])
  for (const [path, artifact] of terminalArtifacts) {
    const countValid = artifact && Number.isInteger(artifact.count) && artifact.count >= 0 &&
      Array.isArray(artifact.records) && artifact.count === artifact.records.length &&
      entries.get(path)?.count === artifact.count
    if (!countValid) failures.push(fail('ARTIFACT_COUNT_DRIFT', path))
  }
  return failures
}

export function validateHardeningCore(inputs) {
  const pathFailures = validateArtifactPathManifest(inputs.manifest, inputs.outputRoot).failures
  if (pathFailures.length) return pathFailures
  return [
    ...validateBuildIdentity(inputs),
    ...validateTerminalArtifactCounts(inputs),
  ]
}
