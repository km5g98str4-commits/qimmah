// «وش راح تسوي معك قِمّة؟» — التركيب لا الإعلان.
// [SOVEREIGN-ENTRY-001] الحزمة ٦.
//
// ═══ قاعدتان تحكمان كل سطر هنا ═══
// ١) **لا سطر بلا مصدر.** كل قيمة تأتي من إجابة أدخلها المستخدم أو من حساب
//    المحرّك عليها — من **نفس** التوليد الذي حُفظ (`buildPlanArtifactsFromOnboarding`)
//    لا من توليد ثانٍ للعرض. وما لا نعرفه **لا يُعرض** ولا يُخترع له بديل:
//    كل صفّ هنا مشروط بوجود مصدره.
// ٢) **المقاس حاسم والمُستنتَج متحفّظ** (§6/٢). الأيام والمدّة والمكان والأدوات
//    والهدف كلّها اختيارات صريحة ⇒ تُقال بلا تحفّظ. السعرات والبروتين مشتقّان
//    من معادلة ⇒ يحملان وسم «تقريبي» **مرئيًّا** لا في تعليق كود.
//
// وقاموس `revealStrings.value` كان مكتوبًا بالكامل ومترجَمًا **ولا يقرأه أحد**:
// نصوص جاهزة بلا سطح يعرضها. هذا سطحها.

import type { Lang } from '@/lib/appPreferences'
import type { GeneratedPlan } from '@/lib/planGenerator'
import type { Profile } from '@/types/profile'
import { revealStrings } from '@/i18n/dict/reveal'
import { onboardingEquipmentStrings } from '@/i18n/dict/onboardingEquipment'
import { V2_ONBOARDING } from '@/design-system/v2/labels'
import { plannedSplitLabelForDays } from '@/lib/onboardingV2Flow'
import { formatNumber } from '@/lib/numberFormat'
import { Icon } from '@/components/Icon'

/** نوع المكان الدلالي ⇒ التسمية المعروضة، من قاموسها لا من نصّ صلب. */
function placeLabel(profile: Profile, lang: Lang): string | null {
  const places = (V2_ONBOARDING[lang] ?? V2_ONBOARDING.ar).places
  const eq = onboardingEquipmentStrings[lang] ?? onboardingEquipmentStrings.ar
  switch (profile.gymType) {
    case 'commercial':
      return places.find((p) => p.value === 'gym')?.label ?? null
    case 'home':
      return places.find((p) => p.value === 'home')?.label ?? null
    case 'small':
      return places.find((p) => p.value === 'machines')?.label ?? null
    case 'bodyweight':
      // «وزن الجسم» مكانٌ بحقّه هنا: هو ما اختاره فعلًا ولا تصفه بطاقات الأماكن.
      return eq.labels.bodyweight
    default:
      return null
  }
}

export interface RevealValueProps {
  lang: Lang
  /** الملفّ المولَّد من **نفس** التشغيل المحفوظ — لا نسخة ثانية. */
  profile: Profile
  /** مخرجات التوليد نفسها؛ غيابها يعني صفوفًا أقلّ لا أرقامًا مخترعة. */
  plan?: GeneratedPlan
  goalLabel?: string | null
}

export function RevealValue({ lang, profile, plan, goalLabel }: RevealValueProps) {
  const t = revealStrings[lang] ?? revealStrings.ar
  const v = t.value
  const eq = onboardingEquipmentStrings[lang] ?? onboardingEquipmentStrings.ar
  const splits = (V2_ONBOARDING[lang] ?? V2_ONBOARDING.ar).training.splits

  const place = placeLabel(profile, lang)
  // الأدوات المُعلَنة فقط؛ فارغة تعني «لم يُسأل» فلا يُعرض الصفّ أصلًا.
  const equipment = (profile.equipment ?? []).map((key) => eq.labels[key]).filter(Boolean)
  const targets = plan?.targets
  const nutritionLine = profile.nutritionDisplayStyle ? v.nutritionStyle[profile.nutritionDisplayStyle] : null

  return (
    <section className="rounded-2xl border border-line bg-surface p-4" data-testid="reveal-value">
      <h2 className="text-sm font-black text-ink-900">{v.title}</h2>

      {/* ما اختاره — مقاس، فبلا وسم ولا تحفّظ. */}
      <ul className="mt-3 space-y-2 text-[0.83rem] leading-relaxed text-ink-700" data-testid="reveal-value-measured">
        {goalLabel && <Row icon="Target" text={v.goal(goalLabel)} />}
        <Row
          icon="CalendarDays"
          text={v.training(formatNumber(profile.trainingDays, lang), formatNumber(profile.workoutDuration, lang))}
        />
        <Row icon="Dumbbell" text={v.strategy(plannedSplitLabelForDays(profile.trainingDays, splits))} />
        {place && <Row icon="Building2" text={v.place(place)} />}
        {equipment.length > 0 && <Row icon="Wrench" text={v.equipment(equipment.join(' · '))} />}
        {nutritionLine && <Row icon="Utensils" text={nutritionLine} />}
      </ul>

      {/* ما حسبناه — مشتقّ، فيحمل وسمه المرئي. */}
      {targets?.numericNutritionStatus === 'available' && (
        <ul className="mt-3 space-y-2 border-t border-line pt-3 text-[0.83rem] leading-relaxed text-ink-700" data-testid="reveal-value-estimated">
          <Row icon="Flame" text={v.nutrition(formatNumber(targets.targetCalories, lang))} badge={v.estimateBadge} />
          <Row icon="Utensils" text={v.protein(formatNumber(targets.proteinGrams, lang))} badge={v.estimateBadge} />
        </ul>
      )}

      {/* ما نتتبّعه — وعدُ تتبّع لا وعدُ نتيجة. لا ادّعاء طبي ولا نتيجة مضمونة. */}
      <h3 className="mt-4 text-xs font-black uppercase tracking-wide text-ink-500">{v.tracksTitle}</h3>
      <ul className="mt-2 space-y-2 text-[0.83rem] leading-relaxed text-ink-700" data-testid="reveal-value-tracks">
        <Row icon="TrendingUp" text={v.progress} />
        <Row icon="Info" text={v.adaptation} />
      </ul>
    </section>
  )
}

function Row({ icon, text, badge }: { icon: string; text: string; badge?: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <Icon name={icon} className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
      <span className="min-w-0 flex-1">{text}</span>
      {badge && (
        <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-[0.62rem] font-bold text-ink-500">{badge}</span>
      )}
    </li>
  )
}
