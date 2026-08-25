// ============================================================================
// محرّك الرسم — يُسقط شبكة الجسم ثلاثية الأبعاد ويرسمها بتظليل Gouraud
// عبر راستَرايزر برمجي بمخزن عمق (raster.ts).
//
// خط الأنابيب لكل إطار:
//   1) تدوير الرؤوس (yaw حول Y ثم pitch حول X) وإسقاطها منظوريًا.
//   2) حساب لون كل رأس: (لون العضلة/الجلد/اللباس) × (إضاءة Lambert + حافة ضوئية).
//   3) رسم مثلّثين لكل وجه مع إقحام اللون والعمق بكسلًا بكسل.
//   4) تنعيم حواف الظِلّ الخارجي ثم نقل المخزن إلى الـcanvas.
//
// ألوان الأساس لكل رأس تُحسب مرّة عند تغيّر التغطية أو اللوحة اللونية فقط.
// ============================================================================

import type { MuscleId } from '@/types/muscles'
import { ALL_MUSCLE_IDS } from '@/data/muscleGroups'
import { clamp, mulMM, rotX, rotY, type Mat3 } from './math'
import { muscleAt, type BodyMesh } from './mesh'
import { SoftRaster } from './raster'

export interface RGB {
  r: number
  g: number
  b: number
}

export interface Palette {
  /** لون الجسم الأساسي. */
  skin: RGB
  /** لون نسيج العضلة (غير مُدرَّبة) — أغمق قليلًا من الجلد. */
  muscle: RGB
  /** لون العضلة المُدرَّبة (لون العلامة). */
  heat: RGB
  /** لون اللباس الرياضي. */
  garment: RGB
  /** لون ظل الأرضية (rgba جاهز). */
  shadow: string
  /** لون توهّج العضلة المختارة. */
  select: string
}

export interface RenderOptions {
  /** الدوران الأفقي بالراديان (0 = مواجه). */
  yaw: number
  /** الميلان الرأسي بالراديان. */
  pitch: number
  /** أبعاد العرض بالبكسل المنطقي (CSS). */
  width: number
  height: number
  /** معامل التكبير الداخلي (بكسلات المخزن لكل بكسل CSS). */
  scale: number
  /** شدّة الإضاءة لكل عضلة 0..1 (غياب المفتاح = غير مُدرَّبة). */
  heat: Partial<Record<MuscleId, number>>
  selected: MuscleId | null
  /** نبضة التحديد 0..1 — للتوهّج المتحرّك. */
  pulse: number
  palette: Palette
}

// إضاءة ناعمة: ضوء رئيسي علوي أمامي-يسار + ضوء ملء مقابل + حافة ضوئية.
const KEY_LIGHT = { x: -0.4, y: 0.46, z: 0.79 }
const FILL_LIGHT = { x: 0.66, y: -0.1, z: 0.34 }
// [مهمة المنتج] عُمّق تباين الشكل: محيطية أقل + مفتاح أقوى + حافة أوضح —
// الشكل ثلاثي الأبعاد يُقرأ من تدرّج الإضاءة لا من الخطوط.
const AMBIENT = 0.3
const KEY_STRENGTH = 0.85
const FILL_STRENGTH = 0.17
const RIM_STRENGTH = 0.5

/** مسافة الكاميرا بوحدات النموذج — تتحكّم بقوة المنظور. */
const CAMERA_DISTANCE = 520

// ---------------------------------------------------------------------------
// التكبير الداخلي مقابل كثافة بكسل الجهاز
// ---------------------------------------------------------------------------

/**
 * سقف التكبير الداخلي. الكلفة تتناسب مع مربّع المعامل: 3× تكلّف ٢٫٢٥ ضعف 2×،
 * بينما الفرق البصري بعد تنعيم الحواف غير محسوس على شاشة جوال — فنقف عند 2×.
 */
export const MAX_RASTER_SCALE = 2
/**
 * أرضية التكبير. على شاشة بكثافة 1× يبقى 1.5× تنعيمًا فوق-عيّنيًا حقيقيًا
 * (٤٤٪ بكسلات أقل من 2× بلا خسارة محسوسة).
 */
