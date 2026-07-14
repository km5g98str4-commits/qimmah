// محرّك الرؤى — مولّد البطاقات النقيّ. يحوّل المقاييس إلى ≤3 بطاقات مرتّبة،
// كلٌّ جملة مُحوَّطة + فعل + وجهة. يحترم قواعد الصدق: تحت العتبة تمتنع، والتقديرات مُعلَّمة.

import type { InsightCard, MetricsBundle, WeeklyInsights } from './types'
import { insightCopy } from '@/data/insightCopy'

const MAX_CARDS = 3

/** يبني البطاقات من المقاييس. الترتيب حسب الأولوية، وأقصى 3. */
export function generateCards(m: MetricsBundle, lang: 'ar' | 'en'): InsightCard[] {
  const cards: InsightCard[] = []
  const copy = insightCopy(lang)

  // — الوزن: أعلى أولوية للأهداف (تنشيف/تضخيم) —
  if (m.weight.status === 'ok' && m.weight.slopeKgPerWeek != null) {
    if (m.weight.plateau) {
      cards.push({ key: 'weight', tone: 'watch', estimate: false, priority: 90, dest: 'progress',
        text: copy.weightPlateau, actionLabel: copy.actions.reviewProgress })
    } else if (m.weight.direction === 'down' || m.weight.direction === 'up') {
      const mag = Math.abs(m.weight.slopeKgPerWeek)
      cards.push({ key: 'weight', tone: 'good', estimate: true, priority: 85, dest: 'progress',
        text: copy.weightTrend(m.weight.direction, mag), actionLabel: copy.actions.trackProgress })
    }
  } else if (m.weight.stale && m.weight.latestKg != null) {
    cards.push({ key: 'weight', tone: 'needsData', estimate: false, priority: 70, dest: 'progress',
      text: copy.staleWeight(m.weight.ageDays ?? 0), actionLabel: copy.actions.logWeight })
  }

  // — القرب من رقم قياسي —
  if (m.pr.status === 'ok' && m.pr.exerciseName) {
    cards.push({ key: 'pr', tone: 'good', estimate: false, priority: 80, dest: 'workout',
      text: copy.nearPr(m.pr.exerciseName), actionLabel: copy.actions.startWorkout })
  }

  // — الالتزام —
  if (m.adherence.status === 'ok' && m.adherence.pct != null) {
    if (m.adherence.pct < 70) {
      cards.push({ key: 'adherence', tone: 'watch', estimate: false, priority: 75, dest: 'workout',
        text: copy.adherenceLow(m.adherence.pct), actionLabel: copy.actions.logWorkout })
    } else {
      cards.push({ key: 'adherence', tone: 'good', estimate: false, priority: 45, dest: 'progress',
        text: copy.adherenceGood(m.adherence.pct), actionLabel: copy.actions.trackProgress })
    }
  }

  // — البروتين —
  if (m.protein.status === 'ok') {
    const good = m.protein.hitDays >= Math.ceil(m.protein.loggedDays * 0.6)
    cards.push({ key: 'protein', tone: good ? 'good' : 'watch', estimate: false, priority: good ? 40 : 72, dest: 'nutrition',
      text: copy.protein(m.protein.hitDays, m.protein.loggedDays), actionLabel: copy.actions.logMeal })
  }

  // — حجم التدريب —
  if (m.volume.status === 'ok' && m.volume.deltaPct != null && Math.abs(m.volume.deltaPct) >= 8) {
    const up = m.volume.deltaPct > 0
    cards.push({ key: 'volume', tone: up ? 'good' : 'info', estimate: true, priority: 55, dest: 'progress',
      text: copy.volume(up, Math.abs(m.volume.deltaPct)), actionLabel: copy.actions.trackProgress })
  }

  // — توزيع العضلات —
  if (m.muscleSplit.status === 'ok' && m.muscleSplit.undertrained.length > 0) {
    const g = m.muscleSplit.undertrained[0]
    cards.push({ key: 'muscleSplit', tone: 'info', estimate: false, priority: 50, dest: 'workout',
      text: copy.muscle(g), actionLabel: copy.actions.addWorkout })
  }

  // — السلسلة —
  if (m.streak.status === 'ok' && m.streak.days >= 2) {
    cards.push({ key: 'streak', tone: 'good', estimate: false, priority: 35, dest: 'workout',
      text: copy.streak(m.streak.days), actionLabel: copy.actions.logToday })
  }

  return cards.sort((a, b) => b.priority - a.priority).slice(0, MAX_CARDS)
}

/** يبني الرؤى الأسبوعية الكاملة من المقاييس. عند غياب كل البطاقات → امتناع صريح. */
export function assembleInsights(metrics: MetricsBundle, lang: 'ar' | 'en', nowMs: number): WeeklyInsights {
  const copy = insightCopy(lang)
  let cards = generateCards(metrics, lang)
  const abstained = cards.length === 0
  if (abstained) {
    cards = [{ key: 'needsData', tone: 'needsData', estimate: false, priority: 0, dest: 'nutrition',
      text: copy.needsData, actionLabel: copy.actions.logNow }]
  }
  return { cards, metrics, abstained, generatedAtMs: nowMs }
}
