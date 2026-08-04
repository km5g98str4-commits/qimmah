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
  /**
   * [CTO-73] الشاشة ١ — بطاقات نصّية بلا وسائط.
   *
   * البدائل كانت تُعرض بصور **فوتوغرافية** لصالة حقيقية، بينما التمرين الأساسي
   * فوقها **رسم خطّي** على تدرّج داكن — لغتان بصريّتان في شبكة واحدة، وهو أحد
   * كسور اللغة الثلاثة في التشخيص. وإنتاج رسوم للبدائل ليس عملَ هذه الموجة،
   * فالبديل المُعتمد في الأمر: «بطاقات نصّية نظيفة».
   */
  noMedia?: boolean
}

/**
 * (P12) بطاقتا البديل — «البديل إذا الجهاز غير متوفر»: بديل دمبل + بديل كيبل
 * (أو بديل حر بصدق عند cableIsFallback) جنبًا إلى جنب تحت البطاقة الكبيرة.
 * التبديل لهذه الجلسة فقط — لا يُحفظ في الخطة.
 */
export function MachineAltCards({ lang, machineId, alt, slots, onSwitch, noMedia }: MachineAltCardsProps) {
  const d = workoutScreenStrings[lang]

  // تسمية البطاقة بحسب محتواها الحالي (الجهاز المُنزَّل يحمل تسمية «الجهاز الأساسي»).
  const labelFor = (exerciseId: string): string => {
    const id = canonicalExerciseId(exerciseId)
    if (id === canonicalExerciseId(machineId)) return d.altMachineLabel
    if (id === canonicalExerciseId(alt.dumbbell))
      return alt.dumbbellIsFallback ? d.altDumbbellFallbackLabel : d.altDumbbellLabel
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
              className="card min-h-[44px] overflow-hidden text-start transition-transform active:scale-[0.98]"
            >
              {!noMedia && <ExerciseMedia exerciseId={exerciseId} lang={lang} heightClass="h-20" hideChips variant="thumb" />}
              <div className="p-3">
                <p className="text-sm font-black uppercase tracking-wide text-primary-c">{labelFor(exerciseId)}</p>
                <ExerciseName
                  nameAr={ex?.nameAr ?? ''}
                  nameEn={ex?.nameEn ?? ''}
                  lang={lang}
                  className="mt-1 truncate text-base font-black leading-tight text-ink-900"
                  secondaryClassName="truncate text-sm font-bold text-ink-400"
                />
                <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-primary-c">
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
