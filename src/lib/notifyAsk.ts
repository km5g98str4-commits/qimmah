// سطح طلب إذن الإشعارات (ADV-14م · م١) — [CTO-70] البند ٢.
//
// يظهر **مرّة واحدة** بعد إتمام أول انتصار مباشرةً، بمقابل محدّد لا طلب مجرّد:
// «نذكّرك بكرة الساعة ٦ العصر بتمرينك — نرسل لك؟».
//
// الرفض يُحترم بلا تكرار: نسجّل القرار ولا نسأل ثانية أبدًا. **البيت الدائم
// للإشعارات يبقى الإعدادات** — من رفض هنا يقدر يفعّلها متى شاء من مكانها الطبيعي.

import { readJson, writeJson, removeKey } from '@/lib/safeStorage'
import { getLastUser } from '@/lib/accountScope'

export const NOTIFY_ASK_KEY_BASE = 'qimmah:notifyAsk:v1'

export type NotifyAskOutcome = 'accepted' | 'declined'

export interface NotifyAskState {
  /** طُرح السؤال وحُسم — لا يُطرح مرّة ثانية مهما كانت النتيجة. */
  asked: boolean
  outcome?: NotifyAskOutcome
  at?: string
}

const EMPTY: NotifyAskState = { asked: false }

export function notifyAskKey(uid?: string | null): string {
  const owner = uid === undefined ? (getLastUser() ?? null) ?? 'guest' : uid ?? 'guest'
  return `${NOTIFY_ASK_KEY_BASE}:${owner}`
}

export function loadNotifyAsk(uid?: string | null): NotifyAskState {
  if (typeof window === 'undefined') return EMPTY
  const raw = readJson<unknown>(notifyAskKey(uid), EMPTY)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return EMPTY
  const s = raw as Partial<NotifyAskState>
  return { asked: s.asked === true, outcome: s.outcome, at: typeof s.at === 'string' ? s.at : undefined }
}

/**
 * يثبّت أن السؤال طُرح وحُسم. يُستدعى في **الحالتين** (قبول ورفض):
 * الرفض المحترَم هو الذي يُسجَّل، وإلا عاد السؤال في الجلسة التالية.
 */
export function markNotifyAsked(outcome: NotifyAskOutcome, uid?: string | null, now: Date = new Date()): void {
  if (typeof window === 'undefined') return
  writeJson(notifyAskKey(uid), { asked: true, outcome, at: now.toISOString() } satisfies NotifyAskState)
}

export function clearNotifyAsk(uid?: string | null): void {
  if (typeof window === 'undefined') return
  removeKey(notifyAskKey(uid))
}

/**
 * هل يُعرض السطح الآن؟ شرطان: أول انتصار **تمّ**، والسؤال لم يُطرح بعد.
 * الترتيب مقصود — نطلب الإذن بعد أن يرى المستخدم قيمة، لا قبلها.
 */
export function shouldAskNotify(firstWinCompleted: boolean, uid?: string | null): boolean {
  if (!firstWinCompleted) return false
  return !loadNotifyAsk(uid).asked
}
