import { createHash } from 'node:crypto'
import { lstatSync, readdirSync, readFileSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'

function fail(code, detail) {
  const error = new Error(`${code}: ${detail}`)
  error.code = code
  throw error
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

function portableRelative(root, path) {
  const value = relative(root, path).split(sep).join('/')
  if (!value || value.startsWith('/') || value.includes('\\') || value.includes('\0') ||
    value.split('/').some((segment) => segment === '.' || segment === '..')) {
    fail('ARTIFACT_PATH_SCOPE', value)
  }
  return value
}

function walk(root, current = root) {
  const entries = []
  for (const name of readdirSync(current).sort((a, b) => a.localeCompare(b, 'en'))) {
    if (name.includes('\\') || name.includes('\0') || name === '.' || name === '..') {
      fail('ARTIFACT_PATH_SCOPE', name)
    }
    const path = resolve(current, name)
    const stat = lstatSync(path)
    if (stat.isSymbolicLink()) fail('ARTIFACT_SYMLINK_FORBIDDEN', portableRelative(root, path))
    if (stat.isDirectory()) entries.push(...walk(root, path))
    else if (stat.isFile()) {
      const bytes = readFileSync(path)
      entries.push({ path: portableRelative(root, path), bytes: bytes.length, sha256: sha256(bytes) })
    } else fail('ARTIFACT_FILE_TYPE', portableRelative(root, path))
  }
  return entries
}

export function buildArtifactManifest({ rootPath, candidateSha, artifactRoot = 'dist' }) {
  if (!/^[0-9a-f]{40}$/.test(candidateSha ?? '')) fail('ARTIFACT_CANDIDATE_SHA', String(candidateSha))
  if (typeof artifactRoot !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(artifactRoot) ||
    artifactRoot.startsWith('/') || artifactRoot.includes('..') || artifactRoot.includes('\\')) {
    fail('ARTIFACT_ROOT_LABEL', String(artifactRoot))
  }
  const root = resolve(rootPath)
  const stat = lstatSync(root)
  if (stat.isSymbolicLink() || !stat.isDirectory()) fail('ARTIFACT_ROOT_TYPE', root)
  const files = walk(root).sort((a, b) => a.path.localeCompare(b.path, 'en'))
  if (!files.length) fail('ARTIFACT_EMPTY', root)
  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0)
  const contentSha256 = sha256(Buffer.from(JSON.stringify(files)))
  return {
    schemaVersion: 'qimmah.release-artifact-manifest/v1',
    candidateSha,
    artifactRoot,
    fileCount: files.length,
    totalBytes,
    contentSha256,
    files,
  }
}

export function serializeArtifactManifest(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

export function validateArtifactManifest(manifest, options) {
  const expected = buildArtifactManifest(options)
  const actualBytes = serializeArtifactManifest(manifest)
  const expectedBytes = serializeArtifactManifest(expected)
  if (actualBytes !== expectedBytes) fail('ARTIFACT_MANIFEST_DRIFT', 'manifest differs from current root bytes or identity')
  return { ...expected, manifestSha256: sha256(Buffer.from(expectedBytes)) }
}
