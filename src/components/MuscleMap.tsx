import { useState } from 'react'
import { cn } from '@/lib/cn'
import { muscleLabelAr } from '@/data/muscleGroups'
import type { MuscleCoverage, MuscleId, MuscleStatus, MuscleView } from '@/types/muscles'

// خريطة العضلات — رسم SVG محلي (بلا اعتماد على صور خارجية).
// جسم منمّق بمناطق عضلية مسمّاة، تُلوّن حسب الحالة والشدّة.

interface MuscleMapProps {
  coverage: Record<string, MuscleCoverage>
  /** عند النقر على عضلة. */
  onSelect?: (id: MuscleId) => void
  className?: string
}

/** ألوان الحالات (متوافقة مع لوحة الثيم). */
const STATUS_COLOR: Record<MuscleStatus, string> = {
  fresh: '#F26A21', // برتقالي — تُمرّنت للتو
  trained: '#3E9E6B', // أخضر — كافية
  recovering: '#E0941F', // كهرماني — تتعافى
  ready: '#3E9E6B', // أخضر — جاهزة
  undertrained: '#D6553A', // أحمر — ناقصة
}

const EMPTY_FILL = '#EADDC8' // لون الخطوط — لم تُمرّن

const STATUS_LABEL: Record<MuscleStatus, string> = {
  fresh: 'تُمرّنت حديثًا',
  trained: 'مكتملة',
  recovering: 'تحتاج راحة',
  ready: 'جاهزة',
  undertrained: 'ناقصة',
}

/** يحسب لون العضلة وشفافيتها من تغطيتها. */
function fillFor(coverage: Record<string, MuscleCoverage>, id: MuscleId): { fill: string; opacity: number } {
  const c = coverage[id]
  if (!c || c.sets <= 0) return { fill: EMPTY_FILL, opacity: 1 }
  const base = STATUS_COLOR[c.status]
  // الشدّة تتحكّم بالعتامة (0.4 → 1) لتبدو العضلات الأكثر تمرينًا أوضح
  const opacity = 0.45 + Math.min(0.55, c.intensity * 0.55)
  return { fill: base, opacity }
}

