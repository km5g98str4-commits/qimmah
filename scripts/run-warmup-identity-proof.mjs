// حارس «الإحماء ليس جهازًا» — [FOUNDER-QA] الإصلاح P0.
//
// ═══ العطل المحروس ═══
// بلاغ المؤسس: بطاقة إحماء تعرض «جهاز ضغط الصدر» **بصورة الجهاز**. ضلعا العطل:
//   (أ) الباني كان يشتقّ كل خطوة من تمارين اليوم، فيوم الأجهزة إحماؤه هو الجهاز.
//   (ب) الشاشة كانت تحلّ الوسائط لأي خطوة، فتضع صورة الجهاز تحت عنوان «إحماء».
// هذا الحارس يمنع عودة كلٍّ منهما، ويمنع كذلك عودة **المقدّمة البائتة** التي
// كانت تبرّر العطل («أي قائمة إحماء محتوى مخترع لا مصدر له») بعد أن صارت كاذبة.
//
// ═══ بنيوي ثم مهاجَم ثم سلوكي (§4.2) ═══
// ① يقرأ المصدر ويؤكّد البنية. ② يهاجم كل تأكيد بنسخة ملتفّة من المصدر ويشترط
// سقوطه **بفحصه المسمّى** لا باستثناء تقني. ③ يشغّل الباني الحقيقي عبر
// `scripts/warmup-identity-proof.ts`.

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

/**
 * يجرّد التعليقات قبل أي فحص على الكود. **بدونه يكذب الحارس في الاتجاهين:**
 * تعليقٌ يذكر `approvedImageFor` يُمرِّر شاشة لا تستدعيه، وكودٌ حقيقي مُحوَّل
 * إلى تعليق يُمرِّر مصدرًا معطوبًا. الحدود تُحترم داخل النصوص والقوالب.
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
    out += c
    i++
  }
  return out
}

/** رأس الملف = ما قبل أول `import`. الحقائق المُعلنة تُفحص هنا وحدها. */
const fileHeader = (code) => {
  const i = code.indexOf('\nimport ')
  return i < 0 ? code : code.slice(0, i)
}

/**
 * جسم دالّة تبدأ بالتوقيع المعطى وتنتهي بأول `\n}` — يكفي لدوالّ الوحدة العلوية،
 * وهو ما يجعل الفحص **مقترنًا** بدل `includes()` متفرّقة تُرضى من مواضع بعيدة.
 */
const functionBody = (code, signature) => {
  const i = code.indexOf(signature)
  if (i < 0) return null
  const end = code.indexOf('\n}', i)
  return end < 0 ? null : code.slice(i, end + 2)
}

