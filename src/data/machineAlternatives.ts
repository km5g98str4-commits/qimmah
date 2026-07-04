// بدائل الأجهزة (P12) — لكل جهاز في الكتالوج بديل دمبل وبديل كيبل.
//
// القاعدة: الأجهزة هي الأساس؛ الحركات الحرّة تظهر هنا فقط كبدائل (دمبل/كيبل — قد يُستخدم بنش).
// حيث لا يوجد بديل كيبل منطقي (مثل البطات وأجهزة الكوادز) نضع أفضل بديل دمبل/وزن جسم في حقل
// cable مع cableIsFallback: true — لتعرضه الواجهة بصدق («بديل حر» وليس «كيبل»).
//
// كل المعرّفات هنا تمارين كاملة في exercises.ts (يتحقق منها missingAlternativeIds).

import { canonicalExerciseId, getExercise } from '@/data/exercises'

/** بديلا جهاز واحد: دمبل + كيبل. */
export interface MachineAlternatives {
  /** معرّف تمرين الدمبل البديل. */
  dumbbell: string
  /** معرّف بديل الكيبل — أو أفضل بديل حر عند غياب كيبل منطقي (انظر cableIsFallback). */
  cable: string
  /** true = لا يوجد كيبل منطقي؛ حقل cable يشير لبديل دمبل/وزن جسم — اعرضه بصدق. */
  cableIsFallback?: boolean
  /** true = حقل dumbbell يشير لبديل حر بوزن الجسم (مثل سيسي سكوات) — اعرضه بصدق. */
  dumbbellIsFallback?: boolean
}

