// ═══════════════════════════════════════════════════════════════════════════
// QIMMAH CHAOS & DATA-LOSS PROOF — deterministic, seeded, no backend/browser.
//
// Exercises the real on-device storage modules under the adverse conditions in
// docs/reliability/DATA-RECOVERY-MAP.md and asserts 12 machine-checked invariants
// across 9 chaos families. Fails fast (exit 1) on any invariant break.
//
// Runner: scripts/resilience/run-chaos.mjs supplies a controllable localStorage
// (globalThis.__chaos), a seeded clock (__setClock/__tick) and seeded UUIDs.
// ═══════════════════════════════════════════════════════════════════════════

import {
  wipeUserData,
  reconcileAccountScope,
  setLastUser,
} from '@/lib/accountScope'
import {
  saveActiveSession,
  loadActiveSession,
  isRestorableSnapshot,
  activeSessionKey,
  restRemainingSec,
  restIsFinished,
  ACTIVE_SESSION_MAX_AGE_MS,
  type ActiveSessionSnapshot,
} from '@/lib/activeSession'
import {
  setSyncFeatureEnabledForTests,
  setSyncRuntime,
  enqueueSyncOperation,
  readSyncQueue,
  syncAllowedFor,
  SYNC_QUEUE_PREFIX,
} from '@/lib/syncQueue'
import { setSyncTransportForTests, flushSyncQueue, hydrateFromCloud, type SyncTransport } from '@/lib/syncService'
import { setSteps, getSteps } from '@/lib/stepCounter'
import { getDayStamp, loadToday, saveToday } from '@/lib/today'
import { loadNutritionToday } from '@/lib/nutritionTracking'
import { loadWellnessToday } from '@/lib/wellnessTracking'
import { loadCommitmentsToday } from '@/lib/commitmentTracking'
import { parseImportFile } from '@/lib/portability/importer'
import { requirePortabilityOwner } from '@/lib/portability/guard'

// ─────────────────────────── test scaffolding ───────────────────────────
declare const __chaos: { failAll: boolean; failKeySubstr: string | null; failKeys: Set<string> }
declare const __setClock: (t: number) => void
declare const __tick: (ms: number) => number
declare const __CHAOS_SEED: number

const ls = globalThis.localStorage
let pass = 0
let fail = 0
const brokenInvariants = new Set<number>()
const coveredInvariants = new Set<number>()

/** Assert `cond`. `inv` tags which invariant(s) this exercises (for the report). */
function check(label: string, cond: boolean, inv: number[] = []): void {
  inv.forEach((n) => coveredInvariants.add(n))
  if (cond) {
    pass++
    console.log(`  ✓ ${label}${inv.length ? `  [INV ${inv.join(',')}]` : ''}`)
  } else {
    fail++
    inv.forEach((n) => brokenInvariants.add(n))
    console.log(`  ✗ FAIL: ${label}${inv.length ? `  [INV ${inv.join(',')}]` : ''}`)
  }
}
function didThrow(fn: () => unknown): boolean {
  try {
    fn()
    return false
  } catch {
    return true
  }
}
function armQuota(on: boolean, substr: string | null = null): void {
  __chaos.failAll = on && substr === null
  __chaos.failKeySubstr = on ? substr : null
}
function reset(): void {
  ls.clear()
  armQuota(false)
  setSyncFeatureEnabledForTests(undefined)
  setSyncTransportForTests(undefined)
  setSyncRuntime(null, false)
}
// mulberry32 seeded PRNG — permutes race orderings so a different seed surfaces
// order-dependence without changing which invariants are asserted.
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = rng(__CHAOS_SEED)
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─────────────────────────── fixtures ───────────────────────────
function makeSnapshot(over: Partial<ActiveSessionSnapshot> = {}): ActiveSessionSnapshot {
  return {
    version: 1,
    savedAt: Date.now(),
    startedAt: new Date().toISOString(),
    day: { id: 'day-a', name: 'Push', exercises: [{ id: 'ex1' }, { id: 'ex2' }] } as ActiveSessionSnapshot['day'],
    current: 0,
    state: {
      ex1: { sets: [{ setNumber: 1, targetReps: '8', actualReps: '8', weightKg: '40', completed: true }], painNote: '', notes: '' },
      ex2: { sets: [{ setNumber: 1, targetReps: '8', actualReps: '', weightKg: '', completed: false }], painNote: '', notes: '' },
    },
    swap: {},
    altSlots: {},
    rest: null,
    ...over,
  }
}

