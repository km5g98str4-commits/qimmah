// محرّك الرؤى — الأنواع المشتركة (نواة نقيّة قابلة للاختبار).
// كل الحسابات تجري فوق `InsightInput` المحقون، فلا تعتمد النواة على المتاجر مباشرة
// (المُهايئ في readers.ts يجمع المدخلات من المتاجر الحقيقية). هذا يجعل كل شيء
// قابلًا للاختبار بمُدخلات صناعية، ويحترم قواعد الصدق (PDF §05): كل استنتاج مُحوَّط،
// وكل تقدير مُعلَّم، وتحت العتبة تمتنع الرؤية بدل التخمين.

export type MetricKey = 'volume' | 'muscleSplit' | 'adherence' | 'weight' | 'protein' | 'streak' | 'pr'

/** حالة أي مقياس: إمّا نتيجة، أو امتناع (تحت العتبة/لا متجر). */
export type MetricStatus = 'ok' | 'abstain'
export type AbstainReason = 'insufficient' | 'noStore' | 'noTarget'

export interface MetricBase {
  key: MetricKey
  status: MetricStatus
  /** سبب الامتناع عند status='abstain'. */
  reason?: AbstainReason
  /** المدخل قديم (بحاجة قياس/تسجيل جديد) — يقود إجراء «قِس/سجّل». */
  stale?: boolean
}

export interface VolumeMetric extends MetricBase { key: 'volume'; thisWeek: number; lastWeek: number; deltaPct: number | null; sessions: number }
export interface MuscleSplitMetric extends MetricBase { key: 'muscleSplit'; undertrained: string[]; covered: string[] }
export interface AdherenceMetric extends MetricBase { key: 'adherence'; pct: number | null; doneDays: number; plannedDays: number; fourWeekAvgPct: number | null }
export interface WeightMetric extends MetricBase { key: 'weight'; slopeKgPerWeek: number | null; plateau: boolean; direction: 'down' | 'up' | 'flat' | null; latestKg: number | null; ageDays: number | null; points: number }
export interface ProteinMetric extends MetricBase { key: 'protein'; hitDays: number; loggedDays: number; targetG: number | null }
export interface StreakMetric extends MetricBase { key: 'streak'; days: number; weeksConsistent: number }
export interface PrMetric extends MetricBase { key: 'pr'; exerciseNameAr: string | null; nearestPct: number | null }

export interface MetricsBundle {
  volume: VolumeMetric
  muscleSplit: MuscleSplitMetric
  adherence: AdherenceMetric
  weight: WeightMetric
  protein: ProteinMetric
  streak: StreakMetric
  pr: PrMetric
}

export type CardTone = 'good' | 'watch' | 'info' | 'needsData'
export type CardDest = 'progress' | 'nutrition' | 'workout' | 'setup'

/** بطاقة رؤية واحدة: جملة مُحوَّطة + فعل + وجهة. لا إحصاءة ميّتة أبدًا. */
export interface InsightCard {
  key: MetricKey | 'needsData'
  tone: CardTone
  /** جملة عربية فصحى واحدة مُحوَّطة («يبدو أن…»)، والتقديرات تحمل «~ · تقديري». */
  text: string
  /** فعل أمر قصير (سجّل/تابع/قِس/أضف/ابدأ). */
  actionLabel: string
  dest: CardDest
  /** يحمل تقديرًا (يُعرض بعلامة ~). */
  estimate: boolean
  /** رتبة داخلية للترتيب (أعلى = أهم). */
  priority: number
}

/** المُدخل المحقون للنواة النقيّة — يُبنى من المتاجر في readers.ts. */
export interface InsightInput {
  nowMs: number
  lang: 'ar' | 'en'
  /** جلسات مكتملة فقط، لكلٍّ: التاريخ، الحجم (Σ وزن×تكرار)، مجموعات العضلات، وأعلى مجموعة لكل تمرين. */
  sessions: { date: string; volume: number; muscleGroups: string[]; topSets: { exerciseId: string; nameAr: string; weightKg: number }[] }[]
  plan: { daysPerWeek: number; targetProtein: number | null }
  /** قياسات الوزن (كجم) مرتّبة تصاعديًا بالتاريخ. */
  weights: { date: string; kg: number }[]
  /** بروتين مُسجَّل لكل يوم (غ) — null ليوم بلا تسجيل. */
  proteinByDate: Record<string, number | null>
  /** أفضل وزن مسجّل لكل تمرين (كجم) لكشف القرب من الرقم القياسي. */
  prBests: Record<string, { nameAr: string; best: number }>
}

export interface WeeklyInsights {
  cards: InsightCard[]
  metrics: MetricsBundle
  /** امتنعت كل الرؤى (نحتاج بيانات) — الواجهة تعرض حالة «نحتاج المزيد». */
  abstained: boolean
  generatedAtMs: number
}
