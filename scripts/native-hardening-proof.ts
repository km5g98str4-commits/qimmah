// برهان تقوية الطبقة الأصلية (P14) — claude/p14-ios-native-hardening.
//
// أربعة أسطح: ① HealthKit (مصفوفة كامل/جزئي/مجهول + صدق «لا denied» + تشخيص
// بلا قيم) ② الباركود (أصلي ناجح/رفض صلاحية/لا كاميرا + احتياط الويب + تفكيك)
// ③ إشعار نهاية الراحة (جدولة/استبدال/إلغاء/بلا إذن/تنظيف بائت عند الإقلاع البارد)
// ④ مصالحة الإقلاع البارد للجلسة (راحة منتهية/خطة تغيّرت/عتبة الهجر/لا حفظ مزدوج).
//
// فحوص grep على السويفت وInfo.plist تعمل في المشغّل قبل هذا الملف.

import {
  requestAllHealthAccess,
  syncMetric,
  syncAllEnabled,
  disconnectMetric,
  metricDataState,
  healthDiagnosticsReport,
  healthDiagnosticsText,
  clearHealthDiagnostics,
  DEFAULT_HISTORY_DAYS,
  HEALTH_CONNECTION_KEY,
  type HealthReadBridge,
} from '@/lib/health/connect'
import { ALL_HEALTH_METRICS } from '@/lib/health/metrics'
import { HEALTH_SAMPLES_KEY, samplesFor } from '@/lib/health/store'
import { DATA_KEYS } from '@/lib/userDataKeys'
import { NATIVE_SETTINGS_COPY } from '@/data/nativeSettings'

import { scanOnce, type BarcodeScanPluginApi } from '@/features/barcode/nativeScanner'
import {
  getScanDiagnostics,
  clearScanDiagnostics,
  scanDiagnosticsSummary,
  scanPathOf,
} from '@/features/barcode/scanDiagnostics'
import { classifyCameraError, startWebZxingScan } from '@/features/barcode/webZxingEngine'

import {
  scheduleRestEndNotification,
  cancelRestEndNotification,
  reconcileRestEndOnColdStart,
  pendingRestEnd,
  restEndPendingKey,
  setRestEndPortForTests,
  REST_END_NOTIFICATION_ID,
  type RestEndPort,
} from '@/lib/notifications/restEnd'
import {
  decideColdStart,
  reconcileWorkoutColdStart,
  isUsableActiveWorkout,
  isActiveWorkoutAlreadySaved,
  activeWorkoutKey,
  ABANDONED_AFTER_MS,
} from '@/lib/workoutSessionEngine'

let passed = 0
let failed = 0
function check(label: string, cond: boolean) {
  if (cond) {
    passed += 1
    console.log(`  ✓ ${label}`)
  } else {
    failed += 1
    console.log(`  ✗ ${label}`)
  }
}

const store = globalThis.localStorage

// ═══════════════════════════════════════════════════════════════════════════
// ① HealthKit — مصفوفة الصلاحيات + الصدق + التشخيص
// ═══════════════════════════════════════════════════════════════════════════

interface Counters { auth: number; supported: number; quantity: number; sleep: number; workouts: number }

/**
 * جسر وهمي. `dataFor` تقرّر لكل مقياس هل يعيد عيّنات أم فراغ — بها نمثّل
 * «كامل» / «جزئي» / «لا بيانات (مجهول أو مرفوض)» بدقة، لأن iOS لا يعطينا أكثر.
 */
function makeBridge(opts: {
  dataFor?(metric: string): boolean
  supported?: string[]
  pages?: number
  /** يحاكي صفحة تقول hasMore بلا مرساة جديدة (فحص حلقة الصفحات). */
  hasMoreWithoutAnchor?: boolean
}): { bridge: HealthReadBridge; counters: Counters; lastAuthMetrics: string[]; lastDays: number | null } {
  const counters: Counters = { auth: 0, supported: 0, quantity: 0, sleep: 0, workouts: 0 }
  const state = { lastAuthMetrics: [] as string[], lastDays: null as number | null }
  const has = (m: string) => (opts.dataFor ? opts.dataFor(m) : true)
  const quantitySample = (metric: string, i: number) => ({
    uuid: `uuid-${metric}-${i}`,
    start: new Date(Date.UTC(2026, 6, 20, 8, i)).toISOString(),
    end: new Date(Date.UTC(2026, 6, 20, 8, i + 1)).toISOString(),
    value: 70 + i,
    unit: 'kg',
    sourceName: 'Apple Watch',
    sourceBundleId: 'com.apple.health',
  })
  const bridge: HealthReadBridge = {
    async isAvailable() { return { available: true } },
    async supportedMetrics() {
      counters.supported += 1
      return { available: true, metrics: opts.supported ?? [...ALL_HEALTH_METRICS] }
    },
    async requestAuthorization(options) {
      counters.auth += 1
      state.lastAuthMetrics = [...(options?.metrics ?? [])]
      return { permission: 'authorized' }
    },
    async getQuantitySamples(options) {
      counters.quantity += 1
      state.lastDays = options.days ?? null
      if (!has(options.metric)) return { status: 'ok', samples: [] }
      return {
        status: 'ok',
        samples: [quantitySample(options.metric, 1), quantitySample(options.metric, 2)],
        // hasMore بلا مرساة = الصفحة التالية ستكون نفسها ⇒ يجب أن تتوقّف الحلقة.
        hasMore: opts.hasMoreWithoutAnchor === true,
      }
    },
    async getSleepSamples() {
      counters.sleep += 1
      if (!has('sleepAnalysis')) return { status: 'ok', samples: [] }
      return {
        status: 'ok',
        samples: [{
          uuid: 'uuid-sleep-1',
          start: new Date(Date.UTC(2026, 6, 20, 1, 0)).toISOString(),
          end: new Date(Date.UTC(2026, 6, 20, 5, 0)).toISOString(),
          stage: 'deep',
          durationMin: 240,
          sourceName: 'iPhone',
        }],
      }
    },
    async getWorkouts() {
      counters.workouts += 1
      if (!has('workouts')) return { status: 'ok', samples: [] }
      return {
        status: 'ok',
        samples: [{
          uuid: 'uuid-workout-1',
          start: new Date(Date.UTC(2026, 6, 20, 17, 0)).toISOString(),
          end: new Date(Date.UTC(2026, 6, 20, 18, 0)).toISOString(),
          activity: 'strengthTraining',
          durationMin: 60,
          kcal: 400,
          distanceM: null,
        }],
      }
    },
  }
  return { bridge, counters, get lastAuthMetrics() { return state.lastAuthMetrics }, get lastDays() { return state.lastDays } } as never
}

