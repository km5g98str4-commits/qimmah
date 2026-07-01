import { useMemo, useState } from 'react'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import { progressScreenStrings } from '@/i18n/dict/progressScreen'
import type { Lang } from '@/lib/appPreferences'
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
const SKIN_STROKE = 'rgba(43,37,32,0.18)'
const MUSCLE_FILL = '#D8C3A4'
const MUSCLE_STROKE = 'rgba(43,37,32,0.16)'
const HEAT = '#F26A21'
const GARMENT_FILL = '#3B4A63'
const GARMENT_STROKE = 'rgba(20,28,44,0.7)'

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
  lang,
}: {
  def: BodyRegion
  coverage: Record<string, MuscleCoverage>
  selected: boolean
  onSelect: (m: MuscleId) => void
  lang: Lang
}) {
  const d = progressScreenStrings[lang]
  const c = coverage[def.m]
  const heat = heatOpacity(c)
  const label = muscleLabelAr(def.m)
  const sets = c?.sets ?? 0
  const title = heat !== null ? `${label} — ${sets} ${d.setsThisWeekSuffix}` : `${label} — ${d.notLoggedYet}`
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
        def.d.map((d, i) => (
          <path
            key={`h${i}`}
            d={d}
            fill={HEAT}
            fillOpacity={heat}
            stroke="none"
            className="transition-[fill-opacity] duration-500 ease-out motion-reduce:transition-none"
          />
        ))}
      {/* تحديد العضلة المختارة */}
      {selected &&
        def.d.map((d, i) => (
          <path key={`s${i}`} d={d} fill="none" stroke={HEAT} strokeWidth={2} strokeLinejoin="round" />
        ))}
    </g>
  )
}

export function WeeklyMuscleMap({ className, lang }: { className?: string; lang: Lang }) {
  const d = progressScreenStrings[lang]
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
      ? `${muscleLabelAr(selected)} · ${sel.sets} ${d.setsThisWeekSuffix}`
      : `${muscleLabelAr(selected)} · ${d.selectedNotLoggedSuffix}`
    : trainedCount > 0
      ? `${d.activatedPrefix} ${trainedCount} ${d.activatedMiddle} ${muscleGroups.length} ${d.activatedSuffix}`
      : d.emptyCaption

  const genderLabel = gender === 'female' ? d.mapGenderFemale : gender === 'male' ? d.mapGenderMale : d.mapGenderNeutral

  return (
    <div className={cn('card p-5', className)}>
      {/* العنوان + مبدّل الجهة */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary-c">
            <Icon name="Dumbbell" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-black text-ink-900">{d.mapTitle}</p>
            <p className="text-[11px] font-bold text-ink-400">{d.thisWeekWord} · {genderLabel}</p>
          </div>
        </div>
        <div className="inline-flex rounded-full border border-line bg-page p-1" role="group" aria-label={d.bodyViewGroupAria}>
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
                'rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95 motion-reduce:transition-none',
                view === v ? 'bg-primary text-white shadow-soft' : 'text-ink-500 hover:text-ink-900',
              )}
            >
              {v === 'front' ? d.viewFront : d.viewBack}
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
          aria-label={`${d.mapImgAriaPrefix} ${genderLabel}, ${d.mapImgAriaView} ${view === 'front' ? d.mapImgAriaFront : d.mapImgAriaBack}, ${d.activatedPrefix} ${trainedCount} ${d.mapImgAriaSuffix}`}
        >
          <defs>
            {/* توهّج خلفيّ دافئ خلف الجسم لعمق بصري */}
            <radialGradient id="mm-glow" cx="50%" cy="32%" r="62%">
              <stop offset="0%" stopColor={HEAT} stopOpacity={0.12} />
              <stop offset="70%" stopColor={HEAT} stopOpacity={0} />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="220" height="470" fill="url(#mm-glow)" aria-hidden />
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
              lang={lang}
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
          {d.legendTrained}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: MUSCLE_FILL, border: '1px solid rgba(43,37,32,0.18)' }} />
          {d.legendUntrained}
        </span>
      </div>
    </div>
  )
}
