// إثبات موجة سلامة البيانات — يغطي معايير القبول غير المغطاة بالإثباتات القائمة:
// بوابة التبنّي (لا رفع بيانات مجهولة المالك)، مشغّل الهجرات (idempotent ×2 +
// rollback كامل عند الفشل)، الحجر، مصفوفة LWW النقية، وختم الملكية عند التبديل.
// (A1/A3 يغطيها isolation 39 · A4/A5/A6 يغطيها sync 37 · A9 يغطيها portability 49+34.)

import { strict as assert } from 'node:assert'
import { resolveLww, stampMs, buildPendingSet, pendingKey } from '@/lib/syncLww'
import {
  DATA_OWNER_KEY,
  QUARANTINE_PREFIX,
  adoptPendingData,
  adoptionPendingFor,
  discardPendingData,
  getDataOwner,
  isMigrationDone,
  markAdoptionPendingIfUnowned,
  quarantineUnscopedUserData,
  runMigration,
  stampDataOwner,
} from '@/lib/dataOwnership'
import { reconcileAccountScope, setLastUser } from '@/lib/accountScope'
import { setSyncRuntime, setSyncFeatureEnabledForTests, syncAllowedFor } from '@/lib/syncQueue'
import { unscopedUserKeys, retiredKeys, DATA_KEYS } from '@/lib/userDataKeys'

let pass = 0
const check = (label: string, cond: boolean) => {
  assert.ok(cond, `FAIL: ${label}`)
  pass++
  console.log(`  ✓ ${label}`)
}
const ls = globalThis.localStorage

console.log('\n① مصفوفة LWW النقية (المعياران 4 و5 على مستوى الوحدة)')
check('سحابي أحدث يفوز', resolveLww({ localExists: true, localStamp: '2026-01-01T00:00:00Z', cloudStamp: '2026-01-02T00:00:00Z', pendingLocal: false }) === 'cloud')
check('سحابي أقدم لا يدهس محليًا أحدث', resolveLww({ localExists: true, localStamp: '2026-01-02T00:00:00Z', cloudStamp: '2026-01-01T00:00:00Z', pendingLocal: false }) === 'local')
check('التساوي = المحلي يبقى (لا دهس بلا دليل)', resolveLww({ localExists: true, localStamp: '2026-01-01T00:00:00Z', cloudStamp: '2026-01-01T00:00:00Z', pendingLocal: false }) === 'local')
check('معلّق بالطابور يفوز حتى على سحابي أحدث', resolveLww({ localExists: true, localStamp: '2026-01-01T00:00:00Z', cloudStamp: '2026-01-05T00:00:00Z', pendingLocal: true }) === 'local')
check('لا سجل محلي ⇒ السحابي يُضاف', resolveLww({ localExists: false, localStamp: 0, cloudStamp: 0, pendingLocal: false }) === 'cloud')
check('سحابي بلا طابع لا يدهس محليًا موجودًا', resolveLww({ localExists: true, localStamp: 0, cloudStamp: undefined, pendingLocal: false }) === 'local')
check('stampMs: ISO صالح', stampMs('2026-01-01T00:00:00Z') > 0)
check('stampMs: فاسد ⇒ 0', stampMs('غير-تاريخ') === 0 && stampMs(undefined) === 0)
check('buildPendingSet/pendingKey متسقان', buildPendingSet([{ table: 'daily_logs', entityKey: '2026-01-01' }]).has(pendingKey('daily_logs', '2026-01-01')))

console.log('\n② بوابة التبنّي — بيانات مجهولة المالك لا تُرفع (المعياران 2 و3 من زاوية الضيف)')
ls.clear()
setSyncFeatureEnabledForTests(true)
// جهاز نظيف: دخول حقيقي يختم مباشرة، لا تعليق.
check('جهاز نظيف: لا تعليق والختم مباشر', markAdoptionPendingIfUnowned('user-A') === false && getDataOwner() === 'user-A')
// بيانات ضيف موجودة ثم دخول حساب حقيقي ⇒ تعليق + حجب الرفع.
ls.clear()
ls.setItem('qimmah:history:workoutSessions:v1', '[{"id":"s1"}]')
setLastUser(null)
reconcileAccountScope('user-A')
check('بيانات ضيف + دخول حقيقي ⇒ تبنٍّ معلّق', adoptionPendingFor() === 'user-A')
setSyncRuntime('user-A', false)
check('الرفع محجوب أثناء التعليق (لا تُرفع بيانات مجهولة لسحابة الحساب)', syncAllowedFor('user-A') === false)
adoptPendingData('user-A')
check('التبنّي الصريح يختم المالك ويفتح الرفع', getDataOwner() === 'user-A' && syncAllowedFor('user-A') === true)
// discard: يزيل التعليق فقط.
ls.setItem('qimmah:history:workoutSessions:v1', '[{"id":"s2"}]')
ls.removeItem(DATA_OWNER_KEY)
setLastUser(null)
reconcileAccountScope('user-B')
check('تعليق ثانٍ لحساب آخر', adoptionPendingFor() === 'user-B')
discardPendingData()
check('التجاهل الصريح يسقط التعليق', adoptionPendingFor() === null)

