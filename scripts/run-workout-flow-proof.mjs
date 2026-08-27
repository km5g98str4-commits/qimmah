// حارس تدفّق التمرين المتواصل — [WORKOUT-FLOW-001].
//
// ═══ ما يحرسه ═══
// رؤية المؤسس: «التمرين يُفتح مرّة واحدة → قائمة التمارين → أكمل تمرينًا →
// استمرار تلقائي للتالي → الجلسة لا تنتهي إلا بعد التمرين الأخير»، وبطاقة
// افتراضية أخفّ (صورة · اسم · هدف · وزن · تكرارات · زرّ إكمال كبير) وصفوف
// جولات مدمجة، وكل ما عداه قابل للطيّ. أربعة أعمدة للحراسة:
//   ① الاستمرار التلقائي داخل `markDone` مقرونًا بفحص اكتمال-الكل المرقَّع —
//      لا بقراءة `state` البائتة (التحديث غير متزامن والجولات تُكمَل بلا ترتيب).
//   ② وسائط التمرين في البطاقة الافتراضية خارج الطيّات.
//   ③ صفّ الجولة المدمج بمكوّناته الأربعة **مقترنة** في كتلة الصفّ الواحدة —
//      لا متفرّقة في الملف (§4.2: بحث متفرّق يُرضى من مواضع لا علاقة بينها).
//   ④ تنويه السلامة داخل طيّة المرجع لا خارجها.
//
// ═══ بنيوي ثم مُهاجَم (§4.2) ═══
// كل تأكيد يُهاجَم بنسخة ملتفّة من المصدر، ويُشترط أن يسقط **بفحصه المسمّى**
// لا باستثناء تقني — وألّا يُسقط الالتفاف تأكيدًا خارج شأنه.

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
 * يجرّد التعليقات قبل أي فحص — تعليقٌ يذكر `setAutoNext` لا يُمرِّر مصدرًا نزع
 * الآلية، وكودٌ حُوِّل تعليقًا لا يُبقي الفحص أخضر. الحدود تُحترم داخل النصوص.
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

/** جسم دالّة/كتلة بأقواسها المعقوفة — `opener` ينتهي بـ`{` ويُعدّ حتى إغلاقه. */
const braceBlock = (code, opener) => {
  const start = code.indexOf(opener)
  if (start < 0) return null
  let depth = 1
  let i = start + opener.length
  while (i < code.length && depth > 0) {
    if (code[i] === '{') depth++
    else if (code[i] === '}') depth--
    i++
  }
  return code.slice(start, i)
}

/**
 * كتلة JSX محروسة بحدودها الحقيقية — `opener` ينتهي بقوس `(` مفتوح ويُعدّ حتى
 * إغلاقه. هذا هو الفرق بين «الأجزاء موجودة في الملف» و«الأجزاء **داخل** هذه
 * الكتلة» — والثاني وحده مقصد §4.2.
 */
const parenBlock = (code, opener) => {
  const start = code.indexOf(opener)
  if (start < 0) return null
  let depth = 1
  let i = start + opener.length
  while (i < code.length && depth > 0) {
    if (code[i] === '(') depth++
    else if (code[i] === ')') depth--
    i++
  }
  return code.slice(start, i)
}

/** كتلة صفّ عناوين الأعمدة — من وسمها إلى أول `</div>`؛ الصفّ مسطّح عمدًا. */
const colsBlock = (code) => {
  const start = code.indexOf('data-set-cols')
  if (start < 0) return null
  const end = code.indexOf('</div>', start)
  return end < 0 ? null : code.slice(start, end)
}

const MARK_DONE_OPENER = 'const markDone = (idx: number) => {'
const PATCHED_ALL_DONE = '.every((x, i) => (i === idx ? true : x.completed))'
const ROWS_OPENER = 's.sets.map('
const REF_FOLD_OPENER = '{openRef && ('
const CTA_OPENER = '{nextSetNum !== undefined && ('
const BANNER_OPENER = '{autoNext && ('
const DEFAULT_MEDIA = '<ExerciseMedia exerciseId={exId} lang={lang} heightClass="h-32" hideChips />'

// ─────────────────────────────────────────────────────────────────────────────
// التأكيدات — كلٌّ دالّة على نصّ المصدر كي يمكن مهاجمتها بنصّ مُعدَّل
// ─────────────────────────────────────────────────────────────────────────────

