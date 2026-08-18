/**
 * سياسة حقول المزامنة — **قائمة سماح لا قائمة حظر** (حارة G · ج-١).
 *
 * لماذا السماح لا الحظر — وهي نقطة المعمار كلها:
 * البيانات الصحية الحسّاسة **لا تركب جدولًا حسّاسًا**. `enqueueOnboardingProfileUpsert`
 * يدفع الملف الشخصي كاملًا في حمولة صفّ `profiles` — وداخله `limitations.injuries`
 * و`wellnessTracking.medications`. فالصفّ بريء المظهر وحمولته ليست كذلك، وحجب
 * الجدول يعطّل المزامنة كلها بينما تمريره يسرّب الأخطر.
 *
 * فالحسم بالحقل لا بالجدول. وبالسماح لا بالحظر: **كل حقل غير معلَن هنا لا
 * يُزامَن**، فحقل جديد يُضاف للملف الشخصي غدًا يكون **آمنًا افتراضيًا لا مكشوفًا
 * افتراضيًا** — وهي نفس فلسفة `accountScope` (كل مفتاح `qimmah:*` يُمسح إلا
 * المُعلَن). القائمة السوداء تنسى؛ القائمة البيضاء تُجبرك على التذكّر.
 *
 * تُطبَّق عند **حدّ الإدراج** في `enqueueSyncOperation` — بنيويًا، لا انضباطًا من
 * المستدعي. لا يوجد مسار يدفع للطابور ويتجاوزها.
 */

import type { SyncTable } from './syncQueue'

/** مسار حقل داخل كائن الإعداد، بنقاط. */
type FieldPath = string

/**
 * الحقول المسموح بمزامنتها بالموافقة الأولى وحدها — غير حسّاسة صحيًّا.
 *
 * `*` في آخر المسار تعني «هذا الفرع بكامله». تُستعمل فقط لفروع أُحصيت حقولها
 * ولا تحمل شيئًا حسّاسًا (تفضيلات تدريب/تغذية، بيانات وصفية).
 */
export const SYNCABLE_PROFILE_FIELDS: readonly FieldPath[] = [
  // الهوية والجسد — أساس الخطة وحساب الطاقة.
  'profile.name',
  'profile.sex',
  'profile.age',
  'bodyMetrics.heightCm',
  'bodyMetrics.currentWeightKg',
  'bodyMetrics.targetWeightKg',
  'goal.type',
  // تفضيلات التدريب والنشاط والتغذية — لا شيء منها حالة صحية.
  'trainingPreferences.*',
  'activityProfile.*',
  'nutritionPreferences.*',
  // تفضيلات الأكل — عدا الحساسيات (حالة طبية، انظر القائمة الحسّاسة).
  'foodPreferences.dietPattern',
  'foodPreferences.dislikedFoods',
  // وضع التتبّع وحده — لا أسماء المكمّلات ولا الأدوية.
  'wellnessTracking.mode',
  'appPreferences.*',
  // سجلّ الموافقات نفسه: بيانات عن الإذن لا بيانات صحية، ومزامنته تُبقي
  // الأجهزة متسقّة على ما وافق عليه المستخدم بدل أن يُسأل مرّتين.
  'consents.*',
  // البيانات الوصفية — طوابع LWW وحالة الإكمال. بدونها لا يعمل دمج الأحدثية.
  '_meta.*',
]

/**
 * الحقول التي **لا تُزامَن إلا بالموافقة الثانية الصريحة**.
 *
 * الاختيار ليس اجتهادًا لغويًا: كلها تصف حالة بدن أو علاجًا، وهي ما يفهمه
 * المستخدم من «بياناتي الصحية». والأدوية والحساسيات أدخل في الحساسية من
 * الإصابات نفسها — فإدراجها ليس توسّعًا بل اتساقًا مع القرار المقفل (§8-5).
 */