/** In-memory Supabase stand-in: records rows by (table→entityKey), can fail N times. */
function makeServer() {
  const rows: Record<string, Map<string, Record<string, unknown>>> = {}
  const upsertBatches: { table: string; n: number }[] = []
  let failuresLeft = 0
  let currentUser = 'A'
  const key = (r: Record<string, unknown>): string =>
    String(r.local_id ?? r.exercise_id ?? r.date ?? r.user_id ?? 'self')
  const transport: SyncTransport = {
    async currentUserId() {
      return currentUser
    },
    async upsert(table, rowsIn) {
      if (failuresLeft > 0) {
        failuresLeft--
        throw new Error('network-down')
      }
      upsertBatches.push({ table, n: rowsIn.length })
      rows[table] = rows[table] ?? new Map()
      for (const r of rowsIn) rows[table].set(key(r), r)
    },
    async delete(table, _userId, entityKeys) {
      if (failuresLeft > 0) {
        failuresLeft--
        throw new Error('network-down')
      }
      const map = rows[table]
      if (map) for (const k of entityKeys) map.delete(k)
    },
    async select(table) {
      return rows[table] ? [...rows[table].values()] : []
    },
  }
  return {
    transport,
    rows,
    upsertBatches,
    rowCount: (t: string) => (rows[t] ? rows[t].size : 0),
    setFailures: (n: number) => {
      failuresLeft = n
    },
    setUser: (u: string) => {
      currentUser = u
    },
  }
}

const HR = () => console.log(`${'─'.repeat(64)}`)

console.log(`\n╔══ QIMMAH CHAOS PROOF ══  seed=${__CHAOS_SEED}`)

// ═══════════════════ FAMILY 1 — network loss / idempotency ═══════════════════
console.log('\n① الشبكة: انقطاع قبل/بعد الحفظ، flap، وعدم تكرار السجلّ (idempotency)')
{
  reset()
  setSyncFeatureEnabledForTests(true)
  const srv = makeServer()
  setSyncTransportForTests(srv.transport)
  setSyncRuntime('A', false)
  srv.setUser('A')

  // finish a session → one queued op. Enqueue the SAME entity twice (double-tap).
  enqueueSyncOperation('workout_sessions', 'sess-1', { local_id: 'sess-1', data: { id: 'sess-1' } })
  enqueueSyncOperation('workout_sessions', 'sess-1', { local_id: 'sess-1', data: { id: 'sess-1', v: 2 } })
  check('نقرتا «إنهاء» على نفس الجلسة → عنصر واحد في الطابور (replace-on-enqueue)', readSyncQueue('A').length === 1, [3, 7])

  // Network down for 2 attempts (flap): first two flushes fail, op survives + backs off.
  srv.setFailures(2)
  let now = Date.now()
  let status = await flushSyncQueue(now)
  check('انقطاع الشبكة أثناء الرفع → حالة خطأ، العنصر باقٍ (لا فقد)', status.state === 'error' && readSyncQueue('A').length === 1, [12])
  now = __tick(600_000) // past exponential backoff window
  status = await flushSyncQueue(now)
  check('المحاولة الثانية تفشل أيضًا → العنصر ما زال باقيًا', readSyncQueue('A').length === 1, [12])

  // Network returns → flush succeeds, exactly one server row, queue drained.
  srv.setFailures(0)
  now = __tick(600_000)
  status = await flushSyncQueue(now)
  check('عودة الشبكة → رفع ناجح، الطابور فارغ', status.state === 'synced' && readSyncQueue('A').length === 0, [4])
  check('صفّ خادم واحد فقط للجلسة (لا تكرار بعد إعادة المحاولات)', srv.rowCount('workout_sessions') === 1, [3, 7])

  // Re-flush after success → nothing due, still exactly one row (idempotent).
  now = __tick(1000)
  await flushSyncQueue(now)
  check('إعادة flush بعد النجاح → لا تكرار (idempotent)', srv.rowCount('workout_sessions') === 1, [7])
}

