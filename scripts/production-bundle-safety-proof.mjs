/**
 * سلامة أصل الإنتاج — يُفحص **الملف المبني** لا المصدر.
 *
 * البندان ٢٧ و٣٠ في سجلّ القبول بقيا «إثبات المصدر أخضر، وعدّاد الأصل المبني
 * معلّق». والفرق ليس شكليًا: `mockEnabled()` تقرأ `import.meta.env` وقرارها
 * وقت بناء — فادّعاء أن بناء الإنتاج لا يحمل بذرة الاختبار **يُثبت على الحزمة
 * المشحونة أو لا يُثبت**.
 *
 * ═══ لماذا فيه بناءان ═══
 * ماسحٌ يبحث عن نصّ غير موجود في أي بناء يمرّ دائمًا — وهو «مرور غير مستحقّ»
 * (الميثاق §4.2). فالإثبات هنا مقترن:
 *   • بناء الإنتاج  ⇒ البذرة **غائبة** (المطلوب).
 *   • بناء التقليد  ⇒ البذرة **حاضرة** (يُثبت أن الماسح يراها أصلًا).
 * إن غابت في الاثنين فالماسح أعمى، ويسقط الإثبات بفحص مسمّى.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let passed = 0
const check = (label, condition) => {
  assert.ok(condition, label)
  passed += 1
  console.log(`  ✓ ${label}`)
}

/** بذور الاختبار/التطوير التي لا يجوز أن تُشحن. */
const SEAMS = [
  { id: 'mock-activation-code', pattern: /QIMMAH-TEST-(?:OK|USED|EXPIRED|OFFLINE)/ },
  { id: 'mock-entitlement-key', pattern: /qimmah:entitlement-mock/ },
]

/** نقاط نهاية تطويرية لا مكان لها في أصل منشور. */
const DEV_ENDPOINTS = [
  { id: 'localhost', pattern: /https?:\/\/localhost(?::\d+)?/ },
  { id: 'loopback-ip', pattern: /https?:\/\/127\.0\.0\.1(?::\d+)?/ },
  { id: 'vite-dev-client', pattern: /@vite\/client|__vite_plugin_react_preamble/ },
]

/**
 * استثناء **واحد مسمّى** — ثابت داخل مكتبة طرف ثالث، لا نقطة نهاية لقِمّة.
 *
 * `@supabase/auth-js` تحمل `http://localhost:9999` عنوانًا افتراضيًا يُستعمل فقط
 * حين لا يُمرَّر عنوان. وقِمّة تمرّر عنوانًا صريحًا دائمًا (متغيّر البيئة أو عنوان
 * المشروع العام في `supabaseClient.ts`)، فالثابت شيفرة ميتة لا مسار.
 *
 * والاستثناء يُحرَس ولا يُمنح (الميثاق §4.2): القسم ③ يثبت أن الطرح ضيّق —
 * أي عنوان تطوير **يملكه المنتج** ما زال يُسقط الإثبات بفحص مسمّى.
 */
const VENDOR_DEAD_CONSTANTS = [
  {
    id: 'gotrue-default-url',
    pattern: /http:\/\/localhost:9999/g,
    why: '@supabase/auth-js default GOTRUE_URL — unreachable because the client is always constructed with an explicit url',
  },
]

const stripVendorDeadConstants = (text) =>
  VENDOR_DEAD_CONSTANTS.reduce((acc, v) => acc.replace(v.pattern, '/*vendor-dead-constant*/'), text)

function buildInto(mode) {
  const out = mkdtempSync(join(tmpdir(), `qimmah-bundle-${mode}-`))
  const env = { ...process.env, VITE_BUILD_OUT_DIR: out }
  if (mode === 'mock') env.VITE_ENTITLEMENT_MODE = 'mock'
  else delete env.VITE_ENTITLEMENT_MODE
  execFileSync('npx', ['vite', 'build', '--outDir', out, '--emptyOutDir'], {
    cwd: root,
    env,
    stdio: 'pipe',
    encoding: 'utf8',
  })
  return out
}

function jsAssets(dir) {
  const files = []
  const walk = (d) => {
    for (const entry of readdirSync(d)) {
      const p = join(d, entry)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.(?:js|mjs|css|html)$/.test(entry)) files.push(p)
    }
  }
  walk(dir)
  return files
}

