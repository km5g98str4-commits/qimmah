// P3-A2 runtime proof — bundles real source with esbuild (resolving @/ alias) and exercises
// the nutrition logic in Node. Not shipped; a verification harness only.
import esbuild from 'esbuild'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const entry = `
export { searchFood, normalizeSearch, getFood } from '@/data/foodItems'
export { generateNutrition } from '@/lib/planGenerator'
export { mealAlternatives } from '@/lib/nutritionPlan'
export { templateAllowedForDiet, ingredientSource, ingredientAllowedForDiet } from '@/lib/dietFilter'
export { mealTemplates, getMealTemplate } from '@/data/mealTemplates'
export { defaultProfile, computeTargets } from '@/lib/calculators'
`

const res = await esbuild.build({
  stdin: { contents: entry, resolveDir: root, loader: 'ts' },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'error',
  plugins: [{
    name: 'alias',
    setup(b) {
      b.onResolve({ filter: /^@\// }, (a) => {
        const base = path.join(root, 'src', a.path.slice(2))
        for (const cand of [base, base + '.ts', base + '.tsx', path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
          if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return { path: cand }
        }
        return { path: base }
      })
    },
  }],
})

const mod = await import('data:text/javascript;base64,' + Buffer.from(res.outputFiles[0].text).toString('base64'))

const {
  searchFood, normalizeSearch, generateNutrition, mealAlternatives,
  templateAllowedForDiet, ingredientSource, mealTemplates,
  defaultProfile, computeTargets,
} = mod

let pass = 0, fail = 0
const ok = (name, cond, extra = '') => {
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`)
  cond ? pass++ : fail++
}

console.log('\n=== TASK 2: GRAM LOGGING MATH (200g of a dish) ===')
// كبسة دجاج: صحن 350غ → 620 سعرة، 35 بروتين، 65 كارب، 24 دهون
const kabsa = mod.getFood('kabsa-chicken')
const grams = 200
const factor = grams / kabsa.servingGrams
const logged = {
  calories: Math.round(kabsa.calories * factor),
  protein: Math.round(kabsa.protein * factor),
  carbs: Math.round(kabsa.carbs * factor),
  fat: Math.round(kabsa.fat * factor),
}
console.log(`   كبسة دجاج base(${kabsa.servingGrams}g)=${kabsa.calories}kcal → 200g =`, logged)
ok('200g calories = round(620*200/350)=354', logged.calories === 354, `${logged.calories}`)
ok('200g protein = round(35*200/350)=20', logged.protein === 20, `${logged.protein}`)
ok('200g carbs = round(65*200/350)=37', logged.carbs === 37, `${logged.carbs}`)
ok('200g fat = round(24*200/350)=14', logged.fat === 14, `${logged.fat}`)
const target = 2200
ok('remaining decrements: 2200 - 354 = 1846', target - logged.calories === 1846)

console.log('\n=== TASK 3: DIET FILTER ===')
ok("ingredientSource('chicken-breast') = meat", ingredientSource('chicken-breast') === 'meat')
ok("ingredientSource('salmon') = fish", ingredientSource('salmon') === 'fish')
ok("ingredientSource('eggs') = egg", ingredientSource('eggs') === 'egg')
ok("ingredientSource('whey-protein') = dairy", ingredientSource('whey-protein') === 'dairy')
ok("ingredientSource('lentils') = plant", ingredientSource('lentils') === 'plant')

// auto-meal generation per diet
const mkProfile = (dietPattern) => ({ ...defaultProfile, trackNutrition: true, mealsPerDay: 4, nutritionDisplayStyle: 'meal_suggestions', dietPattern })
const targets = computeTargets(defaultProfile)
const sourcesOf = (plan) => plan.meals.flatMap((m) => m.ingredients.map((mi) => ingredientSource(mi.ingredientId)))

for (const [diet, forbidden, allowed] of [
  ['vegetarian', ['meat', 'fish'], ['egg', 'dairy', 'plant']],
  ['vegan', ['meat', 'fish', 'egg', 'dairy', 'honey'], ['plant']],
  ['pescatarian', ['meat'], ['fish', 'egg', 'dairy', 'plant']],
]) {
  const { plan } = generateNutrition(mkProfile(diet), targets)
  const srcs = sourcesOf(plan)
  const bad = srcs.filter((s) => forbidden.includes(s))
  ok(`auto-meals [${diet}] exclude ${forbidden.join('/')}`, bad.length === 0, `meals=${plan.meals.length} sources={${[...new Set(srcs)].join(',')}}`)
  if (diet === 'pescatarian') ok('pescatarian KEEPS fish available (some template)', mealTemplates.some((t) => templateAllowedForDiet(t, 'pescatarian') && t.ingredientIds.some((i) => ingredientSource(i) === 'fish')))
}

// edge case: vegan with 5 meals/day (adds protein-shake slot which is dairy) must still be compliant
const vegan5 = generateNutrition({ ...mkProfile('vegan'), mealsPerDay: 5 }, targets)
const vegan5bad = sourcesOf(vegan5.plan).filter((s) => s !== 'plant')
ok('vegan @ 5 meals/day stays plant-only (post-workout slot swapped)', vegan5bad.length === 0, `meals=${vegan5.plan.meals.length} sources={${[...new Set(sourcesOf(vegan5.plan))].join(',')}}`)

// none = no exclusion
const noneSrcs = sourcesOf(generateNutrition(mkProfile('none'), targets).plan)
ok("diet 'none' keeps meat (no exclusion)", noneSrcs.includes('meat'))

// mealAlternatives filtering
const meatMeal = { id: 'x', nameAr: 'دجاج وأرز', nameEn: 'Chicken & Rice', mealType: 'lunch', ingredients: [{ ingredientId: 'chicken-breast', servings: 1 }], calories: 400, protein: 40, carbs: 40, fat: 10, order: 1 }
const vegAlts = mealAlternatives(meatMeal, 'vegetarian')
const vegAltHasMeatFish = vegAlts.some((a) => a.ingredients.some((mi) => ['meat', 'fish'].includes(ingredientSource(mi.ingredientId))))
ok('mealAlternatives(vegetarian) has no meat/fish', !vegAltHasMeatFish, `${vegAlts.length} alts`)

console.log('\n=== TASK 4: SEARCH QUALITY (normalization / synonyms) ===')
ok("normalize كبسة == كبسه", normalizeSearch('كبسة') === normalizeSearch('كبسه'))
const kabsehResults = searchFood('كبسه') // misspelled (ه instead of ة)
ok("search 'كبسه' finds كبسة dishes", kabsehResults.some((f) => f.id === 'kabsa-chicken'), `${kabsehResults.length} results, top=${kabsehResults[0]?.nameAr}`)
const latin = searchFood('albaik')
ok("latin 'albaik' finds AlBaik items", latin.length > 0 && latin.every((f) => f.category === 'مطاعم'), `${latin.length} results`)
const jumbo = searchFood('جمبري')
ok("synonym 'جمبري' finds روبيان (shrimp)", jumbo.some((f) => f.id === 'shrimp'))
const dajaj = searchFood('دجاج')
ok("Arabic-first ranking: 'دجاج' top result is Arabic-name match", dajaj.length > 0 && normalizeSearch(dajaj[0].nameAr).includes('دجاج'), `top=${dajaj[0]?.nameAr}`)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
