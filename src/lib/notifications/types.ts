// أنواع محرّك الإشعارات المحلية — لا استيراد لـ Capacitor هنا (طبقة خالصة قابلة للاختبار
// على Node بلا متصفح/منصّة أصلية).

/** أنواع التذكيرات المدعومة. */
export type ReminderKind =
  | 'workoutDay'
  | 'restDay'
  | 'water'
  | 'weeklyBrief'
  | 'supplements'

/** نافذة الهدوء — لا إشعارات خارجها (خصوصًا لتذكيرات الماء المتكرّرة). "HH:MM" 24 ساعة. */
export interface QuietHours {
  start: string
  end: string
}

export interface WaterPrefs {
  enabled: boolean
  /** كل كم ساعة (1–6). */
  cadenceHours: number
}

export interface WeeklyBriefPrefs {
  enabled: boolean
  /** 0=الأحد … 6=السبت (اصطلاح JS Date#getDay القياسي؛ يُحوَّل عند حدود المنصّة فقط). */
  weekday: number
  time: string
}

export interface SimpleTimePrefs {
  enabled: boolean
  time: string
}

/** تفضيلات الإشعارات — مملوكة لكل حساب (لا مشتركة بين الحسابات على نفس الجهاز). */
export interface NotificationPrefs {
  version: 1
  /** المفتاح الرئيسي: مطفأ يعني عدم جدولة أي شيء إطلاقًا مهما كانت تفضيلات الأنواع. */
  masterEnabled: boolean
  quietHours: QuietHours
  workoutDay: SimpleTimePrefs
  restDay: SimpleTimePrefs
  water: WaterPrefs
  weeklyBrief: WeeklyBriefPrefs
  supplements: SimpleTimePrefs
}

/** يوم أسبوع محسوب من خطة المستخدم الحقيقية — ناتج readPlanWeek لا بيانات وهمية. */
export interface PlanWeekday {
  /** 0=الأحد … 6=السبت. */
  weekday: number
  isRestDay: boolean
  /** عنوان اليوم من الخطة الحقيقية (مثل «دفع — صدر وكتف وترايسبس») — يُستخدم في نص الإشعار. */
  title: string | null
}

/** عنصر إشعار مجدوَل — ناتج خالص من schedule.ts، يُنفَّذ لاحقًا عبر engine.ts (LocalNotifications). */
export interface PlannedNotification {
  /** معرّف رقمي ثابت (نطاق مخصّص لكل نوع — يمنع أي تصادم مع محرّك التذكير القديم src/lib/reminders.ts). */
  id: number
  kind: ReminderKind
  title: string
  body: string
  /** 0=الأحد…6=السبت (JS)؛ يُحوَّل إلى اصطلاح Capacitor (1=الأحد…7=السبت) عند حدود المنصّة فقط. */
  weekday: number
  hour: number
  minute: number
}

/** ناتج readPlanWeek — الأيام السبعة الحقيقية من خطة المستخدم، أو null إن لم توجد خطة محفوظة بعد. */
export type PlanWeek = PlanWeekday[] | null
