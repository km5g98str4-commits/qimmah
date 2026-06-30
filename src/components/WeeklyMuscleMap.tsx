import { useMemo, useState } from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import { muscleGroups, muscleLabelAr } from '@/data/muscleGroups'
import { computeWeeklyCoverage } from '@/lib/muscleCoverage'
import { loadSessions } from '@/lib/workoutSessions'
import { useCustomization } from '@/lib/customizationContext'
import type { MuscleCoverage, MuscleId, MuscleView } from '@/types/muscles'

// خريطة العضلات الأسبوعية — جسم SVG أمامي/خلفي، كل عضلة دُرّبت هذا الأسبوع «تُضيء»
// بدرجة برتقالية حسب شدّة تغطيتها؛ غير المُدرّبة تبقى محايدة (تشجيع بلا أحكام).
// تقرأ من محرّك التغطية القائم (computeWeeklyCoverage) دون أي تعديل عليه.

// ===== أشكال الرسم =====
type Shape =
  | { k: 'e'; cx: number; cy: number; rx: number; ry: number }
  | { k: 'r'; x: number; y: number; w: number; h: number; r: number }
  | { k: 'p'; d: string }

const ell = (cx: number, cy: number, rx: number, ry: number): Shape => ({ k: 'e', cx, cy, rx, ry })
const rct = (x: number, y: number, w: number, h: number, r = 6): Shape => ({ k: 'r', x, y, w, h, r })
const pth = (d: string): Shape => ({ k: 'p', d })

/** يعكس شكلًا أفقيًا حول منتصف اللوحة (x=100) لتوليد الجانب المقابل. */
function mirror(s: Shape): Shape {
  if (s.k === 'e') return { ...s, cx: 200 - s.cx }
  if (s.k === 'r') return { ...s, x: 200 - s.x - s.w }
  return s
}
/** عضلة مزدوجة (يسار + يمين) من شكل الجانب الأيسر. */
const pair = (s: Shape): Shape[] => [s, mirror(s)]

interface RegionDef {
  m: MuscleId
  shapes: Shape[]
}

// أجزاء محايدة (رأس/رقبة/حوض/يدين/قدمين) — تربط الجسم بصريًا وليست عضلات.
const FRONT_NEUTRAL: Shape[] = [
  ell(100, 24, 15, 17), // رأس
  rct(91, 37, 18, 12, 4), // رقبة
  rct(82, 153, 36, 18, 8), // حوض
  ...pair(ell(47, 178, 7, 7)), // يدان
  ...pair(ell(85, 344, 9, 6)), // قدمان
]
const BACK_NEUTRAL: Shape[] = [
  ell(100, 24, 15, 17),
  rct(91, 37, 18, 12, 4),
  rct(83, 150, 34, 16, 8),
  ...pair(ell(47, 178, 7, 7)),
  ...pair(ell(85, 350, 9, 6)),
]

const FRONT: RegionDef[] = [
  { m: 'side_delts', shapes: pair(ell(60, 66, 16, 14)) },
  { m: 'front_delts', shapes: pair(ell(76, 63, 11, 11)) },
  { m: 'chest_upper', shapes: pair(rct(74, 57, 24, 12, 5)) },
  { m: 'chest_mid', shapes: pair(rct(72, 71, 26, 18, 7)) },
  { m: 'chest_lower', shapes: pair(rct(76, 91, 22, 11, 5)) },
  { m: 'biceps', shapes: pair(ell(56, 104, 10, 22)) },
  { m: 'forearms', shapes: pair(ell(49, 150, 9, 24)) },
  { m: 'abs', shapes: [rct(88, 105, 24, 48, 8)] },
  { m: 'obliques', shapes: pair(ell(80, 132, 7, 22)) },
  { m: 'quads', shapes: pair(ell(85, 214, 17, 44)) },
  { m: 'calves', shapes: pair(ell(85, 302, 12, 38)) },
]

const BACK: RegionDef[] = [
  { m: 'traps', shapes: [pth('M100 48 L122 60 L112 74 L88 74 L78 60 Z')] },
  { m: 'rear_delts', shapes: pair(ell(60, 68, 15, 13)) },
  { m: 'upper_back', shapes: pair(rct(78, 74, 20, 16, 5)) },
  {
    m: 'lats',
    shapes: [pth('M78 92 L98 92 L93 126 L82 118 Z'), pth('M122 92 L102 92 L107 126 L118 118 Z')],
  },
  { m: 'lower_back', shapes: [rct(86, 126, 28, 20, 6)] },
  { m: 'triceps', shapes: pair(ell(56, 104, 10, 22)) },
  { m: 'forearms', shapes: pair(ell(49, 150, 9, 24)) },
  { m: 'glutes', shapes: pair(ell(88, 166, 15, 15)) },
  { m: 'hamstrings', shapes: pair(ell(85, 232, 16, 42)) },
  { m: 'calves', shapes: pair(ell(85, 312, 12, 38)) },
]

const NEUTRAL_FILL = '#ECE3D4'
const NEUTRAL_STROKE = 'rgba(43,37,32,0.10)'
const HEAT = '#F26A21'

function shapeEl(s: Shape, key: string, props: Record<string, unknown>) {
  if (s.k === 'e') return <ellipse key={key} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...props} />
  if (s.k === 'r') return <rect key={key} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} {...props} />
  return <path key={key} d={s.d} {...props} />
}