// ═══════════════════ FAMILY 2 — app kill / freshness / rest timer ═══════════════════
console.log('\n② إغلاق التطبيق: استئناف اللقطة الطازجة، رفض القديمة، مؤقّت الراحة بعد الخلفية')
{
  reset()
  const owner = 'A'
  __setClock(1_800_000_000_000)
  // kill after editing weight, before next set → snapshot persisted, resumes.
  saveActiveSession(owner, makeSnapshot({ savedAt: Date.now() }))
  check('reopen بعد دقيقة → الجلسة الطازجة تُستأنف', loadActiveSession(owner, __tick(60_000)) !== null, [12])
  check('reopen بعد ساعتين → ما زالت ضمن حدّ الطزاجة (12س)', loadActiveSession(owner, __tick(2 * 3600_000 - 60_000)) !== null)

  // reopen after 13h → stale, not restored, auto-cleared (no zombie session).
  saveActiveSession(owner, makeSnapshot({ savedAt: __setClock(1_900_000_000_000) === undefined ? 0 : 1_900_000_000_000 }))
  __setClock(1_900_000_000_000)
  saveActiveSession(owner, makeSnapshot({ savedAt: Date.now() }))
  const after13h = Date.now() + 13 * 3600_000
  check('reopen بعد ١٣ ساعة → لا تُستأنف جلسة منتهية', loadActiveSession(owner, after13h) === null, [2])
  check('اللقطة المنتهية مُسحت تلقائيًا (لا تُعرض مجددًا)', ls.getItem(activeSessionKey(owner)) === null, [2])

  // rest timer is timestamp-based → correct after 2 min in background.
  const endsAt = Date.now() + 90_000
  check('مؤقّت راحة (90ث): بعد دقيقتين خلفية → منتهٍ، لا قيمة سالبة', restIsFinished({ endsAt, durationSec: 90 }, Date.now() + 120_000) && restRemainingSec(endsAt, Date.now() + 120_000) === 0)
  check('مؤقّت راحة: بعد 30ث → 60ث متبقية (محسوبة من الطابع الزمني)', restRemainingSec(endsAt, Date.now() + 30_000) === 60)
}

