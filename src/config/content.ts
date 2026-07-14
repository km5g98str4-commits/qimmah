// كل نصوص الصفحة في مكان واحد.
// عدّل العناوين والأوصاف من هنا دون لمس المكونات.

export interface SectionCopy {
  eyebrow: string
  title: string
  description: string
  icon: string
}

export const hero = {
  eyebrow: 'تطبيقك الشخصي للتمرين والتغذية والمتابعة',
  titleTop: 'كل رحلتك الرياضية',
  titleHighlight: 'في مكان واحد',
  description:
    'قِمّة يجمع تمارينك، أكلك، مكملاتك، أدويتك، قياساتك، والتزامك اليومي — مبني على حالتك، يعمل على جهازك، وتفتحه من جوالك بأي وقت.',
  primaryCta: 'افتح خطتي',
  secondaryCta: 'شوف الجدول',
  previewLabel: 'خطتك اليوم',
  weeklyGoalLabel: 'تقدّمك هذا الأسبوع',
  weeklyGoalPct: 67,
}

export const sectionCopy: Record<string, SectionCopy> = {
  goal: {
    eyebrow: 'هدفك الحالي',
    icon: 'Target',
    title: 'هدف واحد واضح تعمل عليه',
    description: 'هدفك مكتوب أمامك دائمًا — عشان كل تمرين ووجبة تكون لها معنى.',
  },
  profile: {
    eyebrow: 'بياناتك الأساسية',
    icon: 'Ruler',
    title: 'حالتك الحالية بالأرقام',
    description: 'العمر، الطول، الوزن، والوزن الهدف — الأساس اللي تُبنى عليه خطتك.',
  },
  routine: {
    eyebrow: 'جدولك الأسبوعي',
    icon: 'CalendarDays',
    title: 'اعرف ما ينتظرك كل يوم',
    description: 'ترتيب أيامك بين تمرين وراحة، عشان تمشي على نظام واضح بدون حيرة.',
  },
  workout: {
    eyebrow: 'تمارين القوة',
    icon: 'Dumbbell',
    title: 'تمارين اليوم جاهزة قدامك',
    description:
      'كل تمرين بمجموعاته وتكراراته ووزنه — تتابعها وأنت بالنادي وتعلّم اللي خلصته.',
  },
  meals: {
    eyebrow: 'خطة الأكل',
    icon: 'Salad',
    title: 'أكلك ليومك مرتّب وواضح',
    description: 'وجباتك وسعراتك وبروتينك — اعرف ماذا تأكل ومتى، بلا تعقيد.',
  },
  supplements: {
    eyebrow: 'المكملات والأدوية',
    icon: 'Pill',
    title: 'ما تتناوله، كميته، وموعده',
    description: 'مكملاتك وأدويتك بجرعاتها وأوقاتها — واضحة عشان ما تنسى شي مهم.',
  },
  commitment: {
    eyebrow: 'مفاتيح الالتزام',
    icon: 'CheckCircle2',
    title: 'العادات اللي توصلك لهدفك',
    description: 'مبادئ بسيطة تذكّرك بالأهم كل يوم — لأن الالتزام أهم من الكمال.',
  },
  customization: {
    eyebrow: 'خصّص صفحتك',
    icon: 'Sparkles',
    title: 'اجعل الصفحة على ذوقك',
    description: 'غيّر اسمك، هدفك، وألوان صفحتك — وتنعكس مباشرة على خطتك.',
  },

  // مفاتيح أقسام إضافية محفوظة للقالب (غير معروضة في الصفحة الشخصية)
  metrics: {
    eyebrow: 'قياساتك',
    icon: 'Ruler',
    title: 'تابع تغيّر جسمك بالأرقام',
    description: 'وزنك، نسبة دهونك، ومحيطاتك — تعرف اتجاه كل رقم مع الوقت.',
  },
  dashboard: {
    eyebrow: 'نظرة اليوم',
    icon: 'BarChart3',
    title: 'نظرة سريعة على يومك',
    description: 'أهم مؤشراتك في مكان واحد، سهلة القراءة على الجوال.',
  },
}

// مفاتيح الالتزام (تُعرض داخل قسم الالتزام والتخصيص)
export const customizationPoints: string[] = [
  'كل بيانات الصفحة تتعدّل من مكان واحد',
  'عربية بالكامل وتُقرأ من اليمين لليسار',
  'مريحة على الجوال — تفتحها بأي وقت',
  'ألوان وهوية تغيّرها بنفسك',
]
export const customizationSwatchLabel = 'اختر لون صفحتك'

// تنبيه صحي بسيط
export const healthNotice = {
  title: 'تنبيه صحي بسيط',
  body: 'هذه الصفحة لتنظيم خطتك الشخصية فقط، وليست بديلًا عن استشارة طبية. قبل تغيير تمارينك أو أكلك أو أي دواء أو مكمّل، راجع مختصًّا — خصوصًا إن كانت لديك حالة صحية.',
}

// CTA ختامي (محفوظ للقالب — غير معروض في الصفحة الشخصية الحالية)
export const finalCta = {
  eyebrow: 'ابدأ الآن',
  title: 'خطتك جاهزة — افتحها وابدأ يومك',
  description: 'كل ما تحتاجه في مكان واحد مبني على حالتك، تفتحه من جوالك في أي وقت.',
  primary: 'افتح خطتي',
  secondary: 'شوف الجدول',
}

// تسميات متفرقة مشتركة
export const labels = {
  goal: {
    current: 'الوضع الحالي',
    target: 'الهدف',
    deadline: 'الموعد',
    progress: 'نسبة الإنجاز',
  },
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
