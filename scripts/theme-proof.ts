// Theme toggle logic — Qimmah Design Standard v3.0 screen 66 + F1 tokens.
// Verifies the appearance preference applies to <html data-theme>, persists,
// follows the OS for 'system', and is DEFERRED while a workout is active
// (theme never flips mid-set). Runs on a DOM/localStorage shim (no browser).

import { applyTheme, setTheme, getTheme, resolveTheme, isWorkoutActive } from '@/lib/appPreferences'

let passed = 0
let failed = 0
function check(label: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${label}`) }
  else { failed++; console.log(`  ✗ ${label}`) }
}

const theme = () => document.documentElement.dataset.theme

// ── apply light / dark ──
applyTheme('light')
check('applyTheme(light) sets data-theme=light', theme() === 'light')
applyTheme('dark')
check('applyTheme(dark) sets data-theme=dark', theme() === 'dark')

// ── system follows the OS (matchMedia) ──
;(globalThis as unknown as { __mqDark: boolean }).__mqDark = true
check('resolveTheme(system) = dark when OS is dark', resolveTheme('system') === 'dark')
applyTheme('system')
check('applyTheme(system) applies dark from OS', theme() === 'dark')
;(globalThis as unknown as { __mqDark: boolean }).__mqDark = false
check('resolveTheme(system) = light when OS is light', resolveTheme('system') === 'light')
applyTheme('system')
check('applyTheme(system) applies light from OS', theme() === 'light')

// ── setTheme persists + applies ──
const applied = setTheme('dark')
check('setTheme(dark) applied immediately (no workout)', applied === true)
check('setTheme(dark) persisted', getTheme() === 'dark')
check('setTheme(dark) reflected on data-theme', theme() === 'dark')

// ── "no theme change during an active set" (screen 66) ──
applyTheme('light') // known baseline
localStorage.setItem('qimmah:active-workout:v2:user-1', '{"exIndex":0}')
check('isWorkoutActive true while an active session exists', isWorkoutActive() === true)
const deferred = setTheme('dark')
check('setTheme deferred (returns false) during an active set', deferred === false)
check('data-theme UNCHANGED mid-set (still light)', theme() === 'light')
check('but the preference is still saved for later', getTheme() === 'dark')
// workout ends → applying the saved theme now lands
localStorage.removeItem('qimmah:active-workout:v2:user-1')
check('workout ended → applyTheme applies the saved dark', applyTheme() === true && theme() === 'dark')

console.log(`\nTheme proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
