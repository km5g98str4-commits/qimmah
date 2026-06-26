import { Icon } from '@/components/Icon'
import { userTypeOptions, type Customization } from '@/lib/customization'

/** معاينة مختصرة حيّة لصفحة المستخدم — تتحدّث مع كل تعديل. */
export function PreviewSummary({ data }: { data: Customization }) {
  const userTypeLabel =
    userTypeOptions.find((o) => o.value === data.identity.userType)?.label ?? ''

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
        معاينة صفحتك
      </span>

      <h3 className="mt-4 text-2xl font-black text-ink-900">{data.identity.brandName}</h3>
      <p className="mt-1 text-sm text-ink-500">{data.identity.tagline}</p>

      <div className="mt-5 rounded-xl border border-line bg-page p-3">
        <p className="text-[11px] text-ink-400">هدفك</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-900">{data.identity.mainGoal}</p>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-ink-500">صاحب الصفحة</span>
        <span className="font-bold text-ink-900">{data.identity.userName}</span>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-sm">
        <span className="text-ink-500">النوع</span>
        <span className="font-bold text-ink-900">{userTypeLabel}</span>
      </div>

      <div className="mt-5 flex gap-2">
        <span className="h-8 flex-1 rounded-lg" style={{ backgroundColor: data.colors.primary }} />
        <span className="h-8 flex-1 rounded-lg" style={{ backgroundColor: data.colors.accent }} />
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2 text-center">
        <PreviewStat label="تمارين" value={data.workouts.length} />
        <PreviewStat label="وجبات" value={data.meals.length} />
        <PreviewStat label="مكملات" value={data.supplements.length} />
        <PreviewStat label="قياسات" value={data.metrics.length} />
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
