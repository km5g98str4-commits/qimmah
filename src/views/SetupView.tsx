import { CustomizationCenter } from '@/sections/CustomizationCenter'

interface SetupViewProps {
  onClose: (completed?: boolean) => void
  initialStep?: number
  mode?: 'onboarding' | 'advanced'
}

/** عرض الإعداد — يلفّ معالج الخطة (موجّه عند أول مرة، متقدّم عند التعديل). */
export function SetupView({ onClose, initialStep, mode }: SetupViewProps) {
  return <CustomizationCenter onBack={onClose} initialStep={initialStep} mode={mode} />
}
