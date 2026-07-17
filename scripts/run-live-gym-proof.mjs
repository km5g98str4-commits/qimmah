import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const result = await build({
  stdin: {
    contents: `
      import React from 'react'
      import { renderToStaticMarkup } from 'react-dom/server'
      import { LiveGymDashboard } from '@/components/workout/LiveGymDashboard'
      import { elapsedWorkoutSec, remainingWorkoutSets, parseHeartRateReading, freshHeartRate } from '@/lib/liveWorkoutMetrics'
      globalThis.proof = { React, renderToStaticMarkup, LiveGymDashboard, elapsedWorkoutSec, remainingWorkoutSets, parseHeartRateReading, freshHeartRate }
    `,
    resolveDir: root,
    loader: 'tsx',
  },
  bundle: true,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  write: false,
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': '{}' },
  loader: { '.css': 'empty' },
  logLevel: 'error',
})

const folder = mkdtempSync(join(tmpdir(), 'qimmah-live-gym-'))
const modulePath = join(folder, 'proof.cjs')
writeFileSync(modulePath, result.outputFiles[0].text)
createRequire(import.meta.url)(modulePath)

const p = globalThis.proof
let failures = 0
let checks = 0
const check = (condition, message) => {
  checks += 1
  console.log(`${condition ? '✓' : '✗'} ${message}`)
  if (!condition) failures += 1
}

check(p.elapsedWorkoutSec(1_000, 62_900) === 61, 'elapsed time derives from timestamps')
check(p.elapsedWorkoutSec(10_000, 1_000) === 0, 'elapsed time never becomes negative')
check(p.remainingWorkoutSets(12, 5) === 7, 'remaining sets derive from real completion totals')
check(p.remainingWorkoutSets(4, 9) === 0, 'remaining sets clamp at zero')

const valid = p.parseHeartRateReading({ bpm: 127.4, measuredAt: 10_000, source: 'watch' }, 11_000)
check(valid?.bpm === 127, 'valid watch readings are normalized')
check(p.parseHeartRateReading({ bpm: 999 }, 11_000) === null, 'impossible readings are rejected')
check(p.freshHeartRate(valid, 55_000)?.bpm === 127, 'recent readings remain connected')
check(p.freshHeartRate(valid, 55_001) === null, 'stale readings disconnect instead of showing old health data')

const markup = p.renderToStaticMarkup(p.React.createElement(p.LiveGymDashboard, {
  lang: 'ar',
  startedAt: 1_000,
  now: 62_900,
  currentExercise: 'ضغط الصدر',
  currentSet: 2,
  currentSetTotal: 4,
  completedSets: 3,
  totalSets: 10,
  restLeft: 48,
  isResting: true,
  energy: 4,
  onEnergyChange: () => undefined,
}))
check(markup.includes('لوحة التمرين الحية'), 'dashboard has an accessible Arabic name')
check(markup.includes('ضغط الصدر'), 'current exercise is rendered from live session data')
check(markup.includes('aria-pressed="true"'), 'energy control exposes its selected state')
check(markup.includes('PT61S'), 'elapsed time uses semantic time markup')
check(!markup.includes('127'), 'heart rate is never fabricated without a live bridge reading')

if (failures > 0) process.exit(1)
console.log(`\nLive Gym proof passed (${checks} checks).`)
