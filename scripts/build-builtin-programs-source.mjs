#!/usr/bin/env node
// يولّد `src/data/builtInProgramsSource.generated.ts` من مجموعة البيانات المعتمدة
// `data-prep/exercise/QIM_MACHINE_WORKOUT_PROGRAMS.json` (Dataset B، برهان ١٢/١٢).
//
// لماذا مولّد لا قراءة JSON وقت التشغيل: الوقت التشغيلي لا يقرأ JSON خامًا أبدًا —
// يستورد وحدةً **مطبوعة الأنواع** مبنيّة مرّة واحدة ومُلتزمة في المستودع، فيبقى
// تحقّق الأنواع والـtree-shaking والبوابة كلها عاملة.
//
// كل ثابت من ثوابت Dataset B يُفحص هنا **قبل** الكتابة، وأي خرق يُسقط التوليد
// بصوت عالٍ: لا إصلاح صامت ولا كتابة ملف نصف صحيح.
//
// إعادة التوليد: node scripts/build-builtin-programs-source.mjs
// الحارس:        npm run test:builtin-templates

import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const DATASET = join(ROOT, 'data-prep/exercise/QIM_MACHINE_WORKOUT_PROGRAMS.json')
const OUT = join(ROOT, 'src/data/builtInProgramsSource.generated.ts')

const raw = readFileSync(DATASET, 'utf8')
const D = JSON.parse(raw)
const datasetSha = createHash('sha256').update(raw).digest('hex')

const die = (msg) => { console.error(`\n✗ BUILD ABORTED — ${msg}\n`); process.exit(1) }

// Dataset B program id → the runtime template id already shipped on this branch.
// المعرّفات القائمة تُحفظ كما هي: خطط المستخدمين المحفوظة تشير إليها.
const PROGRAM_ID_MAP = {
  'ul-4day-machines': 'builtin-upper-lower-4',
  'fullbody-3day-machines': 'builtin-full-body-3',
  'ppl-6day-machines': 'builtin-ppl-6',
  'ppl-3day-machines': 'builtin-ppl-3',
  'ulf-3day-machines': 'builtin-upper-lower-full-3',
  'fullbody-2day-beginner': 'builtin-full-body-2',
  'ul-rotating-3day-machines': 'builtin-upper-lower-3',
  'beginner-machines-3day': 'builtin-beginner-machines-3',
}

// Dataset B variant id → day-kind key used by the i18n dictionary.
const DAY_KIND_MAP = {
  'upper-a': 'upperA', 'upper-b': 'upperB',
  'lower-a': 'lowerA', 'lower-b': 'lowerB',
  'legs-a': 'legsA', 'legs-b': 'legsB',
  'fb-a': 'fullA', 'fb-b': 'fullB', 'fb-c': 'fullC',
  'push-a': 'pushA', 'push-b': 'pushB',
  'pull-a': 'pullA', 'pull-b': 'pullB',
  'ulf-upper': 'upperCompact',
  'beg-fb-a': 'begFullA', 'beg-fb-b': 'begFullB',
  'machines-a': 'machinesA', 'machines-b': 'machinesB', 'machines-c': 'machinesC',
}

// ── ثوابت Dataset B تُعاد فحصها هنا، لا تُفترض ──────────────────────────────
const variants = D.workout_variants
const sessions = D.canonical_sessions

for (const [vid, v] of Object.entries(variants)) {
  if (!DAY_KIND_MAP[vid]) die(`variant '${vid}' has no day-kind mapping — refusing to invent one`)
  const s = sessions[v.canonical_session_id]
  if (!s) die(`variant '${vid}' points at missing canonical session '${v.canonical_session_id}'`)
  if (v.exercise_count !== s.exercise_count) die(`variant '${vid}' count echo ${v.exercise_count} ≠ session ${s.exercise_count}`)
}
for (const [sid, s] of Object.entries(sessions)) {
  const ids = s.exercises.map((e) => e.exercise_id)
  if (ids.length < 2) die(`session '${sid}' has ${ids.length} exercise(s) — a session must never collapse to one`)
  if (ids.length !== s.exercise_count) die(`session '${sid}' declares ${s.exercise_count} but holds ${ids.length}`)
  if (new Set(ids).size !== ids.length) die(`session '${sid}' repeats an exercise id`)
  const orders = s.exercises.map((e) => e.order)
  if (JSON.stringify(orders) !== JSON.stringify(orders.map((_, i) => i + 1))) die(`session '${sid}' order is not exactly 1..N`)
}
for (const p of D.programs) {
  if (!PROGRAM_ID_MAP[p.id]) die(`program '${p.id}' has no runtime template id mapping`)
  for (const entry of p.schedule) {
    if (entry.type !== 'workout') continue
    if (!variants[entry.variant_id]) die(`program '${p.id}' day ${entry.day} references unresolvable variant '${entry.variant_id}'`)
  }
  for (const vid of p.rotation?.sequence ?? []) {
    if (!variants[vid]) die(`program '${p.id}' rotation references unresolvable variant '${vid}'`)
  }
}
if (D.programs.length !== 8) die(`expected 8 programs, dataset carries ${D.programs.length}`)

// ── الإخراج ────────────────────────────────────────────────────────────────
const q = (s) => `'${String(s).replace(/'/g, "\\'")}'`
const sessionEntries = Object.entries(sessions).map(([sid, s]) => `  ${q(sid)}: {
    id: ${q(sid)},
    warmupId: ${q(s.warmup_id)},
    prescriptionTier: ${q(s.prescription_tier)},
    exerciseIds: [${s.exercises.map((e) => q(e.exercise_id)).join(', ')}],
  },`).join('\n')

