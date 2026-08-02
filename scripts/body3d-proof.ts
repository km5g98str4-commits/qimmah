// ============================================================================
// إثبات محرّك المجسّم ثلاثي الأبعاد (P14) — تدقيق تقني.
//
// يغطّي: صحّة مخزن العمق مقابل مرجع مستقلّ، دقّة التقاط العضلة، ربط المعرّفات،
// استقلالية الحركة عن معدّل الإطارات، نظافة تخصيص الذاكرة، واشتقاق التكبير
// الداخلي من كثافة بكسل الجهاز. وينتهي بقياسات أداء قابلة للمقارنة قبل/بعد.
// ============================================================================

import { buildBodySpec } from '@/data/bodyModel3d'
import { buildBodyMesh, muscleAt, type BodyMesh } from '@/lib/body3d/mesh'
import { advanceGlide, pointerVelocity, REF_FPS } from '@/lib/body3d/motion'
import {
  BodyRenderer,
  rasterScaleFor,
  MAX_RASTER_SCALE,
  MIN_RASTER_SCALE,
  type Palette,
  type RenderOptions,
} from '@/lib/body3d/render'
import { ALL_MUSCLE_IDS } from '@/data/muscleGroups'
import type { MuscleId } from '@/types/muscles'

// --- سقالة الاختبار -------------------------------------------------------

declare const makeCtx: () => CanvasRenderingContext2D

let passed = 0
let failed = 0