// ═══════════════════ FAMILY 3 — localStorage corruption ═══════════════════
console.log('\n③ تلف localStorage: fail-safe بلا رمي، وبلا تمرير بيانات تالفة لمصدر الحقيقة')
{
  reset()
  const owner = 'A'
  const k = activeSessionKey(owner)
  const now = 1_950_000_000_000
  __setClock(now)
  const corruptions: [string, string][] = [
    ['JSON مقطوع', '{"version":1,"savedAt":'],
    ['نوع خاطئ (نص)', '"not-an-object"'],
    ['array بدل object', '[1,2,3]'],
    ['null', 'null'],
    ['schema قديم (version 2)', JSON.stringify(makeSnapshot({ version: 2 as unknown as 1 }))],
    ['savedAt = NaN', '{"version":1,"savedAt":null,"startedAt":"x","day":{"exercises":[{"id":"ex1"}]},"current":0,"state":{}}'],
    ['savedAt = Infinity(نصي)', '{"version":1,"savedAt":1e999,"startedAt":"x","day":{"exercises":[{"id":"ex1"}]},"current":0,"state":{}}'],
    ['current خارج النطاق', JSON.stringify(makeSnapshot({ current: 99 }))],
    ['__proto__ حقن', '{"version":1,"savedAt":' + now + ',"__proto__":{"polluted":true},"startedAt":"x","day":{"exercises":[{"id":"ex1"}]},"current":0,"state":{}}'],
    ['قيمة ضخمة (مصفوفة set فارغة)', JSON.stringify(makeSnapshot({ state: { ex1: { sets: [], painNote: '', notes: '' }, ex2: { sets: [], painNote: '', notes: '' } } as unknown as ActiveSessionSnapshot['state'] }))],
  ]
  let allSafe = true
  for (const [label, raw] of corruptions) {
    ls.setItem(k, raw)
    const threw = didThrow(() => loadActiveSession(owner, now))
    const result = threw ? 'THREW' : loadActiveSession(owner, now)
    if (threw || result !== null) {
      allSafe = false
      console.log(`    · «${label}» → ${threw ? 'رمى ✗' : 'أعاد قيمة غير null ✗'}`)
    }
  }
  check('كل صور التلف (١٠) → null بلا رمي (fail-safe، لا white screen)', allSafe, [9])
  check('لا تلوّث نموذج من حقن __proto__', ({} as Record<string, unknown>).polluted === undefined, [9])
  // corrupt sync queue → dropped, never surfaces foreign/garbage ops.
  ls.setItem(`${SYNC_QUEUE_PREFIX}A`, '{"not":"an-array"}')
  check('طابور مزامنة تالف → [] (لا رمي)', !didThrow(() => readSyncQueue('A')) && readSyncQueue('A').length === 0, [9])
  ls.setItem(`${SYNC_QUEUE_PREFIX}A`, JSON.stringify([{ id: 'x', userId: 'B', table: 'todos', action: 'upsert', entityKey: 'self', payload: {}, createdAt: 'x', attempts: 0, nextAttemptAt: 0 }]))
  check('عملية تخصّ مالكًا آخر داخل طابور A → مُسقطة (لا خلط حسابات)', readSyncQueue('A').length === 0, [1, 8])
}

// ═══════════════════ FAMILY 4 — storage full (QuotaExceededError) ═══════════════════
console.log('\n④ امتلاء التخزين: تحميل الشاشات لا يرمي، والجلسة النشطة تحفظ بأمان')
{
  reset()
  // active session save under quota must swallow (never crash a live workout).
  __setClock(2_000_000_000_000)
  armQuota(true)
  check('حفظ الجلسة النشطة تحت الامتلاء → لا رمي (best-effort)', !didThrow(() => saveActiveSession('A', makeSnapshot())), [9, 12])
  check('historyStore/syncQueue تبتلع الامتلاء (النمط السائد)', !didThrow(() => { enqueueSyncOperation('todos', 'self', {}) }))
  // READ/LOAD paths seed a fresh state with an unguarded setItem — must not throw
  // under quota (would trip the ErrorBoundary and crash the view on mount).
  check('تحميل «اليوم» تحت الامتلاء → لا رمي', !didThrow(() => loadToday()), [9, 12])
  check('تحميل «التغذية اليوم» تحت الامتلاء → لا رمي', !didThrow(() => loadNutritionToday()), [9, 12])
  check('تحميل «العناية اليوم» تحت الامتلاء → لا رمي', !didThrow(() => loadWellnessToday()), [9, 12])
  check('تحميل «الالتزامات اليوم» تحت الامتلاء → لا رمي', !didThrow(() => loadCommitmentsToday()), [9, 12])
  armQuota(false)
  // last-good preservation: a good value already stored is never destroyed by a failed write.
  saveToday({ date: getDayStamp(), done: { 'a:1': true } })
  const good = ls.getItem('qimmah:today:v1')
  armQuota(true)
  didThrow(() => saveToday({ date: getDayStamp(), done: { 'a:1': true, 'b:2': true } }))
  check('كتابة فاشلة لا تُتلف آخر نسخة سليمة', ls.getItem('qimmah:today:v1') === good, [4])
  armQuota(false)
}

