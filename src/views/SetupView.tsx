import { useState } from 'react'
import { CustomizationCenter } from '@/sections/CustomizationCenter'
import { RouteErrorBoundary } from '@/components/ErrorBoundary'
import { OnboardingV2, PlanHandoffScreen } from '@/views/OnboardingV2'
import type { GeneratedPlan } from '@/lib/planGenerator'
import type { PlanRationale } from '@/lib/planRationale'
import type { GoalType } from '@/types/profile'

/** مخرجات التوليد المحفوظة التي تعرضها شاشة التسليم. */
interface PlanArtifacts { plan: GeneratedPlan; goalType: GoalType; rationale: PlanRationale }
import { getLanguage } from '@/lib/appPreferences'
import { useAuth } from '@/lib/authContext'
import { loadOnboardingProfile } from '@/lib/onboardingProfile'

interface SetupViewProps {
  onClose: (completed?: boolean) => void
  /** الدخول من شاشة التسليم — كالمخرج لكن بلا إشعار نجاح مكرّر (حزمة ٤). */
  onEnterFromHandoff?: () => void
  initialStep?: number
  mode?: 'onboarding' | 'advanced'
}

/** عرض الإعداد — باني الخطة (الجوال) عند أول مرة، ومحرّرات متقدمة عند التعديل. */
/**
 * الاسم المعروض في تحيّة الكشف — **أو لا شيء**.
 *
 * `authContext.displayName` يرجع البريد كبديل حين لا يوجد اسم. وهذا صحيح في
 * الترويسة، وكارثيّ في تحيّة: «يا ziyad@example.com، هذي نقطة البداية» أسوأ من
 * تحيّة بلا اسم. فنقبل الاسم **فقط** إن لم يكن بريدًا، ونسقط إلى الصيغة بلا
 * اسم فيما عدا ذلك — لا نخترع اسمًا ولا نعرض عنوانًا مكانه.
 */
function greetableName(displayName: string | null): string | null {
  if (!displayName) return null
  const trimmed = displayName.trim()
  if (!trimmed || trimmed.includes('@')) return null
  return trimmed
}

export function SetupView({ onClose, onEnterFromHandoff, initialStep, mode = 'onboarding' }: SetupViewProps) {
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
        plan={artifacts?.plan}
        goalType={artifacts?.goalType}
        rationale={artifacts?.rationale}
        displayName={greetableName(displayName)}
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
