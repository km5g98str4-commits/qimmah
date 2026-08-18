// ملكية البيانات المحلية + بوابة التبنّي + الحجر — قلب موجة سلامة البيانات.
//
// المشكلة: بيانات المستخدم العالمية (userDataKeys) غير منسوبة بنيويًا؛ الدخول بحساب
// حقيقي فوق بيانات ضيف كان «يتبنّاها» ضمنيًا ويرفعها للسحابة. القاعدة الجديدة:
//   • ختم ملكية `qimmah:dataOwner:v1` يسجّل مالك مجموعة البيانات العالمية الحالية.
//   • بيانات مجهولة المالك لا تُتبنّى تلقائيًا: عند دخول حساب حقيقي فوق بيانات بلا ختم
//     (أو بختم guest) تدخل حالة «تبنٍّ معلّق» — تبقى محلية وتُقرأ، لكن **لا تُرفع للسحابة**
//     حتى قرار صريح: adoptPendingData(uid) أو discardPendingData().
//   • الهجرات تمرّ بمشغّل موحّد: versioned · idempotent · snapshot قبل الكتابة ·
//     تحقّق بعد النقل · rollback عند الفشل · لا حذف للمصدر إلا بعد نجاح مثبت.
//
// واجهة الاستخدام من طبقة الواجهة (Codex): isAdoptionPending() لعرض القرار،
// adoptPendingData(uid) / discardPendingData() لتنفيذه. لا واجهة تُبنى هنا.

import { unscopedUserKeys } from './userDataKeys'

export const DATA_OWNER_KEY = 'qimmah:dataOwner:v1'
const PENDING_KEY = 'qimmah:dataOwner:pending:v1'
const MIGRATION_STATE_KEY = 'qimmah:migrations:v1'
const SNAPSHOT_PREFIX = 'qimmah:migrationSnapshot:v1:'

type OwnerStamp = { owner: string; stampedAt: string }

function ls(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage
}