// ═══════════════════ FAMILY 5 — account switching ═══════════════════
console.log('\n⑤ تبديل الحساب: طابور A لا يُنفَّذ تحت B، صفر بقايا، guest→A→B→guest')
{
  reset()
  setSyncFeatureEnabledForTests(true)
  const srv = makeServer()
  setSyncTransportForTests(srv.transport)

  // A has an unsynced workout queued.
  setSyncRuntime('A', false)
  srv.setUser('A')
  enqueueSyncOperation('workout_sessions', 'a-sess', { local_id: 'a-sess', data: { id: 'a-sess' } })
  check('A لديه عملية غير متزامنة', readSyncQueue('A').length === 1)

  // logout → login B immediately (runtime + transport now B), then flush.
  setSyncRuntime('B', false)
  srv.setUser('B')
  await flushSyncQueue(Date.now())
  check("طابور A لا يُنفَّذ تحت B (لا رفع بهوية B)", srv.rowCount('workout_sessions') === 0, [1])
  check('طابور A ما زال سليمًا على الجهاز (قابل للاستعادة عند عودة A)', readSyncQueue('A').length === 1, [1])
  check('لا يستطيع B رؤية/تعديل طابور A عبر الحُرّاس', !syncAllowedFor('A') && syncAllowedFor('B'), [1, 8])

  // guest → A → B → guest owner-scope reconciliation + zero residue.
  reset()
  setLastUser(null) // guest baseline
  ls.setItem('qimmah:customization:v1', '{"name":"guest"}')
  ls.setItem('qimmah:prefs:v1', '{"language":"ar"}')
  reconcileAccountScope('A') // guest→A: no wipe (adopt), keep device prefs
  check('guest→A: لا مسح (تبنّي)، اللغة باقية', ls.getItem('qimmah:prefs:v1') === '{"language":"ar"}', [10])
  ls.setItem('qimmah:customization:v1', '{"name":"A"}')
  const r = reconcileAccountScope('B') // A→B: wipe A residue
  check('A→B: مسح بقايا A', r.wiped === true && ls.getItem('qimmah:customization:v1') === null, [1, 10])
  check('لغة الجهاز نجت من مسح التبديل (allowlist عامّة)', ls.getItem('qimmah:prefs:v1') === '{"language":"ar"}', [10])
  ls.setItem('qimmah:customization:v1', '{"name":"B"}')
  reconcileAccountScope(null) // B→guest: guard does not wipe (explicit signOut handles it)
  // Emulate the explicit signOut path (wipe + set guest) the app runs on logout.
  wipeUserData()
  setLastUser(null)
  check('B→guest (signOut): صفر بقايا مرئية/مقروءة لأي حساب', ls.getItem('qimmah:customization:v1') === null, [1, 10])
  check('اللغة تبقى بعد الخروج (تفضيل جهاز)', ls.getItem('qimmah:prefs:v1') === '{"language":"ar"}', [10])
}

