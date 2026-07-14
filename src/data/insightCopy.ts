export type InsightLang = 'ar' | 'en'

const number = (value: number, lang: InsightLang) => lang === 'ar' ? value.toLocaleString('ar-EG') : String(value)

export function insightCopy(lang: InsightLang) {
  const ar = lang === 'ar'
  const n = (value: number) => number(value, lang)
  return {
    ariaLabel: ar ? 'رؤى الأسبوع' : 'Weekly insights',
    progressTitle: ar ? 'رؤى الأسبوع' : 'This week’s insights',
    todayTitle: ar ? 'رؤى الأسبوع' : 'This week',
    weightPlateau: ar ? 'يبدو أن وزنك ثابت منذ ٣ أسابيع أو أكثر ضمن نطاقك.' : 'Your weight looks flat for 3+ weeks within your band.',
    weightTrend: (direction: 'down' | 'up', magnitude: number) => ar
      ? `يبدو أن وزنك ${direction === 'down' ? 'ينزل' : 'يرتفع'} ~${n(magnitude)} كجم/أسبوع (تقديري).`
      : `Your weight looks like it’s ${direction === 'down' ? 'dropping' : 'rising'} ~${n(magnitude)} kg/week (est.).`,
    staleWeight: (days: number) => ar ? `آخر قياس وزن قبل ${n(days)} يومًا — قِس لتحديث اتجاهك.` : `Last weight ${n(days)} days ago — measure to refresh your trend.`,
    nearPr: (name: string) => ar ? `يبدو أنك قريب من رقم قياسي في ${name}.` : `You look close to a PR in ${name}.`,
    adherenceLow: (pct: number) => ar ? `التزامك هذا الأسبوع ${n(pct)}٪ — أقلّ من خطتك.` : `This week’s consistency is ${n(pct)}% — below your plan.`,
    adherenceGood: (pct: number) => ar ? `التزامك هذا الأسبوع ${n(pct)}٪ — واصل.` : `This week’s consistency is ${n(pct)}% — keep it up.`,
    protein: (hit: number, logged: number) => ar ? `حقّقت هدف البروتين في ${n(hit)} من ${n(logged)} أيام مُسجّلة.` : `You hit your protein goal on ${n(hit)} of ${n(logged)} logged days.`,
    volume: (up: boolean, pct: number) => ar ? `يبدو أن حجم تدريبك ${up ? 'ارتفع' : 'انخفض'} ~${n(pct)}٪ عن الأسبوع الماضي (تقديري).` : `Your training volume looks ${up ? 'up' : 'down'} ~${n(pct)}% vs last week (est.).`,
    muscle: (group: string) => ar ? `يبدو أنك لم تُدرّب ${group} المخطّط لها هذا الأسبوع.` : `It looks like you have not trained planned ${group} this week.`,
    streak: (days: number) => ar ? `سلسلتك ${n(days)} أيام متتالية — حافظ عليها.` : `Your streak is ${n(days)} days — keep it going.`,
    needsData: ar ? 'نحتاج المزيد من البيانات لقراءة أسبوعك — واصل التسجيل.' : 'We need more data to read your week — keep logging.',
    actions: {
      reviewProgress: ar ? 'راجع التقدّم' : 'Review progress',
      trackProgress: ar ? 'تابع التقدّم' : 'Track progress',
      logWeight: ar ? 'قِس وزنك' : 'Log weight',
      startWorkout: ar ? 'ابدأ التمرين' : 'Start workout',
      logWorkout: ar ? 'سجّل تمرينك' : 'Log a workout',
      logMeal: ar ? 'سجّل وجبة' : 'Log a meal',
      addWorkout: ar ? 'أضف تمرينًا' : 'Add a workout',
      logToday: ar ? 'سجّل اليوم' : 'Log today',
      logNow: ar ? 'سجّل الآن' : 'Log now',
    },
  }
}
