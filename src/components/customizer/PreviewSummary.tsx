import { Icon } from '@/components/Icon'
import type { Customization } from '@/lib/customization'
import type { Lang } from '@/lib/appPreferences'
import { onboardingStrings } from '@/i18n/dict/onboarding'

/**
 * معاينة مختصرة حيّة لخطة المستخدم — تتحدّث مع كل تعديل.
 *
 * [CTO-67] البند ٢ — حُذف صفّ «النوع: فرد».
 *
 * قيمته كانت تأتي من `userTypeOptions` (فرد · مدرب · صانع محتوى): **شرائح
 * مشترين في قالب يُباع**، لا حقل في تطبيق لياقة شخصي — وهو ما يمنعه §0 نصًّا.
 * وكانت القائمة بلا ترجمة إنجليزية أصلًا، فالواجهة الإنجليزية تعرض «Type: فرد»
 * — لغة قالب وتسريب i18n في سطر واحد.
 *
 * الحقل `identity.userType` **باقٍ في نموذج البيانات** عمدًا: يقرؤه/يكتبه ملفّ
 * التصدير والاستيراد، وحذفه من النموذج يكسر توافق النسخ الاحتياطية القائمة.
 * المحذوف هو عرضه للمستخدم، وهو موضع المخالفة.
 */
export function PreviewSummary({ data, lang }: { data: Customization; lang: Lang }) {
  const d = onboardingStrings[lang]

  return (
    <div
      className="card overflow-hidden p-6"
      style={{ boxShadow: `0 18px 50px -22px ${data.colors.primary}55` }}
    >
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold"
        style={{ backgroundColor: `${data.colors.primary}1f`, color: data.colors.primary }}
      >
        <Icon name="Sparkles" className="h-3 w-3" />
        {d.previewYourPage}
      </span>

      <h3 className="mt-4 text-2xl font-black text-ink-900">{data.identity.brandName}</h3>
      <p className="mt-1 text-sm text-ink-500">{data.identity.tagline}</p>

      <div className="mt-5 rounded-xl border border-line bg-page p-3">
        <p className="text-[11px] text-ink-400">{d.previewYourGoal}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-900">{data.identity.mainGoal}</p>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-ink-500">{d.previewPageOwner}</span>
        <span className="font-bold text-ink-900">{data.identity.userName}</span>
      </div>

      <div className="mt-5 flex gap-2">
        <span className="h-8 flex-1 rounded-lg" style={{ backgroundColor: data.colors.primary }} />
        <span className="h-8 flex-1 rounded-lg" style={{ backgroundColor: data.colors.accent }} />
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2 text-center">
        <PreviewStat label={d.previewWorkouts} value={data.workouts.length} />
        <PreviewStat label={d.previewMeals} value={data.meals.length} />
        <PreviewStat label={d.previewSupplements} value={data.supplements.length} />
        <PreviewStat label={d.previewMetrics} value={data.metrics.length} />
      </div>
    </div>
  )
}

function PreviewStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-page py-2">
      <p className="text-lg font-black text-ink-900">{value}</p>
      <p className="text-[10px] text-ink-400">{label}</p>
    </div>
  )
}
