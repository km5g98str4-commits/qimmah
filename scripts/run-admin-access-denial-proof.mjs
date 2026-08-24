// مُشغّل إثبات المنع + **اختبار الطفرات**.
// [QIMMAH-SOVEREIGN-PHASE-II-001] · AGENT-E.
//
// شقّان:
//   ١) يبني `scripts/admin-access-denial-proof.ts` بـesbuild ويشغّله — بطارية
//      مسمّاة على الحارس الحقيقي.
//   ٢) **يُفسد الحارس عمدًا** بأربع طفرات واقعية، ويتأكّد أن البطارية **تسقط**
//      عند كلٍّ منها. بوابة لم تُهاجَم ليست بوابة (الميثاق §4.2): بطارية تمرّ
//      على الصحيح وعلى الفاسد معًا ليست إثباتًا، بل ديكور.
//
// وطفرة `user_metadata` هي المهمّة: تحاكي **الخطأ الحقيقي المرجّح** — مبرمج
// يقرأ الدور من الحقل الذي يكتبه المستخدم بنفسه، فيصير كل مستخدم مسؤولًا.

import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const dir = mkdtempSync(join(tmpdir(), 'admin-denial-'))

const ENV = { MODE: 'test', DEV: false, PROD: false }

async function bundleAndImport(entry, name) {
  const out = await build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    alias: { '@': resolve(root, 'src') },
    define: { 'import.meta.env': JSON.stringify(ENV) },
    logLevel: 'silent',
  })
  const file = join(dir, `${name}.mjs`)
  writeFileSync(file, out.outputFiles[0].text)
  return import(pathToFileURL(file).href)
}

// ─────────────────────────── ١) البطارية على الحارس الحقيقي ───────────────────────────
await bundleAndImport(resolve(root, 'scripts/admin-access-denial-proof.ts'), 'real')

// ─────────────────────────── ٢) اختبار الطفرات ───────────────────────────
console.log('اختبار الطفرات — إفساد الحارس عمدًا')

const GUARD = resolve(root, 'src/admin/auth/adminRole.ts')
const source = readFileSync(GUARD, 'utf8')

/**
 * البطارية المصغّرة: **نفس الادّعاءات الحرجة** من ملف الإثبات.
 * تُرجع اسم أول فحص سقط، أو null إن نجت كلها.
 */
function battery(mod) {
  const { resolveAdminRole, isAdmin, canRead, ADMIN_ROLE_CLAIM: CLAIM } = mod
  const cases = [
    ['لا جلسة ⇒ منع', () => !isAdmin(resolveAdminRole(null))],
    ['مسجّل دخول بلا تصريح ⇒ منع', () => !isAdmin(resolveAdminRole({ app_metadata: { provider: 'email' } }))],
    ['user_metadata لا يمنح دورًا', () => !isAdmin(resolveAdminRole({ user_metadata: { [CLAIM]: 'founder' } }))],
    [
      'user_metadata لا يمنح دورًا مع app_metadata فارغ',
      () => !isAdmin(resolveAdminRole({ app_metadata: {}, user_metadata: { [CLAIM]: 'founder' } })),
    ],
    ['دور غير معروف ⇒ منع', () => !isAdmin(resolveAdminRole({ app_metadata: { [CLAIM]: 'admin' } }))],
    ['تصريح خادم صحيح ⇒ سماح', () => isAdmin(resolveAdminRole({ app_metadata: { [CLAIM]: 'founder' } }))],
    // ⚠️ أُضيف بعد أن **نجت** طفرة `canRead` من نسخة أولى من هذه البطارية:
    // الطفرة أثبتت أن البطارية كانت أضعف من ملف الإثبات، وهي بالضبط الحالة
    // التي يوجد اختبار الطفرات ليكشفها (الميثاق §4.2).
    ['غير المسؤول لا يقرأ شيئًا حتى بالتعمّق', () => !canRead(resolveAdminRole({}), 'founder+drilldown', true)],
    ['بلا جلسة لا قراءة بالتعمّق', () => !canRead(resolveAdminRole(null), 'founder+drilldown', true)],
    [
      'حقول المنتج ممنوعة على المؤسس بلا تعمّق',
      () => !canRead(resolveAdminRole({ app_metadata: { [CLAIM]: 'founder' } }), 'founder+drilldown', false),
    ],
  ]
  for (const [name, fn] of cases) {
    let ok = false
    try {
      ok = fn() === true
    } catch {
      ok = false
    }
    if (!ok) return name
  }
  return null
}

