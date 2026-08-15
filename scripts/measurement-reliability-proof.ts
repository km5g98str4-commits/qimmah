// إثبات صدق سجل القياسات: كل طفرة منتج محروسة، والفشل يبقي البايتات
// القديمة، بينما الاستعادة تبقى حقًا غير محجوب.

import { PaidActionDenied } from '@/lib/access/guard'
import { setEntitlement } from '@/lib/access/entitlementStore'
import { HISTORY_KEYS } from '@/lib/historyStore'
import { addLog, deleteLog, loadLogs, saveLogs, updateLog } from '@/lib/measurementLog'

declare global {
  // يعرّفها غلاف الإثبات فقط؛ ليست جزءًا من التطبيق.
  // eslint-disable-next-line no-var
  var __measurementWriteFailure: 'quota' | 'security' | null
}

let pass = 0
const check = (label: string, condition: boolean): void => {
  if (!condition) throw new Error(`FAIL: ${label}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}

console.log('\nإثبات صدق القياسات ومسار Premium')
localStorage.clear()
setEntitlement({ status: 'active', source: 'mock' })

const added = addLog({ id: 'manual-1', date: '2026-08-13', values: { weightKg: 81.5, waistCm: 87 } })
check('الإنشاء الناجح يعيد ok ويحفظ المصدر اليدوي', added.result === 'ok' && loadLogs()[0].source === 'manual')

const updated = updateLog({ id: 'manual-1', date: '2026-08-13', values: { weightKg: 80.8, waistCm: 86.5 } })
check('التعديل يحدّث السجل نفسه بلا تكرار', updated.result === 'ok' && loadLogs().length === 1 && loadLogs()[0].values.weightKg === 80.8)

const stableBytes = localStorage.getItem(HISTORY_KEYS.measurementLogs)
globalThis.__measurementWriteFailure = 'quota'
const failedAdd = addLog({ id: 'manual-2', date: '2026-08-14', values: { weightKg: 80.2 } })
check('امتلاء الحصّة يعود quota ولا يتنكّر في نجاح', failedAdd.result === 'quota')
check('فشل الإنشاء يبقي البايتات والقائمة القديمة بلا تغيير', localStorage.getItem(HISTORY_KEYS.measurementLogs) === stableBytes && loadLogs().length === 1)

const failedEdit = updateLog({ id: 'manual-1', date: '2026-08-13', values: { weightKg: 79 } })
check('فشل التعديل يبقي القيمة السابقة', failedEdit.result === 'quota' && loadLogs()[0].values.weightKg === 80.8)

const failedDelete = deleteLog('manual-1')
check('فشل الحذف يبقي السجل والبايتات السابقة', failedDelete.result === 'quota' && loadLogs().length === 1 && localStorage.getItem(HISTORY_KEYS.measurementLogs) === stableBytes)

globalThis.__measurementWriteFailure = null
setEntitlement({ status: 'none', source: 'none' })
let denied: unknown
try {
  deleteLog('manual-1')
} catch (error) {
  denied = error
}
check('استدعاء كاتب الحذف مباشرةً في Preview يُرفض بخطأ PaidActionDenied', denied instanceof PaidActionDenied)
check('رفض Preview لا يغيّر السجل', loadLogs().length === 1 && localStorage.getItem(HISTORY_KEYS.measurementLogs) === stableBytes)

// الاستعادة/المزامنة ليست استهلاك ميزة جديدة: تبقى متاحة بلا استحقاق.
saveLogs([{ id: 'restored', date: '2026-08-12', values: { weightKg: 82 }, source: 'manual' }])
check('استعادة بيانات المستخدم تبقى متاحة بلا Premium', loadLogs().length === 1 && loadLogs()[0].id === 'restored')

setEntitlement({ status: 'active', source: 'mock' })
saveLogs([{ id: 'health-1', date: '2026-08-11', values: { weightKg: 83 }, source: 'health' }])
const healthEdit = updateLog({ id: 'health-1', date: '2026-08-11', values: { weightKg: 70 } })
const healthDelete = deleteLog('health-1')
check('سجل Apple Health لا يُعدّل أو يُحذف من المحرّر اليدوي', healthEdit.result === 'error' && healthDelete.result === 'error' && loadLogs()[0].values.weightKg === 83)

saveLogs([{ id: 'manual-final', date: '2026-08-14', values: { weightKg: 80 }, source: 'manual' }])
const removed = deleteLog('manual-final')
check('الحذف الناجح وحده يزيل السجل', removed.result === 'ok' && loadLogs().length === 0)

console.log(`\n✅ صدق القياسات: ${pass} فحوص، 0 فشل.`)
