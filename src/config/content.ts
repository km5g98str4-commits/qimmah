// كل النصوص التسويقية للأقسام في مكان واحد.
// المشتري يعدّل العناوين والأوصاف من هنا دون لمس المكونات.

export interface SectionCopy {
  eyebrow: string
  title: string
  description: string
  icon: string
}

export const hero = {
  eyebrow: 'قِمّة — نظام تشغيل اللياقة العربي',
  titleTop: 'كل رحلتك في اللياقة',
  titleHighlight: 'في نظام واحد يوصلك القِمّة',
  description:
    'قِمّة يجمع تمارينك، مكملاتك، أدويتك، تغذيتك، وقياساتك في منصة واحدة فاخرة — عربية بالكامل ومصممة للسوق الخليجي. لا أدوات متفرقة بعد اليوم.',
  primaryCta: 'ابدأ الآن',
  secondaryCta: 'شاهد كيف يعمل',
  previewLabel: 'لوحة اليوم',
  weeklyGoalLabel: 'تقدّم الهدف الأسبوعي',
  weeklyGoalPct: 67,
}

export const sectionCopy: Record<string, SectionCopy> = {
  problem: {
    eyebrow: 'المشكلة',
    icon: 'AlertTriangle',
    title: 'متابعتك موزّعة على خمس أدوات... ولا واحدة منها بالعربي',
    description:
      'المتمرّن العربي يقفز بين مذكرة للتمارين، تطبيق للسعرات، ومنبّه للمكملات. النتيجة: فوضى، أرقام ضائعة، وحماس يخفت مع الوقت.',
  },
  solution: {
    eyebrow: 'الحل',
    icon: 'Sparkles',
    title: 'قِمّة — نظام تشغيل واحد لرحلتك كاملة',
    description:
      'كل ما تحتاجه في لوحة واحدة فاخرة: التمارين، المكملات، التغذية، القياسات، والروتين. عربي أولاً، أنيق، وجاهز من أول دقيقة.',
  },
  benefits: {
    eyebrow: 'المزايا',
    icon: 'Zap',
    title: 'لماذا قِمّة تحديدًا؟',
    description:
      'لسنا تطبيقًا مترجمًا ولا أداة عامة. قِمّة مبني من الصفر للمتمرّن العربي ولمن يريد إطلاق منتج لياقة بهويته.',
  },
  audience: {
    eyebrow: 'لمن قِمّة؟',
    icon: 'Users',
    title: 'صُمّم لك إن كنت جادًّا في رحلتك',
    description:
      'قِمّة يناسب فئات واضحة — ولأننا صادقون، نخبرك أيضًا متى لا يكون الخيار الأنسب لك.',
  },
  faq: {
    eyebrow: 'الأسئلة الشائعة',
    icon: 'HelpCircle',
    title: 'أسئلة يطرحها الجميع قبل البدء',
    description: 'كل ما تحتاج معرفته عن قِمّة قبل أن تنطلق.',
  },
  dashboard: {
    eyebrow: 'لوحة التحكم',
    icon: 'BarChart3',
    title: 'نظرة واحدة تكشف يومك كاملاً',
    description:
      'مؤشراتك الأساسية، تقدّمك، وكل أقسامك — مرتّبة بأناقة وسهلة القراءة على الجوال.',
  },
  workout: {
    eyebrow: 'متابعة التمارين',
    icon: 'Dumbbell',
    title: 'سجّل كل مجموعة وتكرار ووزن',
    description:
      'تابع تقدّمك في كل تمرين، وعلّم ما أنجزته، واعرف بالضبط أين وصلت في برنامجك اليومي.',
  },
  supplements: {
    eyebrow: 'المكملات والأدوية',
    icon: 'Pill',
    title: 'جرعاتك في وقتها الصحيح',
    description:
      'افصل بين المكملات والأدوية، وتابع التوقيت والجرعة، ولا تنسَ أي موعد مهم.',
  },
  meals: {
    eyebrow: 'التغذية والماكروز',
    icon: 'Salad',
    title: 'تحكّم كامل في سعراتك وماكروزك',
    description:
      'سجّل وجباتك واحسب البروتين والكربوهيدرات والدهون، وتابع اقترابك من أهدافك اليومية.',
  },
  metrics: {
    eyebrow: 'قياسات الجسم',
    icon: 'Ruler',
    title: 'تابع تغيّر جسمك بالأرقام',
    description:
      'الوزن، نسبة الدهون، الكتلة العضلية، والمحيطات — كلها موثّقة بتغيّرها عبر الزمن.',
  },
  routine: {
    eyebrow: 'الروتين الأسبوعي',
    icon: 'CalendarDays',
    title: 'خطّط أسبوعك بذكاء',
    description:
      'وزّع أيامك بين الدفع والسحب والأرجل والكارديو والراحة, وتابع التزامك خلال الأسبوع.',
  },
  customization: {
    eyebrow: 'التخصيص',
    icon: 'Sparkles',
    title: 'اجعله علامتك أنت',
    description:
      'القالب مبني ليُخصَّص بسرعة — غيّر الألوان، النصوص، والبيانات من ملفات مركزية دون لمس الكود.',
  },
  pricing: {
    eyebrow: 'الأسعار',
    icon: 'Target',
    title: 'ابدأ اليوم، طوّر متى ما احتجت',
    description:
      'خطط مرنة تناسب الأفراد والمدربين. كل الأسعار قابلة للتعديل من ملف واحد.',
  },
}

// نقاط قسم التخصيص
export const customizationPoints: string[] = [
  'كل النصوص والبيانات من ملفات config وdata',
  'دعم RTL/LTR وتبديل العربية والإنجليزية لاحقًا',
  'ألوان وهوية قابلة للتبديل بسطر واحد',
  'جاهز للنشر على Netlify وVercel',
]
export const customizationSwatchLabel = 'اختر لون الهوية'

// CTA الختامي (قسم مستقل قبل الفوتر)
export const finalCta = {
  eyebrow: 'ابدأ اليوم',
  title: 'رحلتك نحو القِمّة تبدأ بقرار واحد',
  description:
    'انقل متابعتك كلها إلى نظام واحد فاخر يفهم لغتك. اختر باقتك وابدأ الآن — والتطوير متاح متى ما احتجت.',
  primary: 'ابدأ الآن',
  secondary: 'اطّلع على الأسعار',
}

// تسميات متفرقة مشتركة
export const labels = {
  dashboard: {
    weightProgress: 'تقدّم الوزن',
    last8Weeks: 'آخر 8 أسابيع',
  },
  meals: {
    todayTargets: 'أهداف اليوم',
    todayMeals: 'وجبات اليوم',
    protein: 'بروتين',
    carbs: 'كارب',
    fats: 'دهون',
  },
  workout: {
    completed: 'مكتمل',
  },
  supplements: {
    dose: 'الجرعة',
    timing: 'التوقيت',
    supplementBadge: 'مكمل',
    medicationBadge: 'دواء',
  },
  routine: {
    progressPrefix: 'أنجزت',
    progressMid: 'من',
    progressSuffix: 'أيام',
  },
}
