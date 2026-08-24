import type { Lang } from '@/lib/appPreferences'

/**
 * نصوص بحث الطعام — ما تقوله الواجهة حين لا تعرف.
 *
 * سجلّ عامّية بيضاء (§6): الصنف المعبّأ بلا اسم مسجَّل يُوصف كما هو، بلا اعتذار
 * ولا رقم يتظاهر بأنه اسم.
 */
export interface FoodSearchStrings {
  /**
   * اسم بديل لسجل معبّأ لا يحمل اسمًا عربيًا ولا إنجليزيًا.
   *
   * ⚠️ **ليس تزيينًا:** البديل السابق كان مفتاحنا الداخلي (GTIN-14 بأصفار بادئة)
   * معروضًا في موضع الاسم — رقمٌ يقرؤه المستخدم باركودًا وهو ليس ما على العبوة.
   */
  unnamedPackaged: string
  /** بادئة الباركود حين يُعرض بجانب الاسم البديل — تُعلن أنه باركود لا اسم. */
  barcodeLabel: string
}

export const foodSearchStrings: Record<Lang, FoodSearchStrings> = {
  ar: { unnamedPackaged: 'منتج بلا اسم مسجَّل', barcodeLabel: 'باركود' },
  en: { unnamedPackaged: 'Product with no recorded name', barcodeLabel: 'Barcode' },
}
