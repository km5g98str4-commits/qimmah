// إثبات الشاشة المضيفة لمعاينة الخطة (حارة E · المرحلة الثانية — الموجة ٥).

import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defaultProfile } from '@/lib/calculators'
import { generatePlan } from '@/lib/planGenerator'
import { buildPlanRationale } from '@/lib/planRationale'
import { getExercise } from '@/data/exercises'
import { PlanPreviewView, type PlanPreviewViewState } from '@/views/PlanPreviewView'
import { ePlanStrings } from '@/i18n/dict/ePlan'

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

const noop = () => undefined
const common = { onBack: noop, onRetry: noop, onEdit: noop, onSave: noop }
const plan = generatePlan(defaultProfile)
const rationale = buildPlanRationale(defaultProfile, plan)

function render(lang: 'ar' | 'en', state: PlanPreviewViewState): string {
  return renderToStaticMarkup(h(PlanPreviewView, { lang, state, ...common }))
}

const loadingAr = render('ar', { status: 'loading' })
const emptyAr = render('ar', { status: 'empty' })
const errorAr = render('ar', { status: 'error' })
const filledAr = render('ar', { status: 'filled', plan, goalType: defaultProfile.goalType, rationale })
const filledEn = render('en', { status: 'filled', plan, goalType: defaultProfile.goalType, rationale })

console.log('\n═══ 1) FOUR EXPLICIT STATES ═══')
check('loading state announces busy content', loadingAr.includes('aria-busy="true"') && loadingAr.includes(ePlanStrings.ar.loadingTitle))
check('empty state explains the missing input', emptyAr.includes(ePlanStrings.ar.emptyTitle) && emptyAr.includes(ePlanStrings.ar.emptyBody))
check('empty state can return to the answers', emptyAr.includes(ePlanStrings.ar.editAnswers))
check('error state is an alert', errorAr.includes('role="alert"'))
check('error state exposes retry and edit actions', errorAr.includes(ePlanStrings.ar.retry) && errorAr.includes(ePlanStrings.ar.editAnswers))
check('filled state has its own test boundary', filledAr.includes('data-testid="plan-preview-filled"'))

console.log('\n═══ 2) THE REQUIRED PREVIEW CONTENT IS PRESENT ═══')
const firstDay = plan.workoutPlan.days[0]
check('the weekly summary is rendered', filledEn.includes(ePlanStrings.en.scheduleHeading))
check('the first full training day is rendered', filledEn.includes(ePlanStrings.en.firstDayHeading))
check(
  'every exercise in the first day is named',
  firstDay.exercises.every((planned) => {
    const exercise = getExercise(planned.exerciseId)
    return Boolean(exercise?.nameEn && filledEn.includes(exercise.nameEn))
  }),
)
check('sets, reps, and rest are shown for the first day', firstDay.exercises.every((planned) => filledEn.includes(String(planned.sets)) && filledEn.includes(planned.reps) && filledEn.includes(String(planned.restSec))))
check(
  'nutrition targets come from the generated plan',
  filledEn.includes(plan.targets.targetCalories.toLocaleString('en-US'))
    && filledEn.includes(plan.targets.proteinGrams.toLocaleString('en-US')),
)
check('nutrition targets are labelled as starting estimates', filledEn.includes(ePlanStrings.en.targetsNote))

console.log('\n═══ 3) WHY + SAVE CONTRACT ═══')
check('the why panel is composed into the host', filledEn.includes(ePlanStrings.en.whySummary) && filledEn.includes(ePlanStrings.en.whyTitle))
check('why disclosure uses native details semantics', filledEn.includes('<details') && filledEn.includes('<summary'))
check('save-plan CTA is visible in both languages', filledAr.includes(ePlanStrings.ar.savePlan) && filledEn.includes(ePlanStrings.en.savePlan))
check('CTA truthfully says account creation follows', filledAr.includes(ePlanStrings.ar.saveHint) && filledEn.includes(ePlanStrings.en.saveHint))
check('editing answers remains available from the filled state', filledAr.includes(ePlanStrings.ar.editAnswers))

console.log('\n═══ 4) BOUNDARIES, LANGUAGE, AND ACCESSIBILITY ═══')
const source = readFileSync(resolve(process.cwd(), 'src/views/PlanPreviewView.tsx'), 'utf8')
const body = source.replace(/\/\*[\s\S]*?\*\//g, '')
check('the host does not access storage', !/localStorage|safeStorage|readJson|writeJson/.test(body))
check('the host does not import auth or account ownership', !/authContext|accountScope|dataOwnership|LoginView/.test(body))
check('the host does not generate plans or rationales', !/generatePlan\s*\(|buildPlanRationale\s*\(/.test(body))
check('the English render contains no Arabic text', !/[؀-ۿ]/.test(filledEn))
check('Arabic is RTL and English is LTR', filledAr.includes('dir="rtl"') && filledEn.includes('dir="ltr"'))
check('the host owns exactly one h1', (filledEn.match(/<h1/g) ?? []).length === 1)
check('child sections start at h2', (filledEn.match(/<h2/g) ?? []).length >= 2)
check('every action is a real button', (filledAr.match(/<button/g) ?? []).length >= 3)
check('Arabic and English dictionaries expose the same keys', JSON.stringify(Object.keys(ePlanStrings.ar).sort()) === JSON.stringify(Object.keys(ePlanStrings.en).sort()))

console.log(`\nE plan preview host: ${passed} passed, ${failures.length} failed`)
if (failures.length) {
  console.error(`Failed checks:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
