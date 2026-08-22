#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildArtifactManifest, serializeArtifactManifest, validateArtifactManifest } from './artifact-manifest-lib.mjs'

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1]
}

const rootPath = resolve(arg('--root', 'dist'))
const candidateSha = arg('--candidate-sha')
const artifactRoot = arg('--root-label', 'dist')
const output = arg('--out')
const check = arg('--check')

if (!candidateSha || (!output && !check) || (output && check)) {
  console.error('Usage: build-artifact-manifest.mjs --candidate-sha <40hex> [--root dist] [--root-label dist] (--out <file> | --check <file>)')
  process.exit(2)
}

if (check) {
  const manifest = JSON.parse(readFileSync(resolve(check), 'utf8'))
  const result = validateArtifactManifest(manifest, { rootPath, candidateSha, artifactRoot })
  console.log(JSON.stringify({ status: 'PASS', fileCount: result.fileCount, totalBytes: result.totalBytes, contentSha256: result.contentSha256, manifestSha256: result.manifestSha256 }, null, 2))
} else {
  const manifest = buildArtifactManifest({ rootPath, candidateSha, artifactRoot })
  writeFileSync(resolve(output), serializeArtifactManifest(manifest))
  console.log(JSON.stringify({ status: 'WRITTEN', fileCount: manifest.fileCount, totalBytes: manifest.totalBytes, contentSha256: manifest.contentSha256, output: resolve(output) }, null, 2))
}
