// حارس «الوعد بالإحماء يساوي التسليم» — [SOVEREIGN-TODAY-001] المهمّة ١.
//
// ═══ العطل المحروس ═══
// «اليوم» كان يَعِد «إحماء قصير · دقيقتين»، و`WorkoutView.startDay` يدخل الجلسة
// الكاملة فورًا ثم يستدعي `completeFirstWin('warmup')` — أي يُبلّغ نجاح إحماء
// لم يقع. الحارس يمنع عودة أيٍّ من ضلعي العطل: الوعد بلا تسليم، والتبليغ بلا فعل.
//
// ═══ بنيوي ثم سلوكي ثم مهاجَم (§4.2) ═══
// القسم الأول يقرأ المصدر ويؤكّد أن نقطة التبليغ **داخل** مسار الإحماء وحده.
// القسم الثاني يشغّل الباني الحقيقي (`scripts/warmup-promise-proof.ts`).
// القسم الثالث **يهاجم** كل تأكيد بنيوي بنسخة ملتفّة من المصدر، ويشترط أن يسقط
// بفحصه المسمّى لا باستثناء تقني — فإحكامٌ لم يُهاجَم لا يُقبل.

import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const src = (p) => readFileSync(resolve(root, p), 'utf8')

let pass = 0
let fail = 0
const check = (label, cond) => {
  if (cond) { pass++; console.log(`  ✓ ${label}`) }
  else { fail++; console.log(`  ✗ FAIL: ${label}`) }
}

// ── الفحوص البنيوية، كلٌّ دالة على نصّ المصدر كي يمكن مهاجمتها بنصّ مُعدَّل ──

/**
 * يجرّد التعليقات قبل أي عدّ. **بدونه يكذب الحارس في الاتجاهين:** تعليقٌ يذكر
 * `completeFirstWin('warmup')` يرفع العدّ فيُسقط مصدرًا سليمًا، وكودٌ حقيقي
 * مُحوَّل إلى تعليق يخفض العدّ فيُمرِّر مصدرًا معطوبًا. الحدود تُحترم داخل
 * النصوص والقوالب فلا يُقصّ `https://` ولا `//` داخل سلسلة.
 */
const stripComments = (code) => {
  let out = ''
  let i = 0
  let quote = null
  while (i < code.length) {
    const c = code[i]
    const next = code[i + 1]
    if (quote) {
      out += c
      if (c === '\\') { out += next ?? ''; i += 2; continue }
      if (c === quote) quote = null
      i++
      continue
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; out += c; i++; continue }
    if (c === '/' && next === '/') { while (i < code.length && code[i] !== '\n') i++; continue }
    if (c === '/' && next === '*') {
      i += 2
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++
      i += 2
      continue
    }
    // تعليقات JSX ‏`{/* … */}` تسقط بالقاعدة أعلاه، وتبقى الأقواس — وهي غير ضارّة.
    out += c
    i++
  }
  return out
}

/**
 * نقطة التبليغ الوحيدة عن إحماء منجَز هي معالج `onStart` في شاشة الإحماء.
 * تُستخرج الكتلة بحدّيها (`<WarmupScreen` … `/>`) بدل `includes()` متفرّقة، فلا
 * يُرضى الفحص بوجود الاسمين في ملفٍ واحد على بُعد مئتي سطر.
 */
const warmupScreenBlock = (s) => {
  const start = s.indexOf('<WarmupScreen')
  if (start < 0) return null
  const end = s.indexOf('/>', start)
  return end < 0 ? null : s.slice(start, end + 2)
}

const claimCount = (code) => (stripComments(code).match(/completeFirstWin\(\s*'warmup'\s*\)/g) ?? []).length

const STRUCTURAL = [
  {
    id: 'التبليغ عن الإحماء يقع مرّة واحدة في تبويب التمرين',
    run: (f) => claimCount(f.workout) === 1,
  },
  {
    id: 'التبليغ داخل معالج شاشة الإحماء — لا عند بدء الجلسة',
    run: (f) => {
      const block = warmupScreenBlock(stripComments(f.workout))
      return block !== null && claimCount(block) === 1
    },
  },
  {
    id: 'بدء الجلسة (`beginSession`) خالٍ من أي تبليغ إحماء',
    run: (f) => {
      const code = stripComments(f.workout)
      // المرساة على **اسم الدالّة ونوع أول وسيطها**، لا على قوس إغلاق التوقيع:
      // [WORKOUT-CONTINUITY-001] أضاف وسيطًا ثانيًا (`trimmed`) فسقط الفحص على
      // مرساته لا على مقصده — و«سقوط بغير الفحص المسمّى ليس إثباتًا» (§4.2).
      // المقصد نفسه (لا `completeFirstWin` داخل الجسم) لم يُمسّ.
      const i = code.indexOf('const beginSession = (day: PlanDay')
      if (i < 0) return false
      const body = code.slice(i, code.indexOf('\n  }', i))
      return !/completeFirstWin/.test(body)
    },
  },
  {
    id: 'شاشة الإحماء تُرسم قبل وضع الجلسة لا بعده',
    run: (f) => {
      const code = stripComments(f.workout)
      const warm = code.indexOf('{pendingWarmup && !activeDay && (')
      const mode = code.indexOf('<WorkoutMode')
      return warm > 0 && mode > warm
    },
  },
  {
    id: 'الإحماء يُبنى من تمارين اليوم عبر `buildWarmupPlan`',
    run: (f) => /buildWarmupPlan\(day\)/.test(stripComments(f.workout)),
  },
  {
    id: 'مدّة الوعد في النموذج مشتقّة من نفس الباني',
    run: (f) => /warmupMinutes\s*=\s*workoutAvailable \? buildWarmupPlan\(day\)\.estMinutes/.test(stripComments(f.model)),
  },
  {
    id: '«اليوم» يمرّر المدّة المحسوبة للبطاقة لا رقمًا ثابتًا',
    run: (f) => /warmupMinutes=\{model\.warmupMinutes\}/.test(stripComments(f.today)),
  },
  {
    id: 'البطاقة تعرض المدّة المحسوبة حين تُمرَّر',
    run: (f) => /winWarmupMinutes\(warmupMinutes\)/.test(stripComments(f.card)),
  },
  {
    id: 'الاقتراح يتبع توفّر الإحماء لا الساعة وحدها',
    run: (f) => /suggestFirstWin\(new Date\(\), model\.warmupMinutes > 0\)/.test(stripComments(f.today)),
  },
]

