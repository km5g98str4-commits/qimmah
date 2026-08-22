/**
 * إثبات اتجاه سطر التاريخ في الرئيسية — [R3-UX-BIDI].
 *
 * ═══ ما يحرسه ═══
 * سطر «الاثنين · 17 أغسطس» يخلط نصًّا عربيًّا قويّ الاتجاه، وفاصلًا **محايدًا**
 * (`·` · Bidi class ON)، ورقمًا. ترتيبه البصري في النصّ الواحد ليس ما كُتب في
 * الملف، بل نتيجةُ قاعدة حلّ المحايدات (UAX#9 · N1) على جيرانه. فالترتيب الصحيح
 * — وقد **قِسناه في Chromium حقيقي وكان صحيحًا** — صحيحٌ بالحظّ لا بالبناء:
 * يكفي أن يجاور السطرَ نصٌّ لاتيني، أو أن يصير الشهر رقمًا، حتى ينقلب بلا أن
 * يتغيّر سطر واحد في المصدر.
 *
 * العلاج البنيوي: النموذج يُسلّم **جزأين**، والواجهة تصفّهما في `flex` فيصير
 * الترتيب البصري ترتيبَ الـDOM قطعًا، وتغلّف الجزء الحامل للأرقام بـ`<bdi>`
 * فيُعزَل اتجاهيًّا. هذا الإثبات يمنع الرجوع إلى النصّ المركَّب.
 *
 * ═══ ثلاثة أقسام ═══
 *   ① سلوكي — يقود النموذج فعلًا (scripts/today-bidi-proof.ts).
 *   ② بنيوي مقترن — على مصدر `TodayV2.tsx` الحيّ.
 *   ③ محاكاتا التفاف — تُعيدان البنية إلى ما قبل الإصلاح وتثبتان أن الفحص
 *      يسقط **باسمه** لا باستثناء تقني (§4.2).
 *
 * القياس البصري الحقيقي (Chromium) يعيش في `scripts/today-bidi-order-shot.mjs`
 * — خارج البوابة المحلّية عمدًا، كبقية خطوات المتصفّح (§4.0).
 */
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// ── ① القسم السلوكي ────────────────────────────────────────────────────────
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
const built = await build({
  entryPoints: [resolve(root, 'scripts/today-bidi-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})
const dir = mkdtempSync(join(tmpdir(), 'today-bidi-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, built.outputFiles[0].text)
await import(pathToFileURL(file).href)

// ── ② القسم البنيوي ────────────────────────────────────────────────────────
let pass = 0
const fails = []
const check = (label, cond) => {
  if (cond) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fails.push(label); console.log(`  ✗ FAIL: ${label}`) }
}

/** يجرّد التعليقات: فحص «غياب» على النصّ الخام يخلط الكود بشرحه. */
const strip = (src) => src.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ')

/**
 * يستخرج **كتلة عنصر التاريخ بحدودها** — لا `includes()` متفرّقة.
 *
 * البوابة الرخوة تُرضى من مواضع متباعدة في الملف؛ الكتلة المقترنة لا تُرضى إلا
 * من العنصر نفسه. الحدّ: من فتح الوسم الحامل لـ`aria-label={loc(model.dateLabel)}`
 * إلى أوّل `</p>` بعده.
 */
function dateBlock(source) {
  const src = strip(source)
  const at = src.indexOf('aria-label={loc(model.dateLabel)}')
  if (at === -1) return null
  const open = src.lastIndexOf('<p', at)
  const close = src.indexOf('</p>', at)
  if (open === -1 || close === -1) return null
  return src.slice(open, close + 4)
}

/** الفحوص المسمّاة، مطبَّقة على أي مصدر — فتصلح للحقيقي وللمحاكاة معًا. */
function auditView(source) {
  const block = dateBlock(source)
  const problems = []
  if (!block) {
    problems.push('كتلة سطر التاريخ غير موجودة (اختفى aria-label={loc(model.dateLabel)} أو وسم <p>)')
    return problems
  }
  if (!/<bdi[\s>]/.test(block)) problems.push('الجزء الحامل للأرقام غير معزول بـ<bdi>')
  if (!/<bdi[^>]*>\{loc\(model\.dateParts\.detail\)\}<\/bdi>/.test(block)) problems.push('محتوى <bdi> ليس model.dateParts.detail حرفيًّا')
  if (!/\{loc\(model\.dateParts\.weekday\)\}/.test(block)) problems.push('اسم اليوم لا يُصيَّر من model.dateParts.weekday')
  // النصّ المركَّب مسموح في `aria-label` وحده؛ ظهوره **طفلًا** يعيد العطل.
  const children = block.replace(/<p[^>]*>/, '')
  if (children.includes('{loc(model.dateLabel)}')) problems.push('النصّ المركَّب dateLabel يُصيَّر مرئيًّا داخل الكتلة (عودة إلى النصّ الواحد)')
  if (!/flex/.test(block.slice(0, block.indexOf('>') + 1))) problems.push('الكتلة لا تُصفّ أجزاءها بـflex — فالترتيب البصري يعود للخوارزمية لا للـDOM')
  return problems
}

/** فحوص مسمّاة على النموذج — تشتقّ الجزأين ولا تسمح بنصٍّ مركَّب مكتوب بيد. */
function auditModel(source) {
  const src = strip(source)
  const problems = []
  if (!/dateParts:\s*TodayDateParts/.test(src)) problems.push('النموذج لا يُصرّح بحقل dateParts')
  if (!/const dateLabel = dateParts\.detail \? `\$\{dateParts\.weekday\}\$\{DATE_PART_SEPARATOR\}\$\{dateParts\.detail\}` : dateParts\.weekday/.test(src)) {
    problems.push('dateLabel غير مشتقّ من dateParts (تركيبٌ ثانٍ يشيخ مستقلًّا)')
  }
  // أي قالب يخبز الفاصل مع weekday مباشرةً = العطل الأصلي عائدًا.
  if (/`\$\{weekday\} · \$\{/.test(src)) problems.push('سطر التاريخ يُركَّب نصًّا واحدًا بالفاصل المخبوز `${weekday} · ${…}`')
  return problems
}

const viewSrc = readFileSync(resolve(root, 'src/views/TodayV2.tsx'), 'utf8')
const modelSrc = readFileSync(resolve(root, 'src/lib/todayV2Model.ts'), 'utf8')

console.log('\n② البنية الحيّة')
for (const p of auditView(viewSrc)) check(`الواجهة: ${p}`, false)
for (const p of auditModel(modelSrc)) check(`النموذج: ${p}`, false)
check('الواجهة تعزل جزء الأرقام وتصفّ الجزأين بـflex', auditView(viewSrc).length === 0)
check('النموذج يشتقّ dateLabel من dateParts ولا يخبز الفاصل', auditModel(modelSrc).length === 0)

// ── ③ محاكاتا التفاف ───────────────────────────────────────────────────────
console.log('\n③ محاكاة الالتفاف — يجب أن تسقط باسمها')

// (أ) عودة الواجهة إلى النصّ الواحد داخل نفس الكتلة.
const bypassView = viewSrc.replace(
  /<bdi aria-hidden="true">\{loc\(model\.dateParts\.detail\)\}<\/bdi>/,
  '{loc(model.dateLabel)}',
)
const viewProblems = auditView(bypassView)
check('محاكاة (أ): استبدال <bdi> بالنصّ المركَّب يُسقط الفحص', viewProblems.length > 0)
check(
  'محاكاة (أ) تسقط بفحص **مسمّى** لا باستثناء',
  viewProblems.some((p) => p.includes('<bdi>')) && viewProblems.some((p) => p.includes('dateLabel يُصيَّر مرئيًّا')),
)
console.log(`     أسماء الفشل: ${JSON.stringify(viewProblems)}`)

// (ب) عودة النموذج إلى تركيب النصّ بيده.
const bypassModel = modelSrc
  .replace(/const dateLabel = dateParts\.detail \?[^\n]*\n/, 'const dateLabel = `${weekday} · ${dateDetail}`\n')
const modelProblems = auditModel(bypassModel)
check('محاكاة (ب): تركيب dateLabel بيد يُسقط الفحص', modelProblems.length > 0)
check(
  'محاكاة (ب) تسقط بفحص **مسمّى** لا باستثناء',
  modelProblems.some((p) => p.includes('غير مشتقّ')) && modelProblems.some((p) => p.includes('الفاصل المخبوز')),
)
console.log(`     أسماء الفشل: ${JSON.stringify(modelProblems)}`)

console.log(`\nالبنية: نجح ${pass} · فشل ${fails.length}`)
if (fails.length) { for (const f of fails) console.log(`  ✗ ${f}`); process.exit(1) }
console.log('✅ إثبات اتجاه سطر التاريخ تام')
