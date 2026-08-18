// INDEPENDENT re-verification of every video reference in scripts/exercise/video-research.json.
//
// Why this exists: the research record is produced by researchers (human or agent). Their word
// is not evidence. This script re-fetches every non-null id from YouTube's own oEmbed endpoint
// and compares what comes back against what the record claims. A record that cannot survive
// this check does not ship.
//
//   https://www.youtube.com/oembed?url=...&format=json
//     → 200 + { title, author_name }  for a public, embeddable video
//     → 401/403                       for a private or embedding-disabled video
//     → 404                           for a video that does not exist
//
// It is deliberately OUTSIDE npm run test:gate: it makes ~180 network calls, and a gate that
// depends on a third party's uptime turns red for reasons that are not our code (charter §4.0 —
// an unnamed red is worse than no check). Run it on demand, and whenever the record changes:
//   npm run verify:exercise-video
//
// Flags:
//   --write   rewrite video-research.json with refreshed titles/channels + verifiedAt,
//             and demote any entry that failed verification to NEEDS_REVIEW with the reason.
//   --only=<exerciseId,...>  verify a subset.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const recordPath = resolve(here, 'video-research.json')
const record = JSON.parse(readFileSync(recordPath, 'utf8'))

const args = process.argv.slice(2)
const doWrite = args.includes('--write')
const onlyArg = args.find((a) => a.startsWith('--only='))
const only = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',').map((s) => s.trim())) : null

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase()

async function oembed(videoId) {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'qimmah-video-verifier' } })
    if (res.status === 404) return { ok: false, reason: 'not-found (oEmbed 404)' }
    if (res.status === 401 || res.status === 403) return { ok: false, reason: `not embeddable/private (oEmbed ${res.status})` }
    if (!res.ok) return { ok: false, reason: `oEmbed HTTP ${res.status}` }
    const json = await res.json()
    return { ok: true, title: json.title, author: json.author_name }
  } catch (err) {
    return { ok: false, reason: `network error: ${err.message}` }
  }
}

const targets = record.entries.filter((e) => e.youtubeVideoId && (!only || only.has(e.exerciseId)))
console.log(`Verifying ${targets.length} video reference(s) against YouTube oEmbed…\n`)

let pass = 0
const failures = []
const titleDrift = []

for (const entry of targets) {
  const r = await oembed(entry.youtubeVideoId)
  if (!r.ok) {
    failures.push({ id: entry.exerciseId, videoId: entry.youtubeVideoId, reason: r.reason })
    console.log(`✗ ${entry.exerciseId.padEnd(32)} ${entry.youtubeVideoId}  ${r.reason}`)
    if (doWrite) {
      entry.status = 'NEEDS_REVIEW'
      entry.notes = [entry.notes, `Verification failed ${new Date().toISOString().slice(0, 10)}: ${r.reason}`].filter(Boolean).join(' | ')
      entry.youtubeVideoId = null
      entry.canonicalUrl = null
      entry.matchConfidence = null
    }
    continue
  }
  pass++
  const claimed = norm(entry.verifiedTitle)
  const actual = norm(r.title)
  if (claimed && claimed !== actual) {
    titleDrift.push({ id: entry.exerciseId, claimed: entry.verifiedTitle, actual: r.title })
    console.log(`⚠ ${entry.exerciseId.padEnd(32)} title drift`)
    console.log(`    recorded: ${entry.verifiedTitle}`)
    console.log(`    actual  : ${r.title}`)
  } else {
    console.log(`✓ ${entry.exerciseId.padEnd(32)} ${r.title}  — ${r.author}`)
  }
  if (doWrite) {
    entry.verifiedTitle = r.title
    entry.channel = r.author
    entry.verifiedAt = new Date().toISOString().slice(0, 10)
    entry.verificationEvidence = `YouTube oEmbed for watch?v=${entry.youtubeVideoId} returned title "${r.title}" by author_name "${r.author}"`
  }
}

console.log(`\n── summary ──`)
console.log(`verified live : ${pass}/${targets.length}`)
console.log(`failed        : ${failures.length}`)
console.log(`title drift   : ${titleDrift.length}`)

if (doWrite) {
  record.verifiedAt = new Date().toISOString().slice(0, 10)
  writeFileSync(recordPath, JSON.stringify(record, null, 2) + '\n')
  console.log(`\nrewrote scripts/exercise/video-research.json (--write)`)
  console.log(`next: npm run build:exercise-video-registry && npm run build:exercise-production-manifest`)
}

if (failures.length && !doWrite) {
  console.error(`\n${failures.length} reference(s) failed verification. Re-run with --write to demote them to NEEDS_REVIEW.`)
  process.exitCode = 1
}
