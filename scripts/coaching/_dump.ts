import { exercises } from '@/data/exercises'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const m = exercises.map((e) => ({ id: e.id, nameAr: e.nameAr, nameEn: e.nameEn, primaryMuscle: e.primaryMuscle, movementPattern: e.movementPattern, equipment: e.equipment, level: e.level, environment: e.environment }))
writeFileSync(resolve(process.cwd(), 'scripts/coaching/manifest.json'), JSON.stringify(m, null, 2))
console.log('manifest exercises:', m.length)