const files = () => ({
  workout: src('src/views/WorkoutView.tsx'),
  model: src('src/lib/todayV2Model.ts'),
  today: src('src/views/TodayV2.tsx'),
  card: src('src/components/today/FirstWinCard.tsx'),
})

console.log('\n① بنية المسار: الوعد يُسلَّم قبل أول مجموعة عمل')
const live = files()
for (const a of STRUCTURAL) check(a.id, a.run(live) === true)

// ── محاكاة الالتفاف: كل تأكيد أعلاه يجب أن يسقط باسمه على مصدر ملتفّ ──
console.log('\n② محاكاة الالتفاف — كل إحكام يُهاجَم')
const ATTACKS = [
  {
    name: 'إعادة التبليغ إلى لحظة بدء الجلسة',
    mutate: (f) => ({ ...f, workout: f.workout.replace('    setActiveDay(day)\n  }', "    completeFirstWin('warmup')\n    setActiveDay(day)\n  }") }),
    mustFail: ['التبليغ عن الإحماء يقع مرّة واحدة في تبويب التمرين', 'بدء الجلسة (`beginSession`) خالٍ من أي تبليغ إحماء'],
  },
  {
    name: 'حذف شاشة الإحماء وإبقاء الاسم في تعليق',
    mutate: (f) => ({ ...f, workout: f.workout.replace('{pendingWarmup && !activeDay && (', '{false && (').replace('<WarmupScreen', '{/* WarmupScreen */}<Fragment') }),
    mustFail: ['شاشة الإحماء تُرسم قبل وضع الجلسة لا بعده', 'التبليغ داخل معالج شاشة الإحماء — لا عند بدء الجلسة'],
  },
  {
    name: 'تثبيت رقم الوعد في «اليوم» بدل اشتقاقه',
    mutate: (f) => ({ ...f, today: f.today.replace('warmupMinutes={model.warmupMinutes}', 'warmupMinutes={2}') }),
    mustFail: ['«اليوم» يمرّر المدّة المحسوبة للبطاقة لا رقمًا ثابتًا'],
  },
  {
    name: 'قطع النموذج عن باني الإحماء',
    mutate: (f) => ({ ...f, model: f.model.replace(/warmupMinutes = workoutAvailable \? buildWarmupPlan\(day\)\.estMinutes : 0/, 'warmupMinutes = 2') }),
    mustFail: ['مدّة الوعد في النموذج مشتقّة من نفس الباني'],
  },
]

for (const attack of ATTACKS) {
  const mutated = attack.mutate(files())
  for (const name of attack.mustFail) {
    const assertion = STRUCTURAL.find((a) => a.id === name)
    let verdict
    try {
      verdict = assertion.run(mutated)
    } catch (err) {
      // سقوط باستثناء تقني ليس إثباتًا (§4.2) — يُسمّى ويُعدّ فشلًا.
      verdict = `EXCEPTION:${err?.constructor?.name ?? 'unknown'}`
    }
    check(`«${attack.name}» يُسقط «${name}» بفحصه المسمّى`, verdict === false)
  }
}

if (fail > 0) {
  console.log(`\n❌ فشل ${fail} من ${pass + fail} في الفحوص البنيوية.`)
  process.exit(1)
}

// ── القسم السلوكي: المحرّك الحقيقي على أيام حقيقية ──
const banner = `
const __store = new Map();
const __ls = {
  get length() { return __store.size; },
  key(i) { return Array.from(__store.keys())[i] ?? null; },
  getItem: (k) => (__store.has(k) ? __store.get(k) : null),
  setItem: (k, v) => { __store.set(k, String(v)); },
  removeItem: (k) => { __store.delete(k); },
  clear: () => { __store.clear(); },
};
globalThis.localStorage = __ls;
globalThis.window = { localStorage: __ls, addEventListener() {}, removeEventListener() {} };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`

const result = await build({
  entryPoints: [resolve(root, 'scripts/warmup-promise-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})

const dir = mkdtempSync(join(tmpdir(), 'warmup-promise-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)

console.log(`\n✅ وعد الإحماء: ${pass} فحصًا بنيويًّا، 0 فشل — مع القسم السلوكي أعلاه.`)