export const MIN_RASTER_SCALE = 1.5

/**
 * يشتقّ معامل التكبير الداخلي من كثافة بكسل الجهاز.
 * كان المعامل ثابتًا 2× بلا قراءة `devicePixelRatio` إطلاقًا، فكان يهدر البكسلات
 * على الشاشات العادية ولا يستفيد من شيء على شاشات 3×.
 */
export function rasterScaleFor(dpr: number): number {
  if (!Number.isFinite(dpr) || dpr <= 0) return MAX_RASTER_SCALE
  return clamp(dpr, MIN_RASTER_SCALE, MAX_RASTER_SCALE)
}

export class BodyRenderer {
  private mesh: BodyMesh
  private raster = new SoftRaster()
  /** إحداثيات الشاشة والعمق لكل رأس. */
  private sx = new Float32Array(0)
  private sy = new Float32Array(0)
  private vz = new Float32Array(0)
  /** اللون النهائي لكل رأس بعد الإضاءة. */
  private cr = new Float32Array(0)
  private cg = new Float32Array(0)
  private cb = new Float32Array(0)
  /** لون الأساس لكل رأس قبل الإضاءة (يُعاد حسابه عند تغيّر التغطية). */
  private br = new Float32Array(0)
  private bg = new Float32Array(0)
  private bb = new Float32Array(0)
  /** آخر شدّات حرارة استُخدمت في حساب ألوان الأساس — للمقارنة بلا تخصيص ذاكرة. */
  private heatCache = new Float32Array(ALL_MUSCLE_IDS.length)
  private paletteCache = -1
  private baseValid = false
  private centerY = 0

  constructor(mesh: BodyMesh) {
    this.mesh = mesh
    this.allocate()
  }

  /** يستبدل الشبكة (عند تغيّر الجنس أو الدقّة). */
  setMesh(mesh: BodyMesh): void {
    this.mesh = mesh
    this.allocate()
  }

  /** يُبطل ذاكرة ألوان الأساس — يُستدعى عند تبديل السمة (تتغيّر لوحة الهوية). */
  invalidateColors(): void {
    this.baseValid = false
  }

  private allocate(): void {
    const n = this.mesh.vertCount
    this.sx = new Float32Array(n)
    this.sy = new Float32Array(n)
    this.vz = new Float32Array(n)
    this.cr = new Float32Array(n)
    this.cg = new Float32Array(n)
    this.cb = new Float32Array(n)
    this.br = new Float32Array(n)
    this.bg = new Float32Array(n)
    this.bb = new Float32Array(n)
    this.baseValid = false
    this.centerY = (this.mesh.bounds.minY + this.mesh.bounds.maxY) / 2
  }

  /**
   * يحسب لون الأساس لكل رأس: جلد ← نسيج عضلة ← لون التدريب، ثم اللباس فوقها،
   * مع تغميق خفيف عند حدود العضلات (خطوط الفصل).
   */
  private updateBaseColors(o: RenderOptions): void {
    const m = this.mesh
    const pal = o.palette
    // كشف التغيّر بلا تخصيص ذاكرة: كان هذا السطر يبني نصًّا عبر JSON.stringify
    // في كل إطار — قمامة دورية في المسار الساخن رغم أن الملف يَعِد بصفر تخصيص.
    const palKey = (pal.heat.r << 16) | (pal.heat.g << 8) | pal.heat.b
    let changed = !this.baseValid || palKey !== this.paletteCache
    for (let k = 0; k < ALL_MUSCLE_IDS.length; k++) {
      const hv = o.heat[ALL_MUSCLE_IDS[k]] ?? 0
      if (hv !== this.heatCache[k]) {
        this.heatCache[k] = hv
        changed = true
      }
    }
    if (!changed) return
    this.paletteCache = palKey
    this.baseValid = true

    for (let i = 0; i < m.vertCount; i++) {
      const inf = m.vertInf[i] / 255
      const mi = m.vertMuscle[i]
      const mid = mi >= 0 ? muscleAt(mi) : null
      const hv = mid ? (o.heat[mid] ?? 0) : 0

      let r = pal.skin.r
      let g = pal.skin.g
      let b = pal.skin.b
      if (inf > 0) {
        const t = inf * 0.55
        r += (pal.muscle.r - r) * t
        g += (pal.muscle.g - g) * t
        b += (pal.muscle.b - b) * t
        if (hv > 0) {
          const h = clamp(hv * inf * 1.2, 0, 1)
          r += (pal.heat.r - r) * h
          g += (pal.heat.g - g) * h
          b += (pal.heat.b - b) * h
        }
      }

      // اللباس الرياضي: القماش يغلب وتظهر الحرارة من خلاله بشدّة مخفّضة.
      if (m.vertMat[i] === 1) {
        r += (pal.garment.r - r) * 0.7
        g += (pal.garment.g - g) * 0.7
        b += (pal.garment.b - b) * 0.7
      }

      // خطوط الفصل العضلي — تغميق لطيف عند حدود الحقول.
      const edge = m.vertEdge[i] / 255
      if (edge > 0) {
        const k = 1 - edge * 0.16
        r *= k
        g *= k
        b *= k
      }

      this.br[i] = r
      this.bg[i] = g
      this.bb[i] = b
    }
  }

