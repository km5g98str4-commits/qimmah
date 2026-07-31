// إثبات معاينة الخطة (حارة E · المرحلة الثانية — الموجة ٢).
//
// ١) المكوّن عرضي بحت — لا تخزين ولا استدعاء للمولّد ولا حالة بيانات.
// ٢) الترجمة تحدث في العرض: نفس الخطة بايت ببايت تُعرض بلغتين مختلفتين.
// ٣) الأرقام المعروضة **مقيسة** من الخطة، لا مُعاد اشتقاقها في المكوّن.
// ٤) RTL أولًا: لا صنف اتجاهي ثابت، والاتجاه يتبدّل مع اللغة.
// ٥) وصولية: تسلسل عناوين سليم بلا قفز، وقائمة دلالية.

import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defaultProfile } from '@/lib/calculators'
import { generatePlan } from '@/lib/planGenerator'
import { PlanPreview } from '@/components/plan/PlanPreview'
import { ePlanStrings } from '@/i18n/dict/ePlan'
import type { GoalType, PlannedSplit, Profile } from '@/types/profile'

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

const plan = generatePlan(profileFor())
const renderAr = renderToStaticMarkup(h(PlanPreview, { lang: 'ar', plan, goalType: 'bulking' }))
const renderEn = renderToStaticMarkup(h(PlanPreview, { lang: 'en', plan, goalType: 'bulking' }))

