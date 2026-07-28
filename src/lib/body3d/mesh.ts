// ============================================================================
// باني الشبكة (Mesh) — يحوّل تعريف الجسم التشريحي إلى مصفوفات رؤوس وأوجه.
//
// الفكرة: كل جزء من الجسم = «أسطوانة معمّمة» (generalized cylinder):
// سلسلة مقاطع عرضية (cross-sections) على محور محلي +Y، كل مقطع له نصف عرض
// ونصف عمق وأُسّ superellipse يتحكّم بمدى «تربيع» المقطع (الجذع ليس بيضاويًا).
// بربط المقاطع المتتالية نحصل على أوجه رباعية.
//
// العضلات ليست أشكالًا منفصلة بل «حقول تأثير» على سطح الجسم في فضاء (u,v):
//   u = الموضع الزاوي حول المقطع (0 = وسط الأمام، 0.5 = وسط الخلف)
//   v = الموضع الطولي على الجزء (0 = البداية، 1 = النهاية)
// هذا يجعل العضلة تلتفّ مع الجسم وتُحجب طبيعيًا عند الدوران، ويعطي انتفاخًا
// حقيقيًا في الشبكة (إزاحة الرؤوس على اتجاه العرف) فيبدو الجسم عضليًا لا أملس.
//
// لا اعتماديات خارجية. لا عظام — سطح عضلي/جلدي فقط.
// ============================================================================

import type { MuscleId } from '@/types/muscles'
import { ALL_MUSCLE_IDS } from '@/data/muscleGroups'
import {
  clamp,
  cross,
  frameFromDir,
  IDENTITY,
  mulMV,
  normalize,
  sub,
  v3,
  wrapDist,
  type Mat3,
  type Vec3,
} from './math'

// ---------------------------------------------------------------------------
// أنواع التعريف
// ---------------------------------------------------------------------------

/** مقطع عرضي واحد على المحور المحلي +Y. */
export interface Section {
  /** الموضع على المحور المحلي. */
  y: number
  /** نصف العرض (المحور المحلي X). */
  rx: number
  /** نصف العمق (المحور المحلي Z). */
  rz: number
  /** أُسّ الـsuperellipse: 2 = بيضاوي، >2 = أقرب للمستطيل المستدير. */
  n?: number
  /** إزاحة مركز المقطع أفقيًا (محلي X). */
  ox?: number
  /** إزاحة مركز المقطع عمقًا (محلي Z) — لانحناءات مثل السمانة والعمود. */
  oz?: number
  /** معامل ضرب عمق النصف الخلفي (لتسطيح الظهر أو تعميقه). */
  back?: number
}

/** تعريف جزء من الجسم. */
export interface SegmentSpec {
  id: string
  /** دقّة المقطع (عدد النقاط حول المحيط). */
  radial: number
  /** عدد مرّات تنعيم المقاطع طوليًا (كل مرّة تُضاعف الصفوف) — 0 = بلا تنعيم. */
  subdiv?: number
  sections: Section[]
  /** موضع أصل الجزء في فضاء النموذج. */
  origin: Vec3
  /** اتجاه المحور المحلي +Y في فضاء النموذج (افتراضيًا لأعلى). */
  dir?: Vec3
  /** إغلاق النهاية العليا/السفلى بقبّة. */
  capTop?: boolean
  capBottom?: boolean
  /** يُنسخ الجزء معكوسًا على المحور X (للأطراف اليمنى/اليسرى). */
  mirror?: boolean
}

/** حقل تأثير عضلة على سطح جزء. */
export interface MusclePatch {
  m: MuscleId
  /** معرّف الجزء الذي تقع عليه. */
  seg: string
  /** مركز الحقل زاويًا (0 = أمام، 0.25 = جانب، 0.5 = خلف). */
  u: number
  /** مركز الحقل طوليًا (0..1). */
  v: number
  /** نصف الامتداد الزاوي. */
  ru: number
  /** نصف الامتداد الطولي. */
  rv: number
  /** ارتفاع الانتفاخ عند المركز (وحدات النموذج) — يمنح الجسم نحتًا عضليًا. */
  bulge?: number
  /** حدّة التلاشي عند الحواف (أكبر = حافة أوضح). */
  sharp?: number
}

