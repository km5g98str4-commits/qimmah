// نصوص لوحة مراجعة المنتجات — شاشة داخلية (ليست جزءًا من رحلة المستخدم العادية).

import type { Lang } from '@/lib/appPreferences'
import type { ProductReviewStatus } from '@/types'

export interface ReviewPanelStrings {
  title: string
  subtitle: string
  back: string
  empty: string
  emptyHint: string
  statusLabels: Record<Exclude<ProductReviewStatus, 'verified' | 'rejected'>, string>
  productPhoto: string
  nutritionPhoto: string
  noPhoto: string
  barcodeLabel: string
  brandLabel: string
  servingLabel: string
  caloriesLabel: string
  proteinLabel: string
  carbsLabel: string
  fatLabel: string
  per100g: string
  approve: string
  edit: string
  save: string
  cancel: string
  approvedToast: string
  savedToast: string
  nameFieldLabel: string
}

const ar: ReviewPanelStrings = {
  title: 'مراجعة المنتجات',
  subtitle: 'منتجات ممسوحة أو مُضافة بانتظار التحقق قبل اعتمادها في قاعدة البيانات.',
  back: 'رجوع',
  empty: 'لا توجد منتجات بانتظار المراجعة',
  emptyHint: 'كل المنتجات المُدخلة تمّت مراجعتها حاليًا.',
  statusLabels: {
    pending_review: 'قيد المراجعة',
    user_submitted: 'مُرسل من مستخدم',
    needs_fix: 'يحتاج تصحيح',
  },
  productPhoto: 'صورة المنتج',
  nutritionPhoto: 'صورة الجدول الغذائي',
  noPhoto: 'لا توجد صورة',
  barcodeLabel: 'الباركود',
  brandLabel: 'العلامة التجارية',
  servingLabel: 'الحصة',
  caloriesLabel: 'سعرات',
  proteinLabel: 'بروتين',
  carbsLabel: 'كربوهيدرات',
  fatLabel: 'دهون',
  per100g: 'لكل 100غ',
  approve: 'اعتماد',
  edit: 'تعديل',
  save: 'حفظ',
  cancel: 'إلغاء',
  approvedToast: 'تم اعتماد المنتج',
  savedToast: 'تم حفظ التعديلات',
  nameFieldLabel: 'اسم المنتج',
}

const en: ReviewPanelStrings = {
  title: 'Product review',
  subtitle: 'Scanned or submitted products awaiting verification before entering the database.',
  back: 'Back',
  empty: 'No products awaiting review',
  emptyHint: 'Everything submitted so far has been reviewed.',
  statusLabels: {
    pending_review: 'Pending review',
    user_submitted: 'User submitted',
    needs_fix: 'Needs fix',
  },
  productPhoto: 'Product photo',
  nutritionPhoto: 'Nutrition label photo',
  noPhoto: 'No photo',
  barcodeLabel: 'Barcode',
  brandLabel: 'Brand',
  servingLabel: 'Serving',
  caloriesLabel: 'Calories',
  proteinLabel: 'Protein',
  carbsLabel: 'Carbs',
  fatLabel: 'Fat',
  per100g: 'per 100g',
  approve: 'Approve',
  edit: 'Edit',
  save: 'Save',
  cancel: 'Cancel',
  approvedToast: 'Product approved',
  savedToast: 'Changes saved',
  nameFieldLabel: 'Product name',
}

export const reviewPanelStrings: Record<Lang, ReviewPanelStrings> = { ar, en }
