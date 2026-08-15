// إثبات عدم تسريب مفتاح مميّز إلى المتصفّح.
// [QIMMAH-SOVEREIGN-PHASE-II-001] · AGENT-E.
//
// ═══ لماذا هذا الإثبات موجود أصلًا ═══
// لوحة مسؤول هي **الموضع الأول** الذي يميل فيه المطوّر إلى `service_role`:
// «RLS تمنعني من قراءة صفوف الآخرين ⇒ سأستعمل المفتاح الذي يتجاوزها». وهذه
// الخطوة تبدو حلًّا وهي **تسليم قاعدة البيانات كاملة لكل زائر**، لأن أي شيء
// يصل المتصفّح مكشوف (`.claude/rules/security.md`).
//
// ═══ ثلاث طبقات فحص ═══
//   ١) **المصدر** — لا اسم ولا قيمة مميّزة في `src/`.
//   ٢) **البنية** — كل متغيّر بيئة يقرأه العميل يبدأ بـ`VITE_`، والمفتاح
//      المميّز في `.env.example` **بلا** هذه البادئة فلا يدخل الحزمة أصلًا.
//   ٣) **الحزمة المبنيّة** — `dist/` إن وُجدت: نصًّا **وشكلًا** (رمز JWT تُفكّ
//      حمولته ويُفحص دوره)، لأن المفتاح قد يصل مقيمةً لا اسمًا.
//
// ويُختم بمحاكاة التفاف: تُحقن السلسلة في نسخة مؤقّتة، ويُتأكّد أن الماسح
// **يكشفها بفحص مسمّى** — فماسح لا يجد شيئًا في شجرة نظيفة قد يكون معطّلًا.