/** منطقة يغطّيها اللباس الرياضي. */
export interface GarmentBand {
  seg: string
  /** نطاق v المغطّى. */
  v0: number
  v1: number
  /** نطاق u المغطّى (افتراضيًا المحيط كامل). */
  u0?: number
  u1?: number
  /** إزاحة القماش للخارج (يعطي حافة واضحة للثوب). */
  lift?: number
}

/** التعريف الكامل لجسم واحد. */
export interface BodySpec {
  segments: SegmentSpec[]
  muscles: MusclePatch[]
  garments: GarmentBand[]
}

// ---------------------------------------------------------------------------
// الشبكة الناتجة — مصفوفات مسطّحة لأداء عالٍ (صفر تخصيص ذاكرة أثناء الرسم)
// ---------------------------------------------------------------------------

export interface BodyMesh {
  /** إحداثيات الرؤوس (x,y,z) متتابعة. */
  pos: Float32Array
  /** أعراف الرؤوس الملساء (x,y,z) — أساس تظليل Gouraud. */
  nrm: Float32Array
  vertCount: number
  /** فهارس الأوجه الرباعية — 4 فهارس لكل وجه (تُقسم لمثلّثين عند الرسم). */
  idx: Uint32Array
  quadCount: number
  /** فهرس العضلة المهيمنة عند كل رأس (-1 = لا شيء). */
  vertMuscle: Int8Array
  /** شدّة انتماء الرأس لتلك العضلة 0..255. */
  vertInf: Uint8Array
  /** المادة عند الرأس: 0 = جلد، 1 = لباس. */
  vertMat: Uint8Array
  /** قرب الرأس من حدّ العضلة 0..255 — لخطوط الفصل العضلي. */
  vertEdge: Uint8Array
  /** فهرس العضلة لكل وجه — يُكتب في مخزن الالتقاط. */
  quadMuscle: Int8Array
  /** شدّة انتماء الوجه (متوسط رؤوسه) 0..255. */
  quadInf: Uint8Array
  /** حدود النموذج — لضبط الكاميرا. */
  bounds: { minY: number; maxY: number; maxR: number }
}

/**
 * فهارس العضلات تُخزَّن في `Int8Array` (مدى −128..127) وتُكتب في مخزن الالتقاط،
 * و−1 محجوزة لـ«لا عضلة». اليوم عددها ١٩ فالهامش واسع، لكن إضافة عضلات مستقبلًا
 * حتى تجاوز ١٢٧ ستلتفّ بصمت إلى فهارس سالبة فتُلتقط العضلة الخطأ — نحرس الحدّ هنا
 * بدل أن ينكشف الخطأ كعطل بصري غامض.
 */
if (ALL_MUSCLE_IDS.length > 127) {
  throw new Error(
    `body3d: عدد العضلات ${ALL_MUSCLE_IDS.length} يتجاوز سعة Int8Array؛ حوّل vertMuscle/quadMuscle ومخزن mid إلى Int16Array.`,
  )
}

const MUSCLE_INDEX: Record<string, number> = Object.fromEntries(
  ALL_MUSCLE_IDS.map((id, i) => [id, i]),
)

/** يحوّل فهرس العضلة إلى معرّفها (أو null). */
export function muscleAt(index: number): MuscleId | null {
  return index >= 0 && index < ALL_MUSCLE_IDS.length ? ALL_MUSCLE_IDS[index] : null
}

// ---------------------------------------------------------------------------
// البناء
// ---------------------------------------------------------------------------

/** شكل الـsuperellipse: يحوّل جيبًا/جيب تمام إلى منحنى أقرب للمستطيل كلما زاد n. */
function shape(t: number, n: number): number {
  if (n === 2) return t
  const a = Math.abs(t)
  const r = Math.pow(a, 2 / n)
  return t < 0 ? -r : r
}

interface BuildVertex {
  p: Vec3
  n: Vec3
  /** الجزء الذي ينتمي إليه. */
  seg: string
  u: number
  v: number
}