function resetHealth() {
  store.removeItem(HEALTH_SAMPLES_KEY)
  store.removeItem(HEALTH_CONNECTION_KEY)
  clearHealthDiagnostics()
}

async function healthSuite() {
  console.log('\n① HealthKit — الصلاحيات والصدق والتشخيص')

  // — كامل: كل المقاييس تعيد بيانات —
  resetHealth()
  const full = makeBridge({})
  const req = await requestAllHealthAccess(full.bridge, true)
  check('كامل: طلب تفويض واحد مجمّع (نداء واحد لكل المقاييس)', req.status === 'completed' && full.counters.auth === 1 && full.lastAuthMetrics.length === ALL_HEALTH_METRICS.length)
  const fullResults = await syncAllEnabled(full.bridge, true)
  check('كامل: كل المقاييس المفعّلة تُزامَن', fullResults.length === ALL_HEALTH_METRICS.length && fullResults.every((r) => r.status === 'ok'))
  check('كامل: كل مقياس has-data (لا حالة مجهولة)', ALL_HEALTH_METRICS.every((m) => metricDataState(m) === 'has-data'))
  check(`كامل: النافذة الافتراضية ${DEFAULT_HISTORY_DAYS} يومًا تُمرَّر للجسر`, full.lastDays === DEFAULT_HISTORY_DAYS)

  // — جزئي: الخطوات فيها بيانات، الوزن والنبض فارغان (رفض قراءة أو لا بيانات) —
  resetHealth()
  const partial = makeBridge({ dataFor: (m) => m === 'steps' || m === 'sleepAnalysis' })
  await requestAllHealthAccess(partial.bridge, true)
  await syncAllEnabled(partial.bridge, true)
  check('جزئي: المقياس ذو البيانات = has-data', metricDataState('steps') === 'has-data' && metricDataState('sleepAnalysis') === 'has-data')
  check('جزئي: المقياس الفارغ = unknown-or-denied (لا يُدّعى رفض)', metricDataState('bodyMass') === 'unknown-or-denied' && metricDataState('heartRate') === 'unknown-or-denied')
  const partialStates = ALL_HEALTH_METRICS.map((m) => metricDataState(m))
  check('جزئي: لا حالة اسمها denied في أي مقياس', partialStates.every((s) => s === 'has-data' || s === 'unknown-or-denied' || s === 'not-connected') && !partialStates.includes('denied' as never))

  // — لا بيانات إطلاقًا: الحالة الوحيدة الصادقة = unknown-or-denied —
  resetHealth()
  const none = makeBridge({ dataFor: () => false })
  await requestAllHealthAccess(none.bridge, true)
  const noneResults = await syncAllEnabled(none.bridge, true)
  check('لا بيانات: كل الاستعلامات ok (الفراغ ليس خطأ ولا رفضًا)', noneResults.every((r) => r.status === 'ok' && r.imported === 0))
  check('لا بيانات: كل المقاييس unknown-or-denied', ALL_HEALTH_METRICS.every((m) => metricDataState(m) === 'unknown-or-denied'))

  // — غير متصل: مقياس مفصول = not-connected, لا يخترع حالة —
  resetHealth()
  const dis = makeBridge({})
  await requestAllHealthAccess(dis.bridge, true)
  await syncMetric('bodyMass', dis.bridge, true)
  await syncMetric('steps', dis.bridge, true)
  const beforeSteps = samplesFor('steps').length
  disconnectMetric('bodyMass')
  check('فصل مقياس: عيّناته المستوردة طُهّرت بالكامل', samplesFor('bodyMass').length === 0)
  check('فصل مقياس: المقاييس الأخرى لم تُمسّ', samplesFor('steps').length === beforeSteps && beforeSteps > 0)
  check('فصل مقياس: حالته not-connected (لا denied)', metricDataState('bodyMass') === 'not-connected')

  // — إزالة التكرار بمعرّف HealthKit UUID —
  resetHealth()
  const dedupe = makeBridge({})
  await requestAllHealthAccess(dedupe.bridge, true)
  const first = await syncMetric('bodyMass', dedupe.bridge, true)
  const second = await syncMetric('bodyMass', dedupe.bridge, true)
  check('إزالة التكرار بـUUID: مزامنة مكرّرة لا تضاعف المخزون', first.stored === 2 && second.stored === 2)

  // — حلقة الصفحات: hasMore بلا مرساة جديدة يجب أن تتوقّف (إصلاح P14) —
  resetHealth()
  const loop = makeBridge({ hasMoreWithoutAnchor: true })
  await requestAllHealthAccess(loop.bridge, true)
  const before = loop.counters.quantity
  await syncMetric('bodyMass', loop.bridge, true)
  check('صفحات: hasMore بلا مرساة ⇒ توقّف بعد صفحة واحدة (لا إعادة جلب ٨ مرّات)', loop.counters.quantity - before === 1)

  // — ترشيح التوفّر: أنواع iOS 16 غير المدعومة لا تُطلب —
  resetHealth()
  const guarded = makeBridge({ supported: ALL_HEALTH_METRICS.filter((m) => m !== 'appleSleepingWristTemperature' && m !== 'heartRateRecoveryOneMinute') })
  const guardedReq = await requestAllHealthAccess(guarded.bridge, true)
  check('حراسة التوفّر: النوع غير المدعوم لا يدخل الطلب', !guarded.lastAuthMetrics.includes('appleSleepingWristTemperature') && guardedReq.metrics.length === ALL_HEALTH_METRICS.length - 2)

  // — التشخيص: بيانات وصفية فقط، ولا قيمة صحية واحدة —
  resetHealth()
  const diagBridge = makeBridge({ dataFor: (m) => m === 'bodyMass' })
  await requestAllHealthAccess(diagBridge.bridge, true)
  await syncMetric('bodyMass', diagBridge.bridge, true)
  await syncMetric('heartRate', diagBridge.bridge, true)
  const report = healthDiagnosticsReport()
  const mass = report.find((r) => r.metric === 'bodyMass')
  const hr = report.find((r) => r.metric === 'heartRate')
  check('تشخيص: صف لكل مقياس بكل الحقول المطلوبة', report.length === ALL_HEALTH_METRICS.length && !!mass && typeof mass.requested === 'boolean' && typeof mass.hasData === 'boolean' && typeof mass.sampleCount === 'number' && typeof mass.unitUsed === 'string')
  check('تشخيص: hasData + عدد العيّنات + المصدر للمقياس ذي البيانات', mass!.hasData === true && mass!.sampleCount === 2 && mass!.source === 'Apple Watch' && mass!.unitUsed === 'kg')
  check('تشخيص: lastQueryMs مقاس (عدد ≥ 0) وlastStatus = ok', typeof mass!.lastQueryMs === 'number' && (mass!.lastQueryMs as number) >= 0 && mass!.lastStatus === 'ok')
  check('تشخيص: المقياس الفارغ hasData=false ولا حالة denied', hr!.hasData === false && (hr!.lastStatus === 'ok' || hr!.lastStatus === 'never') && !(['denied'] as string[]).includes(hr!.lastStatus))
  const diagJson = JSON.stringify(report)
  const storedValues = samplesFor('bodyMass').map((s) => String(s.value))
  check('خصوصية التشخيص: لا قيمة عيّنة صحية في التقرير إطلاقًا', storedValues.length > 0 && storedValues.every((v) => !diagJson.includes(`:${v}`) && !diagJson.includes(`"${v}"`)))
  check('خصوصية التشخيص: لا حقل value/kg/bpm/kcal في أي صف', report.every((r) => !('value' in r) && !('kg' in r) && !('bpm' in r) && !('kcal' in r)))
  check('تشخيص: ملخّص نصي بسطر لكل مقياس', healthDiagnosticsText().split('\n').length === ALL_HEALTH_METRICS.length)
  clearHealthDiagnostics()
  check('تشخيص: التصفير يُسقط قياسات آخر استعلام', healthDiagnosticsReport().every((r) => r.lastQueryMs === null && r.lastStatus === 'never'))

  // — سجل المفاتيح: مفاتيح الصحة مسجّلة، غير مُصدَّرة وغير مُزامَنة (حارس P12) —
  const samplesDef = DATA_KEYS.find((d) => d.key === HEALTH_SAMPLES_KEY)
  const connDef = DATA_KEYS.find((d) => d.key === HEALTH_CONNECTION_KEY)
  check('سجل المفاتيح: مفتاح عيّنات الصحة مسجّل', !!samplesDef)
  check('سجل المفاتيح: مفتاح حالة الاتصال مسجّل', !!connDef)
  check('P12: عيّنات الصحة المستوردة لا تُرفع للسحابة ولا تُصدَّر', samplesDef?.synced === false && samplesDef?.exported === false && connDef?.synced === false && connDef?.exported === false)
  check('سجل المفاتيح: كلاهما بيانات مستخدم بخطّة هجرة', samplesDef?.kind === 'user' && connDef?.kind === 'user' && samplesDef?.migration === 'owner-suffix')

  // — النسخة المعروضة لا تدّعي رفضًا أبدًا —
  const arCopy = NATIVE_SETTINGS_COPY.ar
  const enCopy = NATIVE_SETTINGS_COPY.en
  check('نسخة الصحة (ar): لا تقول «ما انعطى الإذن» ولا «رفضت»', !arCopy.denied.includes('ما انعطى الإذن') && !arCopy.denied.includes('رفض') && !arCopy.unknown.includes('رفض'))
  check('نسخة الصحة (en): لا تقول "Permission wasn\'t given" ولا "denied"', !/permission wasn'?t given|denied|you refused/i.test(enCopy.denied) && !/denied/i.test(enCopy.unknown))
  check('نسخة الصحة: تذكر البديل اليدوي في اللغتين', /يدوي/.test(arCopy.unknown) && /manual/i.test(enCopy.unknown))
}

// ═══════════════════════════════════════════════════════════════════════════
// ② الباركود — مسارات صادقة + تشخيص لكل محاولة + تفكيك
// ═══════════════════════════════════════════════════════════════════════════

/** navigator في Node ≥20 خاصية getter-only — نستبدلها بـdefineProperty. */
function setNavigator(value: unknown): void {
  Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true })
}

