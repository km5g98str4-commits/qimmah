import { cn } from '@/lib/cn'
import { Icon } from '@/components/Icon'
import { muscleLabelAr, getMuscle } from '@/data/muscleGroups'
import type { MuscleCoverage, MuscleId, MuscleStatus } from '@/types/muscles'

// تغطية العضلات — بطاقات مجموعات احترافية (بديل خريطة الجسم القديمة).
// كل بطاقة تمثّل مجموعة عضلية: الحالة، الحجم مقابل الهدف، رقائق العضلات، والإجراء المقترح.

interface MuscleMapProps {
  coverage: Record<string, MuscleCoverage>
  className?: string
}

interface GroupDef {
  key: string
  nameAr: string
  icon: string
  muscles: MuscleId[]
}

/** المجموعات العضلية وعضلاتها — مصدر تجميع البطاقات. */
const GROUPS: GroupDef[] = [
  { key: 'chest', nameAr: 'الصدر', icon: 'Flame', muscles: ['chest_upper', 'chest_mid', 'chest_lower'] },
  { key: 'back', nameAr: 'الظهر', icon: 'Layers', muscles: ['lats', 'upper_back', 'traps', 'lower_back'] },
  { key: 'shoulders', nameAr: 'الأكتاف', icon: 'Activity', muscles: ['front_delts', 'side_delts', 'rear_delts'] },
  { key: 'arms', nameAr: 'الذراع', icon: 'Dumbbell', muscles: ['biceps', 'triceps', 'forearms'] },
  { key: 'legs', nameAr: 'الأرجل', icon: 'TrendingUp', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
  { key: 'core', nameAr: 'الكور', icon: 'Target', muscles: ['abs', 'obliques'] },
]

/** نمط كل حالة: التسمية، ألوان الشارة، الشريط، النقطة، والإجراء المقترح. */
const STATUS_STYLE: Record<MuscleStatus, { label: string; badge: string; bar: string; dot: string; action: string }> = {
  trained: {
    label: 'مكتملة',
    badge: 'bg-success/12 text-success',
    bar: 'bg-success',
    dot: 'bg-success',
    action: 'تغطية ممتازة — حافظ على نفس المستوى.',
  },
  fresh: {
    label: 'تمرنت حديثًا',
    badge: 'bg-brand-500/12 text-brand-600',
    bar: 'bg-brand-500',
    dot: 'bg-brand-500',
    action: 'تمرنت للتو — خلها ترتاح اليوم.',
  },
  recovering: {
    label: 'تحتاج راحة',
    badge: 'bg-gold-400/15 text-gold-600',
    bar: 'bg-gold-400',
    dot: 'bg-gold-400',
    action: 'في طور التعافي — تجنّب إجهادها اليوم.',
  },
  ready: {
    label: 'جاهزة',
    badge: 'bg-success/10 text-success',
    bar: 'bg-success/70',
    dot: 'bg-success/70',
    action: 'تعافت وجاهزة — تقدر تضيف لها مجموعات اليوم.',
  },
  undertrained: {
    label: 'ناقصة',
    badge: 'bg-ink-400/12 text-ink-500',
    bar: 'bg-ink-400/60',
    dot: 'bg-line',
    action: 'أضف لها تمرينًا لتكمل تغطيتها هذا الأسبوع.',
  },
}

interface GroupView {
  def: GroupDef
  totalSets: number
  targetMin: number
  targetMax: number
  status: MuscleStatus
  members: { id: MuscleId; status: MuscleStatus; sets: number }[]
}

/** يحسب حالة المجموعة من حجمها مقابل الهدف وحالة عضلاتها. */
function groupStatus(totalSets: number, targetMin: number, members: GroupView['members']): MuscleStatus {
  if (totalSets <= 0) return 'undertrained'
  const anyFresh = members.some((m) => m.status === 'fresh')
  const anyRecovering = members.some((m) => m.status === 'recovering')
  if (anyFresh) return 'fresh'
  if (anyRecovering) return 'recovering'
  if (totalSets >= targetMin) return 'trained'
  return 'ready'
}

/** يبني بيانات عرض كل مجموعة من التغطية. */
function buildGroups(coverage: Record<string, MuscleCoverage>): GroupView[] {
  return GROUPS.map((def) => {
    const members = def.muscles.map((id) => {
      const c = coverage[id]
      return { id, status: c?.status ?? 'undertrained', sets: c?.sets ?? 0 }
    })
    const totalSets = Math.round(members.reduce((s, m) => s + m.sets, 0) * 10) / 10
    const targetMin = def.muscles.reduce((s, id) => s + (getMuscle(id)?.weeklyTarget.min ?? 0), 0)
    const targetMax = def.muscles.reduce((s, id) => s + (getMuscle(id)?.weeklyTarget.max ?? 0), 0)
    return { def, totalSets, targetMin, targetMax, status: groupStatus(totalSets, targetMin, members), members }
  })
}

export function MuscleMap({ coverage, className }: MuscleMapProps) {
  const groups = buildGroups(coverage)
  const hasData = groups.some((g) => g.totalSets > 0)

  // حالة البداية: لا توجد بيانات بعد — لا نُظهر ٦ بطاقات «ناقصة» مخيفة.
  if (!hasData) {
    return (
      <div className={cn('card flex flex-col items-center justify-center gap-3 p-8 text-center', className)}>
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary-c">
          <Icon name="Dumbbell" className="h-6 w-6" />
        </span>
        <p className="max-w-sm text-sm font-bold leading-relaxed text-ink-900">
          ابدأ أول تمرينك، وبعدها بنعرض لك توزيع عضلاتك خلال الأسبوع.
        </p>
        <p className="text-xs text-ink-400">مجموعاتك وتغطيتك تظهر هنا تلقائيًا بعد كل جلسة.</p>
      </div>
    )
  }

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      {groups.map((g) => (
        <GroupCard key={g.def.key} group={g} />
      ))}
    </div>
  )
}

