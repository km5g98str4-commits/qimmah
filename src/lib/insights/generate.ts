// محرّك الرؤى — مولّد البطاقات النقيّ. يحوّل المقاييس إلى ≤3 بطاقات مرتّبة،
// كلٌّ جملة مُحوَّطة + فعل + وجهة. يحترم قواعد الصدق: تحت العتبة تمتنع، والتقديرات مُعلَّمة.

import type { InsightCard, MetricsBundle, WeeklyInsights } from './types'

const MAX_CARDS = 3
const numAr = (n: number, lang: 'ar' | 'en') => (lang === 'ar' ? n.toLocaleString('ar-EG') : String(n))

/** يبني البطاقات من المقاييس. الترتيب حسب الأولوية، وأقصى 3. */
export function generateCards(m: MetricsBundle, lang: 'ar' | 'en'): InsightCard[] {
  const cards: InsightCard[] = []
  const N = (n: number) => numAr(n, lang)
  const ar = (a: string, e: string, _l?: unknown) => (lang === 'ar' ? a : e)

  // — الوزن: أعلى أولوية للأهداف (تنشيف/تضخيم) —
  if (m.weight.status === 'ok' && m.weight.slopeKgPerWeek != null) {
    if (m.weight.plateau) {
      cards.push({ key: 'weight', tone: 'watch', estimate: false, priority: 90, dest: 'progress',
        text: ar(`يبدو أن وزنك ثابت منذ ٣ أسابيع أو أكثر ضمن نطاقك.`, `Your weight looks flat for 3+ weeks within your band.`, lang),
        actionLabel: ar('راجع التقدّم', 'Review progress') })
    } else if (m.weight.direction === 'down' || m.weight.direction === 'up') {
      const mag = Math.abs(m.weight.slopeKgPerWeek)
      cards.push({ key: 'weight', tone: 'good', estimate: true, priority: 85, dest: 'progress',
        text: ar(`يبدو أن وزنك ${m.weight.direction === 'down' ? 'ينزل' : 'يرتفع'} ~${N(mag)} كجم/أسبوع (تقديري).`,
          `Your weight looks like it’s ${m.weight.direction === 'down' ? 'dropping' : 'rising'} ~${N(mag)} kg/week (est.).`, lang),
        actionLabel: ar('تابع التقدّم', 'Track progress') })
    }
  } else if (m.weight.stale && m.weight.latestKg != null) {
    cards.push({ key: 'weight', tone: 'needsData', estimate: false, priority: 70, dest: 'progress',
      text: ar(`آخر قياس وزن قبل ${N(m.weight.ageDays ?? 0)} يومًا — قِس لتحديث اتجاهك.`, `Last weight ${N(m.weight.ageDays ?? 0)} days ago — measure to refresh your trend.`, lang),
      actionLabel: ar('قِس وزنك', 'Log weight') })
  }

  // — القرب من رقم قياسي —
  if (m.pr.status === 'ok' && m.pr.exerciseNameAr) {
    cards.push({ key: 'pr', tone: 'good', estimate: false, priority: 80, dest: 'workout',
      text: ar(`يبدو أنك قريب من رقم قياسي في ${m.pr.exerciseNameAr}.`, `You look close to a PR in ${m.pr.exerciseNameAr}.`, lang),
      actionLabel: ar('ابدأ التمرين', 'Start workout') })
  }

  // — الالتزام —
  if (m.adherence.status === 'ok' && m.adherence.pct != null) {
    if (m.adherence.pct < 70) {
      cards.push({ key: 'adherence', tone: 'watch', estimate: false, priority: 75, dest: 'workout',
        text: ar(`التزامك هذا الأسبوع ${N(m.adherence.pct)}٪ — أقلّ من خطتك.`, `This week’s consistency is ${N(m.adherence.pct)}% — below your plan.`, lang),
        actionLabel: ar('سجّل تمرينك', 'Log a workout') })
    } else {
      cards.push({ key: 'adherence', tone: 'good', estimate: false, priority: 45, dest: 'progress',
        text: ar(`التزامك هذا الأسبوع ${N(m.adherence.pct)}٪ — واصل.`, `This week’s consistency is ${N(m.adherence.pct)}% — keep it up.`, lang),
        actionLabel: ar('تابع التقدّم', 'Track progress') })
    }
  }

  // — البروتين —
  if (m.protein.status === 'ok') {
    const good = m.protein.hitDays >= Math.ceil(m.protein.loggedDays * 0.6)
    cards.push({ key: 'protein', tone: good ? 'good' : 'watch', estimate: false, priority: good ? 40 : 72, dest: 'nutrition',
      text: ar(`حقّقت هدف البروتين في ${N(m.protein.hitDays)} من ${N(m.protein.loggedDays)} أيام مُسجّلة.`,
        `You hit your protein goal on ${N(m.protein.hitDays)} of ${N(m.protein.loggedDays)} logged days.`, lang),
      actionLabel: ar('سجّل وجبة', 'Log a meal') })
  }

  // — حجم التدريب —
  if (m.volume.status === 'ok' && m.volume.deltaPct != null && Math.abs(m.volume.deltaPct) >= 8) {
    const up = m.volume.deltaPct > 0
    cards.push({ key: 'volume', tone: up ? 'good' : 'info', estimate: true, priority: 55, dest: 'progress',
      text: ar(`يبدو أن حجم تدريبك ${up ? 'ارتفع' : 'انخفض'} ~${N(Math.abs(m.volume.deltaPct))}٪ عن الأسبوع الماضي (تقديري).`,
        `Your training volume looks ${up ? 'up' : 'down'} ~${N(Math.abs(m.volume.deltaPct))}% vs last week (est.).`, lang),
      actionLabel: ar('تابع التقدّم', 'Track progress') })
  }

  // — توزيع العضلات —
  if (m.muscleSplit.status === 'ok' && m.muscleSplit.undertrained.length > 0) {
    const g = m.muscleSplit.undertrained[0]
    cards.push({ key: 'muscleSplit', tone: 'info', estimate: false, priority: 50, dest: 'workout',
      text: ar(`يبدو أنك لم تُدرّب ${g} هذا الأسبوع.`, `You haven’t trained ${g} this week.`, lang),
      actionLabel: ar('أضف تمرينًا', 'Add a workout') })
  }

  // — السلسلة —
  if (m.streak.status === 'ok' && m.streak.days >= 2) {
    cards.push({ key: 'streak', tone: 'good', estimate: false, priority: 35, dest: 'workout',
      text: ar(`سلسلتك ${N(m.streak.days)} أيام متتالية — حافظ عليها.`, `Your streak is ${N(m.streak.days)} days — keep it going.`, lang),
      actionLabel: ar('سجّل اليوم', 'Log today') })
  }

  return cards.sort((a, b) => b.priority - a.priority).slice(0, MAX_CARDS)
}

/** يبني الرؤى الأسبوعية الكاملة من المقاييس. عند غياب كل البطاقات → امتناع صريح. */
export function assembleInsights(metrics: MetricsBundle, lang: 'ar' | 'en', nowMs: number): WeeklyInsights {
  const ar = (a: string, e: string, _l?: unknown) => (lang === 'ar' ? a : e)
  let cards = generateCards(metrics, lang)
  const abstained = cards.length === 0
  if (abstained) {
    cards = [{ key: 'needsData', tone: 'needsData', estimate: false, priority: 0, dest: 'nutrition',
      text: ar('نحتاج المزيد من البيانات لقراءة أسبوعك — واصل التسجيل.', 'We need more data to read your week — keep logging.', lang),
      actionLabel: ar('سجّل الآن', 'Log now') }]
  }
  return { cards, metrics, abstained, generatedAtMs: nowMs }
}
