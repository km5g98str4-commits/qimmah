import type { Supplement, SupplementCategory } from '@/types/wellness'

// مكتبة المكملات — ~35 مكمّلًا شائعًا. معلومات عامة للتنظيم، وليست نصيحة طبية.

interface SupInput {
  id: string
  nameAr: string
  nameEn: string
  category: SupplementCategory
  timingAr: string
  timingEn: string
  notesAr: string
  notesEn: string
  cautionAr?: string
  cautionEn?: string
}

function sup(s: SupInput): Supplement {
  return {
    id: s.id,
    nameAr: s.nameAr,
    nameEn: s.nameEn,
    category: s.category,
    commonTimingAr: s.timingAr,
    commonTimingEn: s.timingEn,
    notesAr: s.notesAr,
    notesEn: s.notesEn,
    cautionAr: s.cautionAr,
    cautionEn: s.cautionEn,
  }
}

export const supplementLibrary: Supplement[] = [
  // بروتين
  sup({ id: 'whey-protein', nameAr: 'واي بروتين', nameEn: 'Whey Protein', category: 'protein', timingAr: 'بعد التمرين أو بين الوجبات', timingEn: 'Post-workout or between meals', notesAr: 'مصدر بروتين سريع الامتصاص.', notesEn: 'Fast-absorbing protein source.' }),
  sup({ id: 'casein-protein', nameAr: 'كازين بروتين', nameEn: 'Casein Protein', category: 'protein', timingAr: 'قبل النوم', timingEn: 'Before bed', notesAr: 'بروتين بطيء الامتصاص.', notesEn: 'Slow-digesting protein.' }),
  sup({ id: 'plant-protein', nameAr: 'بروتين نباتي', nameEn: 'Plant Protein', category: 'protein', timingAr: 'بعد التمرين أو بين الوجبات', timingEn: 'Post-workout or between meals', notesAr: 'بديل نباتي للواي.', notesEn: 'Plant-based whey alternative.' }),
  sup({ id: 'egg-protein', nameAr: 'بروتين البيض', nameEn: 'Egg Protein', category: 'protein', timingAr: 'أي وقت', timingEn: 'Anytime', notesAr: 'بروتين كامل خالٍ من اللاكتوز.', notesEn: 'Complete lactose-free protein.' }),

  // أداء
  sup({ id: 'creatine', nameAr: 'كرياتين مونوهيدرات', nameEn: 'Creatine Monohydrate', category: 'performance', timingAr: 'يوميًا — أي وقت', timingEn: 'Daily — anytime', notesAr: 'من أكثر المكملات دعمًا للقوة.', notesEn: 'Well-supported for strength.' }),
  sup({ id: 'caffeine', nameAr: 'كافيين', nameEn: 'Caffeine', category: 'performance', timingAr: 'قبل التمرين', timingEn: 'Pre-workout', notesAr: 'منبّه يزيد التركيز والأداء.', notesEn: 'Stimulant for focus and performance.', cautionAr: 'تجنّبه قرب النوم.', cautionEn: 'Avoid close to bedtime.' }),
  sup({ id: 'pre-workout', nameAr: 'بري ووركاوت', nameEn: 'Pre-Workout', category: 'performance', timingAr: 'قبل التمرين بـ20–30 دقيقة', timingEn: '20–30 min before training', notesAr: 'خليط منبّهات وأداء.', notesEn: 'Stimulant/performance blend.', cautionAr: 'انتبه لمحتوى الكافيين.', cautionEn: 'Mind the caffeine content.' }),
  sup({ id: 'citrulline-malate', nameAr: 'سيترولين مالات', nameEn: 'Citrulline Malate', category: 'performance', timingAr: 'قبل التمرين', timingEn: 'Pre-workout', notesAr: 'يدعم تدفّق الدم والتحمّل.', notesEn: 'Supports blood flow and endurance.' }),
  sup({ id: 'beta-alanine', nameAr: 'بيتا-ألانين', nameEn: 'Beta-Alanine', category: 'performance', timingAr: 'يوميًا', timingEn: 'Daily', notesAr: 'قد يسبّب وخزًا مؤقتًا.', notesEn: 'May cause temporary tingling.' }),
  sup({ id: 'l-carnitine', nameAr: 'إل-كارنيتين', nameEn: 'L-Carnitine', category: 'performance', timingAr: 'مع وجبة', timingEn: 'With a meal', notesAr: 'مرتبط باستقلاب الدهون.', notesEn: 'Related to fat metabolism.' }),
  sup({ id: 'sodium-bicarbonate', nameAr: 'بيكربونات الصوديوم', nameEn: 'Sodium Bicarbonate', category: 'performance', timingAr: 'قبل التمرين', timingEn: 'Pre-workout', notesAr: 'قد يدعم الأداء عالي الشدّة.', notesEn: 'May support high-intensity work.', cautionAr: 'قد يسبّب اضطرابًا هضميًا.', cautionEn: 'May cause stomach upset.' }),
  sup({ id: 'beetroot', nameAr: 'مستخلص الشمندر', nameEn: 'Beetroot Extract', category: 'performance', timingAr: 'قبل التمرين', timingEn: 'Pre-workout', notesAr: 'مصدر للنترات يدعم التحمّل.', notesEn: 'Nitrate source for endurance.' }),

  // استشفاء
  sup({ id: 'eaa', nameAr: 'أحماض أمينية أساسية EAA', nameEn: 'EAA', category: 'recovery', timingAr: 'حول التمرين', timingEn: 'Around training', notesAr: 'أحماض أمينية أساسية كاملة.', notesEn: 'Full essential amino acids.' }),
  sup({ id: 'bcaa', nameAr: 'أحماض متشعّبة BCAA', nameEn: 'BCAA', category: 'recovery', timingAr: 'حول التمرين', timingEn: 'Around training', notesAr: 'ثلاثة أحماض أمينية متشعّبة.', notesEn: 'Three branched-chain amino acids.' }),
  sup({ id: 'glutamine', nameAr: 'جلوتامين', nameEn: 'Glutamine', category: 'recovery', timingAr: 'بعد التمرين أو قبل النوم', timingEn: 'Post-workout or before bed', notesAr: 'حمض أميني للاستشفاء.', notesEn: 'Amino acid for recovery.' }),
  sup({ id: 'collagen', nameAr: 'كولاجين', nameEn: 'Collagen', category: 'recovery', timingAr: 'يوميًا', timingEn: 'Daily', notesAr: 'يدعم المفاصل والجلد.', notesEn: 'Supports joints and skin.' }),
  sup({ id: 'ashwagandha', nameAr: 'أشواغاندا', nameEn: 'Ashwagandha', category: 'recovery', timingAr: 'يوميًا', timingEn: 'Daily', notesAr: 'عشب مرتبط بإدارة التوتر.', notesEn: 'Herb linked to stress management.' }),
  sup({ id: 'melatonin', nameAr: 'ميلاتونين', nameEn: 'Melatonin', category: 'recovery', timingAr: 'قبل النوم', timingEn: 'Before bed', notesAr: 'يدعم تنظيم النوم.', notesEn: 'Supports sleep timing.', cautionAr: 'يسبّب النعاس.', cautionEn: 'Causes drowsiness.' }),
  sup({ id: 'turmeric-curcumin', nameAr: 'كركم/كركمين', nameEn: 'Turmeric / Curcumin', category: 'recovery', timingAr: 'مع وجبة', timingEn: 'With a meal', notesAr: 'مضاد أكسدة شائع.', notesEn: 'Common antioxidant.' }),
  sup({ id: 'joint-support', nameAr: 'دعم المفاصل', nameEn: 'Joint Support', category: 'recovery', timingAr: 'يوميًا', timingEn: 'Daily', notesAr: 'غلوكوزامين/كوندرويتين عادةً.', notesEn: 'Usually glucosamine/chondroitin.' }),

  // صحة عامة
  sup({ id: 'omega-3', nameAr: 'أوميغا 3', nameEn: 'Omega-3', category: 'general_health', timingAr: 'مع وجبة', timingEn: 'With a meal', notesAr: 'أحماض دهنية للقلب والمفاصل.', notesEn: 'Fatty acids for heart and joints.' }),
  sup({ id: 'greens-powder', nameAr: 'مسحوق الخضار', nameEn: 'Greens Powder', category: 'general_health', timingAr: 'صباحًا', timingEn: 'Morning', notesAr: 'مصدر مركّز للخضار.', notesEn: 'Concentrated greens source.' }),

  // فيتامينات
  sup({ id: 'vitamin-d', nameAr: 'فيتامين D', nameEn: 'Vitamin D', category: 'vitamins', timingAr: 'مع وجبة دسمة', timingEn: 'With a fatty meal', notesAr: 'مهم عند قلة التعرّض للشمس.', notesEn: 'Important with low sun exposure.' }),
  sup({ id: 'vitamin-c', nameAr: 'فيتامين C', nameEn: 'Vitamin C', category: 'vitamins', timingAr: 'صباحًا', timingEn: 'Morning', notesAr: 'مضاد أكسدة شائع.', notesEn: 'Common antioxidant.' }),
  sup({ id: 'multivitamin', nameAr: 'ملتي فيتامين', nameEn: 'Multivitamin', category: 'vitamins', timingAr: 'مع الإفطار', timingEn: 'With breakfast', notesAr: 'تغطية عامة للفيتامينات.', notesEn: 'General vitamin coverage.' }),
  sup({ id: 'b-complex', nameAr: 'فيتامين ب المركّب', nameEn: 'B-Complex', category: 'vitamins', timingAr: 'صباحًا', timingEn: 'Morning', notesAr: 'مجموعة فيتامينات ب.', notesEn: 'Group of B vitamins.' }),
  sup({ id: 'vitamin-b12', nameAr: 'فيتامين B12', nameEn: 'Vitamin B12', category: 'vitamins', timingAr: 'صباحًا', timingEn: 'Morning', notesAr: 'مهم خاصة للنباتيين.', notesEn: 'Important especially for vegans.' }),

  // معادن
  sup({ id: 'magnesium', nameAr: 'مغنيسيوم', nameEn: 'Magnesium', category: 'minerals', timingAr: 'قبل النوم', timingEn: 'Before bed', notesAr: 'يدعم الاسترخاء والنوم.', notesEn: 'Supports relaxation and sleep.' }),
  sup({ id: 'zinc', nameAr: 'زنك', nameEn: 'Zinc', category: 'minerals', timingAr: 'مع وجبة', timingEn: 'With a meal', notesAr: 'يدعم المناعة.', notesEn: 'Supports immunity.', cautionAr: 'لا تأخذه على معدة فارغة.', cautionEn: 'Avoid on empty stomach.' }),
  sup({ id: 'calcium', nameAr: 'كالسيوم', nameEn: 'Calcium', category: 'minerals', timingAr: 'مع وجبة', timingEn: 'With a meal', notesAr: 'لصحة العظام.', notesEn: 'For bone health.' }),
  sup({ id: 'iron-supp', nameAr: 'حديد', nameEn: 'Iron', category: 'minerals', timingAr: 'على معدة فارغة مع فيتامين C', timingEn: 'Empty stomach with vitamin C', notesAr: 'يدعم الطاقة ونقل الأكسجين.', notesEn: 'Supports energy and oxygen transport.', cautionAr: 'قد يسبّب اضطرابًا هضميًا.', cautionEn: 'May cause stomach upset.' }),

  // ترطيب
  sup({ id: 'electrolytes', nameAr: 'إلكتروليتات', nameEn: 'Electrolytes', category: 'hydration', timingAr: 'حول التمرين أو في الحر', timingEn: 'Around training or in heat', notesAr: 'صوديوم/بوتاسيوم/مغنيسيوم.', notesEn: 'Sodium/potassium/magnesium.' }),

  // هضمي
  sup({ id: 'probiotics', nameAr: 'بروبيوتيك', nameEn: 'Probiotics', category: 'digestive', timingAr: 'صباحًا قبل الأكل', timingEn: 'Morning before food', notesAr: 'بكتيريا نافعة للأمعاء.', notesEn: 'Beneficial gut bacteria.' }),
  sup({ id: 'fiber', nameAr: 'ألياف', nameEn: 'Fiber', category: 'digestive', timingAr: 'مع كثير من الماء', timingEn: 'With plenty of water', notesAr: 'يدعم الهضم والشبع.', notesEn: 'Supports digestion and fullness.' }),
  sup({ id: 'digestive-enzymes', nameAr: 'إنزيمات هضمية', nameEn: 'Digestive Enzymes', category: 'digestive', timingAr: 'مع الوجبات', timingEn: 'With meals', notesAr: 'قد تدعم هضم الوجبات الكبيرة.', notesEn: 'May support digesting large meals.' }),
]

export const supplementMap: Record<string, Supplement> = Object.fromEntries(
  supplementLibrary.map((s) => [s.id, s]),
)

export function getSupplement(id: string): Supplement | undefined {
  return supplementMap[id]
}
