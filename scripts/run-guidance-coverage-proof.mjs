// إثبات تغطية الإرشاد والوسائط — [SOVEREIGN-003] حارة إرشاد التمارين.
//
// ── ما يحرسه ──
// ① «نصائح تقنية» مغطّاة بالإنجليزية لكل تمرين في الكتالوج — الكتلة التي كانت تقول
//    «English guidance for this exercise is not available yet.» في ١٨١ من ١٨١.
// ② التغطية **حقيقية لا مصطنعة**: لا نصّ نائب، ولا حشو قصير، ولا سلسلة واحدة مكرّرة
//    ١٨١ مرّة، ولا نسخٌ من خطوات الـcue لملء العدد.
// ③ اقتران اللغتين: نفس العدد، ولا حرف عربي في الإنجليزية ولا العكس.
// ④ وصل الشاشة فعلًا: `ExerciseDetail` يقرأ المصدر المؤلَّف — لا يكفي أن يُبنى.
// ⑤ فجوة الصورة تُقال صراحةً على **البطاقة** كما تُقال على **التفصيل** — لا فراغ صامت.
// ⑥ `docs/media/FOUNDER-SOURCING-LIST.md` مطابقة للمانيفست الإنتاجي — وثيقة لا تشيخ.
//
// ── انضباط §4.2 من الميثاق ──
// كل تأكيد بنيوي يرافقه **محاكاة التفاف تفشل بفحص مسمّى**. المحاكاة تُشغَّل على نصّ
// مُصطنَع (لا على المستودع)، وتُعدّ ناجحة فقط إذا **فشل** الفحص المسمّى نفسه.
// إثبات لا يستطيع أن يفشل لا يُثبت شيئًا.
//
// Run: node scripts/run-guidance-coverage-proof.mjs

import { build } from 'esbuild'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (f) => readFileSync(resolve(root, f), 'utf8')

let passed = 0
let failed = 0
const check = (label, ok, detail = '') => {
  if (ok) {
    passed++
    console.log(`  ✓ ${label}`)
  } else {
    failed++
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
  }
  return Boolean(ok)
}

/**
 * محاكاة التفاف: تُمرَّر دالّة فحص ونصّ مُصطنَع يحاول الالتفاف عليها.
 * تنجح المحاكاة **فقط** إذا رفض الفحص النصّ المصطنَع — وترفع خطأً مسمّى إذا قبله.
 * وترفع خطأً مسمّى كذلك إذا سقط الفحص باستثناء تقني بدل حكم مسمّى (§4.2).
 */
let counters = 0
const bypass = (label, fn) => {
  counters++
  let verdict
  try {
    verdict = fn()
  } catch (err) {
    failed++
    console.log(`  ✗ [محاكاة] ${label} — سقط الفحص باستثناء تقني (${err.constructor.name}: ${err.message}) لا بحكم مسمّى`)
    return
  }
  if (verdict === false) {
    passed++
    console.log(`  ✓ [محاكاة] ${label} — الالتفاف مرفوض`)
  } else {
    failed++
    console.log(`  ✗ [محاكاة] ${label} — **الالتفاف مرّ**؛ البوابة رخوة`)
  }
}

// ═══════════ تحميل وحدات التطبيق الحقيقية ═══════════
const tmp = mkdtempSync(join(tmpdir(), 'guidance-coverage-'))
const entryFile = join(tmp, 'entry.ts')
writeFileSync(
  entryFile,
  `export { exercises } from '@/data/exercises'
export { EXERCISE_TECHNIQUE_TIPS } from '@/data/coaching/exerciseTechniqueTips.generated'
export { authoredTechniqueTips, hasAuthoredTechniqueTips, guidanceFor } from '@/lib/exerciseGuidance'
export { getCue } from '@/lib/coaching'
export { EXERCISE_PRODUCTION_MANIFEST } from '@/data/exerciseProductionManifest.generated'
`,
)
const built = await build({
  entryPoints: [entryFile],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false, VITE_SYNC_ENABLED: '' }) },
  logLevel: 'warning',
})
const modFile = join(tmp, 'mod.mjs')
writeFileSync(modFile, built.outputFiles[0].text)
const M = await import(pathToFileURL(modFile).href)

