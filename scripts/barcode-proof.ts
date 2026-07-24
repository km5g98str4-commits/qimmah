// إثبات P8 — الباركود الأصلي/الويب: شكل واجهة scanOnce، صلاحية تخزين OFF (TTL)،
// تحقّق الإدخال اليدوي، هجرة التخزين القديم ×2، وخصوصية التشخيص (بيانات وصفية فقط).
// فحوص «لا رفع للإطارات» (grep) تعمل في run-barcode-proof.mjs قبل هذا الملف.

import { strict as assert } from 'node:assert'
import {
  validateBarcode,
  normalizeDigits,
  gtinCheckDigitValid,
  expandUpcE,
  lookupManualBarcode,
} from '@/features/barcode/validateBarcode'
import {
  lookupBarcode,
  OFF_CACHE_KEY,
  OFF_TTL_FOUND_MS,
  OFF_TTL_NOT_FOUND_MS,
  type OffLookupDeps,
} from '@/features/barcode/openFoodFacts'
import { scanOnce, isNativeScanPlatform, type BarcodeScanPluginApi } from '@/features/barcode/nativeScanner'
import {
  startWebZxingScan,
  WEB_SCAN_ROI,
  FULL_FRAME_EVERY_N,
  DECODE_INTERVAL_MS,
  MAX_DECODE_WIDTH,
} from '@/features/barcode/webZxingEngine'
import {
  beginScanAttempt,
  getScanDiagnostics,
  clearScanDiagnostics,
  scanDiagnosticsSummary,
  SCAN_DIAGNOSTICS_CAPACITY,
} from '@/features/barcode/scanDiagnostics'

let passed = 0
function check(label: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1
      console.log(`  ✓ ${label}`)
    })
    .catch((err) => {
      console.error(`✗ FAIL: ${label}`)
      console.error(err)
      process.exit(1)
    })
}

// ═══ 1) validateBarcode — أطوال/خانة تحقق/أرقام عربية ═══════════════════════

await check('EAN-13 صحيح (5449000000996) يُقبل بصيغته', () => {
  const v = validateBarcode('5449000000996')
  assert.deepEqual(v, { ok: true, normalized: '5449000000996', lookupCode: '5449000000996', format: 'ean_13' })
})

await check('خانة تحقق خاطئة تُرفض بسبب checksum', () => {
  const v = validateBarcode('5449000000991')
  assert.deepEqual(v, { ok: false, reason: 'checksum' })
})

await check('UPC-A صحيح (036000291452) يُقبل', () => {
  const v = validateBarcode('036000291452')
  assert.ok(v.ok && v.format === 'upc_a' && v.lookupCode === '036000291452')
})

await check('EAN-8 صحيح (96385074) يُقبل', () => {
  const v = validateBarcode('96385074')
  assert.ok(v.ok && v.format === 'ean_8')
})

await check('UPC-E (06543217) يُقبل ويُوسَّع إلى UPC-A للبحث', () => {
  assert.equal(expandUpcE('06543217'), '065100004327')
  assert.ok(gtinCheckDigitValid('065100004327'))
  const v = validateBarcode('06543217')
  assert.ok(v.ok && v.format === 'upc_e' && v.lookupCode === '065100004327' && v.normalized === '06543217')
})

await check('غموض 8 خانات: كود صالح كـ EAN-8 وكـ UPC-E معًا → EAN-8 تفوز (أسبقية موثّقة)', () => {
  // 01234565 مثال GS1 الكلاسيكي للـ UPC-E، وخانة تحققه تصادف أنها صالحة كـ EAN-8 أيضًا.
  assert.equal(expandUpcE('01234565'), '012345000065')
  assert.ok(gtinCheckDigitValid('01234565'), 'صالح كـ EAN-8')
  assert.ok(gtinCheckDigitValid('012345000065'), 'وصالح كـ UPC-E موسَّع')
  const v = validateBarcode('01234565')
  assert.ok(v.ok && v.format === 'ean_8' && v.lookupCode === '01234565')
})

await check('الأرقام العربية الشرقية تُنسَّق وتُقبل (ثنائي اللغة)', () => {
  assert.equal(normalizeDigits('٥٤٤٩٠٠٠٠٠٠٩٩٦'), '5449000000996')
  assert.equal(normalizeDigits('۵۴۴۹۰۰۰۰۰۰۹۹۶'), '5449000000996')
  const v = validateBarcode('٥٤٤٩٠٠٠٠٠٠٩٩٦')
  assert.ok(v.ok && v.normalized === '5449000000996' && v.format === 'ean_13')
})

