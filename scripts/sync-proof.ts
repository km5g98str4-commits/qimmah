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

setSyncTransportForTests(undefined)
setSyncFeatureEnabledForTests(undefined)
console.log(`\n${'─'.repeat(46)}`)
if (fail === 0) console.log(`✅ كل فحوص المزامنة نجحت — ${pass} فحصًا.`)
else {
  console.log(`❌ فشل ${fail} من ${pass + fail}.`)
  process.exit(1)
}
