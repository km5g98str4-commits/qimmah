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

  // بروتين — إضافات
  sup({ id: 'whey-isolate', nameAr: 'واي أيزوليت', nameEn: 'Whey Isolate', category: 'protein', timingAr: 'بعد التمرين', timingEn: 'Post-workout', notesAr: 'واي مرشّح بنسبة بروتين أعلى ولاكتوز أقل.', notesEn: 'Filtered whey with higher protein and less lactose.' }),
  sup({ id: 'hydrolyzed-whey', nameAr: 'واي مُحلّل', nameEn: 'Hydrolyzed Whey', category: 'protein', timingAr: 'بعد التمرين', timingEn: 'Post-workout', notesAr: 'واي مُجزّأ مسبقًا لامتصاص سريع.', notesEn: 'Pre-digested whey for fast absorption.' }),
  sup({ id: 'beef-protein', nameAr: 'بروتين اللحم', nameEn: 'Beef Protein', category: 'protein', timingAr: 'بين الوجبات', timingEn: 'Between meals', notesAr: 'بروتين من مصدر حيواني خالٍ من الألبان.', notesEn: 'Animal-source dairy-free protein.' }),
  sup({ id: 'vegan-protein-blend', nameAr: 'خليط بروتين نباتي', nameEn: 'Vegan Protein Blend', category: 'protein', timingAr: 'بعد التمرين أو بين الوجبات', timingEn: 'Post-workout or between meals', notesAr: 'مزيج مصادر نباتية لملف أحماض متكامل.', notesEn: 'Mix of plant sources for a fuller amino profile.' }),
  sup({ id: 'mass-gainer', nameAr: 'ماس جينر', nameEn: 'Mass Gainer', category: 'protein', timingAr: 'بعد التمرين أو بين الوجبات', timingEn: 'Post-workout or between meals', notesAr: 'مزيج بروتين وكربوهيدرات عالي السعرات.', notesEn: 'High-calorie protein and carb blend.' }),

  // أداء — إضافات
  sup({ id: 'carb-powder', nameAr: 'مسحوق كربوهيدرات (مالتو دكسترين)', nameEn: 'Carb Powder (Maltodextrin)', category: 'performance', timingAr: 'حول التمرين', timingEn: 'Around training', notesAr: 'مصدر كربوهيدرات سريع لتعويض الطاقة.', notesEn: 'Fast carb source to replenish energy.' }),
  sup({ id: 'hmb', nameAr: 'إتش إم بي HMB', nameEn: 'HMB', category: 'performance', timingAr: 'حول التمرين', timingEn: 'Around training', notesAr: 'مستقلب من الليوسين يُدرس لدعم العضلات.', notesEn: 'Leucine metabolite studied for muscle support.' }),
  sup({ id: 'taurine', nameAr: 'تورين', nameEn: 'Taurine', category: 'performance', timingAr: 'قبل التمرين', timingEn: 'Pre-workout', notesAr: 'حمض أميني شائع في خلطات الأداء.', notesEn: 'Amino acid common in performance blends.' }),
  sup({ id: 'tyrosine', nameAr: 'تيروسين', nameEn: 'L-Tyrosine', category: 'performance', timingAr: 'قبل التمرين', timingEn: 'Pre-workout', notesAr: 'حمض أميني مرتبط بالتركيز تحت الضغط.', notesEn: 'Amino acid linked to focus under stress.' }),
  sup({ id: 'betaine-tmg', nameAr: 'بيتايين (TMG)', nameEn: 'Betaine (TMG)', category: 'performance', timingAr: 'يوميًا', timingEn: 'Daily', notesAr: 'مشتق من الشمندر يُدرس لدعم القوة.', notesEn: 'Beet-derived compound studied for strength.' }),
  sup({ id: 'agmatine', nameAr: 'أجماتين', nameEn: 'Agmatine', category: 'performance', timingAr: 'قبل التمرين', timingEn: 'Pre-workout', notesAr: 'يُستخدم في خلطات الضخ والتدفّق.', notesEn: 'Used in pump and blood-flow blends.' }),
  sup({ id: 'arginine', nameAr: 'أرجينين', nameEn: 'L-Arginine', category: 'performance', timingAr: 'قبل التمرين', timingEn: 'Pre-workout', notesAr: 'حمض أميني سليف لأكسيد النيتريك.', notesEn: 'Amino acid precursor to nitric oxide.' }),
  sup({ id: 'nitric-oxide-blend', nameAr: 'خليط أكسيد النيتريك', nameEn: 'Nitric Oxide Blend', category: 'performance', timingAr: 'قبل التمرين', timingEn: 'Pre-workout', notesAr: 'خليط لدعم الضخ وتدفّق الدم.', notesEn: 'Blend to support pump and blood flow.' }),

  // استشفاء — إضافات
  sup({ id: 'glucosamine', nameAr: 'جلوكوزامين', nameEn: 'Glucosamine', category: 'recovery', timingAr: 'مع وجبة', timingEn: 'With a meal', notesAr: 'مركّب شائع لدعم المفاصل.', notesEn: 'Common compound for joint support.' }),
  sup({ id: 'glycine', nameAr: 'جلايسين', nameEn: 'Glycine', category: 'recovery', timingAr: 'قبل النوم', timingEn: 'Before bed', notesAr: 'حمض أميني مرتبط بجودة النوم.', notesEn: 'Amino acid linked to sleep quality.' }),
  sup({ id: 'rhodiola', nameAr: 'روديولا', nameEn: 'Rhodiola Rosea', category: 'recovery', timingAr: 'صباحًا', timingEn: 'Morning', notesAr: 'عشب مُكيّف مرتبط بإدارة الإجهاد.', notesEn: 'Adaptogen herb linked to stress management.' }),
  sup({ id: 'l-theanine', nameAr: 'إل-ثيانين', nameEn: 'L-Theanine', category: 'recovery', timingAr: 'حسب الحاجة', timingEn: 'As needed', notesAr: 'حمض أميني مرتبط بالاسترخاء الذهني.', notesEn: 'Amino acid linked to calm focus.' }),
  sup({ id: '5-htp', nameAr: '5-إتش تي بي', nameEn: '5-HTP', category: 'recovery', timingAr: 'مساءً', timingEn: 'Evening', notesAr: 'سليف للسيروتونين يُستخدم للراحة.', notesEn: 'Serotonin precursor used for relaxation.', cautionAr: 'استشر مختصًا قبل الجمع مع أدوية.', cautionEn: 'Consult a professional before combining with medication.' }),
  sup({ id: 'gaba', nameAr: 'غابا GABA', nameEn: 'GABA', category: 'recovery', timingAr: 'قبل النوم', timingEn: 'Before bed', notesAr: 'ناقل مرتبط بالاسترخاء.', notesEn: 'Compound linked to relaxation.' }),
  sup({ id: 'valerian', nameAr: 'حشيشة الهر', nameEn: 'Valerian Root', category: 'recovery', timingAr: 'قبل النوم', timingEn: 'Before bed', notesAr: 'عشب تقليدي يُستخدم للنوم.', notesEn: 'Traditional herb used for sleep.', cautionAr: 'قد يسبّب النعاس.', cautionEn: 'May cause drowsiness.' }),
  sup({ id: 'curcumin-phytosome', nameAr: 'كركمين فيتوسوم', nameEn: 'Curcumin Phytosome', category: 'recovery', timingAr: 'مع وجبة', timingEn: 'With a meal', notesAr: 'صيغة كركمين عالية الامتصاص.', notesEn: 'High-absorption curcumin form.' }),

  // فيتامينات — إضافات
  sup({ id: 'vitamin-e', nameAr: 'فيتامين E', nameEn: 'Vitamin E', category: 'vitamins', timingAr: 'مع وجبة دسمة', timingEn: 'With a fatty meal', notesAr: 'مضاد أكسدة ذائب في الدهون.', notesEn: 'Fat-soluble antioxidant.' }),
  sup({ id: 'vitamin-k2', nameAr: 'فيتامين K2', nameEn: 'Vitamin K2', category: 'vitamins', timingAr: 'مع وجبة دسمة', timingEn: 'With a fatty meal', notesAr: 'يدعم توجيه الكالسيوم للعظام.', notesEn: 'Supports calcium routing to bone.' }),
  sup({ id: 'vitamin-a', nameAr: 'فيتامين A', nameEn: 'Vitamin A', category: 'vitamins', timingAr: 'مع وجبة دسمة', timingEn: 'With a fatty meal', notesAr: 'يدعم الرؤية والمناعة.', notesEn: 'Supports vision and immunity.' }),
  sup({ id: 'folate', nameAr: 'فولات (B9)', nameEn: 'Folate (B9)', category: 'vitamins', timingAr: 'صباحًا', timingEn: 'Morning', notesAr: 'فيتامين ب مهم لتكوين الخلايا.', notesEn: 'B vitamin important for cell formation.' }),

  // معادن — إضافات
  sup({ id: 'zma', nameAr: 'زنك-مغنيسيوم ZMA', nameEn: 'ZMA', category: 'minerals', timingAr: 'قبل النوم', timingEn: 'Before bed', notesAr: 'خليط زنك ومغنيسيوم وفيتامين B6.', notesEn: 'Zinc, magnesium and vitamin B6 blend.' }),
  sup({ id: 'potassium', nameAr: 'بوتاسيوم', nameEn: 'Potassium', category: 'minerals', timingAr: 'مع وجبة', timingEn: 'With a meal', notesAr: 'معدن مهم لتوازن السوائل.', notesEn: 'Mineral important for fluid balance.' }),
  sup({ id: 'selenium', nameAr: 'سيلينيوم', nameEn: 'Selenium', category: 'minerals', timingAr: 'مع وجبة', timingEn: 'With a meal', notesAr: 'معدن نادر مضاد للأكسدة.', notesEn: 'Trace antioxidant mineral.' }),
  sup({ id: 'chromium', nameAr: 'كروم', nameEn: 'Chromium', category: 'minerals', timingAr: 'مع وجبة', timingEn: 'With a meal', notesAr: 'معدن نادر مرتبط باستقلاب السكر.', notesEn: 'Trace mineral linked to sugar metabolism.' }),
  sup({ id: 'boron', nameAr: 'بورون', nameEn: 'Boron', category: 'minerals', timingAr: 'مع وجبة', timingEn: 'With a meal', notesAr: 'معدن نادر يُدرس لدعم الهرمونات.', notesEn: 'Trace mineral studied for hormone support.' }),
  sup({ id: 'iodine', nameAr: 'يود', nameEn: 'Iodine', category: 'minerals', timingAr: 'مع وجبة', timingEn: 'With a meal', notesAr: 'معدن مهم لوظيفة الغدة الدرقية.', notesEn: 'Mineral important for thyroid function.' }),
  sup({ id: 'copper', nameAr: 'نحاس', nameEn: 'Copper', category: 'minerals', timingAr: 'مع وجبة', timingEn: 'With a meal', notesAr: 'معدن نادر يوازن الزنك.', notesEn: 'Trace mineral that balances zinc.' }),
  sup({ id: 'manganese', nameAr: 'منغنيز', nameEn: 'Manganese', category: 'minerals', timingAr: 'مع وجبة', timingEn: 'With a meal', notesAr: 'معدن نادر يدعم الإنزيمات.', notesEn: 'Trace mineral that supports enzymes.' }),

  // ترطيب — إضافات
  sup({ id: 'coconut-water-powder', nameAr: 'مسحوق ماء جوز الهند', nameEn: 'Coconut Water Powder', category: 'hydration', timingAr: 'حول التمرين', timingEn: 'Around training', notesAr: 'مصدر طبيعي للبوتاسيوم والترطيب.', notesEn: 'Natural potassium and hydration source.' }),
  sup({ id: 'hydration-tablets', nameAr: 'أقراص ترطيب', nameEn: 'Hydration Tablets', category: 'hydration', timingAr: 'أثناء النشاط أو في الحر', timingEn: 'During activity or in heat', notesAr: 'أقراص فوّارة للإلكتروليتات.', notesEn: 'Effervescent electrolyte tablets.' }),

  // هضمي — إضافات
  sup({ id: 'apple-cider-vinegar', nameAr: 'خل التفاح', nameEn: 'Apple Cider Vinegar', category: 'digestive', timingAr: 'قبل الوجبة', timingEn: 'Before a meal', notesAr: 'يُستخدم تقليديًا لدعم الهضم.', notesEn: 'Traditionally used to support digestion.' }),
  sup({ id: 'psyllium-husk', nameAr: 'قشور السيليوم', nameEn: 'Psyllium Husk', category: 'digestive', timingAr: 'مع كثير من الماء', timingEn: 'With plenty of water', notesAr: 'ألياف قابلة للذوبان تدعم الانتظام.', notesEn: 'Soluble fiber that supports regularity.' }),
  sup({ id: 'prebiotics', nameAr: 'بريبيوتيك', nameEn: 'Prebiotics', category: 'digestive', timingAr: 'مع وجبة', timingEn: 'With a meal', notesAr: 'ألياف تغذّي البكتيريا النافعة.', notesEn: 'Fiber that feeds beneficial bacteria.' }),

  // صحة عامة — إضافات
  sup({ id: 'coq10', nameAr: 'إنزيم Q10', nameEn: 'Coenzyme Q10', category: 'general_health', timingAr: 'مع وجبة دسمة', timingEn: 'With a fatty meal', notesAr: 'مركّب مرتبط بطاقة الخلايا.', notesEn: 'Compound linked to cellular energy.' }),
  sup({ id: 'lions-mane', nameAr: 'عرف الأسد', nameEn: "Lion's Mane", category: 'general_health', timingAr: 'يوميًا', timingEn: 'Daily', notesAr: 'فطر يُدرس لدعم الإدراك.', notesEn: 'Mushroom studied for cognitive support.' }),
  sup({ id: 'spirulina', nameAr: 'سبيرولينا', nameEn: 'Spirulina', category: 'general_health', timingAr: 'صباحًا', timingEn: 'Morning', notesAr: 'طحالب خضراء غنية بالعناصر.', notesEn: 'Nutrient-dense green algae.' }),
  sup({ id: 'mct-oil', nameAr: 'زيت MCT', nameEn: 'MCT Oil', category: 'general_health', timingAr: 'صباحًا أو قبل التمرين', timingEn: 'Morning or pre-workout', notesAr: 'دهون متوسطة السلسلة سريعة الطاقة.', notesEn: 'Medium-chain fats for quick energy.' }),
  sup({ id: 'tribulus', nameAr: 'تريبولوس', nameEn: 'Tribulus Terrestris', category: 'general_health', timingAr: 'يوميًا', timingEn: 'Daily', notesAr: 'عشب تقليدي شائع في مكملات الرجال.', notesEn: 'Traditional herb common in men’s supplements.' }),
  sup({ id: 'reds-powder', nameAr: 'مسحوق الفواكه الحمراء', nameEn: 'Reds Powder', category: 'general_health', timingAr: 'صباحًا', timingEn: 'Morning', notesAr: 'مصدر مركّز لمضادات أكسدة الفواكه.', notesEn: 'Concentrated fruit antioxidant source.' }),
  sup({ id: 'inositol', nameAr: 'إينوزيتول', nameEn: 'Inositol', category: 'general_health', timingAr: 'يوميًا', timingEn: 'Daily', notesAr: 'مركّب يُدرس لدعم المزاج والاستقلاب.', notesEn: 'Compound studied for mood and metabolism.' }),
  sup({ id: 'berberine', nameAr: 'بربرين', nameEn: 'Berberine', category: 'general_health', timingAr: 'مع وجبة', timingEn: 'With a meal', notesAr: 'مركّب نباتي يُدرس لاستقلاب السكر.', notesEn: 'Plant compound studied for sugar metabolism.', cautionAr: 'استشر مختصًا قبل الجمع مع أدوية.', cautionEn: 'Consult a professional before combining with medication.' }),
  sup({ id: 'ginseng', nameAr: 'جينسنغ', nameEn: 'Ginseng', category: 'general_health', timingAr: 'صباحًا', timingEn: 'Morning', notesAr: 'عشب تقليدي مرتبط بالطاقة.', notesEn: 'Traditional herb linked to energy.' }),
  sup({ id: 'green-tea-extract', nameAr: 'مستخلص الشاي الأخضر', nameEn: 'Green Tea Extract', category: 'general_health', timingAr: 'صباحًا', timingEn: 'Morning', notesAr: 'مصدر لمضادات الأكسدة والكافيين.', notesEn: 'Source of antioxidants and caffeine.' }),
  sup({ id: 'saffron-extract', nameAr: 'مستخلص الزعفران', nameEn: 'Saffron Extract', category: 'general_health', timingAr: 'يوميًا', timingEn: 'Daily', notesAr: 'مستخلص يُدرس لدعم المزاج.', notesEn: 'Extract studied for mood support.' }),
  sup({ id: 'test-support', nameAr: 'دعم هرموني (زنك-مغنيسيوم)', nameEn: 'Test Support (Zinc-Magnesium)', category: 'general_health', timingAr: 'قبل النوم', timingEn: 'Before bed', notesAr: 'خليط أعشاب ومعادن يُسوّق لدعم الرجال.', notesEn: 'Herb and mineral blend marketed for men’s support.' }),
]

export const supplementMap: Record<string, Supplement> = Object.fromEntries(
  supplementLibrary.map((s) => [s.id, s]),
)

export function getSupplement(id: string): Supplement | undefined {
  return supplementMap[id]
}
