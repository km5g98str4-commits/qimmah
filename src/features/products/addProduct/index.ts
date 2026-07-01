// نقطة الاستيراد الموصى بها للاستهلاك من خارج المجلد. مثال تحميل كسول من مكوّن مستهلِك:
//   const AddProductScreen = lazy(() => import('@/features/products/addProduct').then((m) => ({ default: m.AddProductScreen })))

export { AddProductScreen } from './AddProductScreen'
export { upsertProduct, getProductByBarcode, listUserProducts } from './productStore'
export { extractNutritionFromImage, parseNutritionText } from './ocr'
export type { StoredProduct, ProductPer, ProductStatus, ProductSourceName } from './types'
