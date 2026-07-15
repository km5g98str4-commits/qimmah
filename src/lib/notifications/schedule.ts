// رياضيات الجدولة — خالصة تمامًا (بلا Capacitor، بلا Date.now() ضمنيًا: كل دالة تأخذ
// `now` صراحةً). هذه الطبقة تُختبر مباشرة على Node عبر scripts/notifications-proof.ts.

import type { NotificationPrefs, PlanWeek, PlannedNotification, ReminderKind } from './types'
import { copyFor } from './copy'

// نطاقات معرّفات ثابتة لكل نوع — منفصلة تمامًا عن محرّك التذكير القديم (src/lib/reminders.ts
// يستخدم 1001) فلا يتصادم أي جدول مع الآخر عند التعايش.
const ID_BASE = {
  workoutDay: 3100, // 3100..3106 (يوم لكل weekday)
  restDay: 3200, // 3200..3206
  water: 3300, // 3300..3311 (حتى 12 فتحة/يوم)
  weeklyBrief: 3400, // معرّف واحد
  supplements: 3500, // معرّف واحد
} as const

const MAX_WATER_SLOTS = 12

function parseTime(t: string): { hour: number; minute: number } {
  const [h, m] = t.split(':')
  return { hour: Number(h), minute: Number(m) }
}

/** يحوّل وقتًا "HH:MM" إلى دقائق منذ منتصف الليل — لمقارنات نافذة الهدوء. */
function toMinutes(t: string): number {
  const { hour, minute } = parseTime(t)
  return hour * 60 + minute
}

/**
 * هل الوقت (hour:minute) داخل نافذة الهدوء [start, end)؟ يدعم نافذة تلتف بعد منتصف
 * الليل (مثل start=22:00, end=06:00) بمقارنة دائرية بدل افتراض start<end دائمًا.
 */
export function isWithinQuietHours(hour: number, minute: number, quiet: { start: string; end: string }): boolean {
  const t = hour * 60 + minute
  const s = toMinutes(quiet.start)
  const e = toMinutes(quiet.end)
  if (s === e) return true // نافذة تغطي اليوم كله
  if (s < e) return t >= s && t < e
  return t >= s || t < e // ملتفّة عبر منتصف الليل
}

/** يبني فتحات تذكير الماء داخل نافذة الهدوء بالمعدّل المطلوب (بالساعات)، بحدّ أقصى معقول. */
export function waterSlots(cadenceHours: number, quiet: { start: string; end: string }): { hour: number; minute: number }[] {
  const s = toMinutes(quiet.start)
  const e = toMinutes(quiet.end)
  const span = e > s ? e - s : 24 * 60 - s + e // يدعم النافذة الملتفّة
  const stepMin = Math.max(1, cadenceHours) * 60
  const slots: { hour: number; minute: number }[] = []
  for (let t = s, i = 0; i < span / stepMin && slots.length < MAX_WATER_SLOTS; t += stepMin, i += 1) {
    const mod = ((t % (24 * 60)) + 24 * 60) % (24 * 60)
    slots.push({ hour: Math.floor(mod / 60), minute: mod % 60 })
  }
  return slots
}

/**
 * يبني قائمة الإشعارات المخطَّطة كاملةً من التفضيلات + الأسبوع الحقيقي (planWeek) +
 * أسماء المكمّلات/الأدوية (للنص فقط). دالة خالصة 100% — لا قراءة/كتابة تخزين هنا.
 * masterEnabled=false → قائمة فارغة (لا جدولة إطلاقًا) بصرف النظر عن تفضيلات الأنواع.
 */
export function planNotifications(
  prefs: NotificationPrefs,
  planWeek: PlanWeek,
  supplementItems: string[] = [],
): PlannedNotification[] {
  if (!prefs.masterEnabled) return []
  const out: PlannedNotification[] = []

  // تمرين اليوم / يوم راحة — لكل يوم حقيقي في الخطة (لا خطة محفوظة بعد → لا جدولة لهذين النوعين).
  if (planWeek) {
    for (const day of planWeek) {
      if (day.isRestDay) {
        if (prefs.restDay.enabled) {
          const { hour, minute } = parseTime(prefs.restDay.time)
          const { title, body } = copyFor('restDay')
          out.push({ id: ID_BASE.restDay + day.weekday, kind: 'restDay', title, body, weekday: day.weekday, hour, minute })
        }
      } else if (prefs.workoutDay.enabled) {
        const { hour, minute } = parseTime(prefs.workoutDay.time)
        const { title, body } = copyFor('workoutDay', { dayTitle: day.title })
        out.push({ id: ID_BASE.workoutDay + day.weekday, kind: 'workoutDay', title, body, weekday: day.weekday, hour, minute })
      }
    }
  }

  // الماء — فتحات متكرّرة كل يوم داخل نافذة الهدوء.
  if (prefs.water.enabled) {
    const slots = waterSlots(prefs.water.cadenceHours, prefs.quietHours)
    const { title, body } = copyFor('water')
    slots.forEach((slot, i) => {
      out.push({ id: ID_BASE.water + i, kind: 'water', title, body, weekday: -1, hour: slot.hour, minute: slot.minute })
    })
  }

  // ملخّص الأسبوع — يوم واحد ثابت أسبوعيًا.
  if (prefs.weeklyBrief.enabled) {
    const { hour, minute } = parseTime(prefs.weeklyBrief.time)
    const { title, body } = copyFor('weeklyBrief')
    out.push({ id: ID_BASE.weeklyBrief, kind: 'weeklyBrief', title, body, weekday: prefs.weeklyBrief.weekday, hour, minute })
  }

  // المكمّلات/الأدوية — تذكير يومي واحد؛ يعرض الأسماء إن وُجدت، وإلا نصًا عامًا صادقًا.
  if (prefs.supplements.enabled) {
    const { hour, minute } = parseTime(prefs.supplements.time)
    const { title, body } = copyFor('supplements', { supplementItems })
    out.push({ id: ID_BASE.supplements, kind: 'supplements', title, body, weekday: -1, hour, minute })
  }

  return out
}

/**
 * يحسب طابع الحدوث القادم (ms) لعنصر مجدوَل بالنسبة لـ `now` — يدعم الالتفاف الأسبوعي/
 * اليومي (لو فات الوقت اليوم/هذا الأسبوع، ينتقل للفرصة التالية). weekday=-1 يعني تكرار
 * يومي (الماء/المكمّلات). خالصة تمامًا: تأخذ `now` كمعامل، لا Date.now() ضمنيًا.
 */
export function nextOccurrence(item: PlannedNotification, now: Date): Date {
  const next = new Date(now)
  next.setHours(item.hour, item.minute, 0, 0)

  if (item.weekday === -1) {
    // يومي: إن فات الوقت اليوم، انتقل لغد بنفس الوقت.
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)
    return next
  }

  // أسبوعي: انتقل لليوم المستهدف (0=الأحد…6=السبت) — قد يلتفّ للأسبوع القادم.
  const currentDow = now.getDay()
  let deltaDays = item.weekday - currentDow
  if (deltaDays < 0) deltaDays += 7
  if (deltaDays === 0 && next.getTime() <= now.getTime()) deltaDays = 7 // نفس اليوم لكن الوقت فات → أسبوع كامل
  next.setDate(now.getDate() + deltaDays)
  return next
}

/** أسماء أنواع التذكيرات لأغراض القوائم/الاختبار — لا تُستخدم في نص الإشعار نفسه. */
export function allKinds(): ReminderKind[] {
  return ['workoutDay', 'restDay', 'water', 'weeklyBrief', 'supplements']
}
