// ============================================================================
// test:attack-bundle — لا بذرة اختبار ولا سرّ خادم في الأصل المشحون.
// ============================================================================
// [OVERNIGHT-THREAT] · AGENT-F.
//
// ═══ لماذا هذا الملف موجود رغم `production-bundle-safety-proof.mjs` ═══
// ذاك الإثبات **خارج `test:gate` وخارج سير CI** (`test:bundle-safety` غير
// مذكور في أيٍّ منهما — أُثبت في `test:attack-gates`). فضمانه لا يُطبَّق على أي
// دفعة. وهو أيضًا يمسح **بذور التقليد ونقاط التطوير** ولا يمسح **أسرار
// الخادم**: `service_role` · مفاتيح سلة · مفتاح Supabase المميّز.
// هذا الملف يغطّي الفجوتين ويدخل البوابة.
//
// ═══ الاقتران (§4.2) ═══
// ماسحٌ لا يجد شيئًا قد يكون معطّلًا. فلكل فئة **عدّاد مضادّ**: يُزرع النمط في
// نصّ اصطناعي ويُتأكَّد أن الماسح يراه — وإلا سقط بفحص `scanner-blind` مسمّى.
// ============================================================================
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
let passed = 0
const check = (label, condition, detail = '') => {
  if (!condition) throw new Error(`FAIL: ${label}${detail ? ` — ${detail}` : ''}`)
  passed += 1
  console.log(`  ✓ ${label}${detail ? `  — ${detail}` : ''}`)
}

// ── فئات الممنوع ───────────────────────────────────────────────────────────
/** بذور الاختبار — قرار وقت بناء، فتُفحَص على الحزمة لا على المصدر. */
const SEAMS = [
  { id: 'mock-activation-codes', re: () => /QIMMAH-TEST-(?:OK|USED|EXPIRED|OFFLINE)/ },
  { id: 'mock-entitlement-key', re: () => /qimmah:entitlement-mock/ },
  { id: 'entitlement-mock-flag', re: () => /VITE_ENTITLEMENT_MODE/ },
]
/** أسرار الخادم — أخطر ما يمكن أن يصل متصفّحًا. */
const SERVER_SECRETS = [
  { id: 'service-role-name', re: () => /service_role|SERVICE_ROLE|serviceRole/ },
  { id: 'supabase-service-key-var', re: () => /SUPABASE_SERVICE_ROLE_KEY/ },
  { id: 'admin-client-factory', re: () => /createAdminClient|supabaseAdmin/ },
  { id: 'salla-webhook-secret', re: () => /SALLA_WEBHOOK_(?:SECRET|TOKEN)/ },
  { id: 'identity-pepper', re: () => /identity_pepper|IDENTITY_PEPPER/ },
  { id: 'private-schema-rpc', re: () => /private\.(?:hash_identity|identity_pepper|normalize_access_code)/ },
  { id: 'admin-rpc-name', re: () => /admin_grant_premium|admin_create_access_code|admin_revoke|admin_unrevoke|salla_ingest_event/ },
]
/** ملفات تجهيز/تركيبات لا تُشحن. */
const FIXTURES = [
  { id: 'admin-fixture-marker', re: () => /__QIMMAH_FIXTURE__|FIXTURE_ONLY|__TEST_SEAM__/ },
  { id: 'playwright-hook', re: () => /window\.__playwright|__E2E__/ },
]

/** رمز JWT دوره service_role — يصل كقيمة بلا أن يُذكر اسمه. */
function serviceRoleJwt(text) {
  for (const tok of text.match(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g) ?? []) {
    try {
      const json = Buffer.from(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
      if (/"role"\s*:\s*"service_role"/.test(json)) return tok.slice(0, 20)
    } catch { /* رمز غير قابل للفكّ ليس تسريبًا */ }
  }
  return null
}

function buildInto(mode) {
  const out = mkdtempSync(join(tmpdir(), `qimmah-attack-${mode}-`))
  const env = { ...process.env, VITE_BUILD_OUT_DIR: out }
  if (mode === 'mock') env.VITE_ENTITLEMENT_MODE = 'mock'
  else delete env.VITE_ENTITLEMENT_MODE
  execFileSync('npx', ['vite', 'build', '--outDir', out, '--emptyOutDir'], {
    cwd: root, env, stdio: 'pipe', encoding: 'utf8',
  })
  return out
}
function assets(dir) {
  const files = []
  const walk = (d) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.(?:js|mjs|cjs|css|html|json|map)$/.test(e)) files.push(p)
    }
  }
  walk(dir)
  return files
}
function scan(dir, groups) {
  const hits = []
  for (const f of assets(dir)) {
    const text = readFileSync(f, 'utf8')
    for (const { id, re } of groups) if (re().test(text)) hits.push({ id, file: f.slice(dir.length + 1) })
    const jwt = serviceRoleJwt(text)
    if (jwt) hits.push({ id: 'service-role-jwt-value', file: f.slice(dir.length + 1), sample: jwt })
  }
  return hits
}

console.log('\n⚔️  هجوم سلامة الأصل المشحون')

console.log('\n① بناء الإنتاج')
const prod = buildInto('production')
const prodFiles = assets(prod)
check(`أصل الإنتاج مبني (${prodFiles.length} ملفًا)`, prodFiles.length > 5)

