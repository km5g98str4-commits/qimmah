// ============================================================================
// test:serving-conversion — [CTO-009/WP-4] صدق تحويل «غرام ↔ حصة»
// ============================================================================
// WP-4 ليست تلميعًا بصريًا بمجرّد دخول الحصص: الرقم الذي يكتبه المستخدم يصير
// سعرات تُخزَّن. فالتحويل يُثبَت لا يُفترض.
//
// ما يحرسه:
//   ① كل صنف يملك `servingGrams` — فالحصة قابلة للاشتقاق ولا تُخترع أبدًا.
//   ② الغرام وحدة الحساب الوحيدة: مدخل الحصة يُحوَّل قبل أي حساب ماكروز،
//      فلا مساران للحقيقة (`gramsNum` نقطة واحدة في المكوّن).
//   ③ الرحلة ذهابًا وإيابًا لا تفقد معنى: حصة → غرام → حصة تعود لنفسها.
//   ④ الحدود مصونة: الحصص لا تتجاوز سقف الغرامات ولا تنزل تحت أرضيّته.
// ============================================================================
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8')

let pass = 0
const fails = []
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ✓ ${name}${detail ? `  — ${detail}` : ''}`) }
  else { fails.push(name); console.log(`  ✗ FAIL  ${name}${detail ? `  — ${detail}` : ''}`) }
}

console.log('\n🥗 تحويل الكمية: غرام ↔ حصة\n')

// ── ① تغطية servingGrams على كل مصادر الطعام ────────────────────────────────
for (const f of ['src/data/foodItems.ts', 'src/data/saudiFoods.ts']) {
  const s = read(f)
  const parts = s.split(/\n\s*\{\s*\n?\s*id: '/).slice(1)
  const without = parts.filter((p) => !/servingGrams:\s*\d/.test(p.split(/\n\s*\},?\s*\n/)[0]))
  check(`${f.split('/').pop()}: كل صنف يملك servingGrams`, without.length === 0,
    without.length ? `${without.length} بلا حصة` : `${parts.length} صنفًا`)
}

// ── ② سلطة واحدة: الغرام. الحصة تُحوَّل قبل الحساب ─────────────────────────
const logger = read('src/components/nutrition/QuickMealLogger.tsx')
check('مدخل الحصة يمرّ عبر gramsNum لا عبر مسار حساب ثانٍ',
  /const gramsNum =[\s\S]{0,320}?unit === 'serv'[\s\S]{0,200}?\* baseGrams/.test(logger))
check('الماكروز تُحسب من factor المشتقّ من الغرام وحده',
  /const factor = gramsNum \/ baseGrams/.test(logger) &&
  /calories: round\(baseCal \* factor\)/.test(logger))
check('المخزَّن يحمل الغرامات الفعلية', /grams: gramsNum/.test(logger))
// لا تُخترع حصة: الأساس يرجع إلى ١٠٠غ فقط حين لا يعلن الصنف حصّته.
check('لا اختراع حصة حين لا تُعلَن', /servingGrams > 0 \? selected\.servingGrams : 100/.test(logger))

// ── ③ الرحلة ذهابًا وإيابًا على أرقام حقيقية ───────────────────────────────
// نفس معادلة المكوّن حرفيًا — لو تغيّرت هناك ولم تتغيّر هنا يسقط الإثبات.
const toGrams = (servings, baseGrams) =>
  Math.min(3000, Math.max(1, Math.round(servings * baseGrams)))

const CASES = [
  { name: 'رز أبيض (كوب ٢٠٠غ)', baseGrams: 200, baseCal: 260, servings: 2, grams: 400, cal: 520 },
  { name: 'حصة ١٠٠غ', baseGrams: 100, baseCal: 150, servings: 1, grams: 100, cal: 150 },
  { name: 'نصف حصة', baseGrams: 180, baseCal: 200, servings: 0.5, grams: 90, cal: 100 },
  { name: 'ربع حصة', baseGrams: 240, baseCal: 400, servings: 0.25, grams: 60, cal: 100 },
]
for (const c of CASES) {
  const g = toGrams(c.servings, c.baseGrams)
  const cal = Math.round(c.baseCal * (g / c.baseGrams))
  check(`${c.name}: ${c.servings} حصة = ${c.grams}غ و${c.cal} سعرة`,
    g === c.grams && cal === c.cal, `نتج ${g}غ / ${cal} سعرة`)
}

// ذهاب وإياب: غرام → حصة → غرام يعود لنفسه على كل الأسس الشائعة
const bases = [30, 100, 150, 180, 200, 240, 350]
const roundTrip = bases.every((b) => [1, 2, 3].every((s) => toGrams(toGrams(s, b) / b, b) === toGrams(s, b)))
check('ذهاب وإياب بلا انحراف تراكمي', roundTrip, `${bases.length} أساسًا × ٣ حصص`)

// ── ④ الحدود ───────────────────────────────────────────────────────────────
check('السقف محفوظ: حصص ضخمة لا تتجاوز ٣٠٠٠غ', toGrams(20, 350) === 3000, `${toGrams(20, 350)}`)
check('الأرضية محفوظة: حصة دقيقة لا تنزل تحت ١غ', toGrams(0.25, 2) === 1, `${toGrams(0.25, 2)}`)

// ── الخلاصة ────────────────────────────────────────────────────────────────
console.log(`\n${fails.length ? '⛔' : '🎉'} ${pass} نجحت / ${fails.length} فشلت\n`)
if (fails.length) { fails.forEach((f) => console.log(`   ✗ ${f}`)); process.exit(1) }
