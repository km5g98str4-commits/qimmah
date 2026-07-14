import type { Lang } from '@/lib/appPreferences'
import type { PlateLoadError } from '@/lib/plates'

export function plateCopy(lang: Lang) {
  const ar = lang !== 'en'
  return {
    open: ar ? 'احسب أقراص البار' : 'Calculate bar plates',
    title: ar ? 'تركيب الوزن' : 'Load the bar',
    close: ar ? 'إغلاق حاسبة الأقراص' : 'Close plate calculator',
    target: ar ? 'الوزن الكلي' : 'Total weight',
    bar: ar ? 'وزن البار' : 'Bar weight',
    available: ar ? 'الأقراص المتاحة' : 'Available plates',
    eachSide: ar ? 'لكل جهة' : 'Each side',
    exact: ar ? 'تركيب مطابق' : 'Exact load',
    nearest: ar ? 'أقرب تركيب أقل' : 'Nearest lower load',
    loaded: ar ? 'الوزن المركّب' : 'Loaded weight',
    remaining: ar ? 'الفرق' : 'Difference',
    apply: ar ? 'استخدم هذا الوزن' : 'Use this weight',
    pair: ar ? 'قرص لكل جهة' : 'plate each side',
    pairs: ar ? 'أقراص لكل جهة' : 'plates each side',
    kg: ar ? 'كجم' : 'kg',
    emptyBar: ar ? 'البار وحده يطابق الوزن.' : 'The empty bar matches the target.',
    errors: {
      invalidTarget: ar ? 'أدخل وزنًا كليًا بين 1 و500 كجم.' : 'Enter a total weight between 1 and 500 kg.',
      invalidBar: ar ? 'اختر وزن بار صالحًا.' : 'Choose a valid bar weight.',
      belowBar: ar ? 'الوزن المطلوب أقل من وزن البار.' : 'The target is lighter than the bar.',
      noPlates: ar ? 'اختر قرصًا واحدًا على الأقل.' : 'Select at least one plate size.',
    } satisfies Record<PlateLoadError, string>,
  }
}
