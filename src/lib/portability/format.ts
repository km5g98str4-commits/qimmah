// صيغة حزمة النقل + الملخّص العربي المقروء — قِمّة (PDPL R-1).

import { STORE_DEFS } from './registry'

/** إصدار مخطّط الحزمة — بوّابة توافق صارمة عند الاستيراد. */
export const PORTABILITY_SCHEMA_VERSION = 1
/** نوع الحزمة — تمييزها عن أي JSON آخر. */
export const BUNDLE_KIND = 'qimmah-data-export' as const

/** إصدار التطبيق وقت التصدير (توثيقي؛ لا يُستخدم كبوّابة). */
export function appVersion(): string {
  try {
    const v = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_APP_VERSION
    return v && typeof v === 'string' ? v : '1.0.0'
  } catch {
    return '1.0.0'
  }
}

export interface PortabilityBundle {
  kind: typeof BUNDLE_KIND
  schemaVersion: number
  app: 'qimmah'
  appVersion: string
  exportedAt: string
  /** ملخّص عربي مقروء يُوضَع أعلى الملفّ. */
  summaryAr: string
  /** عدّ لكل متجر (id → عدد العناصر) — لمعاينة سريعة دون تحميل القيم. */
  counts: Record<string, number>
  /** قيم المتاجر المعروفة: id → قيمة (بلا هوية مالك — يُعاد ترميزها للمستخدم الحالي عند الاستيراد). */
  stores: Record<string, unknown>
  /** بقايا غير مسجّلة (متاجر جديدة): مفتاح خام → قيمة (fail-safe؛ تحقّق بنيوي فقط). */
  unregistered: Record<string, unknown>
}

/** يبني الملخّص العربي المقروء من العدّادات. */
export function buildArabicSummary(counts: Record<string, number>, exportedAt: string, unregisteredCount: number): string {
  const parts: string[] = []
  for (const def of STORE_DEFS) {
    const n = counts[def.id] ?? 0
    if (n > 0) parts.push(`${def.labelAr}: ${n.toLocaleString('en-US')}`)
  }
  if (unregisteredCount > 0) parts.push(`عناصر إضافية: ${unregisteredCount}`)
  const body = parts.length ? parts.join(' · ') : 'لا توجد بيانات مسجّلة بعد'
  const when = formatArabicDate(exportedAt)
  return [
    'نسخة بيانات قِمّة',
    `أُنشئت: ${when}`,
    `تحتوي: ${body}`,
    'هذه النسخة محلّية بالكامل — أُنشئت على جهازك ولم تُرسَل إلى أي خادم.',
    'استوردها من: قِمّة ← الإعدادات ← بياناتي ← استيراد نسخة.',
  ].join('\n')
}

/** تنسيق تاريخ ISO إلى صيغة مقروءة (يوم/شهر/سنة ووقت) دون اعتماد على المنطقة. */
function formatArabicDate(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  } catch {
    return iso
  }
}