const catalog = M.exercises
const CATALOG_N = catalog.length

// ═══════════ الفحوص القابلة للمحاكاة ═══════════
// كل فحص دالّة نقيّة على «جدول نصائح» — نمرّرها الجدول الحقيقي مرّة، ثم جدولًا
// مُصطنَعًا في المحاكاة. فالمنطق واحد لا نسختان تنحرفان.

const ARABIC = /[؀-ۿ]/
const PLACEHOLDER = /(not available|coming soon|coming later|to be (added|written|filled)|\bTBD\b|\bTODO\b|placeholder|lorem ipsum|غير متاح|غير متوفر|قيد الإضافة|قيد الكتابة|لاحقًا)/i
const MIN_TIP_CHARS = 30

/** ① التغطية: لكل معرّف في الكتالوج مدخلٌ بثلاث نصائح على الأقل في اللغتين. */
const coverageOk = (table) =>
  catalog.every((e) => {
    const t = table[e.id]
    return Boolean(t) && Array.isArray(t.en) && Array.isArray(t.ar) && t.en.length >= 3 && t.ar.length >= 3
  })

/** ② لا نصّ نائب ولا حشو قصير — في أي لغة. */
const noPlaceholderOk = (table) =>
  Object.values(table).every((t) =>
    [...(t.en ?? []), ...(t.ar ?? [])].every((s) => typeof s === 'string' && s.trim().length >= MIN_TIP_CHARS && !PLACEHOLDER.test(s)),
  )

/**
 * ③ التغطية غير مصطنعة بالتكرار.
 * جدول يملأ ١٨١ مدخلًا بسلسلة واحدة **يمرّ** فحصَي التغطية والنصّ النائب معًا — وهو
 * بالضبط شكل «الحشو ليبلغ الرقم». فالحدّ الأدنى للتمايز جزء من العقد لا زينة.
 */
const DISTINCT_FRAGMENT_FLOOR = 30
const DISTINCT_COMBO_FLOOR = 50
const distinctFragments = (table, lang) => new Set(Object.values(table).flatMap((t) => t[lang] ?? [])).size
const distinctCombos = (table, lang) => new Set(Object.values(table).map((t) => (t[lang] ?? []).join(''))).size
const varietyOk = (table) =>
  distinctFragments(table, 'en') >= DISTINCT_FRAGMENT_FLOOR &&
  distinctFragments(table, 'ar') >= DISTINCT_FRAGMENT_FLOOR &&
  distinctCombos(table, 'en') >= DISTINCT_COMBO_FLOOR &&
  distinctCombos(table, 'ar') >= DISTINCT_COMBO_FLOOR

/** ④ نقاء اللغة: الإنجليزية بلا حرف عربي، والعربية تحمل حروفًا عربية. */
const purityOk = (table) =>
  Object.values(table).every((t) => (t.en ?? []).every((s) => !ARABIC.test(s)) && (t.ar ?? []).every((s) => ARABIC.test(s)))

/** ⑤ اقتران العددين: اللغتان من نفس المؤلِّف فعددهما واحد لكل تمرين. */
const parityOk = (table) => Object.values(table).every((t) => (t.en ?? []).length === (t.ar ?? []).length)

/**
 * ⑥ النصائح ليست نسخًا من خطوات/أخطاء الـcue.
 * «نصائح تقنية» كتلة رابعة مستقلّة؛ لو نُسخت من الكتلة المجاورة صارت التغطية رقمًا
 * على الشاشة بلا معلومة جديدة — وهذا حشو وإن بدا نصًّا حقيقيًا.
 */
