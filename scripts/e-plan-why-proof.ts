// إثبات «لماذا هذه خطتك؟» (حارة E · المرحلة الثانية — الموجة ٣).
//
// ١) تغطية كاملة: كل مفتاح يمكن أن يخرج من طبقة التعليل له نصّ بالعربية
//    والإنجليزية — تُجمع المفاتيح من مصفوفة ملفّات حقيقية لا من قائمة يدوية.
// ٢) لا يتسرّب معرّف خام إلى الشاشة (لا `gen-ppl-6` ولا `notApplied` ولا `1to2y`).
// ٣) لغة القرار تتبع أساسه: المقيس حاسم والبنيوي متحفّظ (§6).
// ٤) المحاور غير المفعّلة معروضة لا مخفيّة (§5).
// ٥) المكوّن عرضي بحت، وRTL أولًا، وتسلسل عناوين سليم.

import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defaultProfile } from '@/lib/calculators'
import { generatePlan } from '@/lib/planGenerator'
import { buildPlanRationale } from '@/lib/planRationale'
import { PlanWhyPanel } from '@/components/plan/PlanWhyPanel'
import { ePlanStrings } from '@/i18n/dict/ePlan'
import type { EPlanStrings } from '@/i18n/dict/ePlan'
import type { Consistency, GoalType, MuscleFocus, PlannedSplit, Profile } from '@/types/profile'

let passed = 0
const failures: string[] = []

function check(label: string, condition: boolean): void {
  if (condition) {
    passed++
    console.log(`  ✓ ${label}`)
  } else {
    failures.push(label)
    console.log(`  ✗ ${label}`)
  }
}

const ARABIC = /[؀-ۿ]/

function profileFor(overrides: Partial<Profile> = {}): Profile {
  return {
    ...defaultProfile,
    age: 28,
    goalType: 'bulking' as GoalType,
    trainingDays: 4,
    workoutDuration: 60,
    trainingLevel: 'intermediate',
    experienceLevel: 'intermediate',
    experienceBand: '1to2y',
    splitMode: 'auto',
    muscleFocus: 'balanced',
    injuries: '',
    ...overrides,
  }
}

// ── مصفوفة ملفّات تغطّي كل محاور المحرّك ──
const GOALS: GoalType[] = ['cutting', 'bulking', 'maintenance', 'returning', 'health', 'recomposition']
const FOCI: MuscleFocus[] = ['balanced', 'upper', 'lower', 'core', 'chest', 'back', 'shoulders', 'arms']
const CONSISTENCY: Consistency[] = ['never', 'onoff', 'regular', 'returning']
const SPLITS: PlannedSplit[] = ['full_body', 'upper_lower', 'push_pull_legs', 'arnold', 'bro_split']

const matrix: Profile[] = [
  ...GOALS.map((goalType) => profileFor({ goalType })),
  ...FOCI.map((muscleFocus) => profileFor({ muscleFocus, trainingDays: 5 })),
  ...CONSISTENCY.map((consistency) => profileFor({ consistency })),
  ...SPLITS.map((splitChoice) => profileFor({ trainingDays: 5, splitMode: 'advanced', splitChoice })),
  ...[1, 2, 3, 4, 5, 6, 7].map((trainingDays) => profileFor({ trainingDays })),
  ...[30, 45, 60, 75, 90].map((workoutDuration) => profileFor({ workoutDuration })),
  ...(['lt1m', '1to6m', '6to12m', '1to2y', 'gt2y'] as const).map((experienceBand) => profileFor({ experienceBand })),
  ...(['beginner', 'intermediate', 'advanced'] as const).map((trainingLevel) =>
    profileFor({ trainingLevel, experienceBand: undefined }),
  ),
  profileFor({ workoutEnvironment: 'home', gymType: 'home', gymAccess: 'home' }),
  profileFor({ workoutEnvironment: 'home', gymType: 'bodyweight', gymAccess: 'bodyweight' }),
  profileFor({ gymType: 'small', gymAccess: 'small' }),
  profileFor({ injuries: 'ألم في الركبة knee' }),
  profileFor({ age: 15, goalType: 'cutting' }),
]

const rationales = matrix.map((p) => buildPlanRationale(p, generatePlan(p)))