const ASSERTS = [
  // ① الاستمرار التلقائي
  {
    id: 'الاستمرار التلقائي داخل `markDone` مقرونًا بفحص اكتمال-الكل المرقَّع',
    file: 'mode',
    /**
     * الاقتران هو المقصد: جدولة الانتقال يجب أن تعيش **داخل** `markDone` وفي
     * جوار الفحص المرقَّع (`i === idx ? true : x.completed`) — لا في أثر آخر
     * يقرأ `state` بائتة، ولا مبعثرة في الملف. تُستخرج الكتلة بحدودها ويُسأل
     * عن كل الأجزاء فيها معًا.
     */
    run: (code) => {
      const block = braceBlock(code, MARK_DONE_OPENER)
      return (
        block !== null &&
        block.includes(PATCHED_ALL_DONE) &&
        /setAutoNext\(\{ from:/.test(block) &&
        /window\.setTimeout\(/.test(block) &&
        /goNext\(\)/.test(block)
      )
    },
  },
  {
    id: 'الاستمرار محكوم بـ`!isLast` — لا إنهاء تلقائي صامت عند آخر تمرين',
    file: 'mode',
    run: (code) => {
      const block = braceBlock(code, MARK_DONE_OPENER)
      return block !== null && /allDone && !isLast/.test(block) && !block.includes('setConfirmOpen(true)')
    },
  },
  {
    id: 'شريط الاستمرار معلَن ويحمل زرّ البقاء — لا قفزة صامتة',
    file: 'mode',
    run: (code) => {
      const banner = parenBlock(code, BANNER_OPENER)
      return (
        banner !== null &&
        /d\.autoNextBody\(autoNext\.from, autoNext\.to\)/.test(banner) &&
        /onClick=\{cancelAutoNext\}/.test(banner) &&
        /role="status"/.test(banner)
      )
    },
  },

  // ② البطاقة الافتراضية الأخفّ
  {
    id: 'وسائط التمرين حاضرة في البطاقة الافتراضية خارج الطيّات',
    file: 'mode',
    /**
     * تُقارن المواضع لا الوجود: أول ظهور للوسائط يجب أن يسبق طيّة المرجع —
     * فنسخة داخل الطيّة وحدها (حالة ما قبل الإصلاح) تُرضي `includes()` ولا
     * تُرضي هذا الفحص.
     */
    run: (code) => {
      const mediaIdx = code.indexOf(DEFAULT_MEDIA)
      const foldIdx = code.indexOf(REF_FOLD_OPENER)
      const rowsIdx = code.indexOf(ROWS_OPENER)
      return mediaIdx >= 0 && foldIdx > 0 && rowsIdx > 0 && mediaIdx < foldIdx && mediaIdx < rowsIdx
    },
  },
  {
    id: 'الوزن المستهدف على سطر الهويّة بجانب الجولات×التكرارات',
    file: 'mode',
    run: (code) => {
      const start = code.indexOf('{t.target}: {formatNumber(pe.sets, lang)}')
      if (start < 0) return false
      const line = code.slice(start, start + 600)
      return /d\.weightInline/.test(line) && /formatNumeralsIn\(targetWeight, lang\)/.test(line)
    },
  },

  // ③ صفوف الجولات المدمجة
  {
    id: 'صفّ الجولة المدمج: الرقم والوزن والتكرار وزرّ الإتمام مقترنة في كتلة الصفّ',
    file: 'mode',
    run: (code) => {
      const rows = parenBlock(code, ROWS_OPENER)
      return (
        rows !== null &&
        rows.includes('data-set-row') &&
        /formatNumber\(st\.setNumber, lang\)/.test(rows) &&
        /value=\{st\.weightKg\}/.test(rows) &&
        /value=\{st\.actualReps\}/.test(rows) &&
        /aria-pressed=\{st\.completed\}/.test(rows) &&
        /markDone\(i\)/.test(rows)
      )
    },
  },
  {
    id: 'صفّ عناوين الأعمدة بمفاتيحه الأربعة مقترنة (colSet/colWeight/colReps/colDone)',
    file: 'mode',
    run: (code) => {
      const cols = colsBlock(code)
      return (
        cols !== null &&
        cols.includes('{d.colSet}') &&
        cols.includes('{d.colWeight}') &&
        cols.includes('{d.colReps}') &&
        cols.includes('{d.colDone}')
      )
    },
  },
  {
    id: 'زرّ الإكمال الكبير من مفتاحه الجديد وموصول بالجولة التالية — لا نصّ مثبَّت',
    file: 'mode',
    run: (code) => {
      const cta = parenBlock(code, CTA_OPENER)
      return (
        cta !== null &&
        /d\.completeSetCta\(nextSetNum, lang\)/.test(cta) &&
        /markDone\(nextSetIdx\)/.test(cta) &&
        !/t\.nextExercise|t\.setSaved|\bd\.done\b|t\.finish\b/.test(cta)
      )
    },
  },

  // ④ الطيّ
  {
    id: 'تنويه السلامة داخل طيّة المرجع لا خارجها',
    file: 'mode',
    /**
     * العدّ شرط لا زينة: وجوده داخل الطيّة لا يكفي إن بقيت نسخة دائمة خارجها —
     * فيُطالَب بأن **كل** ظهور لـ`t.safety` يقع داخل كتلة الطيّة المستخرَجة.
     */
    run: (code) => {
      const fold = parenBlock(code, REF_FOLD_OPENER)
      if (fold === null) return false
      const inFold = (fold.match(/t\.safety/g) ?? []).length
      const inFile = (code.match(/t\.safety/g) ?? []).length
      return inFold >= 1 && inFold === inFile
    },
  },
  {
    id: 'الدليل السريع والبدائل داخل طيّة المرجع الواحدة — لا أكورديونات متراصّة',
    file: 'mode',
    run: (code) => {
      const fold = parenBlock(code, REF_FOLD_OPENER)
      return (
        fold !== null &&
        fold.includes('{t.techniquePoints}') &&
        fold.includes('{t.altPrompt}') &&
        !/openGuide|openAlt/.test(code)
      )
    },
  },

  // ⑤ اللغتان معًا
  {
    id: 'مفاتيح التدفّق الجديدة في **سجلّ كل لغة** لا في الواجهة وحدها',
    file: 'dict',
    /**
     * العدّ الخام يكذب هنا: تعريف الواجهة يحمل المفتاح أيضًا، فمجرّد عدّ المرّات
     * يُرضى من «واجهة + سجلّ واحد». يُقسَم القاموس عند بداية سجلّه الإنجليزي
     * ويُطالَب **كلا الشطرين** بحمل كل مفتاح.
     */
    run: (code) => {
      const arStart = code.indexOf('const ar:')
      const enStart = code.indexOf('const en:')
      if (arStart < 0 || enStart < 0) return false
      const arHalf = code.slice(arStart, enStart)
      const enHalf = code.slice(enStart)
      const KEYS = ['colSet:', 'colWeight:', 'colReps:', 'colDone:', 'completeSetCta:', 'weightInline:', 'autoNextBody:', 'autoNextStay:']
      return KEYS.every((k) => arHalf.includes(k)) && KEYS.every((k) => enHalf.includes(k))
    },
  },
]

const load = () => ({
  mode: stripComments(src('src/components/WorkoutMode.tsx')),
  dict: stripComments(src('src/i18n/dict/workoutScreen.ts')),
})

console.log('\n① تدفّق التمرين المتواصل — بنية حيّة')
const live = load()
for (const a of ASSERTS) check(a.id, a.run(live[a.file]) === true)

// ─────────────────────────────────────────────────────────────────────────────
// ② محاكاة الالتفاف — كل إحكام يُهاجَم، ويجب أن يسقط بفحصه المسمّى
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n② محاكاة الالتفاف — كل إحكام يُهاجَم')

/**
 * كل التفاف يُطبَّق على نسخة في الذاكرة، ويُشترط أن يُسقط التأكيدات المسمّاة
 * معه ولا يُسقط غيرها. سقوطٌ باستثناء تقني يُحتسب فشلًا (§4.2).
 */
const TAMPERS = [
  {
    id: 'تبديل الفحص المرقَّع بقراءة `state` البائتة (يبقى الاستمرار مكتوبًا ويكذب)',
    file: 'mode',
    apply: (c) => c.replace(PATCHED_ALL_DONE, '.every((x) => x.completed)'),
    breaks: ['الاستمرار التلقائي داخل `markDone` مقرونًا بفحص اكتمال-الكل المرقَّع'],
  },
  {
    id: 'جرّ جدولة الانتقال خارج `markDone` (تبقى الأجزاء في الملف متفرّقة)',
    file: 'mode',
    apply: (c) => {
      const block = braceBlock(c, MARK_DONE_OPENER)
      const start = block.indexOf('setAutoNext({ from:')
      const end = block.indexOf('}, AUTO_NEXT_MS)') + '}, AUTO_NEXT_MS)'.length
      const cut = block.slice(start, end)
      // تُنقل الجدولة **كما هي حرفيًّا** إلى ذيل الملف — فتبقى `setAutoNext`
      // و`goNext()` موجودتين في الملف، ويثبت أن الفحص لا يُرضى بالتفرّق.
      return c.replace(block, block.replace(cut, '')) + '\n' + cut + '\n'
    },
    breaks: ['الاستمرار التلقائي داخل `markDone` مقرونًا بفحص اكتمال-الكل المرقَّع'],
  },
  {
    id: 'نزع حارس `!isLast` — الانتقال يعمل حتى على آخر تمرين',
    file: 'mode',
    apply: (c) => c.replace('if (allDone && !isLast) {', 'if (allDone) {'),
    breaks: ['الاستمرار محكوم بـ`!isLast` — لا إنهاء تلقائي صامت عند آخر تمرين'],
  },
  {
    id: 'نزع زرّ البقاء من شريط الاستمرار (قفزة معلنة بلا مخرج)',
    file: 'mode',
    apply: (c) => {
      const banner = parenBlock(c, BANNER_OPENER)
      return c.replace(banner, banner.replace('onClick={cancelAutoNext}', 'onClick={() => {}}'))
    },
    breaks: ['شريط الاستمرار معلَن ويحمل زرّ البقاء — لا قفزة صامتة'],
  },
  {
    id: 'إرجاع الوسائط إلى داخل الطيّة وحدها (حالة ما قبل الإصلاح)',
    file: 'mode',
    apply: (c) => {
      const start = c.indexOf(DEFAULT_MEDIA)
      // تُحذف نسخة البطاقة الافتراضية وحدها — نسخة الطيّة (`h-48`) باقية،
      // فبحث `includes('<ExerciseMedia')` الساذج كان سيمرّ وهذا ما يجب أن يسقط.
      return c.slice(0, start) + c.slice(start + DEFAULT_MEDIA.length)
    },
    breaks: ['وسائط التمرين حاضرة في البطاقة الافتراضية خارج الطيّات'],
  },
  {
    id: 'إخفاء الوزن المستهدف من سطر الهويّة',
    file: 'mode',
    apply: (c) => c.replace('formatNumeralsIn(targetWeight, lang)', "''"),
    breaks: ['الوزن المستهدف على سطر الهويّة بجانب الجولات×التكرارات'],
  },
  {
    id: 'بعثرة الصفّ: جرّ زرّ الإتمام خارج كتلة الصفّ (تبقى أجزاؤه في الملف)',
    file: 'mode',
    apply: (c) => {
      const rows = parenBlock(c, ROWS_OPENER)
      const bStart = rows.indexOf('<button')
      const bEnd = rows.indexOf('</button>') + '</button>'.length
      const cut = rows.slice(bStart, bEnd)
      // الزرّ يُنقل كما هو إلى ذيل الملف: `aria-pressed` و`markDone(i)` باقيان
      // في الملف — والفحص المقترن وحده يكشف أن الصفّ لم يعد مدمجًا.
      return c.replace(rows, rows.replace(cut, '')) + '\n' + cut + '\n'
    },
    breaks: ['صفّ الجولة المدمج: الرقم والوزن والتكرار وزرّ الإتمام مقترنة في كتلة الصفّ'],
  },
  {
    id: 'إسقاط عمود من صفّ العناوين',
    file: 'mode',
    apply: (c) => c.replace('{d.colDone}', "{''}"),
    breaks: ['صفّ عناوين الأعمدة بمفاتيحه الأربعة مقترنة (colSet/colWeight/colReps/colDone)'],
  },
  {
    id: 'تحويل زرّ الإكمال الكبير إلى النصّ المثبَّت «التمرين التالي»',
    file: 'mode',
    apply: (c) => c.replace('{d.completeSetCta(nextSetNum, lang)}', '{t.nextExercise}'),
    breaks: ['زرّ الإكمال الكبير من مفتاحه الجديد وموصول بالجولة التالية — لا نصّ مثبَّت'],
  },
  {
    id: 'إعادة تنويه السلامة شريطًا دائمًا خارج الطيّة (مع بقاء نسخة داخلها)',
    file: 'mode',
    apply: (c) => c + '\n<p>{t.safety}</p>\n',
    breaks: ['تنويه السلامة داخل طيّة المرجع لا خارجها'],
  },
  {
    id: 'إخراج البدائل من الطيّة إلى أكورديون مستقلّ',
    file: 'mode',
    apply: (c) => {
      const fold = parenBlock(c, REF_FOLD_OPENER)
      return c.replace(fold, fold.replace('{t.altPrompt}', "{''}")) + '\nconst [openAlt] = [false]\n'
    },
    breaks: ['الدليل السريع والبدائل داخل طيّة المرجع الواحدة — لا أكورديونات متراصّة'],
  },
  {
    id: 'إهباط مفاتيح التدفّق بلغة واحدة (حذف `completeSetCta` من السجلّ الإنجليزي)',
    file: 'dict',
    apply: (c) => {
      // يُحذف من السجلّ الإنجليزي وحده — الواجهة والعربية تبقيان، فالعدّ الخام
      // كان سيمرّ وهذا بالضبط ما يجب أن يسقط.
      const i = c.lastIndexOf('completeSetCta:')
      const end = c.indexOf('\n', i)
      return c.slice(0, i) + c.slice(end)
    },
    breaks: ['مفاتيح التدفّق الجديدة في **سجلّ كل لغة** لا في الواجهة وحدها'],
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

console.log(`\n${fail === 0 ? '✅' : '❌'} تدفّق التمرين المتواصل: ${pass} فحصًا، ${fail} فشل.`)
if (fail > 0) process.exit(1)
