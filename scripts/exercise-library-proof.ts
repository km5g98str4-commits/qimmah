import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { exercises, getExercise } from '@/data/exercises'
import { getExerciseGif } from '@/data/exerciseGifs'
import { getExerciseMedia } from '@/data/exerciseMedia'
import { machineCatalog } from '@/data/machineCatalog'
import { filterExerciseLibrary } from '@/lib/exerciseLibrary'
import { resourceIdFromHash, routeFromHash, setExerciseHash } from '@/lib/appRoutes'

let passed = 0
function check(label: string, condition: unknown): void {
  assert.ok(condition, label)
  passed += 1
  console.log(`  ✓ ${label}`)
}

console.log('\n① الكتالوج والبحث والفلاتر من مصدر الحقيقة')
check('الكتالوج القانوني ما زال 181 تمرينًا', exercises.length === 181)

const arabicSample = exercises.find((exercise) => exercise.nameAr.trim().length > 3)
const englishSample = exercises.find((exercise) => exercise.nameEn.trim().length > 3)
assert.ok(arabicSample && englishSample)
check('البحث العربي يجد التمرين القانوني', filterExerciseLibrary({ search: arabicSample.nameAr, muscle: 'all', equipment: 'all', lang: 'ar' }).some((exercise) => exercise.id === arabicSample.id))
check('البحث الإنجليزي يجد التمرين القانوني', filterExerciseLibrary({ search: englishSample.nameEn.toUpperCase(), muscle: 'all', equipment: 'all', lang: 'en' }).some((exercise) => exercise.id === englishSample.id))

const combinedSample = exercises.find((exercise) => exercise.equipment.length > 0)
assert.ok(combinedSample)
const combined = filterExerciseLibrary({
  search: '',
  muscle: combinedSample.primaryMuscle,
  equipment: combinedSample.equipment[0],
  lang: 'ar',
})
check('دمج فلتر العضلة والمعدّة يعيد نتائج حقيقية', combined.some((exercise) => exercise.id === combinedSample.id))
check('كل نتيجة مركّبة تطابق العضلة والمعدّة معًا', combined.every((exercise) => exercise.primaryMuscle === combinedSample.primaryMuscle && exercise.equipment.includes(combinedSample.equipment[0])))
check('بحث غير موجود يعطي حالة فارغة فعلية', filterExerciseLibrary({ search: 'qimmah-no-such-exercise-001', muscle: 'all', equipment: 'all', lang: 'en' }).length === 0)

console.log('\n② الأجهزة والوسائط المرجعية')
const machineIds = machineCatalog.flatMap((group) => group.items.map((item) => item.exerciseId))
check('كتالوج الأجهزة غير فارغ', machineIds.length > 0)
check('كل جهاز يشير إلى تمرين قانوني', machineIds.every((id) => getExercise(id)))
check('حالة بديل الوسيط مطلوبة فعلًا في الكتالوج', exercises.some((exercise) => !getExerciseGif(exercise.id) && !getExerciseMedia(exercise.id)))

console.log('\n③ المسار العميق والدفع والاستبدال')
let currentHash = '#/exercises'
const fakeLocation = {
  get hash() { return currentHash },
  set hash(next: string) { currentHash = next.startsWith('#') ? next : `#${next}` },
  replace(next: string) { currentHash = next },
}
Object.defineProperty(globalThis, 'window', { value: { location: fakeLocation }, configurable: true })
setExerciseHash('barbell-bench-press')
check('فتح تمرين يبني #/exercises/:exerciseId', currentHash === '#/exercises/barbell-bench-press')
check('المسار العميق يبقى مصنّفًا exercises', routeFromHash() === 'exercises')
check('معرّف المورد يُقرأ من الرابط العميق', resourceIdFromHash() === 'barbell-bench-press')
setExerciseHash(null, 'replace')
check('العودة الآمنة تستبدل الرابط بالمكتبة', currentHash === '#/exercises')

console.log('\n④ حراسة الوصلة الحيّة والوصولية')
const viewSource = readFileSync('src/views/ExerciseLibraryView.tsx', 'utf8')
const detailSource = readFileSync('src/components/ExerciseDetail.tsx', 'utf8')

