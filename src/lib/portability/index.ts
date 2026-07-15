// واجهة نظام نقل البيانات (تصدير/استيراد) — قِمّة (PDPL R-1). محلّي بالكامل، بلا شبكة.

import { MAX_FILE_BYTES } from './importer'
import { PortabilityError } from './errors'

export { buildExportBundle, deliverBundle, exportFilename, captureStore } from './exporter'
export type { DeliveryMethod } from './exporter'
export {
  parseImportFile,
  applyImport,
  hasUndo,
  undoImport,
  clearStagedImport,
  MAX_FILE_BYTES,
  MAX_IMPORT_NODES,
  MAX_IMPORT_DEPTH,
  UNDO_KEY_PREFIX,
  undoKey,
} from './importer'
export type { ImportPreview, PreviewLine, ApplyResult } from './importer'
export { PortabilityError } from './errors'
export { STORE_DEFS, isNative, isExcludedKey } from './registry'
export {
  PORTABILITY_SCHEMA_VERSION,
  BUNDLE_KIND,
  buildArabicSummary,
} from './format'
export type { PortabilityBundle } from './format'

/** يقرأ ملفًّا مختارًا نصًّا (UTF-8) — للاستيراد. يرمي عند تعذّر القراءة. */
export function readFileText(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    return Promise.reject(new PortabilityError('الملفّ أكبر من الحدّ المسموح (٢٥ ميغابايت)'))
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('تعذّرت قراءة الملفّ'))
    reader.readAsText(file)
  })
}
