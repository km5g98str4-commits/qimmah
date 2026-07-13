import { wipeUserData } from '@/lib/accountScope'
import { exportHistory, saveWorkoutSession } from '@/lib/historyStore'
import {
  backupKey,
  enqueueSyncDelete,
  enqueueSyncOperation,
  readSyncQueue,
  setSyncFeatureEnabledForTests,
  setSyncRuntime,
  SYNC_QUEUE_PREFIX,
} from '@/lib/syncQueue'
import {
  flushSyncQueue,
  hydrateFromCloud,
  setSyncTransportForTests,
  type SyncTransport,
} from '@/lib/syncService'
import { enqueueAuxOperations } from '@/lib/syncStores'
import { getSteps } from '@/lib/stepCounter'
import { getDayStamp } from '@/lib/today'

let pass = 0
let fail = 0
function check(label: string, condition: boolean): void {
  if (condition) {
    pass += 1
    console.log(`  ✓ ${label}`)
  } else {
    fail += 1
    console.log(`  ✗ FAIL: ${label}`)
  }
}

const calls: { table: string; rows: Record<string, unknown>[] }[] = []
let owner = 'A'
let failUpsert = false
let cloudRows: Record<string, Record<string, unknown>[]> = {}
const transport: SyncTransport = {
  async currentUserId() {
    return owner
  },
  async upsert(table, rows) {
    calls.push({ table, rows })
    if (failUpsert) throw new Error('offline')
  },
  async delete(table, userId, entityKeys) {
    calls.push({ table, rows: entityKeys.map((entityKey) => ({ user_id: userId, entityKey, deleted: true })) })
    if (failUpsert) throw new Error('offline')
  },
  async select(table) {
    return cloudRows[table] ?? []
  },
}

setSyncFeatureEnabledForTests(true)
setSyncTransportForTests(transport)

console.log('\n① enqueue / persistence / batching / idempotent owner rows')
localStorage.clear()
setSyncRuntime('A', false)
enqueueSyncOperation('daily_logs', '2026-07-13', { date: '2026-07-13', data: { a: 1 } })
enqueueSyncOperation('daily_logs', '2026-07-13', { date: '2026-07-13', data: { a: 2 } })
check('latest entity write de-duplicates stale work', readSyncQueue('A').length === 1)
setSyncRuntime(null, false)
setSyncRuntime('A', false)
check('queue survives a simulated restart/runtime reset', JSON.parse(localStorage.getItem(`${SYNC_QUEUE_PREFIX}A`) ?? '[]').length === 1)
await flushSyncQueue(1_000)
check('successful flush clears queue', readSyncQueue('A').length === 0)
check('uploaded row is owner-scoped', calls.at(-1)?.rows[0].user_id === 'A')
check('latest payload wins', (calls.at(-1)?.rows[0].data as { a?: number })?.a === 2)

calls.length = 0
for (let i = 0; i < 51; i += 1) enqueueSyncOperation('daily_logs', `batch-${i}`, { date: `batch-${i}`, data: {} })
await flushSyncQueue(2_000)
check('51 same-table operations flush in sane 50-row batches', calls.length === 2 && calls[0].rows.length === 50 && calls[1].rows.length === 1)

calls.length = 0
enqueueSyncDelete('measurement_logs', 'measurement-to-delete')
await flushSyncQueue(3_000)
check('idempotent delete reaches the owner-scoped transport', calls[0]?.rows[0].entityKey === 'measurement-to-delete' && calls[0]?.rows[0].user_id === 'A')

console.log('\n② retry + exponential backoff')
enqueueSyncOperation('daily_logs', 'retry', { date: '2026-07-14', data: {} })
failUpsert = true
await flushSyncQueue(10_000)
let retry = readSyncQueue('A')[0]
check('failure retains operation', retry?.attempts === 1)
check('first retry is delayed by 1 second', retry?.nextAttemptAt === 11_000)
const callCount = calls.length
await flushSyncQueue(10_500)
check('operation does not run before backoff expires', calls.length === callCount)
await flushSyncQueue(11_000)
retry = readSyncQueue('A')[0]
check('second failure doubles backoff', retry?.attempts === 2 && retry.nextAttemptAt === 13_000)
failUpsert = false
await flushSyncQueue(13_000)
check('retry eventually flushes', readSyncQueue('A').length === 0)