export function MuscleMap({ coverage, onSelect, className }: MuscleMapProps) {
  const [view, setView] = useState<MuscleView>('front')

  // عنصر منطقة عضلية قابل لإعادة الاستخدام
  const Region = ({ id, d, cx, cy, rx, ry }: { id: MuscleId; d?: string; cx?: number | string; cy?: number | string; rx?: number | string; ry?: number | string }) => {
    const { fill, opacity } = fillFor(coverage, id)
    const c = coverage[id]
    const sets = c ? c.sets : 0
    const status = c?.status ?? 'undertrained'
    const title = `${muscleLabelAr(id)} — ${STATUS_LABEL[status]} (${sets} مجموعة)`
    const common = {
      fill,
      fillOpacity: opacity,
      stroke: '#2B2520',
      strokeOpacity: 0.12,
      strokeWidth: 1,
      className: cn('cursor-pointer transition-[fill-opacity] duration-300', onSelect && 'hover:stroke-[#2B2520]'),
      onClick: () => onSelect?.(id),
      role: 'button' as const,
      'aria-label': title,
    }
    return d ? (
      <path d={d} {...common}>
        <title>{title}</title>
      </path>
    ) : (
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} {...common}>
        <title>{title}</title>
      </ellipse>
    )
  }

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* مبدّل الأمام/الخلف */}
      <div className="mb-4 inline-flex rounded-full border border-line bg-surface p-1">
        {(['front', 'back'] as MuscleView[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-bold transition-colors',
              view === v ? 'bg-primary text-white' : 'text-ink-500 hover:text-ink-900',
            )}
          >
            {v === 'front' ? 'أمامي' : 'خلفي'}
          </button>
        ))}
      </div>

      <svg viewBox="0 0 240 440" className="h-auto w-full max-w-[260px]" role="img" aria-label={`خريطة العضلات — العرض ${view === 'front' ? 'الأمامي' : 'الخلفي'}`}>
        {/* الرأس (محايد) */}
        <ellipse cx="120" cy="34" rx="20" ry="24" fill={EMPTY_FILL} stroke="#2B2520" strokeOpacity="0.12" />
        <rect x="112" y="56" width="16" height="14" rx="6" fill={EMPTY_FILL} stroke="#2B2520" strokeOpacity="0.12" />

        {view === 'front' ? (
          <g>
            {/* الأكتاف الأمامية + الجانبية */}
            <Region id="side_delts" cx="66" cy="88" rx="18" ry="16" />
            <Region id="side_delts" cx="174" cy="88" rx="18" ry="16" />
            <Region id="front_delts" cx="84" cy="84" rx="13" ry="13" />
            <Region id="front_delts" cx="156" cy="84" rx="13" ry="13" />

            {/* الصدر: علوي / أوسط / سفلي */}
            <Region id="chest_upper" d="M92 80 H148 a8 8 0 0 1 8 8 v6 H84 v-6 a8 8 0 0 1 8 -8 Z" />
            <Region id="chest_mid" d="M84 96 H156 v18 a18 18 0 0 1 -18 14 H102 a18 18 0 0 1 -18 -14 Z" />
            <Region id="chest_lower" d="M96 130 H144 v8 a14 14 0 0 1 -14 12 h-20 a14 14 0 0 1 -14 -12 Z" />

            {/* الذراع الأمامي: بايسبس + ساعد */}
            <Region id="biceps" cx="60" cy="128" rx="13" ry="26" />
            <Region id="biceps" cx="180" cy="128" rx="13" ry="26" />
            <Region id="forearms" cx="52" cy="180" rx="11" ry="28" />
            <Region id="forearms" cx="188" cy="180" rx="11" ry="28" />

            {/* البطن + الجوانب */}
            <Region id="abs" d="M104 134 H136 v60 a16 16 0 0 1 -16 14 a16 16 0 0 1 -16 -14 Z" />
            <Region id="obliques" cx="96" cy="172" rx="9" ry="30" />
            <Region id="obliques" cx="144" cy="172" rx="9" ry="30" />

            {/* الأرجل: كوادز + سمانة */}
            <Region id="quads" cx="102" cy="276" rx="20" ry="52" />
            <Region id="quads" cx="138" cy="276" rx="20" ry="52" />
            <Region id="calves" cx="102" cy="372" rx="14" ry="42" />
            <Region id="calves" cx="138" cy="372" rx="14" ry="42" />
          </g>
        ) : (
          <g>
            {/* الترابيس + الكتف الخلفي */}
            <Region id="traps" d="M96 74 H144 l-10 22 H106 Z" />
            <Region id="rear_delts" cx="68" cy="90" rx="17" ry="15" />
            <Region id="rear_delts" cx="172" cy="90" rx="17" ry="15" />

            {/* الظهر العلوي + اللاتس */}
            <Region id="upper_back" d="M92 96 H148 v20 H92 Z" />
            <Region id="lats" d="M88 118 H120 v44 l-20 -6 a16 16 0 0 1 -12 -16 Z" />
            <Region id="lats" d="M152 118 H120 v44 l20 -6 a16 16 0 0 0 12 -16 Z" />

            {/* أسفل الظهر */}
            <Region id="lower_back" d="M104 164 H136 v26 a16 16 0 0 1 -16 8 a16 16 0 0 1 -16 -8 Z" />

            {/* الترايسبس + الساعد (خلفي) */}
            <Region id="triceps" cx="60" cy="128" rx="13" ry="26" />
            <Region id="triceps" cx="180" cy="128" rx="13" ry="26" />
            <Region id="forearms" cx="52" cy="180" rx="11" ry="28" />
            <Region id="forearms" cx="188" cy="180" rx="11" ry="28" />

            {/* المؤخرة + خلفية الفخذ + السمانة */}
            <Region id="glutes" cx="104" cy="212" rx="20" ry="20" />
            <Region id="glutes" cx="136" cy="212" rx="20" ry="20" />
            <Region id="hamstrings" cx="102" cy="276" rx="19" ry="48" />
            <Region id="hamstrings" cx="138" cy="276" rx="19" ry="48" />
            <Region id="calves" cx="102" cy="372" rx="14" ry="42" />
            <Region id="calves" cx="138" cy="372" rx="14" ry="42" />
          </g>
        )}
      </svg>

      {/* وسيلة الإيضاح */}
      <ul className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px]">
        {([
          { status: 'fresh', label: STATUS_LABEL.fresh },
          { status: 'recovering', label: STATUS_LABEL.recovering },
          { status: 'ready', label: STATUS_LABEL.ready },
          { status: 'undertrained', label: STATUS_LABEL.undertrained },
        ] as { status: MuscleStatus; label: string }[]).map((it) => (
          <li key={it.status} className="flex items-center gap-1.5 text-ink-500">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: STATUS_COLOR[it.status] }} />
            {it.label}
          </li>
        ))}
        <li className="flex items-center gap-1.5 text-ink-500">
          <span className="inline-block h-3 w-3 rounded-full border border-line" style={{ backgroundColor: EMPTY_FILL }} />
          لم تُمرّن
        </li>
      </ul>
    </div>
  )
}
