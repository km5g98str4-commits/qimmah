/**
 * إثبات وصولية سطح «اليوم» وقشرته — [R3-UX-A11Y].
 *
 * ═══ العطلان اللذان يغلقهما ═══
 * ① **الشاشة الأكثر زيارةً بلا `h1`.** كانت `MobileShell` تستبدل عنوان الصفحة
 *    في تبويب الرئيسية بـ`<button><span>`، بينما `TodayV2` يتنازل إلى `h2`
 *    معلنًا صراحةً أن «القشرة تملك `h1` الصفحة». الطرفان كانا متّسقين مع نفسيهما
 *    ومتناقضين معًا: النتيجة شجرة عناوين بلا جذر على الرئيسية وحدها.
 * ② **أهداف لمس دون ٤٤ بكسل** في أزرار يملكها هذا السطح.
 *
 * ولأن `.tap-target` (styles/index.css) كان صنفًا موجودًا شبه مهجور، الفحص
 * يقبله **ومعه** المقاسات الصريحة المكافئة — العبرة بالمقاس لا باسم الصنف.
 *
 * §4.2: لكل فحص محاكاة التفاف تسقط **باسمها**.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')
const strip = (src) => src.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ')

let pass = 0
const fails = []
const check = (label, cond) => {
  if (cond) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fails.push(label); console.log(`  ✗ FAIL: ${label}`) }
}

// ── فحوص مسمّاة، دوالّ نقيّة تُطبَّق على المصدر الحيّ وعلى المحاكاة معًا ──

/** القشرة: `h1` واحد غير مشروط، والزرّ **داخله** لا بدلًا منه. */
function auditShell(source) {
  const src = strip(source)
  const problems = []
  const h1Count = (src.match(/<h1[\s>]/g) ?? []).length
  if (h1Count === 0) problems.push('القشرة بلا <h1> إطلاقًا')
  if (h1Count > 1) problems.push(`القشرة تحمل ${h1Count} عناصر <h1> — جذر واحد فقط لشجرة العناوين`)
  const open = src.indexOf('<h1')
  const close = src.indexOf('</h1>', open)
  const block = open === -1 || close === -1 ? '' : src.slice(open, close + 5)
  if (!block) problems.push('تعذّر استخراج كتلة <h1> بحدودها')
  else {
    if (!/tab === 'dashboard' \?/.test(block)) problems.push('تفرّع تبويب الرئيسية خارج كتلة <h1> — أي أن الرئيسية قد تفقد العنوان')
    if (!/<button[\s\S]*?<\/button>/.test(block)) problems.push('زرّ الرئيسية ليس داخل <h1>')
    if (!/\{pageTitle\}/.test(block)) problems.push('كتلة <h1> لا تُصيّر pageTitle')
  }
  return problems
}

/**
 * ماسح وسوم فتح `<button …>` **واعٍ بالأقواس**.
 *
 * `[^>]*?` لا يكفي: `onClick={() => …}` يحمل `>` داخل السهم، فيُقصّ الوسم عنده
 * ويخرج `className` فارغًا — أي يمرّ الفحص أو يسقط لسبب كاذب. الماسح يعدّ
 * `{}` ويتجاوز النصوص، فينتهي عند `>` خارج كل قوس.
 */
function buttonOpenTags(src) {
  const tags = []
  for (let i = src.indexOf('<button'); i !== -1; i = src.indexOf('<button', i + 1)) {
    let depth = 0
    let quote = null
    for (let j = i + 7; j < src.length; j++) {
      const ch = src[j]
      if (quote) { if (ch === quote && src[j - 1] !== '\\') quote = null; continue }
      if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue }
      if (ch === '{') depth += 1
      else if (ch === '}') depth -= 1
      else if (ch === '>' && depth === 0) { tags.push({ index: i, text: src.slice(i, j + 1) }); break }
    }
  }
  return tags
}

/**
 * هل يضمن هذا الوسم ارتفاع لمس ≥٤٤ بكسل **بمقاسه المعلَن** لا بمحتواه؟
 *
 * القيمة تُقرأ لا تُطابَق حرفيًّا: `min-h-[52px]` و`min-h-[4.5rem]` كلاهما كافٍ،
 * و`min-h-[40px]` ليس كافيًا — والقائمة الحرفية كانت سترفض الأول وتقبل الثاني
 * لو كُتب بصيغتها. `inset-0` للطبقة المغطّية لكامل الشاشة (خلفية اللوح).
 */