function readJSON<T>(key: string): T | null {
  const s = ls()
  if (!s) return null
  try {
    const raw = s.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJSON(key: string, value: unknown): void {
  ls()?.setItem(key, JSON.stringify(value))
}

// ── ختم الملكية ──────────────────────────────────────────────────────────────

/** مالك مجموعة البيانات العالمية الحالية: uid، أو 'guest'، أو null (لا ختم). */
export function getDataOwner(): string | null {
  return readJSON<OwnerStamp>(DATA_OWNER_KEY)?.owner ?? null
}

export function stampDataOwner(owner: string): void {
  writeJSON(DATA_OWNER_KEY, { owner, stampedAt: new Date().toISOString() } satisfies OwnerStamp)
}

/** هل توجد أي بيانات مستخدم عالمية فعلية على الجهاز؟ */
export function hasUnscopedUserData(): boolean {
  const s = ls()
  if (!s) return false
  return unscopedUserKeys().some((k) => {
    const raw = s.getItem(k)
    return raw !== null && raw !== '{}' && raw !== '[]' && raw !== 'null'
  })
}

// ── بوابة التبنّي (لا تبنٍّ تلقائيًا لبيانات مجهولة المالك) ─────────────────────

/** المستخدم الحقيقي الذي تنتظر بياناته المحلية قرار تبنٍّ/تجاهل، أو null. */
export function adoptionPendingFor(): string | null {
  return readJSON<{ uid: string }>(PENDING_KEY)?.uid ?? null
}

export function isAdoptionPending(uid: string): boolean {
  return adoptionPendingFor() === uid
}

/**
 * تُستدعى عند دخول حساب حقيقي (من accountScope): إن وُجدت بيانات عالمية غير منسوبة
 * لهذا الحساب (بلا ختم أو بختم guest) ⇒ علِّقها بانتظار قرار صريح. لا مسح ولا رفع.
 * بيانات مختومة لحساب حقيقي آخر لا تصل هنا (يمسحها reconcileAccountScope قبلها).
 */
export function markAdoptionPendingIfUnowned(uid: string): boolean {
  const owner = getDataOwner()
  if (owner === uid) return false
  if (owner !== null && owner !== 'guest') return false // حساب حقيقي آخر — شأن المسح لا التبنّي
  if (!hasUnscopedUserData()) {
    stampDataOwner(uid) // جهاز نظيف: الختم مباشرة، لا شيء يُتبنّى
    return false
  }
  writeJSON(PENDING_KEY, { uid })
  return true
}

/** قرار صريح: تبنّي البيانات المحلية للحساب — يُختم المالك ويُفتح الرفع. */
export function adoptPendingData(uid: string): void {
  if (adoptionPendingFor() !== uid) return
  stampDataOwner(uid)
  ls()?.removeItem(PENDING_KEY)
}

/** قرار صريح بالرفض: إسقاط حالة التعليق فقط — المسح الفعلي شأن المستدعي (wipeUserData). */
export function discardPendingData(): void {
  ls()?.removeItem(PENDING_KEY)
}

// ── مشغّل هجرات موحّد: versioned · idempotent · snapshot · verify · rollback ──

export interface MigrationDef {
  /** معرّف فريد ثابت — يمنع التكرار (idempotency). */
  id: string
  /** المفاتيح التي تُلقَط في snapshot قبل أي كتابة (المصادر والأهداف). */
  keys: string[]
  /**
   * شرط الجدوى — **يُفحص قبل أي كتابة وقبل ختم الإنجاز**.
   *
   * بدونه كانت هجرة «لا شيء لتهاجره» تُختم ناجحة: `run` تعود مبكرًا، `verify`
   * تصدق على الفراغ، فيُكتب `qimmah:migrations:v1` ويمنع `isMigrationDone`
   * التشغيل **إلى الأبد**. أي هجرة يعتمد وجود مادّتها على وقت الاستدعاء تُعرّف
   * `shouldRun`؛ عودتها `false` تعني «ليس الآن» لا «تمّت».
   */
  shouldRun?: () => boolean
  /** التنفيذ. يرمي عند الفشل. */
  run: () => void
  /** تحقّق بعد النقل. false ⇒ rollback كامل. */
  verify: () => boolean
  /** حذف المصادر القديمة — يُستدعى فقط بعد نجاح run+verify. اختياري. */
  cleanup?: () => void
}

type MigrationState = Record<string, { doneAt: string }>

function migrationState(): MigrationState {
  return readJSON<MigrationState>(MIGRATION_STATE_KEY) ?? {}
}

export function isMigrationDone(id: string): boolean {
  return !!migrationState()[id]
}

/**
 * يشغّل هجرة واحدة بكل الضمانات. إعادة الاستدعاء بعد النجاح = لا-شيء (idempotent).
 * الفشل في أي مرحلة ⇒ استرجاع snapshot كاملًا وإبقاء الحالة «غير منفَّذة».
 */
export function runMigration(def: MigrationDef): { status: 'done' | 'skipped' | 'rolled-back' } {
  const s = ls()
  if (!s) return { status: 'skipped' }
  if (isMigrationDone(def.id)) return { status: 'skipped' }
  // «لا مادّة بعد» ≠ «تمّت»: نخرج قبل الـsnapshot وقبل ختم الإنجاز، فتُعاد
  // المحاولة حين تتوفّر المادّة. (رمي الاستثناء من الشرط يُعامَل «ليس الآن».)
  if (def.shouldRun) {
    let ready = false
    try {
      ready = def.shouldRun()
    } catch {
      ready = false
    }
    if (!ready) return { status: 'skipped' }
  }

  const snapKey = SNAPSHOT_PREFIX + def.id
  const snapshot: Record<string, string | null> = {}
  for (const k of def.keys) snapshot[k] = s.getItem(k)

  // لا هجرة بلا نقطة رجوع: إن تعذّر كتابة الـsnapshot (امتلاء التخزين مثلًا) نتوقّف
  // قبل لمس أي بيانات وتبقى الهجرة «غير منفَّذة» فتُعاد المحاولة لاحقًا. مسارات
  // القراءة تستدعي runMigration، فالرمي هنا كان يُسقط الشاشة عند التركيب.
  try {
    writeJSON(snapKey, snapshot)
  } catch {
    return { status: 'skipped' }
  }

  // الاسترجاع نفسه يكتب — تحت الامتلاء قد يفشل جزئيًا. نحاول كل مفتاح على حدة كي
  // لا يمنع فشل واحد استرجاع الباقي، ولا يخرج استثناء من مشغّل الهجرات إطلاقًا.
  const rollback = () => {
    for (const [k, v] of Object.entries(snapshot)) {
      try {
        if (v === null) s.removeItem(k)
        else s.setItem(k, v)
      } catch {
        /* أفضل جهد — نُكمل بقية المفاتيح */
      }
    }
    try {
      s.removeItem(snapKey)
    } catch {
      /* أفضل جهد */
    }
  }

  try {
    def.run()
    if (!def.verify()) {
      rollback()
      return { status: 'rolled-back' }
    }
    // نجاح مثبت: التنظيف (حذف المصادر القديمة) ثم توثيق الإنجاز وإزالة الـsnapshot.
    def.cleanup?.()
    writeJSON(MIGRATION_STATE_KEY, { ...migrationState(), [def.id]: { doneAt: new Date().toISOString() } })
    s.removeItem(snapKey)
    return { status: 'done' }
  } catch {
    rollback()
    return { status: 'rolled-back' }
  }
}

// ── حجر البيانات مجهولة المالك ────────────────────────────────────────────────

export const QUARANTINE_PREFIX = 'qimmah:quarantine:v1:'

/**
 * يعزل بيانات المستخدم العالمية الحالية كمعلّقة (بدل حذفها أو تبنّيها): تُنقل إلى
 * مفاتيح حجر ولا يقرؤها التطبيق ولا تُرفع للسحابة. تُستخدم عند اختيار «تجاهل» مع
 * الإبقاء على إمكانية استرجاع يدوي، أو عند العثور على بيانات غير قابلة للنسبة.
 */
export function quarantineUnscopedUserData(reason: string): number {
  const s = ls()
  if (!s) return 0
  let moved = 0
  for (const key of unscopedUserKeys()) {
    const raw = s.getItem(key)
    if (raw === null) continue
    s.setItem(QUARANTINE_PREFIX + key, JSON.stringify({ reason, at: new Date().toISOString(), raw }))
    s.removeItem(key)
    moved += 1
  }
  return moved
}