/** بدائل كل جهاز في الكتالوج — المفاتيح هي المعرّفات القانونية. */
export const machineAlternatives: Record<string, MachineAlternatives> = {
  // ===== الصدر =====
  'chest-press-machine': { dumbbell: 'dumbbell-bench-press', cable: 'cable-crossover' },
  'iso-lateral-chest-press': { dumbbell: 'dumbbell-bench-press', cable: 'cable-crossover' },
  'incline-chest-press-machine': { dumbbell: 'incline-dumbbell-press', cable: 'incline-cable-fly' },
  'iso-lateral-incline-press': { dumbbell: 'incline-dumbbell-press', cable: 'incline-cable-fly' },
  'decline-chest-press-machine': { dumbbell: 'decline-dumbbell-press', cable: 'cable-crossover' },
  'assisted-dip-machine': { dumbbell: 'decline-dumbbell-press', cable: 'cable-crossover' },

  // ===== الظهر =====
  'lat-pulldown-machine': { dumbbell: 'dumbbell-row', cable: 'close-grip-pulldown' },
  'single-arm-lat-pulldown': { dumbbell: 'dumbbell-row', cable: 'single-arm-cable-row' },
  'iso-lateral-pulldown': { dumbbell: 'dumbbell-row', cable: 'close-grip-pulldown' },
  'iso-lateral-high-row': { dumbbell: 'dumbbell-row', cable: 'seated-cable-row' },
  'wide-grip-lat-pulldown': { dumbbell: 'dumbbell-row', cable: 'straight-arm-pulldown' },
  'wide-grip-iso-lateral-pulldown': { dumbbell: 'dumbbell-row', cable: 'straight-arm-pulldown' },
  'seated-row-machine': { dumbbell: 'dumbbell-row', cable: 'seated-cable-row' },
  'chest-supported-row-machine': { dumbbell: 'chest-supported-row', cable: 'seated-cable-row' },
  't-bar-row-machine': { dumbbell: 'dumbbell-row', cable: 'seated-cable-row' },
  'rear-delt-row-machine': { dumbbell: 'rear-delt-fly', cable: 'face-pull' },

  // ===== الأكتاف =====
  // مراجعة زياد: البديل ضغط رأسي مركّب مثل الجهاز — لا رفرفة عزل جانبية.
  'shoulder-press-machine': { dumbbell: 'seated-dumbbell-press', cable: 'cable-shoulder-press' },
  'lateral-raise-machine': { dumbbell: 'lateral-raise', cable: 'cable-lateral-raise' },
  // إلزامي: بديل الكيبل لبيك دك العكسي هو سحب الوجه (Face Pull).
  'reverse-pec-deck': { dumbbell: 'rear-delt-fly', cable: 'face-pull' },

  // ===== الأرجل — فخذ أمامي =====
  // مراجعة زياد: مد الأرجل عزل كوادز خالص — سيسي سكوات (حر) أدق ميكانيكيًا من الجوبليت المركّب.
  'leg-extension-machine': { dumbbell: 'sissy-squat', dumbbellIsFallback: true, cable: 'bodyweight-squat', cableIsFallback: true },
  'hack-squat-machine': { dumbbell: 'goblet-squat', cable: 'bodyweight-squat', cableIsFallback: true },
  'pendulum-squat-machine': { dumbbell: 'goblet-squat', cable: 'bodyweight-squat', cableIsFallback: true },
  'leg-press-machine': { dumbbell: 'goblet-squat', cable: 'bodyweight-squat', cableIsFallback: true },

  // ===== الأرجل — فخذ خلفي =====
  'seated-leg-curl': { dumbbell: 'dumbbell-rdl', cable: 'cable-pull-through' },
  'lying-leg-curl': { dumbbell: 'dumbbell-rdl', cable: 'cable-pull-through' },
  'standing-leg-curl': { dumbbell: 'dumbbell-rdl', cable: 'cable-pull-through' },

  // ===== الأرجل — الفخذ الداخلي =====
  'hip-adductor-machine': { dumbbell: 'dumbbell-sumo-squat', cable: 'cable-hip-adduction' },

  // ===== الأرجل — الألوية =====
  'glute-drive-machine': { dumbbell: 'glute-bridge', cable: 'cable-pull-through' },
  'glute-kickback-machine': { dumbbell: 'glute-bridge', cable: 'cable-kickback' },
  'standing-hip-extension-machine': { dumbbell: 'glute-bridge', cable: 'cable-kickback' },

  // ===== الأرجل — البطات =====
  'seated-calf-raise-machine': { dumbbell: 'single-leg-calf-raise', cable: 'bodyweight-calf-raise', cableIsFallback: true },
  'standing-calf-raise-machine': { dumbbell: 'single-leg-calf-raise', cable: 'bodyweight-calf-raise', cableIsFallback: true },

  // ===== البايسبس =====
  'preacher-curl-machine': { dumbbell: 'concentration-curl', cable: 'cable-biceps-curl' },
  'cable-biceps-curl': { dumbbell: 'dumbbell-curl', cable: 'cable-hammer-curl' },

  // ===== الترايسبس =====
  'triceps-extension-machine': { dumbbell: 'overhead-triceps-extension', cable: 'cable-overhead-extension' },
  'cable-triceps-pushdown': { dumbbell: 'dumbbell-kickback', cable: 'rope-pushdown' },

  // ===== البطن =====
  'ab-crunch-machine': { dumbbell: 'crunch', cable: 'cable-crunch' },
  'cable-crunch': { dumbbell: 'crunch', cable: 'cable-woodchop' },
}

/** يعيد بديلي الجهاز (دمبل/كيبل) — يقبل المعرّفات القديمة، أو null إن لم يكن جهاز كتالوج. */
export function getMachineAlternatives(exerciseId: string): MachineAlternatives | null {
  return machineAlternatives[canonicalExerciseId(exerciseId)] ?? null
}

/** تحقّق سلامة: كل معرّفات البدائل موجودة في exercises.ts — يُرجع المفقود (فارغة = سليم). */
export function missingAlternativeIds(): string[] {
  const ids = Object.values(machineAlternatives).flatMap((a) => [a.dumbbell, a.cable])
  return Array.from(new Set(ids)).filter((id) => !getExercise(id))
}