import { readFileSync, readdirSync, existsSync, statSync, mkdtempSync, writeFileSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

let pass = 0
const check = (label, condition) => {
  if (!condition) throw new Error(`FAIL: ${label}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}

console.log('\nإثبات عدم تسريب مفتاح مميّز — المركز التنفيذي')

/** أسماء وقيم لا يجوز أن تصل المتصفّح بأي شكل. */
const FORBIDDEN_NAMES = ['service_role', 'SERVICE_ROLE', 'serviceRole', 'SUPABASE_SERVICE_ROLE_KEY', 'supabaseAdmin', 'createAdminClient']

/** امتدادات تُمسح. */
const SCAN_EXT = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.html', '.css']

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.git') continue
      walk(p, out)
    } else if (SCAN_EXT.some((e) => name.endsWith(e))) {
      out.push(p)
    }
  }
  return out
}

/**
 * يبحث عن رمز JWT دوره `service_role`.
 *
 * الفحص النصّي وحده لا يكفي: المفتاح قد يُلصق **كقيمة** بلا أن يُذكر اسمه في
 * أي مكان. فتُلتقط الرموز بشكلها وتُفكّ حمولتها ويُقرأ `role` منها.
 */
function findServiceRoleJwt(text) {
  const tokens = text.match(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g) ?? []
  for (const tok of tokens) {
    const payload = tok.split('.')[1]
    try {
      const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
      if (/"role"\s*:\s*"service_role"/.test(json)) return tok.slice(0, 24)
    } catch {
      // رمز غير قابل للفكّ ليس تسريبًا — يُتجاوز بلا ضجيج.
    }
  }
  return null
}

/** يمسح شجرة ويعيد قائمة المخالفات المسمّاة. */
function scanTree(dir, label) {
  const files = walk(dir)
  const hits = []
  for (const f of files) {
    const text = readFileSync(f, 'utf8')
    for (const name of FORBIDDEN_NAMES) {
      if (text.includes(name)) hits.push(`${f.replace(root, '.')} :: اسم «${name}»`)
    }
    const jwt = findServiceRoleJwt(text)
    if (jwt) hits.push(`${f.replace(root, '.')} :: رمز بدور service_role (${jwt}…)`)
  }
  return { files, hits, label }
}

// ═════════ ١) المصدر ═════════
const src = scanTree(resolve(root, 'src'), 'src')
if (src.hits.length) throw new Error(`FAIL: تسريب في المصدر:\n  - ${src.hits.join('\n  - ')}`)
check(`لا اسم ولا رمز مميّز في المصدر (${src.files.length} ملفًا · ${FORBIDDEN_NAMES.length} أسماء)`, true)

// ═════════ ٢) البنية: بادئة VITE_ هي الحدّ ═════════
const envExample = readFileSync(resolve(root, '.env.example'), 'utf8')
const serviceLine = envExample.split('\n').find((l) => l.includes('SERVICE_ROLE'))
check('`.env.example` يُعرّف المفتاح المميّز', Boolean(serviceLine))
check('المفتاح المميّز **بلا** بادئة VITE_ فلا يدخل الحزمة', !/^\s*VITE_/.test(serviceLine ?? ''))

// وكل متغيّر بيئة يقرأه العميل يبدأ بـ`VITE_` — الحدّ البنيوي نفسه من الجهة الأخرى.
const envReads = new Set()
for (const f of src.files) {
  const text = readFileSync(f, 'utf8')
  for (const m of text.matchAll(/import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g)) envReads.add(m[1])
}
const nonVite = [...envReads].filter((v) => !v.startsWith('VITE_') && !['MODE', 'DEV', 'PROD', 'SSR', 'BASE_URL'].includes(v))
check(`كل متغيّر بيئة يقرأه العميل عام (${envReads.size} متغيّرًا)`, nonVite.length === 0)

// وكود اللوحة تحديدًا لا يقرأ إلا العلمين المعلَنين.
const adminEnv = new Set()
for (const f of walk(resolve(root, 'src/admin'))) {
  for (const m of readFileSync(f, 'utf8').matchAll(/import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g)) adminEnv.add(m[1])
}
const allowedAdminEnv = ['VITE_SYNC_ENABLED', 'VITE_ENTITLEMENT_MODE']
const unexpected = [...adminEnv].filter((v) => !allowedAdminEnv.includes(v))
check(`كود اللوحة يقرأ العلمين المعلَنين فقط (${[...adminEnv].join(' · ') || 'لا شيء'})`, unexpected.length === 0)

// ═════════ ٣) الحزمة المبنيّة ═════════
const distDir = resolve(root, 'dist')
if (existsSync(distDir)) {
  const dist = scanTree(distDir, 'dist')
  if (dist.hits.length) throw new Error(`FAIL: تسريب في الحزمة المبنيّة:\n  - ${dist.hits.join('\n  - ')}`)
  check(`لا اسم ولا رمز مميّز في dist/ (${dist.files.length} ملفًا)`, true)
} else {
  // **الغياب يُعلَن ولا يُطوى في نجاح.** فحص لم يجرِ ليس فحصًا نجح.
  console.log('  ⚠ dist/ غير موجودة — فحص الحزمة لم يجرِ. شغّل `npm run build` قبله في السير.')
}

// ═════════ ٤) محاكاة التفاف: هل الماسح يعمل أصلًا؟ ═════════
// ماسح معطّل يمرّ على كل شجرة. فتُبنى شجرة مصابة عمدًا ويُتأكّد أنه يمسكها.
const tmp = mkdtempSync(join(tmpdir(), 'admin-leak-'))
const SERVICE_JWT_PAYLOAD = Buffer.from(JSON.stringify({ role: 'service_role', iss: 'supabase' }))
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '')
const FAKE_JWT = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${SERVICE_JWT_PAYLOAD}.ZmFrZXNpZ25hdHVyZQ`

writeFileSync(join(tmp, 'by-name.ts'), 'export const k = process.env.SUPABASE_SERVICE_ROLE_KEY\n')
const byName = scanTree(tmp, 'name')
check('الماسح يكشف التسريب بالاسم', byName.hits.length > 0)

const tmp2 = mkdtempSync(join(tmpdir(), 'admin-leak2-'))
// **بلا أي اسم مشبوه** — قيمة عارية فقط. هذه الحالة هي التي يفوتها الفحص النصّي.
writeFileSync(join(tmp2, 'by-value.js'), `const c = createClient(url, "${FAKE_JWT}")\n`)
const byValue = scanTree(tmp2, 'value')
check('الماسح يكشف التسريب بالقيمة وحدها (رمز بلا اسم)', byValue.hits.length > 0)
check('كشف القيمة يُسمّي الدور لا الاسم', byValue.hits.every((h) => h.includes('service_role')))

// وتأكيد مضادّ للتأكيد المضادّ: شجرة نظيفة **لا** تُنتج مخالفة (وإلا كان
// الماسح يصرخ دائمًا فلا يعني صمته شيئًا).
const tmp3 = mkdtempSync(join(tmpdir(), 'admin-leak3-'))
writeFileSync(join(tmp3, 'clean.ts'), 'export const anon = import.meta.env.VITE_SUPABASE_ANON_KEY\n')
check('الماسح لا يصرخ على شجرة نظيفة', scanTree(tmp3, 'clean').hits.length === 0)

console.log(`\n✅ ${pass} فحصًا — لا مفتاح مميّز يصل المتصفّح\n`)
