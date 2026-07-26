import type { MuscleId, MuscleView } from '@/types/muscles'

// ============================================================================
// خريطة العضلات — الشكل التخطيطي والمناطق.
//
// قرار تصميمي صريح: هذا **مخطّط (pictogram)** لا نموذج تشريحي. الأشكال دوائر
// ومستطيلات مستديرة على شبكة بسيطة — بلا عظام، بلا ملامح وجه، بلا محاولة
// لمحاكاة جسم حقيقي. الهدف قراءة سريعة لتوزيع التمرين، لا محاكاة طبية.
//
// كل منطقة تجمع عضلة أو أكثر من مصدر الحقيقة (computeWeeklyCoverage). التقسيم
// على مستوى المنطقة لا العضلة المفردة: ١٩ عضلة على مخطّط بعرض ١٠٠ وحدة تصير
// بقعًا غير مقروءة — التفصيل الكامل يظهر في لوحة التفاصيل عند الضغط.
//
// لوحة الرسم: 0 0 100 224، محور التماثل x=50.
// ============================================================================

/** منطقة قابلة للضغط على المخطّط. */
export interface MapRegion {
  /** معرّف داخلي فريد ضمن الجهة. */
  id: string
  /** العضلات التي تُجمَع تغطيتها في هذه المنطقة. */
  muscles: MuscleId[]
  /** مسار/مسارات الرسم (تُعكس تلقائيًا عند وجود mirror). */
  d: string[]
  /** تُنسخ معكوسة حول محور التماثل (الأطراف والأزواج). */
  mirror?: boolean
}

const AXIS2 = 100

/** يعكس مسارًا أفقيًا حول محور التماثل (يدعم الأوامر المطلقة M L C Q Z). */
function mirrorPath(d: string): string {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+/g) ?? []
  const out: string[] = []
  let coord = 0
  for (const tok of tokens) {
    if (/[a-zA-Z]/.test(tok)) {
      out.push(tok)
      coord = 0
      continue
    }
    out.push(coord % 2 === 0 ? String(AXIS2 - parseFloat(tok)) : tok)
    coord++
  }
  let res = ''
  for (const t of out) res += /[a-zA-Z]/.test(t) ? (res ? ' ' : '') + t : ` ${t}`
  return res.trim()
}

/** مستطيل مستدير كمسار — الشكل الأساسي للمخطّط. */
function box(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h / 2)
  return (
    `M${x + rr} ${y} L${x + w - rr} ${y} Q${x + w} ${y} ${x + w} ${y + rr} ` +
    `L${x + w} ${y + h - rr} Q${x + w} ${y + h} ${x + w - rr} ${y + h} ` +
    `L${x + rr} ${y + h} Q${x} ${y + h} ${x} ${y + h - rr} ` +
    `L${x} ${y + rr} Q${x} ${y} ${x + rr} ${y} Z`
  )
}

/** يوسّع المناطق ذات mirror إلى مسارات يمنى ويسرى. */
export function regionPaths(r: MapRegion): string[] {
  return r.mirror ? r.d.flatMap((d) => [d, mirrorPath(d)]) : r.d
}

// ---------------------------------------------------------------------------
// الهيكل المحايد — يُرسم خلف المناطق ليعطي المخطّط قوامه.
// ---------------------------------------------------------------------------

/** رأس + رقبة + جذع + حوض + أطراف، كلها أشكال مستديرة ناعمة. */
export const SILHOUETTE: string[] = [
  // رأس (دائرة كمسار كي تبقى القائمة متجانسة)
  'M50 6 C57.2 6 63 11.8 63 19 C63 26.2 57.2 32 50 32 C42.8 32 37 26.2 37 19 C37 11.8 42.8 6 50 6 Z',
  box(45, 30, 10, 9, 4), // رقبة
  box(27, 37, 46, 62, 15), // جذع
  box(31, 96, 38, 20, 9), // حوض
  // ذراعان
  box(13, 44, 12, 42, 6),
  box(75, 44, 12, 42, 6),
  box(14, 87, 10, 38, 5),
  box(76, 87, 10, 38, 5),
  // كفّان
  box(14, 126, 10, 12, 5),
  box(76, 126, 10, 12, 5),
  // ساقان
  box(31, 114, 16, 48, 8),
  box(53, 114, 16, 48, 8),
  box(33, 163, 13, 44, 6),
  box(54, 163, 13, 44, 6),
  // قدمان
  box(32, 208, 15, 10, 5),
  box(53, 208, 15, 10, 5),
]