const variantEntries = Object.entries(variants).map(([vid, v]) => `  ${q(vid)}: { id: ${q(vid)}, dayKind: ${q(DAY_KIND_MAP[vid])}, sessionId: ${q(v.canonical_session_id)} },`).join('\n')

const programEntries = D.programs.map((p) => {
  const scheduleDays = p.schedule.map((e) => `      { day: ${e.day}, type: ${q(e.type)}, variantId: ${e.type === 'workout' ? q(e.variant_id) : 'null'} },`).join('\n')
  const rotation = p.rotation
    ? `    rotation: { cycleWeeks: ${p.rotation.cycle_weeks}, sequence: [${p.rotation.sequence.map(q).join(', ')}], weeks: [${(p.weeks_preview ?? []).map((w) => `{ week: ${w.week}, variantIds: [${w.variant_ids.map(q).join(', ')}] }`).join(', ')}] },`
    : '    rotation: null,'
  return `  {
    templateId: ${q(PROGRAM_ID_MAP[p.id])},
    datasetProgramId: ${q(p.id)},
    order: ${p.order},
    daysPerWeek: ${p.days_per_week},
    level: ${q(p.level)},
    variantIds: [${p.workout_variant_ids.map(q).join(', ')}],
    schedule: [
${scheduleDays}
    ],
${rotation}
  },`
}).join('\n')

// خريطة البدائل المعتمدة — جهاز/كيبل فقط، من نفس المجموعة.
const subs = {}
for (const s of Object.values(sessions)) {
  for (const e of s.exercises) {
    if (!subs[e.exercise_id]) subs[e.exercise_id] = e.substitutions.map((x) => x.exercise_id)
  }
}
const subEntries = Object.entries(subs).sort().map(([k, v]) => `  ${q(k)}: [${v.map(q).join(', ')}],`).join('\n')

const dayKindUnion = Object.values(DAY_KIND_MAP).map((k) => `  | ${q(k)}`).join('\n')

const out = `// ⚙️ ملف مُولّد آليًا — لا تُحرّره يدويًا.
// المولّد: scripts/build-builtin-programs-source.mjs
// المصدر:  data-prep/exercise/QIM_MACHINE_WORKOUT_PROGRAMS.json (Dataset B)
// إعادة التوليد: node scripts/build-builtin-programs-source.mjs
// الحارس: npm run test:builtin-templates
//
// بصمة المصدر (sha256): ${datasetSha}
//
// هذا هو **مصدر الحقيقة الوحيد** لمحتوى البرامج الجاهزة. الجلسة القانونية
// تُكتب مرّة واحدة في \`builtInSessions\`، و\`builtInVariants\` تسميات تشير إليها —
// فيومَا «سفلي أ» و«أرجل أ» يتشاركان تعريفًا واحدًا ولا يتباعدان بالسهو.

/** نوع اليوم كما يقرؤه القاموس — تسمية معروضة، لا الجلسة نفسها. */
export type BuiltInDayKind =
${dayKindUnion}

export interface BuiltInSessionSource {
  readonly id: string
  readonly warmupId: string
  readonly prescriptionTier: string
  /** بترتيب Q19 القانوني — الفهرس هو ترتيب الأداء. */
  readonly exerciseIds: readonly string[]
}

export interface BuiltInVariantSource {
  readonly id: string
  readonly dayKind: BuiltInDayKind
  readonly sessionId: string
}

export interface BuiltInScheduleEntry {
  readonly day: number
  readonly type: string
  readonly variantId: string | null
}

export interface BuiltInRotation {
  readonly cycleWeeks: number
  readonly sequence: readonly string[]
  readonly weeks: readonly { readonly week: number; readonly variantIds: readonly string[] }[]
}

export interface BuiltInProgramSource {
  readonly templateId: string
  readonly datasetProgramId: string
  readonly order: number
  readonly daysPerWeek: number
  readonly level: string
  readonly variantIds: readonly string[]
  readonly schedule: readonly BuiltInScheduleEntry[]
  readonly rotation: BuiltInRotation | null
}

/** بصمة مجموعة البيانات التي وُلّد منها هذا الملف — يفحصها الحارس. */
export const DATASET_B_SHA256 = '${datasetSha}'

/** الجلسات القانونية — مصفوفة التمارين تعيش هنا وحدها. */
export const builtInSessions: Record<string, BuiltInSessionSource> = {
${sessionEntries}
}

/** التسميات المعروضة، وكلٌّ يشير إلى جلسة قانونية (المشاركة = اسمان لجلسة واحدة). */
export const builtInVariants: Record<string, BuiltInVariantSource> = {
${variantEntries}
}

/** البرامج الثمانية بترتيب العرض. */
export const builtInProgramSources: readonly BuiltInProgramSource[] = [
${programEntries}
]

/** البدائل المعتمدة لكل تمرين مبرمَج — أجهزة/كيبل فقط، بنفس وظيفة الحركة. */
export const builtInSubstitutions: Record<string, readonly string[]> = {
${subEntries}
}
`

writeFileSync(OUT, out)
const sessionCount = Object.keys(sessions).length
const aliasCount = Object.values(sessions).filter((s) => s.surfaced_by_variants.length > 1).length
console.log(`builtInProgramsSource.generated.ts written`)
console.log(`  programs=${D.programs.length} sessions=${sessionCount} variants=${Object.keys(variants).length} aliases=${aliasCount} substitutions=${Object.keys(subs).length}`)
console.log(`  dataset sha256=${datasetSha.slice(0, 16)}…`)
