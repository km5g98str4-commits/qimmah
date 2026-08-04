// حفظ حالة التخصيص واستئنافها — عبر `safeStorage` بفحص `WriteResult`.
//
// ═══ الميثاق §5 حرفيًا ═══
// «كل كتابة تخزين في كود جديد تمرّ عبر safeStorage مع فحص WriteResult» و«فشل
// الحفظ لا يُبتلع». فـ`saveState` **يعيد النتيجة** ولا يبتلعها، والمستدعي
// ملزم بقراءتها. ودالة `saveStateOrThrow` غير موجودة عمدًا: الرمي كان سيغري
// بـ`try/catch` فارغ يبتلع الفشل من جديد.
//
// ═══ والمخزَّن مدخل غير موثوق ═══
// `loadState` لا يثق بشيء: إصدار مختلف، مالك مختلف، شكل مشوّه — كلّها تعيد
// `undefined` بلا رمي. وهذا ليس تشاؤمًا: مسوّدة تحمل `goal='cut'` و`age=16`
// **يجب** أن تُرفض عند التحميل (§7-٤ من شجرة الأسئلة المعتمدة).

import { readJson, writeJson, removeKey, type WriteResult } from '@/lib/safeStorage'
import { PERSONALIZATION_PROFILE_KEY, PERSONALIZATION_STATE_KEY, ADULT_AGE } from './constants'
import { recomputeDerived } from './engine'
import { STATE_VERSION, type PersonalizationProfile, type PersonalizationState } from './types'

/** لاحقة المالك — الحالة لا تُسلَّم لمالك آخر أبدًا. */
function scoped(base: string, userId: string | null): string {
  return `${base}:u:${userId ?? 'guest'}`
}

interface Envelope<T> {
  v: number
  owner: string
  payload: T
}

function isEnvelope<T>(value: unknown): value is Envelope<T> {
  if (!value || typeof value !== 'object') return false
  const e = value as Partial<Envelope<T>>
  return typeof e.v === 'number' && typeof e.owner === 'string' && !!e.payload
}

/**
 * فحص بنيوي للحالة المحمَّلة. **يشمل فحصًا دلاليًا واحدًا لا شكليًا فقط**:
 * قاصر يحمل هدفًا مقيَّدًا يُرفض. الشكل السليم لا يكفي حين يكون المضمون
 * مخالفًا لحاجز امتثال.
 */
function isUsableState(value: unknown, userId: string | null): value is PersonalizationState {
  if (!value || typeof value !== 'object') return false
  const s = value as Partial<PersonalizationState>
  if (s.stateVersion !== STATE_VERSION) return false
  if ((s.userId ?? null) !== userId) return false
  if (!s.answers || typeof s.answers !== 'object') return false
  if (!Array.isArray(s.history) || !Array.isArray(s.queue) || !Array.isArray(s.clarifications)) return false
  if (s.lang !== 'ar' && s.lang !== 'en') return false

  const age = (s.answers as Record<string, unknown>).age
  const goal = (s.answers as Record<string, unknown>).primaryGoalDisplay
  if (typeof age === 'number' && age < ADULT_AGE && (goal === 'fat_loss' || goal === 'muscle_gain' || goal === 'strength' || goal === 'recomp')) {
    return false
  }
  return true
}

/** يحفظ الحالة. **النتيجة تُقرأ ولا تُتجاهل** — الميثاق §5. */
export function saveState(state: PersonalizationState): WriteResult {
  const envelope: Envelope<PersonalizationState> = {
    v: STATE_VERSION,
    owner: state.userId ?? 'guest',
    payload: state,
  }
  return writeJson(scoped(PERSONALIZATION_STATE_KEY, state.userId), envelope)
}

/** يحمّل حالة قابلة للاستئناف، أو `undefined`. لا يرمي أبدًا. */
export function loadState(userId: string | null): PersonalizationState | undefined {
  const raw = readJson<unknown>(scoped(PERSONALIZATION_STATE_KEY, userId), null)
  if (!isEnvelope<PersonalizationState>(raw)) return undefined
  if (raw.v !== STATE_VERSION) return undefined
  if (raw.owner !== (userId ?? 'guest')) return undefined
  if (!isUsableState(raw.payload, userId)) return undefined
  // الاشتقاق يُعاد دائمًا: علم تناقض محفوظ قد يكون بائتًا، والمصدر هو الإجابات.
  return recomputeDerived(raw.payload)
}

export function clearState(userId: string | null): void {
  removeKey(scoped(PERSONALIZATION_STATE_KEY, userId))
}

export function saveProfile(profile: PersonalizationProfile): WriteResult {
  const envelope: Envelope<PersonalizationProfile> = {
    v: STATE_VERSION,
    owner: profile.userId ?? 'guest',
    payload: profile,
  }
  return writeJson(scoped(PERSONALIZATION_PROFILE_KEY, profile.userId), envelope)
}

export function loadProfile(userId: string | null): PersonalizationProfile | undefined {
  const raw = readJson<unknown>(scoped(PERSONALIZATION_PROFILE_KEY, userId), null)
  if (!isEnvelope<PersonalizationProfile>(raw)) return undefined
  if (raw.owner !== (userId ?? 'guest')) return undefined
  const p = raw.payload as Partial<PersonalizationProfile>
  if (typeof p.algoVersion !== 'number' || !p.planConstraints || !p.safety) return undefined
  return raw.payload
}

export function clearProfile(userId: string | null): void {
  removeKey(scoped(PERSONALIZATION_PROFILE_KEY, userId))
}

/**
 * هل يحتاج الملف المحفوظ إعادة اشتقاق؟ يقارن إصدار الخوارزمية لا محتواها.
 * الإجابات الخام باقية، فإعادة الاشتقاق **بلا خسارة** ولا إعادة سؤال.
 */
export function needsRederive(profile: PersonalizationProfile, currentAlgo: number): boolean {
  return profile.algoVersion !== currentAlgo
}