const notCueEchoOk = (table) =>
  catalog.every((e) => {
    const t = table[e.id]
    if (!t) return false
    for (const lang of ['ar', 'en']) {
      const cue = M.getCue(e.id, lang)
      const cueText = new Set([...cue.steps, ...cue.mistakes, cue.safety].map((s) => s.trim()))
      if ((t[lang] ?? []).some((s) => cueText.has(s.trim()))) return false
    }
    return true
  })

const REAL = M.EXERCISE_TECHNIQUE_TIPS

console.log('\n① نصائح تقنية مؤلَّفة — التغطية والجودة\n')
check(`تغطية ${CATALOG_N}/${CATALOG_N} بثلاث نصائح فأكثر في اللغتين`, coverageOk(REAL))
check(`لا نصّ نائب ولا حشو أقصر من ${MIN_TIP_CHARS} حرفًا`, noPlaceholderOk(REAL))
check(
  `تمايز حقيقي (جذاذات en=${distinctFragments(REAL, 'en')} ar=${distinctFragments(REAL, 'ar')} · تركيبات en=${distinctCombos(REAL, 'en')} ar=${distinctCombos(REAL, 'ar')})`,
  varietyOk(REAL),
)
check('نقاء اللغة في الاتجاهين', purityOk(REAL))
check('عدد النصائح متطابق بين اللغتين لكل تمرين', parityOk(REAL))
check('النصائح ليست نسخًا من خطوات/أخطاء/سلامة الـcue', notCueEchoOk(REAL))
check(
  'لا مدخل يتيم (نصائح لتمرين خارج الكتالوج)',
  Object.keys(REAL).every((id) => catalog.some((e) => e.id === id)),
  Object.keys(REAL).filter((id) => !catalog.some((e) => e.id === id)).join(', '),
)
check(
  `الدالّة العمومية تُرجع نصًّا إنجليزيًا لكل ${CATALOG_N} تمرينًا`,
  catalog.every((e) => M.authoredTechniqueTips(e.id, 'en').length >= 3),
)
check(
  'معرّف خارج الكتالوج يُرجع فراغًا صادقًا لا نصًّا مخترعًا',
  M.authoredTechniqueTips('no-such-exercise-id', 'en').length === 0 && M.hasAuthoredTechniqueTips('no-such-exercise-id') === false,
)

console.log('\n② محاكاة الالتفاف — كل حارس يُهاجَم\n')
const fakeTable = (make) => Object.fromEntries(catalog.map((e) => [e.id, make(e)]))

