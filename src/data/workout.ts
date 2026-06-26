import type { WorkoutDay } from '@/types'

export const todayWorkout: WorkoutDay = {
  day: 'اليوم — الإثنين',
  focus: 'الصدر والترايسبس (Push)',
  exercises: [
    {
      name: 'بنش بريس بار',
      muscle: 'صدر',
      sets: 4,
      reps: '8–10',
      weight: '80 كجم',
      done: true,
    },
    {
      name: 'بنش مائل دمبل',
      muscle: 'صدر علوي',
      sets: 3,
      reps: '10–12',
      weight: '28 كجم',
      done: true,
    },
    {
      name: 'تفتيح كيبل',
      muscle: 'صدر',
      sets: 3,
      reps: '12–15',
      weight: '15 كجم',
      done: false,
    },
    {
      name: 'ضغط ترايسبس كيبل',
      muscle: 'ترايسبس',
      sets: 3,
      reps: '12',
      weight: '25 كجم',
      done: false,
    },
    {
      name: 'تمديد علوي دمبل',
      muscle: 'ترايسبس',
      sets: 3,
      reps: '10–12',
      weight: '20 كجم',
      done: false,
    },
  ],
}
