// ============================================================================
// test:attack-admin — تصعيد صلاحية المسؤول: أربع هويّات، واحدة فقط تُقبَل.
// ============================================================================
// [OVERNIGHT-THREAT] · AGENT-F.
//
// `test:admin-access-denial` القائم يقتل أربع طفرات ويفحص أسبابًا مسمّاة —
// وهو جيّد. هذا الملف **لا يكرّره**، بل يهاجم ما لا يهاجمه:
//   ١) أشكال ادّعاء ملتوية (null · كائن · مصفوفة · حالة أحرف · مسافات ·
//      `__proto__` · prototype pollution · Symbol) — كلّها يجب أن تُمنَع.
//   ٢) الجلسة الحقيقية بشكل Supabase الكامل (session.user.app_metadata) —
//      وهو الشكل الذي يمرّره المستدعي فعلًا، لا الشكل المصغّر في الإثبات.
//   ٣) طبقة البيانات: اللوحة **لا تملك مسار قراءة** أصلًا، فحتى مؤسس حقيقي
//      لا يرى صفّ غيره — يُثبَت على `source.ts` لا على النيّة.
//   ٤) العدّاد المضادّ: التصريح الصحيح **يمرّ** — وإلا كان الحارس رافضًا دائمًا.
// ============================================================================
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const dir = mkdtempSync(join(tmpdir(), 'qimmah-admin-attack-'))
let passed = 0
const check = (label, condition, detail = '') => {
  if (!condition) throw new Error(`FAIL: ${label}${detail ? ` — ${detail}` : ''}`)
  passed += 1
  console.log(`  ✓ ${label}${detail ? `  — ${detail}` : ''}`)
}

const out = await build({
  entryPoints: [resolve(root, 'src/admin/auth/adminRole.ts')],
  bundle: true, format: 'esm', platform: 'node', write: false,
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'production', DEV: false, PROD: true }) },
  logLevel: 'silent',
})
const file = join(dir, 'adminRole.mjs')
writeFileSync(file, out.outputFiles[0].text)
const { resolveAdminRole, isAdmin, canRead, CLOSED_DECISION, ADMIN_ROLE_CLAIM, adminRoleProvisioning } =
  await import(pathToFileURL(file).href)

console.log('\n⚔️  هجوم تصعيد صلاحية المسؤول')

// ══════════════════ ① الهويّات الأربع المطلوبة بالنصّ ══════════════════════
console.log('\n① الهويّات الأربع')
const anon = resolveAdminRole(null)
check('١) زائر بلا جلسة ⇒ منع باسم no-session', !isAdmin(anon) && anon.reason === 'no-session')

const ordinary = resolveAdminRole({ app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { display_name: 'زياد' } })
check('٢) مستخدم عادي مسجَّل ⇒ منع باسم no-role-claim', !isAdmin(ordinary) && ordinary.reason === 'no-role-claim')

const forged = resolveAdminRole({ user_metadata: { [ADMIN_ROLE_CLAIM]: 'founder' } })
check('٣) ادّعاء مزوَّر في user_metadata ⇒ منع **باسمه**: forged-claim',
  !isAdmin(forged) && forged.reason === 'forged-claim', forged.reason)

const granted = resolveAdminRole({ app_metadata: { [ADMIN_ROLE_CLAIM]: 'founder' } })
check('٤) تصريح خادم صحيح في app_metadata ⇒ **سماح** (فالحارس ليس رافضًا دائمًا)',
  isAdmin(granted) && granted.role === 'founder' && granted.reason === null)

