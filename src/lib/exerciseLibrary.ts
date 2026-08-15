import type { Lang } from '@/lib/appPreferences'
import { exercises } from '@/data/exercises'
import type { Exercise, Muscle } from '@/types/workout'

export interface ExerciseLibraryQuery {
  search: string
  muscle: Muscle | 'all'
  equipment: string | 'all'
  lang: Lang
}

/**
 * مرشّح المكتبة النقي. يبقى كتالوج التمارين المرجعي بلا تعديل، بينما تستخدم
 * الواجهة والإثبات السلوكي المنطق نفسه للبحث العربي/الإنجليزي ودمج الفلاتر.
 */
export function filterExerciseLibrary({ search, muscle, equipment, lang }: ExerciseLibraryQuery): Exercise[] {
  const query = search.trim().toLocaleLowerCase(lang === 'ar' ? 'ar' : 'en')
  return exercises
    .filter((exercise) => {
      if (muscle !== 'all' && exercise.primaryMuscle !== muscle) return false
      if (equipment !== 'all' && !exercise.equipment.includes(equipment)) return false
      if (query && !`${exercise.nameAr} ${exercise.nameEn}`.toLocaleLowerCase(lang === 'ar' ? 'ar' : 'en').includes(query)) return false
      return true
    })
    .sort((a, b) => (lang === 'en' ? a.nameEn.localeCompare(b.nameEn, 'en') : a.nameAr.localeCompare(b.nameAr, 'ar')))
}