console.log('\n═══ 1) PRESENTATIONAL ONLY — NO STORAGE, NO GENERATOR, NO DATA STATE ═══')
const source = readFileSync(resolve(process.cwd(), 'src/components/plan/PlanPreview.tsx'), 'utf8')
const body = source.replace(/\/\*[\s\S]*?\*\//g, '') // التعليقات تشرح المنع، فلا تُحسب خرقًا
check('no localStorage access', !/localStorage/.test(body))
check('no safeStorage / storage helper import', !/safeStorage|writeJson|readJson/.test(body))
check('does not call the generator', !/generatePlan\s*\(/.test(body))
check('holds no data state', !/useState|useReducer|useEffect/.test(body))
check('imports the plan type only, not plan data', /import type \{ GeneratedPlan \}/.test(body))

console.log('\n═══ 2) RTL FIRST — LOGICAL PROPERTIES ONLY ═══')
const DIRECTIONAL = /className="[^"]*\b(ml-|mr-|pl-|pr-|left-|right-|text-left|text-right)/
check('no hardcoded directional class in the component', !DIRECTIONAL.test(body))
check('Arabic render is rtl', renderAr.includes('dir="rtl"'))
check('English render is ltr', renderEn.includes('dir="ltr"'))

console.log('\n═══ 3) TRANSLATION HAPPENS IN THE VIEW, NOT IN THE SOURCE ═══')
check('the same plan object produces two different renders', renderAr !== renderEn)
check('the English render carries no Arabic character', !ARABIC.test(renderEn))
check('the Arabic render shows the Arabic split title', renderAr.includes(ePlanStrings.ar.splitTitles[plan.suggestedWorkoutTemplateId]))
check('the English render shows the English split title', renderEn.includes(ePlanStrings.en.splitTitles[plan.suggestedWorkoutTemplateId]))
check('the Arabic render shows the Arabic goal label', renderAr.includes(ePlanStrings.ar.goalLabels.bulking))
check('the English render shows the English goal label', renderEn.includes(ePlanStrings.en.goalLabels.bulking))
check(
  'the engine Arabic-only strings are not rendered',
  !renderEn.includes(plan.explanationAr) && !renderAr.includes(plan.explanationAr),
)

console.log('\n═══ 4) DICTIONARY COVERS EVERY TEMPLATE THE ENGINE CAN EMIT ═══')
check(
  'ar and en expose the same key set',
  JSON.stringify(Object.keys(ePlanStrings.ar).sort()) === JSON.stringify(Object.keys(ePlanStrings.en).sort()),
)
check(
  'ar and en split titles cover the same ids',
  JSON.stringify(Object.keys(ePlanStrings.ar.splitTitles).sort()) === JSON.stringify(Object.keys(ePlanStrings.en.splitTitles).sort()),
)
const emitted = new Set<string>()
for (let days = 1; days <= 7; days++) emitted.add(generatePlan(profileFor({ trainingDays: days })).suggestedWorkoutTemplateId)
const SPLITS: PlannedSplit[] = ['full_body', 'upper_lower', 'push_pull_legs', 'arnold', 'bro_split']
for (const splitChoice of SPLITS) {
  emitted.add(generatePlan(profileFor({ trainingDays: 5, splitMode: 'advanced', splitChoice })).suggestedWorkoutTemplateId)
}
check(`every emitted template id (${emitted.size}) has an Arabic title`, [...emitted].every((id) => Boolean(ePlanStrings.ar.splitTitles[id])))
check(`every emitted template id (${emitted.size}) has an English title`, [...emitted].every((id) => Boolean(ePlanStrings.en.splitTitles[id])))
check(
  'every goal type has a label in both languages',
  (['cutting', 'bulking', 'maintenance', 'returning', 'health', 'recomposition'] as GoalType[]).every(
    (g) => Boolean(ePlanStrings.ar.goalLabels[g]) && Boolean(ePlanStrings.en.goalLabels[g]),
  ),
)

console.log('\n═══ 5) THE NUMBERS SHOWN ARE THE PLAN NUMBERS ═══')
check('one row per training day', (renderEn.match(/<li /g) ?? []).length >= plan.workoutPlan.days.length)
check(
  'every day exercise count is rendered',
  plan.workoutPlan.days.every((d) => renderEn.includes(`${d.exercises.length} exercises`)),
)
check('the calorie target is rendered as computed', renderEn.includes(plan.targets.targetCalories.toLocaleString('en-US')))
check(
  'the same calorie number is shown in Arabic digits, not a different number',
  renderAr.includes(plan.targets.targetCalories.toLocaleString('ar-EG')),
)
check('the protein target is rendered as computed', renderEn.includes(`${plan.targets.proteinGrams} g`))
check(
  'a plan with more days renders more rows',
  (renderToStaticMarkup(h(PlanPreview, { lang: 'en', plan: generatePlan(profileFor({ trainingDays: 6 })), goalType: 'bulking' })).match(/<li /g) ?? []).length
    > (renderEn.match(/<li /g) ?? []).length,
)

console.log('\n═══ 6) ACCESSIBILITY — HEADING ORDER AND SEMANTICS ═══')
check('exactly one h2', (renderAr.match(/<h2/g) ?? []).length === 1)
check('sections use h3', (renderAr.match(/<h3/g) ?? []).length >= 2)
check('no h1 inside the card (the host screen owns it)', !/<h1/.test(renderAr))
check('no heading level is skipped (no h4+ without h3)', !/<h[4-6]/.test(renderAr))
check('the card is labelled by its own title', renderAr.includes('aria-labelledby="plan-preview-title"'))
check('day and macro rows are real lists', (renderAr.match(/<ul/g) ?? []).length >= 2)

console.log('\n═══ 7) OPTIONAL NOTES ARE THE CALLER’S, NOT THE COMPONENT’S ═══')
const withNotes = renderToStaticMarkup(
  h(PlanPreview, { lang: 'en', plan, goalType: 'bulking', notes: ['We started lighter this week.'] }),
)
check('notes render when supplied', withNotes.includes('We started lighter this week.'))
check('the notes heading is hidden when there are none', !renderEn.includes(ePlanStrings.en.notesHeading))
check('the notes heading appears with notes', withNotes.includes(ePlanStrings.en.notesHeading))

console.log(`\nE plan preview: ${passed} passed, ${failures.length} failed`)
if (failures.length) {
  console.error(`Failed checks:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