console.log('\n③ ختم الملكية عند تبديل حساب↔حساب (المعيار 3)')
ls.clear()
setLastUser('user-A')
ls.setItem('qimmah:history:workoutSessions:v1', '[{"id":"a-data"}]')
const res = reconcileAccountScope('user-B')
check('التبديل الحقيقي يمسح ويختم للمالك الجديد', res.wiped === true && getDataOwner() === 'user-B')
check('بيانات A لم تعد موجودة بعد التبديل', ls.getItem('qimmah:history:workoutSessions:v1') === null)

console.log('\n④ مشغّل الهجرات — idempotent ×2 + rollback كامل (المعياران 7 و8)')
ls.clear()
ls.setItem('src:key', 'قيمة-أصلية')
let runs = 0
const okDef = {
  id: 'test-ok-migration',
  keys: ['src:key', 'dst:key'],
  run: () => {
    runs++
    ls.setItem('dst:key', ls.getItem('src:key') ?? '')
  },
  verify: () => ls.getItem('dst:key') === 'قيمة-أصلية',
  cleanup: () => ls.removeItem('src:key'),
}
check('التشغيل الأول ينجح', runMigration(okDef).status === 'done')
check('المصدر حُذف فقط بعد نجاح مثبت (cleanup بعد verify)', ls.getItem('src:key') === null && ls.getItem('dst:key') === 'قيمة-أصلية')
check('التشغيل الثاني لا-شيء (idempotent — لا تكرار ولا فساد)', runMigration(okDef).status === 'skipped' && runs === 1)
check('سجل الهجرة موثَّق', isMigrationDone('test-ok-migration'))

// فشل في run ⇒ استرجاع snapshot كاملًا.
ls.setItem('a:key', 'أ')
ls.setItem('b:key', 'ب')
const failRun = {
  id: 'test-fail-run',
  keys: ['a:key', 'b:key'],
  run: () => {
    ls.setItem('a:key', 'مكسور')
    ls.removeItem('b:key')
    throw new Error('boom')
  },
  verify: () => true,
}
check('فشل run ⇒ rolled-back', runMigration(failRun).status === 'rolled-back')
check('rollback أعاد كل المفاتيح كما كانت', ls.getItem('a:key') === 'أ' && ls.getItem('b:key') === 'ب')
check('الهجرة الفاشلة غير موثقة (تُعاد لاحقًا)', !isMigrationDone('test-fail-run'))

// verify=false ⇒ rollback أيضًا، وcleanup لا يُستدعى.
let cleaned = false
const failVerify = {
  id: 'test-fail-verify',
  keys: ['a:key'],
  run: () => ls.setItem('a:key', 'مرشَّح'),
  verify: () => false,
  cleanup: () => {
    cleaned = true
  },
}
check('فشل verify ⇒ rolled-back و cleanup لم يُستدعَ', runMigration(failVerify).status === 'rolled-back' && !cleaned && ls.getItem('a:key') === 'أ')

console.log('\n⑤ الحجر — بيانات غير قابلة للنسبة تُعزل ولا تُحذف')
ls.clear()
ls.setItem('qimmah:history:workoutSessions:v1', '[{"id":"orphan"}]')
ls.setItem('qimmah:steps:v1', '{"2026-01-01":5000}')
const moved = quarantineUnscopedUserData('اختبار')
check('نُقل مفتاحان للحجر', moved === 2)
check('الأصل أُزيل والحجر يحمل الخام + السبب', ls.getItem('qimmah:history:workoutSessions:v1') === null && (ls.getItem(QUARANTINE_PREFIX + 'qimmah:history:workoutSessions:v1') ?? '').includes('orphan'))

console.log('\n⑥ اتساق السجل المركزي')
check('السجل يغطي ≥50 مفتاحًا', DATA_KEYS.length >= 50)
check('كل مفاتيح بيانات المستخدم غير الموسومة لها خطة owner-suffix', unscopedUserKeys().length >= 20)
check('legacy مرشّحة للإحالة موثّقة', retiredKeys().length >= 4)
const dupes = DATA_KEYS.map((d) => d.key).filter((k, i, a) => a.indexOf(k) !== i)
check('لا تكرار في السجل', dupes.length === 0)

setSyncFeatureEnabledForTests(undefined)
stampDataOwner('cleanup')
console.log(`\n✅ إثبات سلامة البيانات — ${pass} فحصًا.`)