// ---------------------------------------------------------------------------
// المناطق — الجهة الأمامية
// ---------------------------------------------------------------------------

export const FRONT_REGIONS: MapRegion[] = [
  {
    id: 'chest',
    muscles: ['chest_upper', 'chest_mid', 'chest_lower'],
    d: [box(29.5, 44, 19, 21, 8)],
    mirror: true,
  },
  {
    id: 'front_delts',
    muscles: ['front_delts', 'side_delts'],
    d: [box(14.5, 44.5, 10, 12, 5)],
    mirror: true,
  },
  {
    id: 'biceps',
    muscles: ['biceps'],
    d: [box(14.5, 63, 10, 21, 5)],
    mirror: true,
  },
  {
    id: 'forearms',
    muscles: ['forearms'],
    d: [box(15, 89, 8, 33, 4)],
    mirror: true,
  },
  {
    id: 'abs',
    muscles: ['abs'],
    d: [box(41, 68, 18, 27, 6)],
  },
  {
    id: 'obliques',
    muscles: ['obliques'],
    d: [box(30, 69, 9, 25, 4)],
    mirror: true,
  },
  {
    id: 'quads',
    muscles: ['quads'],
    d: [box(32, 118, 14, 40, 7)],
    mirror: true,
  },
]

// ---------------------------------------------------------------------------
// المناطق — الجهة الخلفية
// ---------------------------------------------------------------------------

export const BACK_REGIONS: MapRegion[] = [
  {
    id: 'traps',
    muscles: ['traps'],
    d: [box(38, 39, 24, 15, 6)],
  },
  {
    id: 'rear_delts',
    muscles: ['rear_delts'],
    d: [box(14.5, 44.5, 10, 12, 5)],
    mirror: true,
  },
  {
    id: 'upper_back',
    muscles: ['upper_back'],
    d: [box(31, 55, 17, 14, 5)],
    mirror: true,
  },
  {
    id: 'lats',
    muscles: ['lats'],
    d: [box(29, 70, 15, 22, 6)],
    mirror: true,
  },
  {
    id: 'triceps',
    muscles: ['triceps'],
    d: [box(14.5, 63, 10, 21, 5)],
    mirror: true,
  },
  {
    id: 'lower_back',
    muscles: ['lower_back'],
    d: [box(43, 82, 14, 13, 5)],
  },
  {
    id: 'glutes',
    muscles: ['glutes'],
    d: [box(33, 98, 16, 17, 7)],
    mirror: true,
  },
  {
    id: 'hamstrings',
    muscles: ['hamstrings'],
    d: [box(32, 120, 14, 38, 7)],
    mirror: true,
  },
  {
    id: 'calves',
    muscles: ['calves'],
    d: [box(34, 166, 11, 30, 5)],
    mirror: true,
  },
]

export function regionsFor(view: MuscleView): MapRegion[] {
  return view === 'front' ? FRONT_REGIONS : BACK_REGIONS
}

/** أبعاد لوحة الرسم — يشاركها المكوّن وسكربت الحراسة. */
export const MAP_VIEWBOX = { width: 100, height: 224 } as const

/** كل العضلات التي تظهر على المخطّط (لحارس التغطية). */
export function mappedMuscles(): MuscleId[] {
  const set = new Set<MuscleId>()
  for (const r of [...FRONT_REGIONS, ...BACK_REGIONS]) r.muscles.forEach((m) => set.add(m))
  return [...set]
}