console.log('\n═══ 1) EVERY EMITTED KEY HAS COPY IN BOTH LANGUAGES ═══')
const areas = new Set<string>()
const driverKeys = new Set<string>()
const outcomeKeys = new Set<string>()
const tokens = new Set<string>()
const axes = new Set<string>()
const reasons = new Set<string>()
const muscles = new Set<string>()
for (const r of rationales) {
  for (const d of r.decisions) {
    areas.add(d.area)
    outcomeKeys.add(d.outcome.key)
    if (typeof d.outcome.value === 'string') tokens.add(`${d.outcome.key}:${d.outcome.value}`)
    for (const dr of d.drivers) {
      driverKeys.add(dr.key)
      if (typeof dr.value === 'string') tokens.add(`${dr.key}:${dr.value}`)
    }
  }
  for (const v of r.weeklyVolume) muscles.add(v.muscle)
  for (const a of r.inactiveAxes) {
    axes.add(a.axis)
    reasons.add(a.reason)
  }
}

function coversAll(dict: EPlanStrings, keys: Set<string>, pick: (d: EPlanStrings) => Record<string, string>): boolean {
  const map = pick(dict)
  return [...keys].every((k) => typeof map[k] === 'string' && map[k].length > 0)
}

for (const lang of ['ar', 'en'] as const) {
  const dict = ePlanStrings[lang]
  check(`${lang}: all ${areas.size} decision areas are labelled`, coversAll(dict, areas, (d) => d.areaLabels))
  check(`${lang}: all ${driverKeys.size} driver keys have copy`, coversAll(dict, driverKeys, (d) => d.driverText))
  check(`${lang}: all ${outcomeKeys.size} outcome keys have copy`, coversAll(dict, outcomeKeys, (d) => d.outcomeText))
  check(`${lang}: all ${muscles.size} muscles are named`, coversAll(dict, muscles, (d) => d.muscleLabels))
  check(`${lang}: all ${axes.size} inactive axes are named`, coversAll(dict, axes, (d) => d.axisLabels))
  check(`${lang}: all ${reasons.size} axis reasons have copy`, coversAll(dict, reasons, (d) => d.axisReasons))
}
// المعرّفات المنظَّمة تُترجم عبر tokenLabels أو splitTitles أو goalLabels — لا رابع.
const unresolved = (lang: 'ar' | 'en') => {
  const d = ePlanStrings[lang]
  return [...tokens].filter((t) => {
    const value = t.slice(t.indexOf(':') + 1)
    // النطاق الرقمي («6–10») قيمة منظَّمة تُعرض بأرقام اللغة لا نصًّا مترجمًا.
    if (/^\d+[–-]\d+$/.test(value)) return false
    return !d.tokenLabels[t] && !d.splitTitles[value] && !d.goalLabels[value as GoalType]
  })
}
check(`ar: every structured token (${tokens.size}) resolves to copy`, unresolved('ar').length === 0)
check(`en: every structured token (${tokens.size}) resolves to copy`, unresolved('en').length === 0)
if (unresolved('ar').length) console.error(`   unresolved: ${unresolved('ar').join(', ')}`)
check(
  'ar and en expose the same token key set',
  JSON.stringify(Object.keys(ePlanStrings.ar.tokenLabels).sort()) === JSON.stringify(Object.keys(ePlanStrings.en.tokenLabels).sort()),
)

