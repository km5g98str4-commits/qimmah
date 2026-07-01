// طبقة i18n خفيفة — سياق React يحمل اللغة الحالية والنصوص المفتاحية،
// ويطبّق الاتجاه (RTL للعربية / LTR للإنجليزية) ويحفظ الاختيار في localStorage.
// لا اعتماديات خارجية — مجرّد Context + قواميس من config/strings.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { applyLanguage, getLanguage, setLanguage as persistLanguage, type Lang } from '@/lib/appPreferences'
import { getStrings, type ShellStrings } from '@/config/strings'

export type Dir = 'rtl' | 'ltr'

export interface LanguageContextValue {
  /** اللغة الحالية ('ar' | 'en'). */
  lang: Lang
  /** اتجاه الكتابة المشتق من اللغة. */
  dir: Dir
  /** نصوص القشرة المفتاحية للغة الحالية. */
  t: ShellStrings
  /** يبدّل إلى لغة محددة (يحفظ + يطبّق الاتجاه حيًّا). */
  setLang: (lang: Lang) => void
  /** يبدّل بين العربية والإنجليزية. */
  toggle: () => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

/**
 * مزوّد اللغة — يلفّ التطبيق كلّه. يقرأ التفضيل المحفوظ عند الإقلاع،
 * ويعيد تطبيق الاتجاه على عنصر الجذر كلما تغيّرت اللغة (بلا إعادة تحميل).
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => getLanguage())

  // يبقي <html lang dir> متزامنًا مع الحالة — يشمل الإقلاع الأول.
  useEffect(() => {
    applyLanguage(lang)
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    persistLanguage(next) // يحفظ في localStorage + يطبّق الاتجاه فورًا
    setLangState(next)
  }, [])

  const toggle = useCallback(() => {
    setLangState((prev) => {
      const next: Lang = prev === 'ar' ? 'en' : 'ar'
      persistLanguage(next)
      return next
    })
  }, [])

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      dir: lang === 'en' ? 'ltr' : 'rtl',
      t: getStrings(lang),
      setLang,
      toggle,
    }),
    [lang, setLang, toggle],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

/** يعيد سياق اللغة كاملًا (lang, dir, t, setLang, toggle). */
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider')
  return ctx
}

/** اختصار للحصول على نصوص القشرة للغة الحالية. */
export function useStrings(): ShellStrings {
  return useLanguage().t
}

/** اختصار للحصول على اللغة الحالية فقط. */
export function useLang(): Lang {
  return useLanguage().lang
}
