// واجهة نظام نقل البيانات (تصدير/استيراد) — قِمّة (PDPL R-1). محلّي بالكامل، بلا شبكة.

export { buildExportBundle, deliverBundle, exportFilename, captureStore } from './exporter'
export type { DeliveryMethod } from './exporter'
export {
  parseImportFile,
  applyImport,
  hasUndo,
  undoImport,
  clearStagedImport,
  PortabilityError,
  MAX_FILE_BYTES,
  UNDO_KEY,
} from './importer'
export type { ImportPreview, PreviewLine, ApplyResult } from './importer'
export { STORE_DEFS, isNative, isExcludedKey } from './registry'
export {
  PORTABILITY_SCHEMA_VERSION,
  BUNDLE_KIND,
  buildArabicSummary,
} from './format'
export type { PortabilityBundle } from './format'

/** يقرأ ملفًّا مختارًا نصًّا (UTF-8) — للاستيراد. يرمي عند تعذّر القراءة. */
export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('تعذّرت قراءة الملفّ'))
    reader.readAsText(file)
  })
}
