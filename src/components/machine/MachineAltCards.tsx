import { Icon } from '../Icon'
import { ExerciseMedia } from '../ExerciseMedia'
import { ExerciseName } from '../ExerciseName'
import type { Lang } from '@/lib/appPreferences'
import { canonicalExerciseId, getExercise } from '@/data/exercises'
import type { MachineAlternatives } from '@/data/machineAlternatives'
import { workoutScreenStrings } from '@/i18n/dict/workoutScreen'

interface MachineAltCardsProps {
  lang: Lang
  /** معرّف جهاز الكتالوج الأساسي في الخطة (تُشتق منه تسميات البطاقات). */
  machineId: string
  /** بديلا الجهاز (دمبل/كيبل) من machineAlternatives. */
  alt: MachineAlternatives
  /** محتوى البطاقتين الصغيرتين حاليًا (يتبدّل مع البطاقة الكبيرة في هذه الجلسة). */
  slots: [string, string]
  /** ضغطة واحدة: يرقّي محتوى البطاقة للبطاقة الكبيرة وينزل المعروض حاليًا مكانه. */
  onSwitch: (slotIdx: 0 | 1, exerciseId: string) => void
}

/**
 * (P12) بطاقتا البديل — «البديل إذا الجهاز غير متوفر»: بديل دمبل + بديل كيبل
 * (أو بديل حر بصدق عند cableIsFallback) جنبًا إلى جنب تحت البطاقة الكبيرة.
 * التبديل لهذه الجلسة فقط — لا يُحفظ في الخطة.
 */
export function MachineAltCards({ lang, machineId, alt, slots, onSwitch }: MachineAltCardsProps) {
  const d = workoutScreenStrings[lang]

  // تسمية البطاقة بحسب محتواها الحالي (الجهاز المُنزَّل يحمل تسمية «الجهاز الأساسي»).
  const labelFor = (exerciseId: string): string => {
    const id = canonicalExerciseId(exerciseId)
    if (id === canonicalExerciseId(machineId)) return d.altMachineLabel
    if (id === canonicalExerciseId(alt.dumbbell)) return d.altDumbbellLabel
    return alt.cableIsFallback ? d.altCableFallbackLabel : d.altCableLabel
  }

  return (
    <section aria-label={d.altBlockTitle}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-black text-ink-900">
          <Icon name="Repeat" className="h-4 w-4 text-primary-c" />
          {d.altBlockTitle}
        </p>
      </div>
      <p className="mt-1 text-xs text-ink-500">{d.altBlockNote}</p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {slots.map((exerciseId, i) => {
          const ex = getExercise(exerciseId)
          return (
            <button
              key={`${i}-${exerciseId}`}
              type="button"
              onClick={() => onSwitch(i as 0 | 1, exerciseId)}
              className="card overflow-hidden text-start transition-transform active:scale-[0.98]"
            >
              <ExerciseMedia exerciseId={exerciseId} heightClass="h-20" hideChips />
              <div className="p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-primary-c">{labelFor(exerciseId)}</p>
                <ExerciseName
                  nameAr={ex?.nameAr ?? ''}
                  nameEn={ex?.nameEn ?? ''}
                  lang={lang}
                  className="mt-1 truncate text-sm font-black leading-tight text-ink-900"
                  secondaryClassName="truncate text-[11px] font-bold text-ink-400"
                />
                <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-primary-c">
                  <Icon name="Repeat" className="h-3.5 w-3.5" />
                  {d.switchHere}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
