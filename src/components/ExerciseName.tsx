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
  // (P10.1) عزل اتجاه المحتوى بـ <bdi>: الاسم قد يكون عربيًا داخل واجهة إنجليزية (LTR)
  // عند غياب الاسم الإنجليزي، والعكس للسطر الثانوي — يمنع قفز علامات الترقيم لبداية السطر.
  return (
    <>
      <p className={className}><bdi>{primary}</bdi></p>
      {secondary ? <p className={secondaryClassName}><bdi>{secondary}</bdi></p> : null}
    </>
  )
}
