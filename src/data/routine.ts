import type { RoutineDay } from '@/types'

// أسبوع تجريبي نظيف: كل يوم تدريب = تمرين واحد واضح بلا تكرار (لا يومَي «دفع» متشابهَين).
// خمسة أيام تدريب بأنواع متمايزة (دفع/سحب/أرجل/علوي/كارديو) + راحة.
export const weeklyRoutine: RoutineDay[] = [
  { day: 'السبت', short: 'سبت', title: 'دفع — صدر وكتف وترايسبس', type: 'push', done: true },
  { day: 'الأحد', short: 'أحد', title: 'سحب — ظهر وبايسبس', type: 'pull', done: true },
  { day: 'الإثنين', short: 'إثن', title: 'أرجل كاملة — كواد وخلفي وسمانة', type: 'legs', done: true },
  { day: 'الثلاثاء', short: 'ثلا', title: 'علوي — صدر وظهر وأكتاف', type: 'full', done: true },
  { day: 'الأربعاء', short: 'أرب', title: 'كارديو وبطن', type: 'cardio', done: false },
  { day: 'الخميس', short: 'خمي', title: 'راحة نشِطة — مشي وإطالة', type: 'rest', done: false },
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
  rest: 'bg-beige text-ink-500 border-line',
  full: 'bg-gold-500/15 text-gold-300 border-gold-500/30',
}