bypass('حذف تمرين واحد من الجدول يسقط فحص التغطية', () => {
  const t = { ...REAL }
  delete t[catalog[0].id]
  return coverageOk(t)
})
bypass('نصّ نائب «coming soon» يسقط فحص الحشو', () =>
  noPlaceholderOk(fakeTable(() => ({ ar: ['نصائح هذا التمرين قيد الإضافة قريبًا.', 'نصائح هذا التمرين قيد الإضافة قريبًا.', 'نصائح هذا التمرين قيد الإضافة قريبًا.'], en: ['Technique tips for this exercise are coming soon.', 'Technique tips for this exercise are coming soon.', 'Technique tips for this exercise are coming soon.'] }))),
)
bypass('نصّ قصير جدًا («Do it well.») يسقط فحص الحشو', () =>
  noPlaceholderOk(fakeTable(() => ({ ar: ['سوّها زين.', 'سوّها زين.', 'سوّها زين.'], en: ['Do it well.', 'Do it well.', 'Do it well.'] }))),
)
bypass('سلسلة واحدة معقولة مكرّرة ١٨١ مرّة تسقط فحص التمايز', () => {
  const one = {
    ar: ['خلّ حركتك متحكّم فيها وتنفّس بثبات طول المجموعة كاملة.', 'اختر وزنًا يسمح لك بمدى حركة كامل ونظيف دائمًا.', 'ركّز على العضلة المستهدفة ولا تستعين بالزخم أبدًا.'],
    en: ['Keep every rep controlled and keep your breathing steady throughout the set.', 'Pick a weight that lets you own a full, clean range of motion.', 'Focus on the target muscle and never lean on momentum to finish.'],
  }
  const t = fakeTable(() => one)
  // يمرّ التغطية والحشو معًا — ولا يمرّ التمايز.
  if (!coverageOk(t) || !noPlaceholderOk(t)) throw new Error('المحاكاة غير مطابقة لنيّتها: يجب أن تمرّ التغطية والحشو')
  return varietyOk(t)
})
bypass('نسخ النصّ العربي في الحقل الإنجليزي يسقط فحص النقاء', () =>
  purityOk(fakeTable((e) => ({ ar: REAL[e.id].ar, en: REAL[e.id].ar }))),
)
bypass('عدد مختلف بين اللغتين يسقط فحص الاقتران', () =>
  parityOk(fakeTable((e) => ({ ar: REAL[e.id].ar, en: REAL[e.id].en.slice(0, 2) }))),
)
bypass('نسخ خطوات الـcue في خانة النصائح يسقط فحص الصدى', () =>
  notCueEchoOk(fakeTable((e) => ({ ar: M.getCue(e.id, 'ar').steps.slice(0, 3), en: M.getCue(e.id, 'en').steps.slice(0, 3) }))),
)

// ═══════════ ③ الوصل الحيّ — لا يكفي أن يُبنى ═══════════
console.log('\n③ الوصل الحيّ بالشاشة\n')

const detailSrc = read('src/components/ExerciseDetail.tsx')

/**
 * استخراج كتلة `AboutTab` بحدودها ثم فحص **إسناد `tips` داخلها**.
 * لا `includes()` متفرّقة: وجود اسم الدالّة في الملف وحده لا يعني أنها هي التي تغذّي
 * المتغيّر المعروض — وهذا بالضبط شكل البوابة الرخوة الذي يرفضه الميثاق §4.2.
 */
const aboutBlock = (src) => {
  const start = src.indexOf('function AboutTab(')
  if (start < 0) return ''
  const next = src.indexOf('\nfunction ', start + 1)
  return src.slice(start, next < 0 ? src.length : next)
}
const tipsWiredOk = (src) => {
  const block = aboutBlock(src)
  if (!block) return false
  const assignment = block.match(/^\s*const tips = (.+)$/m)
  if (!assignment) return false
  // الإسناد نفسه يجب أن يمرّ بالمصدر المؤلَّف، ويجب أن يكون المصدر مشتقًّا من `ex.id` واللغة.
  return /authoredTips/.test(assignment[1]) && /const authoredTips = authoredTechniqueTips\(ex\.id, lang\)/.test(block)
}
check('إسناد `tips` داخل AboutTab يمرّ بالمصدر المؤلَّف بمعرّف التمرين واللغة', tipsWiredOk(detailSrc))
bypass('العودة إلى `const tips = g.tips` تسقط فحص الوصل', () =>
  tipsWiredOk(detailSrc.replace(/const authoredTips = authoredTechniqueTips\(ex\.id, lang\)\n\s*const tips = .+/, 'const tips = g.tips')),
)
bypass('استدعاء الدالّة في مكان آخر من الملف بلا إسناد لا يُرضي الفحص', () =>
  tipsWiredOk(
    detailSrc
      .replace(/const authoredTips = authoredTechniqueTips\(ex\.id, lang\)\n\s*const tips = .+/, 'const tips = g.tips')
      .replace('function AboutTab(', 'const _unused = authoredTechniqueTips(ex.id, lang)\nfunction AboutTab('),
  ),
)

// ═══════════ ④ فجوة الصورة تُقال على السطحين ═══════════
console.log('\n④ تدهور صادق لفجوة الصورة — البطاقة والتفصيل\n')

