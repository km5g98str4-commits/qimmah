import { CustomizationCenter } from '@/sections/CustomizationCenter'
import { PlanBuilder } from '@/components/PlanBuilder'
import { V2OnboardingFlow } from '@/components/V2OnboardingFlow'

interface SetupViewProps {
  onClose: (completed?: boolean) => void
  initialStep?: number
  mode?: 'onboarding' | 'advanced'
  designV2?: boolean
}

/** عرض الإعداد — باني الخطة (الجوال) عند أول مرة، ومحرّرات متقدمة عند التعديل. */
export function SetupView({ onClose, initialStep, mode = 'onboarding', designV2 = false }: SetupViewProps) {
  // الإعداد الأولي = باني الخطة الجوال الكامل
  if (mode !== 'advanced') {
    if (designV2) return <V2OnboardingFlow onComplete={() => onClose(true)} onExit={() => onClose(false)} />
    return <PlanBuilder onComplete={() => onClose(true)} onExit={() => onClose(false)} />
  }
  // التعديل = المحرّرات المتقدمة (تبقى كما هي)
  return <CustomizationCenter onBack={onClose} initialStep={initialStep} mode={mode} />
}