// ═══════════════════ FAMILY 6 — password recovery ═══════════════════
console.log('\n⑥ استعادة كلمة المرور: لا مزامنة/استيراد/تصدير/طابور أثناء الاستعادة')
{
  reset()
  setSyncFeatureEnabledForTests(true)
  const srv = makeServer()
  setSyncTransportForTests(srv.transport)
  setSyncRuntime('A', true) // recoveryActive = true
  srv.setUser('A')

  check('enqueue أثناء الاستعادة → null (لا التقاط)', enqueueSyncOperation('todos', 'self', { data: {} }) === null, [5])
  const flushed = await flushSyncQueue(Date.now())
  check('flush أثناء الاستعادة → لا رفع (guarded owner = null)', flushed.state === 'guest' && srv.rowCount('todos') === 0, [5])
  check('hydrate أثناء الاستعادة → لا سحب/دفعة', (await hydrateFromCloud()).state === 'guest', [5])
  check('import أثناء الاستعادة → مرفوض (requirePortabilityOwner يرمي)', didThrow(() => requirePortabilityOwner('A')), [5])

  // after recovery ends, operations resume — and no double-batch of a phantom op.
  setSyncRuntime('A', false)
  enqueueSyncOperation('todos', 'self', { data: { items: [] } })
  const resumed = await flushSyncQueue(Date.now())
  check('بعد انتهاء الاستعادة → العمليات تعود بشكل سليم', resumed.state === 'synced' && srv.rowCount('todos') === 1, [5])
  check('لا دفعة مزدوجة بعد الاستعادة (عنصر واحد)', srv.rowCount('todos') === 1, [7])
}

// ═══════════════════ FAMILY 7 — time & clock ═══════════════════
console.log('\n⑦ الزمن: حدود اليوم لكل مفتاح، تحرّك الساعة لا ينقل بيانات ليوم خطأ')
{
  reset()
  // day stamp is device-local and per-key → clock moves cannot bleed days.
  const d1 = new Date(2026, 6, 16, 23, 30) // Jul 16 local
  const d2 = new Date(2026, 6, 17, 0, 30) // Jul 17 local (past midnight)
  check('منتصف الليل → ختما يوم مختلفان', getDayStamp(d1) !== getDayStamp(d2))
  __setClock(new Date(2026, 6, 16, 12, 0).getTime())
  setSteps(5000, getDayStamp(new Date(2026, 6, 16)))
  setSteps(3000, getDayStamp(new Date(2026, 6, 17)))
  check('خطوات يومين محفوظة تحت مفتاحي يوم منفصلين', getSteps(getDayStamp(new Date(2026, 6, 16))) === 5000 && getSteps(getDayStamp(new Date(2026, 6, 17))) === 3000, [8])
  // clock back a week: the two day-buckets are untouched (no false merge/streak).
  __setClock(new Date(2026, 6, 9, 12, 0).getTime())
  check('إرجاع الساعة أسبوعًا → بيانات اليومين السابقين لم تنتقل/تُدمج', getSteps(getDayStamp(new Date(2026, 6, 16))) === 5000 && getSteps(getDayStamp(new Date(2026, 6, 17))) === 3000, [8])
  check('يوم قديم لا خطوات له → 0 (لا streak زائف)', getSteps(getDayStamp(new Date(2020, 0, 1))) === 0, [8])
  // clock BACK keeps an active snapshot fresh (real data, not falsely expired).
  __setClock(2_100_000_000_000)
  saveActiveSession('A', makeSnapshot({ savedAt: Date.now() }))
  check('تحرّك الساعة للخلف يُبقي اللقطة طازجة (لا انتهاء زائف)', loadActiveSession('A', Date.now() - 3600_000) !== null, [2])
  // clock FORWARD > 12h correctly expires it.
  check('تقديم الساعة > 12س → انتهاء صحيح للقطة', loadActiveSession('A', Date.now() + ACTIVE_SESSION_MAX_AGE_MS + 1000) === null, [2])
}

