// إثبات المركز التنفيذي — العقد والصدق والمنطق والنصوص.
// [QIMMAH-SOVEREIGN-PHASE-II-001] · AGENT-E.
//
// يجيب خمسة أسئلة:
//   ١) هل الكود والوثيقة يقولان الشيء نفسه عن كل مقياس؟
//   ٢) هل يمكن لغياب أن يتحوّل إلى صفر في أي مسار؟
//   ٣) هل منطق الجدول (تصفية/بحث/ترتيب/تصفّح/افتراضية) صحيح؟
//   ٤) هل يبقى العمى مرئيًا في طابور الاهتمام؟
//   ٥) هل كل نصّ في القاموس بالعربية والإنجليزية، وبلا نصّ صلب؟
//
// ويُشغَّل عبر `scripts/run-admin-dashboard-proof.mjs` الذي يضيف عليه محاكاة
// التفاف تسقط بفحص مسمّى (الميثاق §4.2).

import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { METRIC_REGISTRY, availabilityCounts } from '@/admin/contract/metrics'
import { metricValue, ready, unavailable } from '@/admin/contract/types'
import type { AdminUserRow } from '@/admin/contract/types'
import {
  DEFAULT_QUERY,
  USER_FILTERS,
  applySearch,
  applySort,
  filterPredicate,
  isFilterApplicable,
  paginate,
  runQuery,
  virtualWindow,
} from '@/admin/model/filters'
import { UNDETECTABLE_ATTENTION, buildAttentionQueue, blindCount, detectedCount } from '@/admin/model/attention'
import { adminStrings } from '@/i18n/dict/admin'
import {
  FIXTURE_SCENARIOS,
  fixtureFor,
  largeUserSet,
  makeUserRows,
  smallUserSet,
  snapshotToday,
} from '@/admin/contract/fixtures'

const ROOT = resolve(process.cwd())
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8')

