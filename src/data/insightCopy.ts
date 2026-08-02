export type InsightLang = 'ar' | 'en'

const number = (value: number, lang: InsightLang) => lang === 'ar' ? value.toLocaleString('ar-EG') : String(value)

// «خلاصة أسبوعك» — الاسم المعتمد للقسم (كان «رؤى الأسبوع»؛ أعيدت تسميته بقرار المالك).
// كل خلاصة: جملة واضحة باللهجة + فعل مباشر. التحوّطات تبقى: «شكله/تقريبي» = تقدير لا قياس.
export function insightCopy(lang: InsightLang) {
  const ar = lang === 'ar'
  const n = (value: number) => number(value, lang)
  return {
    ariaLabel: ar ? 'خلاصة أسبوعك' : 'Your week in short',
    progressTitle: ar ? 'خلاصة أسبوعك' : 'Your week in short',
    todayTitle: ar ? 'خلاصة أسبوعك' : 'This week',
    weightPlateau: ar ? 'شكله وزنك ثابت من ٣ أسابيع أو أكثر ضمن نطاقك.' : 'Your weight looks flat for 3+ weeks within your band.',
    weightTrend: (direction: 'down' | 'up', magnitude: number) => ar
      ? `شكله وزنك ${direction === 'down' ? 'ينزل' : 'يزيد'} ~${n(magnitude)} كجم/أسبوع (تقريبي).`
      : `Your weight looks like it’s ${direction === 'down' ? 'dropping' : 'rising'} ~${n(magnitude)} kg/week (est.).`,
    staleWeight: (days: number) => ar ? `آخر قياس وزن من ${n(days)} يوم — سجّل وزنك عشان يتحدّث اتجاهك.` : `Last weight was ${n(days)} days ago — log one to refresh your trend.`,
    nearPr: (name: string) => ar ? `شكلك قريب من رقم قياسي في ${name}.` : `You look close to a PR in ${name}.`,
    adherenceLow: (pct: number) => ar ? `التزامك هذا الأسبوع ${n(pct)}٪ — أقل من خطتك.` : `This week’s consistency is ${n(pct)}% — below your plan.`,
    adherenceGood: (pct: number) => ar ? `التزامك هذا الأسبوع ${n(pct)}٪ — كفو، واصل.` : `This week’s consistency is ${n(pct)}% — nice, keep it up.`,
    protein: (hit: number, logged: number) => ar ? `وصلت هدف البروتين في ${n(hit)} من ${n(logged)} أيام مسجّلة.` : `You hit your protein goal on ${n(hit)} of ${n(logged)} logged days.`,
    volume: (up: boolean, pct: number) => ar ? `شكله حجم تدريبك ${up ? 'زاد' : 'نزل'} ~${n(pct)}٪ عن الأسبوع الماضي (تقريبي).` : `Your training volume looks ${up ? 'up' : 'down'} ~${n(pct)}% vs last week (est.).`,
    muscle: (group: string) => ar ? `شكلك ما درّبت ${group} اللي في خطتك هذا الأسبوع.` : `Looks like you haven’t trained planned ${group} this week.`,
    streak: (days: number) => ar ? `سلسلتك ${n(days)} أيام متتالية — لا تكسرها.` : `Your streak is ${n(days)} days — don’t break it.`,
    needsData: ar ? 'نحتاج بيانات أكثر عشان نقرأ أسبوعك — استمر بالتسجيل.' : 'We need more data to read your week — keep logging.',
    actions: {
      reviewProgress: ar ? 'شوف تقدّمك' : 'See progress',
      trackProgress: ar ? 'تابع تقدّمك' : 'Track progress',
      logWeight: ar ? 'سجّل وزنك' : 'Log weight',
      startWorkout: ar ? 'ابدأ التمرين' : 'Start workout',
      logWorkout: ar ? 'سجّل تمرينك' : 'Log a workout',
      logMeal: ar ? 'سجّل أكلك' : 'Log your food',
      addWorkout: ar ? 'أضف تمرين' : 'Add a workout',
      logToday: ar ? 'سجّل اليوم' : 'Log today',
      logNow: ar ? 'سجّل الحين' : 'Log now',
    },
  }
}
