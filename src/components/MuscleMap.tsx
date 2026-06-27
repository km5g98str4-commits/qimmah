import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import { muscleLabelAr } from '@/data/muscleGroups'
import { computeGroups, type GroupResult } from '@/lib/muscleGroupCoverage'
import type { MuscleCoverage, MuscleStatus } from '@/types/muscles'
import type { TrainingLevel } from '@/types/profile'

// شبكة تغطية العضلات — بطاقات مجموعات عضلية مدمجة (بديل خريطة الجسم الطفولية).
// تعرض الحالة الأسبوعية لكل مجموعة: شارة + شريط تقدّم + رقائق العضلات + التوصية.

interface StatusMeta {
  label: string
  color: string
  fill: 'solid' | 'soft'
}

const STATUS_META: Record<MuscleStatus, StatusMeta> = {
  trained: { label: 'مكتملة', color: '#1F9D57', fill: 'solid' },
  ready: { label: 'جاهزة', color: '#3E9E6B', fill: 'soft' },
  recovering: { label: 'تحتاج راحة', color: '#E0941F', fill: 'soft' },
  fresh: { label: 'تمرنت حديثًا', color: '#F26A21', fill: 'soft' },
  undertrained: { label: 'ناقصة', color: '#D6553A', fill: 'soft' },
}

const EMPTY_DOT = '#C9B89B'

interface MuscleCoverageGridProps {
  coverage: Record<string, MuscleCoverage>
  level?: TrainingLevel
  className?: string
}

/** شبكة بطاقات المجموعات العضلية. */
export function MuscleCoverageGrid({ coverage, level = 'intermediate', className }: MuscleCoverageGridProps) {
  const groups = computeGroups(coverage, level)
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {groups.map((g) => (
        <GroupCard key={g.def.name} group={g} coverage={coverage} />
      ))}
    </div>
  )
}

function GroupCard({ group, coverage }: { group: GroupResult; coverage: Record<string, MuscleCoverage> }) {
  const meta = STATUS_META[group.status]
  const pct = group.target > 0 ? Math.min(100, Math.round((group.sets / group.target) * 100)) : 0

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-shadow hover:shadow-soft">
      {/* شريط لوني جانبي حسب الحالة */}
      <span className="absolute inset-y-0 end-0 w-1.5" style={{ backgroundColor: meta.color }} aria-hidden />

      <div className="p-4 pe-5">
        {/* الترويسة: اسم المجموعة + الشارة */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-black text-ink-900">{group.def.name}</h3>
          <StatusBadge meta={meta} />
        </div>

        {/* التقدّم: مجموعات منجزة مقابل الهدف */}
        <div className="mt-3 flex items-baseline justify-between text-xs">
          <span className="font-bold text-ink-700">
            <span className="text-lg font-black text-ink-900">{group.sets}</span>
            <span className="text-ink-400"> / {group.target} مجموعة</span>
          </span>
          <span className="font-black tabular-nums" style={{ color: meta.color }}>{pct}%</span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-beige">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
        </div>

        {/* رقائق العضلات */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {group.def.muscles.map((m) => {
            const c = coverage[m]
            const st = c?.status ?? 'undertrained'
            const dot = (c?.sets ?? 0) > 0 ? STATUS_META[st].color : EMPTY_DOT
            return (
              <span key={m} className="inline-flex items-center gap-1 rounded-full border border-line bg-page px-2 py-0.5 text-[10px] font-bold text-ink-700">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dot }} aria-hidden />
                {muscleLabelAr(m)}
              </span>
            )
          })}
        </div>

        {/* التوصية */}
        <p className="mt-3 flex items-start gap-1.5 border-t border-line pt-2.5 text-[11px] leading-relaxed text-ink-500">
          <span className="mt-0.5 shrink-0" style={{ color: meta.color }}>
            <Icon name="ChevronLeft" className="h-3.5 w-3.5 rotate-180" />
          </span>
          {group.recommendation}
        </p>
      </div>
    </div>
  )
}

function StatusBadge({ meta }: { meta: StatusMeta }) {
  if (meta.fill === 'solid') {
    return (
      <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black text-white" style={{ backgroundColor: meta.color }}>
        {meta.label}
      </span>
    )
  }
  return (
    <span
      className="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black"
      style={{ color: meta.color, backgroundColor: `${meta.color}1A`, borderColor: `${meta.color}40` }}
    >
      {meta.label}
    </span>
  )
}
