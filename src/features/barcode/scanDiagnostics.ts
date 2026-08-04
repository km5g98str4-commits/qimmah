// تشخيص مسح الباركود — بيانات وصفية فقط (أرقام ونصوص قصيرة). لا يلمس هذا الملف أي إطار
// كاميرا أو بكسلات إطلاقًا: لا ImageData ولا canvas ولا صور — ضمانة خصوصية مُختبرة (test:barcode).
// الهدف: قياس «لماذا لا يُقرأ الباركود على iPhone» بأرقام حقيقية على الجهاز
// (مدة المحاولة، الدقة المختارة، معدل حلقة الفك FPS، الصيغة الملتقطة) — راجع docs/data/NATIVE-BARCODE.md.

/** محرّك المسح الذي نفّذ المحاولة — للمقارنة الصادقة ويب/أصلي في دليل اختبار الجهاز. */
export type ScanEngineId = 'zxing-web' | 'native-avfoundation'

/** المسار المختصر — 'native' للمسار الأصلي، 'web' لاحتياط zxing (تقرير الجهاز). */
export type ScanPath = 'native' | 'web'

/**
 * نتيجة المحاولة. P14: أُضيفت 'permission-denied' و'no-camera' — قبلها كان رفض
 * الصلاحية يُسجَّل 'error' فيتعذّر تمييزه عن عطل حقيقي في تقرير الجهاز.
 */
export type ScanOutcome = 'running' | 'detected' | 'cancelled' | 'permission-denied' | 'no-camera' | 'error'

export function scanPathOf(engine: ScanEngineId): ScanPath {
  return engine === 'native-avfoundation' ? 'native' : 'web'
}

/** سجل محاولة واحدة — كل الحقول بيانات وصفية أولية (لا بكسلات، لا قيمة الباركود نفسها). */
export interface ScanAttemptRecord {
  id: number
  engine: ScanEngineId
  /** المسار المشتق من المحرّك — 'native' | 'web'. */
  path: ScanPath
  /** ISO — وقت بدء المحاولة. */
  startedAt: string
  /** null أثناء التشغيل. */
  durationMs: number | null
  /** دقة الإطار الفعلية التي اختارها المتصفح/النظام (قد تختلف عن المطلوبة). */
  resolution: { width: number; height: number } | null
  /** منطقة الاهتمام المقصوصة قبل الفك — نسب من الإطار الكامل. null = فك الإطار كاملًا. */
  roi: { widthFraction: number; heightFraction: number } | null
  /** عدد الإطارات التي مرّت على حلقة الفك (ويب فقط — الأصلي يفك داخل النظام). */
  framesAnalyzed: number
  /** معدل محاولات الفك بالثانية — يُحسب عند نهاية المحاولة. */
  decodeLoopFps: number | null
  /** صيغة الباركود الملتقطة (ean_13...) — الصيغة فقط، لا القيمة. المرادف: symbology. */
  formatHit: string | null
  /** هل استُخدم الفلاش في هذه المحاولة؟ (بيان وصفي — يفسّر الفشل في الإضاءة الضعيفة). */
  torch: boolean
  outcome: ScanOutcome
  /** ملاحظات وصفية قصيرة: قيود متقدمة مطبَّقة (focus:continuous، zoom:1.5)، أخطاء فك... */
  notes: string[]
}

/** مقبض محاولة جارية — تكتب فيه المحرّكات أرقامها ثم تُنهيه بنتيجة. */
export interface ScanAttemptHandle {
  recordResolution(width: number, height: number): void
  recordRoi(widthFraction: number, heightFraction: number): void
  /** تُستدعى مرة لكل تكرار في حلقة الفك — أساس حساب FPS. */
  recordFrame(): void
  /** يسجّل أن الفلاش شُغّل (لا يُلغى بالإطفاء — «استُخدم» حقيقة عن المحاولة). */
  recordTorch(on: boolean): void
  note(text: string): void
  end(outcome: Exclude<ScanOutcome, 'running'>, formatHit?: string | null): ScanAttemptRecord
}

/** آخر N محاولات فقط — يمنع نموّ الذاكرة في جلسات المسح الطويلة. */
export const SCAN_DIAGNOSTICS_CAPACITY = 20

