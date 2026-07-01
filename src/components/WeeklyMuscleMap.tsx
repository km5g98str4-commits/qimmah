import { useMemo, useState } from 'react'
import Model, { type IExerciseData, type Muscle } from 'react-body-highlighter'
import { Icon } from './Icon'
import { cn } from '@/lib/cn'
import { muscleGroups } from '@/data/muscleGroups'
import { MUSCLE_TO_LIBRARY } from '@/data/muscleLibraryMap'
import { computeWeeklyCoverage } from '@/lib/muscleCoverage'
import { loadSessions } from '@/lib/workoutSessions'
import { useCustomization } from '@/lib/customizationContext'
import type { MuscleCoverage, MuscleView } from '@/types/muscles'

// خريطة العضلات الأسبوعية — تعتمد الآن مكتبة react-body-highlighter (MIT):
// جسم تشريحي مجرّد (بلا وجه/عُري) — محتشمٌ بالتصميم لكلا الجنسين.
// كل عضلة دُرّبت هذا الأسبوع «تُضيء» بدرجة برتقالية حسب شدّة تغطيتها (3 مستويات)؛
// غير المُدرّبة تبقى محايدة (تشجيع بلا أحكام). الربط في data/muscleLibraryMap.

// لوحة البرتقالي (مستوى 1 → 3): فاتح → غامق (brand-200/400/500).
const HIGHLIGHT_COLORS = ['#FBCBA9', '#F58145', '#F26A21']
// لون الجسم المحايد (يقرأ جيّدًا على الوضعين الفاتح والداكن).
const BODY_COLOR = '#B8BEC6'

/** شدّة التغطية → مستوى إضاءة 1..3 (أو 0 إن لم تُدرّب). */
function intensityLevel(c?: MuscleCoverage): number {
  if (!c || c.sets <= 0) return 0
  if (c.intensity >= 0.66) return 3
  if (c.intensity >= 0.33) return 2
  return 1
}

/** تجميع بيانات التغطية على مستوى شريحة المكتبة. */
interface SlugAgg {
  sets: number
  level: number
  labels: string[]
}

export function WeeklyMuscleMap({ className }: { className?: string }) {
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

  // تجميع تغطيتنا التفصيلية على شرائح المكتبة (عدة معرّفات قد تشترك بشريحة واحدة).
  const bySlug = useMemo(() => {
    const acc: Partial<Record<Muscle, SlugAgg>> = {}
    for (const mg of muscleGroups) {
      const slug = MUSCLE_TO_LIBRARY[mg.id]
      const c = coverage[mg.id]
      const agg = acc[slug] ?? { sets: 0, level: 0, labels: [] }
      if (c && c.sets > 0) {
        agg.sets += c.sets
        agg.level = Math.max(agg.level, intensityLevel(c))
        agg.labels.push(mg.labelAr)
      }
      acc[slug] = agg
    }
    return acc
  }, [coverage])

  // بيانات المكتبة: عضلة واحدة لكل شريحة مُدرَّبة، بتردّد = مستوى الإضاءة (1..3).
  const data = useMemo<IExerciseData[]>(
    () =>
      (Object.entries(bySlug) as [Muscle, SlugAgg][])
        .filter(([, a]) => a.level > 0)
        .map(([slug, a]) => ({ name: slug, muscles: [slug], frequency: a.level })),
    [bySlug],
  )

  const trainedCount = muscleGroups.filter((m) => (coverage[m.id]?.sets ?? 0) > 0).length

  // الاسم العربي لشريحة (دمج أسماء معرّفاتنا التي تُشير إليها).
  const slugArabic = (slug: Muscle): string => {
    const names = muscleGroups.filter((m) => MUSCLE_TO_LIBRARY[m.id] === slug).map((m) => m.labelAr)
    return names.join(' / ') || slug
  }

  const selAgg = selected ? bySlug[selected] : undefined
  const caption = selected
    ? selAgg && selAgg.sets > 0
      ? `${slugArabic(selected)} · ${Math.round(selAgg.sets)} مجموعة هذا الأسبوع`
      : `${slugArabic(selected)} · لم تُسجّل بعد — جرّب تضيفها`
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
        <div className="inline-flex rounded-full border border-line bg-page p-1" role="group" aria-label="جهة عرض الجسم">
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
              {v === 'front' ? 'أمامي' : 'خلفي'}
            </button>
          ))}
        </div>
      </div>

      {/* الجسم التشريحي (من المكتبة) */}
      <div
        className="flex justify-center"
        role="img"
        aria-label={`خريطة العضلات — جسم ${genderLabel}، العرض ${view === 'front' ? 'الأمامي' : 'الخلفي'}، فعّلت ${trainedCount} عضلة هذا الأسبوع`}
      >
        <Model
          data={data}
          type={view === 'front' ? 'anterior' : 'posterior'}
          bodyColor={BODY_COLOR}
          highlightedColors={HIGHLIGHT_COLORS}
          onClick={({ muscle }) => setSelected((cur) => (cur === muscle ? null : muscle))}
          style={{ maxWidth: 220, margin: '0 auto' }}
          svgStyle={{ width: '100%', height: 'auto' }}
        />
      </div>

      {/* التعليق التحفيزي / تفاصيل العضلة المختارة */}
      <p className="mt-1 text-center text-xs font-bold text-ink-700">{caption}</p>

      {/* وسيلة الإيضاح */}
      <div className="mt-4 flex items-center justify-center gap-4 border-t border-line pt-3 text-[11px] text-ink-500">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-6 rounded-full"
            style={{ background: `linear-gradient(90deg, ${HIGHLIGHT_COLORS[0]}, ${HIGHLIGHT_COLORS[2]})` }}
          />
          درّبتها (الأغمق أكثر)
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: BODY_COLOR, border: '1px solid rgba(43,37,32,0.18)' }}
          />
          لم تُدرّب
        </span>
      </div>
    </div>
  )
}
