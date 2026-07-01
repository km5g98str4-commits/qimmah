// الواجهة العامة لطبقة قاعدة بيانات المنتجات — نقطة الاستيراد الوحيدة الموصى بها لبقية الوكلاء.

export type {
  AuditAction,
  AuditEntry,
  MacroSet,
  ProductInput,
  ProductPer,
  ProductSource,
  ProductStatus,
  StoredProduct,
} from './types'

export { editProduct, getAuditLog, getProduct, listByStatus, searchProducts, setProductStatus, upsertProduct } from './store'

export {
  registerAuthorizedSourceFetcher,
  registerOpenFoodFactsFetcher,
  resolveBarcode,
} from './resolve'
export type { FoundIn, RemoteFetcher, RemoteProductResult, ResolveResult } from './resolve'
