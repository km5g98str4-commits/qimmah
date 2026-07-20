// تفضيلات التطبيق على مستوى الواجهة (v2) — حاليًا اللغة فقط.
// مفتاح مستقل لا يمسّ بيانات التخصيص.

import { isDaytime } from './sunTimes'

export const PREFS_KEY = 'qimmah:prefs:v1'

export type Lang = 'ar' | 'en'
/** Appearance preference — standard screen 66. Default follows the OS. */
export type ThemePref = 'system' | 'light' | 'dark'

/**
 * Optional sunset schedule (screen 66) — off by default. When enabled with a
 * location (device geolocation OR a manually picked city), the effective theme
 * follows the sun: dark after sunset, light after sunrise. The manual toggle
 * always wins and turns this off.
 */
export interface ThemeSchedule {
  enabled: boolean
  lat: number | null
  lon: number | null
  cityLabel: string | null
}

export interface AppPreferences {
  language: Lang
  hapticsEnabled: boolean
  theme: ThemePref
  themeSchedule: ThemeSchedule
}

const DEFAULT_SCHEDULE: ThemeSchedule = { enabled: false, lat: null, lon: null, cityLabel: null }
const DEFAULT: AppPreferences = { language: 'ar', hapticsEnabled: true, theme: 'system', themeSchedule: { ...DEFAULT_SCHEDULE } }

function parseSchedule(raw: unknown): ThemeSchedule {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SCHEDULE }
  const s = raw as Partial<ThemeSchedule>
  const lat = typeof s.lat === 'number' && Number.isFinite(s.lat) ? s.lat : null
  const lon = typeof s.lon === 'number' && Number.isFinite(s.lon) ? s.lon : null
  // Enabled only when we actually have coordinates to compute from — never fake.
  return {
    enabled: s.enabled === true && lat !== null && lon !== null,
    lat,
    lon,
    cityLabel: typeof s.cityLabel === 'string' ? s.cityLabel : null,
  }
}

export function loadPreferences(): AppPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT }
  try {
    const raw = window.localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...DEFAULT }
    const parsed = JSON.parse(raw) as Partial<AppPreferences>
    return {
      language: parsed.language === 'en' ? 'en' : 'ar',
      hapticsEnabled: parsed.hapticsEnabled !== false,
      theme: parsed.theme === 'light' || parsed.theme === 'dark' ? parsed.theme : 'system',
      themeSchedule: parseSchedule(parsed.themeSchedule),
    }
  } catch {
    return { ...DEFAULT }
  }
}

export function savePreferences(prefs: AppPreferences): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
}

export function getLanguage(): Lang {
  return loadPreferences().language
}

export function setLanguage(language: Lang): void {
  savePreferences({ ...loadPreferences(), language })
  applyLanguage(language)
}

export function setHapticsEnabled(hapticsEnabled: boolean): void {
  savePreferences({ ...loadPreferences(), hapticsEnabled })
}

/** يطبّق اللغة على عنصر الجذر: العربية RTL، الإنجليزية LTR. */
export function applyLanguage(language: Lang): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.lang = language
  root.dir = language === 'en' ? 'ltr' : 'rtl'
}

// ————————————————————————————————————————————————————————————————
// Appearance / theme (standard screen 66). Effective theme drives the
// `data-theme` attribute on <html>; the token layer (tokens.css) reads it.
// ————————————————————————————————————————————————————————————————

export function getTheme(): ThemePref {
  return loadPreferences().theme
}

/** Resolve a preference to a concrete theme, following the OS for 'system'. */
export function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref === 'light' || pref === 'dark') return pref
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Is a workout session in progress? The theme must NOT change mid-set (screen
 * 66), so theme application is deferred while any owner's active-workout key
 * exists. The active-workout surface is a forced dark focus surface anyway, so
 * it is visually theme-immune; this guard also protects every other surface.
 */
export function isWorkoutActive(): boolean {
  if (typeof window === 'undefined') return false
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('qimmah:active-workout:v2:')) return true
    }
  } catch {
    /* storage unavailable */
  }
  return false
}

/**
 * Apply the effective theme to <html data-theme>. Returns false (deferred) when
 * a workout is active — the caller can surface "applies after your workout".
 */
export function applyTheme(pref: ThemePref = getTheme()): boolean {
  if (typeof document === 'undefined') return false
  if (isWorkoutActive()) return false
  document.documentElement.dataset.theme = resolveTheme(pref)
  return true
}

/**
 * Persist + apply a MANUAL theme choice. Manual override always wins: picking
 * any theme turns the sunset schedule off (screen 66). Returns false when the
 * application was deferred (mid-workout).
 */
export function setTheme(pref: ThemePref): boolean {
  const prev = loadPreferences()
  savePreferences({ ...prev, theme: pref, themeSchedule: { ...prev.themeSchedule, enabled: false } })
  return applyTheme(pref)
}

// ── Sunset schedule (screen 66, optional) ──────────────────────────────────

export function getThemeSchedule(): ThemeSchedule {
  return loadPreferences().themeSchedule
}

/** Persist the schedule only — does not apply (callers apply via applyEffectiveTheme). */
export function setThemeSchedule(schedule: ThemeSchedule): void {
  savePreferences({ ...loadPreferences(), themeSchedule: parseSchedule(schedule) })
}

/** The concrete theme the schedule dictates right now, or null when it is off/uncoordinated. */
export function scheduledTheme(now: Date = new Date()): 'light' | 'dark' | null {
  const s = getThemeSchedule()
  if (!s.enabled || s.lat === null || s.lon === null) return null
  return isDaytime(s.lat, s.lon, now) ? 'light' : 'dark'
}

/** The theme actually shown: the schedule when active, otherwise the manual/system pref. */
export function effectiveTheme(now: Date = new Date()): 'light' | 'dark' {
  return scheduledTheme(now) ?? resolveTheme(getTheme())
}

/** Apply the effective (schedule-aware) theme, honouring the mid-workout guard. */
export function applyEffectiveTheme(now: Date = new Date()): boolean {
  if (typeof document === 'undefined') return false
  if (isWorkoutActive()) return false
  document.documentElement.dataset.theme = effectiveTheme(now)
  return true
}

/** Enable the sunset schedule from a location, then apply. Returns false if deferred. */
export function enableSunsetSchedule(loc: { lat: number; lon: number; cityLabel?: string | null }): boolean {
  setThemeSchedule({ enabled: true, lat: loc.lat, lon: loc.lon, cityLabel: loc.cityLabel ?? null })
  return applyEffectiveTheme()
}

/** Turn the sunset schedule off, reverting to the manual/system pref. */
export function disableSunsetSchedule(): boolean {
  setThemeSchedule({ ...getThemeSchedule(), enabled: false })
  return applyEffectiveTheme()
}

/**
 * Boot the theme: apply the effective (schedule-aware) theme now, keep 'system'
 * in sync with the OS, and re-check the schedule when the app returns to the
 * foreground (so it flips across a sunset while backgrounded). Safe to call once.
 */
export function initTheme(): void {
  applyEffectiveTheme()
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => { if (getTheme() === 'system' && !getThemeSchedule().enabled) applyTheme('system') }
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange)
    else if (typeof mq.addListener === 'function') mq.addListener(onChange)
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && getThemeSchedule().enabled) applyEffectiveTheme()
    })
  }
}