/** يبني رؤوس مقطع عرضي واحد في الفضاء المحلي. */
function ringPoints(s: Section, radial: number): Vec3[] {
  const pts: Vec3[] = new Array(radial)
  const n = s.n ?? 2
  const ox = s.ox ?? 0
  const oz = s.oz ?? 0
  const back = s.back ?? 1
  for (let j = 0; j < radial; j++) {
    const a = (j / radial) * Math.PI * 2
    const sa = Math.sin(a)
    const ca = Math.cos(a)
    // تعميق/تسطيح النصف الخلفي بتدرّج ناعم (بلا انكسار عند الجانبين).
    const depth = s.rz * (1 + (back - 1) * Math.max(0, -ca))
    pts[j] = v3(ox + s.rx * shape(sa, n), s.y, oz + depth * shape(ca, n))
  }
  return pts
}

/** قيمة Catmull-Rom عند منتصف القطعة p1→p2 (تنعيم بأربع نقاط). */
function crMid(a: number, b: number, c: number, d: number): number {
  return (-a + 9 * b + 9 * c - d) / 16
}

/**
 * يُنعّم سلسلة المقاطع بإقحام مقاطع وسيطة: الارتفاع يُقحم خطيًا (يبقى رتيبًا)
 * وأنصاف الأقطار بمنحنى Catmull-Rom — فيصبح ظِلّ الجسم منسابًا بلا انكسارات.
 */
function subdivideSections(src: Section[], times: number): Section[] {
  if (times <= 0 || src.length < 3) return src
  let cur = src
  for (let pass = 0; pass < times; pass++) {
    const out: Section[] = []
    const last = cur.length - 1
    for (let i = 0; i < last; i++) {
      out.push(cur[i])
      const p0 = cur[Math.max(0, i - 1)]
      const p1 = cur[i]
      const p2 = cur[i + 1]
      const p3 = cur[Math.min(last, i + 2)]
      out.push({
        y: (p1.y + p2.y) / 2,
        rx: Math.max(0.01, crMid(p0.rx, p1.rx, p2.rx, p3.rx)),
        rz: Math.max(0.01, crMid(p0.rz, p1.rz, p2.rz, p3.rz)),
        ox: crMid(p0.ox ?? 0, p1.ox ?? 0, p2.ox ?? 0, p3.ox ?? 0),
        oz: crMid(p0.oz ?? 0, p1.oz ?? 0, p2.oz ?? 0, p3.oz ?? 0),
        back: crMid(p0.back ?? 1, p1.back ?? 1, p2.back ?? 1, p3.back ?? 1),
        n: ((p1.n ?? 2) + (p2.n ?? 2)) / 2,
      })
    }
    out.push(cur[last])
    cur = out
  }
  return cur
}

/** يضيف قبّة إغلاق ناعمة في نهاية سلسلة المقاطع. */
function withCaps(sections: Section[], capBottom: boolean, capTop: boolean): Section[] {
  const out = sections.slice()
  if (capBottom && out.length) {
    const f = out[0]
    const r = Math.max(f.rx, f.rz)
    const dir = out.length > 1 && out[1].y > f.y ? -1 : 1
    out.unshift(
      { ...f, y: f.y + dir * r * 0.55, rx: f.rx * 0.34, rz: f.rz * 0.34 },
      { ...f, y: f.y + dir * r * 0.34, rx: f.rx * 0.72, rz: f.rz * 0.72 },
    )
    out.unshift({ ...f, y: f.y + dir * r * 0.62, rx: f.rx * 0.03, rz: f.rz * 0.03 })
  }
  if (capTop && out.length) {
    const l = out[out.length - 1]
    const r = Math.max(l.rx, l.rz)
    const dir = out.length > 1 && l.y > out[out.length - 2].y ? 1 : -1
    out.push(
      { ...l, y: l.y + dir * r * 0.34, rx: l.rx * 0.72, rz: l.rz * 0.72 },
      { ...l, y: l.y + dir * r * 0.55, rx: l.rx * 0.34, rz: l.rz * 0.34 },
      { ...l, y: l.y + dir * r * 0.62, rx: l.rx * 0.03, rz: l.rz * 0.03 },
    )
  }
  return out
}

/** شدّة تأثير حقل عضلة عند (u,v). */
function patchInfluence(p: MusclePatch, u: number, v: number): number {
  const du = wrapDist(u, p.u) / p.ru
  const dv = (v - p.v) / p.rv
  const d2 = du * du + dv * dv
  if (d2 >= 1) return 0
  return Math.pow(1 - d2, p.sharp ?? 1.3)
}