// ═══════════════════ FAMILY 8 — app update / schema migration ═══════════════════
console.log('\n⑧ تحديث التطبيق: schema الحالي يُقرأ، غير المعروف يُعزل، الجلسة تنجو من تحديث')
{
  reset()
  __setClock(2_150_000_000_000)
  // current schema (version 1) survives a normal update/reload.
  saveActiveSession('A', makeSnapshot({ savedAt: Date.now() }))
  check('active workout ينجو من تحديث عادي (schema الحالي يُقرأ)', loadActiveSession('A', Date.now() + 1000) !== null, [12])
  // unknown/future schema is isolated (rejected), never mis-read as current.
  check('schema غير معروف (v2) يُرفض/يُعزل — لا قراءة خاطئة', isRestorableSnapshot(makeSnapshot({ version: 2 as unknown as 1 }), Date.now()) === false, [9])
  // history read tolerates an older/leaner shape without crashing (normalize-on-read).
  ls.setItem('qimmah:today:v1', '{"date":"2020-01-01"}') // missing `done`
  check('شكل «اليوم» أقدم (بلا done) يُقرأ بأمان بعد التحديث', !didThrow(() => loadToday()), [9])
}

// ═══════════════════ FAMILY 9 — races & double-submit ═══════════════════
console.log('\n⑨ السباقات: نقر مزدوج، ترتيب أحداث معكوس، تبويبان — كل عملية حرجة idempotent')
{
  reset()
  setSyncFeatureEnabledForTests(true)
  const srv = makeServer()
  setSyncTransportForTests(srv.transport)
  setSyncRuntime('A', false)
  srv.setUser('A')

  // double add-food / double save-measurement (same entity, rapid): last write wins, one op.
  const ops = shuffle([
    () => enqueueSyncOperation('measurement_logs', 'm1', { local_id: 'm1', values: { weightKg: 80 } }),
    () => enqueueSyncOperation('measurement_logs', 'm1', { local_id: 'm1', values: { weightKg: 81 } }),
    () => enqueueSyncOperation('daily_logs', '2026-07-16', { date: '2026-07-16', data: { nutrition: { a: 1 } } }),
    () => enqueueSyncOperation('daily_logs', '2026-07-16', { date: '2026-07-16', data: { nutrition: { a: 2 } } }),
  ])
  ops.forEach((op) => op())
  check('نقر/حفظ مزدوج سريع (ترتيب مبعثر بالبذرة) → عنصر واحد لكل كيان', readSyncQueue('A').filter((o) => o.table === 'measurement_logs').length === 1 && readSyncQueue('A').filter((o) => o.table === 'daily_logs').length === 1, [3, 7])

  await flushSyncQueue(Date.now())
  check('بعد الرفع: صفّ قياس واحد وصفّ يوم واحد (لا تكرار)', srv.rowCount('measurement_logs') === 1 && srv.rowCount('daily_logs') === 1, [7])

  // logout mid-flush protection is structural: readSyncQueue/remove/schedule all
  // self-guard to the runtime owner (asserted in ⑤). Reverse-ordered storage
  // events for a foreign owner are dropped (asserted in ③).
  check('طابور بحسابين: قراءة A لا تُرجع عمليات B إطلاقًا', (() => {
    ls.setItem(`${SYNC_QUEUE_PREFIX}A`, JSON.stringify([
      { id: 'a1', userId: 'A', table: 'todos', action: 'upsert', entityKey: 'self', payload: {}, createdAt: 'x', attempts: 0, nextAttemptAt: 0 },
      { id: 'b1', userId: 'B', table: 'todos', action: 'upsert', entityKey: 'self', payload: {}, createdAt: 'x', attempts: 0, nextAttemptAt: 0 },
    ]))
    return readSyncQueue('A').every((o) => o.userId === 'A') && readSyncQueue('A').length === 1
  })(), [1, 8])
}