function GroupCard({ group }: { group: GroupView }) {
  const style = STATUS_STYLE[group.status]
  const pct = group.targetMax > 0 ? Math.min(100, Math.round((group.totalSets / group.targetMax) * 100)) : 0
  // موضع علامة الحد الأدنى للهدف على الشريط
  const minMark = group.targetMax > 0 ? Math.min(100, Math.round((group.targetMin / group.targetMax) * 100)) : 0
  const setsLabel = Number.isInteger(group.totalSets) ? `${group.totalSets}` : group.totalSets.toFixed(1)

  return (
    <div className="card flex flex-col gap-3 p-4">
      {/* الترويسة: الاسم + الشارة */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-soft text-primary-c">
            <Icon name={group.def.icon} className="h-4 w-4" />
          </span>
          <h4 className="text-sm font-extrabold text-ink-900">{group.def.nameAr}</h4>
        </div>
        <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold', style.badge)}>{style.label}</span>
      </div>

      {/* شريط التقدّم + علامة الهدف الأدنى */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-beige">
        <div className={cn('h-full rounded-full transition-[width] duration-500', style.bar)} style={{ width: `${pct}%` }} />
        {minMark > 0 && minMark < 100 && (
          <span
            className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-ink-400/40"
            style={{ insetInlineStart: `${minMark}%` }}
            aria-hidden
          />
        )}
      </div>

      {/* المجموعات مقابل الهدف */}
      <p className="text-xs text-ink-500">
        <span className="font-extrabold text-ink-900">{setsLabel}</span> مجموعة · الهدف {group.targetMin}–{group.targetMax}
      </p>

      {/* رقائق العضلات داخل المجموعة */}
      <div className="flex flex-wrap gap-1.5">
        {group.members.map((m) => (
          <span
            key={m.id}
            className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-medium text-ink-700"
            title={`${muscleLabelAr(m.id)} — ${STATUS_STYLE[m.status].label} (${m.sets} مجموعة)`}
          >
            <span className={cn('inline-block h-1.5 w-1.5 rounded-full', STATUS_STYLE[m.status].dot)} aria-hidden />
            {muscleLabelAr(m.id)}
          </span>
        ))}
      </div>

      {/* الإجراء المقترح */}
      <p className="mt-auto flex items-start gap-1.5 border-t border-line pt-2.5 text-[11px] leading-relaxed text-ink-500">
        <Icon name="ChevronLeft" className="mt-0.5 h-3.5 w-3.5 shrink-0 rotate-180 text-primary-c" />
        {style.action}
      </p>
    </div>
  )
}
