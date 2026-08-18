import { useState } from 'react'
import { CustomizationCenter } from '@/sections/CustomizationCenter'
import { RouteErrorBoundary } from '@/components/ErrorBoundary'
import { OnboardingV2, PlanHandoffScreen } from '@/views/OnboardingV2'
import type { GeneratedPlan } from '@/lib/planGenerator'
import type { PlanRationale } from '@/lib/planRationale'
import type { GoalType, Profile } from '@/types/profile'

/** مخرجات التوليد المحفوظة التي تعرضها شاشة التسليم. */
interface PlanArtifacts { plan: GeneratedPlan; goalType: GoalType; rationale: PlanRationale; profile: Profile }
import { getLanguage } from '@/lib/appPreferences'
import { useAuth } from '@/lib/authContext'
import { loadOnboardingProfile } from '@/lib/onboardingProfile'
import { firstGreetableName } from '@/lib/displayName'
import { declaredGoalTypeLabel } from '@/lib/declaredGoalWording'

interface SetupViewProps {
  onClose: (completed?: boolean) => void
  /** الدخول من شاشة التسليم — كالمخرج لكن بلا إشعار نجاح مكرّر (حزمة ٤). */
  onEnterFromHandoff?: () => void
  /** [WAVE-A] الطريق إلى إنشاء الحساب من شاشة التسليم عند لزومه. */
  onCreateAccount?: () => void
  initialStep?: number
  mode?: 'onboarding' | 'advanced'
}

/** عرض الإعداد — باني الخطة (الجوال) عند أول مرة، ومحرّرات متقدمة عند التعديل. */
export function SetupView({ onClose, onEnterFromHandoff, onCreateAccount, initialStep, mode = 'onboarding' }: SetupViewProps) {
  const enterFromHandoff = onEnterFromHandoff ?? (() => onClose(true))
  const { user, displayName } = useAuth()

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
        onCreateAccount={onCreateAccount}
        plan={artifacts?.plan}
        goalType={artifacts?.goalType}
        rationale={artifacts?.rationale}
        /* الملفّ من **نفس** التوليد المحفوظ — لا نسخة ثانية تنحرف عمّا يجده. */
        profile={artifacts?.profile}
        /* اسم الهدف من مصدر التسمية الموحّد، بصياغة المستوى المُعلن. */
        goalLabel={artifacts ? declaredGoalTypeLabel(getLanguage(), artifacts.goalType, '') || null : null}
        /* الاسم الذي كتبه المستخدم في الإعداد **يسبق** ما يعرفه حسابه: هو
           اختاره لنفسه للتوّ. وكلاهما يمرّ بحارس البريد — لا عنوان بريد في
           موضع اسم. */
        displayName={firstGreetableName(loadOnboardingProfile()?.profile?.name, displayName)}
        /* الوزن يُقرأ من الملفّ المحفوظ لا من حالة عابرة: `saveOnboardingProfile`
           يسبق `onPlanReady`، فالقيمة هنا هي التي حُفظت فعلًا — لا نسخة ثانية
           قد تفترق عنها. وغيابها يعني رسمًا لا يُعرض، لا رقمًا مخترعًا. */
        currentWeightKg={loadOnboardingProfile()?.bodyMetrics?.currentWeightKg ?? null}
      />
    )
  }

  // الإعداد الأولي = باني الخطة الجوال الكامل. خطأ العرض يعاد عبر الحاجز الموحد
  // من دون تحويله إلى إكمال كاذب أو مسح المسودة المحفوظة.
  if (mode !== 'advanced') {
    return (
      <RouteErrorBoundary>
        {/* الخطة تُحفظ ويُوسَم الإعداد مكتملًا **قبل** هذا النداء، فالتسليم عرضٌ
            لا تعليق لعقد الإكمال: إغلاق المتصفّح عنده لا يفقد شيئًا. */}
        <OnboardingV2
          lang={getLanguage()}
          onComplete={() => setFinished(true)}
          onExit={() => onClose(false)}
          onPlanReady={setArtifacts}
        />
      </RouteErrorBoundary>
    )
  }
  // التعديل = المحرّرات المتقدمة (تبقى كما هي)
  return <CustomizationCenter onBack={onClose} initialStep={initialStep} mode={mode} />
}
