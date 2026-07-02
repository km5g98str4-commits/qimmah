import type { Lang } from '@/lib/appPreferences'

// مفاتيح i18n خاصّة بميزة «مهام اليوم» فقط (لا نلمس قواميس i18n العامة).
// عربي خليجي واضح + إنجليزي.

export interface TodoStrings {
  title: string
  /** لاحقة العدّاد: `${n} ${remainingSuffix}` — مثال: «٣ متبقّية». */
  remainingSuffix: string
  allDone: string
  empty: string
  addCta: string // نص زرّ الإضافة السريعة
  inputPlaceholder: string
  addAria: string
  fieldAria: string
  saveAria: string
  cancelAria: string
  toggleAria: string
  deleteAria: string
  expand: string
  collapse: string
  fromYesterday: string // وسم المهمّة المُرحّلة
}

const ar: TodoStrings = {
  title: 'مهام اليوم',
  remainingSuffix: 'متبقّية',
  allDone: 'خلّصت كل مهامك اليوم 🎉',
  empty: 'ما عندك مهام لليوم — أضف أول مهمة.',
  addCta: 'إضافة مهمة',
  inputPlaceholder: 'اكتب المهمة ثم اضغط Enter…',
  addAria: 'أضف مهمة جديدة',
  fieldAria: 'نص المهمة الجديدة',
  saveAria: 'حفظ المهمة',
  cancelAria: 'إلغاء',
  toggleAria: 'بدّل حالة الإنجاز',
  deleteAria: 'حذف المهمة',
  expand: 'عرض الكل',
  collapse: 'طيّ',
  fromYesterday: 'من الأمس',
}

const en: TodoStrings = {
  title: "Today's tasks",
  remainingSuffix: 'left',
  allDone: 'All done for today 🎉',
  empty: 'No tasks yet — add your first one.',
  addCta: 'Add task',
  inputPlaceholder: 'Type a task, then press Enter…',
  addAria: 'Add a new task',
  fieldAria: 'New task text',
  saveAria: 'Save task',
  cancelAria: 'Cancel',
  toggleAria: 'Toggle done',
  deleteAria: 'Delete task',
  expand: 'Show all',
  collapse: 'Collapse',
  fromYesterday: 'from yesterday',
}

export const todoStrings: Record<Lang, TodoStrings> = { ar, en }