export const SENSITIVE_PROFILE_FIELDS: readonly FieldPath[] = [
  'limitations.injuries',
  'limitations.notes',
  'wellnessTracking.supplements',
  'wellnessTracking.medications',
  'foodPreferences.allergies',
]

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * يبني كائنًا جديدًا لا يحمل إلا المسارات المسموحة الموجودة فعلًا في المصدر.
 * لا يُنشئ مفاتيح غائبة، ولا ينسخ ما لم يُذكر.
 */
function pickAllowed(source: Record<string, unknown>, paths: readonly FieldPath[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const path of paths) {
    const segments = path.split('.')
    const wildcard = segments[segments.length - 1] === '*'
    const parts = wildcard ? segments.slice(0, -1) : segments

    let src: unknown = source
    for (const part of parts) {
      if (!isPlainObject(src) || !(part in src)) {
        src = undefined
        break
      }
      src = src[part]
    }
    if (src === undefined) continue

    let cursor = out
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!isPlainObject(cursor[part])) cursor[part] = {}
      cursor = cursor[part] as Record<string, unknown>
    }
    cursor[parts[parts.length - 1]] = src
  }
  return out
}

/**
 * ينقّي كائن الإعداد بقائمة السماح.
 *
 * @param allowSensitive الموافقة الثانية سارية؟ عندها تُضاف الحقول الحسّاسة —
 *                       وهي **الإضافة الوحيدة** التي تفعلها الموافقة الثانية.
 */
export function sanitizeOnboardingForSync(value: unknown, allowSensitive: boolean): Record<string, unknown> {
  if (!isPlainObject(value)) return {}
  const paths = allowSensitive
    ? [...SYNCABLE_PROFILE_FIELDS, ...SENSITIVE_PROFILE_FIELDS]
    : SYNCABLE_PROFILE_FIELDS
  return pickAllowed(value, paths)
}

// ════════════════════════════════════════════════════════════════════════════
// سجلّ سياسات الجداول — الوعد صار بنية
// ════════════════════════════════════════════════════════════════════════════
//
// كان هنا سطر واحد: `if (table !== 'profiles') return payload`، وفوقه وعدٌ نصّي
// بأن «أي جدول يُضاف لاحقًا بحمولة مركّبة يُضاف هنا صراحةً». والوعد النصّي لا
// يُنفَّذ نفسه: `daily_logs` أُضيف بعده يحمل `data.supplements` و`data.medications`
// حرفيًّا، و`recovery_logs` يحمل قراءات نبض وتغيّرية نبض وألمًا عضليًا، وشريحة
// `profiles.data.settings` تحمل `profile.injuries` و`wellnessPlan.medications` —
// وكلها كانت تعبر حدَّ الإدراج بلا تنقية لأن الشرط كان على اسم الجدول لا على
// محتوى الحمولة. الموافقة الثانية كانت تحرس مربّع الإعداد وحده لا ما يُرفع فعلًا.
//
// فالسجلّ أدناه يجعل الوعد مُلزِمًا بطبقتين لا واحدة:
//
//  ١. **إلزام بالنوع:** السجلّ مُنمَّط `Record<SyncTable, TableSyncPolicy>` — فإضافة
//     جدول إلى اتحاد `SyncTable` بلا مدخل هنا **تُسقط `tsc`**. لا يمكن إدخال جدول
//     جديد إلى المزامنة والمنقّي لا يعلم به.
//  ٢. **إلزام بالسقوط المغلق:** طبقة ثانية بعد السياسة تمشي الحمولة كاملة وتحذف
//     أي مفتاح من `SENSITIVE_KEY_NAMES` أينما ورد وبأي عمق — حتى في جدول أعلن
//     أنه «بلا محتوى حسّاس»، وحتى في جدول لا مدخل له أصلًا (اسم جدول وصل بتحويل
//     نوع أو من تخزين). فالإعلان الكاذب لا يفتح بابًا، والغياب لا يفتح بابًا.
//
// ولماذا الطبقتان معًا: السياسة تسمّي المسارات بدقّة (فتلتقط ما لا يُنبئ اسمُه عن
// حساسيته — `data.input.hrv`)، والشبكة تلتقط ما لم يسمّه أحد. واحدة تُفصح،
// والأخرى تُغلق. §4.2: كل استثناء يُحرَس.

