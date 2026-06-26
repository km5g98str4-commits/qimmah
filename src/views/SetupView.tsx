import { CustomizationCenter } from '@/sections/CustomizationCenter'

interface SetupViewProps {
  onClose: (completed?: boolean) => void
  initialStep?: number
}

/** عرض الإعداد — يلفّ معالج «إعداد صفحتي» (المعالج خطوة بخطوة). */
export function SetupView({ onClose, initialStep }: SetupViewProps) {
  return <CustomizationCenter onBack={onClose} initialStep={initialStep} />
}