console.log('\n③ owner guard + recovery guard')
setSyncRuntime('A', false)
enqueueSyncOperation('daily_logs', 'guard', { date: '2026-07-15', data: {} })
setSyncRuntime('B', false)
owner = 'B'
const beforeGuard = calls.length
await flushSyncQueue()
check('different current owner never executes A queue', calls.length === beforeGuard && readSyncQueue('A').length === 1)
setSyncRuntime('A', true)
owner = 'A'
await flushSyncQueue()
check('PASSWORD_RECOVERY performs no network operation', calls.length === beforeGuard && readSyncQueue('A').length === 1)

console.log('\n④ wipe clears owner queue + backup')
localStorage.setItem(backupKey('A'), '{"private":true}')
wipeUserData('A')
check('owner queue cleared', readSyncQueue('A').length === 0)
check('owner backup cleared', localStorage.getItem(backupKey('A')) === null)

console.log('\n⑤ hydrate: backup first + server-wins merge + upload merged local')
localStorage.clear()
setSyncRuntime('A', false)
owner = 'A'
const localSession = {
  id: 'same-id',
  date: '2026-07-10',
  startedAt: '2026-07-10T10:00:00.000Z',
  workoutDayId: 'local-day',
  workoutDayName: 'Local',
  exercises: [],
}
saveWorkoutSession(localSession)
cloudRows = {
  workout_sessions: [
    {
      local_id: 'same-id',
      data: { ...localSession, workoutDayId: 'server-day', workoutDayName: 'Server' },
    },
  ],
}
calls.length = 0
await hydrateFromCloud()
const backup = JSON.parse(localStorage.getItem(backupKey('A')) ?? 'null') as { history?: { workoutSessions?: unknown[] } } | null
check('pre-hydration local snapshot exists', backup?.history?.workoutSessions?.length === 1)
check('server wins the conflicting entity', exportHistory().workoutSessions[0]?.workoutDayId === 'server-day')
check('merged snapshot is uploaded through queue', calls.some((call) => call.table === 'workout_sessions'))

// Capture conflict logs (metadata only) to prove overwrites are logged, not dropped.
const conflicts: { table: string; entityKey: string }[] = []
const origInfo = console.info
console.info = (...args: unknown[]) => {
  if (args[0] === '[qimmah-sync-conflict]' && args[1] && typeof args[1] === 'object') {
    conflicts.push(args[1] as { table: string; entityKey: string })
  }
  origInfo(...(args as []))
}
const today = getDayStamp()

console.log('\n⑥ coverage extension: aux stores → dedicated tables')
localStorage.clear()
setSyncRuntime('A', false)
owner = 'A'
calls.length = 0
localStorage.setItem('qimmah:steps:v1', JSON.stringify({ '2026-07-13': 8000, '2026-07-12': 6000 }))
localStorage.setItem('qimmah:stepSource:v1', JSON.stringify({ '2026-07-13': 'manual', '2026-07-12': 'healthkit' }))
localStorage.setItem('qimmah:achievements:v1', JSON.stringify({ unlocked: { first_workout: '2026-07-10' }, proteinDays: ['2026-07-11'], prCount: 3 }))
localStorage.setItem('qimmah:customPlan:v1', JSON.stringify({ A: { plan: { days: [{ id: 'd1', name: 'Push', nameEn: 'Push', exercises: [] }] }, source: 'custom', updatedAt: '2026-07-10T00:00:00.000Z' } }))
localStorage.setItem('qimmah:todo:v1:A', JSON.stringify({ date: today, items: [{ id: 't1', text: 'stretch', done: false }] }))
await flushSyncQueue(20_000)
const tbl = (t: string) => calls.filter((c) => c.table === t)
const stepRows = tbl('step_logs')[0]?.rows ?? []
check('step_logs uploaded per-day, owner-scoped', stepRows.length === 2 && stepRows.every((r) => r.user_id === 'A') && stepRows.some((r) => r.date === '2026-07-13' && r.steps === 8000 && r.source === 'manual'))
check('achievements uploaded as single owner row', tbl('achievements')[0]?.rows[0]?.user_id === 'A' && (tbl('achievements')[0]?.rows[0]?.data as { prCount?: number })?.prCount === 3)
check('custom_plans uploaded with source + plan data', tbl('custom_plans')[0]?.rows[0]?.user_id === 'A' && tbl('custom_plans')[0]?.rows[0]?.source === 'custom')
check('todos uploaded as single owner row', tbl('todos')[0]?.rows[0]?.user_id === 'A' && Array.isArray((tbl('todos')[0]?.rows[0]?.data as { items?: unknown[] })?.items))
check('re-capture de-duplicates (bounded queue, no growth)', (enqueueAuxOperations('A'), readSyncQueue('A').filter((op) => op.table === 'step_logs').length === 2))

