// حارس اتّصال الجلسة — [WORKOUT-CONTINUITY-001].
//
// ═══ العطل المحروس (مقيس، لا مُستشعَر) ═══
// بلاغ المؤسس: «ما تحس إنها سلسة»، وكأن التطبيق «فتح تمرينًا عشوائيًّا ونسي بقية
// التمرين». القياس على البناء الحيّ أعطى ثلاثة أسباب منفصلة، وكلّها حقيقية:
//
//   ١) الجلسة تُسلَّم مبتورة **بلا كلمة**: خطة اليوم أربعة تمارين، والجلسة تفتح على
//      «١ من ١». السبب سقف الأسبوع الأول (١٥ من ٤٥ دقيقة) في `applyEasyIfActive`،
//      وهو قرار مؤسس مقفل — لكنه كان **صامتًا**، وزرّ البدء يَعِد «٤ تمارين» قبله.
//      فالقراءة الوحيدة المتاحة للمستخدم أن التطبيق نسي تمرينه.
//   ٢) مؤشّر المراحل «إحماء ← التمارين ← الإنهاء» كان داخل `WarmupScreen` وحدها،
//      فيختفي عند أول ضغطة. قياس: `[data-session-rail]` على شاشة واحدة من سبع.
//   ٣) موضع التمرير لا يُعاد عند تبديل التمرين: `scrollTop` بعد «التمرين التالي»
//      = ٦٠٢ · ٦٠٢ · ٦٢٤ من أصل ١٢١٧ (نافذة ٦١٧). التمرين التالي يُفتح من منتصفه.
//
// ═══ ما استُبعد بالقياس لا بالظنّ ═══
// إعادة تركيب حاوية الجلسة: **مرّة واحدة** لجلسة كاملة (لا remount لكل تمرين).
// مهام طويلة > ٢٠٠ms: **صفر**. إزاحة تخطيط: CLS = ٠٫٠٠١١. زمن «التالي» حتى
// التفاعل: ١٩٫٣ · ٢١ · ٣٢٫١ ms. فلا الأداء ولا التركيب كان السبب — والإصلاح
// وُجّه إلى ما قِيس معطوبًا فعلًا.
//
// ═══ بنيوي ثم مُهاجَم (§4.2) ═══
// كل تأكيد أدناه يُهاجَم بنسخة ملتفّة من المصدر، ويُشترط أن يسقط **بفحصه المسمّى**
// لا باستثناء تقني. إحكامٌ لم يُهاجَم لا يُقبل.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => readFileSync(resolve(root, p), 'utf8')

let pass = 0
let fail = 0
const check = (label, cond) => {
  if (cond) { pass++; console.log(`  ✓ ${label}`) }
  else { fail++; console.log(`  ✗ FAIL: ${label}`) }
}

/**
 * يجرّد التعليقات قبل أي فحص. بدونه يكذب الحارس في الاتجاهين: تعليقٌ يذكر
 * `SessionStageRail` يُمرِّر مصدرًا نزع المكوّن، وكودٌ حقيقي حُوِّل إلى تعليق
 * يُسقط مصدرًا سليمًا. الحدود تُحترم داخل النصوص والقوالب فلا يُقصّ `//` داخل سلسلة.
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

/**
 * يستخرج كتلة الأثر المرتبط بـ`[current]` بحدّيها الحقيقيَّين — من `useEffect(`
 * إلى `}, [current])`. **الاقتران هو المقصد**: وجود `mainRef.current?.scrollTo`
 * في الملف لا يعني شيئًا إن كان في أثرٍ آخر لا يعمل عند تبديل التمرين. وبحثٌ
 * بـ`includes()` متفرّقة يُرضى من موضعين متباعدين — وتلك بوّابة رخوة (§4.2).
 */
const currentEffectBlock = (code) => {
  const end = code.indexOf('}, [current])')
  if (end < 0) return null
  const start = code.lastIndexOf('useEffect(', end)
  return start < 0 ? null : code.slice(start, end + '}, [current])'.length)
}

/**
 * كتلة ترويسة **الجلسة** بحدّيها — المُعرَّفة بأنها التي تحمل عدّاد «i من N».
 * الملف يحمل ترويستين (حارس اليوم الفارغ، ثم الجلسة)، والمقصود الثانية.
 */
