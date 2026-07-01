// أنواع بيانات المنتج المضاف يدويًا.
// الشكل هنا مصمّم ليطابق عقد قاعدة منتجات وكيل P8-A1 (StoredProduct + upsert) قدر الإمكان،
// حتى يكون استبدال productStore.ts لاحقًا بالوحدة المشتركة الفعلية تغييرًا في الاستيراد فقط.

/** أساس القيم الغذائية: لكل حصة أو لكل 100غ. */
export type ProductPer = 'serving' | '100g'

/**
 * حالة المنتج:
 * - user_submitted: أضافه المستخدم بقيم غذائية كاملة (>0 على الأقل لعنصر واحد).
 * - pending_review: أُضيف بدون قيم غذائية موثوقة (فشل OCR بالكامل أو تُرك فارغًا) — يحتاج تحقّق لاحقًا.
 */
export type ProductStatus = 'user_submitted' | 'pending_review'

export type ProductSourceName = 'user'

export interface StoredProduct {
  id: string
  barcode?: string
  name: string
  brand?: string
  per: ProductPer
  servingSize?: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  /** صورة المنتج — data URL. */
  imageUrl?: string
  /** صورة جدول الحقائق الغذائية — data URL. */
  nutritionImageUrl?: string
  sourceName: ProductSourceName
  status: ProductStatus
  createdAt: number
  updatedAt: number
}