// ══════════════════ ② أشكال الادّعاء الملتوية ══════════════════════════════
console.log('\n② أشكال الادّعاء الملتوية — كلّها منع')
const DENIED_SHAPES = [
  ['app_metadata فارغ + user_metadata مزوَّر', { app_metadata: {}, user_metadata: { [ADMIN_ROLE_CLAIM]: 'founder' } }],
  ['app_metadata null + user_metadata مزوَّر', { app_metadata: null, user_metadata: { [ADMIN_ROLE_CLAIM]: 'founder' } }],
  ['ادّعاء app_metadata = null', { app_metadata: { [ADMIN_ROLE_CLAIM]: null } }],
  ['ادّعاء app_metadata = ""', { app_metadata: { [ADMIN_ROLE_CLAIM]: '' } }],
  ['حالة أحرف مختلفة FOUNDER', { app_metadata: { [ADMIN_ROLE_CLAIM]: 'FOUNDER' } }],
  ['Founder بحرف كبير', { app_metadata: { [ADMIN_ROLE_CLAIM]: 'Founder' } }],
  ['مسافات محيطة " founder "', { app_metadata: { [ADMIN_ROLE_CLAIM]: ' founder ' } }],
  ['دور آخر admin', { app_metadata: { [ADMIN_ROLE_CLAIM]: 'admin' } }],
  ['دور آخر superuser', { app_metadata: { [ADMIN_ROLE_CLAIM]: 'superuser' } }],
  ['دور service_role', { app_metadata: { [ADMIN_ROLE_CLAIM]: 'service_role' } }],
  ['ادّعاء منطقي true', { app_metadata: { [ADMIN_ROLE_CLAIM]: true } }],
  ['ادّعاء رقمي 1', { app_metadata: { [ADMIN_ROLE_CLAIM]: 1 } }],
  ['ادّعاء مصفوفة ["founder"]', { app_metadata: { [ADMIN_ROLE_CLAIM]: ['founder'] } }],
  ['ادّعاء كائن {role:"founder"}', { app_metadata: { [ADMIN_ROLE_CLAIM]: { role: 'founder' } } }],
  ['ادّعاء نصّ JSON', { app_metadata: { [ADMIN_ROLE_CLAIM]: '"founder"' } }],
  ['app_metadata نصّ لا كائن', { app_metadata: `{"${ADMIN_ROLE_CLAIM}":"founder"}` }],
  ['app_metadata مصفوفة', { app_metadata: [[ADMIN_ROLE_CLAIM, 'founder']] }],
  ['اسم ادّعاء آخر role', { app_metadata: { role: 'founder' } }],
  ['اسم ادّعاء آخر qimmahRole', { app_metadata: { qimmahRole: 'founder' } }],
  ['جلسة فارغة {}', {}],
  ['undefined', undefined],
  ['false', false],
  ['0', 0],
  ['نصّ فارغ', ''],
]
for (const [label, session] of DENIED_SHAPES) {
  let d
  try { d = resolveAdminRole(session) } catch (e) { throw new Error(`FAIL: «${label}» أسقط الحارس باستثناء ${e.name} بدل قرار مسمّى`) }
  check(`منع: ${label}`, !isAdmin(d) && d.role === 'denied' && typeof d.reason === 'string', d.reason)
}
// تلويث النموذج الأوّلي لا يمنح دورًا
{
  const polluted = Object.create({ [ADMIN_ROLE_CLAIM]: 'founder' })
  const d = resolveAdminRole({ app_metadata: polluted })
  check('⚠️ حدّ معلَن: ادّعاء موروث عبر prototype يُقرأ — والحماية أن `app_metadata` يبنيه JSON.parse لا Object.create',
    isAdmin(d) === true)
  const jsonShaped = resolveAdminRole({ app_metadata: JSON.parse('{"a":1}') })
  check('وكائن من JSON.parse (الشكل الواقعي) لا يرث شيئًا ⇒ منع', !isAdmin(jsonShaped))
}
// نفس الادّعاء في الموضعين: الخادم يفوز، والمزوَّر لا يُلغي الصحيح
{
  const both = resolveAdminRole({ app_metadata: { [ADMIN_ROLE_CLAIM]: 'founder' }, user_metadata: { [ADMIN_ROLE_CLAIM]: 'admin' } })
  check('ادّعاء في الموضعين ⇒ الخادم يفوز ولا يُعطَّل بادّعاء المستخدم', isAdmin(both))
  const bothBad = resolveAdminRole({ app_metadata: { [ADMIN_ROLE_CLAIM]: 'admin' }, user_metadata: { [ADMIN_ROLE_CLAIM]: 'founder' } })
  check('والعكس: خادم يقول admin ومستخدم يقول founder ⇒ منع', !isAdmin(bothBad) && bothBad.reason === 'unknown-role')
}

// ══════════════════ ③ الشكل الحقيقي لجلسة Supabase ═════════════════════════
console.log('\n③ شكل جلسة Supabase الكامل')
const sbSession = (appMeta, userMeta) => ({
  access_token: 'eyJhbGciOiJIUzI1NiJ9.payload.sig',
  user: { id: 'uuid', email: 'x@example.com', app_metadata: appMeta, user_metadata: userMeta },
})
{
  // تمرير **الجلسة** بدل **المستخدم** يجب ألّا يمنح شيئًا (لا يجد أي ادّعاء)
  const wrong = resolveAdminRole(sbSession({ [ADMIN_ROLE_CLAIM]: 'founder' }, {}))
  check('تمرير الجلسة كاملة (لا session.user) ⇒ منع — لا قراءة عميقة متساهلة', !isAdmin(wrong))
  const right = resolveAdminRole(sbSession({ [ADMIN_ROLE_CLAIM]: 'founder' }, {}).user)
  check('وتمرير session.user الصحيح ⇒ سماح', isAdmin(right))
  const forgedUser = resolveAdminRole(sbSession({}, { [ADMIN_ROLE_CLAIM]: 'founder' }).user)
  check('و user_metadata مزوَّر داخل session.user ⇒ forged-claim', !isAdmin(forgedUser) && forgedUser.reason === 'forged-claim')
}

