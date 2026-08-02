// Theme toggle logic — Qimmah Design Standard v3.0 screen 66 + F1 tokens.
// Verifies the appearance preference applies to <html data-theme>, persists,
// follows the OS for 'system', and is DEFERRED while a workout is active
// (theme never flips mid-set). Runs on a DOM/localStorage shim (no browser).

import { applyTheme, setTheme, getTheme, resolveTheme, isWorkoutActive, enableSunsetSchedule, disableSunsetSchedule, getThemeSchedule, effectiveTheme, applyEffectiveTheme } from '@/lib/appPreferences'
import { sunTimes, isDaytime } from '@/lib/sunTimes'

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

// ── Sunset schedule (screen 66) ──
localStorage.removeItem('qimmah:active-workout:v2:user-1') // ensure not mid-workout
// Riyadh; instants chosen well inside day/night (UTC = local−3h).
const RIYADH = { lat: 24.71, lon: 46.68 }
const noonUTC = new Date('2026-06-21T10:00:00Z') // ~13:00 Riyadh → day
const midnightUTC = new Date('2026-06-21T22:00:00Z') // ~01:00 Riyadh → night

const st = sunTimes(RIYADH.lat, RIYADH.lon, noonUTC)
check('sunTimes returns ordered sunrise < sunset', !st.polar && st.sunrise.getTime() < st.sunset.getTime())
check('isDaytime true at local noon', isDaytime(RIYADH.lat, RIYADH.lon, noonUTC) === true)
check('isDaytime false at local midnight', isDaytime(RIYADH.lat, RIYADH.lon, midnightUTC) === false)

check('schedule OFF by default', getThemeSchedule().enabled === false)
setTheme('light') // known manual baseline (also proves manual persists)
enableSunsetSchedule(RIYADH)
check('schedule ON after enable (with coords)', getThemeSchedule().enabled === true)
check('effectiveTheme = light in daytime (schedule)', effectiveTheme(noonUTC) === 'light')
check('effectiveTheme = dark at night (schedule)', effectiveTheme(midnightUTC) === 'dark')

// Manual override wins: choosing a theme turns the schedule off.
setTheme('light')
check('manual choice disables the schedule', getThemeSchedule().enabled === false)
check('manual light wins even at night (no schedule)', effectiveTheme(midnightUTC) === 'light')

// No theme flip mid-set, even on the schedule.
enableSunsetSchedule(RIYADH)
applyTheme('light') // baseline data-theme
localStorage.setItem('qimmah:active-workout:v2:user-1', '{"exIndex":0}')
const schedDeferred = applyEffectiveTheme(midnightUTC)
check('scheduled apply deferred mid-set (returns false)', schedDeferred === false)
check('data-theme UNCHANGED mid-set under schedule (still light)', theme() === 'light')
localStorage.removeItem('qimmah:active-workout:v2:user-1')
check('workout ended → scheduled dark applies', applyEffectiveTheme(midnightUTC) === true && theme() === 'dark')
disableSunsetSchedule()

console.log(`\nTheme proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