const STRUCTURAL = [
  {
    // ملاحظة حدّ: هذا فحص **نوعي** (وجود العضو في الاتحاد) لا سلوكي. حذف حلقة
    // البناء وحدها لا يُسقطه — وهذا مقصود: السلوك يحرسه الفحص التالي، وخلط
    // الاثنين في تأكيد واحد يجعل نجاحه غامضًا.
    id: 'نوع الخطوة `mobility` عضوٌ مُعلَن في اتحاد `WarmupStep`',
    run: (f) => {
      const code = stripComments(f.plan)
      const body = functionBody(code, 'export interface WarmupMobilityStep')
      return body !== null
        && /kind:\s*'mobility'/.test(body)
        && /export type WarmupStep = WarmupMobilityStep \| WarmupStrengthStep/.test(code)
    },
  },
  {
    id: 'خطوات المرونة تُبنى من الكتالوج عبر `getExercise` داخل حلقة المرونة',
    run: (f) => {
      const code = stripComments(f.plan)
      const i = code.indexOf('for (const id of mobilityExerciseIds)')
      if (i < 0) return false
      const body = code.slice(i, code.indexOf('\n  }', i))
      return /getExercise\(id\)/.test(body) && /kind:\s*'mobility'/.test(body)
    },
  },
  {
    id: 'الاختيار حتمي — لا `Math.random` ولا `Date.now` في الباني',
    run: (f) => !/Math\.random|Date\.now/.test(stripComments(f.plan)),
  },
  {
    id: 'اختيار المرونة يستبعد معرّفات اليوم صراحةً',
    run: (f) => {
      const body = functionBody(stripComments(f.plan), 'function pickMobilityIds(')
      return body !== null && /dayExerciseIds\.has\(id\)/.test(body) && /continue/.test(body)
    },
  },
  {
    id: 'اختيار المرونة يرفض أي معرّف نمطه ليس mobility',
    run: (f) => {
      const body = functionBody(stripComments(f.plan), 'function pickMobilityIds(')
      return body !== null && /movementPattern\s*!==\s*'mobility'/.test(body)
    },
  },
  {
    id: 'سلّم البار محفوظ — `generateWarmup` ما زال مستدعًى بلا مجموعة العمل',
    run: (f) => /generateWarmup\(working, config, firstReps\(pe\.reps\)\)\.filter\(\(s\) => !s\.isWork\)/.test(stripComments(f.plan)),
  },
  {
    id: 'المدّة ما زالت مشتقّة من مجموع ثواني الخطوات لا رقمًا ثابتًا',
    run: (f) => {
      const code = stripComments(f.plan)
      return /const seconds = steps\.reduce\(\(sum, s\) => sum \+ s\.seconds, 0\)/.test(code)
        && /estMinutes: steps\.length === 0 \? 0 : Math\.max\(1, Math\.round\(seconds \/ 60\)\)/.test(code)
    },
  },
  {
    id: 'الشاشة تحلّ الصورة لخطوة المرونة **وحدها** — الحارس داخل `warmupImageFor`',
    run: (f) => {
      const body = functionBody(stripComments(f.screen), 'function warmupImageFor(')
      return body !== null
        && /step\.kind\s*!==\s*'mobility'\s*\)\s*return null/.test(body)
        && /approvedImageFor\(/.test(body)
    },
  },
  {
    id: 'الشاشة تحلّ الفيديو لخطوة المرونة وحدها — نفس الحارس في `warmupVideoFor`',
    run: (f) => {
      const body = functionBody(stripComments(f.screen), 'function warmupVideoFor(')
      return body !== null
        && /step\.kind\s*!==\s*'mobility'\s*\)\s*return null/.test(body)
        && /approvedVideoFor\(/.test(body)
    },
  },
  {
    id: 'الشاشة لا تصل إلى `ExerciseMedia` ولا إلى سجلّ الوسائط الخام إطلاقًا',
    run: (f) => {
      const code = stripComments(f.screen)
      return !/ExerciseMedia/.test(code) && !/exerciseMediaManifest/.test(code)
    },
  },
  {
    id: 'كل استدعاء لحلّ وسيط في الشاشة يمرّ بدالّتَي الحراسة لا بالسجلّ مباشرة',
    run: (f) => {
      const code = stripComments(f.screen)
      // الاستدعاء المباشر مسموح **داخل** الدالّتين فقط؛ خارجهما ممنوع.
      const guards = [functionBody(code, 'function warmupImageFor('), functionBody(code, 'function warmupVideoFor(')]
      if (guards.some((b) => b === null)) return false
      let rest = code
      for (const b of guards) rest = rest.replace(b, '')
      return !/approvedImageFor\(|approvedVideoFor\(/.test(rest)
    },
  },
  {
    id: 'خطوة القوّة تُعلن هويّتها نصًّا («تسخين على») فلا تُقرأ كأنها الإحماء',
    run: (f) => {
      const code = stripComments(f.screen)
      const i = code.indexOf("step.kind !== 'mobility' && (")
      if (i < 0) return false
      const block = code.slice(i, code.indexOf(')}', i))
      return /w\.setOfPrefix/.test(block)
    },
  },
  {
    id: 'نصّ «تسخين على» في القاموس باللغتين — لا نصّ صلب في المكوّن',
    run: (f) => {
      const code = f.dict
      return /setOfPrefix:\s*'تسخين على'/.test(code) && /setOfPrefix:\s*'Warm-up set on'/.test(code)
    },
  },
  {
    id: 'وسم `mobility` مترجَم في سجلَّي القاموس معًا (label + cue)',
    run: (f) => {
      const code = f.dict
      return (code.match(/mobility:\s*'/g) ?? []).length >= 4
    },
  },
  {
    // **السجلّان معًا**: فحصٌ يقنع بواحد يمرّ على قاموس عربي فيه رقم لاتيني
    // لأن النسخة الإنجليزية أرضته — وهو مرورٌ غير مستحقّ (§4.2).
    id: 'أرقام المرونة تمرّ بـ`formatNumber` في السجلَّين — لا أرقام لاتينية في جملة عربية (BUG-019)',
    run: (f) => {
      const code = f.dict
      return /mobilityLine:\s*\(seconds\) =>\s*`\$\{formatNumber\(seconds, 'ar'\)\}/.test(code)
        && /mobilityLine:\s*\(seconds\) =>\s*`\$\{formatNumber\(seconds, 'en'\)\}/.test(code)
    },
  },
  {
    id: 'رأس الباني يذكر مصادر محتوى الإحماء الثلاثة بأسمائها',
    run: (f) => {
      const head = fileHeader(f.plan)
      return head.includes('src/data/exercises.ts')
        && head.includes('exerciseProductionManifest.generated.ts')
        && head.includes('exerciseCues.generated.ts')
    },
  },
  {
    id: 'رأس الباني يُعلن أن مقدّمة «المحتوى المخترع» صارت غير صحيحة',
    run: (f) => {
      const head = fileHeader(f.plan)
      // ذكرُ العبارة القديمة مسموح **بشرط** أن يكون تصحيحًا معلَنًا لا دعوى قائمة.
      if (!head.includes('محتوى مخترعًا')) return false
      return head.includes('صارت غير صحيحة')
    },
  },
]

const files = () => ({
  plan: src('src/lib/warmupPlan.ts'),
  screen: src('src/components/workout/WarmupScreen.tsx'),
  dict: src('src/i18n/dict/warmup.ts'),
})

console.log('\n① بنية الإصلاح: الإحماء صنفٌ قائم بذاته، ووسائطه له وحده')
const live = files()
for (const a of STRUCTURAL) check(a.id, a.run(live) === true)

// ── محاكاة الالتفاف: كل تأكيد أعلاه يُهاجَم بنسخة ملتفّة من المصدر ──
console.log('\n② محاكاة الالتفاف — كل إحكام يُهاجَم')
const ATTACKS = [
  {
    name: 'حذف حلقة المرونة والإبقاء على الاسم في تعليق',
    mutate: (f) => ({
      ...f,
      plan: f.plan
        .replace('for (const id of mobilityExerciseIds) {', '/* for (const id of mobilityExerciseIds) { */ if (false) {')
        .replace("      kind: 'mobility',\n      exerciseId: id,", "      // kind: 'mobility',\n      exerciseId: id,"),
    }),
    mustFail: ['خطوات المرونة تُبنى من الكتالوج عبر `getExercise` داخل حلقة المرونة'],
  },
  {
    name: 'إخراج `mobility` من اتحاد النوع فيعود الإحماء صنفين لا ثلاثة',
    mutate: (f) => ({ ...f, plan: f.plan.replace('export type WarmupStep = WarmupMobilityStep | WarmupStrengthStep', 'export type WarmupStep = WarmupStrengthStep') }),
    mustFail: ['نوع الخطوة `mobility` عضوٌ مُعلَن في اتحاد `WarmupStep`'],
  },
  {
    name: 'إدخال العشوائية في اختيار المرونة',
    mutate: (f) => ({ ...f, plan: f.plan.replace('const picked: string[] = []', 'const picked: string[] = []\n  if (Math.random() > 0.5) picked.push("cat-cow")') }),
    mustFail: ['الاختيار حتمي — لا `Math.random` ولا `Date.now` في الباني'],
  },
  {
    name: 'رفع استبعاد معرّفات اليوم — فيعود الجهاز حركةَ مرونة',
    mutate: (f) => ({ ...f, plan: f.plan.replace('      if (dayExerciseIds.has(id)) continue\n', '') }),
    mustFail: ['اختيار المرونة يستبعد معرّفات اليوم صراحةً'],
  },
  {
    name: 'قبول أي معرّف مهما كان نمطه',
    mutate: (f) => ({ ...f, plan: f.plan.replace("if (!drill || drill.movementPattern !== 'mobility') continue", 'if (!drill) continue') }),
    mustFail: ['اختيار المرونة يرفض أي معرّف نمطه ليس mobility'],
  },
  {
    name: 'حذف سلّم البار',
    mutate: (f) => ({ ...f, plan: f.plan.replace('.filter((s) => !s.isWork)', '') }),
    mustFail: ['سلّم البار محفوظ — `generateWarmup` ما زال مستدعًى بلا مجموعة العمل'],
  },
  {
    name: 'تثبيت المدّة بدل اشتقاقها من الخطوات',
    mutate: (f) => ({ ...f, plan: f.plan.replace('estMinutes: steps.length === 0 ? 0 : Math.max(1, Math.round(seconds / 60)),', 'estMinutes: 2,') }),
    mustFail: ['المدّة ما زالت مشتقّة من مجموع ثواني الخطوات لا رقمًا ثابتًا'],
  },
  {
    name: 'رفع حارس الوسائط — الصورة تعود لأي خطوة (العطل المُبلَّغ حرفيًّا)',
    mutate: (f) => ({
      ...f,
      screen: f.screen
        .replace("  if (step.kind !== 'mobility') return null\n  return approvedImageFor(step.exerciseId)?.start ?? null", '  return approvedImageFor(step.exerciseId)?.start ?? null')
        .replace("  if (step.kind !== 'mobility') return null\n  return approvedVideoFor(step.exerciseId)", '  return approvedVideoFor(step.exerciseId)'),
    }),
    mustFail: [
      'الشاشة تحلّ الصورة لخطوة المرونة **وحدها** — الحارس داخل `warmupImageFor`',
      'الشاشة تحلّ الفيديو لخطوة المرونة وحدها — نفس الحارس في `warmupVideoFor`',
    ],
  },
  {
    name: 'إعادة `ExerciseMedia` إلى الشاشة',
    mutate: (f) => ({ ...f, screen: f.screen.replace("import { Icon } from '@/components/Icon'", "import { Icon } from '@/components/Icon'\nimport { ExerciseMedia } from '@/components/ExerciseMedia'") }),
    mustFail: ['الشاشة لا تصل إلى `ExerciseMedia` ولا إلى سجلّ الوسائط الخام إطلاقًا'],
  },
  {
    name: 'حلّ الصورة مباشرةً في جسم القائمة، متجاوزًا الدالّتين',
    mutate: (f) => ({ ...f, screen: f.screen.replace('const imageSrc = warmupImageFor(step)', 'const imageSrc = approvedImageFor(step.exerciseId)?.start ?? null') }),
    mustFail: ['كل استدعاء لحلّ وسيط في الشاشة يمرّ بدالّتَي الحراسة لا بالسجلّ مباشرة'],
  },
  {
    name: 'حذف ترويسة «تسخين على» فيقف اسم الجهاز وحده تحت عنوان الإحماء',
    mutate: (f) => ({ ...f, screen: f.screen.replace('{w.setOfPrefix}', '{null}') }),
    mustFail: ['خطوة القوّة تُعلن هويّتها نصًّا («تسخين على») فلا تُقرأ كأنها الإحماء'],
  },
  {
    name: 'أرقام لاتينية في سطر المرونة العربي',
    mutate: (f) => ({ ...f, dict: f.dict.replace('mobilityLine: (seconds) => `${formatNumber(seconds, \'ar\')} ثانية`', 'mobilityLine: (seconds) => `${seconds} ثانية`') }),
    mustFail: ['أرقام المرونة تمرّ بـ`formatNumber` في السجلَّين — لا أرقام لاتينية في جملة عربية (BUG-019)'],
  },
  {
    name: 'إعادة المقدّمة البائتة كدعوى قائمة بلا تصحيح',
    mutate: (f) => ({ ...f, plan: f.plan.replace('وهي **مقدّمة صارت غير صحيحة**', 'وهي مقدّمة قائمة') }),
    mustFail: ['رأس الباني يُعلن أن مقدّمة «المحتوى المخترع» صارت غير صحيحة'],
  },
  {
    name: 'محو استشهاد الرأس بمصادر المحتوى',
    mutate: (f) => ({ ...f, plan: f.plan.replace(/exerciseProductionManifest\.generated\.ts/g, 'مصدرٍ ما') }),
    mustFail: ['رأس الباني يذكر مصادر محتوى الإحماء الثلاثة بأسمائها'],
  },
]

for (const attack of ATTACKS) {
  const before = files()
  const mutated = attack.mutate(before)
  // التفافٌ لم يغيّر شيئًا ليس التفافًا — يُكشف بدل أن يمرّ كنجاح رخيص.
  const changed = ['plan', 'screen', 'dict'].some((k) => mutated[k] !== before[k])
  check(`«${attack.name}» غيّر المصدر فعلًا`, changed)
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

// ── القسم السلوكي: الباني الحقيقي على أيام حقيقية ──
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
  entryPoints: [resolve(root, 'scripts/warmup-identity-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})

const dir = mkdtempSync(join(tmpdir(), 'warmup-identity-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)

console.log(`\n✅ هويّة الإحماء: ${pass} فحصًا بنيويًّا، 0 فشل — مع القسم السلوكي أعلاه.`)
