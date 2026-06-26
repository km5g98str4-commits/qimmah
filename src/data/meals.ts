import type { Meal, MacroTarget } from '@/types'

export const meals: Meal[] = [
  {
    name: 'الإفطار — شوفان وبيض',
    time: '7:30 ص',
    calories: 520,
    protein: 32,
    carbs: 55,
    fats: 18,
  },
  {
    name: 'سناك — زبادي يوناني ولوز',
    time: '10:30 ص',
    calories: 280,
    protein: 22,
    carbs: 14,
    fats: 14,
  },
  {
    name: 'الغداء — صدر دجاج وأرز',
    time: '1:30 م',
    calories: 680,
    protein: 52,
    carbs: 70,
    fats: 16,
  },
  {
    name: 'قبل التمرين — موز وقهوة',
    time: '5:00 م',
    calories: 160,
    protein: 3,
    carbs: 34,
    fats: 1,
  },
  {
    name: 'العشاء — سلمون وخضار',
    time: '8:30 م',
    calories: 500,
    protein: 40,
    carbs: 20,
    fats: 26,
  },
]

export const macroTargets: MacroTarget[] = [
  { label: 'البروتين', current: 149, target: 180, unit: 'غ', color: 'bg-brand-500' },
  { label: 'الكربوهيدرات', current: 193, target: 260, unit: 'غ', color: 'bg-sky-500' },
  { label: 'الدهون', current: 75, target: 80, unit: 'غ', color: 'bg-gold-500' },
  { label: 'السعرات', current: 2140, target: 2600, unit: 'سعرة', color: 'bg-orange-500' },
]
