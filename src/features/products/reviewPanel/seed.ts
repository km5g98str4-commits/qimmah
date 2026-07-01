// تعمير بيانات تجريبية واقعية للوحة المراجعة عند أول تشغيل — عبر واجهة قاعدة بيانات المنتجات
// الفعلية (`@/features/products`، من الوكيل 1)، وليس تخزينًا موازيًا خاصًا بهذه الشاشة.

import { getProduct, upsertProduct } from '@/features/products'

const SEED_BARCODES = ['6281007311111', '6281007322222', '6281007333333'] as const

/** يعمّر 3 منتجات تجريبية بحالات مراجعة مختلفة، مرّة واحدة فقط (لا يكرّر إن وُجدت مسبقًا). */
export function ensureReviewPanelSeed(): void {
  if (typeof window === 'undefined') return
  if (getProduct(SEED_BARCODES[0])) return

  const importedAt = new Date().toISOString()

  upsertProduct({
    barcode: SEED_BARCODES[0],
    name: 'حليب قليل الدسم 1 لتر',
    brand: 'المراعي',
    per: '100g',
    servingSize: '250مل',
    kcal: 48,
    protein: 3.4,
    carbs: 5,
    fat: 1.5,
    status: 'pending_review',
    source: { sourceName: 'ocr', importedAt },
  })

  upsertProduct({
    barcode: SEED_BARCODES[1],
    name: 'شوفان فوري بالعسل',
    brand: 'كويكر',
    per: '100g',
    servingSize: '40غ',
    kcal: 380,
    protein: 11,
    carbs: 66,
    fat: 7,
    status: 'user_submitted',
    source: { sourceName: 'user', importedAt },
  })

  upsertProduct({
    barcode: SEED_BARCODES[2],
    name: 'عصير برتقال طبيعي',
    brand: 'رابيكو',
    per: '100g',
    kcal: 45,
    protein: 0.5,
    carbs: 10,
    fat: 0,
    status: 'needs_fix',
    source: { sourceName: 'ocr', importedAt },
  })
}
