// ============================================================================
// تشريح المجسّم البشري ثلاثي الأبعاد — مصدر الحقيقة لأبعاد الجسم وخرائط العضلات.
//
// الوحدات: طول الجسم 180 وحدة، y=0 عند باطن القدم، x=0 محور التماثل،
// +z نحو الأمام (وجه الشخص). النسب مبنية على المعايير التشريحية المعروفة
// (٧٫٥ رؤوس، عرض الكتفين ≈ ٠٫٢٤ من الطول، الركبة عند ٢٧٪، الحوض عند ٥٢٪).
//
// كل شيء هنا بيانات قابلة للتعديل — لا منطق رسم (قاعدة المشروع: data-driven).
// لا عظام: سطح جلدي/عضلي فقط.
// ============================================================================

import type { Gender } from '@/types/profile'
import { add, scale, v3, type Vec3 } from '@/lib/body3d/math'
import type { BodySpec, GarmentBand, MusclePatch, Section, SegmentSpec } from '@/lib/body3d/mesh'

/** ارتفاع النموذج بالوحدات الداخلية. */
export const MODEL_HEIGHT = 180

/** معالم رأسية أساسية (بالوحدات). */
export const LANDMARKS = {
  ankle: 8,
  knee: 49,
  crotch: 86,
  hip: 94,
  navel: 108,
  waist: 113,
  chest: 133,
  armpit: 138,
  shoulder: 145,
  neckBase: 152,
  chin: 155,
  crown: 179,
} as const

/** نسب الجسم القابلة للتعديل حسب الجنس. */
interface Proportions {
  /** نصف عرض الجذع عند الأعرض (تحت الكتف). */
  shoulderW: number
  /** نصف عمق القفص الصدري. */
  chestD: number
  /** نصف عرض/عمق الخصر عند أضيق نقطة. */
  waistW: number
  waistD: number
  /** نصف عرض/عمق الحوض عند أعرض نقطة. */
  hipW: number
  hipD: number
  /** معامل سماكة الأطراف. */
  limb: number
  /** معامل نحت العضلات (كم تنتفخ العضلة عن السطح). */
  bulge: number
  /** بروز الألوية للخلف. */
  glute: number
}

const PROPORTIONS: Record<Gender, Proportions> = {
  // ذكر: أكتاف عريضة، خصر ضيّق، نحت عضلي واضح (مظهر V).
  male: { shoulderW: 18.8, chestD: 12.8, waistW: 12.5, waistD: 9.7, hipW: 14.3, hipD: 10.8, limb: 1, bulge: 1.38, glute: 1.12 },
  // أنثى: أكتاف أضيق، خصر منحوت، ورك أوسع، نحت أنعم.
  female: { shoulderW: 15.1, chestD: 11.3, waistW: 11, waistD: 8.8, hipW: 17.3, hipD: 12.2, limb: 0.9, bulge: 0.72, glute: 1.32 },
  // غير محدّد: وسط بين الاثنين.
  unspecified: { shoulderW: 16.9, chestD: 12, waistW: 11.8, waistD: 9.3, hipW: 15.7, hipD: 11.4, limb: 0.95, bulge: 1, glute: 1.22 },
}

/** اتجاه طرف يتّجه لأسفل بميل خارجي بالدرجات (موجب = يبتعد عن المحور). */
function limbDir(deg: number): Vec3 {
  const r = (deg * Math.PI) / 180
  return v3(Math.sin(r), -Math.cos(r), 0)
}

/** يضرب أنصاف الأقطار في معامل (لتسميك/ترقيق الأطراف حسب الجنس). */
function thick(sections: Section[], k: number): Section[] {
  if (k === 1) return sections
  return sections.map((s) => ({
    ...s,
    rx: s.rx * k,
    rz: s.rz * k,
    ox: (s.ox ?? 0) * k,
    oz: (s.oz ?? 0) * k,
  }))
}

/** يضاعف انتفاخ كل الحقول العضلية بمعامل الجنس. */
function scaleBulge(patches: MusclePatch[], k: number): MusclePatch[] {
  return patches.map((p) => (p.bulge ? { ...p, bulge: p.bulge * k } : p))
}

/** زوج متماثل من حقل عضلي: عند u وعند 1−u. */
function uPair(p: MusclePatch): MusclePatch[] {
  return [p, { ...p, u: (1 - p.u) % 1 }]
}

