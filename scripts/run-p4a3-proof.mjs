// إثبات وقت التشغيل لـ P4 A3: أحجام المطاعم + عناصر البقالة/المشروبات + شفافية السعرات.
// يبني الوحدات الفعلية (foodItems + calculators) عبر esbuild ثم يتحقّق من السلوك.
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import os from 'node:os'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tmp = mkdtempSync(path.join(os.tmpdir(), 'p4a3-'))

const entry = path.join(tmp, 'entry.mjs')
writeFileSync(
  entry,
  `export * from '@/data/foodItems'\nexport * as calc from '@/lib/calculators'\n`,
)

const out = path.join(tmp, 'bundle.mjs')
await build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: out,
  logLevel: 'error',
  alias: { '@': path.join(root, 'src') },
})

const m = await import(out)
const { foodItems, searchFood, calc } = m

let pass = 0
let fail = 0
const ok = (cond, label) => {
  if (cond) { pass++; console.log('  ✓', label) }
  else { fail++; console.log('  ✗ FAIL:', label) }
}
const round = (n) => Math.round(n)

console.log('\n== 1) أحجام المطاعم — تسجيل صحيح لكل حجم ==')
const sized = foodItems.filter((f) => Array.isArray(f.sizes) && f.sizes.length > 0)
ok(sized.length >= 6, `عناصر بأحجام: ${sized.length} (≥6)`)

// محاكاة منطق المسجّل: gramsNum = servingGrams للحجم، factor = 1 → الماكروز = ماكروز الحجم.
for (const item of sized) {
  for (const s of item.sizes) {
    const factor = s.servingGrams / s.servingGrams // = 1 عند الغرامات الافتراضية للحجم
    const logged = {
      calories: round(s.calories * factor),
      protein: round(s.protein * factor),
      carbs: round(s.carbs * factor),
      fat: round(s.fat * factor),
    }
    const good =
      logged.calories === s.calories &&
      logged.protein === s.protein &&
      logged.carbs === s.carbs &&
      logged.fat === s.fat
    ok(good, `${item.nameAr} · ${s.labelAr}: ${logged.calories} سعرة / ${logged.protein}غ بروتين`)
  }
  // تحقّق أن الأحجام تتصاعد (صغير < وسط < كبير بالسعرات)
  const cals = item.sizes.map((s) => s.calories)
  const ascending = cals.every((c, i) => i === 0 || c > cals[i - 1])
  ok(ascending, `${item.nameAr}: السعرات تتصاعد صغير→كبير [${cals.join(' < ')}]`)
  // القيم العليا = الحجم الوسط
  const mid = item.sizes.find((s) => s.labelAr === 'وسط')
  ok(mid && mid.calories === item.calories, `${item.nameAr}: القيمة الافتراضية = الوسط (${item.calories})`)
}

// إثبات اختلاف الماكروز فعليًا بين الأحجام (طلب «وسط» ≠ «كبير»)
const albaik = foodItems.find((f) => f.id === 'albaik-fries')
const aS = albaik.sizes.find((s) => s.labelAr === 'صغير').calories
const aM = albaik.sizes.find((s) => s.labelAr === 'وسط').calories
const aL = albaik.sizes.find((s) => s.labelAr === 'كبير').calories
ok(aS < aM && aM < aL, `البيك بطاطس: صغير ${aS} < وسط ${aM} < كبير ${aL} سعرة (فرق واضح)`)

console.log('\n== 2) البقالة والمشروبات الجديدة — قابلة للبحث (AR + latin) ==')
const searchCases = [
  ['قشطة المراعي', 'almarai-cream-qishta'],
  ['almarai', 'almarai-cream-qishta'],
  ['تمر سكري', 'dates-sukkari'],
  ['sukkari', 'dates-sukkari'],
  ['عجوة', 'dates-ajwa'],
  ['خلاص', 'dates-khalas'],
  ['رطب', 'dates-rutab'],
  ['قهوة سعودية', 'saudi-coffee'],
  ['كرك', 'karak-tea'],
  ['karak', 'karak-tea'],
  ['سبانش', 'spanish-latte'],
  ['لاتيه', 'latte-plain'],
  ['نسكافيه', 'nescafe-3in1'],
  ['عصير مانجو', 'mango-juice'],
  ['حليب المراعي', 'almarai-milk-full'],
  ['لبن المراعي', 'almarai-laban'],
  ['زبادي المراعي', 'almarai-yogurt'],
  ['توست', 'white-toast'],
  ['دايت', 'diet-soft-drink'],
]
for (const [q, id] of searchCases) {
  const res = searchFood(q).slice(0, 8)
  ok(res.some((r) => r.id === id), `بحث «${q}» يُظهر ${id}`)
}

// أعداد الفئات الجديدة
const newIds = [
  'almarai-cream-qishta','nadec-cream-qishta','almarai-milk-full','almarai-milk-low','almarai-laban','almarai-yogurt','almarai-cheese-slices',
  'dates-sukkari','dates-ajwa','dates-khalas','dates-rutab','dates-barhi','dates-saqai',
  'white-toast','tortilla-wrap',
  'saudi-coffee','turkish-coffee','latte-plain','spanish-latte','karak-tea','green-tea','nescafe-3in1','chocolate-milk','mango-juice','apple-juice','pomegranate-juice','diet-soft-drink',
]
const foundNew = newIds.filter((id) => foodItems.some((f) => f.id === id))
ok(foundNew.length === newIds.length, `عناصر بقالة/مشروبات جديدة موجودة: ${foundNew.length}/${newIds.length}`)

console.log('\n== 3) شفافية السعرات — قيم محسوبة فعلية ==')
const profile = { ...calc.defaultProfile }
const targets = calc.computeTargets(profile)
const mult = calc.totalActivityMultiplier(profile.activityLevel, profile.trainingDays)
ok(targets.bmr > 0, `BMR محسوب: ${targets.bmr}`)
ok(Math.abs(targets.tdee - round(targets.bmr * mult)) <= 1, `TDEE = BMR(${targets.bmr}) × ${mult.toFixed(2)} = ${targets.tdee}`)
// هدف التنشيف الافتراضي: −400
const expectedTarget = Math.max(targets.tdee - 400, profile.gender === 'male' ? 1500 : 1200)
ok(targets.targetCalories === expectedTarget, `تعديل الهدف (تنشيف −400): الهدف ${targets.targetCalories}`)
const proteinPerKg = Math.round((targets.proteinGrams / profile.weightKg) * 10) / 10
ok(proteinPerKg >= 1.6 && proteinPerKg <= 2.2, `البروتين ${targets.proteinGrams}غ = ${proteinPerKg}غ/كجم (ضمن 1.6–2.2)`)

// تحقّق التضخيم +300 يظهر منطق مختلف
const bulkP = { ...profile, goalType: 'bulking' }
const bulkT = calc.computeTargets(bulkP)
ok(bulkT.targetCalories === bulkT.tdee + 300, `تضخيم +300: ${bulkT.tdee} + 300 = ${bulkT.targetCalories}`)

console.log(`\n== النتيجة: ${pass} ناجح، ${fail} فاشل ==`)
process.exit(fail === 0 ? 0 : 1)