function nativePlugin(result: Record<string, unknown>, spy?: { torch: boolean[]; cancelled: number }): BarcodeScanPluginApi {
  return {
    async isSupported() { return { supported: true } },
    async scanOnce() { return result as never },
    async setTorch({ on }) { spy?.torch.push(on); return { on } },
    async cancelScan() { if (spy) spy.cancelled += 1 },
  }
}

async function barcodeSuite() {
  console.log('\n② الباركود — المسارات والتشخيص والتفكيك')

  check('مسار مشتق: native-avfoundation ⇒ native، zxing-web ⇒ web', scanPathOf('native-avfoundation') === 'native' && scanPathOf('zxing-web') === 'web')

  // — أصلي ناجح: صيغة + دقة + فلاش في التشخيص —
  clearScanDiagnostics()
  const spy = { torch: [] as boolean[], cancelled: 0 }
  const outcomes: string[] = []
  const hit = await scanOnce({
    labels: { cancel: 'إلغاء', torch: 'فلاش', hint: 'وجّه الكاميرا' },
    forceNative: true,
    plugin: nativePlugin({ hit: { value: '5000112637922', format: 'ean_13' }, status: 'detected', resolution: { width: 1920, height: 1080 }, torchUsed: true }, spy),
    onOutcome: (s) => outcomes.push(s),
  })
  const okAttempt = getScanDiagnostics().at(-1)!
  check('أصلي ناجح: القيمة والصيغة تعبران الجسر', hit?.value === '5000112637922' && hit.format === 'ean_13' && outcomes[0] === 'detected')
  check('أصلي ناجح: التشخيص يسجّل path=native والصيغة والدقة', okAttempt.path === 'native' && okAttempt.outcome === 'detected' && okAttempt.formatHit === 'ean_13' && okAttempt.resolution?.width === 1920)
  check('أصلي ناجح: الفلاش المُستخدم مسجّل، والمدة مقاسة', okAttempt.torch === true && typeof okAttempt.durationMs === 'number')
  check('خصوصية التشخيص: قيمة الباركود لا تُسجَّل إطلاقًا', !JSON.stringify(getScanDiagnostics()).includes('5000112637922') && !scanDiagnosticsSummary().includes('5000112637922'))

  // — أصلي: رفض الصلاحية حالة صادقة، لا «غير موجود» ولا 'error' مبهمة —
  clearScanDiagnostics()
  const deniedOutcomes: string[] = []
  const deniedHit = await scanOnce({
    labels: { cancel: 'x', torch: 't', hint: '' },
    forceNative: true,
    plugin: nativePlugin({ hit: null, status: 'permission-denied' }),
    onOutcome: (s) => deniedOutcomes.push(s),
  })
  check('أصلي: رفض الصلاحية ⇒ null + حالة permission-denied (لا «غير موجود»)', deniedHit === null && deniedOutcomes[0] === 'permission-denied')
  check('أصلي: التشخيص يميّز رفض الصلاحية عن العطل (إصلاح P14)', getScanDiagnostics().at(-1)!.outcome === 'permission-denied')

  // — أصلي: لا كاميرا —
  clearScanDiagnostics()
  const noCamOutcomes: string[] = []
  await scanOnce({
    labels: { cancel: 'x', torch: 't', hint: '' },
    forceNative: true,
    plugin: nativePlugin({ hit: null, status: 'no-camera' }),
    onOutcome: (s) => noCamOutcomes.push(s),
  })
  check('أصلي: لا كاميرا ⇒ حالة no-camera في الواجهة والتشخيص', noCamOutcomes[0] === 'no-camera' && getScanDiagnostics().at(-1)!.outcome === 'no-camera')

  // — أصلي: إلغاء المستخدم + تمرير الفلاش عبر المقبض —
  clearScanDiagnostics()
  const controlSpy = { torch: [] as boolean[], cancelled: 0 }
  let torchApplied: boolean | null = null
  await scanOnce({
    labels: { cancel: 'x', torch: 't', hint: '' },
    forceNative: true,
    plugin: nativePlugin({ hit: null, status: 'cancelled' }, controlSpy),
    onControls: (c) => { void c.setTorch(true).then((r) => { torchApplied = r }); c.cancel() },
  })
  await new Promise((r) => setTimeout(r, 0))
  check('أصلي: مقبض التحكّم يمرّر الفلاش والإلغاء للإضافة', controlSpy.torch[0] === true && controlSpy.cancelled === 1 && torchApplied === true)
  check('أصلي: الإلغاء يُسجَّل cancelled لا error', getScanDiagnostics().at(-1)!.outcome === 'cancelled')

  // — تصنيف أخطاء الكاميرا في مسار الويب —
  check('ويب: NotAllowedError ⇒ permission-denied', classifyCameraError({ name: 'NotAllowedError' }) === 'permission-denied')
  check('ويب: NotFoundError/OverconstrainedError ⇒ no-camera', classifyCameraError({ name: 'NotFoundError' }) === 'no-camera' && classifyCameraError({ name: 'OverconstrainedError' }) === 'no-camera')
  check('ويب: خطأ غير معروف ⇒ start-failed (لا يُدّعى رفض)', classifyCameraError({ name: 'AbortError' }) === 'start-failed')

  // — احتياط الويب: بلا عنصر فيديو لا يبدأ مسحًا (عقد Codex) —
  const webOutcomes: string[] = []
  const webNull = await scanOnce({ labels: { cancel: 'x', torch: 't', hint: '' }, forceNative: false, onOutcome: (s) => webOutcomes.push(s) })
  check('ويب: بلا عنصر فيديو ⇒ null بحالة error صريحة', webNull === null && webOutcomes[0] === 'error')

  // — احتياط الويب حقيقي: بثّ وهمي، ثم stop ⇒ تفكيك فعلي —
  clearScanDiagnostics()
  const stopped: string[] = []
  const fakeTrack = {
    stop() { stopped.push('track') },
    getSettings() { return { width: 1280, height: 720 } },
    getCapabilities() { return {} },
    async applyConstraints() { /* لا قيود متقدمة */ },
  }
  const fakeStream = { getTracks: () => [fakeTrack], getVideoTracks: () => [fakeTrack] }
  setNavigator({ mediaDevices: { getUserMedia: async () => fakeStream } })
  const fakeVideo = { videoWidth: 1280, videoHeight: 720, readyState: 4, srcObject: null as unknown, async play() { /* no-op */ } }
  const controller = startWebZxingScan(fakeVideo as never, { onDetected: () => undefined, onError: () => undefined })
  await new Promise((r) => setTimeout(r, 10))
  check('ويب: الدقة الفعلية تُسجَّل في التشخيص', getScanDiagnostics().at(-1)!.resolution?.width === 1280)
  controller.stop()
  check('ويب: stop() يفكّك البثّ فعليًا (track.stop مستدعاة) — لا كاميرا معلّقة', stopped.includes('track'))
  check('ويب: stop() يُغلق سجل المحاولة cancelled بمدّة مقاسة', getScanDiagnostics().at(-1)!.outcome === 'cancelled' && typeof getScanDiagnostics().at(-1)!.durationMs === 'number')
  controller.stop()
  check('ويب: stop() مكرّرة آمنة (لا تفكيك مزدوج)', stopped.filter((s) => s === 'track').length === 1)

  // — رفض الصلاحية في مسار الويب يُسجَّل بحالته الدقيقة —
  clearScanDiagnostics()
  setNavigator({ mediaDevices: { getUserMedia: async () => { throw { name: 'NotAllowedError' } } } })
  let webErr: unknown = null
  startWebZxingScan(fakeVideo as never, { onDetected: () => undefined, onError: (e) => { webErr = e } })
  await new Promise((r) => setTimeout(r, 10))
  check('ويب: رفض الصلاحية ⇒ التشخيص permission-denied (لا error مبهمة)', getScanDiagnostics().at(-1)!.outcome === 'permission-denied' && (webErr as { name?: string } | null)?.name === 'NotAllowedError')
}

