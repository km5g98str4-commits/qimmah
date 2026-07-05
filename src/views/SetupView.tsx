import { Component, type ReactNode } from 'react'
import { CustomizationCenter } from '@/sections/CustomizationCenter'
import { PlanBuilder } from '@/components/PlanBuilder'
import { getLanguage } from '@/lib/appPreferences'

interface SetupViewProps {
  onClose: (completed?: boolean) => void
  /** مخرج طوارئ: يُعلّم الإعداد مكتملًا ويدخل اللوحة فورًا (زرّ التخطّي الدائم + حاجز الأخطاء). */
  onForceComplete?: () => void
  initialStep?: number
  mode?: 'onboarding' | 'advanced'
}

/**
 * حاجز أخطاء خاص بمعالج الإعداد: لو تعطّلت أي خطوة أثناء العرض، لا نترك المستخدم أمام
 * شاشة ميّتة — نعرض مخرجًا واضحًا «الدخول للوحة» يُكمل الإعداد ويتجاوز المعالج تمامًا.
 * (المتطلّب: خطوة معطوبة/عالقة يجب أن تتدهور إلى «تخطّي إلى اللوحة»، لا أن تحبس المستخدم.)
 */
class SetupErrorBoundary extends Component<{ onEscape: () => void; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: unknown) {
    console.error('Setup wizard crashed — offering escape to dashboard:', error)
  }
  render(): ReactNode {
    if (!this.state.hasError) return this.props.children
    const en = getLanguage() === 'en'
    return (
      <div dir={en ? 'ltr' : 'rtl'} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-night-950 px-8 text-center text-night-100">
        <h1 className="text-2xl font-black">{en ? 'Setup hit a snag' : 'صار خلل في الإعداد'}</h1>
        <p className="mt-3 max-w-sm text-sm text-night-300">
          {en
            ? "No problem — you can finish setup later from Settings. Let's get you into the app."
            : 'ما فيه مشكلة — تقدر تكمل الإعداد لاحقًا من الإعدادات. نوصلك للتطبيق الحين.'}
        </p>
        <button
          type="button"
          onClick={this.props.onEscape}
          className="mt-8 rounded-2xl bg-primary px-8 py-4 text-lg font-black text-white"
        >
          {en ? 'Go to dashboard' : 'الدخول للوحة'}
        </button>
      </div>
    )
  }
}

/** عرض الإعداد — باني الخطة (الجوال) عند أول مرة، ومحرّرات متقدمة عند التعديل. */
export function SetupView({ onClose, onForceComplete, initialStep, mode = 'onboarding' }: SetupViewProps) {
  // الإعداد الأولي = باني الخطة الجوال الكامل، محاطًا بمخرج طوارئ لا يحبس المستخدم أبدًا.
  if (mode !== 'advanced') {
    const escape = onForceComplete ?? (() => onClose(true))
    return (
      <SetupErrorBoundary onEscape={escape}>
        <PlanBuilder onComplete={() => onClose(true)} onExit={() => onClose(false)} onForceComplete={escape} />
      </SetupErrorBoundary>
    )
  }
  // التعديل = المحرّرات المتقدمة (تبقى كما هي)
  return <CustomizationCenter onBack={onClose} initialStep={initialStep} mode={mode} />
}