const attempts: ScanAttemptRecord[] = []
let nextId = 1

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

export function beginScanAttempt(engine: ScanEngineId): ScanAttemptHandle {
  const record: ScanAttemptRecord = {
    id: nextId++,
    engine,
    path: scanPathOf(engine),
    startedAt: new Date().toISOString(),
    durationMs: null,
    resolution: null,
    roi: null,
    framesAnalyzed: 0,
    decodeLoopFps: null,
    formatHit: null,
    torch: false,
    outcome: 'running',
    notes: [],
  }
  attempts.push(record)
  if (attempts.length > SCAN_DIAGNOSTICS_CAPACITY) attempts.splice(0, attempts.length - SCAN_DIAGNOSTICS_CAPACITY)

  const startedClock = nowMs()
  let ended = false

  return {
    recordResolution(width, height) {
      record.resolution = { width: Math.round(width), height: Math.round(height) }
    },
    recordRoi(widthFraction, heightFraction) {
      record.roi = { widthFraction, heightFraction }
    },
    recordFrame() {
      record.framesAnalyzed += 1
    },
    recordTorch(on) {
      if (on) record.torch = true
    },
    note(text) {
      // نصوص قصيرة وصفية فقط — قصّ دفاعي حتى لا يتسرّب محتوى كبير إلى السجل.
      if (record.notes.length < 20) record.notes.push(String(text).slice(0, 120))
    },
    end(outcome, formatHit = null) {
      if (ended) return record
      ended = true
      const duration = Math.max(0, nowMs() - startedClock)
      record.durationMs = Math.round(duration)
      record.outcome = outcome
      record.formatHit = formatHit
      if (record.framesAnalyzed > 0 && duration > 0) {
        record.decodeLoopFps = Math.round((record.framesAnalyzed / (duration / 1000)) * 10) / 10
      }
      return record
    },
  }
}

/** نسخة للقراءة من سجل المحاولات — للأدوات وسطر أوامر Web Inspector على الجهاز. */
export function getScanDiagnostics(): ScanAttemptRecord[] {
  return attempts.map((a) => ({ ...a, resolution: a.resolution && { ...a.resolution }, roi: a.roi && { ...a.roi }, notes: [...a.notes] }))
}

export function clearScanDiagnostics(): void {
  attempts.length = 0
}

/** ملخّص نصي مضغوط — سطر لكل محاولة، جاهز للنسخ من كونسول Safari أثناء اختبار الجهاز. */
export function scanDiagnosticsSummary(): string {
  if (attempts.length === 0) return '(no scan attempts recorded)'
  return attempts
    .map((a) => {
      const res = a.resolution ? `${a.resolution.width}x${a.resolution.height}` : '—'
      const roi = a.roi ? `${Math.round(a.roi.widthFraction * 100)}%x${Math.round(a.roi.heightFraction * 100)}%` : 'full'
      const fps = a.decodeLoopFps ?? '—'
      const dur = a.durationMs ?? '…'
      return `#${a.id} ${a.path}(${a.engine}) ${a.outcome} dur=${dur}ms res=${res} roi=${roi} frames=${a.framesAnalyzed} fps=${fps} symbology=${a.formatHit ?? '—'} torch=${a.torch ? 'on' : 'off'}${a.notes.length ? ' | ' + a.notes.join('; ') : ''}`
    })
    .join('\n')
}

// كشف للقراءة فقط على window — يتيح قراءة القياسات من Safari Web Inspector على جهاز حقيقي
// دون أي واجهة داخل التطبيق: window.__QIMMAH_SCAN_DIAG__.summary()
declare global {
  interface Window {
    __QIMMAH_SCAN_DIAG__?: {
      get: typeof getScanDiagnostics
      summary: typeof scanDiagnosticsSummary
      clear: typeof clearScanDiagnostics
    }
  }
}

if (typeof window !== 'undefined') {
  window.__QIMMAH_SCAN_DIAG__ = { get: getScanDiagnostics, summary: scanDiagnosticsSummary, clear: clearScanDiagnostics }
}