// ---------------------------------------------------------------------------
// الجذع — أهم جزء: من أسفل الألوية حتى قاعدة الرقبة.
// v = (y − 84) / 71  ← تُستخدم في خرائط العضلات أدناه.
// ---------------------------------------------------------------------------

// حدود مقاطع الجذع فعليًا (أول وآخر مقطع) — منها يُشتقّ إحداثي v.
const TORSO_Y0 = 78
const TORSO_Y1 = 152.5
const TORSO_SPAN = TORSO_Y1 - TORSO_Y0

/** يحوّل ارتفاعًا بالوحدات إلى إحداثي v على الجذع. */
export const torsoV = (y: number): number => (y - TORSO_Y0) / TORSO_SPAN
/** يحوّل نصف امتداد رأسي بالوحدات إلى نصف امتداد بإحداثي v. */
const tvr = (units: number): number => units / TORSO_SPAN

function torsoSections(p: Proportions): Section[] {
  const { shoulderW: S, chestD: C, waistW: W, waistD: D, hipW: H, hipD: HD } = p
  const g = p.glute
  return [
    // إغلاق سفلي مخفي بين الفخذين.
    { y: 78, rx: H * 0.12, rz: HD * 0.12, n: 2.4, back: 1 },
    { y: 81, rx: H * 0.55, rz: HD * 0.6, n: 2.5, back: 1.06 },
    { y: 84, rx: H * 0.86, rz: HD * 0.94, n: 2.6, back: g },
    { y: 89, rx: H * 0.98, rz: HD * 1.02, n: 2.6, back: g * 1.02 },
    { y: 94, rx: H, rz: HD, n: 2.6, back: g * 0.98 },
    { y: 99, rx: H * 0.93, rz: HD * 0.95, n: 2.55, back: 1.09 },
    { y: 104, rx: H * 0.85, rz: HD * 0.9, n: 2.5, back: 1.02 },
    { y: 109, rx: W * 1.06, rz: D * 1.03, n: 2.45, back: 0.98 },
    { y: 113, rx: W, rz: D, n: 2.45, back: 0.97 },
    { y: 118, rx: W * 1.07, rz: D * 1.06, n: 2.45, back: 0.99 },
    { y: 123, rx: W * 1.17, rz: D * 1.12, n: 2.4, back: 1 },
    { y: 128, rx: S * 0.88, rz: C * 0.95, n: 2.4, back: 1.02 },
    { y: 133, rx: S * 0.94, rz: C, n: 2.35, back: 1.03 },
    { y: 138, rx: S * 0.99, rz: C * 0.98, n: 2.35, back: 1.04 },
    { y: 142, rx: S, rz: C * 0.93, n: 2.3, back: 1.04 },
    { y: 146, rx: S * 0.95, rz: C * 0.85, n: 2.3, back: 1.02 },
    // من هنا يهبط الجذع بسرعة داخل الرقبة كي تظهر الرقبة فعليًا بدل مخروط ممتد.
    { y: 149, rx: S * 0.79, rz: C * 0.76, n: 2.25, back: 1.01 },
    { y: 151, rx: S * 0.46, rz: C * 0.6, n: 2.1, back: 1 },
    { y: 152.5, rx: S * 0.26, rz: C * 0.42, n: 2, back: 1 },
  ]
}

// ---------------------------------------------------------------------------
// الحقول العضلية — 19 عضلة موزّعة على أسطح الأجزاء.
// اصطلاح u: 0 = وسط الأمام، 0.25 = الجانب (الأنسي في الأطراف)، 0.5 = وسط الخلف.
// في الأطراف: u=0.75 هو الجانب الوحشي (الخارجي) لكلتا الجهتين بعد العكس.
// ---------------------------------------------------------------------------

/**
 * عضلات البطن: أربعة صفوف × عمودين مفصولين بخطّ أبيض في المنتصف (linea alba).
 * تلامس الصفوف يولّد خطوط الفصل تلقائيًا فتظهر «السكس باك».
 */
function absPatches(): MusclePatch[] {
  const out: MusclePatch[] = []
  const rows = [106, 111.5, 117, 122]
  for (let r = 0; r < rows.length; r++) {
    for (const u of [0.053, 0.947]) {
      out.push({
        m: 'abs',
        seg: 'torso',
        u,
        v: torsoV(rows[r]),
        ru: 0.038,
        rv: tvr(2.5),
        bulge: 1.15 - r * 0.12,
        sharp: 1.7,
      })
    }
  }
  return out
}