await check('مسافات وشرطات تُتجاهل؛ فراغ/أحرف/طول خاطئ تُرفض بأسبابها', () => {
  assert.ok(validateBarcode('5449000-000 996').ok)
  assert.deepEqual(validateBarcode('   '), { ok: false, reason: 'empty' })
  assert.deepEqual(validateBarcode('54490000009ab'), { ok: false, reason: 'non-digits' })
  assert.deepEqual(validateBarcode('12345'), { ok: false, reason: 'length' })
})

// ═══ 2) تخزين OFF المؤقت — TTL 7 أيام نجاح / 24 ساعة غير موجود ═══════════════

const FOUND_BODY = {
  status: 1,
  product: {
    product_name: 'Test Oats',
    brands: 'Qimmah Test',
    serving_size: '40g',
    nutriments: { 'energy-kcal_100g': 380, proteins_100g: 13, carbohydrates_100g: 60, fat_100g: 7 },
  },
}

function makeDeps(responses: { found?: boolean; fail?: boolean }, clock: { t: number }) {
  let fetchCount = 0
  const deps: OffLookupDeps = {
    now: () => clock.t,
    fetchImpl: async (input: RequestInfo | URL) => {
      fetchCount += 1
      if (responses.fail) throw new Error('offline')
      assert.ok(String(input).startsWith('https://world.openfoodfacts.org/api/v2/product/'))
      const body = responses.found ? FOUND_BODY : { status: 0 }
      return { ok: true, json: async () => body } as Response
    },
  }
  return { deps, count: () => fetchCount }
}

function resetCache() {
  window.localStorage.removeItem(OFF_CACHE_KEY)
}

await check('نجاح البحث يُخزَّن — الطلب الثاني خلال ٧ أيام بلا شبكة', async () => {
  resetCache()
  const clock = { t: 1_000_000 }
  const net = makeDeps({ found: true }, clock)
  const first = await lookupBarcode('5449000000996', net.deps)
  assert.equal(first.status, 'found')
  clock.t += OFF_TTL_FOUND_MS - 60_000
  const second = await lookupBarcode('5449000000996', net.deps)
  assert.equal(second.status, 'found')
  assert.equal(net.count(), 1)
})

await check('بعد ٧ أيام تنتهي الصلاحية ويُعاد الجلب', async () => {
  resetCache()
  const clock = { t: 1_000_000 }
  const net = makeDeps({ found: true }, clock)
  await lookupBarcode('5449000000996', net.deps)
  clock.t += OFF_TTL_FOUND_MS + 60_000
  await lookupBarcode('5449000000996', net.deps)
  assert.equal(net.count(), 2)
})

await check('«غير موجود» يُخزَّن ٢٤ ساعة فقط ثم يُعاد السؤال', async () => {
  resetCache()
  const clock = { t: 1_000_000 }
  const net = makeDeps({ found: false }, clock)
  assert.equal((await lookupBarcode('96385074', net.deps)).status, 'not-found')
  clock.t += OFF_TTL_NOT_FOUND_MS - 60_000
  assert.equal((await lookupBarcode('96385074', net.deps)).status, 'not-found')
  assert.equal(net.count(), 1, 'داخل النافذة: لا طلب جديد')
  clock.t += 2 * 60_000
  await lookupBarcode('96385074', net.deps)
  assert.equal(net.count(), 2, 'بعد النافذة: طلب جديد')
})

await check('فشل الشبكة لا يُخزَّن أبدًا — المحاولة التالية تتصل من جديد', async () => {
  resetCache()
  const clock = { t: 1_000_000 }
  const offline = makeDeps({ fail: true }, clock)
  assert.equal((await lookupBarcode('5449000000996', offline.deps)).status, 'network-error')
  assert.equal((await lookupBarcode('5449000000996', offline.deps)).status, 'network-error')
  assert.equal(offline.count(), 2, 'كل محاولة تتصل — لا فشل مُخزَّن')
  assert.equal(window.localStorage.getItem(OFF_CACHE_KEY), null, 'لا كتابة للتخزين عند الفشل')
})

await check('منتج قديم منتهي الصلاحية يُعاد بصدق عند انقطاع الشبكة (أفضل من لا شيء)', async () => {
  resetCache()
  const clock = { t: 1_000_000 }
  const net = makeDeps({ found: true }, clock)
  await lookupBarcode('5449000000996', net.deps)
  clock.t += OFF_TTL_FOUND_MS + 60_000
  const offline = makeDeps({ fail: true }, clock)
  const stale = await lookupBarcode('5449000000996', offline.deps)
  assert.equal(stale.status, 'found')
})

// ═══ 3) هجرة التخزين القديم — آمنة ×2 ═══════════════════════════════════════