function ok(label: string, cond: boolean, detail = ''): void {
  if (cond) {
    passed++
    console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`)
  } else {
    failed++
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

function info(label: string, value: string): void {
  console.log(`  · ${label}: ${value}`)
}

const PALETTE: Palette = {
  skin: { r: 226, g: 208, b: 184 },
  muscle: { r: 205, g: 178, b: 145 },
  heat: { r: 242, g: 106, b: 33 },
  garment: { r: 52, g: 62, b: 76 },
  shadow: 'rgba(0,0,0,0.42)',
  select: '#ffffff',
}

const heat: Partial<Record<MuscleId, number>> = {}
for (const id of ALL_MUSCLE_IDS) heat[id] = 0.5

const ctx = makeCtx()
const mesh: BodyMesh = buildBodyMesh(buildBodySpec('male', 'high'))
const renderer = new BodyRenderer(mesh)

const frame = (yaw: number, scale = 2): RenderOptions => ({
  yaw,
  pitch: -0.05,
  width: 300,
  height: 340,
  scale,
  heat,
  selected: null,
  pulse: 0,
  palette: PALETTE,
})

/** نافذة على المخازن الداخلية — التدقيق يحتاج رؤية ما لا تكشفه الواجهة. */
interface RasterPeek {
  depth: Float32Array
  mid: Int8Array
  width: number
  height: number
}
interface RendererPeek {
  raster: RasterPeek
  sx: Float32Array
  sy: Float32Array
  vz: Float32Array
}
const peek = renderer as unknown as RendererPeek
const FAR = -1e30

// --- ① ربط معرّفات العضلات ------------------------------------------------

console.log('\n① ربط معرّفات العضلات بالشبكة')
{
  ok(
    'عدد العضلات داخل سعة Int8Array',
    ALL_MUSCLE_IDS.length <= 127,
    `${ALL_MUSCLE_IDS.length}/127`,
  )
  ok('muscleAt يرفض الفهارس خارج المدى', muscleAt(-1) === null && muscleAt(ALL_MUSCLE_IDS.length) === null)
  ok('muscleAt يطابق ترتيب ALL_MUSCLE_IDS', ALL_MUSCLE_IDS.every((id, i) => muscleAt(i) === id))

  const seen = new Set<number>()
  for (let q = 0; q < mesh.quadCount; q++) if (mesh.quadMuscle[q] >= 0) seen.add(mesh.quadMuscle[q])
  const unmapped = [...seen].filter((i) => muscleAt(i) === null)
  ok('كل فهرس على الشبكة يُترجم لمعرّف صالح', unmapped.length === 0, `${seen.size} عضلة على السطح`)

  const missing = ALL_MUSCLE_IDS.filter((_, i) => !seen.has(i)).map((_, i) => ALL_MUSCLE_IDS[i])
  const absent = ALL_MUSCLE_IDS.filter((_, i) => !seen.has(i))
  ok(
    'كل عضلة في التصنيف ممثّلة على المجسّم',
    absent.length === 0,
    absent.length ? `غائبة: ${absent.join(', ')}` : `${ALL_MUSCLE_IDS.length} عضلة`,
  )
  void missing
}

// --- ② صحّة مخزن العمق مقابل مرجع مستقلّ ----------------------------------

console.log('\n② مخزن العمق (z-buffer) مقابل مرجع مستقلّ')
{
  renderer.render(ctx, frame(0.7))
  const ras = peek.raster
  const { sx, sy, vz } = peek
  const W = ras.width

  const tris: [number, number, number][] = []
  for (let q = 0; q < mesh.quadCount; q++) {
    const i0 = mesh.idx[q * 4]
    const i1 = mesh.idx[q * 4 + 1]
    const i2 = mesh.idx[q * 4 + 2]
    const i3 = mesh.idx[q * 4 + 3]
    tris.push([i0, i1, i2], [i0, i2, i3])
  }

  let checked = 0
  let mismatches = 0
  let worst = 0
  for (let s = 0; s < 20000 && checked < 500; s++) {
    const x = 3 + ((s * 7919) % (W - 6))
    const y = 3 + ((s * 104729) % (ras.height - 6))
    const i = y * W + x
    if (ras.depth[i] === FAR) continue
    checked++
    // مرجع مستقلّ: أكبر عمق بين كل المثلّثات الأمامية التي تغطّي البكسل.
    let best = -Infinity
    const px = x + 0.5
    const py = y + 0.5
    for (const [a, b, c] of tris) {
      const x0 = sx[a], y0 = sy[a], x1 = sx[b], y1 = sy[b], x2 = sx[c], y2 = sy[c]
      if ((x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0) >= -0.02) continue
      if ((px - x0) * (y1 - y0) + (py - y0) * (x0 - x1) < 0) continue
      if ((px - x1) * (y2 - y1) + (py - y1) * (x1 - x2) < 0) continue
      if ((px - x2) * (y0 - y2) + (py - y2) * (x2 - x0) < 0) continue
      const den = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
      if (den === 0) continue
      const l0 = ((y1 - y2) * (px - x2) + (x2 - x1) * (py - y2)) / den
      const l1 = ((y2 - y0) * (px - x2) + (x0 - x2) * (py - y2)) / den
      const z = l0 * vz[a] + l1 * vz[b] + (1 - l0 - l1) * vz[c]
      if (z > best) best = z
    }
    if (best === -Infinity) continue
    const d = Math.abs(best - ras.depth[i])
    if (d > worst) worst = d
    if (d > 0.05) mismatches++
  }
  ok('كل بكسل يحمل أقرب سطح فعلًا', mismatches === 0, `${checked} بكسل · أسوأ فارق ${worst.toFixed(5)} وحدة`)

  // خطأ الإقحام المستوي (غير المصحّح منظوريًا) يجب أن يبقى تحت عتبة الفصل.
  const CAM = 520
  let maxSpan = 0
  for (let q = 0; q < mesh.quadCount; q++) {
    let lo = Infinity
    let hi = -Infinity
    for (let k = 0; k < 4; k++) {
      const z = mesh.pos[mesh.idx[q * 4 + k] * 3 + 2]
      if (z < lo) lo = z
      if (z > hi) hi = z
    }
    if (hi - lo > maxSpan) maxSpan = hi - lo
  }
  const correct = CAM - 1 / ((1 / CAM + 1 / (CAM - maxSpan)) / 2)
  const err = Math.abs(maxSpan / 2 - correct)
  ok('خطأ الإقحام المسطّح مهمَل أمام عمق النموذج', err < 0.05, `${err.toFixed(4)} وحدة عند أعرض مثلّث (${maxSpan.toFixed(1)} وحدة)`)

  // مخزن العضلة لا يُكتب إلا حين ينجح اختبار العمق ⇒ لا التقاط لسطح محجوب.
  let midWithoutDepth = 0
  for (let i = 0; i < ras.width * ras.height; i++) {
    if (ras.mid[i] >= 0 && ras.depth[i] === FAR) midWithoutDepth++
  }
  ok('لا معرّف عضلة على بكسل غير مرسوم', midWithoutDepth === 0)
}

// --- ③ دقّة اختيار العضلة --------------------------------------------------

console.log('\n③ دقّة اختيار العضلة عند اللمس')
{
  renderer.render(ctx, frame(0))
  const ras = peek.raster
  const W = ras.width
  const H = ras.height
  const scale = 2
  const R = Math.max(1, Math.round(4 * scale))

  let total = 0
  let wrong = 0
  let falseNull = 0
  for (let y = 2; y < H - 2; y += 3) {
    for (let x = 2; x < W - 2; x += 3) {
      let bestD = Infinity
      let bestM = -1
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          const d = dx * dx + dy * dy
          if (d > R * R || d >= bestD) continue
          const xx = x + dx
          const yy = y + dy
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue
          const mi = ras.mid[yy * W + xx]
          if (mi >= 0) {
            bestD = d
            bestM = mi
          }
        }
      }
      if (bestM < 0) continue
      total++
      const got = renderer.pick(x / scale, y / scale, scale, 4)
      if (got === null) falseNull++
      else if (got !== muscleAt(bestM)) wrong++
    }
  }
  ok('النقرة تُرجع العضلة الأقرب فعلًا', wrong === 0, `${total} عيّنة · ${wrong} مخالفة`)
  ok('لا نقرة فارغة وعضلة داخل نصف قطر التسامح', falseNull === 0, `${falseNull} حالة`)

  // خارج الجسم تمامًا ⇒ لا اختيار.
  ok('النقر خارج الجسم لا يختار شيئًا', renderer.pick(1, 1, scale, 4) === null)
}

// --- ④ استقلالية الحركة عن معدّل الإطارات ---------------------------------

console.log('\n④ استقلالية الحركة عن معدّل الإطارات ومعدّل أحداث المؤشّر')
{
  const glideTotal = (fps: number): number => {
    const dt = 1 / fps
    let v = 0.05
    let yaw = 0
    for (let i = 0; i < fps * 4; i++) {
      const step = advanceGlide(v, dt)
      yaw += step.dYaw
      v = step.moving ? step.velocity : 0
      if (!step.moving) break
    }
    return yaw
  }
  const at60 = glideTotal(60)
  const at120 = glideTotal(120)
  const at90 = glideTotal(90)
  const drift = Math.abs(at120 - at60) / Math.abs(at60)
  info('مسافة الانزلاق', `٦٠هرتز ${at60.toFixed(4)} · ٩٠هرتز ${at90.toFixed(4)} · ١٢٠هرتز ${at120.toFixed(4)} راديان`)
  ok('الانزلاق متطابق بين ٦٠ و١٢٠هرتز', drift < 0.005, `انحراف ${(drift * 100).toFixed(2)}٪`)

  // قوّة القذف: نفس الحركة الفيزيائية موزّعة على أحداث بمعدّلين مختلفين.
  const flick60 = pointerVelocity(0.011 * 10, 1000 / 60)
  const flick120 = pointerVelocity(0.011 * 5, 1000 / 120)
  const flickDrift = Math.abs(flick120 - flick60) / flick60
  ok('قوّة القذف لا تتأثّر بمعدّل أحداث المؤشّر', flickDrift < 0.01, `انحراف ${(flickDrift * 100).toFixed(2)}٪`)
  ok('الإطار المرجعي ٦٠هرتز', REF_FPS === 60)
  ok('حدث أوّل بلا زمن سابق يُعامل كإطار مرجعي', pointerVelocity(0.1, 0) === 0.1)
}

// --- ⑤ نظافة الذاكرة في المسار الساخن -------------------------------------

console.log('\n⑤ نظافة الذاكرة أثناء الدوران')
{
  renderer.render(ctx, frame(0, 2))
  const bufHigh = peek.raster.depth.buffer
  renderer.render(ctx, frame(0.1, 1.4))
  const bufLow = peek.raster.depth.buffer
  renderer.render(ctx, frame(0.2, 2))
  const bufBack = peek.raster.depth.buffer
  ok(
    'تبديل دقّة السحب لا يُعيد تخصيص المخازن',
    bufHigh === bufLow && bufLow === bufBack,
    'سعة محفوظة تنمو ولا تتقلّص',
  )

  // ألوان الأساس تُعاد فقط عند تغيّر فعلي — لا عمل ولا قمامة في الإطار الثابت.
  interface ColorPeek { baseValid: boolean }
  const cp = renderer as unknown as ColorPeek
  renderer.render(ctx, frame(0.3))
  ok('ذاكرة ألوان الأساس صالحة بعد الرسم', cp.baseValid)
  renderer.invalidateColors()
  ok('تبديل السمة يُبطل ذاكرة الألوان', !cp.baseValid)
  renderer.render(ctx, frame(0.4))
  ok('الرسم يعيد بناء الألوان بعد الإبطال', cp.baseValid)
}

// --- ⑥ التكبير الداخلي مقابل كثافة بكسل الجهاز ----------------------------

console.log('\n⑥ اشتقاق التكبير الداخلي من كثافة بكسل الجهاز')
{
  ok('شاشة 1× تنزل لأرضية التنعيم', rasterScaleFor(1) === MIN_RASTER_SCALE, `${rasterScaleFor(1)}×`)
  ok('شاشة 2× تُرسم أصليًا', rasterScaleFor(2) === 2)
  ok('شاشة 3× محصورة بالسقف', rasterScaleFor(3) === MAX_RASTER_SCALE, `${rasterScaleFor(3)}×`)
  ok('قيمة غير صالحة تسقط للسقف الآمن', rasterScaleFor(Number.NaN) === MAX_RASTER_SCALE && rasterScaleFor(0) === MAX_RASTER_SCALE)
  const saved = 1 - (MIN_RASTER_SCALE * MIN_RASTER_SCALE) / (MAX_RASTER_SCALE * MAX_RASTER_SCALE)
  info('توفير البكسلات على شاشة 1×', `${Math.round(saved * 100)}٪`)
}

// --- ⑦ قياسات الأداء ------------------------------------------------------

console.log('\n⑦ قياسات الأداء')
{
  for (const quality of ['high', 'low'] as const) {
    const t0 = performance.now()
    const m = buildBodyMesh(buildBodySpec('male', quality))
    const ms = performance.now() - t0
    info(`بناء الشبكة (${quality})`, `${ms.toFixed(1)}م.ث · ${m.vertCount} رأس · ${m.quadCount} وجه`)
  }

  const bench = (scale: number): number => {
    for (let i = 0; i < 15; i++) renderer.render(ctx, frame(i * 0.1, scale))
    const N = 150
    const t0 = performance.now()
    for (let i = 0; i < N; i++) renderer.render(ctx, frame(i * 0.05, scale))
    return (performance.now() - t0) / N
  }
  const idle = bench(MAX_RASTER_SCALE)
  const drag = bench(MAX_RASTER_SCALE * 0.7)
  const low = bench(MIN_RASTER_SCALE)
  info('زمن الإطار @2.0× (استقرار)', `${idle.toFixed(2)}م.ث · ${Math.round(300 * 2)}×${Math.round(340 * 2)}`)
  info('زمن الإطار @1.4× (سحب)', `${drag.toFixed(2)}م.ث`)
  info('زمن الإطار @1.5× (شاشة 1×)', `${low.toFixed(2)}م.ث`)
  ok('الإطار ضمن ميزانية ٦٠ إطارًا (١٦٫٧م.ث)', idle < 16.7, `${idle.toFixed(2)}م.ث`)
}

// --- الخلاصة --------------------------------------------------------------

console.log('\n' + '─'.repeat(48))
if (failed === 0) {
  console.log(`✅ كل فحوص محرّك المجسّم نجحت — ${passed} فحصًا.`)
} else {
  console.log(`❌ فشل ${failed} من ${passed + failed} فحصًا.`)
  process.exitCode = 1
}