const MUTANTS = [
  {
    name: 'يقرأ الدور من user_metadata (الخطأ الأخطر واقعيًا)',
    apply: (s) => s.replace('const appClaim = claimOf(session.app_metadata)', 'const appClaim = claimOf(session.user_metadata)'),
  },
  {
    name: 'يعتبر أي جلسة مؤسسًا (logged-in = admin)',
    apply: (s) =>
      s.replace(
        "  if (!session) return { role: 'denied', reason: 'no-session' }",
        "  if (!session) return { role: 'denied', reason: 'no-session' }\n  return { role: 'founder', reason: null }",
      ),
  },
  {
    // [COMMISSIONING §4] القائمة صارت **قيمتين** (`founder`/`support`)، فبطل
    // نصّ الطفرة القديم (`appClaim !== ACCEPTED_ROLE`). والطقم أسقط نفسه
    // بصوتٍ عالٍ بدل أن يمرّ على طفرةٍ لم تعد تُطبَّق — وهذا هو المطلوب منه.
    // الطفرة الآن تُبطل المطابقة نفسها: أيّ ادّعاء يصير دورًا مقبولًا.
    name: 'يسقط القائمة البيضاء فيقبل أي قيمة دور',
    apply: (s) => s.replace(
      'const matched = ACCEPTED_ROLES.find((r) => appClaim === r)',
      "const matched = 'founder'",
    ),
  },
  {
    name: 'يمنح عند التعمّق بلا دور (canRead متساهل)',
    apply: (s) => s.replace('  if (!isAdmin(decision)) return false', '  if (!isAdmin(decision)) return drilldown'),
  },
]

let mutantsKilled = 0
for (const m of MUTANTS) {
  const mutated = m.apply(source)
  if (mutated === source) {
    throw new Error(`FAIL: الطفرة «${m.name}» لم تغيّر المصدر — نصّها البديل لم يعد يطابق الحارس`)
  }
  const file = join(dir, `mutant-${mutantsKilled}.ts`)
  writeFileSync(file, mutated)
  const mod = await bundleAndImport(file, `mutant-${mutantsKilled}`)
  const failed = battery(mod)
  if (!failed) {
    throw new Error(`FAIL: الطفرة «${m.name}» نجت من البطارية — الإثبات رخو ولا يكشفها`)
  }
  mutantsKilled += 1
  console.log(`  ✓ قُتلت الطفرة «${m.name}» — سقطت عند: ${failed}`)
}

// وتأكيد أن البطارية نفسها تمرّ على الحارس السليم (وإلا كانت تسقط دائمًا).
const realMod = await bundleAndImport(GUARD, 'real-guard')
const realFailed = battery(realMod)
if (realFailed) throw new Error(`FAIL: البطارية تسقط على الحارس السليم عند: ${realFailed}`)
console.log('  ✓ البطارية تمرّ على الحارس السليم — فسقوطها على الطفرات معنيّ لا عام')

// ─────────────────────────── ٣) لا مصدر دور خارج تصريح الخادم ───────────────────────────
const FORBIDDEN_SOURCES = ['localStorage', 'sessionStorage', 'window.location', 'document.cookie', 'URLSearchParams', 'import.meta.env']
const stripped = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ')
for (const bad of FORBIDDEN_SOURCES) {
  if (stripped.includes(bad)) throw new Error(`FAIL: الحارس يقرأ مصدرًا محظورًا: ${bad}`)
}
console.log(`  ✓ الحارس لا يقرأ أي مصدر من المتصفّح (${FORBIDDEN_SOURCES.length} مصادر محظورة)`)

console.log(`\n✅ إثبات المنع تام — ${mutantsKilled} طفرات مقتولة\n`)
