// Storage-honesty proof — a failed save must never look like a successful one.
//
// The P0 it closes: WorkoutV2's confirmFinish wrapped the save in an empty
// try/catch, then cleared the active session and showed the completion screen —
// even when localStorage rejected every write (Safari private mode, full quota,
// blocked site data). The user lost the workout AND was told it was saved.
//
// This exercises the exact data seam WorkoutV2 composes on confirm:
//   snapshot → commit → inspect the commit result → (on failure) restore,
// so the proof fails if that seam ever goes back to swallowing errors.
//
// Runs on a localStorage shim with a switchable quota fault (no browser) via
// run-storage-honesty-proof.mjs.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const ROOT = process.cwd()
import { writeRaw, writeJson, readJson, readRaw, getStorageFailure, isStorageWritable } from '@/lib/safeStorage'
import { commitFinishedSession } from '@/lib/finishWorkout'
import { buildV2WorkoutSession } from '@/lib/workoutV2Persist'
import { getWorkoutSessions, setWorkoutSessions } from '@/lib/historyStore'
import { snapshotWorkoutStorage, restoreWorkoutStorage } from '@/lib/workoutFinishUndo'
import type { WorkoutV2Model } from '@/lib/workoutV2Model'

// [QIM-WEB-FOUNDER-UX-003/حزمة ٢] هذا الإثبات يمارس **كتّاب حالة مدفوعة**
// (تمرين/تغذية/قياسات). بعد بوّابة الوصول صار الافتراض منعًا، فيلزم أن يعلن
// الإثبات شخصيته: مستخدم مُفعَّل. هذا **ليس إضعافًا للبوّابة** — موضوع الإثبات
// سلوك التخزين لا الاستحقاق، وحارس الاستحقاق نفسه يحرسه `test:access-gate`
// و`test:e2e:preview-gate` بشخصيتَي معاينة ومُفعَّل.
import { setEntitlement } from '@/lib/access/entitlementStore'
setEntitlement({ status: 'active', source: 'mock' })


// Fault switches installed by the runner's banner.
const fault = globalThis as unknown as { __setQuota: (on: boolean) => void; __setBlocked: (on: boolean) => void }

