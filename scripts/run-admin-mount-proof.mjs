// ============================================================================
// مُشغّل إثبات التركيب — جذعان محكومان + مسح الحزمة + محاكاة التفاف.
// [OVERNIGHT-ADMIN] · AGENT-E.
// ============================================================================
// ثلاثة أشقاق:
//   ١) يبني `scripts/admin-mount-proof.tsx` مع **إبدال** `@/lib/supabaseClient`
//      و`@/lib/authContext` بجذعين يتحكّم بهما الإثبات، فيُمارَس رد الخادم فعلًا
//      بدل أن يُحاكى بالتعليقات.
//   ٢) يمسح **الحزمة المبنيّة** من الوحدة: لا تجهيزة ولا مفتاح مميّز يصل
//      المتصفّح — ويُفحص `dist/` أيضًا إن وُجد.
//   ٣) يهاجم كل ذلك بحقنات تُسقط فحصًا **مسمّى** (الميثاق §4.2).
// ============================================================================
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const work = mkdtempSync(join(tmpdir(), 'admin-mount-'))

/** جذع عميل Supabase — كل نداء يمرّ عبر `globalThis.__RPC__`. */
const SUPABASE_STUB = `
export function isSupabaseConfigured() { return globalThis.__SB_CONFIGURED__ !== false }
export function supabaseConfigState() { return isSupabaseConfigured() ? 'configured' : 'missing' }
export function getSupabase() {
  // يُحصى **طلب العميل نفسه** لا النداء فقط: ترتيب «اجلب العميل ثم افحص الدور»
  // لا يُسجَّل في عدّاد الـRPC، فيمرّ التفافٌ حقيقي بلا أن يُكشف.
  globalThis.__SB_CLIENT_CALLS__ = (globalThis.__SB_CLIENT_CALLS__ || 0) + 1
  if (globalThis.__SB_CONFIGURED__ === false) return Promise.resolve(null)
  return Promise.resolve({ rpc: (name, args) => globalThis.__RPC__(name, args) })
}
`
/** جذع سياق المصادقة — الشخصية تُضبط من الإثبات. */
const AUTH_STUB = `
export function useAuth() {
  const a = globalThis.__AUTH__ || { user: null, loading: false }
  return { configured: true, user: a.user, session: null, loading: a.loading, recoveryActive: false,
           displayName: null, emailVerified: true }
}
`

const banner = `
const __store = new Map();
const __ls = {
  getItem: (k) => (__store.has(k) ? __store.get(k) : null),
  setItem: (k, v) => { __store.set(k, String(v)); },
  removeItem: (k) => { __store.delete(k); },
  clear: () => { __store.clear(); },
  key: (i) => Array.from(__store.keys())[i] ?? null,
  get length() { return __store.size; },
};
const __doc = {
  documentElement: { lang: '', dir: '', classList: { add() {}, remove() {}, toggle() {} }, style: { setProperty() {} } },
  addEventListener() {}, removeEventListener() {}, querySelector: () => null,
};
globalThis.localStorage = __ls;
globalThis.document = __doc;
globalThis.window = { localStorage: __ls, document: __doc, addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`

function stubDir(base) {
  const d = join(base, 'stubs')
  mkdirSync(d, { recursive: true })
  writeFileSync(join(d, 'supabaseClient.ts'), SUPABASE_STUB)
  writeFileSync(join(d, 'authContext.ts'), AUTH_STUB)
  return d
}

async function buildProof(treeRoot, outFile) {
  const stubs = stubDir(dirname(outFile))
  const out = await build({
    entryPoints: [join(treeRoot, 'scripts/admin-mount-proof.tsx')],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    jsx: 'automatic',
    write: false,
    // الشجرة المصابة تُنسخ بلا `node_modules`؛ بدون هذا يفشل الاستيراد فيصير
    // السقوط **غير مسمّى** — وهو ما يمنعه §4.2 صراحةً.
    nodePaths: [resolve(root, 'node_modules')],
    banner: { js: banner },
    alias: {
      '@/lib/supabaseClient': join(stubs, 'supabaseClient.ts'),
      '@/lib/authContext': join(stubs, 'authContext.ts'),
      '@': join(treeRoot, 'src'),
    },
    define: {
      'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: true }),
      'process.env.NODE_ENV': '"production"',
    },
    logLevel: 'silent',
  })
  writeFileSync(outFile, out.outputFiles[0].text)
  return outFile
}

