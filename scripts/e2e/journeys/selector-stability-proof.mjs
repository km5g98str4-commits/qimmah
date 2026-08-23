// إثبات ثبات المُحدِّدات — بوابة على «حارس الرحلات» نفسه.
//
// ═══ العطل الذي وُلد منه هذا الإثبات ═══
// رحلة المولود الجديد كانت تنتظر زرًّا باسمه المكتوب:
//     getByRole('button', { name: 'استعرض قِمّة أولًا', exact: true })
// ثم انتقل نصّ ذلك الزرّ من `V2_ONBOARDING.handoff` إلى `revealStrings.cta`
// في موجة نبرة لاحقة. المنتج **سليم** والشاشة تعمل، والرحلة تسقط بعد ثلاثين
// ثانية بمهلة غامضة اسمها «locator.click: Timeout». أي أن الحارس صار يقيس
// صياغةً لا سلوكًا، ويعطي أحمر كاذبًا يوقف بوابةً كاملة.
//
// ═══ القاعدة المفروضة هنا ═══
// **ما يُضغَط يُحدَّد ببنية، وما يُقرأ يُقارَن بنصّ.**
//   • التنقّل والتفاعل: `data-testid` أو `data-choice` أو دور دلالي بلا اسم.
//   • التأكيد على المحتوى: نصّ الشاشة (`screenText`) مقارَنًا بالقاموس — وهو
//     المقصود فعلًا، فلا يُمَس.
// فمُحدِّد يقع عليه فعل (نقر · تعبئة · انتظار) أو يُربط بمتغيّر ليُنقر لاحقًا،
// **ولا يعرف عنصره إلا بنصّه المعروض** ⇒ مخالفة تُسمّى بملفها وسطرها.
//
// ═══ ولماذا لا يكتفي بالعدّ (§4.2) ═══
// «صفر مطابقة» ليست نتيجة تُقرأ. كل مخالفة تُطبع `ملف:سطر` مع المقتطف والسبب،
// والإثبات المضادّ أدناه يتحقّق من **الرقم نفسه** لا من وجود بلاغ: يُركّب ملفًا
// اصطناعيًا فيه مُحدِّد نصّي واحد في سطر معلوم، ويسقط إن لم يُسمّه الماسح
// بسطره بالضبط.

import { readdirSync, readFileSync, writeFileSync, mkdtempSync, statSync } from 'node:fs'
import { join, relative, basename } from 'node:path'
import { tmpdir } from 'node:os'

const ROOT = process.cwd()
const JOURNEY_DIR = 'scripts/e2e/journeys'

/**
 * استثناء **معلَن ومطبوع** (§4.2: الاستثناء الصامت وحده هو الممنوع):
 * هذا الملف نفسه خارج الفحص لأنه يحمل عيّنات المخالفات حرفيًا في إثباته
 * المضادّ. ولو فُحص لأسقط نفسه بعيّناته.
 */
const SELF = basename(new URL(import.meta.url).pathname)

// ───────────────────────── الماسح ─────────────────────────

/**
 * يزيل التعليقات مع الحفاظ على أرقام الأسطر — تعليق يذكر مُحدِّدًا ليس مُحدِّدًا.
 *
 * ويُعيد معها **هيكلًا** فُرِّغ فيه محتوى كل نصّ حرفي: عدّ الأقواس يجب أن يقرأ
 * البنية لا الكلمات، وإلا خدعه قوسٌ داخل سلسلة (`'[data-choice="cut"]'`).
 */
function stripComments(source) {
  const out = []
  let inBlock = false
  for (const line of source.split('\n')) {
    let code = ''
    let skeleton = ''
    let i = 0
    let quote = null
    while (i < line.length) {
      const c = line[i]
      const n = line[i + 1]
      if (inBlock) {
        if (c === '*' && n === '/') { inBlock = false; i += 2 } else i += 1
        continue
      }
      if (quote) {
        if (c === '\\') { code += '  '; skeleton += '  '; i += 2; continue }
        if (c === quote) quote = null
        code += c; skeleton += ' '; i += 1
        continue
      }
      if (c === "'" || c === '"' || c === '`') { quote = c; code += c; skeleton += ' '; i += 1; continue }
      if (c === '/' && n === '/') break
      if (c === '/' && n === '*') { inBlock = true; i += 2; continue }
      code += c; skeleton += c; i += 1
    }
    out.push({ code, skeleton })
  }
  return out
}

