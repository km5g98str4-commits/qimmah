// التصدير — بناء حزمة النقل + التسليم المحلّي (مشاركة أصلية أو تنزيل). قِمّة (PDPL R-1).
//
// صفر شبكة بالتصميم: البناء يقرأ localStorage فقط، والتسليم عبر Web Share API
// (ورقة المشاركة الأصلية على iOS/Android داخل WKWebView) أو تنزيل Blob على الويب.
// لا استدعاء خادم إطلاقًا.

import { STORE_DEFS, ownerToken, readRaw, type StoreDef } from './registry'
import { requirePortabilityOwner } from './guard'
import {
  BUNDLE_KIND,
  PORTABILITY_SCHEMA_VERSION,
  appVersion,
  buildArabicSummary,
  type PortabilityBundle,
} from './format'

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/** يلتقط القيمة الخام لمتجر للمستخدم الحالي (بلا هوية مالك في القيمة). */
export function captureStore(def: StoreDef, uid: string | null | undefined): unknown {
  if (def.kind === 'ownerMap') {
    const map = readRaw(def.key)
    return isObj(map) ? map[ownerToken(uid)] : undefined
  }
  return readRaw(def.keyFor(uid))
}

/**
 * يبني حزمة النقل الكاملة لبيانات المستخدم الحالي (owner-scoped).
 * fail-safe: يلتقط المتاجر المسجّلة + أي بقايا `qimmah:*` جديدة غير مستثناة.
 */
export function buildExportBundle(uid: string | null | undefined, now: Date = new Date()): PortabilityBundle {
  const ownerId = requirePortabilityOwner(uid)
  const stores: Record<string, unknown> = {}
  const counts: Record<string, number> = {}
  for (const def of STORE_DEFS) {
    const value = captureStore(def, ownerId)
    if (value === undefined) continue
    stores[def.id] = value
    counts[def.id] = def.count(value)
  }
  // Explicit allowlist only. Unknown `qimmah:*` keys may be auth/device state or
  // another owner's future store and must never be exfiltrated speculatively.
  const unregistered: Record<string, never> = {}
  const exportedAt = now.toISOString()
  return {
    kind: BUNDLE_KIND,
    schemaVersion: PORTABILITY_SCHEMA_VERSION,
    app: 'qimmah',
    appVersion: appVersion(),
    exportedAt,
    summaryAr: buildArabicSummary(counts, exportedAt, Object.keys(unregistered).length),
    counts,
    stores,
    unregistered,
  }
}

/** اسم ملفّ التصدير مؤرّخ. */
export function exportFilename(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `qimmah-data-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`
}

export type DeliveryMethod = 'share' | 'download' | 'unavailable'

/**
 * يسلّم الحزمة محلّيًا: يفضّل ورقة المشاركة الأصلية (Web Share API مع ملفّ) حين تتاح
 * — تعمل داخل WKWebView على iOS ١٥+ — وإلا يسقط لتنزيل Blob على الويب.
 * لا شبكة. يعيد الطريقة المستخدمة. يبتلع إلغاء المستخدم للمشاركة بهدوء.
 */
export async function deliverBundle(bundle: PortabilityBundle, now: Date = new Date()): Promise<DeliveryMethod> {
  if (typeof window === 'undefined') return 'unavailable'
  const json = JSON.stringify(bundle, null, 2)
  const filename = exportFilename(now)
  const blob = new Blob([json], { type: 'application/json' })

  // (١) مشاركة أصلية بملفّ — ورقة النظام (حفظ في الملفّات/إرسال) دون أي خادم.
  try {
    const nav = navigator as Navigator & {
      canShare?: (data?: unknown) => boolean
      share?: (data: unknown) => Promise<void>
    }
    if (typeof File !== 'undefined' && nav.share && nav.canShare) {
      const file = new File([blob], filename, { type: 'application/json' })
      if (nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: 'نسخة بيانات قِمّة' })
          return 'share'
        } catch (err) {
          // إلغاء المستخدم (AbortError) ليس فشلًا — لا نُكمل للتنزيل كي لا نُكرّر.
          if (err && typeof err === 'object' && (err as { name?: string }).name === 'AbortError') return 'share'
          // خطأ حقيقي في المشاركة → نُكمل لمسار التنزيل.
        }
      }
    }
  } catch {
    /* واجهة المشاركة غير متاحة — نسقط للتنزيل */
  }

  // (٢) تنزيل Blob (الويب) — رابط تنزيل مؤقّت يُلغى فورًا.
  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
    return 'download'
  } catch {
    return 'unavailable'
  }
}