/**
 * أسماء مفاتيح لا تحمل — في هذا المنتج — إلا بيانات صحية حسّاسة، أينما وردت
 * وبأي عمق. شبكة السقوط المغلق تحذفها بلا الموافقة الثانية.
 *
 * القائمة **أوراق لا حاويات** عمدًا: `wellnessTracking` مثلًا حاوية تحمل
 * `mode` غير الحسّاس مع `medications` الحسّاس، فحذف الحاوية إفراطٌ يمنع ما لا
 * يستحق المنع. الحاويات تُعالَج بمسارات مسمّاة في السجلّ، والأوراق هنا.
 */
export const SENSITIVE_KEY_NAMES: ReadonlySet<string> = new Set([
  'injuries',
  'medications',
  'supplements',
  'allergies',
  'healthNotes',
  'doctorNote',
  'medicationLogs',
  'supplementLogs',
  'soreness',
  'hrv',
  'restingHeartRate',
])

/** تصفية أثر قرار: تُسقط عناصر المصفوفة التي يقع `keyField` منها في المحظور. */
export interface TraceFilter {
  readonly path: FieldPath
  readonly keyField: string
  readonly sensitiveValues: readonly string[]
}

/**
 * سياسة جدول واحد. ثلاثة أشكال لا رابع، وكلها **مُعلَنة**:
 *  • `profile-allowlist` — حمولة `profiles`: قائمة سماح على `data.onboarding`،
 *    ومسارات حسّاسة مسمّاة على شريحة `data.settings`.
 *  • `sensitive-paths` — حمولة مركّبة تُعرف حقولها الحسّاسة بمسارها.
 *  • `no-sensitive-content` — إعلانٌ بأن الجدول لا يحمل حسّاسًا. **وهو إعلان
 *    مُتحقَّق منه لا مُصدَّق**: الشبكة تمرّ عليه كما تمرّ على غيره.
 */
export type TableSyncPolicy =
  | { readonly kind: 'profile-allowlist'; readonly sensitivePaths: readonly FieldPath[] }
  | { readonly kind: 'sensitive-paths'; readonly sensitivePaths: readonly FieldPath[]; readonly sensitiveTrace?: TraceFilter }
  | { readonly kind: 'no-sensitive-content' }

/**
 * السجلّ. **مُنمَّط بالاتحاد كاملًا** — وهذا هو الإلزام: جدول جديد في `SyncTable`
 * بلا سطر هنا لا يُبنى أصلًا.
 */
