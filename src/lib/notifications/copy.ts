// نصوص الإشعارات — عربي فصيح مبسّط، فعل أمر أولًا، نبرة دافئة لا إلحاح (PDF §02).
// دالة خالصة لكل نوع: تُبنى وقت الجدولة من عنوان اليوم الحقيقي عند توفّره.

import type { ReminderKind } from './types'

export interface NotificationCopy {
  title: string
  body: string
}

export function workoutDayCopy(dayTitle: string | null): NotificationCopy {
  return {
    title: 'ابدأ تمرين اليوم',
    body: dayTitle ? `خطتك جاهزة · ${dayTitle}` : 'خطتك جاهزة — افتحها وابدأ.',
  }
}

export function restDayCopy(): NotificationCopy {
  return {
    title: 'يوم راحة — اعتنِ بجسمك',
    body: 'مشي خفيف أو إطالة تكفي اليوم. الاستشفاء جزء من التقدّم.',
  }
}

export function waterCopy(): NotificationCopy {
  return {
    title: 'اشرب كوب ماء الآن',
    body: 'خطوة صغيرة تكمل هدفك اليومي.',
  }
}

export function weeklyBriefCopy(): NotificationCopy {
  return {
    title: 'راجع ملخّص أسبوعك',
    body: 'تقدّمك جاهز — أرقام صادقة بلا مبالغة.',
  }
}

export function supplementsCopy(items: string[]): NotificationCopy {
  return {
    title: 'خذ مكمّلاتك وأدويتك',
    body: items.length > 0 ? `موعد: ${items.slice(0, 3).join('، ')}` : 'موعد جرعتك اليوم.',
  }
}

/** (P5) نهاية الراحة داخل الجلسة — النسخة الثنائية الفعلية في notificationCopy.ts. */
export function restEndCopy(): NotificationCopy {
  return {
    title: 'انتهت الراحة',
    body: 'جاهز للمجموعة التالية؟ ارجع لتمرينك.',
  }
}

/** يبني نصّ إشعار لأيّ نوع — نقطة دخول واحدة يستخدمها schedule.ts. */
export function copyFor(kind: ReminderKind, ctx: { dayTitle?: string | null; supplementItems?: string[] } = {}): NotificationCopy {
  switch (kind) {
    case 'workoutDay':
      return workoutDayCopy(ctx.dayTitle ?? null)
    case 'restDay':
      return restDayCopy()
    case 'water':
      return waterCopy()
    case 'weeklyBrief':
      return weeklyBriefCopy()
    case 'supplements':
      return supplementsCopy(ctx.supplementItems ?? [])
    case 'restEnd':
      return restEndCopy()
  }
}
