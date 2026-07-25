// تفضيلات التطبيق على مستوى الواجهة (v2) — حاليًا اللغة فقط.
// مفتاح مستقل لا يمسّ بيانات التخصيص.

import { writeJson } from './safeStorage'

export const PREFS_KEY = 'qimmah:prefs:v1'

export type Lang = 'ar' | 'en'

export interface AppPreferences {
  language: Lang
}

const DEFAULT: AppPreferences = { language: 'ar' }

export function loadPreferences(): AppPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT }
  try {
    const raw = window.localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...DEFAULT }
    const parsed = JSON.parse(raw) as Partial<AppPreferences>
    return { language: parsed.language === 'en' ? 'en' : 'ar' }
  } catch {
    return { ...DEFAULT }
  }
}

export function savePreferences(prefs: AppPreferences): void {
  if (typeof window === 'undefined') return
  writeJson(PREFS_KEY, prefs)
}

export function getLanguage(): Lang {
  return loadPreferences().language
}

export function setLanguage(language: Lang): void {
  savePreferences({ ...loadPreferences(), language })
  applyLanguage(language)
}

/** يطبّق اللغة على عنصر الجذر: العربية RTL، الإنجليزية LTR. */
export function applyLanguage(language: Lang): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.lang = language
  root.dir = language === 'en' ? 'ltr' : 'rtl'
}
