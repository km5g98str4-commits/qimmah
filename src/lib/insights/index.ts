// محرّك الرؤى — الواجهة العامّة.
// الاستهلاك: `buildWeeklyInsights(lang)` (impure، من المتاجر) في الواجهات،
// و`buildInsightsFromInput`/`computeAllMetrics` (نقيّة) في الاختبارات.

import { computeAllMetrics } from './metrics'
import { assembleInsights } from './generate'
import { buildInsightInput } from './readers'
import type { InsightInput, WeeklyInsights } from './types'

export type * from './types'
export { computeAllMetrics, THRESHOLDS } from './metrics'
export { generateCards, assembleInsights } from './generate'

/** النواة النقيّة: مُدخل → رؤى (بلا لمس متاجر). للاختبارات والعرض المحقون. */
export function buildInsightsFromInput(input: InsightInput): WeeklyInsights {
  return assembleInsights(computeAllMetrics(input), input.lang, input.nowMs)
}

/** الواجهة الحيّة: يقرأ المتاجر الحقيقية ويُعيد رؤى الأسبوع. */
export function buildWeeklyInsights(lang: 'ar' | 'en' = 'ar', nowMs: number = Date.now()): WeeklyInsights {
  return buildInsightsFromInput(buildInsightInput(nowMs, lang))
}