const TORSO_PATCHES: MusclePatch[] = [
  // ===== الصدر — ثلاث طبقات فوق بعض، بفجوة عند القصّ (sternum) =====
  ...uPair({ m: 'chest_upper', seg: 'torso', u: 0.086, v: torsoV(137), ru: 0.072, rv: tvr(4), bulge: 1.6, sharp: 1.5 }),
  ...uPair({ m: 'chest_mid', seg: 'torso', u: 0.09, v: torsoV(132), ru: 0.08, rv: tvr(4.4), bulge: 2.2, sharp: 1.4 }),
  ...uPair({ m: 'chest_lower', seg: 'torso', u: 0.084, v: torsoV(127.5), ru: 0.074, rv: tvr(3.4), bulge: 1.6, sharp: 1.6 }),

  // ===== البطن والجوانب =====
  ...absPatches(),
  ...uPair({ m: 'obliques', seg: 'torso', u: 0.125, v: torsoV(110), ru: 0.05, rv: tvr(9), bulge: 1, sharp: 1.4 }),

  // ===== الظهر =====
  ...uPair({ m: 'lats', seg: 'torso', u: 0.325, v: torsoV(124), ru: 0.115, rv: tvr(14), bulge: 2, sharp: 1.3 }),
  ...uPair({ m: 'upper_back', seg: 'torso', u: 0.432, v: torsoV(134), ru: 0.078, rv: tvr(6), bulge: 1.5, sharp: 1.4 }),
  { m: 'traps', seg: 'torso', u: 0.5, v: torsoV(142.5), ru: 0.155, rv: tvr(6.5), bulge: 1.7, sharp: 1.3 },
  ...uPair({ m: 'traps', seg: 'torso', u: 0.405, v: torsoV(147.5), ru: 0.075, rv: tvr(3.5), bulge: 1.3, sharp: 1.4 }),
  { m: 'lower_back', seg: 'torso', u: 0.5, v: torsoV(103), ru: 0.1, rv: tvr(12), bulge: 1.1, sharp: 1.4 },

  // ===== الألوية =====
  ...uPair({ m: 'glutes', seg: 'torso', u: 0.425, v: torsoV(87), ru: 0.11, rv: tvr(9.5), bulge: 2.6, sharp: 1.3 }),
]

// الذراع والساق كلٌّ سطح واحد متّصل (كتف→معصم، ورك→كاحل) بدل قطع منفصلة،
// وإلا ظهر خيط تقاطع واضح عند الكوع والركبة.

/** أطوال الأطراف بالوحدات. */
const ARM_LEN = 59 // كتف → معصم
const LEG_LEN = 84 // ورك → كاحل
const ARM_Y0 = -2
const LEG_Y0 = -2

/** إحداثي v على الذراع من موضع محلي. */
const armV = (y: number): number => (y - ARM_Y0) / (ARM_LEN - ARM_Y0)
/** نصف امتداد رأسي بالوحدات → إحداثي v على الذراع. */
const avr = (units: number): number => units / (ARM_LEN - ARM_Y0)
/** إحداثي v على الساق من موضع محلي. */
const legV = (y: number): number => (y - LEG_Y0) / (LEG_LEN - LEG_Y0)
const lvr = (units: number): number => units / (LEG_LEN - LEG_Y0)

const ARM_PATCHES: MusclePatch[] = [
  // الدالية بثلاثة رؤوس تغطّي أعلى الذراع (u=0.75 هو الجانب الوحشي بعد العكس).
  { m: 'front_delts', seg: 'arm', u: 0.03, v: armV(2), ru: 0.14, rv: avr(6.5), bulge: 1.5, sharp: 1.35 },
  { m: 'side_delts', seg: 'arm', u: 0.75, v: armV(2.5), ru: 0.15, rv: avr(7), bulge: 1.8, sharp: 1.3 },
  { m: 'rear_delts', seg: 'arm', u: 0.5, v: armV(2), ru: 0.135, rv: avr(6), bulge: 1.3, sharp: 1.35 },
  // البايسبس/الترايسبس على بطن العضد.
  { m: 'biceps', seg: 'arm', u: 0.02, v: armV(20), ru: 0.165, rv: avr(9.5), bulge: 1.9, sharp: 1.3 },
  { m: 'triceps', seg: 'arm', u: 0.5, v: armV(19), ru: 0.18, rv: avr(10.5), bulge: 1.6, sharp: 1.3 },
  // الساعد: أربعة حقول تلفّ المحيط كاملًا تحت الكوع.
  ...[0, 0.25, 0.5, 0.75].map(
    (u): MusclePatch => ({ m: 'forearms', seg: 'arm', u, v: armV(42), ru: 0.17, rv: avr(9), bulge: 0.85, sharp: 1.2 }),
  ),
]