// ═══════════════════════════════════════════════════════════════════════════
// ③ إشعار نهاية الراحة — الدورة الكاملة + تنظيف الإقلاع البارد
// ═══════════════════════════════════════════════════════════════════════════

interface PortSpy {
  scheduled: { id: number; at: number }[]
  cancelled: number[]
  removedDelivered: number[]
}

function spyPort(permission: 'granted' | 'denied', supported = true): { port: RestEndPort; spy: PortSpy } {
  const spy: PortSpy = { scheduled: [], cancelled: [], removedDelivered: [] }
  return {
    spy,
    port: {
      supported: () => supported,
      permission: async () => permission,
      async scheduleAt(item) { spy.scheduled.push({ id: item.id, at: item.at.getTime() }) },
      async cancel(id) { spy.cancelled.push(id) },
      async removeDelivered(id) { spy.removedDelivered.push(id) },
    },
  }
}

const OWNER = 'user-a'
const OTHER = 'user-b'

async function restEndSuite() {
  console.log('\n③ إشعار نهاية الراحة — الجدولة والإلغاء والتنظيف البائت')

  const now = Date.UTC(2026, 6, 26, 18, 0, 0)
  const endsAt = now + 90_000

  // — جدولة عند endsAt بالمعرّف المعروف + أثر معلّق —
  let { port, spy } = spyPort('granted')
  setRestEndPortForTests(port)
  store.removeItem(restEndPendingKey(OWNER))
  const r1 = await scheduleRestEndNotification(endsAt, 'ar', now, { ownerId: OWNER })
  check('جدولة: أحادية عند endsAt بالمعرّف 3600', r1 === 'scheduled' && spy.scheduled.length === 1 && spy.scheduled[0].id === REST_END_NOTIFICATION_ID && spy.scheduled[0].at === endsAt)
  check('جدولة: أثر معلّق محفوظ بـendsAt (أساس تنظيف الإقلاع البارد)', pendingRestEnd(OWNER)?.endsAt === endsAt)

  // — «+وقت»: استبدال لا تراكم —
  const r2 = await scheduleRestEndNotification(endsAt + 15_000, 'ar', now, { ownerId: OWNER })
  check('«+وقت»: إلغاء ثم جدولة واحدة عند الوقت الممدَّد', r2 === 'scheduled' && spy.cancelled.length === 2 && spy.scheduled.length === 2 && spy.scheduled[1].at === endsAt + 15_000)
  check('«+وقت»: أثر واحد فقط بالقيمة الجديدة (لا معرّفان لراحة واحدة)', pendingRestEnd(OWNER)?.endsAt === endsAt + 15_000)

  // — تخطّي الراحة ⇒ إلغاء + مسح الأثر —
  await cancelRestEndNotification({ ownerId: OWNER })
  check('تخطّي الراحة: إلغاء يمرّ للمنفذ والأثر يُمسح', spy.cancelled.length === 3 && pendingRestEnd(OWNER) === null)

  // — إنهاء الجلسة في المقدّمة ⇒ إلغاء آمن حتى بلا أثر —
  await cancelRestEndNotification({ ownerId: OWNER })
  check('إنهاء الجلسة: إلغاء مكرّر آمن ولا يرمي', spy.cancelled.length === 4)

  // — وقت مضى: لا جدولة، **ومع ذلك** يُلغى القديم ويُمسح الأثر (إصلاح P14) —
  ;({ port, spy } = spyPort('granted'))
  setRestEndPortForTests(port)
  await scheduleRestEndNotification(endsAt, 'ar', now, { ownerId: OWNER })
  const scheduledBefore = spy.scheduled.length
  const r3 = await scheduleRestEndNotification(now - 1, 'ar', now, { ownerId: OWNER })
  check('وقت مضى ⇒ skipped بلا جدولة جديدة', r3 === 'skipped' && spy.scheduled.length === scheduledBefore)
  check('وقت مضى: القديم أُلغي والأثر مُسح (لا إشعار متأخّر يرنّ)', spy.cancelled.length === 2 && pendingRestEnd(OWNER) === null)

  // — بلا إذن: لا-شيء إطلاقًا —
  ;({ port, spy } = spyPort('denied'))
  setRestEndPortForTests(port)
  store.removeItem(restEndPendingKey(OWNER))
  const r4 = await scheduleRestEndNotification(endsAt, 'ar', now, { ownerId: OWNER })
  check('بلا إذن ⇒ denied، لا جدولة ولا إلغاء ولا أثر', r4 === 'denied' && spy.scheduled.length === 0 && spy.cancelled.length === 0 && pendingRestEnd(OWNER) === null)

  // — منصة غير مدعومة (ويب) ⇒ لا-شيء صامت —
  ;({ port, spy } = spyPort('granted', false))
  setRestEndPortForTests(port)
  const r5 = await scheduleRestEndNotification(endsAt, 'ar', now, { ownerId: OWNER })
  check('الويب ⇒ unsupported لا-شيء صامت', r5 === 'unsupported' && spy.scheduled.length === 0)

  // — عزل الحسابات: أثر كل مالك بمفتاحه —
  ;({ port, spy } = spyPort('granted'))
  setRestEndPortForTests(port)
  await scheduleRestEndNotification(endsAt, 'ar', now, { ownerId: OWNER })
  await scheduleRestEndNotification(endsAt + 5000, 'ar', now, { ownerId: OTHER })
  check('حسابان على جهاز: أثر لكل مالك، ومعرّف الإشعار واحد لا يتكرّر', pendingRestEnd(OWNER)?.endsAt === endsAt && pendingRestEnd(OTHER)?.endsAt === endsAt + 5000 && spy.scheduled.every((s) => s.id === REST_END_NOTIFICATION_ID))
  store.removeItem(restEndPendingKey(OTHER))

  // — إقلاع بارد: أثر بائت (الراحة انتهت والتطبيق مقتول) —
  ;({ port, spy } = spyPort('granted'))
  setRestEndPortForTests(port)
  await scheduleRestEndNotification(now + 60_000, 'ar', now, { ownerId: OWNER })
  const stale = await reconcileRestEndOnColdStart({ ownerId: OWNER, activeRestEndsAt: null, nowMs: now + 120_000 })
  check('إقلاع بارد: أثر بائت ⇒ cleared-stale + إلغاء + إزالة من مركز الإشعارات', stale.action === 'cleared-stale' && spy.cancelled.includes(REST_END_NOTIFICATION_ID) && spy.removedDelivered.includes(REST_END_NOTIFICATION_ID))
  check('إقلاع بارد: الأثر البائت لا يبقى مخزّنًا', pendingRestEnd(OWNER) === null)

  // — إقلاع بارد: أثر يتيم (راحة مستقبلية لكن لا جلسة نشطة) —
  ;({ port, spy } = spyPort('granted'))
  setRestEndPortForTests(port)
  await scheduleRestEndNotification(now + 60_000, 'ar', now, { ownerId: OWNER })
  const orphan = await reconcileRestEndOnColdStart({ ownerId: OWNER, activeRestEndsAt: null, nowMs: now + 1000 })
  check('إقلاع بارد: أثر يتيم بلا جلسة ⇒ cleared-orphan + إلغاء', orphan.action === 'cleared-orphan' && spy.cancelled.includes(REST_END_NOTIFICATION_ID))
  check('إقلاع بارد: اليتيم لا يُزال من مركز الإشعارات (لم يُسلَّم بعد)', spy.removedDelivered.length === 0)

  // — إقلاع بارد: راحة ما زالت جارية ⇒ الإشعار الصحيح يُترك —
  ;({ port, spy } = spyPort('granted'))
  setRestEndPortForTests(port)
  const running = now + 60_000
  await scheduleRestEndNotification(running, 'ar', now, { ownerId: OWNER })
  const cancelledBefore = spy.cancelled.length
  const kept = await reconcileRestEndOnColdStart({ ownerId: OWNER, activeRestEndsAt: running, nowMs: now + 1000 })
  check('إقلاع بارد: راحة جارية بنفس endsAt ⇒ kept بلا إلغاء', kept.action === 'kept' && spy.cancelled.length === cancelledBefore && pendingRestEnd(OWNER)?.endsAt === running)

  // — إقلاع بارد بلا أثر ⇒ لا شيء —
  store.removeItem(restEndPendingKey(OWNER))
  const nothing = await reconcileRestEndOnColdStart({ ownerId: OWNER, nowMs: now })
  check('إقلاع بارد: بلا أثر ⇒ none (لا نداءات على المنفذ)', nothing.action === 'none' && nothing.pendingEndsAt === null)

  setRestEndPortForTests(null)
}

