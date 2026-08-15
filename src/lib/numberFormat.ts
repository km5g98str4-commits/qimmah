import type { Lang } from '@/lib/appPreferences'

/**
 * The product's one numeral policy: Arabic uses Arabic-Indic digits and English
 * uses Latin digits. This only formats values at the presentation boundary; the
 * number passed in is never converted or written back to storage.
 */
export function formatNumber(
  value: number,
  lang: Lang,
  options: Intl.NumberFormatOptions = {},
): string {
  const locale = lang === 'ar' ? 'ar-SA-u-nu-arab' : 'en-US-u-nu-latn'
  return new Intl.NumberFormat(locale, options).format(value)
}
