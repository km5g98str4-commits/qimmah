// نقطة الاستيراد الموصى بها للاستهلاك من خارج المجلد. مثال تحميل كسول من مكوّن مستهلِك:
//   const AddProductScreen = lazy(() => import('@/features/products/addProduct').then((m) => ({ default: m.AddProductScreen })))
// قاعدة المنتجات (upsertProduct/getProduct/StoredProduct) تُستورَد مباشرة من '@/features/products'.

export { AddProductScreen } from './AddProductScreen'
export { extractNutritionFromImage, parseNutritionText } from './ocr'
