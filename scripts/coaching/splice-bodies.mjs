import { readFileSync, writeFileSync } from 'node:fs'
const bodies = JSON.parse(readFileSync('scripts/coaching/lesson-bodies.json', 'utf8'))
let src = readFileSync('src/data/coaching/lessons.ts', 'utf8')
const ids = [...src.matchAll(/\bid:\s*'([^']+)'/g)].map((m) => m[1])
const oldBodies = [...src.matchAll(/bodyAr:\s*'([^']*)'/g)].map((m) => m[1])
if (ids.length !== 40 || oldBodies.length !== 40) throw new Error(`expected 40/40, got ids=${ids.length} bodies=${oldBodies.length}`)
let n = 0
for (let i = 0; i < ids.length; i++) {
  const id = ids[i]
  const nb = bodies[id]
  if (!nb) throw new Error('no new body for ' + id)
  const esc = nb.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const oldLit = `bodyAr:\n      '${oldBodies[i]}',`
  const newLit = `bodyAr:\n      '${esc}',`
  if (!src.includes(oldLit)) throw new Error('old body literal not found for ' + id)
  src = src.replace(oldLit, newLit)
  n++
}
writeFileSync('src/data/coaching/lessons.ts', src)
console.log('spliced', n, 'lesson bodies')