let pass = 0
const check = (label: string, condition: boolean) => {
  if (!condition) throw new Error(`FAIL: ${label}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ')

console.log('\nإثبات المركز التنفيذي')

// ═══════════════ ١) العقد: الكود والوثيقة يقولان الشيء نفسه ═══════════════
const DOC = 'docs/product/EXECUTIVE-DASHBOARD-DATA-CONTRACT.md'
const doc = read(DOC)

check('وثيقة عقد البيانات موجودة وغير فارغة', doc.length > 4000)
check('سجلّ المقاييس غير فارغ', METRIC_REGISTRY.length >= 25)

// كل مقياس في السجلّ **مذكور في الوثيقة بمعرّفه**. الانحراف بين الاثنين هو
// الطريقة المعتادة لموت أي عقد مكتوب.
const missingInDoc = METRIC_REGISTRY.filter((m) => !doc.includes(m.id)).map((m) => m.id)
check(`كل مقياس في السجلّ مذكور في الوثيقة (${METRIC_REGISTRY.length})`, missingInDoc.length === 0)

// وكل مقياس يحمل الحقول العشرة كاملة — لا بند ناقص يمرّ.
const incomplete = METRIC_REGISTRY.filter(
  (m) => !m.id || !m.labelKey || !m.group || !m.source || !m.aggregation || !m.privacyClass || !m.requiredRole || !m.refresh || !m.owner || !m.availability || !m.unavailableReasonKey,
)
check('كل مقياس يحمل حقول العقد كاملة', incomplete.length === 0)

// المعرّفات فريدة.
check('لا تكرار في معرّفات المقاييس', new Set(METRIC_REGISTRY.map((m) => m.id)).size === METRIC_REGISTRY.length)

// `backendGap` **يُملأ حصرًا** لـ`NEEDS_BACKEND` — ولا يُملأ لغيره.
const gapMismatch = METRIC_REGISTRY.filter(
  (m) => (m.availability === 'NEEDS_BACKEND') !== Boolean(m.backendGap),
)
check('backendGap مقترن بـNEEDS_BACKEND حصرًا', gapMismatch.length === 0)

// ═══════════════ ٢) الثابت الحاكم: AVAILABLE_NOW لا يقرأ صفّ أحد ═══════════════
// تأكيد مضادّ (الميثاق §4.2): القائمة القصيرة يجب ألّا تصير قاعدة. أي مقياس
// يُرقّى إلى «متاح الآن» وهو يقرأ جدولًا يُسقط الإثبات باسمه.
const CLIENT_ONLY_PREFIX = 'platform.'
const wronglyAvailable = METRIC_REGISTRY.filter(
  (m) => m.availability === 'AVAILABLE_NOW' && !m.id.startsWith(CLIENT_ONLY_PREFIX),
)
check('كل AVAILABLE_NOW من مجموعة وضع المنصّة وحدها', wronglyAvailable.length === 0)

const availableReadsTable = METRIC_REGISTRY.filter(
  (m) => m.availability === 'AVAILABLE_NOW' && /profiles|auth\.users|workout_sessions|daily_logs|measurement_logs|entitlements/.test(m.source),
)
check('لا مقياس «متاح الآن» يذكر جدولًا في مصدره', availableReadsTable.length === 0)

// وبالمقابل: كل ما يقرأ جدولًا **ليس** متاحًا الآن.
const tableBacked = METRIC_REGISTRY.filter((m) => /profiles|auth\.users|workout_sessions|daily_logs|measurement_logs|nutrition_ledger|entitlements|activation/.test(m.source))
check(
  `كل مقياس مبني على جدول غير متاح اليوم (${tableBacked.length})`,
  tableBacked.every((m) => m.availability !== 'AVAILABLE_NOW'),
)

const counts = availabilityCounts()
check(
  `الإحصاء: ${counts.AVAILABLE_NOW} متاح · ${counts.NEEDS_BACKEND} يحتاج خادمًا · ${counts.IMPOSSIBLE_WITHOUT_CONSENT_CHANGE} متحيّز`,
  counts.AVAILABLE_NOW === 4 && counts.NEEDS_BACKEND > 0 && counts.IMPOSSIBLE_WITHOUT_CONSENT_CHANGE > 0,
)

// الاستحقاق كله بلا نظام مصدر — لا واحد منه `endpoint-missing`.
const entitlementMetrics = METRIC_REGISTRY.filter((m) => m.group === 'entitlement')
check(
  `كل مقاييس الاستحقاق source-system-missing (${entitlementMetrics.length})`,
  entitlementMetrics.every((m) => m.backendGap === 'source-system-missing'),
)

// ═══════════════ ٣) الغياب لا يصير صفرًا ═══════════════
check('قراءة الغائب تعيد null لا صفرًا', metricValue(unavailable<number>('NEEDS_BACKEND')) === null)
check('قراءة التحميل تعيد null', metricValue<number>({ state: 'loading' }) === null)
check('قراءة الخطأ تعيد null', metricValue<number>({ state: 'error', code: 'x' }) === null)
check('قراءة الجاهز تعيد القيمة', metricValue(ready(7, '2026-08-14T00:00:00.000Z')) === 7)
// والصفر الحقيقي يبقى صفرًا — لا يُطوى في الغياب.
check('الصفر المقيس يبقى صفرًا لا غيابًا', metricValue(ready(0, '2026-08-14T00:00:00.000Z')) === 0)

// **الفحص البنيوي**: لا مكوّن يحوّل غيابًا إلى رقم بـ`?? 0` أو `|| 0`.
const uiDir = 'src/admin/ui'
const uiFiles = readdirSync(resolve(ROOT, uiDir)).filter((f) => f.endsWith('.tsx'))
const zeroFallback: string[] = []
for (const f of uiFiles) {
  const code = stripComments(read(join(uiDir, f)))
  if (/\?\?\s*0\b/.test(code) || /\|\|\s*0\b/.test(code)) zeroFallback.push(f)
}
check(`لا مكوّن يستبدل الغياب بصفر (${uiFiles.length} ملفات)`, zeroFallback.length === 0)

// وكل حالة من الأربع مُعالَجة في بطاقة المقياس — لا حالة تسقط في الفراغ.
const cardCode = read('src/admin/ui/MetricCard.tsx')
for (const state of ['ready', 'loading', 'error', 'unavailable']) {
  check(`بطاقة المقياس تعالج الحالة ${state}`, cardCode.includes(`value.state === '${state}'`))
}

// ═══════════════ ٤) الطريق الإنتاجي لا يستورد التجهيزات ═══════════════
const sourceCode = read('src/admin/contract/source.ts')
check('مصدر البيانات لا يستورد التجهيزات', !stripComments(sourceCode).includes('fixtures'))
const fixtureImporters = uiFiles.filter((f) => stripComments(read(join(uiDir, f))).includes('contract/fixtures'))
check('لا مكوّن واجهة يستورد التجهيزات', fixtureImporters.length === 0)
check('نقطة الدخول لا تُصدّر التجهيزات', !stripComments(read('src/admin/index.ts')).includes('fixtures'))

// ولا يحاول المصدر نداءً يعيد صفرًا كاذبًا.
check('المصدر لا ينادي supabase مباشرة', !stripComments(sourceCode).includes('getSupabase('))
check('حالة التوصيل معلَنة EXTERNALLY_BLOCKED', sourceCode.includes("WIRING_STATE: WiringState = 'EXTERNALLY_BLOCKED'"))

// وكل حقل في اللقطة الصادقة اليوم **غير متاح** — لا رقم واحد مخترع.
const today = snapshotToday
const todayValues = [
  today.users.total,
  today.users.newToday,
  today.users.new7d,
  today.users.new30d,
  today.users.verified,
  today.activity.signedIn7d,
  today.activity.workoutsCompleted7d,
  today.entitlement.premiumActive,
  today.onboarding.completionRate,
]
check(
  `لقطة اليوم: كل مقياس غير متاح (${todayValues.length} مفحوصًا)`,
  todayValues.every((v) => v.state === 'unavailable'),
)

// ═══════════════ ٥) منطق الجدول ═══════════════
const NOW = Date.parse('2026-08-14T09:00:00.000Z')
const rows = makeUserRows(120)

check('التجهيزة الكبيرة ٥٠٠٠ صفّ', largeUserSet.length === 5000)
check('التجهيزة الصغيرة ٢٥ صفًّا', smallUserSet.length === 25)
check('معرّفات المستخدمين فريدة', new Set(largeUserSet.map((r) => r.userId)).size === largeUserSet.length)
// البريد مُقنَّع في كل صفّ — لا عنوان كامل في أي مسار.
check('كل بريد في التجهيزات مُقنَّع', largeUserSet.every((r) => (r.emailMasked ?? '').includes('••••')))

// التصفّح
const p1 = paginate(rows, 1, 25)
const p5 = paginate(rows, 5, 25)
check('التصفّح يعطي ٢٥ صفًّا في الصفحة', p1.rows.length === 25 && p1.pageCount === 5)
check('الصفحة الأخيرة صحيحة', p5.page === 5 && p5.rows.length === 20)
check('صفحة خارج المدى تُقصّ للأخيرة', paginate(rows, 99, 25).page === 5)
check('صفحة صفر تُقصّ للأولى', paginate(rows, 0, 25).page === 1)
check('حجم صفحة صفر لا ينهار', paginate(rows, 1, 0).rows.length === 1)
// لا صفّ يظهر مرّتين ولا يغيب عبر الصفحات — عيب التصفّح الكلاسيكي.
const allPaged = [1, 2, 3, 4, 5].flatMap((p) => paginate(applySort(rows, 'createdAt', 'desc'), p, 25).rows.map((r) => r.userId))
check('التصفّح لا يكرّر ولا يُسقط صفًّا', new Set(allPaged).size === rows.length && allPaged.length === rows.length)

// الترتيب
const sortedDesc = applySort(rows, 'createdAt', 'desc')
const sortedAsc = applySort(rows, 'createdAt', 'asc')
check('الترتيب التنازلي أحدث أولًا', Date.parse(sortedDesc[0].createdAt) >= Date.parse(sortedDesc[1].createdAt))
check('الترتيب التصاعدي أقدم أولًا', Date.parse(sortedAsc[0].createdAt) <= Date.parse(sortedAsc[1].createdAt))
check('الترتيب لا يغيّر العدد', sortedDesc.length === rows.length)
// الغياب في آخر القائمة **في الاتجاهين**.
const noSignIn = (r: AdminUserRow) => r.lastSignInAt === null
const bySignInAsc = applySort(rows, 'lastSignInAt', 'asc')
const bySignInDesc = applySort(rows, 'lastSignInAt', 'desc')
check('بلا دخول: في الآخر تصاعديًا', noSignIn(bySignInAsc[bySignInAsc.length - 1]))
check('بلا دخول: في الآخر تنازليًا أيضًا', noSignIn(bySignInDesc[bySignInDesc.length - 1]))
// ثبات الترتيب: نفس المدخلات ⇒ نفس المخرجات بالضبط.
check(
  'الترتيب ثابت (نفس المدخل ⇒ نفس المخرج)',
  applySort(rows, 'entitlement', 'asc')
    .map((r) => r.userId)
    .join() === applySort(rows, 'entitlement', 'asc').map((r) => r.userId).join(),
)

// البحث
check('البحث بالاسم يجد', applySearch(rows, 'مستخدم 3').length > 0)
check('البحث بالمعرّف يجد', applySearch(rows, 'fixture-user-00010').length === 1)
check('البحث الفارغ لا يصفّي', applySearch(rows, '   ').length === rows.length)
check('البحث بلا نتيجة يعيد فارغًا', applySearch(rows, 'zzz-لا-يوجد').length === 0)
check('البحث لا يميّز حالة الأحرف', applySearch(rows, 'FIXTURE-USER-00010').length === 1)

// ═══════════════ ٦) المصفاة بلا مصدر تُعطَّل ولا تُطبَّق ═══════════════
check('«الكل» وحدها قابلة للتطبيق اليوم', USER_FILTERS.filter((f) => isFilterApplicable(f.id)).length === 1)
check('«الأكثر استخدامًا» غير قابلة للتطبيق', !isFilterApplicable('highlyActive'))
check('«Premium» غير قابلة للتطبيق', !isFilterApplicable('premium'))
// كل مصفاة معطّلة تحمل سبب تعطيل معلَنًا — لا زرّ رمادي صامت.
check(
  'كل مصفاة معطّلة تحمل سبب تعطيل',
  USER_FILTERS.filter((f) => !isFilterApplicable(f.id)).every((f) => Boolean(f.disabledReasonKey)),
)
// ⚠️ الجوهر: تطبيق مصفاة معطّلة **لا يعيد قائمة فارغة تبدو جوابًا**.
for (const f of USER_FILTERS.filter((x) => !isFilterApplicable(x.id))) {
  const out = runQuery(rows, { ...DEFAULT_QUERY, filter: f.id, pageSize: 1000 }, NOW)
  check(`مصفاة معطّلة لا تُصفّي ولا تفرغ القائمة — ${f.id}`, out.total === rows.length)
}
// والمنطق نفسه صحيح **حين** يصير مصدره متاحًا.
check('مسند Premium صحيح', rows.filter(filterPredicate('premium', NOW)).every((r) => r.entitlement === 'premium'))
check(
  'مسند «بلا دخول ٣٠ يوم» يشمل من لم يسجّل دخولًا قط',
  rows.filter(filterPredicate('inactive30d', NOW)).some((r) => r.lastSignInAt === null),
)
// الجهل ليس نفيًا: `unknown` لا تُحسب «تخصيص ناقص».
check(
  'التخصيص المجهول لا يُحسب ناقصًا',
  rows.filter(filterPredicate('onboardingIncomplete', NOW)).every((r) => r.onboarding === 'incomplete'),
)

// ═══════════════ ٧) الافتراضية ═══════════════
const win = virtualWindow(5000, 0, 560, 56)
check('نافذة البداية تبدأ من الصفر', win.startIndex === 0 && win.padStart === 0)
check('النافذة ترسم جزءًا صغيرًا لا الكل', win.endIndex - win.startIndex < 40)
const midWin = virtualWindow(5000, 56 * 1000, 560, 56)
check('نافذة الوسط تُزيح الفهرس', midWin.startIndex > 950 && midWin.startIndex < 1000)
check('الحشوتان تحفظان الارتفاع الكلي', midWin.padStart + (midWin.endIndex - midWin.startIndex) * 56 + midWin.padEnd === 5000 * 56)
const endWin = virtualWindow(5000, 56 * 5000, 560, 56)
check('نافذة النهاية لا تتجاوز العدد', endWin.endIndex === 5000 && endWin.padEnd === 0)
check('عدد صفر لا ينهار', virtualWindow(0, 0, 560, 56).endIndex === 0)
check('ارتفاع صفر لا يقسم على صفر', Number.isFinite(virtualWindow(10, 0, 560, 0).endIndex))

// ═══════════════ ٨) طابور الاهتمام — العمى يبقى مرئيًا ═══════════════
const queue = buildAttentionQueue(snapshotToday)
check('الطابور غير فارغ اليوم', queue.length > 0)
check('يكتشف غياب مصدر الاستحقاق', queue.some((i) => i.id === 'attn.entitlementSourceMissing' && i.detectable))
check('يكتشف إطفاء المزامنة', queue.some((i) => i.id === 'attn.syncPipelineDown' && i.detectable))
check('البنود غير القابلة للكشف تبقى في المخرجات', blindCount(queue) === UNDETECTABLE_ATTENTION.length)
check('البنود غير القابلة للكشف مسمّاة detectable=false', queue.filter((i) => !i.detectable).every((i) => i.detectable === false))
check('المكتشَف قبل غير المكتشَف', queue.findIndex((i) => !i.detectable) > queue.findIndex((i) => i.detectable))
check('عدّاد المكتشَف يطابق العدّ', detectedCount(queue) + blindCount(queue) === queue.length)
// الحرج أولًا داخل المكتشَف.
const detected = queue.filter((i) => i.detectable)
check('الحرج أولًا في المكتشَف', detected[0].severity === 'critical')
// وترتيب ثابت بين نداءين.
check(
  'ترتيب الطابور ثابت',
  buildAttentionQueue(snapshotToday).map((i) => i.id).join() === queue.map((i) => i.id).join(),
)

// ═══════════════ ٩) التجهيزات: ست حالات، وكلها بشكل صحيح ═══════════════
check(`ست حالات تجهيز معلَنة (${FIXTURE_SCENARIOS.length})`, FIXTURE_SCENARIOS.length === 6)
for (const s of FIXTURE_SCENARIOS) {
  const snap = fixtureFor(s)
  check(`تجهيزة ${s} تحمل وضع منصّة`, Boolean(snap.platform.buildLabel))
}
check('تجهيزة loading كلها تحميل', fixtureFor('loading').users.total.state === 'loading')
check('تجهيزة error كلها خطأ', fixtureFor('error').users.total.state === 'error')
check('تجهيزة empty صفر حقيقي لا غياب', fixtureFor('empty').users.total.state === 'ready')
check('تجهيزة partial تخلط الحالات', fixtureFor('partial').users.total.state === 'ready' && fixtureFor('partial').entitlement.premiumActive.state === 'error')
// ⚠️ حتى تجهيزة «كل شيء جاهز» **لا تدّعي** نشاط منتج: التحيّز لا يزول بخادم.
check(
  'تجهيزة ready لا تخترع نشاط منتج',
  fixtureFor('ready').activity.workoutsCompleted7d.state === 'unavailable' &&
    fixtureFor('ready').onboarding.completionRate.state === 'unavailable',
)

// ═══════════════ ١٠) النصوص: عربي وإنجليزي، وبلا نصّ صلب ═══════════════
const ar = adminStrings.ar
const en = adminStrings.en
check('القاموس يحمل اللغتين', Boolean(ar) && Boolean(en))

// كل مقياس له اسم في اللغتين.
const missingAr = METRIC_REGISTRY.filter((m) => !ar.labels[m.labelKey]).map((m) => m.id)
const missingEn = METRIC_REGISTRY.filter((m) => !en.labels[m.labelKey]).map((m) => m.id)
check(`كل مقياس له اسم عربي (${METRIC_REGISTRY.length})`, missingAr.length === 0)
check('كل مقياس له اسم إنجليزي', missingEn.length === 0)
check('مفاتيح الأسماء متطابقة بين اللغتين', Object.keys(ar.labels).sort().join() === Object.keys(en.labels).sort().join())

// كل سبب لاإتاحة موجود ومكتوب في اللغتين.
const reasonKeys = [...new Set(METRIC_REGISTRY.map((m) => m.unavailableReasonKey))]
for (const k of reasonKeys) {
  check(`سبب اللاإتاحة ${k} مكتوب بالعربية`, k in ar.reasons)
  check(`سبب اللاإتاحة ${k} مكتوب بالإنجليزية`, k in en.reasons)
}
// وليس فارغًا (عدا `reason.none` المخصّص للمتاح).
const emptyReasons = reasonKeys.filter((k) => k !== 'reason.none' && (!ar.reasons[k] || !en.reasons[k]))
check('لا سبب لاإتاحة فارغ', emptyReasons.length === 0)

// كل بند اهتمام له نصّ في اللغتين.
const attnIds = [...UNDETECTABLE_ATTENTION.map((i) => i.id), 'attn.entitlementSourceMissing', 'attn.syncPipelineDown', 'attn.backendUnconfigured']
const missingAttn = attnIds.filter((id) => !ar.attention[id] || !en.attention[id])
check(`كل بند اهتمام له نصّ في اللغتين (${attnIds.length})`, missingAttn.length === 0)

// كل مصفاة لها نصّ في اللغتين.
const missingFilter = USER_FILTERS.filter((f) => !ar.filters[f.labelKey] || !en.filters[f.labelKey])
check(`كل مصفاة لها نصّ في اللغتين (${USER_FILTERS.length})`, missingFilter.length === 0)

// ═══════════════ ١١) التسمية الصادقة — «سجّل دخول» لا «نشط» ═══════════════
// رقم `last_sign_in_at` يقلّل تقدير النشاط بنيويًا، فتسميته «نشط» تجعله يبدو
// قياسًا لما ليس هو.
check('العربية لا تسمّي رقم الدخول «نشط»', !/نشط/.test(ar.labels['activity.signedIn7d']))
check('الإنجليزية لا تسمّي رقم الدخول "active"', !/active/i.test(en.labels['activity.signedIn7d']))
check('العربية تقول «سجّلوا دخول»', ar.labels['activity.signedIn7d'].includes('دخول'))
check('الإنجليزية تقول "Signed in"', en.labels['activity.signedIn7d'].includes('Signed in'))
// و«الخمول» ليس «تسرّبًا» — التسرّب يحتاج تعريف اشتراك غير موجود.
check('لا يُسمّى الخمول churn بالإنجليزية', !/churn/i.test(en.labels['activity.dormant30d']))
check('لا يُسمّى الخمول «تسرّب» بالعربية', !/تسرّب|تسرب/.test(ar.labels['activity.dormant30d']))

// ═══════════════ ١٢) نصوص Premium والسعر — الميثاق §0.1 ═══════════════
const dictText = read('src/i18n/dict/admin.ts')
const FORBIDDEN_COPY = ['مدى الحياة', 'lifetime', 'Lifetime', 'كل التحديثات الحالية والمستقبلية']
for (const bad of FORBIDDEN_COPY) {
  check(`قاموس اللوحة خالٍ من «${bad}»`, !dictText.includes(bad))
}
// ولا سعر مكتوب في مكوّن أو قاموس (§0.1: مصدر واحد للسعر).
const priceLeak = [...uiFiles.map((f) => join(uiDir, f)), 'src/i18n/dict/admin.ts'].filter((p) => /19\.99|١٩٫٩٩/.test(read(p)))
check('لا سعر مكتوب في مكوّن أو قاموس', priceLeak.length === 0)

// ═══════════════ ١٣) الحساسية مستبعَدة بنيويًا ═══════════════
const SENSITIVE = ['injuries', 'medications', 'allergies', 'supplements', 'currentWeightKg', 'heightCm', 'bodyMetrics']
const adminFiles = [
  ...uiFiles.map((f) => join(uiDir, f)),
  'src/admin/contract/types.ts',
  'src/admin/contract/source.ts',
  'src/admin/model/filters.ts',
]
const leaks: string[] = []
for (const f of adminFiles) {
  const code = stripComments(read(f))
  for (const s of SENSITIVE) if (code.includes(s)) leaks.push(`${f}:${s}`)
}
check(`لا حقل صحّي حسّاس في كود اللوحة (${SENSITIVE.length} أسماء مفحوصة)`, leaks.length === 0)
// والاستبعاد **معلَن للمؤسس في الشاشة** لا في تعليق فقط.
check('سطر استبعاد الحساسية معروض في صفحة المستخدم', read('src/admin/ui/UserDetail.tsx').includes('sensitiveExcluded'))
check('نصّ الاستبعاد موجود بالعربية والإنجليزية', Boolean(ar.detail.sensitiveExcluded) && Boolean(en.detail.sensitiveExcluded))

// ═══════════════ ١٤) RTL: خصائص منطقية لا اتجاهية ═══════════════
const DIRECTIONAL = [
  /\bml-\d/,
  /\bmr-\d/,
  /\bpl-\d/,
  /\bpr-\d/,
  /\btext-left\b/,
  /\btext-right\b/,
  /\bleft-\d/,
  /\bright-\d/,
  /\bborder-l\b/,
  /\bborder-r\b/,
]
const rtlOffenders: string[] = []
for (const f of uiFiles) {
  const code = read(join(uiDir, f))
  for (const re of DIRECTIONAL) if (re.test(code)) rtlOffenders.push(`${f}:${re}`)
}
check(`لا صنف اتجاهي ثابت في الواجهة (${DIRECTIONAL.length} أنماط · ${uiFiles.length} ملفات)`, rtlOffenders.length === 0)
// وتأكيد إيجابي: الخصائص المنطقية مستعمَلة فعلًا (وإلا مرّ الفحص بغياب الأنماط).
const usesLogical = uiFiles.some((f) => /text-start|text-end|\bms-|\bme-|\bps-|\bpe-/.test(read(join(uiDir, f))))
check('الخصائص المنطقية مستعمَلة فعلًا', usesLogical)

// ═══════════════ ١٥) البوّابة قبل أي قراءة ═══════════════
const shell = read('src/admin/ui/AdminShell.tsx')
const gateIdx = shell.indexOf('if (!isAdmin(decision)) return <AdminDenied')
const firstReadIdx = shell.indexOf('buildAttentionQueue(snapshot)')
check('حارس الدور موجود في القشرة', gateIdx > 0)
check('الحارس يسبق أول قراءة للقطة', gateIdx < firstReadIdx)
check('شاشة المنع لا تذكر أي مقياس', !read('src/admin/ui/AdminDenied.tsx').includes('METRIC_REGISTRY'))

// ═══════════════ ١٦) لا سجلّ طرفية بحمولة حسّاسة ═══════════════
const consoleUsers: string[] = []
for (const f of [...uiFiles.map((x) => join(uiDir, x)), 'src/admin/contract/source.ts', 'src/admin/auth/adminRole.ts', 'src/admin/model/filters.ts', 'src/admin/model/attention.ts']) {
  if (/console\.(log|info|warn|error|debug)/.test(stripComments(read(f)))) consoleUsers.push(f)
}
check('لا سجلّ طرفية في كود اللوحة إطلاقًا', consoleUsers.length === 0)

// ═══════════════ ١٧) لا مفتاح مميّز في كود اللوحة ═══════════════
const PRIVILEGED = ['service_role', 'SERVICE_ROLE', 'serviceRole', 'supabaseAdmin', 'SUPABASE_SERVICE_ROLE_KEY']
const privLeaks: string[] = []
for (const f of adminFiles.concat(['src/admin/auth/adminRole.ts', 'src/admin/contract/metrics.ts', 'src/admin/index.ts'])) {
  const code = stripComments(read(f))
  for (const p of PRIVILEGED) if (code.includes(p)) privLeaks.push(`${f}:${p}`)
}
check(`لا مفتاح مميّز في كود اللوحة (${PRIVILEGED.length} أنماط)`, privLeaks.length === 0)

// ═══════════════ ١٨) وثيقة الاعتماديات موجودة ═══════════════
const deps = read('docs/execution/qimmah-postweb/admin/DEPENDENCIES.md')
check('وثيقة اعتماديات الوصل موجودة', deps.length > 500)
check('الوثيقة تسمّي خطوة الوصل بالملف', deps.includes('appRoutes.ts') && deps.includes('App.tsx'))
// والوحدة **غير موصولة فعلًا** — القول والفعل متطابقان.
check('لا إشارة للوحة في App.tsx', !read('src/App.tsx').includes('admin'))
check('لا مسار admin في appRoutes.ts', !read('src/lib/appRoutes.ts').includes("'admin'"))

// ═══════════════ ١٩) العدّ في الوثيقة يطابق السجلّ ═══════════════
// ⚠️ ربط عددي صريح: جدول §10 في الوثيقة يُقرأ ويُقارَن بالسجلّ. بدونه كان
// الجدول ينحرف بصمت — **وقد انحرف فعلًا** أول مرّة (أعلن ٦/٢٢/١٣ والسجلّ
// ٤/١٦/٨) لأنه كُتب قبل أن يستقرّ السجلّ. الوثيقة التي تكذب على نفسها في
// عددها لا يُوثق بها في مضمونها.
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const toWestern = (t: string) => t.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
// النطاق محصور بجدول §10 وحده: البحث في الوثيقة كلّها كان يلتقط **سُلّم
// الدرجات في §2** — وهو جدول تعريفات بلا أعداد — فيقرأ منه نصًّا لا رقمًا.
const summary = doc.slice(doc.indexOf('## ١٠. الخلاصة الصادقة'))
const docRow = (label: string): number | null => {
  const line = summary.split('\n').find((l) => l.includes(label) && l.trim().startsWith('|'))
  if (!line) return null
  const cells = line.split('|').map((c) => c.trim())
  const num = toWestern(cells[2] ?? '').match(/\d+/)
  return num ? Number(num[0]) : null
}
const endpointGap = METRIC_REGISTRY.filter((m) => m.backendGap === 'endpoint-missing').length
const systemGap = METRIC_REGISTRY.filter((m) => m.backendGap === 'source-system-missing').length
check(`الوثيقة تعلن ${counts.AVAILABLE_NOW} متاحًا كما السجلّ`, docRow('`AVAILABLE_NOW`') === counts.AVAILABLE_NOW)
check(`الوثيقة تعلن ${endpointGap} endpoint-missing كما السجلّ`, docRow('endpoint-missing') === endpointGap)
check(`الوثيقة تعلن ${systemGap} source-system-missing كما السجلّ`, docRow('source-system-missing') === systemGap)
check(
  `الوثيقة تعلن ${counts.IMPOSSIBLE_WITHOUT_CONSENT_CHANGE} متحيّزًا كما السجلّ`,
  docRow('`IMPOSSIBLE_WITHOUT_CONSENT_CHANGE`') === counts.IMPOSSIBLE_WITHOUT_CONSENT_CHANGE,
)
// المجموع مكتوب بالأرقام العربية في الوثيقة — يُحوَّل قبل المقارنة.
const toArabic = (n: number) => String(n).replace(/\d/g, (d) => AR_DIGITS[Number(d)])
check(
  `الوثيقة تعلن مجموع السجلّ (${METRIC_REGISTRY.length})`,
  summary.includes(`${toArabic(METRIC_REGISTRY.length)} مقياسًا`),
)
check('السجلّ يحمل أربعة مقاييس متاحة', counts.AVAILABLE_NOW === 4)
check('الوثيقة تعلن الخلاصة الصادقة', doc.includes('لا مقياس مستخدم واحد متاح اليوم'))
check('الوثيقة تعلن EXTERNALLY_BLOCKED', doc.includes('EXTERNALLY_BLOCKED'))

console.log(`\n✅ ${pass} فحصًا — عقد اللوحة متماسك وصادق\n`)
