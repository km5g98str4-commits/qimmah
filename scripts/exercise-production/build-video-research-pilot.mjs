import { readFileSync, writeFileSync } from 'node:fs'
import { buildVideoResearchPilot, PILOT_PATH, serializeVideoResearchPilot } from './video-research-pilot-lib.mjs'

const generated = serializeVideoResearchPilot(buildVideoResearchPilot())
if (process.argv.includes('--check')) {
  if (readFileSync(PILOT_PATH, 'utf8') !== generated) {
    console.error('VIDEO_PILOT_REPRODUCIBILITY: committed pilot differs from deterministic generation')
    process.exit(1)
  }
  console.log('VIDEO_PILOT_REPRODUCIBILITY: PASS (byte-for-byte)')
  process.exit(0)
}

writeFileSync(PILOT_PATH, generated)
console.log(`WROTE ${PILOT_PATH}`)