/**
 * يجمع الأسطر في **جُمل** ليُقرأ المُحدِّد مع الفعل الواقع عليه.
 * السلسلة تمتدّ عبر الأسطر (`.or(...)` في سطر تالٍ)، فقطعها بالسطر يُخفي `.click()`.
 *
 * والعمق يُحسب بالأقواس المستديرة والمربّعة **دون المعقوفة**: المعقوفة تفتح
 * كتلة (`try {`)، ولو عُدَّت لابتلعت الكتلة كلها في «جملة» واحدة فبلّغ الحارس
 * عن سطر `try` بدل السطر المخالف. وهذا بعينه ما التقطته مهاجمة الحارس: رصد
 * المخالفة **ونسب السطر خطأً** — والبلاغ الذي لا يدلّ على موضعه نصف بلاغ.
 * أمّا معقوفات الكائنات (`{ name: … }`) فداخل أقواس النداء أصلًا، فلا تُفلت.
 */
function statementsOf(lines) {
  const stmts = []
  let buf = ''
  let start = 0
  let depth = 0
  for (let i = 0; i < lines.length; i += 1) {
    const { code, skeleton } = lines[i]
    if (!buf.trim()) start = i + 1
    buf += (buf ? '\n' : '') + code
    for (const ch of skeleton) {
      if (ch === '(' || ch === '[') depth += 1
      if (ch === ')' || ch === ']') depth -= 1
    }
    if (depth < 0) depth = 0
    const trimmed = skeleton.trim()
    const next = (lines[i + 1]?.skeleton ?? '').trim()
    const continues =
      depth > 0 ||
      next.startsWith('.') ||
      /[.+,(&|?:]$|&&$|\|\|$|=>$|=$/.test(trimmed)
    if (!continues) {
      if (buf.trim()) stmts.push({ text: buf, line: start })
      buf = ''
    }
  }
  if (buf.trim()) stmts.push({ text: buf, line: start })
  return stmts
}

/** صيغ تحديد العنصر **بنصّه المعروض** — كلّها هشّة أمام أي موجة نبرة. */
const COPY_FORMS = [
  { name: 'getByRole({ name })', re: /getByRole\s*\([^;]*?\bname\s*:/s },
  { name: 'getByText(', re: /\bgetByText\s*\(/ },
  { name: 'getByLabel(', re: /\bgetByLabel\s*\(/ },
  { name: 'getByPlaceholder(', re: /\bgetByPlaceholder\s*\(/ },
  { name: 'getByTitle(', re: /\bgetByTitle\s*\(/ },
  { name: 'getByAltText(', re: /\bgetByAltText\s*\(/ },
  { name: 'مُحدِّد نصّي (text= / :has-text / :text)', re: /['"`]\s*text=|:has-text\s*\(|:text\s*\(/ },
]

/** أفعال التنقّل والتفاعل — وجود أحدها يجعل المُحدِّد **مسار وصول** لا تأكيدًا. */
const NAV_ACTIONS = [
  '.click(', '.dblclick(', '.fill(', '.check(', '.uncheck(', '.press(',
  '.selectOption(', '.hover(', '.tap(', '.focus(', '.setInputFiles(',
  '.waitFor(', '.scrollIntoViewIfNeeded(', '.dragTo(',
]

/** ربط المُحدِّد بمتغيّر = نيّة استعماله لاحقًا للوصول (`const next = …` ثم `next.click()`). */
const BINDING = /^\s*(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=/

/**
 * يفحص مصدرًا واحدًا ويُعيد المخالفات بأسطرها.
 * @returns {{file:string,line:number,form:string,trigger:string,snippet:string}[]}
 */
export function scanSource(file, source) {
  const lines = stripComments(source)
  const violations = []
  for (const stmt of statementsOf(lines)) {
    const form = COPY_FORMS.find((f) => f.re.test(stmt.text))
    if (!form) continue
    const action = NAV_ACTIONS.find((a) => stmt.text.includes(a))
    const bound = BINDING.test(stmt.text)
    if (!action && !bound) continue
    violations.push({
      file,
      line: stmt.line,
      form: form.name,
      trigger: action ? `فعل ${action})` : 'مربوط بمتغيّر يُستعمل للوصول',
      snippet: stmt.text.trim().replace(/\s+/g, ' ').slice(0, 160),
    })
  }
  return violations
}

/** كل ملفات الرحلات (عدا هذا الإثبات — استثناء معلَن أعلاه). */
function journeyFiles() {
  const found = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) walk(full)
      else if (entry.endsWith('.mjs') && entry !== SELF) found.push(relative(ROOT, full))
    }
  }
  walk(join(ROOT, JOURNEY_DIR))
  return found.sort()
}

// ───────────────────────── التشغيل ─────────────────────────

const checks = []
const check = (name, ok, detail = '') => {
  checks.push({ name, ok: Boolean(ok), detail })
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
}

console.log('\n▸ ١) الملفات المفحوصة')
console.log(`  ℹ️  مستثنى بإعلان: ${JOURNEY_DIR}/${SELF} — يحمل عيّنات المخالفات في إثباته المضادّ.`)
const files = journeyFiles()
for (const f of files) console.log(`     · ${f}`)

// الماسح لا يمرّ لأنه لم يجد شيئًا: الرحلات الثلاث **يجب** أن تكون تحت الفحص.
const REQUIRED = [
  `${JOURNEY_DIR}/newcomer.mjs`,
  `${JOURNEY_DIR}/minor.mjs`,
  `${JOURNEY_DIR}/advanced.mjs`,
  `${JOURNEY_DIR}/lib/kit.mjs`,
]
const missing = REQUIRED.filter((r) => !files.includes(r))
check(
  'الرحلات الثلاث ووحدتها المشتركة كلّها داخل نطاق الفحص (لا مرور بالفراغ)',
  missing.length === 0 && files.length >= REQUIRED.length,
  missing.length ? `غائب: ${missing.join(' · ')}` : `${files.length} ملفًا`,
)

console.log('\n▸ ٢) لا مُحدِّد وصول يعرف عنصره بنصّه')
const violations = files.flatMap((f) => scanSource(f, readFileSync(join(ROOT, f), 'utf8')))
for (const v of violations) {
  console.log(`     ✗ ${v.file}:${v.line} — ${v.form} · ${v.trigger}\n       ${v.snippet}`)
}
check(
  'لا مُحدِّد تنقّل في scripts/e2e/journeys/** مبنيّ على نصّ متغيّر',
  violations.length === 0,
  violations.length ? violations.map((v) => `${v.file}:${v.line}`).join(' · ') : 'صفر مخالفة',
)

console.log('\n▸ ٣) الإثبات المضادّ — محاكاة الالتفاف تسقط بفحص مسمّى')
const tmp = mkdtempSync(join(tmpdir(), 'journey-selector-'))

// (أ) إعادة إدخال مُحدِّد نصّي للتنقّل ⇒ يجب أن يُسمَّى بملفه وسطره.
const badFile = join(tmp, 'regression.mjs')
const badSource = [
  "import { chromium } from 'playwright'",                                   // 1
  '',                                                                         // 2
  'const page = await (await chromium.launch()).newPage()',                    // 3
  "await page.getByRole('button', { name: 'استعرض قِمّة أولًا', exact: true }).click()", // 4
  '',                                                                         // 5
].join('\n')
writeFileSync(badFile, badSource)
const caught = scanSource(badFile, badSource)
check(
  'مُحدِّد نصّي مُعاد للتنقّل يُرصد — مخالفة واحدة بالضبط',
  caught.length === 1,
  `${caught.length} مخالفة`,
)
check(
  'المخالفة تُسمّى بملفها وسطرها بالضبط (لا عدّ مجرَّد)',
  caught[0]?.file === badFile && caught[0]?.line === 4,
  `${caught[0]?.file ?? 'لا ملف'}:${caught[0]?.line ?? '—'} (المتوقّع ${badFile}:4)`,
)
check(
  'والمقتطف يحمل النصّ المخالف نفسه ليُقرأ بلا فتح الملف',
  Boolean(caught[0]?.snippet?.includes('استعرض قِمّة أولًا')) && Boolean(caught[0]?.form),
  caught[0]?.snippet ?? '—',
)

// (ب) الصيغة الثابتة على نفس الفعل ⇒ صفر مخالفة. الحارس يميّز ولا يشتم كل شيء.
const goodFile = join(tmp, 'stable.mjs')
const goodSource = [
  "import { chromium } from 'playwright'",
  '',
  'const page = await (await chromium.launch()).newPage()',
  'await page.locator(\'[data-testid="handoff-preview-cta"]\').click()',
  "await page.locator('[data-question-id=\"goal.primary\"]').locator('[data-choice=\"cut\"]').click()",
  "await page.getByRole('checkbox').first().check()",
  '',
].join('\n')
writeFileSync(goodFile, goodSource)
const stable = scanSource(goodFile, goodSource)
check(
  'المُحدِّدات الثابتة (testid · data-choice · دور بلا اسم) لا تُرصد — الحارس يميّز',
  stable.length === 0,
  stable.length ? stable.map((v) => `${v.line}:${v.form}`).join(' · ') : 'صفر مخالفة',
)

// (ج) نصّ في **تأكيد** لا في وصول ⇒ صفر مخالفة. القاعدة عن التنقّل لا عن الكلمات.
const assertFile = join(tmp, 'assertion.mjs')
const assertSource = [
  "const text = await page.locator('body').innerText()",
  "check('الشاشة تعرض عنوان الخطة', text.includes(t.ready.title))",
  "check('الهدف ظاهر', (await page.getByText(t.goal.label).count()) > 0)",
  '',
].join('\n')
writeFileSync(assertFile, assertSource)
const assertions = scanSource(assertFile, assertSource)
check(
  'النصّ داخل تأكيد محتوى لا يُرصد — الممنوع هو الوصول بالنصّ لا قراءته',
  assertions.length === 0,
  assertions.length ? assertions.map((v) => `${v.line}`).join(' · ') : 'صفر مخالفة',
)

// (د) وحتى التعليق الذي يذكر المُحدِّد القديم لا يُحسب — وإلا صار الحارس يقرأ الشروح.
const commentFile = join(tmp, 'comment.mjs')
const commentSource = [
  "// كان: page.getByRole('button', { name: 'استعرض قِمّة أولًا' }).click()",
  "await page.locator('[data-testid=\"handoff-preview-cta\"]').click()",
  '',
].join('\n')
writeFileSync(commentFile, commentSource)
const commented = scanSource(commentFile, commentSource)
check(
  'ذكر المُحدِّد القديم في تعليق لا يُرصد — الفحص على الكود لا على الشرح',
  commented.length === 0,
  commented.length ? `رُصد في السطر ${commented[0].line}` : 'صفر مخالفة',
)

console.log('\n▸ ٤) معرّفات الاختبار المستعملة موجودة فعلًا في المنتج')
// السبب: معرّف اختبار يختفي من المكوّن يُعيد نفس العطل الأصلي — انتظار ثلاثين
// ثانية بمهلة غامضة. الفحص الساكن يُسقطه **باسمه** قبل تشغيل أي متصفّح.
const referenced = new Set()
for (const f of files) {
  const src = readFileSync(join(ROOT, f), 'utf8')
  for (const m of src.matchAll(/data-testid=\\?["']([a-z0-9-]+)\\?["']/gi)) referenced.add(m[1])
  for (const m of src.matchAll(/byTestId\s*\(\s*page\s*,\s*['"]([a-z0-9-]+)['"]/gi)) referenced.add(m[1])
}
/**
 * معرّفات يولّدها المكوّن بقالب (`data-testid={`tab-${tb.id}`}`) فلا توجد حرفيًا
 * في المصدر. **تُعلَن هنا مع مولّدها**، ويُفحص وجود المولّد نفسه — لا تُعفى.
 */
const TEMPLATED = {
  'tab-workout': { file: 'src/components/MobileShell.tsx', generator: 'data-testid={`tab-${tb.id}`}' },
  'tab-nutrition': { file: 'src/components/MobileShell.tsx', generator: 'data-testid={`tab-${tb.id}`}' },
}
const srcFiles = []
const walkSrc = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walkSrc(full)
    else if (/\.tsx?$/.test(entry)) srcFiles.push({ path: relative(ROOT, full), text: readFileSync(full, 'utf8') })
  }
}
walkSrc(join(ROOT, 'src'))
const srcBlob = srcFiles.map((f) => f.text).join('\n')

/**
 * **وسم السطح الميت المعتمد في المشروع.** ملف يحمله معلَن أنه توأم غير موجَّه
 * لا يُشحن — والاستشهاد به بوصفه سلوك إنتاج ممنوع بنصّ رأسه.
 */
const DEAD_SURFACE_MARK = 'CANONICAL-SURFACE-LOCK'

/** هل الوحدة مستوردة فعلًا من ملف آخر؟ (يشمل `lazy(() => import('@/views/X'))`) */
const isImportedSomewhere = (path) => {
  const stem = path.replace(/^src\//, '').replace(/\.tsx?$/, '')
  const name = stem.split('/').pop()
  return srcFiles.some(
    (f) => f.path !== path && (f.text.includes(`@/${stem}'`) || f.text.includes(`/${name}'`) || f.text.includes(`./${name}'`)),
  )
}

const orphans = []
const deadSurface = []
for (const id of [...referenced].sort()) {
  const templated = TEMPLATED[id]
  if (templated) {
    const host = readFileSync(join(ROOT, templated.file), 'utf8')
    if (host.includes(templated.generator)) {
      console.log(`     ℹ️  ${id} — مولَّد بقالب معلَن في ${templated.file}`)
      continue
    }
    orphans.push(id)
    continue
  }
  const hosts = srcFiles.filter((f) => f.text.includes(`data-testid="${id}"`))
  if (hosts.length === 0) { orphans.push(id); continue }
  // ═══ درس مقيس [تكامل] ═══
  // وُضع `workout-missing-plan` على `WorkoutV2.tsx` — توأم يحمل الوسم أعلاه
  // وبلا مستوردين. فصار تأكيد «هذه الشاشة غائبة» **صادقًا أبدًا**: يمرّ ولو
  // انسدّ سطح التمرين الحيّ تمامًا. المعرّف الذي لا يعيش إلا في ملف ميت
  // يُنتج فحصًا لا يقيس شيئًا — فيُسمّى هنا، لا يُترك يمرّ.
  const live = hosts.filter((f) => !f.text.includes(DEAD_SURFACE_MARK) && isImportedSomewhere(f.path))
  if (live.length === 0) deadSurface.push(`${id} ← ${hosts.map((h) => h.path).join(' · ')}`)
}
check(
  'كل معرّف اختبار تستعمله الرحلات موجود في مكوّن حيّ (لا معرّف يتيم)',
  orphans.length === 0,
  orphans.length ? `يتيم: ${orphans.join(' · ')}` : `${referenced.size} معرّفًا مؤكَّدًا`,
)
for (const d of deadSurface) console.log(`     ✗ ${d}`)
check(
  'ولا معرّف يعيش في سطح ميت وحده (توأم موسوم أو بلا مستوردين) — وإلا فالفحص عليه صادق أبدًا',
  deadSurface.length === 0,
  deadSurface.length ? deadSurface.join(' | ') : 'كل مضيف حيّ وموجَّه',
)

// الإثبات المضادّ لهذا الفحص: السطح الميت المعروف يُرصد فعلًا.
// لو زال الوسم عن `WorkoutV2.tsx` أو صار موجَّهًا، سقط هذا باسمه ليُراجَع.
const DEAD_TWIN = 'src/views/WorkoutV2.tsx'
const deadTwin = srcFiles.find((f) => f.path === DEAD_TWIN)
check(
  'كاشف السطح الميت يرى التوأم المعروف — الحارس نفسه ذو معنى',
  Boolean(deadTwin) && deadTwin.text.includes(DEAD_SURFACE_MARK) && !isImportedSomewhere(DEAD_TWIN),
  `${DEAD_TWIN}: وسم=${Boolean(deadTwin?.text.includes(DEAD_SURFACE_MARK))} · مستورَد=${deadTwin ? isImportedSomewhere(DEAD_TWIN) : '—'}`,
)

// ───────────────────────── الخلاصة ─────────────────────────
const failed = checks.filter((c) => !c.ok)
console.log(`\n${'─'.repeat(60)}`)
if (failed.length) {
  console.error(`❌ إثبات ثبات المُحدِّدات: ${failed.length} فحصًا ساقطًا من ${checks.length}`)
  for (const f of failed) console.error(`   • ${f.name}${f.detail ? ` — ${f.detail}` : ''}`)
  process.exit(1)
}
console.log(`✅ إثبات ثبات المُحدِّدات: ${checks.length} فحصًا · ${files.length} ملفًا · ${referenced.size} معرّفًا`)
process.exit(0)
