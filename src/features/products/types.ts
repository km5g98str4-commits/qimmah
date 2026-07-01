// أنواع قاعدة بيانات المنتجات الداخلية — مفتاحها الأساسي هو الباركود.
// طبقة بيانات خالصة بلا واجهة مستخدم — تُستهلك من ميزات الباركود/OCR/الإضافة اليدوية.

/** حالة مراجعة المنتج داخل النظام. */
export type ProductStatus = 'verified' | 'pending_review' | 'user_submitted' | 'imported' | 'needs_fix'

/** أساس القيم الغذائية: لكل حصة أو لكل 100غ. */
export type ProductPer = 'serving' | '100g'

/** مصدر بيانات ساهم في هذا المنتج. منتج واحد قد يملك عدة مصادر بمرور الوقت. */
export interface ProductSource {
  /** 'open_food_facts' | 'user' | 'ocr' | 'authorized:<name>' */
  sourceName: string
  sourceUrl?: string
  importedAt: string
  /** مرجع إذن مكتوب — لازم فقط للمصادر المرخّصة (authorized:*). */
  permissionRef?: string
}

/** المنتج كما يُخزَّن، مفتاحه الباركود. لا يوجد باركود مكرر — أي مصدر جديد يُدمج في sources[]. */
export interface StoredProduct {
  barcode: string
  name: string
  brand?: string
  /** رابط صورة المنتج (بعيد أو data-url). */
  imageUrl?: string
  /** صورة جدول القيم الغذائية — للمراجعة اليدوية عند الحاجة. */
  nutritionImageUrl?: string
  per: ProductPer
  servingSize?: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  status: ProductStatus
  sources: ProductSource[]
  createdAt: string
  updatedAt: string
}

/** نوع إجراء التدقيق المسجَّل عند كل تعديل. */
export type AuditAction = 'add' | 'edit' | 'merge' | 'status_change'

export interface AuditEntry {
  barcode: string
  action: AuditAction
  by: string
  at: string
  sourceName: string
  note?: string
}

/** القيم الغذائية الخام بدون معرّف المنتج — تُستخدم للمقارنة عند الدمج. */
export interface MacroSet {
  per: ProductPer
  servingSize?: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}

/** مدخل لإضافة/تحديث منتج من أي مصدر (باركود داخلي، OFF، مصدر مرخّص، إدخال مستخدم، OCR...). */
export interface ProductInput {
  barcode: string
  name: string
  brand?: string
  imageUrl?: string
  nutritionImageUrl?: string
  per: ProductPer
  servingSize?: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  /** حالة صريحة (مثلاً مستخدم يوثّق منتجًا كـ verified). إن لم تُحدَّد تُحسَب تلقائيًا. */
  status?: ProductStatus
  source: ProductSource
  /** مُنفّذ العملية لسجل التدقيق — افتراضيًا اسم المصدر. */
  by?: string
  note?: string
}
