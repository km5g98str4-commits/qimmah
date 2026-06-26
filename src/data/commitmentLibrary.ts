import type { CommitmentCategory, CommitmentItem, Frequency } from '@/types/progress'

// مكتبة الالتزامات — ~35 عنصرًا مجمّعة حسب الفئة.

interface CInput {
  id: string
  nameAr: string
  nameEn: string
  category: CommitmentCategory
  frequency?: Frequency
  descAr?: string
  descEn?: string
}

function c(i: CInput): CommitmentItem {
  return {
    id: i.id,
    nameAr: i.nameAr,
    nameEn: i.nameEn,
    category: i.category,
    frequency: i.frequency ?? 'daily',
    descriptionAr: i.descAr,
    descriptionEn: i.descEn,
  }
}

export const commitmentLibrary: CommitmentItem[] = [
  // تمرين
  c({ id: 'today-workout', nameAr: 'تمرين اليوم', nameEn: 'Today workout', category: 'training' }),
  c({ id: 'cardio', nameAr: 'كارديو', nameEn: 'Cardio', category: 'training' }),
  c({ id: 'warm-up', nameAr: 'إحماء', nameEn: 'Warm-up', category: 'training' }),
  c({ id: 'cooldown', nameAr: 'تهدئة', nameEn: 'Cooldown', category: 'training' }),
  c({ id: 'stretching', nameAr: 'إطالة', nameEn: 'Stretching', category: 'training' }),
  c({ id: 'mobility', nameAr: 'تمارين مرونة', nameEn: 'Mobility', category: 'training' }),
  c({ id: 'active-recovery', nameAr: 'راحة نشطة', nameEn: 'Active recovery', category: 'training' }),
  c({ id: 'steps-10k', nameAr: 'خطوات اليوم', nameEn: 'Daily steps', category: 'training' }),

  // تغذية
  c({ id: 'protein-target', nameAr: 'البروتين', nameEn: 'Protein target', category: 'nutrition' }),
  c({ id: 'calories-target', nameAr: 'السعرات', nameEn: 'Calories target', category: 'nutrition' }),
  c({ id: 'post-workout-meal', nameAr: 'وجبة بعد التمرين', nameEn: 'Post-workout meal', category: 'nutrition' }),
  c({ id: 'no-added-sugar', nameAr: 'بدون سكر مضاف', nameEn: 'No added sugar', category: 'nutrition' }),
  c({ id: 'vegetables', nameAr: 'حصة خضار', nameEn: 'Vegetables serving', category: 'nutrition' }),
  c({ id: 'breakfast', nameAr: 'فطور', nameEn: 'Breakfast', category: 'nutrition' }),

  // ترطيب
  c({ id: 'water-target', nameAr: 'شرب الماء', nameEn: 'Water target', category: 'hydration' }),
  c({ id: 'electrolytes', nameAr: 'إلكتروليتات', nameEn: 'Electrolytes', category: 'hydration' }),

  // نوم
  c({ id: 'sleep-7h', nameAr: 'نوم 7 ساعات', nameEn: '7h sleep', category: 'sleep' }),
  c({ id: 'sleep-early', nameAr: 'نوم مبكر', nameEn: 'Sleep early', category: 'sleep' }),
  c({ id: 'no-screens-bed', nameAr: 'بدون شاشات قبل النوم', nameEn: 'No screens before bed', category: 'sleep' }),

  // استشفاء
  c({ id: 'foam-rolling', nameAr: 'فوم رولر', nameEn: 'Foam rolling', category: 'recovery' }),
  c({ id: 'rest-day', nameAr: 'يوم راحة', nameEn: 'Rest day', category: 'recovery', frequency: 'weekly' }),
  c({ id: 'light-walk', nameAr: 'مشي خفيف', nameEn: 'Light walk', category: 'recovery' }),

  // صحة
  c({ id: 'sunlight', nameAr: 'تعرّض للشمس', nameEn: 'Sunlight', category: 'health' }),
  c({ id: 'meditation', nameAr: 'تأمل', nameEn: 'Meditation', category: 'health' }),
  c({ id: 'deep-breathing', nameAr: 'تنفّس عميق', nameEn: 'Deep breathing', category: 'health' }),
  c({ id: 'posture-check', nameAr: 'تصحيح الجلسة', nameEn: 'Posture check', category: 'health' }),

  // مكملات وأدوية
  c({ id: 'take-supplements', nameAr: 'المكملات', nameEn: 'Supplements', category: 'supplements' }),
  c({ id: 'take-medications', nameAr: 'الأدوية', nameEn: 'Medications', category: 'medications' }),

  // قياسات
  c({ id: 'weigh-in', nameAr: 'قياس الوزن', nameEn: 'Weigh-in', category: 'measurements', frequency: 'weekly' }),
  c({ id: 'waist-measure', nameAr: 'قياس الخصر', nameEn: 'Waist measurement', category: 'measurements', frequency: 'weekly' }),
  c({ id: 'progress-photo', nameAr: 'صورة تقدّم', nameEn: 'Progress photo', category: 'measurements', frequency: 'weekly' }),

  // نمط حياة
  c({ id: 'daily-note', nameAr: 'ملاحظة يومية', nameEn: 'Daily note', category: 'lifestyle' }),
  c({ id: 'plan-tomorrow', nameAr: 'خطّط للغد', nameEn: 'Plan tomorrow', category: 'lifestyle' }),
  c({ id: 'gratitude', nameAr: 'امتنان', nameEn: 'Gratitude', category: 'lifestyle' }),
  c({ id: 'limit-caffeine', nameAr: 'تقليل الكافيين', nameEn: 'Limit caffeine', category: 'lifestyle' }),
]

export const commitmentMap: Record<string, CommitmentItem> = Object.fromEntries(
  commitmentLibrary.map((x) => [x.id, x]),
)

export function getCommitment(id: string): CommitmentItem | undefined {
  return commitmentMap[id]
}
