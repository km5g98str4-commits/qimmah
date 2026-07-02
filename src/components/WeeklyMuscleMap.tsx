import { useMemo, useState } from 'react'
import Model, { type IMuscleStats, type Muscle } from 'react-body-highlighter'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import { progressScreenStrings } from '@/i18n/dict/progressScreen'
import type { Lang } from '@/lib/appPreferences'
import { muscleGroups } from '@/data/muscleGroups'
import { computeWeeklyCoverage } from '@/lib/muscleCoverage'
import { loadSessions } from '@/lib/workoutSessions'
import { useCustomization } from '@/lib/customizationContext'
import { BODY_NEUTRAL, HEAT_SCALE, SLUG_LABEL_AR, buildBodyData } from '@/lib/muscleMapLib'
import type { MuscleView } from '@/types/muscles'

// خريطة العضلات الأسبوعية — نموذج تشريحيّ نظيف من react-body-highlighter (MIT).
// كل عضلة درّبتها هذا الأسبوع «تُضيء» بدرجة برتقالية حسب شدّة تغطيتها (1–3)؛
// غير المُدرّبة تبقى محايدة (تشجيع بلا أحكام). مبدّل أمامي/خلفي، وواعٍ بجنس الملف.

/** يحوّل جهة العرض المحلية إلى نوع نموذج المكتبة. */
const MODEL_TYPE = { front: 'anterior', back: 'posterior' } as const

export function WeeklyMuscleMap({ className, lang }: { className?: string; lang: Lang }) {
  const d = progressScreenStrings[lang]
  const { customization } = useCustomization()
  const [view, setView] = useState<MuscleView>('front')
  const [selected, setSelected] = useState<Muscle | null>(null)

  const gender = customization.profile.gender

  const coverage = useMemo(() => {
    const result = computeWeeklyCoverage({
      sessions: loadSessions(),
      plan: customization.workoutPlan,
      level: customization.profile.trainingLevel,
    })
    return result.weeklyCoverage
  }, [customization])

  const data = useMemo(() => buildBodyData(coverage), [coverage])

  const trainedCount = muscleGroups.filter((m) => (coverage[m.id]?.sets ?? 0) > 0).length

  const selLabel = selected ? SLUG_LABEL_AR[selected] ?? selected : null
  const caption = selLabel
    ? `${selLabel} — ${d.mapSelectHint}`
    : trainedCount > 0
      ? `${d.activatedPrefix} ${trainedCount} ${d.activatedMiddle} ${muscleGroups.length} ${d.activatedSuffix}`
      : d.emptyCaption

  const genderLabel = gender === 'female' ? d.mapGenderFemale : gender === 'male' ? d.mapGenderMale : d.mapGenderNeutral

  const handleClick = (stats: IMuscleStats) => {
    const m = stats?.muscle
    if (!m) return
    setSelected((cur) => (cur === m ? null : m))
  }

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

      {/* النموذج التشريحيّ (المكتبة) */}
      <div
        className="flex justify-center"
        role="img"
        aria-label={`${d.mapImgAriaPrefix} ${genderLabel}, ${d.mapImgAriaView} ${view === 'front' ? d.mapImgAriaFront : d.mapImgAriaBack}, ${d.activatedPrefix} ${trainedCount} ${d.mapImgAriaSuffix}`}
      >
        <Model
          type={MODEL_TYPE[view]}
          data={data}
          bodyColor={BODY_NEUTRAL}
          highlightedColors={HEAT_SCALE}
          onClick={handleClick}
          style={{ width: '100%', maxWidth: '210px' }}
        />
      </div>

      {/* التعليق التحفيزي / العضلة المختارة */}
      <p className="mt-1 text-center text-xs font-bold text-ink-700">{caption}</p>

      {/* وسيلة الإيضاح */}
      <div className="mt-4 flex items-center justify-center gap-4 border-t border-line pt-3 text-[11px] text-ink-500">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-6 rounded-full"
            style={{ background: `linear-gradient(90deg, ${HEAT_SCALE[0]}, ${HEAT_SCALE[2]})` }}
          />
          {d.legendTrained}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: BODY_NEUTRAL, border: '1px solid rgba(43,37,32,0.18)' }}
          />
          {d.legendUntrained}
        </span>
      </div>
    </div>
  )
}