// ─────────────────────── ١) الإثبات على الشجرة الحقيقية ───────────────────────
const realFile = join(work, 'real', 'proof.cjs')
mkdirSync(dirname(realFile), { recursive: true })
await buildProof(root, realFile)
await import(pathToFileURL(realFile).href)

// ─────────────────────── ٢) مسح الحزمة ───────────────────────
console.log('مسح الحزمة — لا تجهيزة ولا مفتاح مميّز يصل المتصفّح')
let scanPass = 0
const scanCheck = (label, condition) => {
  if (!condition) throw new Error(`FAIL: ${label}`)
  scanPass += 1
  console.log(`  ✓ ${label}`)
}

/** علامات لا توجد إلا في التجهيزات — وجودها في حزمة = تسرّب. */
const FIXTURE_MARKERS = ['fixture-user-', 'FIXTURE_SCENARIOS', 'snapshotPartial']
const SECRET_MARKERS = ['SUPABASE_SERVICE_ROLE_KEY', 'supabaseAdmin', 'createAdminClient']

/** يبحث عن رمز JWT **دوره** service_role — الاسم قد يغيب والقيمة تكفي. */
function findServiceRoleJwt(text) {
  const tokens = text.match(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g) ?? []
  for (const tok of tokens) {
    try {
      const json = Buffer.from(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
      if (/"role"\s*:\s*"service_role"/.test(json)) return tok.slice(0, 24)
    } catch {
      // رمز غير قابل للفكّ ليس تسريبًا.
    }
  }
  return null
}

async function bundleAdmin(treeRoot) {
  const out = await build({
    entryPoints: [join(treeRoot, 'src/admin/index.ts')],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    nodePaths: [resolve(root, 'node_modules')],
    // مكتبة Supabase تُستثنى: تعليقات JSDoc فيها تحذّر حرفيًا من `service_role`،
    // فتُقرأ تسريبًا وهي **نصّ تحذير في مكتبة الغير**. النطاق هنا كودنا نحن،
    // وفحص `dist/` المصغّرة يبقى في `test:admin-secret-leak` لتغطية الباقي.
    external: ['@supabase/supabase-js'],
    alias: { '@': join(treeRoot, 'src') },
    define: { 'import.meta.env': JSON.stringify({ MODE: 'production', DEV: false, PROD: true }) },
    logLevel: 'silent',
  })
  return out.outputFiles[0].text
}

const adminBundle = await bundleAdmin(root)
scanCheck(`حزمة الوحدة تُبنى فعلًا (${Math.round(adminBundle.length / 1024)}ك.ب)`, adminBundle.length > 5000)
// تأكيد مضادّ: علامة موجودة **في المصدر** فعلًا، وإلا كان المسح يبحث عن عدم.
const fixturesSrc = readFileSync(join(root, 'src/admin/contract/fixtures.ts'), 'utf8')
scanCheck('علامات التجهيزات موجودة في المصدر فعلًا', FIXTURE_MARKERS.every((m) => fixturesSrc.includes(m)))
for (const m of FIXTURE_MARKERS) scanCheck(`حزمة الوحدة بلا «${m}»`, !adminBundle.includes(m))
for (const m of SECRET_MARKERS) scanCheck(`حزمة الوحدة بلا «${m}»`, !adminBundle.includes(m))
// والمفتاح قد يصل **قيمةً** بلا أن يُذكر اسمه: تُلتقط الرموز بشكلها وتُفكّ.
scanCheck('حزمة الوحدة بلا رمز دوره service_role', findServiceRoleJwt(adminBundle) === null)

const distDir = join(root, 'dist/assets')
if (existsSync(distDir)) {
  const js = readdirSync(distDir).filter((f) => f.endsWith('.js'))
  const distText = js.map((f) => readFileSync(join(distDir, f), 'utf8')).join('\n')
  scanCheck(`dist/ مفحوصة (${js.length} ملفًا)`, js.length > 0)
  scanCheck('dist/ بلا رمز دوره service_role', findServiceRoleJwt(distText) === null)
  for (const m of FIXTURE_MARKERS) scanCheck(`dist/ بلا «${m}»`, !distText.includes(m))
  for (const m of SECRET_MARKERS) scanCheck(`dist/ بلا «${m}»`, !distText.includes(m))
} else {
  // **لا تخطٍّ صامت.** الغياب يُعلَن، والحزمة المبنيّة أعلاه تغطّي نفس السؤال.
  console.log('  · dist/ غير موجودة — المسح جرى على حزمة الوحدة المبنيّة لتوّها')
}

// ─────────────────────── ٣) محاكاة الالتفاف ───────────────────────
console.log('محاكاة الالتفاف — حقن ما يجب أن يُكشف')
const SRC_DIRS = ['src', 'scripts', 'docs', 'supabase']

const ATTACKS = [
  {
    name: 'قراءة مقياس بلا مصدر من حمولة الخادم',
    file: 'src/admin/contract/liveSource.ts',
    patch: (s) => s.replace('      redemptionFailures24h: base.commerce.redemptionFailures24h,', '      redemptionFailures24h: num(c.redemptionFailures24h, asOf, base.commerce.redemptionFailures24h),'),
  },
  {
    name: 'تحويل الحقل الناقص إلى صفر',
    file: 'src/admin/contract/liveSource.ts',
    patch: (s) =>
      s.replace(
        "  if (typeof raw === 'number' && Number.isFinite(raw)) return ready(raw, asOf)\n  return fallback",
        "  if (typeof raw === 'number' && Number.isFinite(raw)) return ready(raw, asOf)\n  return ready(0 as unknown as number, asOf)",
      ),
  },
  {
    name: 'قبول رد بلا لحظة قياس',
    file: 'src/admin/contract/liveSource.ts',
    patch: (s) => s.replace("  if (!asOf) return { snapshot: base, live: 'failed' }", "  if (!asOf) return { snapshot: base, live: 'live' }"),
  },
  {
    name: 'إسقاط حارس الدور من نقطة التركيب',
    file: 'src/admin/ui/AdminRoute.tsx',
    patch: (s) => s.replace('  if (!allowed) return <AdminDenied decision={decision} />', '  void allowed'),
  },
  {
    name: 'نداء الخادم قبل حسم الدور في نقطة التركيب',
    file: 'src/admin/contract/liveSource.ts',
    patch: (s) => s.replace("  if (!isAdmin(decision)) return { snapshot: base, live: 'not-founder' }\n\n  const client = await getSupabase()", "  const client = await getSupabase()\n  if (!isAdmin(decision)) return { snapshot: base, live: 'not-founder' }\n"),
  },
  {
    name: 'صفّ مشوّه يُقبل جزئيًا',
    file: 'src/admin/contract/liveSource.ts',
    patch: (s) => s.replace('      if (!row) return { page: gap, live: \'failed\' }', '      if (!row) continue'),
  },
  {
    name: 'استحقاق مجهول يُمرَّر كما هو',
    file: 'src/admin/contract/liveSource.ts',
    patch: (s) => s.replace("  const ent = ENTITLEMENT_VIEWS.find((v) => v === raw.entitlement) ?? 'unknown'", "  const ent = raw.entitlement as EntitlementView"),
  },
  {
    name: 'حذف قسم الأخطاء من الشاشة',
    file: 'src/admin/ui/AdminShell.tsx',
    patch: (s) => s.replace('<Section id="errors" icon="AlertCircle">', '<Section id="funnel" icon="AlertCircle">'),
  },
  {
    name: 'نقطة التركيب تقرأ علمًا من التخزين',
    file: 'src/admin/ui/AdminRoute.tsx',
    patch: (s) => s.replace('  const allowed = isAdmin(decision)', "  const allowed = isAdmin(decision) || localStorage.getItem('qimmah:admin') === '1'"),
  },
  // ═══ [ADMIN-CONV] محاكاة التفاف على الشدّ الجديد — كلٌّ تسقط بفحص مسمّى ═══
  {
    // فشل القائمة يُقلب صفوفًا فارغة تُقرأ «ما فيه شيء» — عكس عقد التسمية.
    name: 'فشل قائمةٍ يُقلب قائمة فارغة',
    file: 'src/admin/contract/liveSource.ts',
    patch: (s) =>
      s.replace(
        "    const { data, error } = await client.rpc(rpc, args)\n    if (error) return { ok: false, live: classify(error) }",
        "    const { data, error } = await client.rpc(rpc, args)\n    if (error) return { ok: true, rows: [] }",
      ),
  },
  {
    // دفعة بلا أكواد تُعلَن نجاحًا — «النجاح هو ظهور الأكواد» يسقط.
    name: 'دفعة بأكواد صفر تُعلَن نجاحًا',
    file: 'src/admin/contract/liveSource.ts',
    patch: (s) =>
      s.replace(
        "    if (!Array.isArray(rawCodes) || rawCodes.length === 0) return { ok: false, live: 'failed' }",
        "    if (!Array.isArray(rawCodes)) return { ok: false, live: 'failed' }",
      ),
  },
  {
    // صفّ مشوّه في سجلّ الأكواد يُتخطّى بدل أن يُسقط الكتلة — نصف سجلّ يمرّ.
    name: 'صفّ سجلّ أكواد مشوّه يُتخطّى بصمت',
    file: 'src/admin/contract/liveSource.ts',
    patch: (s) =>
      s.replace(
        "    if (typeof rec.redeemed_at !== 'string') return unavailable<readonly UserCodeHistoryEntry[]>('NEEDS_BACKEND')",
        "    if (typeof rec.redeemed_at !== 'string') continue",
      ),
  },
  {
    // غياب المفتاح الجديد يصير صفرًا جاهزًا — عكس «الغياب نوع».
    name: 'signedInToday الغائب يُقرأ صفرًا',
    file: 'src/admin/contract/liveSource.ts',
    patch: (s) =>
      s.replace(
        '      signedInToday: num(a.signedInToday, asOf, base.activity.signedInToday),',
        '      signedInToday: num(a.signedInToday, asOf, ready(0, asOf)),',
      ),
  },
]

let killed = 0
for (const a of ATTACKS) {
  const dir = join(work, `tree-${killed}`)
  for (const d of SRC_DIRS) cpSync(join(root, d), join(dir, d), { recursive: true })
  const target = join(dir, a.file)
  const original = readFileSync(target, 'utf8')
  const patched = a.patch(original)
  if (patched === original) {
    throw new Error(`FAIL: محاكاة «${a.name}» لم تغيّر الملف — نصّها البديل لم يعد يطابق ${a.file}`)
  }
  writeFileSync(target, patched)

  const infectedFile = join(dir, 'infected-proof.cjs')
  let buildError = null
  await buildProof(dir, infectedFile).catch((e) => {
    buildError = e
  })
  if (buildError) {
    // فشل ترجمة **ليس** إثباتًا مقبولًا (§4.2: «سقوط غير مسمّى ليس إثباتًا»).
    throw new Error(`FAIL: محاكاة «${a.name}» أسقطت الترجمة بدل أن تُكشف بفحص مسمّى — ${String(buildError.message).slice(0, 400)}`)
  }
  const run = spawnSync(process.execPath, [infectedFile], { cwd: dir, encoding: 'utf8' })
  const output = `${run.stdout}${run.stderr}`
  const detail = (output.match(/Error: FAIL: (.+)/) ?? output.match(/FAIL: (.+)/) ?? [])[1] ?? ''
  if (run.status === 0 || !/FAIL: /.test(output)) {
    throw new Error(`FAIL: محاكاة «${a.name}» نجت — البوابة رخوة ولا تكشفها`)
  }
  killed += 1
  console.log(`  ✓ كُشفت محاكاة «${a.name}» — سقطت عند: ${detail.slice(0, 90)}`)
  rmSync(dir, { recursive: true, force: true })
}

// وحقنة على مسح الحزمة نفسه: تصدير التجهيزات من الباب الرئيسي.
const leakTree = join(work, 'tree-leak')
for (const d of ['src']) cpSync(join(root, d), join(leakTree, d), { recursive: true })
const idxPath = join(leakTree, 'src/admin/index.ts')
const idxSrc = readFileSync(idxPath, 'utf8')
writeFileSync(idxPath, `${idxSrc}\nexport * from './contract/fixtures'\n`)
const leakedBundle = await bundleAdmin(leakTree)
const leaked = FIXTURE_MARKERS.filter((m) => leakedBundle.includes(m))
if (leaked.length === 0) {
  throw new Error('FAIL: محاكاة «تصدير التجهيزات من الباب الرئيسي» نجت — مسح الحزمة رخو')
}
killed += 1
console.log(`  ✓ كُشفت محاكاة «تصدير التجهيزات من الباب الرئيسي» — ظهرت العلامات: ${leaked.join(', ')}`)

rmSync(work, { recursive: true, force: true })
console.log(`\n✅ إثبات التركيب تام — ${scanPass} فحص حزمة · ${killed} محاكاة التفاف مكشوفة\n`)
