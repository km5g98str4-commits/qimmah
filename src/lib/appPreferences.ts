// تفضيلات التطبيق على مستوى الواجهة (v2) — حاليًا اللغة فقط.
// مفتاح مستقل لا يمسّ بيانات التخصيص.

export const PREFS_KEY = 'qimmah:prefs:v1'

export type Lang = 'ar' | 'en'
/** Appearance preference — standard screen 66. Default follows the OS. */
export type ThemePref = 'system' | 'light' | 'dark'

export interface AppPreferences {
  language: Lang
  hapticsEnabled: boolean
  theme: ThemePref
}

const DEFAULT: AppPreferences = { language: 'ar', hapticsEnabled: true, theme: 'system' }

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

/** Persist + apply the theme. Returns false when application was deferred. */
export function setTheme(pref: ThemePref): boolean {
  savePreferences({ ...loadPreferences(), theme: pref })
  return applyTheme(pref)
}

/**
 * Boot the theme: apply it now and keep 'system' in sync with the OS. Safe to
 * call once at startup. Re-applies on OS change only while the pref is 'system'.
 */
export function initTheme(): void {
  applyTheme(getTheme())
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => { if (getTheme() === 'system') applyTheme('system') }
  if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange)
  else if (typeof mq.addListener === 'function') mq.addListener(onChange)
}