const librarySrc = read('src/views/ExerciseLibraryView.tsx')
const mediaSrc = read('src/components/ExerciseMedia.tsx')

const cardFallbackBlock = (src) => {
  const fn = src.indexOf('function ExerciseCardMedia(')
  if (fn < 0) return ''
  const next = src.indexOf('\nfunction ', fn + 1)
  const body = src.slice(fn, next < 0 ? src.length : next)
  const br = body.indexOf("if (!src || state === 'failed')")
  if (br < 0) return ''
  const end = body.indexOf('\n  }', br)
  return body.slice(br, end < 0 ? body.length : end)
}
/** البطاقة تقول الفجوة بنصٍّ من القاموس، ولا تُخفي الكتلة كلّها عن القارئ الصوتي. */
const cardHonestOk = (src) => {
  const block = cardFallbackBlock(src)
  if (!block) return false
  const usesDictText = /exerciseMediaStrings\[lang\]\.pendingTitle/.test(block)
  const containerHidden = /data-media-state="fallback"[\s\S]{0,200}?aria-hidden|aria-hidden[\s\S]{0,200}?data-media-state="fallback"/.test(
    block.replace(/<Icon[^>]*\/>/g, ''), // أيقونة زخرفية يجوز إخفاؤها؛ الحاوية لا
  )
  return usesDictText && !containerHidden
}
check('بديل بطاقة المكتبة يعرض نصّ الفجوة من القاموس وليس مخفيًّا عن القارئ الصوتي', cardHonestOk(librarySrc))
bypass('العودة إلى الأيقونة الصامتة داخل aria-hidden تسقط الفحص', () =>
  cardHonestOk(
    librarySrc.replace(
      /(<span\n\s*data-testid="exercise-card-media")/,
      '<span\n        aria-hidden="true"\n        data-testid="exercise-card-media"',
    ).replace(/\{exerciseMediaStrings\[lang\]\.pendingTitle\}/, ''),
  ),
)
bypass('حذف نصّ القاموس مع إبقاء الأيقونة يسقط الفحص', () =>
  cardHonestOk(librarySrc.replace(/\{exerciseMediaStrings\[lang\]\.pendingTitle\}/, '')),
)