await check('هجرة ١: سجل قديم بلا fetchedAt يُعامل كمنتهي الصلاحية ويُعاد جلبه ثم يُكتب بالشكل الجديد', async () => {
  resetCache()
  const legacyProduct = {
    barcode: '5449000000996',
    name: 'Legacy',
    caloriesPer100g: 100,
    proteinPer100g: 1,
    carbsPer100g: 2,
    fatPer100g: 3,
  }
  window.localStorage.setItem(OFF_CACHE_KEY, JSON.stringify({ '5449000000996': { product: legacyProduct } }))
  const clock = { t: 5_000_000 }
  const net = makeDeps({ found: true }, clock)
  const result = await lookupBarcode('5449000000996', net.deps)
  assert.equal(result.status, 'found')
  assert.equal(net.count(), 1, 'السجل القديم لا يُوثق به — جلب جديد')
  const rewritten = JSON.parse(window.localStorage.getItem(OFF_CACHE_KEY) ?? '{}')
  assert.equal(rewritten['5449000000996'].fetchedAt, 5_000_000, 'أُعيدت الكتابة بطابع زمني صالح')
})

await check('هجرة ٢: تخزين تالف (JSON مكسور/قيم غير كائنات/طابع مستقبلي) لا يُسقط البحث', async () => {
  // JSON مكسور
  window.localStorage.setItem(OFF_CACHE_KEY, '{broken json!!!')
  const clock = { t: 5_000_000 }
  const net = makeDeps({ found: true }, clock)
  assert.equal((await lookupBarcode('5449000000996', net.deps)).status, 'found')
  // قيم غير كائنات + طابع زمني مستقبلي (خلل ساعة) — كلاهما يُعامل بأمان
  window.localStorage.setItem(
    OFF_CACHE_KEY,
    JSON.stringify({ junk: 42, future: { fetchedAt: clock.t + 10 * OFF_TTL_FOUND_MS, product: null } }),
  )
  const net2 = makeDeps({ found: false }, clock)
  assert.equal((await lookupBarcode('future', net2.deps)).status, 'not-found')
  assert.equal(net2.count(), 1, 'الطابع المستقبلي لا يُوثق به — جلب جديد')
})

// ═══ 4) الإدخال اليدوي — تحقّق قبل أي شبكة ═══════════════════════════════════

await check('lookupManualBarcode: إدخال غير صالح يُرفض محليًا بلا أي اتصال', async () => {
  resetCache()
  const clock = { t: 1_000_000 }
  const net = makeDeps({ found: true }, clock)
  const invalid = await lookupManualBarcode('123', net.deps)
  assert.deepEqual(invalid, { status: 'invalid', reason: 'length' })
  assert.equal(net.count(), 0, 'لا طلب شبكة لإدخال غير صالح')
  const valid = await lookupManualBarcode('٥٤٤٩٠٠٠٠٠٠٩٩٦', net.deps)
  assert.equal(valid.status, 'found')
  assert.equal(net.count(), 1)
})

// ═══ 5) scanOnce — واجهة موحّدة: أصلي/ويب، فلاش، إلغاء ═══════════════════════

const LABELS = { cancel: 'إلغاء', torch: 'الفلاش', hint: 'وجّه الكاميرا نحو الباركود' }

function fakePlugin(overrides: Partial<BarcodeScanPluginApi> = {}) {
  const calls: { setTorch: boolean[]; cancelled: number } = { setTorch: [], cancelled: 0 }
  const plugin: BarcodeScanPluginApi = {
    async isSupported() {
      return { supported: true }
    },
    async scanOnce(options) {
      assert.equal(options.cancel, 'إلغاء', 'تسميات ثنائية اللغة تمرّ للأصلي')
      return {
        hit: { value: '5449000000996', format: 'ean_13' },
        status: 'detected',
        resolution: { width: 1920, height: 1080 },
      }
    },
    async setTorch({ on }) {
      calls.setTorch.push(on)
      return { on }
    },
    async cancelScan() {
      calls.cancelled += 1
    },
    ...overrides,
  }
  return { plugin, calls }
}

await check('شكل الواجهة: scanOnce/isNativeScanPlatform دوال، والويب بلا فيديو يعيد null بأمان', async () => {
  assert.equal(typeof scanOnce, 'function')
  assert.equal(typeof isNativeScanPlatform, 'function')
  assert.equal(typeof startWebZxingScan, 'function')
  let outcome = ''
  const hit = await scanOnce({ labels: LABELS, forceNative: false, onOutcome: (s) => (outcome = s) })
  assert.equal(hit, null)
  assert.equal(outcome, 'error')
})

await check('المسار الأصلي: التقاط يعيد {value,format} ويسجّل التشخيص بلا قيمة الباركود', async () => {
  clearScanDiagnostics()
  const { plugin } = fakePlugin()
  let outcome = ''
  const hit = await scanOnce({ labels: LABELS, forceNative: true, plugin, onOutcome: (s) => (outcome = s) })
  assert.deepEqual(hit, { value: '5449000000996', format: 'ean_13' })
  assert.equal(outcome, 'detected')
  const [record] = getScanDiagnostics()
  assert.equal(record.engine, 'native-avfoundation')
  assert.equal(record.formatHit, 'ean_13')
  assert.deepEqual(record.resolution, { width: 1920, height: 1080 })
  assert.ok(!JSON.stringify(record).includes('5449000000996'), 'قيمة الباركود لا تدخل سجل التشخيص أبدًا')
})

