import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { nutritionScreenStrings } from '@/i18n/dict/nutritionScreen'
import { loadOnboardingProfile } from '@/lib/onboardingProfile'

/**
 * تنبيه الحساسيات الغذائية.
 *
 * لماذا يوجد: الإعداد يجمع حساسيات المستخدم (`foodPreferences.allergies` عبر
 * planBuilderAnswers) لكن **لا شيء يقرأها** — لا `nutritionPlan` ولا
 * `planGenerator` ولا `mealTemplates` ولا `dietFilter` (الأخير يفلتر نمط الأكل
 * فقط: لحوم/سمك/بيض/ألبان/عسل، لا مسبّبات الحساسية). فمستخدمٌ أعلن حساسيةً من
 * المكسّرات قد تُقترح له وجبة تحتوي مكسّرات.
 *
 * الفلترة الحقيقية تتطلّب وسم كل صنف غذائي بمسبّباته عبر قاعدة تتجاوز 640 صنفًا
 * إضافةً إلى مكوّنات الوجبات — مهمّة بيانات قائمة بذاتها. حتى ذلك الحين **لا
 * نصمت**: نعرض ما أعلنه المستخدم ونقول صراحةً إن الخطة غير مُفلترة. تحذير صادق
 * خير من ثقة زائفة.
 *
 * ليس ادعاءً طبيًا ولا نصيحة علاجية — تذكيرٌ بمراجعة المكوّنات فقط.
 */
export function AllergyNotice({ lang, className }: { lang: Lang; className?: string }) {
  const profile = loadOnboardingProfile()
  const allergies = profile?.foodPreferences?.allergies ?? []
  if (!allergies.length) return null

  const s = nutritionScreenStrings[lang]

  return (
    <div className={cn('rounded-xl border border-warning/40 bg-warning/10 p-3.5', className)} role="note">
      <div className="flex items-start gap-2.5">
        <Icon name="AlertTriangle" className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-xs font-black text-ink-900">{s.allergyNoticeTitle}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-700">
            {s.allergyNoticeBodyPrefix}{' '}
            <span className="font-bold">{allergies.join(s.allergyNoticeSeparator)}</span>.{' '}
            {s.allergyNoticeBodySuffix}
          </p>
        </div>
      </div>
    </div>
  )
}
