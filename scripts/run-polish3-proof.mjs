// Polish-3 guards (P2 perf/nutrition/cleanup). Static source + filesystem — no
// browser. Behavioural single-source water is also covered in test:hydration.
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { strict as assert } from 'node:assert'

const root = resolve(import.meta.dirname, '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')
const has = (p) => existsSync(resolve(root, p))
let pass = 0
const check = (label, cond) => { assert.ok(cond, `FAIL: ${label}`); pass++; console.log(`  ✓ ${label}`) }

// ── P2-A: Sentry is lazy + DSN-gated (never imported at boot without a DSN) ──
const mon = read('src/lib/monitoring.ts')
check('monitoring returns before importing the SDK when no DSN', /if \(!dsn\) return/.test(mon))
check('Sentry SDK is a dynamic import (own lazy chunk)', mon.includes("import('@sentry/react')"))
check('main.tsx only calls initMonitoring (no static @sentry import)', !read('src/main.tsx').includes("from '@sentry"))

// ── P2-B: single-source water + custom amount + serving recompute ──
const hydration = read('src/lib/workoutHydration.ts')
check('in-workout water routes through the canonical addWaterToDay', hydration.includes('addWaterToDay') && !hydration.includes("from './historyStore'"))
const nutrition = read('src/views/NutritionV2.tsx')
check('Nutrition custom-water control present', nutrition.includes('WaterCustomAdd'))
check('custom water writes the same addWaterToDay source', /WaterCustomAdd[^]*addWaterToDay/.test(nutrition))
check('meal servings recompute macros', nutrition.includes('f.calories * servings'))
check('scaled macros tagged as estimate', nutrition.includes("t('تقدير', 'est.')"))
check('logFood scales by servings before adding', /logFood = \([^)]*servings = 1\)/.test(nutrition))

// ── P2-C: cleanup ──
check('v3 design standard present on the branch', has('docs/design/v3/Qimmah-Design-Standard-v3.0.html'))
check('README no longer claims "no server / no login"', !read('README.md').includes('بدون خادم وبدون تسجيل دخول'))
check('README documents the optional Supabase account/sync', read('README.md').includes('Supabase'))
check('orphan AppIcon-512@2x.png removed (icon-warning fix)', !has('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'))

console.log(`\n✅ polish-3 proof: Sentry lazy/DSN-gated, single-source water + custom + servings, cleanup (v3 docs/README/AppIcon) — ${pass} checks`)