check(
  'الشاشة التفصيلية تعرض نفس نصّ القاموس عند غياب الوسيط (MediaPending)',
  /pendingTitle/.test(mediaSrc) && /pendingBody/.test(mediaSrc),
)
check('الحالة المصغّرة من MediaPending تحمل اسمًا للقارئ الصوتي بدل فراغ صامت', /aria-label=\{compact \? s\.pendingTitle : undefined\}/.test(mediaSrc))
check(
  'رقائق العضلات على الوسيط تتبع لغة الواجهة (لا تسمية عربية ثابتة)',
  /muscleGroupLabel\(m, lang\)/.test(mediaSrc) && !/muscleLabelAr\(/.test(mediaSrc),
)
check(
  'لا مسار يعرض صورة لتمرين حالته ليست APPROVED (المانيفست هو السلطة)',
  /approvedImageFor\(exerciseId\)/.test(librarySrc) && /productionEntryFor\(exerciseId\)/.test(librarySrc),
)

// ═══════════ ⑤ وثيقة المؤسس مطابقة للمانيفست ═══════════
console.log('\n⑤ قائمة تزويد المؤسس — مشتقّة لا مكتوبة\n')

const DOC = 'docs/media/FOUNDER-SOURCING-LIST.md'
const docExists = check('الوثيقة موجودة', existsSync(resolve(root, DOC)))
if (docExists) {
  const doc = read(DOC)
  const manifest = M.EXERCISE_PRODUCTION_MANIFEST
  const missingIds = catalog.filter((e) => manifest[e.id]?.imageStatus === 'MISSING').map((e) => e.id)
  const reviewIds = catalog.filter((e) => manifest[e.id]?.videoStatus === 'NEEDS_REVIEW').map((e) => e.id)

  // الوثيقة تصنّف كل تمرين: الجرد الكامل يذكر الـ١٨١ جميعًا.
  check(
    `كل ${CATALOG_N} تمرينًا مصنّف في الوثيقة`,
    catalog.every((e) => doc.includes(`\`${e.id}\``)),
    catalog.filter((e) => !doc.includes(`\`${e.id}\``)).slice(0, 5).map((e) => e.id).join(', '),
  )

  // قسم التزويد يذكر كل ناقص **بصفٍّ فيه وصف مطلوب وعبارة بحث** — لا مجرّد ذكر للمعرّف.
  const sourcingSection = doc.slice(doc.indexOf('## ② '), doc.indexOf('## ③ '))
  const sourcingRowFor = (id) => sourcingSection.split('\n').find((l) => l.includes(`\`${id}\``))
  const rowComplete = (id) => {
    const row = sourcingRowFor(id)
    if (!row) return false
    const cells = row.split('|').map((c) => c.trim())
    // | # | id | ar | en | equip | pattern | need | search |  → ٨ خانات + طرفان فارغان = ١٠
    return cells.length >= 10 && cells[7].length > 40 && /^`[a-z0-9 '\-]+`$/i.test(cells[8])
  }
  check(
    `كل ${missingIds.length} تمرينًا ناقص الصورة له صفّ تزويد كامل (وصفٌ + عبارة بحث)`,
    missingIds.every(rowComplete),
    missingIds.filter((id) => !rowComplete(id)).slice(0, 5).join(', '),
  )
  check(
    'لا تمرين معتمد الصورة مدرَج في قسم التزويد بالخطأ',
    catalog.filter((e) => manifest[e.id]?.imageStatus === 'APPROVED').every((e) => !sourcingRowFor(e.id)),
    catalog.filter((e) => manifest[e.id]?.imageStatus === 'APPROVED' && sourcingRowFor(e.id)).slice(0, 5).map((e) => e.id).join(', '),
  )
  check(
    `كل ${reviewIds.length} مرجع فيديو بانتظار المراجعة مذكور`,
    reviewIds.every((id) => doc.includes(`\`${id}\``)),
  )
  const stat = (n) => new RegExp(`\\*\\*${n}\\*\\*`).test(doc)
  check(
    `الأرقام المعلَنة تطابق المانيفست (APPROVED ${catalog.length - missingIds.length} · MISSING ${missingIds.length} · فيديو NEEDS_REVIEW ${reviewIds.length})`,
    stat(catalog.length - missingIds.length) && stat(missingIds.length) && stat(reviewIds.length),
  )
  bypass('رقمٌ لا يطابق المانيفست يسقط فحص الأرقام', () => stat(missingIds.length + 1) && stat(catalog.length - missingIds.length))
  bypass('ذكر المعرّف وحده بلا وصفٍ ولا عبارة بحث لا يُعدّ صفَّ تزويد', () => {
    const id = missingIds[0]
    const stripped = sourcingSection.replace(sourcingRowFor(id), `| 1 | \`${id}\` | — | — | — | — | — | — |`)
    const row = stripped.split('\n').find((l) => l.includes(`\`${id}\``))
    const cells = row.split('|').map((c) => c.trim())
    return cells.length >= 10 && cells[7].length > 40 && /^`[a-z0-9 '\-]+`$/i.test(cells[8])
  })
}

console.log(`\n────────────────────────────────────────────────`)
console.log(
  failed === 0
    ? `✅ إثبات تغطية الإرشاد والوسائط: ${passed} نجح · 0 فشل (منها ${counters} محاكاة التفاف).`
    : `❌ إثبات تغطية الإرشاد والوسائط: ${passed} نجح · ${failed} فشل (منها ${counters} محاكاة التفاف).`,
)
if (failed) process.exitCode = 1