const LEG_PATCHES: MusclePatch[] = [
  // أمامية الفخذ: رأس مستقيم أمامي + رأس وحشي يعطي «الكنس» الجانبي + رأس أنسي.
  { m: 'quads', seg: 'leg', u: 0, v: legV(20), ru: 0.2, rv: lvr(19), bulge: 1.9, sharp: 1.25 },
  { m: 'quads', seg: 'leg', u: 0.78, v: legV(17), ru: 0.125, rv: lvr(14), bulge: 1.4, sharp: 1.3 },
  { m: 'quads', seg: 'leg', u: 0.21, v: legV(27), ru: 0.1, rv: lvr(11), bulge: 1, sharp: 1.3 },
  // خلفية الفخذ.
  { m: 'hamstrings', seg: 'leg', u: 0.5, v: legV(20), ru: 0.19, rv: lvr(17), bulge: 1.6, sharp: 1.25 },
  // السمانة برأسين.
  { m: 'calves', seg: 'leg', u: 0.43, v: legV(55), ru: 0.13, rv: lvr(10), bulge: 1.9, sharp: 1.3 },
  { m: 'calves', seg: 'leg', u: 0.57, v: legV(55), ru: 0.13, rv: lvr(10), bulge: 1.9, sharp: 1.3 },
]

// ---------------------------------------------------------------------------
// اللباس الرياضي — محتشم، ويسمح بظهور تلوين العضلة من خلاله بشدّة مخفّضة.
// ---------------------------------------------------------------------------

function garmentsFor(gender: Gender): GarmentBand[] {
  if (gender === 'female') {
    return [
      // توب رياضي طويل يغطّي الجذع كاملًا حتى خطّ الشورت (ساتر تمامًا).
      { seg: 'torso', v0: torsoV(103), v1: 1.05, lift: 0.55 },
      // شورت/ليقنز ساتر: الحوض وأعلى الفخذين حتى ما فوق الركبة.
      { seg: 'torso', v0: -0.3, v1: torsoV(101.5), lift: 0.55 },
      { seg: 'leg', v0: -0.3, v1: legV(36), lift: 0.5 },
    ]
  }
  return [
    { seg: 'torso', v0: -0.3, v1: torsoV(99.5), lift: 0.55 },
    { seg: 'leg', v0: -0.3, v1: legV(24), lift: 0.5 },
  ]
}

// ---------------------------------------------------------------------------
// تركيب التعريف الكامل
// ---------------------------------------------------------------------------

/** مستوى الدقّة — يُخفَّض على الأجهزة الضعيفة. */
export type BodyQuality = 'high' | 'low'

// مع تظليل Gouraud لم تعد الدقّة العالية ضرورية لنعومة السطح، فقط لحدّة الظِلّ
// الخارجي ودقّة حدود العضلات — هذه القيم توازن الجودة مع الأداء على الجوال.
const RADIAL: Record<string, number> = {
  torso: 36,
  head: 16,
  neck: 12,
  arm: 18,
  hand: 10,
  leg: 20,
  foot: 10,
}

/** مرّات تنعيم المقاطع طوليًا لكل جزء (تُلغى في وضع الدقّة المنخفضة). */
const SUBDIV: Record<string, number> = {
  torso: 1,
  head: 1,
  neck: 0,
  arm: 1,
  hand: 0,
  leg: 1,
  foot: 0,
}