  /** يرسم إطارًا كاملًا. */
  render(ctx: CanvasRenderingContext2D, o: RenderOptions): void {
    const m = this.mesh
    const S = o.scale
    const W = Math.max(1, Math.round(o.width * S))
    const H = Math.max(1, Math.round(o.height * S))
    this.raster.resize(W, H)
    this.raster.clear()

    this.updateBaseColors(o)

    const rot: Mat3 = mulMM(rotX(o.pitch), rotY(o.yaw))
    const [a0, a1, a2, a3, a4, a5, a6, a7, a8] = rot

    const modelH = m.bounds.maxY - m.bounds.minY || 1
    const zoom = (H * 0.9) / modelH
    const halfW = W / 2
    const halfH = H / 2
    const cy = this.centerY

    const selected = o.selected
    const selIndex = selected ? m.vertMuscle : null

    // --- إسقاط الرؤوس + إضاءتها ---
    const pos = m.pos
    const nrm = m.nrm
    for (let i = 0; i < m.vertCount; i++) {
      const i3 = i * 3
      const px = pos[i3]
      const py = pos[i3 + 1] - cy
      const pz = pos[i3 + 2]
      const x = a0 * px + a1 * py + a2 * pz
      const y = a3 * px + a4 * py + a5 * pz
      const z = a6 * px + a7 * py + a8 * pz
      const k = (CAMERA_DISTANCE / (CAMERA_DISTANCE - z)) * zoom
      this.sx[i] = halfW + x * k
      this.sy[i] = halfH - y * k
      this.vz[i] = z

      const nx0 = nrm[i3]
      const ny0 = nrm[i3 + 1]
      const nz0 = nrm[i3 + 2]
      const nx = a0 * nx0 + a1 * ny0 + a2 * nz0
      const ny = a3 * nx0 + a4 * ny0 + a5 * nz0
      const nz = a6 * nx0 + a7 * ny0 + a8 * nz0

      const kd = nx * KEY_LIGHT.x + ny * KEY_LIGHT.y + nz * KEY_LIGHT.z
      const fd = nx * FILL_LIGHT.x + ny * FILL_LIGHT.y + nz * FILL_LIGHT.z
      const shade = AMBIENT + (kd > 0 ? kd * KEY_STRENGTH : 0) + (fd > 0 ? fd * FILL_STRENGTH : 0)
      // ملاحظة: nz قد يتجاوز 1 بخطأ فاصلة عائمة، وأي أساس سالب في pow يعطي NaN
      // فيتحوّل لون الرأس إلى أسود — لذلك نحصر الأساس صراحةً.
      const facing = nz > 1 ? 1 : nz > 0 ? nz : 0
      const rim = (1 - facing) ** 3.6 * RIM_STRENGTH

      let boost = 0
      if (selIndex && selected && muscleAt(selIndex[i]) === selected && m.vertInf[i] > 36) {
        boost = (0.16 + o.pulse * 0.28) * (m.vertInf[i] / 255)
      }

      this.cr[i] = clamp(this.br[i] * shade + rim * 226 + boost * 255, 0, 255)
      this.cg[i] = clamp(this.bg[i] * shade + rim * 214 + boost * 186, 0, 255)
      this.cb[i] = clamp(this.bb[i] * shade + rim * 198 + boost * 118, 0, 255)
    }

    // --- رسم المثلّثات (وجهان لكل رباعي) ---
    const idx = m.idx
    const raster = this.raster
    for (let q = 0; q < m.quadCount; q++) {
      const q4 = q * 4
      const i0 = idx[q4]
      const i1 = idx[q4 + 1]
      const i2 = idx[q4 + 2]
      const i3 = idx[q4 + 3]
      const mu = m.quadInf[q] > 36 ? m.quadMuscle[q] : -1
      raster.triangle(
        this.sx[i0], this.sy[i0], this.vz[i0], this.cr[i0], this.cg[i0], this.cb[i0],
        this.sx[i1], this.sy[i1], this.vz[i1], this.cr[i1], this.cg[i1], this.cb[i1],
        this.sx[i2], this.sy[i2], this.vz[i2], this.cr[i2], this.cg[i2], this.cb[i2],
        mu,
      )
      raster.triangle(
        this.sx[i0], this.sy[i0], this.vz[i0], this.cr[i0], this.cg[i0], this.cb[i0],
        this.sx[i2], this.sy[i2], this.vz[i2], this.cr[i2], this.cg[i2], this.cb[i2],
        this.sx[i3], this.sy[i3], this.vz[i3], this.cr[i3], this.cg[i3], this.cb[i3],
        mu,
      )
    }

    raster.antialiasEdges(raster.bbMinX - 1, raster.bbMinY - 1, raster.bbMaxX + 1, raster.bbMaxY + 1)

    // --- النقل إلى الشاشة ثم إضافة ظل الأرضية خلف الجسم ---
    // putImageData يستبدل كل بكسلات الإطار (بما فيها ألفا) ولا يمزج، وأبعاده
    // هي أبعاد الـcanvas كاملة — فلا حاجة لـclearRect قبله.
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    raster.blit(ctx)

    const groundY = halfH - (m.bounds.minY - cy) * zoom
    const shadowW = m.bounds.maxR * 2.7 * zoom
    ctx.save()
    ctx.globalCompositeOperation = 'destination-over'
    ctx.translate(halfW, groundY)
    ctx.scale(1, 0.17)
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, shadowW / 2)
    grad.addColorStop(0, o.palette.shadow)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(0, 0, shadowW / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  /**
   * يُعيد العضلة الظاهرة عند نقطة (بإحداثيات CSS)، أو null.
   *
   * يمسح قرصًا كاملًا حول نقطة اللمس ويختار **الأقرب فعليًا**. النسخة السابقة
   * كانت تمسح شبكة متفرّقة (dx,dy ∈ {−r,0,r} لـ r ∈ {0,2,4,7}) وتُرجع أوّل ما
   * تجده بترتيب المسح، فكانت تُحابي الجهة العليا-اليسرى وتُخطئ العضلة الأقرب،
   * بل وتُرجع null أحيانًا وعضلةٌ على بُعد ٣ بكسلات لأن النمط لا يمرّ عليها.
   *
   * @param radiusCss نصف قطر التسامح بالبكسل المنطقي (CSS).
   */
  pick(x: number, y: number, scale: number, radiusCss = 4): MuscleId | null {
    const px = Math.round(x * scale)
    const py = Math.round(y * scale)
    const r = Math.max(1, Math.round(radiusCss * scale))
    const r2 = r * r
    let bestD = Infinity
    let best = -1
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const d = dx * dx + dy * dy
        if (d > r2 || d >= bestD) continue
        const mi = this.raster.muscleAtPixel(px + dx, py + dy)
        if (mi >= 0) {
          bestD = d
          best = mi
        }
      }
    }
    return best >= 0 ? muscleAt(best) : null
  }
}
