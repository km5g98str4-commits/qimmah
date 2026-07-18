import { Icon } from '@/components/Icon'
import { useCustomization } from '@/lib/customizationContext'
import type { Lang } from '@/lib/appPreferences'

/**
 * إشعار لطيف لمرّة واحدة (Option B): يظهر فقط لحساب قاصر هُوجِر هدفه تلقائيًا من
 * تنشيف/تضخيم إلى «المحافظة» عند الإقلاع. يُقرأ من ختم الهجرة في targetsMeta، ويُغلَق
 * بشكل دائم عبر ختم منفصل (owner-scoped: يعيش داخل التخصيص المخزّن، يُمسح عند تبديل الحساب).
 */
export function MinorGoalNotice({ lang = 'ar' }: { lang?: Lang }) {
  const { customization, applyCustomization } = useCustomization()
  const meta = customization.targetsMeta
  if (!meta.minorGoalMigratedAt || meta.minorGoalNoticeDismissed) return null

  const ar = lang !== 'en'
  const dismiss = () =>
    applyCustomization({
      ...customization,
      targetsMeta: { ...customization.targetsMeta, minorGoalNoticeDismissed: true },
    })

  const body = ar
    ? 'لأنك دون 18، حوّلنا هدفك إلى «المحافظة». أهداف تعديل الوزن متاحة من 18 سنة — وننصح بمراجعة مختص تغذية.'
    : 'Because you are under 18, we set your goal to Maintenance. Weight-change goals are available from age 18 — we recommend seeing a nutrition specialist.'

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-gold-400/40 bg-gold-200/40 p-4 text-start" role="status">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gold-300/50 text-gold-600">
        <Icon name="Info" className="h-4 w-4" />
      </span>
      <p className="min-w-0 flex-1 text-sm font-bold leading-relaxed text-ink-700">{body}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label={ar ? 'إغلاق الإشعار' : 'Dismiss'}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-500 hover:bg-gold-300/40"
      >
        <Icon name="X" className="h-4 w-4" />
      </button>
    </div>
  )
}