export const SYNC_TABLE_POLICIES: Readonly<Record<SyncTable, TableSyncPolicy>> = {
  // ملف الإعداد: قائمة سماح (أعلاه). وشريحة إعدادات الحساب تركب نفس الصف
  // بمفتاح كيان آخر (`settings`) وتحمل إصابات المستخدم وملاحظاته الصحية وخطة
  // مكمّلاته وأدويته بأسمائها وجرعاتها وملاحظة الطبيب.
  profiles: {
    kind: 'profile-allowlist',
    sensitivePaths: [
      'data.settings.profile.injuries',
      'data.settings.profile.healthNotes',
      'data.settings.wellnessPlan.supplements',
      'data.settings.wellnessPlan.medications',
    ],
  },
  // المجمّع اليومي: سجلّا المكمّلات والأدوية يركبانه بحكم كونه «البيت السحابي
  // المعتمد» لمخازن اليوم (historyStore.enqueueDailySync) — ومعهما يركب ما
  // تلتزم به الموافقة الثانية.
  daily_logs: { kind: 'sensitive-paths', sensitivePaths: ['data.supplements', 'data.medications'] },
  // سجلّ التعافي: مدخلات الفحص تحمل ألمًا عضليًا لكل منطقة وقراءتَي نبض راحة
  // وتغيّرية نبض (P9). وأثر القرار (`reasons`) يعيد نشر الحالة نفسها نصًّا —
  // فحجب المدخل وحده حجبٌ شكليّ، ويُصفّى معه أثرُ العوامل الحسّاسة.
  recovery_logs: {
    kind: 'sensitive-paths',
    sensitivePaths: ['data.input.soreness', 'data.input.restingHeartRate', 'data.input.hrv', 'data.flags.decisiveSoreness'],
    sensitiveTrace: { path: 'data.reasons', keyField: 'factor', sensitiveValues: ['soreness', 'resting_hr', 'hrv'] },
  },
  // ما دون: حمولات تدريب/تغذية/عدّ — لا حالة بدن ولا علاج. والإعلان مُتحقَّق
  // منه بالشبكة، فكذبه يُضبَط ولا يُصدَّق.
  workout_sessions: { kind: 'no-sensitive-content' },
  exercise_history: { kind: 'no-sensitive-content' },
  measurement_logs: { kind: 'no-sensitive-content' },
  step_logs: { kind: 'no-sensitive-content' },
  achievements: { kind: 'no-sensitive-content' },
  custom_plans: { kind: 'no-sensitive-content' },
  todos: { kind: 'no-sensitive-content' },
  nutrition_ledger: { kind: 'no-sensitive-content' },
  workout_schedule: { kind: 'no-sensitive-content' },
  plan_templates: { kind: 'no-sensitive-content' },
}

// ── أدوات بناء (لا حذف من المصدر: تُبنى كائنات جديدة) ────────────────────────

function withoutKey(source: Record<string, unknown>, key: string): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(source)) if (k !== key) out[k] = v
  return out
}

/** يُرجع نسخة بلا المسار المذكور، مع الإفصاح هل وُجد فعلًا. المصدر لا يُمسّ. */
function removePath(source: Record<string, unknown>, path: FieldPath): { value: Record<string, unknown>; removed: boolean } {
  const segments = path.split('.')
  const head = segments[0]
  if (!(head in source)) return { value: source, removed: false }
  if (segments.length === 1) return { value: withoutKey(source, head), removed: true }
  const child = source[head]
  if (!isPlainObject(child)) return { value: source, removed: false }
  const inner = removePath(child, segments.slice(1).join('.'))
  if (!inner.removed) return { value: source, removed: false }
  return { value: { ...source, [head]: inner.value }, removed: true }
}

function readPath(source: Record<string, unknown>, path: FieldPath): unknown {
  let cursor: unknown = source
  for (const part of path.split('.')) {
    if (!isPlainObject(cursor) || !(part in cursor)) return undefined
    cursor = cursor[part]
  }
  return cursor
}

function writePath(source: Record<string, unknown>, path: FieldPath, value: unknown): Record<string, unknown> {
  const segments = path.split('.')
  const head = segments[0]
  if (segments.length === 1) return { ...source, [head]: value }
  const child = source[head]
  if (!isPlainObject(child)) return source
  return { ...source, [head]: writePath(child, segments.slice(1).join('.'), value) }
}

/**
 * شبكة السقوط المغلق: تحذف كل مفتاح حسّاس معروف بأي عمق وتُسمّي مساره.
 * تُرجع المرجع نفسه حين لا تحذف شيئًا — فلا نسخ بلا سبب.
 */
function stripSensitiveKeysDeep(value: unknown, basePath: string, found: string[], seen: WeakSet<object>): unknown {
  if (Array.isArray(value)) {
    if (seen.has(value)) return value
    seen.add(value)
    let changed = false
    const out = value.map((item, index) => {
      const next = stripSensitiveKeysDeep(item, `${basePath}[${index}]`, found, seen)
      if (next !== item) changed = true
      return next
    })
    return changed ? out : value
  }
  if (!isPlainObject(value)) return value
  if (seen.has(value)) return value
  seen.add(value)
  let changed = false
  const out: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    const path = basePath ? `${basePath}.${key}` : key
    if (SENSITIVE_KEY_NAMES.has(key)) {
      found.push(path)
      changed = true
      continue
    }
    const next = stripSensitiveKeysDeep(child, path, found, seen)
    if (next !== child) changed = true
    out[key] = next
  }
  return changed ? out : value
}