/** يبني التعريف التشريحي الكامل لجنس ودقّة معيّنين. */
export function buildBodySpec(gender: Gender, quality: BodyQuality = 'high'): BodySpec {
  const p = PROPORTIONS[gender] ?? PROPORTIONS.unspecified
  const k = p.limb
  const q = quality === 'low' ? 0.62 : 1
  const rad = (id: string) => Math.max(6, Math.round(RADIAL[id] * q))
  const sub = (id: string) => (quality === 'low' ? 0 : SUBDIV[id])

  // --- مفاصل محسوبة كي تبقى الأطراف متّصلة مهما تغيّرت النسب ---
  const shoulderJoint = v3(p.shoulderW - 2, LANDMARKS.shoulder - 2, 0)
  const armDir = limbDir(9)
  const wrist = add(shoulderJoint, scale(armDir, ARM_LEN))

  const hipJoint = v3(p.hipW * 0.55, 92, 0)
  const legDir = limbDir(-2)
  const ankle = add(hipJoint, scale(legDir, LEG_LEN))

  const segments: SegmentSpec[] = [
    // ===== الجذع =====
    {
      id: 'torso',
      radial: rad('torso'),
      subdiv: sub('torso'),
      origin: v3(0, 0, 0),
      sections: torsoSections(p),
    },

    // ===== الرقبة =====
    {
      id: 'neck',
      radial: rad('neck'),
      subdiv: sub('neck'),
      origin: v3(0, 0, 0),
      sections: [
        { y: 146, rx: 6.2 * k, rz: 6.7 * k, oz: 0, n: 2.2 },
        { y: 151, rx: 5.3 * k, rz: 5.8 * k, oz: 0.5, n: 2.1 },
        { y: 156, rx: 5.1 * k, rz: 5.6, oz: 1, n: 2.1 },
      ],
    },

    // ===== الرأس =====
    {
      id: 'head',
      radial: rad('head'),
      subdiv: sub('head'),
      origin: v3(0, 0, 0),
      capBottom: true,
      capTop: true,
      sections: [
        // ذقن ← فكّ ← وجنتان ← صدغان ← قبّة مستديرة. الوجه بلا ملامح (مجسّم تشريحي محترم).
        // [مهمة المنتج] كانت القبّة تنغلق ببطء فتقرأ بيضةً مدبّبة؛ الآن أوسع نقطة عند
        // الصدغين وقفلة سريعة مستديرة عند القمّة، مع ذقن أضيق من الوجنتين.
        { y: 154.5, rx: 4.3, rz: 5, oz: 1.9, n: 2.3 },
        { y: 157, rx: 5.9, rz: 6.9, oz: 1.6, n: 2.25 },
        { y: 161, rx: 7.4, rz: 8.6, oz: 0.9, n: 2.15 },
        { y: 165, rx: 8.2, rz: 9.4, oz: 0.3, n: 2.1 },
        { y: 169, rx: 8.3, rz: 9.4, oz: -0.1, n: 2.1 },
        { y: 173, rx: 7.9, rz: 8.9, oz: -0.4, n: 2.1 },
        // إغلاق القبّة بخطوات عريضة متقاربة — خطوة ضيّقة أخيرة تصنع «عقدة» فوق الرأس.
        { y: 176, rx: 7.3, rz: 8, oz: -0.6, n: 2.1 },
        { y: 178, rx: 6.1, rz: 6.6, oz: -0.8, n: 2.1 },
        { y: 179.3, rx: 4.2, rz: 4.6, oz: -0.9, n: 2.1 },
      ],
    },

    // ===== الذراع: كتف → معصم كسطح واحد متّصل (بلا خيط عند الكوع) =====
    {
      id: 'arm',
      radial: rad('arm'),
      subdiv: sub('arm'),
      origin: shoulderJoint,
      dir: armDir,
      mirror: true,
      capBottom: true,
      sections: thick(
        [
          { y: -2, rx: 4.6, rz: 4.6, n: 2.1 },
          { y: 0, rx: 6.4, rz: 6.3, n: 2.1 },
          { y: 3, rx: 7.5, rz: 7.3, n: 2.1 },
          { y: 7, rx: 7.4, rz: 7.3, n: 2.1 },
          { y: 12, rx: 6.7, rz: 6.9, n: 2.1 },
          { y: 18, rx: 6.1, rz: 6.4, n: 2.1 },
          { y: 25, rx: 5.4, rz: 5.6, n: 2.1 },
          { y: 30, rx: 4.8, rz: 4.9, n: 2.1 },
          // الكوع
          { y: 33, rx: 4.5, rz: 4.5, n: 2.1 },
          { y: 37, rx: 5, rz: 4.9, n: 2.1 },
          // بطن الساعد
          { y: 41, rx: 5.4, rz: 5.2, n: 2.1 },
          { y: 46, rx: 5, rz: 4.8, n: 2.1 },
          { y: 51, rx: 4.2, rz: 4, n: 2.1 },
          { y: 55, rx: 3.6, rz: 3.3, n: 2.1 },
          // المعصم
          { y: 59, rx: 3.1, rz: 2.8, n: 2.1 },
        ],
        k,
      ),
    },

    // ===== اليد (كتلة مبسّطة بلا أصابع) =====
    {
      id: 'hand',
      radial: rad('hand'),
      subdiv: sub('hand'),
      origin: wrist,
      dir: armDir,
      mirror: true,
      capBottom: true,
      capTop: true,
      sections: thick(
        [
          { y: -2, rx: 3, rz: 2.6, n: 2.3 },
          { y: 3, rx: 3.7, rz: 2.5, n: 2.4 },
          { y: 8, rx: 3.9, rz: 2.3, n: 2.4 },
          { y: 13, rx: 3.5, rz: 1.9, n: 2.4 },
          { y: 17, rx: 2.3, rz: 1.3, n: 2.3 },
        ],
        k,
      ),
    },

    // ===== الساق: ورك → كاحل كسطح واحد متّصل (بلا خيط عند الركبة) =====
    {
      id: 'leg',
      radial: rad('leg'),
      subdiv: sub('leg'),
      origin: hipJoint,
      dir: legDir,
      mirror: true,
      capBottom: true,
      capTop: true,
      sections: thick(
        [
          { y: -2, rx: 9.2, rz: 9.1, n: 2.2 },
          { y: 0, rx: 9.9, rz: 9.7, n: 2.2 },
          { y: 5, rx: 10.1, rz: 9.9, n: 2.2 },
          { y: 12, rx: 9.6, rz: 9.4, n: 2.2 },
          { y: 20, rx: 8.9, rz: 8.7, n: 2.2 },
          { y: 29, rx: 8.1, rz: 7.8, n: 2.2 },
          { y: 37, rx: 7, rz: 6.7, n: 2.2 },
          // الركبة
          { y: 43, rx: 6.1, rz: 5.9, n: 2.2 },
          { y: 48, rx: 6.4, rz: 6.5, oz: -0.9, n: 2.2 },
          // بطن السمانة
          { y: 54, rx: 6.4, rz: 6.8, oz: -1.5, n: 2.2 },
          { y: 61, rx: 5.6, rz: 6, oz: -1.1, n: 2.2 },
          { y: 69, rx: 4.7, rz: 4.8, oz: -0.5, n: 2.2 },
          { y: 76, rx: 3.9, rz: 3.8, n: 2.2 },
          // الكاحل — لا يُترك إبرةً: عظما الكعب يمنعان النحافة الورقية
          { y: 84, rx: 3.3, rz: 3.1, n: 2.2 },
        ],
        k,
      ),
    },

    // ===== القدم (المحور المحلي +Y يشير للأمام، +Z لأعلى) =====
    {
      id: 'foot',
      radial: rad('foot'),
      subdiv: sub('foot'),
      origin: ankle,
      dir: v3(0, 0, 1),
      mirror: true,
      capBottom: true,
      capTop: true,
      sections: thick(
        [
          { y: -7, rx: 3.3, rz: 4.2, oz: 4.2 - ankle.y, n: 2.4 },
          { y: -3, rx: 3.7, rz: 4.6, oz: 4.6 - ankle.y, n: 2.4 },
          { y: 2, rx: 4.1, rz: 4.3, oz: 4.3 - ankle.y, n: 2.5 },
          { y: 9, rx: 4.2, rz: 3.4, oz: 3.4 - ankle.y, n: 2.5 },
          { y: 16, rx: 4, rz: 2.4, oz: 2.4 - ankle.y, n: 2.5 },
          { y: 21, rx: 3.5, rz: 1.7, oz: 1.7 - ankle.y, n: 2.45 },
          // الأصابع — قفلة أمامية مسطّحة قليلة الارتفاع
          { y: 24, rx: 2.8, rz: 1.2, oz: 1.2 - ankle.y, n: 2.4 },
        ],
        1,
      ),
    },
  ]

  const muscles = scaleBulge([...TORSO_PATCHES, ...ARM_PATCHES, ...LEG_PATCHES], p.bulge)

  return { segments, muscles, garments: garmentsFor(gender) }
}
