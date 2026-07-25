// نصوص الإشعارات — لهجة سعودية بيضاء (docs/content/DIALECT-TONE-GUIDE.md)، فعل أمر أولًا، نبرة ودّية لا إلحاح.
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
    title: 'يوم راحة — خلّ جسمك يرتاح',
    body: 'مشي خفيف أو إطالة تكفي اليوم. الاستشفاء جزء من التقدّم.',
  }
}

export function waterCopy(): NotificationCopy {
  return {
    title: 'اشرب كوب ماء الحين',
    body: 'خطوة صغيرة تكمل هدفك اليومي.',
  }
}

export function weeklyBriefCopy(): NotificationCopy {
  return {
    title: 'شوف ملخّص أسبوعك',
    body: 'تقدّمك جاهز — أرقام صادقة بدون مبالغة.',
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
    title: 'خلصت الراحة',
    body: 'جاهز للمجموعة الجاية؟ ارجع لتمرينك.',
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
