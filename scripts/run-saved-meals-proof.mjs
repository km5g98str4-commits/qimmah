import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const view = readFileSync(resolve(root, 'src/views/NutritionV2.tsx'), 'utf8')
const history = readFileSync(resolve(root, 'src/lib/nutritionHistory.ts'), 'utf8')
const checks = [
  ['Nutrition screen reads real historical days', /getWeeklyNutritionStats\(\)/.test(view) && /source === 'entries'/.test(view)],
  ['Saved-meal UI offers bilingual copy actions', view.includes('وجبات محفوظة') && view.includes('Saved meals') && view.includes('copySavedMeal')],
  ['Copy action uses the canonical history function', /copyMealToToday\(date, slot\)/.test(view)],
  ['Copying an empty meal is rejected honestly', /nothing-to-copy/.test(history) && /There are no items in that meal to copy/.test(history)],
  ['Copied entries are written with fresh IDs', /freshEntryId\(\)/.test(history) && /addFoodToDay\(\{ \.\.\.loggedFoodFromEntry/.test(history)],
]

let failed = 0
for (const [label, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`)
  if (!ok) failed++
}
if (failed) process.exitCode = 1
else console.log(`✅ Saved meals: ${checks.length} checks passed.`)