await check('المسار الأصلي: إلغاء/رفض صلاحية يعيدان null بحالة دقيقة عبر onOutcome', async () => {
  const cancelled = fakePlugin({
    async scanOnce() {
      return { hit: null, status: 'cancelled' }
    },
  })
  let outcome = ''
  assert.equal(
    await scanOnce({ labels: LABELS, forceNative: true, plugin: cancelled.plugin, onOutcome: (s) => (outcome = s) }),
    null,
  )
  assert.equal(outcome, 'cancelled')

  const denied = fakePlugin({
    async scanOnce() {
      return { hit: null, status: 'permission-denied' }
    },
  })
  await scanOnce({ labels: LABELS, forceNative: true, plugin: denied.plugin, onOutcome: (s) => (outcome = s) })
  assert.equal(outcome, 'permission-denied')
})

await check('تمرير الفلاش والإلغاء عبر مقبض التحكّم الموحّد', async () => {
  const { plugin, calls } = fakePlugin()
  let controls: { setTorch(on: boolean): Promise<boolean>; cancel(): void } | null = null
  await scanOnce({ labels: LABELS, forceNative: true, plugin, onControls: (c) => (controls = c) })
  assert.ok(controls, 'onControls استُدعي')
  const applied = await controls!.setTorch(true)
  assert.equal(applied, true)
  assert.deepEqual(calls.setTorch, [true])
  controls!.cancel()
  await new Promise((r) => setTimeout(r, 0))
  assert.equal(calls.cancelled, 1)
})

await check('عطل غير متوقع في الإضافة الأصلية → null صادق، لا استثناء يتسرّب', async () => {
  const broken = fakePlugin({
    async scanOnce() {
      throw new Error('bridge exploded')
    },
  })
  let outcome = ''
  const hit = await scanOnce({ labels: LABELS, forceNative: true, plugin: broken.plugin, onOutcome: (s) => (outcome = s) })
  assert.equal(hit, null)
  assert.equal(outcome, 'error')
})

// ═══ 6) محرّك الويب — ثوابت ROI/الحلقة ضمن حدود سليمة ═══════════════════════

await check('ثوابت محرّك الويب: ROI جزئي، إطار كامل دوري، حلقة وسقف معقولان', () => {
  assert.ok(WEB_SCAN_ROI.widthFraction > 0 && WEB_SCAN_ROI.widthFraction <= 1)
  assert.ok(WEB_SCAN_ROI.heightFraction > 0 && WEB_SCAN_ROI.heightFraction < 1, 'ROI يقصّ فعليًا')
  assert.ok(FULL_FRAME_EVERY_N >= 2, 'الإطار الكامل شبكة أمان دورية لا الأساس')
  assert.ok(DECODE_INTERVAL_MS >= 30 && DECODE_INTERVAL_MS <= 500)
  assert.ok(MAX_DECODE_WIDTH >= 640)
})

// ═══ 7) التشخيص — بيانات وصفية فقط وبسعة محدودة ═══════════════════════════════

await check('سجل التشخيص: حقول وصفية فقط (لا قيمة باركود، لا بكسلات)', () => {
  clearScanDiagnostics()
  const handle = beginScanAttempt('zxing-web')
  handle.recordResolution(1920, 1080)
  handle.recordRoi(0.9, 0.55)
  handle.recordFrame()
  handle.recordFrame()
  const record = handle.end('detected', 'ean_13')
  const keys = Object.keys(record).sort()
  assert.deepEqual(keys, [
    'decodeLoopFps',
    'durationMs',
    'engine',
    'formatHit',
    'framesAnalyzed',
    'id',
    'notes',
    'outcome',
    'resolution',
    'roi',
    'startedAt',
  ])
  assert.equal(record.framesAnalyzed, 2)
  assert.ok(scanDiagnosticsSummary().includes('zxing-web'))
})

await check(`سعة التشخيص محدودة بآخر ${SCAN_DIAGNOSTICS_CAPACITY} محاولة — لا نموّ للذاكرة`, () => {
  clearScanDiagnostics()
  for (let i = 0; i < SCAN_DIAGNOSTICS_CAPACITY + 5; i++) {
    beginScanAttempt('zxing-web').end('cancelled')
  }
  assert.equal(getScanDiagnostics().length, SCAN_DIAGNOSTICS_CAPACITY)
})

console.log(`\nبرهان الباركود: ${passed} فحصًا نجحت كلها ✓`)