const MIN_TAP_PX = 44
function guaranteesTapSize(tag) {
  if (/\btap-target\b/.test(tag)) return true
  if (/\binset-0\b/.test(tag)) return true
  if (/\bh-(11|12|14|16|20)\b/.test(tag)) return true
  for (const m of tag.matchAll(/\bmin-h-\[(\d+(?:\.\d+)?)(px|rem)\]/g)) {
    const px = m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1])
    if (px >= MIN_TAP_PX) return true
  }
  return false
}
function auditTapTargets(files) {
  const problems = []
  for (const [path, source] of files) {
    const src = strip(source)
    for (const tag of buttonOpenTags(src)) {
      if (guaranteesTapSize(tag.text)) continue
      const line = src.slice(0, tag.index).split('\n').length
      problems.push(`${path}:${line} زرّ بلا ضمان ٤٤ بكسل (${tag.text.replace(/\s+/g, ' ').slice(0, 90)})`)
    }
  }
  return problems
}

const OWNED = [
  'src/components/MobileShell.tsx',
  'src/views/TodayV2.tsx',
  'src/components/today/DailyRingsCard.tsx',
  'src/components/today/FirstWinCard.tsx',
  'src/components/today/MissedDayCard.tsx',
  'src/components/today/NextActionCard.tsx',
  'src/components/today/NotifyAskSheet.tsx',
  'src/components/today/QuickActions.tsx',
  'src/components/today/WaterCard.tsx',
  'src/components/today/WeekSummaryScreen.tsx',
  'src/components/today/WeeklyPulseCard.tsx',
]

const shellSrc = read('src/components/MobileShell.tsx')
const todaySrc = read('src/views/TodayV2.tsx')

console.log('\n① جذر شجرة العناوين')
for (const p of auditShell(shellSrc)) check(`القشرة: ${p}`, false)
check('القشرة تحمل <h1> واحدًا غير مشروط ويحتضن زرّ الرئيسية', auditShell(shellSrc).length === 0)
check(
  'TodayV2 لا يُدخل <h1> ثانيًا — التنازل إلى h2 صار مُسنَدًا لا مُفترضًا',
  !/<h1[\s>]/.test(strip(todaySrc)),
)

console.log('\n② أهداف اللمس')
const tapProblems = auditTapTargets(OWNED.map((p) => [p, read(p)]))
for (const p of tapProblems) check(p, false)
check(`كل أزرار الأسطح المملوكة (${OWNED.length} ملفات) تضمن ٤٤ بكسل`, tapProblems.length === 0)
check(
  '.tap-target مستعمَل فعلًا في هذه الحزمة لا مجرّد مُعرَّف',
  /tap-target/.test(shellSrc) && /tap-target/.test(read('src/components/today/NotifyAskSheet.tsx')),
)
check('.tap-target ما زال معرَّفًا بمقاسه في الأنماط', /\.tap-target\s*\{\s*@apply min-h-\[44px\] min-w-\[44px\];/.test(read('src/styles/index.css')))

console.log('\n③ محاكاة الالتفاف — يجب أن تسقط باسمها')
const bypassShell = shellSrc
  .replace(/<h1 className="min-w-0 text-lg font-black text-ink-900">\s*/, '')
  .replace(/\s*<\/h1>/, '')
const shellProblems = auditShell(bypassShell)
check('محاكاة (أ): نزع <h1> من القشرة يُسقط الفحص', shellProblems.length > 0)
check('محاكاة (أ) تسقط بفحص مسمّى', shellProblems.some((p) => p.includes('بلا <h1>')))
console.log(`     أسماء الفشل: ${JSON.stringify(shellProblems)}`)

const bypassTap = todaySrc.replace(
  'className="v2-pressable mt-3 flex min-h-[44px] w-full items-center gap-2 border-t border-line pt-3 text-start"',
  'className="v2-pressable mt-3 flex w-full items-center gap-2 border-t border-line pt-3 text-start"',
)
const tapBypass = auditTapTargets([['src/views/TodayV2.tsx', bypassTap]])
check('محاكاة (ب): نزع ضمان ٤٤ من زرّ حيّ يُسقط الفحص', tapBypass.length > 0)
check('محاكاة (ب) تسقط بفحص مسمّى يذكر الملف والسطر', tapBypass.some((p) => /TodayV2\.tsx:\d+ زرّ بلا ضمان/.test(p)))
console.log(`     أسماء الفشل: ${JSON.stringify(tapBypass)}`)

console.log(`\nنجح ${pass} · فشل ${fails.length}`)
if (fails.length) { for (const f of fails) console.log(`  ✗ ${f}`); process.exit(1) }
console.log('✅ إثبات وصولية سطح اليوم تام')
