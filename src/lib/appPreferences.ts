// تفضيلات التطبيق على مستوى الواجهة (v2) — حاليًا اللغة فقط.
// مفتاح مستقل لا يمسّ بيانات التخصيص.

export const PREFS_KEY = 'qimmah:prefs:v1'

export type Lang = 'ar' | 'en'

export interface AppPreferences {
  language: Lang
  hapticsEnabled: boolean
}

const DEFAULT: AppPreferences = { language: 'ar', hapticsEnabled: true }

export function loadPreferences(): AppPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT }
  try {
    const raw = window.localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...DEFAULT }
    const parsed = JSON.parse(raw) as Partial<AppPreferences>
    return {
      language: parsed.language === 'en' ? 'en' : 'ar',
      hapticsEnabled: parsed.hapticsEnabled !== false,
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