// ═══════════════════ INVARIANT 6 & 11 — import safety + no secrets in logs ═══════════════════
console.log('\n⑩ الاستيراد: رفض المفاتيح الخام/التلويث، وعدم تسريب أسرار في console')
{
  reset()
  setSyncFeatureEnabledForTests(true)
  setSyncRuntime('A', false)
  const base = { kind: 'qimmah-data-export', app: 'qimmah', appVersion: '1.0.0', exportedAt: '2026-07-16T00:00:00.000Z', summaryAr: '', counts: {}, stores: {}, unregistered: {} }

  check('حزمة سليمة فارغة تُقبل', !didThrow(() => parseImportFile(JSON.stringify({ ...base, schemaVersion: 1 }), 'A')), [6])
  // Raw JSON string with a LITERAL __proto__ key (an object literal would fold it
  // into the prototype and JSON.stringify would drop it — the reviver must see it).
  const protoPayload = '{"kind":"qimmah-data-export","app":"qimmah","appVersion":"1.0.0","exportedAt":"2026-07-16T00:00:00.000Z","summaryAr":"","counts":{},"schemaVersion":1,"unregistered":{},"stores":{"__proto__":{"x":1}}}'
  check('حقن __proto__ في الحزمة (نص خام) → مرفوض', didThrow(() => parseImportFile(protoPayload, 'A')), [6])
  check('متجر مجهول → مرفوض (allowlist فقط)', didThrow(() => parseImportFile(JSON.stringify({ ...base, schemaVersion: 1, stores: { unknownStore: [] } }), 'A')), [6])
  check('مفاتيح خام غير مسجّلة (مثل رمز الجلسة) → مرفوضة', didThrow(() => parseImportFile(JSON.stringify({ ...base, schemaVersion: 1, unregistered: { 'qimmah:supabase-auth:v1': { token: 'x' } } }), 'A')), [1, 6])
  check('إصدار مخطّط غير متوافق → مرفوض', didThrow(() => parseImportFile(JSON.stringify({ ...base, schemaVersion: 999 }), 'A')), [6])
  // a rejected import must not have written the raw key.
  check('بعد رفض الاستيراد: لا مفتاح خام مكتوب (qimmah:supabase-auth غير موجود)', ls.getItem('qimmah:supabase-auth:v1') === null, [6])

  // no secrets in console: capture conflict logging during a hydrate overlay.
  reset()
  setSyncFeatureEnabledForTests(true)
  const srv = makeServer()
  setSyncTransportForTests(srv.transport)
  setSyncRuntime('A', false)
  srv.setUser('A')
  // seed cloud + local so hydrate logs a conflict, then inspect what was logged.
  srv.rows.workout_sessions = new Map([['cloud-1', { local_id: 'cloud-1', data: { id: 'cloud-1' } }]])
  ls.setItem('qimmah:history:workoutSessions:v1', '[{"id":"cloud-1","exercises":[]}]')
  const logged: unknown[] = []
  const origInfo = console.info
  console.info = (...a: unknown[]) => { logged.push(...a) }
  await hydrateFromCloud()
  console.info = origInfo
  const leaked = JSON.stringify(logged)
  check('سجلّ التعارض لا يحوي حمولة/توكن/بريد/قيم صحية', !/token|email|password|access_token|weightKg|"data":/.test(leaked), [11])
}

// ─────────────────────────── summary ───────────────────────────
HR()
const REQUIRED_INVARIANTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const uncovered = REQUIRED_INVARIANTS.filter((n) => !coveredInvariants.has(n))
console.log(`Invariants exercised: ${[...coveredInvariants].sort((a, b) => a - b).join(', ')}`)
if (uncovered.length) console.log(`⚠ Invariants NOT exercised by harness: ${uncovered.join(', ')}`)
if (brokenInvariants.size) console.log(`✗ Invariants BROKEN: ${[...brokenInvariants].sort((a, b) => a - b).join(', ')}`)
HR()
if (fail === 0) {
  console.log(`✅ CHAOS PROOF PASSED — ${pass} checks, seed=${__CHAOS_SEED}, 0 data-loss / 0 account-mix / 0 false-success.`)
} else {
  console.log(`❌ CHAOS PROOF FAILED — ${fail} of ${pass + fail} checks broke (seed=${__CHAOS_SEED}).`)
  process.exit(1)
}