// ═══════════════════════════════════════════════════════════════════════════
// ④ مصالحة الإقلاع البارد للجلسة النشطة
// ═══════════════════════════════════════════════════════════════════════════

const PLAN = ['slot-1', 'slot-2']

function activeSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    exIndex: 0,
    setIndex: 1,
    startedAt: Date.UTC(2026, 6, 26, 17, 0, 0),
    rows: {
      'slot-1': [{ weight: 60, reps: 8, done: true }, { weight: 60, reps: 8, done: false }],
      'slot-2': [{ weight: 40, reps: 10, done: false }],
    },
    ...overrides,
  }
}

async function coldStartSuite() {
  console.log('\n④ الإقلاع البارد — استعادة الجلسة والمصالحة')

  const now = Date.UTC(2026, 6, 26, 18, 0, 0)

  // — الحارس نفسه —
  check('حارس الجلسة: لقطة صالحة لهذه الخطة تُقبل', isUsableActiveWorkout(activeSnapshot(), PLAN))
  check('حارس الجلسة: خطة بمعرّفات مختلفة تُرفض', !isUsableActiveWorkout(activeSnapshot(), ['other-1', 'other-2']))
  check('حارس الجلسة: مدخل معادٍ (rows ليست مصفوفات) يُرفض', !isUsableActiveWorkout({ ...activeSnapshot(), rows: { 'slot-1': 'x', 'slot-2': 'y' } }, PLAN))
  check('حارس الجلسة: setIndex خارج النطاق يُرفض', !isUsableActiveWorkout(activeSnapshot({ setIndex: 9 }), PLAN))

  // — لا شيء مخزّن —
  check('إقلاع بارد: لا جلسة مخزّنة ⇒ none', decideColdStart({ persisted: null, exerciseIds: PLAN, nowMs: now }).action === 'none')

  // — استئناف مع راحة ما زالت جارية: العدّ يُعاد حسابه من endsAt لا من عدّاد —
  const running = decideColdStart({
    persisted: activeSnapshot({ rest: { endsAt: now + 45_000, durationSec: 90 } }),
    exerciseIds: PLAN,
    nowMs: now,
  })
  check('استئناف: جلسة حديثة ⇒ resume', running.action === 'resume' && running.session !== null)
  check('استئناف: الراحة الجارية تُحسب من endsAt (45 ثانية متبقّية)', running.restState === 'running' && running.restRemainingSec === 45)
  check('استئناف: المجموعات المنفَّذة محفوظة في القرار (لا فقدان صامت)', running.completedSets === 1)

  // — راحة انتهت أثناء موت التطبيق —
  const elapsed = decideColdStart({
    persisted: activeSnapshot({ rest: { endsAt: now - 30_000, durationSec: 90 } }),
    exerciseIds: PLAN,
    nowMs: now,
  })
  check('راحة منتهية أثناء القتل ⇒ elapsed بصفر متبقٍّ (لا رقم سالب)', elapsed.action === 'resume' && elapsed.restState === 'elapsed' && elapsed.restRemainingSec === 0)

  // — بلا راحة —
  check('بلا راحة مخزّنة ⇒ restState=none', decideColdStart({ persisted: activeSnapshot(), exerciseIds: PLAN, nowMs: now }).restState === 'none')

  // — الخطة تغيّرت أثناء القتل: تجاهل مُسمّى، والعمل المنفَّذ معلوم —
  const changed = decideColdStart({ persisted: activeSnapshot(), exerciseIds: ['new-1', 'new-2'], nowMs: now })
  check('الخطة تغيّرت ⇒ discard(plan-changed) لا «تالف»', changed.action === 'discard' && changed.discardReason === 'plan-changed')
  check('الخطة تغيّرت: عدد المجموعات المنفَّذة يُبلَّغ (لا حذف صامت لعمل حقيقي)', changed.completedSets === 1)

  // — JSON تالف/مدخل معادٍ —
  const malformed = decideColdStart({ persisted: { junk: true }, exerciseIds: PLAN, nowMs: now })
  check('مدخل تالف ⇒ discard(malformed)', malformed.action === 'discard' && malformed.discardReason === 'malformed' && malformed.completedSets === 0)

  // — عتبة الهجر (٨ ساعات) —
  const oldStart = now - ABANDONED_AFTER_MS - 1
  const abandoned = decideColdStart({ persisted: activeSnapshot({ startedAt: oldStart }), exerciseIds: PLAN, nowMs: now })
  check('عتبة الهجر: ≥٨ ساعات ⇒ abandoned (تصنيف لا حذف)', abandoned.action === 'abandoned' && abandoned.session !== null)
  check('عتبة الهجر: المجموعات المنفَّذة تبقى كاملة في الجلسة المصنَّفة', abandoned.completedSets === 1 && abandoned.session!.rows['slot-1'].length === 2)
  const justUnder = decideColdStart({ persisted: activeSnapshot({ startedAt: now - ABANDONED_AFTER_MS + 60_000 }), exerciseIds: PLAN, nowMs: now })
  check('عتبة الهجر: أقلّ من ٨ ساعات بدقيقة ⇒ resume لا abandoned', justUnder.action === 'resume')

  // — لا حفظ مزدوج: المعرّف مبذور بـstartedAt —
  const startedAt = activeSnapshot().startedAt
  const saved = [{ id: `session-v2-${startedAt}`, date: '2026-07-26', startedAt: new Date(startedAt).toISOString(), workoutDayId: 'v2', workoutDayName: 'x', exercises: [] }]
  check('لا حفظ مزدوج: جلسة محفوظة أصلًا تُكتشف بمعرّفها', isActiveWorkoutAlreadySaved(startedAt, saved as never))
  check('لا حفظ مزدوج: جلسة جديدة لا تُعتبر محفوظة', !isActiveWorkoutAlreadySaved(startedAt + 1, saved as never))

  // — المصالحة الكاملة (آثار جانبية) —
  const { port, spy } = spyPort('granted')
  setRestEndPortForTests(port)

  // (أ) استئناف مع راحة جارية ⇒ الإشعار المجدول يُترك، المفتاح يبقى
  store.setItem(activeWorkoutKey(OWNER), JSON.stringify(activeSnapshot({ rest: { endsAt: now + 45_000, durationSec: 90 } })))
  await scheduleRestEndNotification(now + 45_000, 'ar', now, { ownerId: OWNER })
  const cancelledBefore = spy.cancelled.length
  const resumeRec = await reconcileWorkoutColdStart({ ownerId: OWNER, exerciseIds: PLAN, nowMs: now })
  check('مصالحة: استئناف براحة جارية ⇒ الإشعار kept والمفتاح باقٍ', resumeRec.decision.action === 'resume' && resumeRec.restEnd.action === 'kept' && spy.cancelled.length === cancelledBefore && resumeRec.clearedKey === false)
  check('مصالحة: تُبلّغ alreadySaved=false لجلسة غير محفوظة', resumeRec.alreadySaved === false)

  // (ب) راحة انتهت أثناء القتل ⇒ إشعار بائت يُلغى ويُزال من مركز الإشعارات
  store.setItem(activeWorkoutKey(OWNER), JSON.stringify(activeSnapshot({ rest: { endsAt: now - 30_000, durationSec: 90 } })))
  await scheduleRestEndNotification(now - 30_000 + 1, 'ar', now - 60_000, { ownerId: OWNER })
  const staleRec = await reconcileWorkoutColdStart({ ownerId: OWNER, exerciseIds: PLAN, nowMs: now })
  check('مصالحة: راحة منتهية ⇒ الإشعار cleared-stale (لا يرنّ بعد الإقلاع)', staleRec.decision.restState === 'elapsed' && staleRec.restEnd.action === 'cleared-stale' && spy.removedDelivered.includes(REST_END_NOTIFICATION_ID))
  check('مصالحة: الجلسة نفسها تبقى قابلة للاستئناف (لا حذف بسبب الراحة)', staleRec.decision.action === 'resume' && staleRec.clearedKey === false && store.getItem(activeWorkoutKey(OWNER)) !== null)

  // (ج) الخطة تغيّرت ⇒ الإشعار يُلغى، والمفتاح **لا يُمسح** (فيه عمل حقيقي)
  await scheduleRestEndNotification(now + 60_000, 'ar', now, { ownerId: OWNER })
  const changedRec = await reconcileWorkoutColdStart({ ownerId: OWNER, exerciseIds: ['new-1'], nowMs: now })
  check('مصالحة: الخطة تغيّرت ⇒ إلغاء الإشعار اليتيم', changedRec.decision.discardReason === 'plan-changed' && changedRec.restEnd.action === 'cleared-orphan')
  check('مصالحة: الخطة تغيّرت ⇒ المفتاح لا يُمسح من طبقة البيانات (قرار الواجهة)', changedRec.clearedKey === false && store.getItem(activeWorkoutKey(OWNER)) !== null)

  // (د) تالف ⇒ المفتاح يُمسح (لا عمل يُفقد)
  store.setItem(activeWorkoutKey(OWNER), '{"junk":true}')
  const malformedRec = await reconcileWorkoutColdStart({ ownerId: OWNER, exerciseIds: PLAN, nowMs: now })
  check('مصالحة: مدخل تالف ⇒ المفتاح يُمسح', malformedRec.decision.discardReason === 'malformed' && malformedRec.clearedKey === true && store.getItem(activeWorkoutKey(OWNER)) === null)

  // (هـ) JSON غير قابل للتحليل ⇒ لا رمي
  store.setItem(activeWorkoutKey(OWNER), '{not json')
  const brokenRec = await reconcileWorkoutColdStart({ ownerId: OWNER, exerciseIds: PLAN, nowMs: now })
  check('مصالحة: JSON غير قابل للتحليل لا يرمي (يُعالج كـnone)', brokenRec.decision.action === 'none')

  // (و) عزل الحسابات: مفتاح كل مالك مستقل
  store.setItem(activeWorkoutKey(OWNER), JSON.stringify(activeSnapshot()))
  const otherRec = await reconcileWorkoutColdStart({ ownerId: OTHER, exerciseIds: PLAN, nowMs: now })
  check('مصالحة: جلسة مالك آخر لا تُقرأ (مفاتيح موسومة بالمالك)', otherRec.decision.action === 'none' && store.getItem(activeWorkoutKey(OWNER)) !== null)

  setRestEndPortForTests(null)
  store.removeItem(activeWorkoutKey(OWNER))
}

// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  await healthSuite()
  await barcodeSuite()
  await restEndSuite()
  await coldStartSuite()

  console.log(`\n${failed === 0 ? '🎉' : '❌'} P14 native hardening: ${passed} نجحت / ${failed} فشلت`)
  if (failed > 0) process.exit(1)
}

await main()
