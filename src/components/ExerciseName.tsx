import type { Lang } from '@/lib/appPreferences'
import { exerciseNameParts } from '@/lib/workoutPlan'

interface ExerciseNameProps {
  nameAr: string
  nameEn: string
  lang: Lang
  /** أصناف السطر الأساسي (العربي) — تمرَّر كاملةً (اللون/الحجم) لأن cn لا يدمج Tailwind. */
  className?: string
  /** أصناف السطر الثانوي (الإنجليزي الأصغر). */
  secondaryClassName?: string
}

/**
 * اسم تمرين موحّد عبر كل الواجهة (المكتبة/الخطة/وضع التمرين):
 * العربي اسمٌ أساسي بارز + الإنجليزي سطر ثانوي أصغر. لا لصق مزدوج «إنجليزي — عربي».
 * في الوضع الإنجليزي يظهر الاسم الإنجليزي وحده.
 */
export function ExerciseName({ nameAr, nameEn, lang, className, secondaryClassName }: ExerciseNameProps) {
  const { primary, secondary } = exerciseNameParts(nameAr, nameEn, lang)
  return (
    <>
      <p className={className}>{primary}</p>
      {secondary ? <p className={secondaryClassName}>{secondary}</p> : null}
    </>
  )
}
