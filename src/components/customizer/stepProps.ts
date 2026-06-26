import type { Customization } from '@/lib/customization'

/** السياق المشترك الممرَّر لكل خطوة في معالج الإعداد. */
export interface WizardCtx {
  data: Customization
  update: (partial: Partial<Customization>) => void
  updateIdentity: (partial: Partial<Customization['identity']>) => void
  updateColors: (partial: Partial<Customization['colors']>) => void
  // إجراءات متقدمة (تُستخدم في خطوة المراجعة فقط)
  onExport: () => void
  onImportFile: (file: File) => void
  onReset: () => void
  onRestartOnboarding: () => void
}
