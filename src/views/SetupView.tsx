import { CustomizationCenter } from '@/sections/CustomizationCenter'
import { PlanBuilder } from '@/components/PlanBuilder'

interface SetupViewProps {
  onClose: (completed?: boolean) => void
  initialStep?: number
  mode?: 'onboarding' | 'advanced'
}

/** عرض الإعداد — باني الخطة (الجوال) عند أول مرة، ومحرّرات متقدمة عند التعديل. */
export function SetupView({ onClose, initialStep, mode = 'onboarding' }: SetupViewProps) {
  // الإعداد الأولي = باني الخطة الجوال الكامل
  if (mode !== 'advanced') {
    return <PlanBuilder onComplete={() => onClose(true)} onExit={() => onClose(false)} />
  }
  // التعديل = المحرّرات المتقدمة (تبقى كما هي)
  return <CustomizationCenter onBack={onClose} initialStep={initialStep} mode={mode} />
}