/** هل يغطّي اللباس النقطة (u,v) من هذا الجزء؟ */
function garmentCover(bands: GarmentBand[], seg: string, u: number, v: number): GarmentBand | null {
  for (const b of bands) {
    if (b.seg !== seg) continue
    if (v < b.v0 || v > b.v1) continue
    if (b.u0 !== undefined && b.u1 !== undefined) {
      const inU = b.u0 <= b.u1 ? u >= b.u0 && u <= b.u1 : u >= b.u0 || u <= b.u1
      if (!inU) continue
    }
    return b
  }
  return null
}

/**
 * يبني شبكة الجسم كاملة من التعريف التشريحي.
 * مرحلتان: (1) بناء السطح الأساسي وحساب الأعراف، (2) إزاحة الرؤوس بانتفاخ
 * العضلات ثم إعادة حساب الأعراف كي يصبح النحت العضلي مضاءً بشكل صحيح.
 */
export function buildBodyMesh(spec: BodySpec): BodyMesh {
  const verts: BuildVertex[] = []
  const quads: number[] = []
  /** لكل وجه: نصيبه من (u,v) والجزء — لتقييم العضلات واللباس. */
  const quadMeta: { seg: string; u: number; v: number }[] = []

  const pushSegment = (spc: SegmentSpec, mirrored: boolean) => {
    const smooth = subdivideSections(spc.sections, spc.subdiv ?? 0)
    const sections = withCaps(smooth, spc.capBottom ?? false, spc.capTop ?? false)
    if (sections.length < 2) return
    const radial = spc.radial
    const rot: Mat3 = spc.dir ? frameFromDir(spc.dir) : IDENTITY
    const base = verts.length

    // مدى v يُحسب على المقاطع الأصلية (بلا القبّات) كي تبقى خرائط العضلات ثابتة.
    const y0 = spc.sections[0].y
    const y1 = spc.sections[spc.sections.length - 1].y
    const span = y1 - y0 || 1

    for (let i = 0; i < sections.length; i++) {
      const pts = ringPoints(sections[i], radial)
      const v = clamp((sections[i].y - y0) / span, -0.25, 1.25)
      for (let j = 0; j < radial; j++) {
        let p = mulMV(rot, pts[j])
        p = { x: p.x + spc.origin.x, y: p.y + spc.origin.y, z: p.z + spc.origin.z }
        if (mirrored) p = { x: -p.x, y: p.y, z: p.z }
        verts.push({ p, n: v3(0, 1, 0), seg: spc.id, u: j / radial, v })
      }
    }

    for (let i = 0; i < sections.length - 1; i++) {
      for (let j = 0; j < radial; j++) {
        const j2 = (j + 1) % radial
        const a = base + i * radial + j
        const b = base + i * radial + j2
        const c = base + (i + 1) * radial + j2
        const d = base + (i + 1) * radial + j
        // النسخة المعكوسة تقلب اتجاه اللفّ، فنعكس الترتيب ليبقى العرف للخارج.
        if (mirrored) quads.push(a, d, c, b)
        else quads.push(a, b, c, d)
        quadMeta.push({
          seg: spc.id,
          u: (j + 0.5) / radial,
          v: (verts[a].v + verts[d].v) / 2,
        })
      }
    }
  }

  for (const s of spec.segments) {
    pushSegment(s, false)
    if (s.mirror) pushSegment(s, true)
  }

  const quadCount = quadMeta.length
  const vertCount = verts.length

  // --- حساب أعراف الرؤوس (متوسط أعراف الأوجه المجاورة) ---
  const computeNormals = () => {
    for (const vx of verts) vx.n = v3(0, 0, 0)
    for (let q = 0; q < quadCount; q++) {
      const i0 = quads[q * 4]
      const i1 = quads[q * 4 + 1]
      const i3 = quads[q * 4 + 3]
      const e1 = sub(verts[i1].p, verts[i0].p)
      const e2 = sub(verts[i3].p, verts[i0].p)
      const fn = cross(e1, e2)
      for (let k = 0; k < 4; k++) {
        const vx = verts[quads[q * 4 + k]].n
        vx.x += fn.x
        vx.y += fn.y
        vx.z += fn.z
      }
    }
    for (const vx of verts) vx.n = normalize(vx.n)
  }

  computeNormals()

  // --- المرحلة 2: إزاحة الرؤوس بانتفاخ العضلات (النحت العضلي) ---
  const patchesBySeg = new Map<string, MusclePatch[]>()
  for (const p of spec.muscles) {
    const list = patchesBySeg.get(p.seg)
    if (list) list.push(p)
    else patchesBySeg.set(p.seg, [p])
  }

  for (const vx of verts) {
    const list = patchesBySeg.get(vx.seg)
    let lift = 0
    if (list) {
      for (const p of list) {
        if (!p.bulge) continue
        lift += p.bulge * patchInfluence(p, vx.u, vx.v)
      }
    }
    // رفع القماش قليلًا كي تظهر حافة اللباس.
    const g = garmentCover(spec.garments, vx.seg, vx.u, vx.v)
    if (g?.lift) lift += g.lift
    if (lift !== 0) {
      vx.p = { x: vx.p.x + vx.n.x * lift, y: vx.p.y + vx.n.y * lift, z: vx.p.z + vx.n.z * lift }
    }
  }

  computeNormals()

  // --- تعبئة المصفوفات المسطّحة ---
  const pos = new Float32Array(vertCount * 3)
  let minY = Infinity
  let maxY = -Infinity
  let maxR = 0
  for (let i = 0; i < vertCount; i++) {
    const p = verts[i].p
    pos[i * 3] = p.x
    pos[i * 3 + 1] = p.y
    pos[i * 3 + 2] = p.z
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
    const r = Math.hypot(p.x, p.z)
    if (r > maxR) maxR = r
  }

  const nrm = new Float32Array(vertCount * 3)
  for (let i = 0; i < vertCount; i++) {
    const n = verts[i].n
    nrm[i * 3] = n.x
    nrm[i * 3 + 1] = n.y
    nrm[i * 3 + 2] = n.z
  }

  // --- سمات كل رأس: العضلة المهيمنة وشدّتها وحدّها والمادة ---
  const vertMuscle = new Int8Array(vertCount)
  const vertInf = new Uint8Array(vertCount)
  const vertMat = new Uint8Array(vertCount)
  const vertEdge = new Uint8Array(vertCount)

  for (let i = 0; i < vertCount; i++) {
    const vx = verts[i]
    const list = patchesBySeg.get(vx.seg)
    let best = -1
    let bestInf = 0
    let secondInf = 0
    if (list) {
      for (const p of list) {
        const inf = patchInfluence(p, vx.u, vx.v)
        if (inf <= 0) continue
        if (inf > bestInf) {
          secondInf = bestInf
          bestInf = inf
          best = MUSCLE_INDEX[p.m] ?? -1
        } else if (inf > secondInf) {
          secondInf = inf
        }
      }
    }
    vertMuscle[i] = best
    vertInf[i] = Math.round(clamp(bestInf, 0, 1) * 255)
    // خط الفصل يُرسم فقط حيث تتلامس عضلتان (مثل صفوف البطن ورؤوس الصدر)،
    // لا عند كل حافة حقل — وإلا ظهرت نقاط داكنة متناثرة على الجسم.
    const edge =
      secondInf > 0.04 && bestInf - secondInf < 0.1 ? 1 - (bestInf - secondInf) / 0.1 : 0
    vertEdge[i] = Math.round(clamp(edge, 0, 1) * 255)
    vertMat[i] = garmentCover(spec.garments, vx.seg, vx.u, vx.v) ? 1 : 0
  }

  const idx = new Uint32Array(quads)
  const quadMuscle = new Int8Array(quadCount)
  const quadInf = new Uint8Array(quadCount)

  for (let q = 0; q < quadCount; q++) {
    const meta = quadMeta[q]
    const list = patchesBySeg.get(meta.seg)
    let best = -1
    let bestInf = 0
    if (list) {
      for (const p of list) {
        const inf = patchInfluence(p, meta.u, meta.v)
        if (inf > bestInf) {
          bestInf = inf
          best = MUSCLE_INDEX[p.m] ?? -1
        }
      }
    }
    quadMuscle[q] = best
    quadInf[q] = Math.round(clamp(bestInf, 0, 1) * 255)
  }

  return {
    pos,
    nrm,
    vertCount,
    idx,
    quadCount,
    vertMuscle,
    vertInf,
    vertMat,
    vertEdge,
    quadMuscle,
    quadInf,
    bounds: { minY, maxY, maxR },
  }
}
