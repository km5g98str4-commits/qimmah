import { useMemo, useState } from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import { muscleGroups, muscleLabelAr } from '@/data/muscleGroups'
import { computeWeeklyCoverage } from '@/lib/muscleCoverage'
import { loadSessions } from '@/lib/workoutSessions'
import { useCustomization } from '@/lib/customizationContext'
import {
  buildBackRegions,
  buildClothing,
  buildFrontRegions,
  buildSilhouette,
  type BodyRegion,
} from '@/data/bodyAnatomy'
import type { MuscleCoverage, MuscleId, MuscleView } from '@/types/muscles'

// خريطة العضلات الأسبوعية — جسم بشري تشريحي (أمامي/خلفي) مرسوم بـ SVG.
// واعٍ بالجنس: ذكر بمظهر عضلي، أنثى بلباس رياضي محتشم وساتر تمامًا.
// كل عضلة دُرّبت هذا الأسبوع «تُضيء» بدرجة برتقالية حسب شدّة تغطيتها؛
// غير المُدرّبة تبقى محايدة (تشجيع بلا أحكام). الأشكال من data/bodyAnatomy.

const SKIN_FILL = '#E9D9C4'
const SKIN_STROKE = 'rgba(43,37,32,0.16)'
const MUSCLE_FILL = '#DBC7AC'
const MUSCLE_STROKE = 'rgba(43,37,32,0.14)'
const HEAT = '#F26A21'
const GARMENT_FILL = '#3E6B8C'
const GARMENT_STROKE = 'rgba(31,54,70,0.55)'

/** شدّة الإضاءة (0.30 → 0.92) أو لا شيء إن لم تُدرّب. */
function heatOpacity(c?: MuscleCoverage): number | null {
  if (!c || c.sets <= 0) return null
  return Math.min(0.92, 0.3 + c.intensity * 0.62)
}

function Region({
  def,
  coverage,
  selected,
  onSelect,
}: {
  def: BodyRegion
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
      {/* الطبقة المحايدة (نسيج العضلة) */}
      {def.d.map((d, i) => (
        <path key={`b${i}`} d={d} fill={MUSCLE_FILL} stroke={MUSCLE_STROKE} strokeWidth={1} />
      ))}
      {/* طبقة الإضاءة البرتقالية حسب الشدّة */}
      {heat !== null &&
        def.d.map((d, i) => <path key={`h${i}`} d={d} fill={HEAT} fillOpacity={heat} stroke="none" />)}
      {/* تحديد العضلة المختارة */}
      {selected &&
        def.d.map((d, i) => (
          <path key={`s${i}`} d={d} fill="none" stroke={HEAT} strokeWidth={2} strokeLinejoin="round" />
        ))}
    </g>
  )
}

export function WeeklyMuscleMap({ className }: { className?: string }) {
  const { customization } = useCustomization()
  const [view, setView] = useState<MuscleView>('front')
  const [selected, setSelected] = useState<MuscleId | null>(null)

  const gender = customization.profile.gender

  const coverage = useMemo(() => {
    const result = computeWeeklyCoverage({
      sessions: loadSessions(),
      plan: customization.workoutPlan,
      level: customization.profile.trainingLevel,
    })
    return result.weeklyCoverage
  }, [customization])

  const silhouette = useMemo(() => buildSilhouette(gender, view), [gender, view])
  const clothing = useMemo(() => buildClothing(gender, view), [gender, view])
  const regions = useMemo(
    () => (view === 'front' ? buildFrontRegions(gender) : buildBackRegions(gender)),
    [gender, view],
  )

  const trainedCount = muscleGroups.filter((m) => (coverage[m.id]?.sets ?? 0) > 0).length

  const sel = selected ? coverage[selected] : undefined
  const caption = selected
    ? sel && sel.sets > 0
      ? `${muscleLabelAr(selected)} · ${sel.sets} مجموعة هذا الأسبوع`
      : `${muscleLabelAr(selected)} · لم تُسجّل بعد — جرّب تضيفها`
    : trainedCount > 0
      ? `فعّلت ${trainedCount} من ${muscleGroups.length} عضلة هذا الأسبوع 💪`
      : 'ابدأ تمرينك وبتشوف عضلاتك تتلوّن هنا.'

  const genderLabel = gender === 'female' ? 'أنثى' : gender === 'male' ? 'ذكر' : 'محايد'

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
            <p className="text-[11px] font-bold text-ink-400">هذا الأسبوع · {genderLabel}</p>
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

      {/* الجسم التشريحي */}
      <div className="flex justify-center">
        <svg
          viewBox="0 0 220 470"
          className="h-auto w-full max-w-[240px]"
          role="img"
          aria-label={`خريطة العضلات — جسم ${genderLabel}، العرض ${view === 'front' ? 'الأمامي' : 'الخلفي'}، فعّلت ${trainedCount} عضلة هذا الأسبوع`}
        >
          {/* الهيكل الجلدي المحايد (حدود الجسم) */}
          {silhouette.map((d, i) => (
            <path key={`sk${i}`} d={d} fill={SKIN_FILL} stroke={SKIN_STROKE} strokeWidth={1.2} strokeLinejoin="round" />
          ))}
          {/* العضلات القابلة للاختيار */}
          {regions.map((def) => (
            <Region
              key={def.m}
              def={def}
              coverage={coverage}
              selected={selected === def.m}
              onSelect={(m) => setSelected((cur) => (cur === m ? null : m))}
            />
          ))}
          {/* طبقة اللباس الرياضي المحتشم (فوق العضلات، شفّافة جزئيًا) */}
          {clothing.map((g, i) => (
            <path
              key={`cl${i}`}
              d={g.d}
              fill={GARMENT_FILL}
              fillOpacity={g.opacity}
              stroke={GARMENT_STROKE}
              strokeWidth={1.4}
              strokeLinejoin="round"
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
          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: MUSCLE_FILL, border: '1px solid rgba(43,37,32,0.18)' }} />
          لم تُدرّب
        </span>
      </div>
    </div>
  )
}