// ── التنقية والتدقيق ─────────────────────────────────────────────────────────

/** أثر تنقية واحدة — مُفصح، ليسقط أي التفاف **باسمه** لا بمصادفة. */
export interface SyncPayloadAudit {
  readonly table: string
  readonly payload: Record<string, unknown>
  /** مسارات حُذفت بسياسة الجدول المُعلَنة. */
  readonly strippedPaths: readonly string[]
  /** مفاتيح حسّاسة التقطتها الشبكة ولم تُعلنها سياسة الجدول — إعلانٌ كاذب أو جدول منسيّ. */
  readonly undeclaredSensitiveKeys: readonly string[]
  /** الجدول بلا مدخل في السجلّ إطلاقًا. */
  readonly unregisteredTable: boolean
}

/**
 * ينقّي حمولة عملية مزامنة قبل إدراجها في الطابور، ويُفصح عمّا فعل.
 *
 * الترتيب: سياسة الجدول المُعلَنة أوّلًا (تسمية دقيقة بالمسار)، ثم شبكة السقوط
 * المغلق (كل مفتاح حسّاس معروف، أي عمق، أي جدول). وبالموافقة الثانية لا تعمل
 * الشبكة ولا تُحذف المسارات — الموافقة تُضيف ولا تُنقص، تمامًا كما في قائمة
 * السماح أعلاه.
 */
export function auditSyncPayload(
  table: string,
  payload: Record<string, unknown>,
  allowSensitive: boolean,
): SyncPayloadAudit {
  const policy = (SYNC_TABLE_POLICIES as Record<string, TableSyncPolicy | undefined>)[table]
  const strippedPaths: string[] = []
  let out = payload

  if (policy?.kind === 'profile-allowlist') {
    const data = out.data
    if (isPlainObject(data) && 'onboarding' in data) {
      out = { ...out, data: { ...data, onboarding: sanitizeOnboardingForSync(data.onboarding, allowSensitive) } }
    }
  }
  if (!allowSensitive && policy && policy.kind !== 'no-sensitive-content') {
    for (const path of policy.sensitivePaths) {
      const result = removePath(out, path)
      if (result.removed) {
        strippedPaths.push(path)
        out = result.value
      }
    }
    const trace = policy.kind === 'sensitive-paths' ? policy.sensitiveTrace : undefined
    if (trace) {
      const list = readPath(out, trace.path)
      if (Array.isArray(list)) {
        const kept = list.filter(
          (item) => !(isPlainObject(item) && trace.sensitiveValues.includes(String(item[trace.keyField]))),
        )
        if (kept.length !== list.length) {
          strippedPaths.push(`${trace.path}[${trace.keyField} ∈ ${trace.sensitiveValues.join('|')}]`)
          out = writePath(out, trace.path, kept)
        }
      }
    }
  }

  const undeclaredSensitiveKeys: string[] = []
  if (!allowSensitive) {
    const netted = stripSensitiveKeysDeep(out, '', undeclaredSensitiveKeys, new WeakSet())
    if (isPlainObject(netted)) out = netted
  }

  return {
    table,
    payload: out,
    strippedPaths,
    undeclaredSensitiveKeys,
    unregisteredTable: policy === undefined,
  }
}

/**
 * ينقّي حمولة عملية مزامنة قبل إدراجها في الطابور.
 *
 * تُطبَّق عند حدّ الإدراج في `enqueueSyncOperation` — لا مسار يكتب في الطابور
 * بلا مرورها. والحُكم على **محتوى الحمولة** لا على اسم الجدول وحده.
 */
export function sanitizeSyncPayload(
  table: string,
  payload: Record<string, unknown>,
  allowSensitive: boolean,
): Record<string, unknown> {
  return auditSyncPayload(table, payload, allowSensitive).payload
}
