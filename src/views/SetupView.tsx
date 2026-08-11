import { useState, Component, type ReactNode } from 'react'
import { CustomizationCenter } from '@/sections/CustomizationCenter'
import { OnboardingV2, PlanHandoffScreen } from '@/views/OnboardingV2'
import type { GeneratedPlan } from '@/lib/planGenerator'
import type { PlanRationale } from '@/lib/planRationale'
import type { GoalType } from '@/types/profile'

/** مخرجات التوليد المحفوظة التي تعرضها شاشة التسليم. */
interface PlanArtifacts { plan: GeneratedPlan; goalType: GoalType; rationale: PlanRationale }
import { getLanguage } from '@/lib/appPreferences'
import { useAuth } from '@/lib/authContext'

interface SetupViewProps {
  onClose: (completed?: boolean) => void
  /** مخرج طوارئ: يُعلّم الإعداد مكتملًا ويدخل اللوحة فورًا (زرّ التخطّي الدائم + حاجز الأخطاء). */
  onForceComplete?: () => void
  /** الدخول من شاشة التسليم — كالمخرج لكن بلا إشعار نجاح مكرّر (حزمة ٤). */
  onEnterFromHandoff?: () => void
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
            : 'لا بأس — يمكنك إكمال الإعداد لاحقًا من الإعدادات. سننقلك إلى التطبيق الآن.'}
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
export function SetupView({ onClose, onForceComplete, onEnterFromHandoff, initialStep, mode = 'onboarding' }: SetupViewProps) {
  const escape = onForceComplete ?? (() => onClose(true))
  const enterFromHandoff = onEnterFromHandoff ?? escape
  const { user } = useAuth()

  // [CTO-009/WP-2] مزلاج التسليم — **يعيش هنا لا داخل `OnboardingV2`**.
  //
  // السبب بنيوي: `markCompleted` يقلب `isOnboardingComplete`، فيعيد App اشتقاق
  // `mode='advanced'` ويُفكّ تركيب `OnboardingV2` في نفس اللحظة. أي حالة تسليم
  // داخله تموت قبل أن تُرسَم — وهو ما حدث فعلًا: الضغط على «الدخول للوحة» كان
  // يقفز مباشرةً إلى محرّر «تعديل خطتي».
  //
  // `SetupView` تبقى مركّبة عبر تبديل الوضع، فالمزلاج فيها ينجو، ويتقدّم على
  // `mode` حتى لا يسحب المحرّرُ المتقدّم البساطَ من تحت التسليم.
  const [finished, setFinished] = useState(false)
  /**
   * [QIM-WEB-FOUNDER-UX-004/حزمة ٣] مخرجات التوليد تعيش هنا لا في `OnboardingV2`:
   * المزلاج نفسه ولنفس السبب — `markCompleted` يفكّ تركيب المعالج، فأي حالة فيه
   * تموت قبل أن تُرسَم. وغيابها يعني تسليمًا بلا أرقام، لا تسليمًا بأرقام مخترعة.
   */
  const [artifacts, setArtifacts] = useState<PlanArtifacts | null>(null)

  if (finished) {
    return (
      <PlanHandoffScreen
        lang={getLanguage()}
        signedIn={user !== null}
        onEnter={enterFromHandoff}
        plan={artifacts?.plan}
        goalType={artifacts?.goalType}
        rationale={artifacts?.rationale}
      />
    )
  }

  // الإعداد الأولي = باني الخطة الجوال الكامل، محاطًا بمخرج طوارئ لا يحبس المستخدم أبدًا.
  if (mode !== 'advanced') {
    return (
      <SetupErrorBoundary onEscape={escape}>
        {/* الخطة تُحفظ ويُوسَم الإعداد مكتملًا **قبل** هذا النداء، فالتسليم عرضٌ
            لا تعليق لعقد الإكمال: إغلاق المتصفّح عنده لا يفقد شيئًا. */}
        <OnboardingV2
          lang={getLanguage()}
          onComplete={() => setFinished(true)}
          onExit={() => onClose(false)}
          onPlanReady={setArtifacts}
        />
      </SetupErrorBoundary>
    )
  }
  // التعديل = المحرّرات المتقدمة (تبقى كما هي)
  return <CustomizationCenter onBack={onClose} initialStep={initialStep} mode={mode} />
}
