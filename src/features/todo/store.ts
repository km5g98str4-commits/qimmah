// مخزن «مهام اليوم» — قائمة مهام يومية خفيفة، محلية، ومنعزلة لكل حساب.
//
// النطاق لكل حساب: المفتاح يحمل لاحقة صاحب الحساب (`qimmah:todo:v1:<userId>`
// للمسجّل، و`qimmah:todo:v1:guest` للضيف)، فلا يرى حساب مهام حساب آخر على نفس الجهاز.
//
// قاعدة التدوير (Rollover) المختارة والموثّقة:
//   • مهام اليوم تخصّ «اليوم» عبر ختم التاريخ المحلي (YYYY-MM-DD).
//   • عند تغيّر اليوم: تُحذف المهام المنجزة (أنهيتَها → لا داعي لحملها)، وتُرحّل
//     المهام غير المنجزة إلى اليوم الجديد مع وسمها «منقولة من الأمس» (rolledOver)
//     لتبقى ظاهرة لكن مميّزة بصريًا. لا تراكم صامت ولا فقدان لمهمة لم تُنجَز.

import { getDayStamp } from '@/lib/today'
import { safeWriteJson } from '@/lib/safeStorage'

export const TODO_KEY_BASE = 'qimmah:todo:v1'

/** عنصر مهمة واحد — خفيف بلا أولويات/تسميات/تواريخ (v1). */
export interface TodoItem {
  id: string
  text: string
  done: boolean
  /** مُرحّلة من يوم سابق دون إنجاز — تُعرض موسومة. */
  rolledOver?: boolean
}

export interface TodoState {
  /** ختم يوم الحالة (YYYY-MM-DD) — أساس التدوير اليومي. */
  date: string
  items: TodoItem[]
}

/** مفتاح التخزين المنعزل لكل حساب (المسجّل بمعرّفه، والضيف بـ `guest`). */
export function todoKey(ownerId: string | null | undefined): string {
  return `${TODO_KEY_BASE}:${ownerId ?? 'guest'}`
}

function fresh(): TodoState {
  return { date: getDayStamp(), items: [] }
}

/**
 * يطبّق قاعدة التدوير على حالة محفوظة: إن كان تاريخها ليس اليوم، نُبقي غير المنجزة
 * فقط ونسِمها «منقولة»، ونعيد ضبط التاريخ لليوم. الحالة الحالية تُعاد كما هي.
 */
function applyRollover(saved: TodoState, today: string): TodoState {
  if (saved.date === today) return saved
  const carried = saved.items
    .filter((it) => !it.done)
    .map((it) => ({ ...it, done: false, rolledOver: true }))
  return { date: today, items: carried }
}

/** يقرأ حالة الحساب من التخزين مع تطبيق التدوير، ويكتب الناتج المُدوَّر إن تغيّر. */
export function loadTodos(ownerId: string | null | undefined): TodoState {
  if (typeof window === 'undefined') return fresh()
  const key = todoKey(ownerId)
  const today = getDayStamp()
  try {
    const raw = window.localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TodoState>
      if (parsed && typeof parsed.date === 'string' && Array.isArray(parsed.items)) {
        const safe: TodoState = {
          date: parsed.date,
          items: parsed.items
            .filter((it): it is TodoItem => !!it && typeof it.id === 'string' && typeof it.text === 'string')
            .map((it) => ({ id: it.id, text: it.text, done: !!it.done, rolledOver: !!it.rolledOver })),
        }
        const rolled = applyRollover(safe, today)
        // اكتب فقط عند تغيّر اليوم (تثبيت نتيجة التدوير) لتفادي كتابة زائدة.
        if (rolled !== safe) safeWriteJson(key, rolled)
        return rolled
      }
    }
  } catch {
    /* بيانات تالفة → نبدأ نظيفًا */
  }
  const f = fresh()
  safeWriteJson(key, f)
  return f
}

export function saveTodos(ownerId: string | null | undefined, state: TodoState): void {
  safeWriteJson(todoKey(ownerId), state)
}