function scan(dir, patterns, { stripVendor = false } = {}) {
  const hits = []
  for (const file of jsAssets(dir)) {
    const raw = readFileSync(file, 'utf8')
    const text = stripVendor ? stripVendorDeadConstants(raw) : raw
    for (const { id, pattern } of patterns) {
      // إعادة الضبط: بعض الأنماط عامّة (`g`) فتحتفظ بـlastIndex بين الملفات.
      pattern.lastIndex = 0
      if (pattern.test(text)) hits.push({ id, file: file.slice(dir.length + 1) })
    }
  }
  return hits
}

/** يفحص نصًّا واحدًا — يُستعمل للعدّاد المضادّ على أصل اصطناعي. */
function devEndpointHits(text) {
  const stripped = stripVendorDeadConstants(text)
  return DEV_ENDPOINTS.filter(({ pattern }) => {
    pattern.lastIndex = 0
    return pattern.test(stripped)
  }).map(({ id }) => id)
}

console.log('\n① بناء الإنتاج النظيف')
const prod = buildInto('production')
const prodFiles = jsAssets(prod)
check(`أصل الإنتاج مبني ويحمل ملفات (${prodFiles.length})`, prodFiles.length > 0)

console.log('\n② بذرة الاختبار غائبة عن أصل الإنتاج')
const prodSeams = scan(prod, SEAMS)
assert.deepEqual(
  prodSeams,
  [],
  `production-seam-leak: بذرة اختبار في أصل الإنتاج → ${JSON.stringify(prodSeams)}`,
)
check('لا كود تفعيل تجريبي في حزمة الإنتاج', true)
check('لا مفتاح استحقاق مُقلَّد في حزمة الإنتاج', true)

console.log('\n③ لا نقطة نهاية تطويرية يملكها المنتج في أصل الإنتاج')
const prodDev = scan(prod, DEV_ENDPOINTS, { stripVendor: true })
assert.deepEqual(
  prodDev,
  [],
  `production-dev-endpoint: نقطة تطوير في أصل الإنتاج → ${JSON.stringify(prodDev)}`,
)
check('لا نقطة نهاية تطويرية لقِمّة في حزمة الإنتاج', true)
check('لا عميل تطوير Vite في حزمة الإنتاج', true)

// الاستثناء الوحيد يبقى ضيّقًا: عنوان تطوير يملكه المنتج ما زال يسقط.
for (const owned of ['http://localhost:5173', 'http://127.0.0.1:5325', 'https://localhost:3000']) {
  const hits = devEndpointHits(`const api="${owned}";`)
  assert.ok(
    hits.length > 0,
    `vendor-exception-too-wide: الاستثناء ابتلع عنوانًا يملكه المنتج (${owned}) — الطرح يجب أن يبقى على الثابت المسمّى وحده`,
  )
}
check('الاستثناء لا يبتلع عنوان تطوير يملكه المنتج (٣ محاولات)', true)

// والثابت المستثنى نفسه لا يُبلَغ: العميل يُبنى بعنوان صريح دائمًا.
const clientSrc = readFileSync(resolve(root, 'src/lib/supabaseClient.ts'), 'utf8')
assert.match(
  clientSrc,
  /createClient\(url,\s*anonKey/,
  'vendor-exception-unsafe: العميل يجب أن يُمرَّر عنوانًا صريحًا وإلا صار افتراضي المكتبة مسارًا حيًّا',
)
assert.match(
  clientSrc,
  /const DEFAULT_SUPABASE_URL = 'https:\/\/[^']+'/,
  'vendor-exception-unsafe: عنوان الاحتياط يجب أن يكون مشروعًا حقيقيًا لا عنوان تطوير',
)
check('ثابت المكتبة المستثنى شيفرة ميتة — العميل يُمرَّر عنوانًا صريحًا دائمًا', true)

console.log('\n④ العدّاد المضادّ — الماسح يرى البذرة فعلًا')
const mock = buildInto('mock')
const mockSeams = scan(mock, SEAMS)
assert.ok(
  mockSeams.some((h) => h.id === 'mock-activation-code'),
  'scanner-blind: الماسح لم يجد بذرة الاختبار في بناء التقليد — فغيابها من الإنتاج لا يثبت شيئًا',
)
check(`الماسح يجد البذرة في بناء التقليد (${mockSeams.length} إصابة)`, true)
check('غياب البذرة عن الإنتاج نتيجة مستحقّة لا عمى أداة', true)

console.log(`\n✅ سلامة أصل الإنتاج: ${passed}/${passed} فحصًا`)
console.log(`   production=${prod}`)
console.log(`   mock=${mock}`)