/** شدّة الإضاءة (0.28 → 0.92) أو لا شيء إن لم تُدرّب. */
function heatOpacity(c?: MuscleCoverage): number | null {
  if (!c || c.sets <= 0) return null
  return Math.min(0.92, 0.28 + c.intensity * 0.64)
}

function Region({
  def,
  coverage,
  selected,
  onSelect,
}: {
  def: RegionDef
  coverage: Record<string, MuscleCoverage>
  selected: boolean
  onSelect: (m: MuscleId) => void
}) {
  const c = coverage[def.m]
  const heat = heatOpacity(c)
  const label = muscleLabelAr(def.m)
  const sets = c?.sets ?? 0
  const title = heat !== null ? `${label} — ${sets} مجموعة هذا الأسبوع` : `${label} — لم تُسجّل بعد`
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={title}
      onClick={() => onSelect(def.m)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(def.m)}
      className="cursor-pointer outline-none"
    >
      <title>{title}</title>
      {/* الطبقة المحايدة (أساس العضلة) */}
      {def.shapes.map((s, i) => shapeEl(s, `b${i}`, { fill: NEUTRAL_FILL, stroke: NEUTRAL_STROKE, strokeWidth: 1 }))}
      {/* طبقة الإضاءة البرتقالية حسب الشدّة */}
      {heat !== null &&
        def.shapes.map((s, i) => shapeEl(s, `h${i}`, { fill: HEAT, fillOpacity: heat, stroke: 'none' }))}
      {/* تحديد العضلة المختارة */}
      {selected &&
        def.shapes.map((s, i) => shapeEl(s, `s${i}`, { fill: 'none', stroke: HEAT, strokeWidth: 2 }))}
    </g>
  )
}

export function WeeklyMuscleMap({ className }: { className?: string }) {
  const { customization } = useCustomization()
  const [view, setView] = useState<MuscleView>('front')
  const [selected, setSelected] = useState<MuscleId | null>(null)

  const coverage = useMemo(() => {
    const result = computeWeeklyCoverage({
      sessions: loadSessions(),
      plan: customization.workoutPlan,
      level: customization.profile.trainingLevel,
    })
    return result.weeklyCoverage
  }, [customization])

  const trainedCount = muscleGroups.filter((m) => (coverage[m.id]?.sets ?? 0) > 0).length
  const regions = view === 'front' ? FRONT : BACK
  const neutral = view === 'front' ? FRONT_NEUTRAL : BACK_NEUTRAL

  const sel = selected ? coverage[selected] : undefined
  const caption = selected
    ? sel && sel.sets > 0
      ? `${muscleLabelAr(selected)} · ${sel.sets} مجموعة هذا الأسبوع`
      : `${muscleLabelAr(selected)} · لم تُسجّل بعد — جرّب تضيفها`
    : trainedCount > 0
      ? `فعّلت ${trainedCount} من ${muscleGroups.length} عضلة هذا الأسبوع 💪`
      : 'ابدأ تمرينك وبتشوف عضلاتك تتلوّن هنا.'

  return (
    <div className={cn('card p-5', className)}>
      {/* العنوان + مبدّل الجهة */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary-c">
            <Icon name="Dumbbell" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-black text-ink-900">خريطة عضلاتك</p>
            <p className="text-[11px] font-bold text-ink-400">هذا الأسبوع</p>
          </div>
        </div>
        <div className="inline-flex rounded-full border border-line bg-page p-1">
          {(['front', 'back'] as MuscleView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setView(v)
                setSelected(null)
              }}
              aria-pressed={view === v}
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-bold transition-colors',
                view === v ? 'bg-primary text-white' : 'text-ink-500 hover:text-ink-900',
              )}
            >
              {v === 'front' ? 'أمامي' : 'خلفي'}
            </button>
          ))}
        </div>
      </div>

      {/* الجسم */}
      <div className="flex justify-center">
        <svg
          viewBox="0 0 200 365"
          className="h-auto w-full max-w-[230px]"
          role="img"
          aria-label={`خريطة العضلات — العرض ${view === 'front' ? 'الأمامي' : 'الخلفي'}، فعّلت ${trainedCount} عضلة هذا الأسبوع`}
        >
          {/* الأجزاء المحايدة */}
          {neutral.map((s, i) => shapeEl(s, `n${i}`, { fill: NEUTRAL_FILL, stroke: NEUTRAL_STROKE, strokeWidth: 1 }))}
          {/* العضلات */}
          {regions.map((def) => (
            <Region
              key={def.m}
              def={def}
              coverage={coverage}
              selected={selected === def.m}
              onSelect={(m) => setSelected((cur) => (cur === m ? null : m))}
            />
          ))}
        </svg>
      </div>

      {/* التعليق التحفيزي / تفاصيل العضلة المختارة */}
      <p className="mt-1 text-center text-xs font-bold text-ink-700">{caption}</p>

      {/* وسيلة الإيضاح */}
      <div className="mt-4 flex items-center justify-center gap-4 border-t border-line pt-3 text-[11px] text-ink-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 rounded-full" style={{ background: `linear-gradient(90deg, ${HEAT}55, ${HEAT})` }} />
          درّبتها (الأغمق أكثر)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: NEUTRAL_FILL, border: '1px solid rgba(43,37,32,0.12)' }} />
          لم تُدرّب
        </span>
      </div>
    </div>
  )
}