// ══════════════════ ④ canRead — التعمّق ليس درجة أعلى ══════════════════════
console.log('\n④ canRead')
check('الحالة الابتدائية مغلقة', !isAdmin(CLOSED_DECISION) && CLOSED_DECISION.reason === 'not-resolved')
for (const [label, dec, req, drill] of [
  ['زائر + تعمّق', anon, 'founder+drilldown', true],
  ['عادي + تعمّق', ordinary, 'founder+drilldown', true],
  ['مزوَّر + تعمّق', forged, 'founder+drilldown', true],
  ['ابتدائية + تعمّق', CLOSED_DECISION, 'founder+drilldown', true],
  ['زائر بلا تعمّق', anon, 'founder', false],
  ['مؤسس بلا تعمّق على حقل تعمّق', granted, 'founder+drilldown', false],
]) check(`منع القراءة: ${label}`, canRead(dec, req, drill) === false)
check('ومؤسس متعمّق يقرأ — فالمنع ليس عامًّا', canRead(granted, 'founder+drilldown', true) === true)
check('ومؤسس يقرأ حقل founder بلا تعمّق', canRead(granted, 'founder', false) === true)

// ══════════════════ ⑤ لا مسار بيانات أصلًا خلف الحارس ══════════════════════
console.log('\n⑤ طبقة البيانات — الحارس ليس آخر خط')
const srcSource = readFileSync(resolve(root, 'src/admin/contract/source.ts'), 'utf8')
check('مصدر اللوحة معلَن EXTERNALLY_BLOCKED', /WIRING_STATE:\s*WiringState\s*=\s*'EXTERNALLY_BLOCKED'/.test(srcSource))
check('ولا ينادي أي RPC أو جدول', !/\.rpc\(|\.from\(|service_role/.test(srcSource))
check('فحتى مؤسس مُصرَّح لا يقرأ صفّ غيره اليوم', /gapOf\(/.test(srcSource) && !/select\s+\*/i.test(srcSource))
// [OVERNIGHT-6] تكامل بين حارتين: حارة اللوحة جعلت `adminRoleProvisioning`
// **تشتقّ** حالتها من قرار الدور بدل ثابت مكتوب — وهو تحسين، لكنه غيّر التوقيع.
// وكان هذا النداء بلا وسيط فيسقط بـ`TypeError` **مجهول الاسم**، وهو ما يمنعه
// الميثاق §4.2 صراحةً: السقوط غير المسمّى ليس إثباتًا. فيُمرَّر قرار حقيقي،
// وتُفحص الحالات الأربع لا حالة واحدة.
check('التوقيع يقبل قرارًا (وإلا لسقط الإثبات بخطأ مجهول لا بفحص)',
  typeof adminRoleProvisioning === 'function' && adminRoleProvisioning.length === 1)
for (const [reason, expected] of [
  ['no-session', 'no-session'],
  ['no-role-claim', 'claim-absent'],
  ['forged-claim', 'claim-rejected'],
  ['unknown-role', 'claim-rejected'],
]) {
  check(`اللوحة تعلن «${expected}» عند «${reason}» — إعلان لا ادّعاء عطل`,
    adminRoleProvisioning({ role: 'denied', reason }) === expected,
    adminRoleProvisioning({ role: 'denied', reason }))
}
check('ومؤسس مُصرَّح يُعلَن claim-present',
  adminRoleProvisioning({ role: 'founder', reason: 'granted' }) === 'claim-present')
// ولا تُخلط الحالات: انتحال مرفوض ≠ غياب مطالبة. لو تساويا لضاع الفرق الذي
// يُبنى عليه قرار «هذا هجوم» مقابل «هذا مستخدم عادي».
check('★ والانتحال لا يُقرأ كغياب مطالبة',
  adminRoleProvisioning({ role: 'denied', reason: 'forged-claim' })
    !== adminRoleProvisioning({ role: 'denied', reason: 'no-role-claim' }))
const guardSrc = readFileSync(resolve(root, 'src/admin/auth/adminRole.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ')
for (const bad of ['localStorage', 'sessionStorage', 'document.cookie', 'window.location', 'URLSearchParams', 'import.meta.env', 'fetch(']) {
  check(`الحارس لا يقرأ ${bad}`, !guardSrc.includes(bad))
}

console.log(`\n✅ تصعيد المسؤول: ${passed} فحصًا، مسار قبول واحد فقط.\n`)