console.log('\n═══ 2) NO RAW IDENTIFIER REACHES THE SCREEN ═══')
// «bodyweight» ليس معرّفًا مسرَّبًا: هو نصّ إنجليزي صحيح في القاموس
// (`resolvedAccess:bodyweight` → «bodyweight only»)، ومقابله العربي «وزن الجسم».
const RAW_TOKEN = /\b(gen-[a-z0-9-]+|notApplied|extraSets|firstWeek|resolvedAccess|effectiveGoalType|templateId|weeklySets|exercisesPerDay|compoundReps|compoundRestSec|targetCalories|bro_split|push_pull_legs|upper_lower|full_body|1to2y|6to12m|lt1m|gt2y|1to6m|onoff)\b/
const leakSamples: string[] = []
for (const r of rationales) {
  for (const lang of ['ar', 'en'] as const) {
    const html = renderToStaticMarkup(h(PlanWhyPanel, { lang, rationale: r }))
    const text = html.replace(/<[^>]*>/g, ' ').replace(/&#x27;|&quot;|&amp;/g, ' ')
    const hit = text.match(RAW_TOKEN)
    if (hit) leakSamples.push(`${lang}:${hit[0]}`)
  }
}
const rawLeaks = leakSamples.length
check(`no raw identifier leaks across ${rationales.length * 2} renders`, rawLeaks === 0)
if (rawLeaks) console.error(`   leaked: ${[...new Set(leakSamples)].join(', ')}`)

const sample = rationales[0]
const ar = renderToStaticMarkup(h(PlanWhyPanel, { lang: 'ar', rationale: sample }))
const en = renderToStaticMarkup(h(PlanWhyPanel, { lang: 'en', rationale: sample }))
check('the English render carries no Arabic character', !ARABIC.test(en))
check('the same rationale renders differently per language', ar !== en)
check('the Arabic render is rtl', ar.includes('dir="rtl"'))
check('the English render is ltr', en.includes('dir="ltr"'))

console.log('\n═══ 3) DECISION LANGUAGE FOLLOWS ITS BASIS (§6) ═══')
check('measured decisions exist in the sample', sample.decisions.some((d) => d.basis === 'measured'))
check('structural decisions exist in the sample', sample.decisions.some((d) => d.basis === 'structural'))
check('the decisive prefix is rendered for measured decisions', en.includes(ePlanStrings.en.becauseMeasured))
check('the reserved prefix is rendered for structural decisions', en.includes(ePlanStrings.en.becauseStructural))
check('the two prefixes are not the same phrase', ePlanStrings.ar.becauseMeasured !== ePlanStrings.ar.becauseStructural)
check(
  'every decision in the sample is rendered as its own row',
  (ar.match(/border-s-2/g) ?? []).length === sample.decisions.length,
)

console.log('\n═══ 4) INACTIVE AXES ARE SHOWN, NOT HIDDEN (§5) ═══')
check('the inactive heading is rendered', en.includes(ePlanStrings.en.inactiveHeading))
check('training focus is named on screen', en.includes(ePlanStrings.en.axisLabels.trainingFocus))
check('past performance is named on screen', en.includes(ePlanStrings.en.axisLabels.pastPerformance))
check('the neutral reason is stated, not implied', en.includes(ePlanStrings.en.axisReasons.fieldNotCollected))
check('the same is true in Arabic', ar.includes(ePlanStrings.ar.axisLabels.trainingFocus) && ar.includes(ePlanStrings.ar.axisReasons.fieldNotCollected))
check('no line claims a focus was applied', !en.toLowerCase().includes('hypertrophy-focused') && !ar.includes('خصّصنا حسب تركيز التدريب'))

console.log('\n═══ 5) MEASURED VOLUME IS RENDERED AS MEASURED ═══')
check('the volume heading is rendered', en.includes(ePlanStrings.en.volumeHeading))
check(
  'every muscle row from the rationale is rendered',
  sample.weeklyVolume.every((v) => en.includes(ePlanStrings.en.muscleLabels[v.muscle])),
)
check(
  'the rendered set counts are the measured ones',
  sample.weeklyVolume.every((v) => en.includes(`${v.sets} sets · ${v.sessions} days`)),
)

console.log('\n═══ 6) PRESENTATIONAL ONLY, RTL FIRST, HEADINGS IN ORDER ═══')
const source = readFileSync(resolve(process.cwd(), 'src/components/plan/PlanWhyPanel.tsx'), 'utf8')
const body = source.replace(/\/\*[\s\S]*?\*\//g, '')
check('no localStorage access', !/localStorage/.test(body))
check('does not call the generator or the rationale builder', !/generatePlan\s*\(|buildPlanRationale\s*\(/.test(body))
check('holds no data state', !/useState|useReducer|useEffect/.test(body))
check('no hardcoded directional class', !/className="[^"]*\b(ml-|mr-|pl-|pr-|left-|right-|text-left|text-right)/.test(body))
check('exactly one h2', (ar.match(/<h2/g) ?? []).length === 1)
check('sections use h3', (ar.match(/<h3/g) ?? []).length >= 2)
check('no h1 inside the panel', !/<h1/.test(ar))
check('no heading level is skipped', !/<h[4-6]/.test(ar))
check('the panel is labelled by its own title', ar.includes('aria-labelledby="plan-why-title"'))

console.log(`\nE plan why: ${passed} passed, ${failures.length} failed`)
if (failures.length) {
  console.error(`Failed checks:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
