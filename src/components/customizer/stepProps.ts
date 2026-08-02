import type { Customization } from '@/lib/customization'
import type { Lang } from '@/lib/appPreferences'

/** السياق المشترك الممرَّر لكل خطوة في معالج الإعداد. */
export interface WizardCtx {
  /** اللغة الحالية — تمرَّر لكل خطوة لتبديل النصوص حيًّا. */
  lang: Lang
  data: Customization
  /**
   * النسخة **المحفوظة** كما هي على الجهاز — [CTO-65] البند ٤.
   * `data` نسخة العمل المعلّقة، فبلا مرجع محفوظ تعذّر عرض «كان → صار».
   * للقراءة فقط: التعديل يمرّ من `update` كما كان.
   */
  saved: Customization
  update: (partial: Partial<Customization>) => void
  updateIdentity: (partial: Partial<Customization['identity']>) => void
  updateColors: (partial: Partial<Customization['colors']>) => void
  // إجراءات متقدمة (تُستخدم في خطوة المراجعة فقط)
  onExport: () => void
  onImportFile: (file: File) => void
  onReset: () => void
  onRestartOnboarding: () => void
}
