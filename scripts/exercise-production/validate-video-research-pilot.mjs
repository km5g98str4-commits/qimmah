import { readFileSync } from 'node:fs'
import { PILOT_PATH, validateVideoResearchPilot } from './video-research-pilot-lib.mjs'

const pilot = JSON.parse(readFileSync(PILOT_PATH, 'utf8'))
const result = validateVideoResearchPilot(pilot)
console.log(JSON.stringify(result.computedSummary, null, 2))
if (result.issues.length) {
  for (const found of result.issues) console.error(`${found.code}: ${found.message}`)
  process.exit(1)
}
console.log('VIDEO_RESEARCH_PILOT: PASS')