console.log('\n② لا بذرة اختبار')
const seamHits = scan(prod, SEAMS)
check('لا كود تفعيل تجريبي ولا مفتاح تقليد ولا علم وضع التقليد',
  seamHits.length === 0, JSON.stringify(seamHits))

console.log('\n③ لا سرّ خادم')
const secretHits = scan(prod, SERVER_SECRETS)
check('لا اسم ولا قيمة service_role · لا سرّ سلة · لا ملح هوية · لا اسم دالة إدارية',
  secretHits.length === 0, JSON.stringify(secretHits))

console.log('\n④ لا تركيبة اختبار')
const fixtureHits = scan(prod, FIXTURES)
check('لا وسم تركيبة ولا خطّاف متصفّح آلي', fixtureHits.length === 0, JSON.stringify(fixtureHits))

console.log('\n⑤ المفتاح العام وحده هو ما يصل')
{
  const anonJwts = new Set()
  for (const f of prodFiles) {
    for (const tok of (readFileSync(f, 'utf8').match(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g) ?? [])) {
      try {
        const json = Buffer.from(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
        const role = JSON.parse(json).role
        if (role) anonJwts.add(role)
      } catch { /* تجاهُل */ }
    }
  }
  check(`كل أدوار الرموز في الحزمة عامّة (${[...anonJwts].join(',') || 'لا رموز'})`,
    ![...anonJwts].includes('service_role'), [...anonJwts].join(','))
  const envExample = readFileSync(resolve(root, '.env.example'), 'utf8')
  const viteServerSecrets = [...envExample.matchAll(/^\s*(VITE_[A-Z0-9_]*(?:SERVICE|SECRET|PEPPER|PRIVATE)[A-Z0-9_]*)\s*=/gm)].map((m) => m[1])
  check('ولا متغيّر بيئة يبدأ بـVITE_ ويحمل سرًّا في .env.example', viteServerSecrets.length === 0, viteServerSecrets.join(','))
}

// ══════════════ ⑥ العدّاد المضادّ — الماسح يرى ما يدّعي رؤيته ═══════════════
console.log('\n⑥ العدّاد المضادّ (§4.2)')
{
  // (أ) زرع اصطناعي: كل نمط يجب أن يُكتشف في أصل مزروع
  const planted = mkdtempSync(join(tmpdir(), 'qimmah-planted-'))
  const PLANTS = [
    ['seam.js', 'const c={"QIMMAH-TEST-OK":1};export default c'],
    ['seam2.js', 'const k="qimmah:entitlement-mock:v1"'],
    ['seam3.js', 'const m=import.meta.env.VITE_ENTITLEMENT_MODE'],
    ['secret1.js', 'const k=process.env.SUPABASE_SERVICE_ROLE_KEY'],
    ['secret2.js', 'const r="service_role"'],
    ['secret3.js', 'const s=Deno.env.get("SALLA_WEBHOOK_SECRET")'],
    ['secret4.js', 'select private.hash_identity(x,1)'],
    ['secret5.js', 'supabase.rpc("admin_grant_premium",{})'],
    ['secret6.js', 'const p="identity_pepper"'],
    ['secret7.js', 'export const supabaseAdmin=createAdminClient(url,key)'],
    ['fixture.js', 'window.__QIMMAH_FIXTURE__=1'],
    ['fixture2.js', 'if(window.__playwright){}'],
    // رمز JWT حقيقي الشكل حمولته {"role":"service_role"} — قيمة بلا اسم
    ['jwt.js', `const k="eyJhbGciOiJIUzI1NiJ9.${Buffer.from('{"role":"service_role","iss":"supabase"}').toString('base64url')}.AAAAAAAAAAAAAAAAAAAA"`],
  ]
  for (const [name, body] of PLANTS) writeFileSync(join(planted, name), body)
  const plantedHits = scan(planted, [...SEAMS, ...SERVER_SECRETS, ...FIXTURES])
  const foundIds = new Set(plantedHits.map((h) => h.id))
  const expected = [...SEAMS, ...SERVER_SECRETS, ...FIXTURES].map((g) => g.id)
  const blind = expected.filter((id) => !foundIds.has(id))
  check(`scanner-blind؟ لا — ${foundIds.size} فئة اكتُشفت في الأصل المزروع`, blind.length === 0, `عمياء عن: ${blind.join(', ')}`)
  check('وقيمة JWT بدور service_role تُكتشف بشكلها لا باسمها', foundIds.has('service-role-jwt-value'))

  // (ب) العدّاد الحقيقي: بناء التقليد يحمل البذرة فعلًا
  console.log('\n   بناء التقليد — البذرة حاضرة')
  const mock = buildInto('mock')
  const mockSeams = scan(mock, SEAMS)
  check('بناء التقليد يحمل بذرة الاختبار — فغيابها عن الإنتاج نتيجة مستحقّة',
    mockSeams.some((h) => h.id === 'mock-activation-codes'), `${mockSeams.length} إصابة`)
  const mockSecrets = scan(mock, SERVER_SECRETS)
  check('ولا يحمل حتى في التقليد أي سرّ خادم — فالفئتان مستقلّتان',
    mockSecrets.length === 0, JSON.stringify(mockSecrets))
  console.log(`   production=${prod}`)
  console.log(`   mock=${mock}`)
}

console.log(`\n✅ سلامة الأصل: ${passed} فحصًا، 0 تسريب.\n`)
