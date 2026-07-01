// P5 proof — التصفير اليومي التلقائي: عند تغيّر اليوم المخزّن يبدأ «اليوم» صفحة جديدة
// مع الحفاظ على سجلّ الأمس في المتجر التاريخي. أداة إثبات فقط (localStorage مُحاكى).

import { loadToday, saveToday, getDayStamp, TODAY_KEY } from '@/lib/today'
import { saveDailyLog, getDailyLog } from '@/lib/historyStore'

let failures = 0
function check(cond: boolean, msg: string) {
  console.log(`${cond ? '✅' : '❌'} ${msg}`)
  if (!cond) failures++
}

const today = getDayStamp()
const y = new Date()
y.setDate(y.getDate() - 1)
const yesterday = getDayStamp(y)

console.log(`اليوم=${today}  الأمس=${yesterday}`)

// 1) نُحاكي أنّ التطبيق أُغلق أمس وعلاماته محفوظة (اليوم + التاريخ الدائم).
const yesterdayDone = { 'w:0': true, 'w:1': true, 'w:2': true }
saveToday({ date: yesterday, done: yesterdayDone })
saveDailyLog(yesterday, { done: yesterdayDone })

check(getDailyLog(yesterday)?.done?.['w:0'] === true, 'سجلّ الأمس محفوظ في المتجر التاريخي قبل التصفير')

// 2) فتح التطبيق «اليوم» → يجب أن يتصفّر تلقائيًا (التاريخ المخزّن ≠ اليوم).
const state = loadToday()
check(state.date === today, `«اليوم» تصفّر تلقائيًا لتاريخ اليوم (${state.date})`)
check(Object.keys(state.done).length === 0, 'علامات اليوم فارغة بعد التصفير التلقائي')

// 3) الأهم: سجلّ الأمس لم يُمسّ (التاريخ محفوظ).
const yLog = getDailyLog(yesterday)
check(!!yLog && yLog.done?.['w:0'] === true && yLog.done?.['w:2'] === true, 'سجلّ الأمس ما زال كاملًا بعد التصفير (لا فقدان تاريخ)')

// 4) مفتاح «اليوم» في التخزين أصبح لليوم الحالي (كتابة صفحة جديدة).
const raw = JSON.parse(globalThis.localStorage.getItem(TODAY_KEY) || '{}')
check(raw.date === today, 'مفتاح التخزين يحمل تاريخ اليوم الجديد')

console.log(`\n${failures === 0 ? '✅ كل الفحوص نجحت' : `❌ ${failures} فحص فشل`}`)
process.exit(failures === 0 ? 0 : 1)