function assertSurface(view: string, detail: string): void {
  assert.match(view, /MachineCatalogBrowser onOpen=\{openExercise\}/, 'machine-route: كتالوج الأجهزة يجب أن يستخدم مسار التمرين')
  assert.match(view, /setExerciseHash\(null, 'replace'\)/, 'unknown-route-replace: المعرّف المجهول يجب أن يُستبدل')
  assert.match(detail, /role="dialog"/, 'dialog-role: تفصيل التمرين حوار معلن')
  assert.match(detail, /aria-modal="true"/, 'dialog-modal: تفصيل التمرين modal')
  assert.match(detail, /handleKeyDown[\s\S]*event\.key === 'Escape'/, 'dialog-escape: زر Escape يغلق الحوار')
  // [BUG-029] كان هذا الفحص يطلب `previousFocus?.focus()` حرفيًا — أي أنه يحرس
  // **تنفيذًا** ثبت أنه معطوب على WebKit، لا **العقد**. والعقد الصحيح:
  // الاستعادة تجري في **مالك المُشغِّل** (`ExerciseLibraryView`) داخل `useLayoutEffect`
  // أي **بعد** إزالة الحوار من DOM وبعد إسناد المحرّك للبؤرة — بلا اعتماد على توقيت
  // إطار. وتأجيلها بـ`requestAnimationFrame` جُرِّب وسقط تحت حِمل (قِيست `BODY`).
  assert.match(view, /useLayoutEffect\(\(\) => \{[\s\S]*?data-exercise-id="\$\{justClosed\}"[\s\S]*?\}, \[openId\]\)/, 'focus-return-owner: المكتبة تستعيد البؤرة إلى البطاقة بعد الإغلاق')
  assert.doesNotMatch(detail, /previousFocus/, 'focus-return-single-owner: الحوار لا يستعيد البؤرة بنفسه (مالك واحد)')
  assert.doesNotMatch(detail, /requestAnimationFrame\(restore\)/, 'focus-return-not-deferred: لا استعادة معلّقة على إطار')
  assert.match(detail, /<Block title=\{d\.howToPerform\}/, 'instructions-dictionary: عنوان التعليمات من القاموس')
}

assertSurface(viewSource, detailSource)
check('المسار الحي وحوار التفصيل محروسان بنيويًا', true)
assert.throws(
  () => assertSurface(viewSource.replace('MachineCatalogBrowser onOpen={openExercise}', 'MachineCatalogBrowser onOpen={setOpenId}'), detailSource),
  /machine-route/,
)
check('محاكاة التفاف فتح الأجهزة محليًا تسقط بفحص مسمّى', true)
assert.throws(() => assertSurface(viewSource, detailSource.replace('aria-modal="true"', '')), /dialog-modal/)
check('محاكاة نزع aria-modal تسقط بفحص مسمّى', true)

// [BUG-029] كل شدّ بوابة يُهاجَم (§4.2). والمحاكاتان أدناه **ارتدادان وقعا فعلًا**
// أثناء الإصلاح، لا افتراضان: أُعيدت الاستعادة إلى الحوار، ثم عُلِّقت على إطار.
assert.throws(
  () => assertSurface(viewSource.replace('useLayoutEffect(() =>', 'useEffect(() =>'), detailSource),
  /focus-return-owner/,
)
check('محاكاة نقل الاستعادة خارج useLayoutEffect تسقط بفحص مسمّى', true)
assert.throws(
  () => assertSurface(viewSource, `${detailSource}\nconst previousFocus = document.activeElement`),
  /focus-return-single-owner/,
)
check('محاكاة استعادة ثانية داخل الحوار تسقط بفحص مسمّى', true)
assert.throws(
  () => assertSurface(viewSource, `${detailSource}\nwindow.requestAnimationFrame(restore)`),
  /focus-return-not-deferred/,
)
check('محاكاة تعليق الاستعادة على إطار تسقط بفحص مسمّى', true)

console.log(`\n✅ مكتبة التمارين: ${passed} فحوص، 0 فشل.`)
