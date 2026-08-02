import type { Lang } from '@/lib/appPreferences'
import { NutritionV2 } from '@/views/NutritionV2'

interface NutritionViewProps { lang: Lang }

/** Stable route adapter for canonical v2.1 nutrition. */
export function NutritionView(props: NutritionViewProps) {
  return <NutritionV2 {...props} />
}
