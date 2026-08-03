// برهان أساس الصحة الواسع (P9) — claude/healthkit-foundation-v1.
// يثبت: الطلب المجمّع الواحد (أبدًا عند الإقلاع) · التطبيع/إزالة التكرار/الوحدات ·
// صدق «لا بيانات أو مرفوض» (لا 'denied' أبدًا) · تطهير الفصل لكل مقياس ·
// المرساة/الصفحات/نافذة ٩٠ يومًا · قائمة الكتابة فارغة · حارس الخصوصية (grep).

import { strict as assert } from 'node:assert'
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

import {
  requestAllHealthAccess,
  hasRequestedHealthAccess,
  syncMetric,
  syncAllEnabled,
  disconnectMetric,
  reconnectMetric,
  metricDataState,
  healthConnectionSummary,
  DEFAULT_HISTORY_DAYS,
  type HealthReadBridge,
} from '@/lib/health/connect'
import { ALL_HEALTH_METRICS, HEALTH_METRICS, HEALTH_WRITE_TYPES, metricDef, resolveMetric } from '@/lib/health/metrics'
import {
  dedupeKey,
  dailySeries,
  mergeSamples,
  normalizeQuantity,
  normalizeSleep,
  normalizeWorkout,
  toDisplay,
} from '@/lib/health/normalize'
import { samplesFor, anchorFor, purgeMetricSamples } from '@/lib/health/store'
import { setSteps, getSteps, getStepSource } from '@/lib/stepCounter'

