// ============================================================================
// رياضيات ثلاثية الأبعاد — الحد الأدنى المطلوب لمحرّك الجسم البشري.
// مكتوبة يدويًا بلا أي اعتمادية خارجية (قاعدة المشروع: لا مكتبات رسم).
// الاصطلاح: محاور يمينية (right-handed): +X يمين الشاشة، +Y أعلى، +Z نحو الناظر.
// المصفوفة Mat3 مخزّنة صفًّا صفًّا: [m00 m01 m02 m10 m11 m12 m20 m21 m22]
// وتُطبَّق كـ p' = M · p، فتكون أعمدتها هي صور متجهات الأساس.
// ============================================================================

export interface Vec3 {
  x: number
  y: number
  z: number
}

export type Mat3 = readonly [number, number, number, number, number, number, number, number, number]

export const v3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z })

export const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1]

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

export function scale(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s }
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

export function length(a: Vec3): number {
  return Math.hypot(a.x, a.y, a.z)
}

/** يُطبّع المتجه؛ يُعيد (0,1,0) إن كان طوله صفرًا (حماية من القسمة على صفر). */
export function normalize(a: Vec3): Vec3 {
  const l = Math.hypot(a.x, a.y, a.z)
  if (l < 1e-9) return { x: 0, y: 1, z: 0 }
  return { x: a.x / l, y: a.y / l, z: a.z / l }
}

/** ضرب مصفوفة في متجه. */
export function mulMV(m: Mat3, v: Vec3): Vec3 {
  return {
    x: m[0] * v.x + m[1] * v.y + m[2] * v.z,
    y: m[3] * v.x + m[4] * v.y + m[5] * v.z,
    z: m[6] * v.x + m[7] * v.y + m[8] * v.z,
  }
}

/** ضرب مصفوفتين (a ثم b بمعنى a·b). */
export function mulMM(a: Mat3, b: Mat3): Mat3 {
  const out = new Array<number>(9)
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]
    }
  }
  return out as unknown as Mat3
}

/** دوران حول المحور X (الميلان لأعلى/أسفل). */
export function rotX(a: number): Mat3 {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [1, 0, 0, 0, c, -s, 0, s, c]
}

/** دوران حول المحور Y (الدوران الأفقي — المحور الأساسي للمجسّم). */
export function rotY(a: number): Mat3 {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [c, 0, s, 0, 1, 0, -s, 0, c]
}

/** دوران حول المحور Z (الميلان الجانبي). */
export function rotZ(a: number): Mat3 {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [c, -s, 0, s, c, 0, 0, 0, 1]
}

/**
 * يبني إطارًا محليًا يجعل المحور +Y المحلي منطبقًا على `dir`،
 * مع إبقاء المحور +Z المحلي أقرب ما يكون لاتجاه «الأمام» العالمي (0,0,1).
 * يُستخدم لتوجيه الأطراف (ذراع/ساق/قدم) في الفضاء مع بقاء خريطة (u,v) ثابتة محليًا.
 */
export function frameFromDir(dir: Vec3): Mat3 {
  const yAxis = normalize(dir)
  // مرجع الأمام: (0,0,1) إلا إذا كان الاتجاه موازيًا له فنستخدم (0,1,0).
  const ref = Math.abs(yAxis.z) > 0.98 ? v3(0, 1, 0) : v3(0, 0, 1)
  const zAxis = normalize(sub(ref, scale(yAxis, dot(yAxis, ref))))
  const xAxis = cross(yAxis, zAxis)
  // الأعمدة = صور متجهات الأساس المحلية.
  return [xAxis.x, yAxis.x, zAxis.x, xAxis.y, yAxis.y, zAxis.y, xAxis.z, yAxis.z, zAxis.z]
}

/** حصر قيمة بين حدّين. */
export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

/** مزج خطّي. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** انتقال ناعم بين 0 و1 (Hermite). */
export function smoothstep(t: number): number {
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

/** أقصر مسافة دائرية بين قيمتين في [0,1) — للإحداثي الزاوي u. */
export function wrapDist(a: number, b: number): number {
  const d = Math.abs(a - b) % 1
  return d > 0.5 ? 1 - d : d
}
