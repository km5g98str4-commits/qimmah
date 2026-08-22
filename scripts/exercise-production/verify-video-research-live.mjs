import { readFileSync } from 'node:fs'
import { PILOT_PATH } from './video-research-pilot-lib.mjs'

const pilot = JSON.parse(readFileSync(PILOT_PATH, 'utf8'))
const candidates = pilot.records.filter((record) => record.researchStatus === 'CANDIDATE_NEEDS_INDEPENDENT_REVIEW')

for (const record of candidates) {
  const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(record.canonicalUrl)}&format=json`
  const response = await fetch(endpoint, { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(`VIDEO_PUBLIC_AVAILABILITY: ${record.exerciseId} returned HTTP ${response.status}`)
  const metadata = await response.json()
  if (metadata.title !== record.videoTitle || metadata.author_name !== record.channel) {
    throw new Error(`VIDEO_PUBLIC_METADATA: ${record.exerciseId} expected ${record.videoTitle} / ${record.channel}; got ${metadata.title} / ${metadata.author_name}`)
  }
  console.log(`VIDEO_PUBLIC: ${record.exerciseId} -> ${record.youtubeVideoId} -> ${metadata.author_name}`)
}

console.log(`VIDEO_RESEARCH_LIVE: PASS (${candidates.length}/${candidates.length} public metadata matches)`)
