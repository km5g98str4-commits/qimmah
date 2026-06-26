import type { RoutineDay } from '@/types'

export const weeklyRoutine: RoutineDay[] = [
  { day: 'السبت', short: 'سبت', title: 'دفع — صدر وكتف وترايسبس', type: 'push', done: true },
  { day: 'الأحد', short: 'أحد', title: 'سحب — ظهر وبايسبس', type: 'pull', done: true },
  { day: 'الإثنين', short: 'إثن', title: 'أرجل كاملة', type: 'legs', done: true },
  { day: 'الثلاثاء', short: 'ثلا', title: 'كارديو وبطن', type: 'cardio', done: true },
  { day: 'الأربعاء', short: 'أرب', title: 'دفع — صدر وكتف', type: 'push', done: false },
  { day: 'الخميس', short: 'خمي', title: 'سحب — ظهر وبايسبس', type: 'pull', done: false },
  { day: 'الجمعة', short: 'جمع', title: 'راحة واستشفاء', type: 'rest', done: false },
]

export const routineTypeLabels: Record<RoutineDay['type'], string> = {
  push: 'دفع',
  pull: 'سحب',
  legs: 'أرجل',
  cardio: 'كارديو',
  rest: 'راحة',
  full: 'كامل',
}

export const routineTypeColors: Record<RoutineDay['type'], string> = {
  push: 'bg-brand-500/15 text-brand-300 border-brand-500/30',
  pull: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  legs: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  cardio: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  rest: 'bg-ink-500/30 text-slate-400 border-white/10',
  full: 'bg-gold-500/15 text-gold-300 border-gold-500/30',
}
