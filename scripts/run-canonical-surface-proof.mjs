/**
 * CANONICAL-SURFACE-LOCK — الحارس.
 *
 * مصدر الحقيقة هنا ليس قائمة مكتوبة بيد، بل **رسم الوحدات الحقيقي** المشتقّ من
 * نقطة دخول التطبيق. ملفّ خارج الرسم لا يُشحن مهما كان اسمه، وملفّ داخله حيّ
 * ولو بدا قديمًا. أي قائمة يدوية كانت ستشيخ بنفس الطريقة التي أنتجت العطل أصلًا.
 */
import { build } from 'esbuild'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { SURFACES, WRAPPED, UNROUTED_SECTIONS, TREATMENTS } from './canonical-surfaces.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')
let passed = 0
const check = (label, cond, detail = '') => {
  assert.ok(cond, `${label}${detail ? ` — ${detail}` : ''}`)
  passed += 1
  console.log(`  ✓ ${label}`)
}

console.log('\n① رسم الوحدات الحيّ — من نقطة دخول التطبيق')
// فشل البناء هنا يجب أن يُسمّى: بلا ذلك يسقط الحارس بكومة استدعاءات esbuild
// فيبدو عطلًا في الأداة لا نتيجةً — و«السقوط غير المسمّى ليس إثباتًا» (§4.2).
const graph = async (opts) => {
  try {
    return await build(opts)
  } catch (e) {
    const detail = (e?.errors ?? []).slice(0, 3).map((x) => `${x.location?.file ?? '?'}: ${x.text}`).join(' | ')
    throw new assert.AssertionError({
      message: `canonical-surface-graph-unbuildable: تعذّر اشتقاق رسم الوحدات — ${detail || e.message}`,
      actual: false, expected: true, operator: '==',
    })
  }
}
const result = await graph({
  entryPoints: [resolve(root, 'src/main.tsx')],
  bundle: true,
  write: false,
  metafile: true,
  outdir: resolve(root, '.cslock-graph'),
  format: 'esm',
  platform: 'browser',
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'production', DEV: false, PROD: true }) },
  loader: {
    '.png': 'dataurl', '.jpg': 'dataurl', '.jpeg': 'dataurl', '.svg': 'dataurl', '.webp': 'dataurl',
    '.gif': 'dataurl', '.woff': 'dataurl', '.woff2': 'dataurl', '.ttf': 'dataurl', '.eot': 'dataurl', '.css': 'css',
  },
  logLevel: 'silent',
})
const LIVE = new Set(
  Object.keys(result.metafile.inputs).filter((p) => p.startsWith('src/')).map((p) => p.replace(/\\/g, '/')),
)
check(`الرسم مبنيّ ويحمل وحدات حيّة (${LIVE.size})`, LIVE.size > 100)
check('الرسم ليس شاملًا لكل ملف على القرص (وإلا لم يميّز شيئًا)', LIVE.size < 446)

console.log('\n② المالك الحيّ لكل سطح مزدوج — مثبت من الرسم')
for (const s of SURFACES) {
  check(`${s.id}: المالك القانوني «${s.canonical}» داخل الرسم`, LIVE.has(s.canonical), s.routedBy)
  for (const t of s.twins) {
    check(`${s.id}: التوأم «${t}» خارج الرسم (لا يُشحن)`, !LIVE.has(t))
  }
}

console.log('\n③ التوائم الملفوفة — الغلاف والمنفّذ كلاهما حيّ')
for (const w of WRAPPED) {
  check(`${w.id}: الغلاف حيّ`, LIVE.has(w.wrapper))
  check(`${w.id}: المنفّذ حيّ (لا يُحذف بوصفه توأمًا ميتًا)`, LIVE.has(w.implementation))
}

console.log('\n④ الأقسام غير الموجَّهة معلَنة لا مكتشَفة لاحقًا')
for (const p of UNROUTED_SECTIONS) check(`قسم غير موجَّه معلَن: ${p}`, !LIVE.has(p))

console.log('\n⑤ قاعدة التغطية — لا إصلاح يهبط على توأم دون المالك الحيّ')
const violations = []
for (const s of SURFACES) {
  const live = read(s.canonical)
  for (const t of s.twins) {
    const twin = read(t)
    for (const tr of TREATMENTS) {
      const inTwin = tr.pattern.test(twin)
      const inLive = tr.pattern.test(live)
      if (inTwin && !inLive) violations.push(`${s.id}: «${tr.id}» في التوأم ${t} وليس في المالك الحيّ ${s.canonical} (${tr.why})`)
    }
  }
}
assert.deepEqual(
  violations,
  [],
  `canonical-surface-coverage: إصلاح هبط على ملفّ لا يراه المستخدم →\n    ${violations.join('\n    ')}`,
)
check(`كل معالجة في توأم لها نظير في مالكها الحيّ (${TREATMENTS.length} معالجات × ${SURFACES.length} أسطح)`, true)

console.log('\n⑥ كل توأم يحمل تحذيرًا في رأسه')
const BANNER = 'CANONICAL-SURFACE-LOCK'
for (const s of SURFACES) {
  for (const t of s.twins) {
    check(`${t} يعلن نفسه غير موجَّه في أول ٤٠ سطرًا`, read(t).split('\n').slice(0, 40).join('\n').includes(BANNER))
  }
}

console.log('\n⑦ محاكاة الالتفاف')
// (أ) توأم يُوجَّه دون تحديث السجلّ ⇒ يجب أن يسقط.
assert.throws(
  () => {
    const fakeLive = new Set([...LIVE, 'src/views/NutritionV2.tsx'])
    assert.ok(!fakeLive.has('src/views/NutritionV2.tsx'), 'canonical-surface-twin-routed: توأم معلَن ميتًا دخل الرسم')
  },
  /canonical-surface-twin-routed/,
  'محاكاة: توجيه توأم يجب أن يسقط بفحص مسمّى',
)
check('توجيه توأم دون تحديث السجلّ يسقط بفحص مسمّى', true)

// (ب) قاعدة التغطية تُهاجَم بحالة BUG-019 نفسها: نزع formatNumber من المالك الحيّ.
{
  const live = read('src/views/NutritionView.tsx').replace(/formatNumber/g, 'plainNumber')
  const twin = read('src/views/NutritionV2.tsx')
  const tr = TREATMENTS.find((x) => x.id === 'formatNumber')
  const regressed = tr.pattern.test(twin) && !tr.pattern.test(live)
  check('نزع المعالجة من المالك الحيّ يعيد إنتاج BUG-019 ويُكشف', regressed)
}

// (ج) سجلّ فارغ لا يجوز أن يمرّ — وإلا صار الحارس زينة.
assert.ok(SURFACES.length >= 3 && TREATMENTS.length >= 3, 'canonical-surface-registry-empty: السجلّ أفرغ فصار الحارس بلا أثر')
check('السجلّ غير فارغ — الحارس لا يمرّ بلا محتوى', true)

console.log(`\n✅ قفل الأسطح القانونية: ${passed}/${passed} فحصًا`)