console.log('\n⑦ aux hydrate: backup-first + server-wins + conflict logged')
localStorage.clear()
setSyncRuntime('A', false)
owner = 'A'
localStorage.setItem('qimmah:steps:v1', JSON.stringify({ '2026-07-12': 100 }))
localStorage.setItem('qimmah:stepSource:v1', JSON.stringify({ '2026-07-12': 'manual' }))
cloudRows = {
  step_logs: [
    { local_id: 'x', date: '2026-07-12', steps: 9999, source: 'healthkit' },
    { local_id: 'y', date: '2026-07-11', steps: 5000, source: 'manual' },
  ],
  achievements: [{ data: { unlocked: { server_medal: '2026-07-01' }, proteinDays: [], prCount: 7 } }],
  custom_plans: [{ source: 'auto', data: { days: [{ id: 'server-day', name: 'S', nameEn: 'S', exercises: [] }] } }],
  todos: [{ data: { date: today, items: [{ id: 's1', text: 'server-todo', done: false }] } }],
}
conflicts.length = 0
calls.length = 0
await hydrateFromCloud()
const backup2 = JSON.parse(localStorage.getItem(backupKey('A')) ?? 'null') as { aux?: { steps?: { date: string; steps: number }[] } } | null
check('backup captured aux BEFORE overlay', backup2?.aux?.steps?.some((s) => s.date === '2026-07-12' && s.steps === 100) === true)
check('server wins the conflicting step-day', getSteps('2026-07-12') === 9999)
check('server-only step-day is added', getSteps('2026-07-11') === 5000)
check('aux conflict was logged, not dropped', conflicts.some((c) => c.table === 'step_logs' && c.entityKey === '2026-07-12'))
check('achievements overlaid from server', (JSON.parse(localStorage.getItem('qimmah:achievements:v1') ?? '{}') as { prCount?: number }).prCount === 7)
check('merged aux re-uploaded through queue', calls.some((c) => c.table === 'step_logs'))

console.log('\n⑧ owner/recovery guard covers aux capture')
localStorage.clear()
setSyncRuntime('A', true) // recovery active
owner = 'A'
localStorage.setItem('qimmah:steps:v1', JSON.stringify({ '2026-07-13': 500 }))
calls.length = 0
await flushSyncQueue(25_000)
check('recovery session performs NO aux upload', calls.length === 0)

console.log('\n⑨ wipe clears aux queue ops + aux store keys')
localStorage.clear()
setSyncRuntime('A', false)
owner = 'A'
localStorage.setItem('qimmah:steps:v1', JSON.stringify({ '2026-07-13': 700 }))
localStorage.setItem('qimmah:achievements:v1', JSON.stringify({ unlocked: { m: 'd' }, proteinDays: [], prCount: 1 }))
enqueueAuxOperations('A')
check('aux ops enqueued into the owner queue', readSyncQueue('A').some((op) => op.table === 'step_logs'))
wipeUserData('A')
check('wipe clears aux queue ops', readSyncQueue('A').length === 0)
check('wipe clears steps store key', localStorage.getItem('qimmah:steps:v1') === null)
check('wipe clears achievements store key', localStorage.getItem('qimmah:achievements:v1') === null)

console.info = origInfo
setSyncTransportForTests(undefined)
setSyncFeatureEnabledForTests(undefined)
console.log(`\n${'─'.repeat(46)}`)
if (fail === 0) console.log(`✅ كل فحوص المزامنة نجحت — ${pass} فحصًا.`)
else {
  console.log(`❌ فشل ${fail} من ${pass + fail}.`)
  process.exit(1)
}