const sessionHeaderBlock = (code) => {
  let at = code.indexOf('<header')
  while (at >= 0) {
    const end = code.indexOf('</header>', at)
    if (end < 0) return null
    const block = code.slice(at, end)
    if (block.includes('{formatNumber(current + 1, lang)}')) return block
    at = code.indexOf('<header', end)
  }
  return null
}

/** كتلة وسم `<WorkoutMode … />` بحدّيها — لا `includes()` على بُعد مئتي سطر. */
const workoutModeTag = (code) => {
  const start = code.indexOf('<WorkoutMode')
  if (start < 0) return null
  const end = code.indexOf('/>', start)
  return end < 0 ? null : code.slice(start, end + 2)
}

/** كتلة وسم `<WarmupScreen … />` بحدّيها. */
const warmupScreenTag = (code) => {
  const start = code.indexOf('<WarmupScreen')
  if (start < 0) return null
  const end = code.indexOf('/>', start)
  return end < 0 ? null : code.slice(start, end + 2)
}

// ─────────────────────────────────────────────────────────────────────────────
// التأكيدات — كلٌّ دالّة على نصّ المصدر كي يمكن مهاجمتها بنصّ مُعدَّل
// ─────────────────────────────────────────────────────────────────────────────

const ASSERTS = [
  // ① الاقتطاع يُبلَّغ — الإصلاح ١
  {
    id: 'الاقتطاع يُرجِع سيرته (كم من كم ولماذا) لا يومًا مبتورًا بلا خبر',
    file: 'view',
    run: (code) => {
      const i = code.indexOf('const applyEasyIfActive =')
      if (i < 0) return false
      const body = code.slice(i, code.indexOf('\n  }', i))
      // لا يكفي ذكر `trimmed`: لا بدّ من العدد الأصلي **والسبب** معًا في المُرجَع.
      return /trimmed:\s*\{/.test(body) && /fullCount:/.test(body) && /reason:/.test(body)
    },
  },
  {
    id: 'وضع الجلسة يستقبل الاقتطاع فعلًا (تمريرة في وسم `<WorkoutMode>` نفسه)',
    file: 'view',
    run: (code) => {
      const tag = workoutModeTag(code)
      return tag !== null && /\btrimmed=\{/.test(tag)
    },
  },
  {
    id: 'وضع الجلسة يعرض التنويه ولا يبتلعه — نصّ من القاموس لا نصّ صلب',
    file: 'mode',
    run: (code) =>
      /data-session-trimmed=\{/.test(code) &&
      /d\.trimmedFirstWeekBody\(/.test(code) &&
      /d\.trimmedEasyBody\(/.test(code),
  },
  {
    id: 'زرّ «ابدأ تمرين اليوم» يَعِد بالعدد المُسلَّم لا بعدد الخطة',
    file: 'view',
    run: (code) => /todayDelivery\?\.trimmed[\s\S]{0,200}?d\.startTrimmedCount\(/.test(code),
  },

  // ② مؤشّر المراحل متّصل — الإصلاح ٢
  {
    id: 'مؤشّر المراحل مكوّن واحد مشترك — شاشة الإحماء تستدعيه',
    file: 'warm',
    run: (code) => /<SessionStageRail\b[^>]*stage="warmup"/.test(code),
  },
  {
    id: 'وضع الجلسة يرسم المؤشّر نفسه — فلا ينقطع المسار عند العتبة',
    file: 'mode',
    run: (code) => /<SessionStageRail\b/.test(code),
  },
  {
    id: 'المؤشّر داخل ترويسة الجلسة اللاصقة — مرئي على كل شاشة لا في أعلى التمرير',
    file: 'mode',
    /**
     * **ترويسة الجلسة تُعرَّف بمحتواها لا بترتيبها.** أول `<header>` في الملف هو
     * حارس «اليوم بلا تمارين» (شاشة `emptyPlan`)، ولا مؤشّر مراحل فيه بحقّ —
     * تمرين فارغ ليس جلسة. فالمرساة هي الترويسة التي تحمل «i من N»، وهي وحدها
     * التي يجب أن يجاورها المؤشّر: العدّاد والمسار إفادة واحدة، فصلهما هو العطل.
     */
    run: (code) => {
      const sessionHeader = sessionHeaderBlock(code)
      return sessionHeader !== null && sessionHeader.includes('<SessionStageRail')
    },
  },
  {
    id: 'فتح نافذة الإنهاء يقدّم المؤشّر للمرحلة الثالثة',
    file: 'mode',
    run: (code) => /stage=\{confirmOpen \? 'finish' : 'exercises'\}/.test(code),
  },

  // ③ موضع التمرير — الإصلاح ٣
  {
    id: 'التمرير يُعاد لأعلى **داخل** الأثر المرتبط بتبديل التمرين',
    file: 'mode',
    run: (code) => {
      const block = currentEffectBlock(code)
      return block !== null && /mainRef\.current\?\.scrollTo\(/.test(block)
    },
  },
  {
    id: 'المرجع مربوط بحاوية المحتوى فعلًا — `ref` على `<main>` لا معلّق',
    file: 'mode',
    run: (code) => /<main ref=\{mainRef\}/.test(code),
  },

  // ④ إرشاد الإحماء — الإصلاح ٤
  {
    id: 'كل خطوة إحماء تحمل تعليمة نوعها من القاموس',
    file: 'warm',
    run: (code) => /w\.stepCue\[step\.label\]/.test(code),
  },
  {
    id: 'ومعها تعليمة الإعداد المؤلَّفة لهذا التمرين بعينه (`getCue`)',
    file: 'warm',
    run: (code) => /getCue\(step\.exerciseId, lang\)/.test(code),
  },
  {
    id: 'الصورة تُعرض فقط بإطار معروف الحقوق — لا صورة مستعارة لتمرين بلا وسائط',
    file: 'warm',
    run: (code) =>
      /status === 'stills'/.test(code) && /showMedia \? \(/.test(code),
  },
  {
    id: 'شاشة الإحماء تقول ماذا بعدها — بعدد تمارين اليوم لا برقم مكتوب بيد',
    file: 'warm',
    run: (code) => /w\.afterWarmup\(exerciseCount\)/.test(code),
  },
  {
    id: 'وعدد ما بعد الإحماء يأتي من اليوم المُسلَّم نفسه',
    file: 'view',
    run: (code) => {
      const tag = warmupScreenTag(code)
      return tag !== null && /exerciseCount=\{pendingWarmup\.day\.exercises\.length\}/.test(tag)
    },
  },

  // ⑤ الصدق في الحالة المجهولة — لا تخمين سبب لم يُسجَّل
  {
    id: 'الجلسة المستأنفة لا تُنسب لسبب اقتطاع لم يُحفَظ',
    file: 'view',
    run: (code) => {
      const i = code.indexOf('const resumeWorkout =')
      if (i < 0) return false
      const body = code.slice(i, code.indexOf('\n  }', i))
      return /setTrimmed\(null\)/.test(body)
    },
  },

  // ⑥ اللغتان معًا — لا نصّ يهبط بلغة واحدة
  {
    id: 'نصوص التنويه والإرشاد موجودة في **سجلّ كل لغة** لا في الواجهة وحدها',
    file: 'dicts',
    /**
     * **العدّ الخام يكذب هنا.** تعريف الواجهة يحمل المفتاح أيضًا، فمجرّد عدّ
     * المرّات يُرضى من «واجهة + سجلّ واحد» — أي نصٌّ هبط بالعربية وحدها يمرّ.
     * فيُقسَم كل قاموس عند بداية سجلّه الإنجليزي، ويُطالَب **كلا الشطرين** بحمل
     * المفتاح: العربية بعد `const ar`/`const AR`، والإنجليزية بعد `const en`/`const EN`.
     */
    run: (code) => {
      const half = (blob, marker) => {
        const i = blob.indexOf(marker)
        return i < 0 ? null : blob.slice(i)
      }
      const [screen, warm] = code.split('\n---dict-split---\n')
      if (!screen || !warm) return false
      const screenEn = half(screen, 'const en:')
      const screenAr = screen.slice(screen.indexOf('const ar:'), screen.indexOf('const en:'))
      const warmEn = half(warm, 'const EN:')
      const warmAr = warm.slice(warm.indexOf('const AR:'), warm.indexOf('const EN:'))
      if (!screenEn || !warmEn || !screenAr || !warmAr) return false
      const has = (blob, keys) => keys.every((k) => blob.includes(k))
      const screenKeys = ['trimmedFirstWeekTitle:', 'trimmedFirstWeekBody:', 'trimmedEasyTitle:', 'trimmedEasyBody:', 'startTrimmedCount:']
      const warmKeys = ['stepCue: {', 'afterWarmup:']
      return has(screenAr, screenKeys) && has(screenEn, screenKeys) && has(warmAr, warmKeys) && has(warmEn, warmKeys)
    },
  },
]

const load = () => ({
  view: stripComments(src('src/views/WorkoutView.tsx')),
  mode: stripComments(src('src/components/WorkoutMode.tsx')),
  warm: stripComments(src('src/components/workout/WarmupScreen.tsx')),
  rail: stripComments(src('src/components/workout/SessionStageRail.tsx')),
  dicts:
    stripComments(src('src/i18n/dict/workoutScreen.ts')) +
    '\n---dict-split---\n' +
    stripComments(src('src/i18n/dict/warmup.ts')),
})

console.log('\n① بنية الاتّصال: الجلسة مسار واحد لا شاشات متجاورة')
const live = load()
for (const a of ASSERTS) check(a.id, a.run(live[a.file]) === true)

// ─────────────────────────────────────────────────────────────────────────────
// ② محاكاة الالتفاف — كل إحكام يُهاجَم، ويجب أن يسقط بفحصه المسمّى
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n② محاكاة الالتفاف — كل إحكام يُهاجَم')

/**
 * كل التفاف يُطبَّق على **نسخة في الذاكرة** من المصدر، ويُشترط أن يُسقط
 * التأكيدات المسمّاة معه ولا يُسقط غيرها. سقوطٌ باستثناء تقني (`TypeError`)
 * يُحتسب فشلًا: «سقوط غير مسمّى ليس إثباتًا» (§4.2).
 */
const TAMPERS = [
  {
    id: 'إعادة الاقتطاع صامتًا (يُرجِع اليوم المبتور بلا سيرة)',
    file: 'view',
    apply: (c) => c.replace(/trimmed:\s*\{[\s\S]*?\},\n    \}/, '}'),
    breaks: ['الاقتطاع يُرجِع سيرته (كم من كم ولماذا) لا يومًا مبتورًا بلا خبر'],
  },
  {
    id: 'قطع التمريرة عن وضع الجلسة (يبقى التنويه مكتوبًا ولا يصل)',
    file: 'view',
    apply: (c) => c.replace(/ trimmed=\{trimmed \?\? undefined\}/, ''),
    breaks: ['وضع الجلسة يستقبل الاقتطاع فعلًا (تمريرة في وسم `<WorkoutMode>` نفسه)'],
  },
  {
    id: 'إرجاع الزرّ إلى وعد عدد الخطة',
    file: 'view',
    apply: (c) => c.replace(/todayDelivery\?\.trimmed/, 'false'),
    breaks: ['زرّ «ابدأ تمرين اليوم» يَعِد بالعدد المُسلَّم لا بعدد الخطة'],
  },
  {
    id: 'نزع المؤشّر من الترويسة وإبقاؤه أسفل التمرير (يمرّ `includes()` ويسقط الاقتران)',
    file: 'mode',
    apply: (c) => {
      const block = sessionHeaderBlock(c)
      const tag = block.match(/<SessionStageRail[^/]*\/>/)[0]
      // يُنقل الوسم **كما هو حرفيًّا** إلى جسم الصفحة. النقل بلا تحوير مقصود:
      // لو أعدنا كتابته بـ`stage="exercises"` لأسقط أيضًا تأكيد تقدّم المرحلة،
      // فبدا الالتفاف أقوى مما هو. الالتفاف يجب أن يكسر ما يدّعي كسره وحده.
      return c.replace(block, block.replace(tag, '')) + '\n' + tag + '\n'
    },
    breaks: ['المؤشّر داخل ترويسة الجلسة اللاصقة — مرئي على كل شاشة لا في أعلى التمرير'],
  },
  {
    id: 'تجميد المؤشّر على «التمارين» فلا يتقدّم عند الإنهاء',
    file: 'mode',
    apply: (c) => c.replace(/stage=\{confirmOpen \? 'finish' : 'exercises'\}/, "stage=\"exercises\""),
    breaks: ['فتح نافذة الإنهاء يقدّم المؤشّر للمرحلة الثالثة'],
  },
  {
    id: 'نقل إعادة التمرير إلى أثر آخر لا يعمل عند تبديل التمرين',
    file: 'mode',
    apply: (c) => {
      const block = currentEffectBlock(c)
      const stripped = block.replace(/\s*mainRef\.current\?\.scrollTo\(\{ top: 0 \}\)/, '')
      return c.replace(block, stripped) +
        '\nuseEffect(() => { mainRef.current?.scrollTo({ top: 0 }) }, [])\n'
    },
    breaks: ['التمرير يُعاد لأعلى **داخل** الأثر المرتبط بتبديل التمرين'],
  },
  {
    id: 'فكّ المرجع عن `<main>` (يبقى `scrollTo` مكتوبًا ولا يُمرَّر شيء)',
    file: 'mode',
    apply: (c) => c.replace('<main ref={mainRef}', '<main'),
    breaks: ['المرجع مربوط بحاوية المحتوى فعلًا — `ref` على `<main>` لا معلّق'],
  },
  {
    id: 'حذف تعليمات الإحماء والاكتفاء بالاسم والرقم (حالة ما قبل الإصلاح)',
    file: 'warm',
    apply: (c) => c.replace(/w\.stepCue\[step\.label\]/, "''").replace(/getCue\(step\.exerciseId, lang\)/, '({ steps: [] })'),
    breaks: [
      'كل خطوة إحماء تحمل تعليمة نوعها من القاموس',
      'ومعها تعليمة الإعداد المؤلَّفة لهذا التمرين بعينه (`getCue`)',
    ],
  },
  {
    id: 'عرض صورة لكل خطوة بلا فحص الحقوق (صورة مستعارة لتمرين بلا وسائط)',
    file: 'warm',
    apply: (c) => c.replace(/const showMedia = hasStillMedia\(step\.exerciseId\)/, 'const showMedia = true')
      .replace(/status === 'stills'/, 'status !== undefined'),
    breaks: ['الصورة تُعرض فقط بإطار معروف الحقوق — لا صورة مستعارة لتمرين بلا وسائط'],
  },
  {
    id: 'إسكات شاشة الإحماء عمّا بعدها',
    file: 'warm',
    apply: (c) => c.replace(/w\.afterWarmup\(exerciseCount\)/, "''"),
    breaks: ['شاشة الإحماء تقول ماذا بعدها — بعدد تمارين اليوم لا برقم مكتوب بيد'],
  },
  {
    id: 'تخمين سبب اقتطاع لجلسة مستأنفة لم تحفظه',
    file: 'view',
    apply: (c) => c.replace(/setTrimmed\(null\)\n/, ''),
    breaks: ['الجلسة المستأنفة لا تُنسب لسبب اقتطاع لم يُحفَظ'],
  },
  {
    id: 'إهباط نصوص الإرشاد بلغة واحدة (حذف السجلّ الإنجليزي)',
    file: 'dicts',
    apply: (c) => {
      // يُحذف `stepCue` من السجلّ الإنجليزي وحده — الواجهة والعربية تبقيان،
      // فالعدّ الخام كان سيمرّ وهذا بالضبط ما يجب أن يسقط.
      const i = c.lastIndexOf('stepCue: {')
      const end = c.indexOf('afterWarmup:', i)
      return c.slice(0, i) + c.slice(end)
    },
    breaks: ['نصوص التنويه والإرشاد موجودة في **سجلّ كل لغة** لا في الواجهة وحدها'],
  },
]

for (const t of TAMPERS) {
  const tampered = { ...live, [t.file]: t.apply(live[t.file]) }
  for (const id of t.breaks) {
    const a = ASSERTS.find((x) => x.id === id)
    let result
    let threw = null
    try {
      result = a.run(tampered[a.file])
    } catch (e) {
      threw = e
    }
    check(
      `«${t.id}» يُسقط «${id}» بفحصه المسمّى`,
      threw === null && result === false,
    )
    if (threw) console.log(`      ↳ سقط باستثناء تقني لا بفحص مسمّى: ${threw.message}`)
  }
  // ولا يُسقط ما ليس من شأنه — التفافٌ يُسقط كل شيء لا يُثبت شيئًا.
  const collateral = ASSERTS.filter(
    (a) => !t.breaks.includes(a.id) && a.file === t.file && (() => {
      try { return a.run(tampered[a.file]) === false } catch { return true }
    })(),
  ).map((a) => a.id)
  check(`«${t.id}» لا يُسقط تأكيدًا خارج شأنه`, collateral.length === 0)
  if (collateral.length) console.log(`      ↳ أسقط أيضًا: ${collateral.join(' · ')}`)
}

console.log(`\n${fail === 0 ? '✅' : '❌'} اتّصال الجلسة: ${pass} فحصًا، ${fail} فشل.`)
if (fail > 0) process.exit(1)