let passed = 0
let failed = 0
function check(label: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${label}`) }
  else { failed++; console.log(`  ✗ ${label}`) }
}

// يعمل عبر مشغّل esbuild من جذر المستودع (npm run) — cwd هو الجذر.
const ROOT = process.cwd()

// ── جسر وهمي قابل للعدّ ──────────────────────────────────────────────────────

interface BridgeCounters { auth: number; supported: number; quantity: number; sleep: number; workouts: number }

function makeBridge(overrides: Partial<HealthReadBridge> = {}): { bridge: HealthReadBridge; counters: BridgeCounters; lastAuthMetrics: string[]; lastQuantityOptions: Record<string, unknown> } {
  const counters: BridgeCounters = { auth: 0, supported: 0, quantity: 0, sleep: 0, workouts: 0 }
  const state = { lastAuthMetrics: [] as string[], lastQuantityOptions: {} as Record<string, unknown> }
  const bridge: HealthReadBridge = {
    async isAvailable() { return { available: true } },
    async supportedMetrics() {
      counters.supported += 1
      return { available: true, metrics: [...ALL_HEALTH_METRICS] }
    },
    async requestAuthorization(options) {
      counters.auth += 1
      state.lastAuthMetrics = options?.metrics ?? []
      return { permission: 'authorized' }
    },
    async getQuantitySamples(options) {
      counters.quantity += 1
      state.lastQuantityOptions = { ...options }
      return { status: 'ok', samples: [], hasMore: false }
    },
    async getSleepSamples() {
      counters.sleep += 1
      return { status: 'ok', samples: [], hasMore: false }
    },
    async getWorkouts() {
      counters.workouts += 1
      return { status: 'ok', samples: [], hasMore: false }
    },
    ...overrides,
  }
  const proxy = { bridge, counters, get lastAuthMetrics() { return state.lastAuthMetrics }, get lastQuantityOptions() { return state.lastQuantityOptions } }
  return proxy
}

// ── ١) الاستيراد لا يطلق أي نداء جسر (لا طلب عند الإقلاع) ───────────────────
// وصلنا إلى هنا بعد استيراد الوحدة أعلاه ولم يُسجَّل أي نداء على أي جسر وهمي —
// والوحدة الحقيقية لا تحمل أي تنفيذ على مستوى الاستيراد (زرع الحالة كسول).
check('استيراد وحدة الاتصال لا يطلب تفويضًا (لا شيء عند الإقلاع)', hasRequestedHealthAccess() === false)

// ── ٢) الطلب المجمّع الواحد ──────────────────────────────────────────────────
{
  const mock = makeBridge()
  const result = await requestAllHealthAccess(mock.bridge, true)
  check('تدفّق الطلب يكتمل (completed)', result.status === 'completed')
  check('نداء requestAuthorization واحد فقط (ورقة iOS واحدة)', mock.counters.auth === 1)
  check(`الطلب الواحد يشمل كل الكتالوج (${ALL_HEALTH_METRICS.length} مقياسًا)`, mock.lastAuthMetrics.length === ALL_HEALTH_METRICS.length)
  check('الطلب يشمل النوم والتغذية والقلب معًا', ['sleepAnalysis', 'dietaryProtein', 'heartRateVariabilitySDNN'].every((m) => mock.lastAuthMetrics.includes(m)))
  check('الحالة تسجّل اكتمال الطلب', hasRequestedHealthAccess() === true)
}

// ترشيح التوفّر: جهاز أقدم بلا أنواع iOS 16 → تسقط من الطلب ولا تُطلب.
{
  const iOS15Metrics = ALL_HEALTH_METRICS.filter((m) => !HEALTH_METRICS[m].requiresIOS16)
  const mock = makeBridge({
    async supportedMetrics() { return { available: true, metrics: [...iOS15Metrics] } },
  })
  const result = await requestAllHealthAccess(mock.bridge, true)
  check('أنواع iOS 16 تُرشَّح على الأجهزة الأقدم (حراسة التوفّر)', result.metrics.length === iOS15Metrics.length && !mock.lastAuthMetrics.includes('appleSleepingWristTemperature'))
}

// منصة غير iOS → unavailable صادقة بلا أي نداء.
{
  const mock = makeBridge()
  const result = await requestAllHealthAccess(mock.bridge, false)
  check('خارج iOS: unavailable بلا أي نداء جسر', result.status === 'unavailable' && mock.counters.auth === 0)
}

// ── ٣) التطبيع: وحدات + تواريخ + إسقاط الفاسد ───────────────────────────────
{
  const ok = normalizeQuantity('bodyMass', { uuid: 'u-1', start: '2026-07-20T07:00:00Z', end: '2026-07-20T07:00:00Z', value: 81.4, sourceName: 'Health', sourceBundleId: 'com.apple.health' })
  check('عيّنة كمية صالحة تُطبَّع بوحدة الأساس من الكتالوج', ok?.value === 81.4 && ok.unit === 'kg' && ok.day === '2026-07-20')
  check('المصدر يُحفظ كما ورد (لا يُخترع)', ok?.source.name === 'Health' && ok.source.bundleId === 'com.apple.health')
  check('قيمة غير منتهية تُسقَط ولا تُخمَّن', normalizeQuantity('steps', { start: '2026-07-20T07:00:00Z', end: '2026-07-20T07:05:00Z', value: Number.NaN }) === null)
  check('تاريخ فاسد يُسقِط العيّنة', normalizeQuantity('steps', { start: 'ليس-تاريخًا', end: '2026-07-20T07:05:00Z', value: 100 }) === null)

  const sleep = normalizeSleep({ uuid: 's-1', start: '2026-07-19T23:00:00Z', end: '2026-07-20T01:00:00Z', stage: 'deep', durationMin: 120, sourceName: 'Watch' })
  check('عيّنة نوم تحفظ المرحلة والمدة بالدقائق', sleep?.stage === 'deep' && sleep.value === 120)
  const sleepUnknown = normalizeSleep({ start: '2026-07-19T23:00:00Z', end: '2026-07-19T23:30:00Z', stage: 'غريب' })
  check('مرحلة نوم غير معروفة → unknown + مدة من الطرفين', sleepUnknown?.stage === 'unknown' && sleepUnknown.value === 30)

  const workout = normalizeWorkout({ uuid: 'w-1', start: '2026-07-20T17:00:00Z', end: '2026-07-20T18:00:00Z', activity: 'strengthTraining', durationMin: 60, kcal: null, distanceM: null, sourceName: 'Watch' })
  check('تمرين بلا سعرات: الحقل يغيب ولا يُختلق صفر', workout?.activity === 'strengthTraining' && workout.kcal === undefined && workout.distanceM === undefined)
}

// ── ٤) الوحدات: أساس التخزين ↔ العرض ────────────────────────────────────────
{
  check('الطول يُخزَّن بالمتر ويُعرض بالسنتيمتر', toDisplay('height', 1.78).value === 178 && toDisplay('height', 1.78).unitAr === 'سم')
  check('نسبة الدهون تُخزَّن كسرًا وتُعرض نسبة مئوية', toDisplay('bodyFatPercentage', 0.185).value === 18.5)
  check('المسافة تُخزَّن بالمتر وتُعرض بالكيلومتر', toDisplay('distanceWalkingRunning', 5300).value === 5.3)
  check('الماء يُخزَّن بالمليلتر ويُعرض باللتر', toDisplay('dietaryWater', 2500).value === 2.5)
  const everyMetricHasArabicUnit = ALL_HEALTH_METRICS.every((m) => metricDef(m).display.unitAr.length > 0 && metricDef(m).name.ar.length > 0)
  check('كل مقياس يحمل اسمًا ووحدة عرض بالعربية (ثنائية اللغة)', everyMetricHasArabicUnit)
}

// ── ٥) إزالة التكرار ─────────────────────────────────────────────────────────
{
  const a = normalizeQuantity('heartRate', { uuid: 'dup-1', start: '2026-07-20T08:00:00Z', end: '2026-07-20T08:00:00Z', value: 62 })!
  const aAgain = normalizeQuantity('heartRate', { uuid: 'dup-1', start: '2026-07-20T08:00:00Z', end: '2026-07-20T08:00:00Z', value: 62 })!
  check('نفس HK UUID → مفتاح تكرار واحد', dedupeKey(a) === dedupeKey(aAgain))
  check('دمج عيّنتين بنفس UUID يبقي واحدة', mergeSamples([a], [aAgain]).length === 1)

  const noId1 = normalizeQuantity('steps', { start: '2026-07-20T09:00:00Z', end: '2026-07-20T10:00:00Z', value: 900, sourceBundleId: 'com.apple.health' })!
  const noId2 = normalizeQuantity('steps', { start: '2026-07-20T09:00:00Z', end: '2026-07-20T10:00:00Z', value: 900, sourceBundleId: 'com.apple.health' })!
  check('بلا UUID: مفتاح مركّب (نوع،بداية،نهاية،مصدر) يزيل التكرار', mergeSamples([noId1], [noId2]).length === 1)
  const otherSource = normalizeQuantity('steps', { start: '2026-07-20T09:00:00Z', end: '2026-07-20T10:00:00Z', value: 900, sourceBundleId: 'com.other.app' })!
  check('نفس الفترة من مصدر آخر ليست تكرارًا', mergeSamples([noId1], [otherSource]).length === 2)
}

// ── ٦) السلاسل اليومية: تراكمي يُجمع ولحظي يأخذ الأحدث ──────────────────────
{
  const s1 = normalizeQuantity('steps', { uuid: 'd-1', start: '2026-07-20T08:00:00Z', end: '2026-07-20T09:00:00Z', value: 3000 })!
  const s2 = normalizeQuantity('steps', { uuid: 'd-2', start: '2026-07-20T18:00:00Z', end: '2026-07-20T19:00:00Z', value: 4000 })!
  check('مقياس تراكمي (خطوات) يُجمع باليوم', dailySeries('steps', [s1, s2])[0]?.value === 7000)
  // أوقات ضمن اليوم المحلي نفسه في أي منطقة زمنية معقولة (لا عبور منتصف الليل).
  const w1 = normalizeQuantity('bodyMass', { uuid: 'm-1', start: '2026-07-20T06:00:00Z', end: '2026-07-20T06:00:00Z', value: 82 })!
  const w2 = normalizeQuantity('bodyMass', { uuid: 'm-2', start: '2026-07-20T12:00:00Z', end: '2026-07-20T12:00:00Z', value: 81.2 })!
  check('مقياس لحظي (وزن) يأخذ آخر قيمة في اليوم', dailySeries('bodyMass', [w1, w2])[0]?.value === 81.2)
}

// ── ٧) المزامنة: مرساة + صفحات + نافذة ٩٠ يومًا ─────────────────────────────
{
  purgeMetricSamples('restingHeartRate')
  let call = 0
  const mock = makeBridge({
    async getQuantitySamples(options) {
      call += 1
      if (call === 1) {
        assert.equal(options.anchor, undefined, 'أول مزامنة بلا مرساة')
        assert.equal(options.days, DEFAULT_HISTORY_DAYS)
        return { status: 'ok', samples: [{ uuid: 'p1', start: '2026-07-19T06:00:00Z', end: '2026-07-19T06:00:00Z', value: 58 }], anchor: 'anchor-1', hasMore: true }
      }
      assert.equal(options.anchor, 'anchor-1', 'الصفحة الثانية تمرّر مرساة الأولى')
      return { status: 'ok', samples: [{ uuid: 'p2', start: '2026-07-20T06:00:00Z', end: '2026-07-20T06:00:00Z', value: 57 }], anchor: 'anchor-2', hasMore: false }
    },
  })
  const result = await syncMetric('restingHeartRate', mock.bridge, true)
  check('مزامنة مقسّمة صفحات تستورد الصفحتين', result.status === 'ok' && result.imported === 2 && samplesFor('restingHeartRate').length === 2)
  check('النافذة الافتراضية ٩٠ يومًا (تاريخ محدود)', DEFAULT_HISTORY_DAYS === 90)
  check('المرساة الأخيرة تُحفظ للمزامنة التزايدية التالية', anchorFor('restingHeartRate') === 'anchor-2')

  const next = makeBridge({
    async getQuantitySamples(options) {
      assert.equal(options.anchor, 'anchor-2', 'المزامنة التالية تنطلق من المرساة المحفوظة')
      return { status: 'ok', samples: [], hasMore: false }
    },
  })
  const incremental = await syncMetric('restingHeartRate', next.bridge, true)
  check('مزامنة تزايدية فارغة لا تفقد المخزون', incremental.status === 'ok' && samplesFor('restingHeartRate').length === 2)
}

// المزامنة لا تطلب التفويض أبدًا.
{
  const mock = makeBridge()
  await syncAllEnabled(mock.bridge, true)
  check('syncAllEnabled لا يستدعي requestAuthorization إطلاقًا', mock.counters.auth === 0)
}

// ── ٨) صدق «لا بيانات أو مرفوض» — لا 'denied' أبدًا ─────────────────────────
{
  purgeMetricSamples('vo2Max')
  const empty = makeBridge() // يرجع صفحات فارغة بحالة ok
  const result = await syncMetric('vo2Max', empty.bridge, true)
  check('نتيجة فارغة → unknown-or-denied (لا ندّعي رفضًا)', result.dataState === 'unknown-or-denied')
  const allowedStates = new Set(['not-connected', 'has-data', 'unknown-or-denied'])
  const summaryRows = healthConnectionSummary()
  check('عقد شاشة الإعدادات: كل الحالات من الثلاث الصادقة فقط (لا denied)', summaryRows.length === ALL_HEALTH_METRICS.length && summaryRows.every((row) => allowedStates.has(row.dataState)))

  const failing = makeBridge({
    async getQuantitySamples() { return { status: 'error', samples: [] } },
  })
  const errored = await syncMetric('restingHeartRate', failing.bridge, true)
  check('فشل الاستعلام = error عابر يحافظ على المخزون (ليس رفضًا)', errored.status === 'error' && samplesFor('restingHeartRate').length === 2)
}

// ── ٩) الفصل لكل مقياس: تطهير موسوم بالمصدر + اليدوي لا يُمسّ ───────────────
{
  // مدخل يدوي (متجر الخطوات الأصلي) يجب ألا يتأثر بأي فصل صحي.
  setSteps(6500, '2026-07-21', 'manual')

  const sleepBridge = makeBridge({
    async getSleepSamples() {
      return { status: 'ok', samples: [{ uuid: 'sl-1', start: '2026-07-20T23:00:00Z', end: '2026-07-21T06:30:00Z', stage: 'core', durationMin: 450 }], hasMore: false }
    },
  })
  await syncMetric('sleepAnalysis', sleepBridge.bridge, true)
  check('عيّنات النوم المستوردة في المخزون قبل الفصل', samplesFor('sleepAnalysis').length === 1)

  disconnectMetric('sleepAnalysis')
  check('فصل النوم يطهّر عيّناته المستوردة بالكامل', samplesFor('sleepAnalysis').length === 0 && metricDataState('sleepAnalysis') === 'not-connected')
  check('فصل النوم لا يلمس مقياسًا آخر (نبض الراحة باقٍ)', samplesFor('restingHeartRate').length === 2)
  check('الإدخال اليدوي يبقى بعد الفصل (بديل يدوي لكل مقياس)', getSteps('2026-07-21') === 6500 && getStepSource('2026-07-21') === 'manual')

  reconnectMetric('sleepAnalysis')
  check('إعادة التفعيل بعد الطلب المجمّع لا تفتح ورقة جديدة', metricDataState('sleepAnalysis') === 'unknown-or-denied')
}

// المرادف القديم weight يُحسم إلى bodyMass.
check("المرادف القديم 'weight' يُحسم إلى bodyMass", resolveMetric('weight') === 'bodyMass')

// ── ١٠) قائمة الكتابة فارغة (قِمّة يقرأ فقط) ────────────────────────────────
check('قائمة أنواع الكتابة (share) فارغة — قراءة فقط', HEALTH_WRITE_TYPES.length === 0)
{
  const swift = readFileSync(resolve(ROOT, 'ios/App/App/HealthKitStepsPlugin.swift'), 'utf8')
  check('السويفت يطلب toShare: [] حرفيًا (لا كتابة)', swift.includes('toShare: []'))
  check('السويفت لا يستخدم أي HKSampleType للكتابة (لا save/delete)', !/healthStore\.(save|delete)\(/.test(swift))
  const plist = readFileSync(resolve(ROOT, 'ios/App/App/Info.plist'), 'utf8')
  check('نص الغرض حُدّث للمجموعة الموسّعة (يذكر النوم والتغذية)', plist.includes('النوم ومراحله') && plist.includes('التغذية'))
  check('نص الغرض يبقى صادقًا: قراءة فقط ولا إعلانات', plist.includes('يقرأ ولا يكتب') && plist.includes('إعلانات'))
  check('لا مفتاح NSHealthUpdateUsageDescription (لا نية كتابة)', !plist.includes('NSHealthUpdateUsageDescription'))
}

// ── ١١) حارس الخصوصية: لا قيمة صحية إلى track() ─────────────────────────────
{
  const grep = (cmd: string): string => {
    try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim() } catch { return '' }
  }
  // مواقع نداء فعلية فقط — سطور التعليقات (// أو *) لا تُحتسب.
  const healthCallsTrack = grep("grep -rn 'track(' src/lib/health --include='*.ts' | grep -vE ':[0-9]+:\\s*(//|\\*|/\\*)' || true")
  check('وحدات الصحة لا تستدعي track() إطلاقًا', healthCallsTrack === '')
  // [CTO-71] البند ١ — حُذفت طبقة `lib/analytics`، فالفحوص التي كانت تستجوبها
  // صارت تمرّ لأن هدفها غير موجود (نجاح غير مستحقّ، §4.2). أُعيد توجيهها إلى
  // الطبقة **الحيّة** `lib/tracking` فتبقى تحرس شيئًا حقيقيًا: عزل الصحة عن التتبّع.
  const healthImportsTracking = grep("grep -rn \"from '.*tracking\" src/lib/health --include='*.ts' || true")
  check('وحدات الصحة لا تستورد طبقة التتبّع', healthImportsTracking === '')
  const trackingImportsHealth = grep("grep -rn \"lib/health\" src/lib/tracking --include='*.ts' || true")
  check('طبقة التتبّع لا تستورد وحدات الصحة', trackingImportsHealth === '')
  const eventsCarryHealth = grep("grep -rniE 'bpm|heartRate|hrv|vo2|bodyMass|bodyFat|sleepAnalysis|oxygenSaturation|restingHeart' src/lib/tracking --include='*.ts' || true")
  check('عقد أحداث التتبّع خالٍ من أي حقل قيمة صحية', eventsCarryHealth === '')
  const healthCallsTrackLocal = grep("grep -rn 'trackLocal(' src/lib/health src/lib/healthKit.ts --include='*.ts' | grep -vE ':[0-9]+:\\s*(//|\\*|/\\*)' || true")
  check('وحدات الصحة والجسر القديم لا تستدعيان trackLocal() أيضًا', healthCallsTrackLocal === '')
  // تأكيد مضادّ: الهدف موجود فعلًا — فحصٌ على مجلّد غائب يمرّ بلا معنى.
  check('طبقة التتبّع موجودة فعلًا (الفحوص أعلاه ليست على هدف غائب)', existsSync(resolve(ROOT, 'src/lib/tracking')))
}

console.log(`\nبرهان أساس الصحة (P9): ${passed} ناجح، ${failed} فاشل`)
if (failed > 0) process.exit(1)