let passed = 0
let failed = 0
function check(label: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${label}`) }
  else { failed++; console.log(`  ✗ ${label}`) }
}

// Minimal model + active snapshot (only the fields buildV2WorkoutSession reads).
const model = {
  available: true,
  session: { title: 'دفع' },
  exercises: [{ id: 'row-0', exerciseId: 'bench-press', nameAr: 'بنش برس', nameEn: 'Bench press', sets: 3, reps: '5', restSec: 90 }],
} as unknown as WorkoutV2Model

const activeAt = (weight: number, startedAt: number) => ({
  startedAt,
  rows: { 'row-0': [{ weight, reps: 5, done: true }, { weight, reps: 5, done: true }, { weight, reps: 5, done: true }] },
})

// The key WorkoutV2 uses for the in-progress workout — clearing it is exactly
// what the old code did on a failed save.
const ACTIVE_KEY = 'qimmah:active-workout:v2:guest'

// ── (1) A quota-rejected write returns an honest result and never throws ──
console.log('\n(1) safeStorage under a quota fault')
fault.__setQuota(true)
let threw = false
let result: string = 'ok'
try {
  result = writeRaw('qimmah:probe:v1', 'x')
} catch {
  threw = true
}
check('writeRaw did NOT throw', !threw)
check("writeRaw returned 'quota'", result === 'quota')
check('the value was NOT stored', readRaw('qimmah:probe:v1') === null)
check("writeJson also reports 'quota'", writeJson('qimmah:probe:v2', { a: 1 }) === 'quota')
check('the failure sentinel records the rejected key', getStorageFailure()?.key === 'qimmah:probe:v2')
check('isStorageWritable() reports storage as NOT writable', isStorageWritable() === false)
fault.__setQuota(false)
check('isStorageWritable() recovers once the fault clears', isStorageWritable() === true)

// ── (2) Finishing a workout while storage is full: no false success ──
console.log('\n(2) finish path under a full storage')
// Seed a prior session + a live active workout on healthy storage.
const prior = buildV2WorkoutSession(activeAt(60, 1_000), model, { date: '2026-07-10', finishedAtMs: 2_000 })
setWorkoutSessions([prior])
writeRaw(ACTIVE_KEY, JSON.stringify(activeAt(80, 3_000)))
const baselineSessions = getWorkoutSessions().length

const session = buildV2WorkoutSession(activeAt(80, 3_000), model, { date: '2026-07-18', finishedAtMs: 4_000 })
const snapshot = snapshotWorkoutStorage() // what confirmFinish captures first
check('snapshot captured the in-progress workout', snapshot[ACTIVE_KEY] != null)

fault.__setQuota(true)
let commitThrew = false
let commit: ReturnType<typeof commitFinishedSession> = { ok: true, prs: [], failure: null }
try {
  commit = commitFinishedSession(session)
} catch {
  commitThrew = true
}
check('the commit did NOT throw', !commitThrew)
check('the commit reports FAILURE (no false success)', commit.ok === false)
check("the failure reason is 'quota'", commit.failure === 'quota')
check('no PRs were claimed on a failed save', commit.prs.length === 0)
check('the finished session was NOT persisted', !getWorkoutSessions().some((s) => s.id === session.id))
check('the prior history is untouched', getWorkoutSessions().length === baselineSessions)

// confirmFinish rolls back to the snapshot and returns — it must NOT clear the
// active workout, so the user is still inside their session.
restoreWorkoutStorage(snapshot)
check('the in-progress workout SURVIVED the failed save', readRaw(ACTIVE_KEY) != null)
fault.__setQuota(false)

// ── (2b) Blocked storage (private mode / site data off) is distinguished ──
console.log('\n(2b) finish path while storage is blocked')
fault.__setBlocked(true)
const blocked = commitFinishedSession(session)
check('a blocked storage also reports FAILURE', blocked.ok === false)
check("the failure reason is 'unavailable', not 'quota'", blocked.failure === 'unavailable')
fault.__setBlocked(false)

// ── (3) Healthy storage: the finish still works exactly as before ──
console.log('\n(3) finish path on healthy storage (no regression)')
const good = commitFinishedSession(session)
check('the commit reports SUCCESS', good.ok === true)
check('no failure reason on success', good.failure === null)
check('the finished session IS persisted', getWorkoutSessions().some((s) => s.id === session.id))
check('the session count grew by exactly one', getWorkoutSessions().length === baselineSessions + 1)

// ── (4) Corrupt data reads as absent — never a crash ──
console.log('\n(4) corrupt data degrades to the fallback')
writeRaw('qimmah:corrupt:v1', '{not json at all')
let readThrew = false
let value: { ok: boolean } = { ok: false }
try {
  value = readJson('qimmah:corrupt:v1', { ok: false })
} catch {
  readThrew = true
}
check('readJson did NOT throw on corrupt data', !readThrew)
check('readJson returned the fallback', value.ok === false)
check('readJson returns the fallback for a missing key', readJson('qimmah:absent:v1', 'fallback') === 'fallback')
writeRaw('qimmah:null:v1', 'null')
check('a stored null degrades to the fallback', readJson('qimmah:null:v1', 'fallback') === 'fallback')

// ── (5) [CTO-71] البند ٢ — الشاشة الحيّة v1 تفحص نتيجة الكتابة ولا تبتلعها ──
// كانت `WorkoutView.finish` تستدعي `persistFinishedSession` وتمضي لشاشة الملخّص
// مهما حدث: تخزين ممتلئ ⇒ تختفي الجلسة ويُعرض «أحسنت». فحص بنيوي مقترن يمنع عودته.
console.log('\n(5) the live v1 workout screen reports save failures honestly')
const liveWorkout = readFileSync(resolve(ROOT, 'src/views/WorkoutView.tsx'), 'utf8')
check('WorkoutView commits through the verified path', liveWorkout.includes('commitFinishedSession(session)'))
check('WorkoutView no longer uses the fire-and-forget persist', !liveWorkout.includes('persistFinishedSession('))
const commitAt = liveWorkout.indexOf('const commit = commitFinishedSession(session)')
const bailAt = liveWorkout.indexOf('setSaveError(commit.failure ?? \'error\')')
const summaryAt = liveWorkout.indexOf('setSummary({ session')
check('it bails on failure BEFORE showing any summary', commitAt > 0 && bailAt > commitAt && summaryAt > bailAt)
check('the failure surfaces an honest message, not a silent drop', liveWorkout.includes('d.saveFailedTitle') && liveWorkout.includes('role="alert"'))
// الفحص مقصور على **كتلة `finish` نفسها**: `setActiveDay(null)` يظهر أيضًا في
// `closeWithoutFinishing` المعرَّفة قبلها، فالمقارنة على الملف كلّه تكذب.
const finishBlock = (() => {
  const start = liveWorkout.indexOf('const finish = (session: WorkoutSession) => {')
  if (start < 0) return ''
  const end = liveWorkout.indexOf('\n  }', liveWorkout.indexOf('setSummary({ session', start))
  return end < 0 ? liveWorkout.slice(start) : liveWorkout.slice(start, end)
})()
check('the finish block was extracted with its own bounds', finishBlock.length > 200 && finishBlock.includes('commitFinishedSession'))
check('and the active session is NOT cleared on failure (work survives)', finishBlock.indexOf('setSaveError(commit.failure') < finishBlock.indexOf('setActiveDay(null)'))
// تأكيد مضادّ: لو أُزيل الخروج المبكر لسقط الفحص — نحاكيه ونتأكّد أنه يُكشف.
const smuggled = finishBlock.replace(/if \(!commit\.ok\)[\s\S]*?\}\n/, '')
check('a smuggled removal of the early bail is caught by name', !/setSaveError\(commit\.failure/.test(smuggled))

console.log(`\nStorage-honesty proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
