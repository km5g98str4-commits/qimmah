/**
 * طابور الاهتمام — اشتقاق نقيّ من لقطة اللوحة.
 * [QIMMAH-SOVEREIGN-PHASE-II-001] · AGENT-E.
 *
 * ═══ الفرق بين لوحة تحليلات وكونسول تشغيل ═══
 * التحليلات تجيب «كم». والكونسول يجيب **«ما الذي يحتاجني الآن»**. فهذا الطابور
 * ليس زينة فوق الأرقام، بل هو **الجزء الوحيد من اللوحة الذي يعمل اليوم فعلًا**.
 *
 * ═══ ثلاث حالات لا اثنتان ═══
 * الفخّ أن يُطوى «فحصنا ولم نجد» و«لا نستطيع الفحص» في «لا يوجد تنبيه». فمؤسس
 * يرى طابورًا فارغًا يستنتج أن كل شيء بخير، وقد يكون كل شيء **غير مرئي**.
 * فكل بند يحمل `detectable`، والبنود غير القابلة للكشف **تُعرض مسمّاة**
 * في قسم منفصل: «هذا ما لا نستطيع مراقبته بعد».
 * ويحرس هذا `test:admin-dashboard` بتأكيد مضادّ يمنع إسقاطها من المخرجات.
 */

import type { AttentionItem, ExecutiveSnapshot, PlatformPosture } from '../contract/types'

/** ترتيب الشدّة — الحرج أولًا دائمًا. */
const SEVERITY_ORDER: Record<AttentionItem['severity'], number> = { critical: 0, warning: 1, info: 2 }

/**
 * الإشارتان اللتان تعملان اليوم.
 *
 * كلتاهما تقرأ **إعداد البناء لا صفوف المستخدمين**، ولذلك تعملان بلا خادم ولا
 * دور ولا موافقة. وهما تحديدًا ما يجيب سؤال المؤسس التنفيذي الأول:
 * **«لماذا لا يوجد رقم واحد في هذه الشاشة؟»**
 */
export function platformAttention(platform: PlatformPosture): AttentionItem[] {
  const items: AttentionItem[] = []

  if (platform.entitlementSource === 'none') {
    items.push({
      id: 'attn.entitlementSourceMissing',
      severity: 'critical',
      titleKey: 'attn.entitlementSourceMissing.title',
      detailKey: 'attn.entitlementSourceMissing.detail',
      detectable: true,
      availability: 'AVAILABLE_NOW',
      icon: 'Wallet',
    })
  }

  if (platform.syncPipeline === 'disabled') {
    items.push({
      id: 'attn.syncPipelineDown',
      severity: 'warning',
      titleKey: 'attn.syncPipelineDown.title',
      detailKey: 'attn.syncPipelineDown.detail',
      detectable: true,
      availability: 'AVAILABLE_NOW',
      icon: 'Database',
    })
  }

  if (!platform.backendConfigured) {
    items.push({
      id: 'attn.backendUnconfigured',
      severity: 'critical',
      titleKey: 'attn.backendUnconfigured.title',
      detailKey: 'attn.backendUnconfigured.detail',
      detectable: true,
      availability: 'AVAILABLE_NOW',
      icon: 'AlertTriangle',
    })
  }

  return items
}

/**
 * البنود غير القابلة للكشف — **تُعرض ولا تُخفى**.
 *
 * إخفاؤها يجعل الطابور يكذب بالصمت: الغياب يُقرأ طمأنينة. وعرضها يحوّل العمى
 * نفسه إلى معلومة تشغيلية، وهي أصدق ما تملكه اللوحة اليوم.
 */
export const UNDETECTABLE_ATTENTION: readonly AttentionItem[] = [
  {
    id: 'attn.activationFailureSpike',
    severity: 'critical',
    titleKey: 'attn.activationFailureSpike.title',
    detailKey: 'attn.activationFailureSpike.detail',
    detectable: false,
    availability: 'NEEDS_BACKEND',
    icon: 'KeyRound',
  },
  {
    id: 'attn.errorRateChange',
    severity: 'critical',
    titleKey: 'attn.errorRateChange.title',
    detailKey: 'attn.errorRateChange.detail',
    detectable: false,
    availability: 'NEEDS_BACKEND',
    icon: 'AlertCircle',
  },
  {
    id: 'attn.stuckOnboarding',
    severity: 'warning',
    titleKey: 'attn.stuckOnboarding.title',
    detailKey: 'attn.stuckOnboarding.detail',
    detectable: false,
    availability: 'IMPOSSIBLE_WITHOUT_CONSENT_CHANGE',
    icon: 'ListChecks',
  },
  {
    id: 'attn.inactivity',
    severity: 'warning',
    titleKey: 'attn.inactivity.title',
    detailKey: 'attn.inactivity.detail',
    detectable: false,
    availability: 'NEEDS_BACKEND',
    icon: 'Clock',
  },
  {
    id: 'attn.foodIngestFailure',
    severity: 'warning',
    titleKey: 'attn.foodIngestFailure.title',
    detailKey: 'attn.foodIngestFailure.detail',
    detectable: false,
    availability: 'NEEDS_BACKEND',
    icon: 'Utensils',
  },
  {
    id: 'attn.exerciseMediaMissing',
    severity: 'info',
    titleKey: 'attn.exerciseMediaMissing.title',
    detailKey: 'attn.exerciseMediaMissing.detail',
    detectable: false,
    availability: 'NEEDS_BACKEND',
    icon: 'ImageOff',
  },
  {
    id: 'attn.launchBlockers',
    severity: 'info',
    titleKey: 'attn.launchBlockers.title',
    detailKey: 'attn.launchBlockers.detail',
    detectable: false,
    availability: 'NEEDS_BACKEND',
    icon: 'FileText',
  },
] as const

/**
 * يبني الطابور كاملًا: المكتشَف أولًا مرتّبًا بالشدّة، ثم غير القابل للكشف.
 * الترتيب داخل كل مجموعة ثابت (الشدّة ثم المعرّف) فلا يرقص البند بين تحديثين.
 */
export function buildAttentionQueue(snapshot: ExecutiveSnapshot): readonly AttentionItem[] {
  const detected = platformAttention(snapshot.platform).sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.id.localeCompare(b.id),
  )
  const blind = [...UNDETECTABLE_ATTENTION].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.id.localeCompare(b.id),
  )
  return [...detected, ...blind]
}

/** المكتشَف وحده — للعدّاد في الترويسة. */
export function detectedCount(items: readonly AttentionItem[]): number {
  return items.filter((i) => i.detectable).length
}

/** غير القابل للكشف — يُعرض كقسم «ما لا نراه بعد». */
export function blindCount(items: readonly AttentionItem[]): number {
  return items.filter((i) => !i.detectable).length
}
