import { useMemo, useState } from 'react'
import { cn } from '@/lib/cn'
import { muscleGroups, muscleLabelAr } from '@/data/muscleGroups'
import {
  BACK_REGIONS,
  FRONT_REGIONS,
  buildClothing,
  buildSilhouette,
  type BodyRegion,
} from '@/data/bodyAnatomy'
import type { Gender } from '@/types/profile'
import type { MuscleCoverage, MuscleId, MuscleView } from '@/types/muscles'
import type { Lang } from '@/lib/appPreferences'
import { bodyModelStrings } from '@/i18n/dict/bodyModel'

// خريطة العضلات الأسبوعية (العرض المسطّح) — جسم بشري تشريحي أمامي/خلفي بـ SVG.
// واعٍ بالجنس: ذكر بمظهر عضلي، أنثى بلباس رياضي محتشم وساتر تمامًا.
// كل عضلة دُرّبت هذا الأسبوع «تُضيء» بدرجة برتقالية حسب شدّة تغطيتها؛
// غير المُدرّبة تبقى محايدة (تشجيع بلا أحكام). الأشكال من data/bodyAnatomy.
//
// يُستخدم كبديل خفيف للمجسّم ثلاثي الأبعاد (components/BodyModel3D) على
// الأجهزة الضعيفة أو لمن يفضّل عرضًا ثابتًا.

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

interface FlatMuscleBodyProps {
  lang: Lang
  coverage: Record<string, MuscleCoverage>
  gender: Gender
  selected: MuscleId | null
  onSelect: (m: MuscleId | null) => void
  className?: string
}

/**
 * الجسم المسطّح (SVG) بمبدّل أمامي/خلفي — مكوّن عرض خالص يستقبل التغطية جاهزة.
 * يُستخدم داخل بطاقة المجسّم ثلاثي الأبعاد كوضع «مسطّح»، وداخل البطاقة الكاملة أدناه.
 */
export function FlatMuscleBody({ lang, coverage, gender, selected, onSelect, className }: FlatMuscleBodyProps) {
  const s = bodyModelStrings[lang]
  const [view, setView] = useState<MuscleView>('front')

  const silhouette = useMemo(() => buildSilhouette(gender, view), [gender, view])
  const clothing = useMemo(() => buildClothing(gender, view), [gender, view])
  const regions = view === 'front' ? FRONT_REGIONS : BACK_REGIONS

  const trainedCount = muscleGroups.filter((m) => (coverage[m.id]?.sets ?? 0) > 0).length
  const genderLabel = gender === 'female' ? s.genderFemale : gender === 'male' ? s.genderMale : s.genderNeutral

  return (
    <div className={className}>
      {/* مبدّل الجهة */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-line bg-page p-1">
          {(['front', 'back'] as MuscleView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setView(v)
                onSelect(null)
              }}
              aria-pressed={view === v}
              className={cn(
                'min-h-[32px] rounded-full px-3 py-1 text-[11px] font-bold transition-colors',
                view === v ? 'bg-primary text-white' : 'text-ink-500 hover:text-ink-900',
              )}
            >
              {v === 'front' ? s.angleFront : s.angleBack}
            </button>
          ))}
        </div>
      </div>

      {/* الجسم التشريحي */}
      <div className="mt-2 flex justify-center">
        <svg
          viewBox="0 0 220 470"
          className="h-auto w-full max-w-[240px]"
          role="img"
          aria-label={s.mapAriaLabel(genderLabel, view === 'front' ? s.viewFrontLabel : s.viewBackLabel, trainedCount)}
        >
          {/* الهيكل الجلدي المحايد (حدود الجسم) */}
          {silhouette.map((d, i) => (
            <path
              key={`sk${i}`}
              d={d}
              fill={SKIN_FILL}
              stroke={SKIN_STROKE}
              strokeWidth={1.2}
              strokeLinejoin="round"
            />
          ))}
          {/* العضلات القابلة للاختيار */}
          {regions.map((def) => (
            <Region
              key={def.m}
              def={def}
              coverage={coverage}
              selected={selected === def.m}
              onSelect={(m) => onSelect(selected === m ? null : m)}
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
    </div>
  )
}

/** البطاقة الكاملة للخريطة المسطّحة (عنوان + جسم + تعليق + وسيلة إيضاح). */
