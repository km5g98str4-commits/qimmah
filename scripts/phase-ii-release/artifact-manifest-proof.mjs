#!/usr/bin/env node

import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildArtifactManifest, serializeArtifactManifest } from './artifact-manifest-lib.mjs'

const SHA = 'a'.repeat(40)
const checks = []
const check = (name, condition, code) => checks.push({ name, condition: Boolean(condition), code })
const rejects = (name, fn, code) => {
  let actual = null
  try { fn() } catch (error) { actual = error.code }
  check(name, actual === code, code)
}

const root = mkdtempSync(join(tmpdir(), 'qimmah-artifact-proof-'))
mkdirSync(join(root, 'assets'))
writeFileSync(join(root, 'index.html'), '<!doctype html><title>fixture</title>\n')
writeFileSync(join(root, 'assets', 'app.js'), 'console.log("fixture")\n')
const first = buildArtifactManifest({ rootPath: root, candidateSha: SHA })
const second = buildArtifactManifest({ rootPath: root, candidateSha: SHA })
check('BASE_DETERMINISTIC', serializeArtifactManifest(first) === serializeArtifactManifest(second), 'PASS')
check('BASE_ORDERED_FILE_SET', first.files.map((file) => file.path).join(',') === 'assets/app.js,index.html', 'PASS')

writeFileSync(join(root, 'assets', 'app.js'), 'console.log("changed")\n')
const changed = buildArtifactManifest({ rootPath: root, candidateSha: SHA })
check('MUTATION_CONTENT_DIGEST', changed.contentSha256 !== first.contentSha256, 'ARTIFACT_CONTENT_DIGEST')

rejects('MUTATION_CANDIDATE_SHA', () => buildArtifactManifest({ rootPath: root, candidateSha: 'short' }), 'ARTIFACT_CANDIDATE_SHA')
rejects('MUTATION_ROOT_LABEL', () => buildArtifactManifest({ rootPath: root, candidateSha: SHA, artifactRoot: '../dist' }), 'ARTIFACT_ROOT_LABEL')

const empty = mkdtempSync(join(tmpdir(), 'qimmah-artifact-empty-'))
rejects('MUTATION_EMPTY_ROOT', () => buildArtifactManifest({ rootPath: empty, candidateSha: SHA }), 'ARTIFACT_EMPTY')

const linked = mkdtempSync(join(tmpdir(), 'qimmah-artifact-link-'))
symlinkSync(join(root, 'index.html'), join(linked, 'outside.html'))
rejects('MUTATION_SYMLINK_ESCAPE', () => buildArtifactManifest({ rootPath: linked, candidateSha: SHA }), 'ARTIFACT_SYMLINK_FORBIDDEN')

let failed = 0
for (const item of checks) {
  console.log(`${item.condition ? 'PASS' : 'FAIL'} ${item.name} -> ${item.code}`)
  if (!item.condition) failed++
}
console.log(`ARTIFACT_MANIFEST_PROOF: ${failed ? 'FAIL' : 'PASS'} (${checks.length - failed}/${checks.length})`)
process.exit(failed ? 1 : 0)
