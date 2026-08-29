// ============================================================================
// test:attack-gateway-coupling — الطرفان يجب أن يتّفقا: ما تحرسه القاعدة
// يجب أن يمرّ به العميل.
// ============================================================================
// [RED-TEAM-FINAL] **لماذا وُجد هذا الحارس — والثمن الذي دفعناه بغيابه.**
//
// هجرة `20260827120004` أضافت `perform private.gate_enforce('<action>')` إلى
// أربع طفرات تجارية، فصارت القاعدة ترفض كل نداء لا يحمل ختم `x-qimmah-gate`.
// وهو ختمٌ **لا تسكّه إلا البوّابة**. لكنّ العميل الشاحن لا ينادي البوّابة
// إطلاقًا: `entitlementBackend.ts` و`missingFoodReport.ts` ينادون PostgREST
// مباشرةً بـ`supabase.rpc(...)`. النتيجة: **كل تجربة وكل استرداد وكل مطالبة
// شراء وكل بلاغ طعام يُرفض** — والمستخدم المسجَّل دخوله يُقال له «سجّل دخولك»
// (رمز `28000` يصنّفه المُصنِّف `not_authenticated`) في حلقة لا تُغلق.
//
// ولماذا لم تلتقطه ١٨٣ خطوة بوّابة: الهجرة نفسها **علّمت الطقمين أن يسكّا
// الختم** (`supabase-sandbox.mjs` · `pg-staging.mjs`)، فصار كل إثبات قائم
// يتصرّف كبوّابةٍ ليست في المسار الحقيقي. وطقوم e2e تعمل بـ
// `VITE_ENTITLEMENT_MODE=mock` فلا تلمس القاعدة. فطرفا الوصلة كلاهما مُحاكى،
// ولا أحد يختبر **الوصلة نفسها**. هذا الحارس يختبرها وحدها.
//
// ═══ الثابت المحروس ═══
//   لكل فعل مبوَّب في القاعدة، **كل** نداء عميلٍ لِـRPCه يجب أن يمرّ بالبوّابة.
//   نداءٌ عارٍ (`supabase.rpc`) لدالّة مبوَّبة = عطلٌ مؤكَّد، لا رأي.
//
// المصدر سلطةٌ لا نصّ: التبويب يُقرأ من `pg_proc.prosrc` بعد تطبيق كل الهجرات
// على قاعدة حقيقية — لا regex على ملفات الهجرة (الدرس: قِس المحتوى لا الموضع).
// ============================================================================
import { createSandbox } from '../db/lib/supabase-sandbox.mjs'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SRC = join(ROOT, 'src')
const results = []
const check = (name, pass, detail = '') => {
  results.push({ name, pass })
  console.log(`  ${pass ? '🛡️  PASS' : '⚔️  FAIL'} — ${name}${detail ? `\n         ⟨${detail}⟩` : ''}`)
  return pass
}

// ── ① سلطة التبويب: من القاعدة الحيّة بعد كل الهجرات ────────────────────────
const { db, applied, failed } = await createSandbox()
if (failed.length) { console.log('⛔ هجرات فاشلة:', JSON.stringify(failed, null, 1)); process.exit(1) }
const gatedRows = (await db.query(`
  select p.proname,
         (regexp_match(p.prosrc, 'gate_enforce\\(''([a-z_]+)''\\)'))[1] as action
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosrc like '%gate_enforce%'
   order by p.proname`)).rows
const gatedRpcs = new Map(gatedRows.map((r) => [r.proname, r.action]))
console.log(`\n① التبويب كما تراه القاعدة (${applied.length} هجرة مطبَّقة)`)
for (const [fn, action] of gatedRpcs) console.log(`     ${fn}  ←  gate_enforce('${action}')`)
check('القاعدة تحمل طفرات مبوَّبة (وإلا فالحارس بلا موضوع)', gatedRpcs.size > 0, `gated=${gatedRpcs.size}`)

// ── ② مسح العميل: كل نداء RPC عارٍ، وكل نداء بوّابة ─────────────────────────
function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(e)) out.push(p)
  }
  return out
}
const BARE_RPC = /(?:supabase|client|sb)\s*\.\s*rpc\s*\(\s*['"]([a-z_0-9]+)['"]/g
const GATEWAY_CALL = /functions\s*\.\s*invoke\s*\(\s*(?:['"]qimmah-gateway['"]|GATEWAY_FUNCTION)/
// نداء العميل عبر القفزة الموحّدة — الفعل نصٌّ حرفي فيُقرأ بالاسم.
const GATEWAY_ACTION = /callGateway\s*\(\s*['"]([a-z_0-9]+)['"]/g
const files = walk(SRC)
const bareCalls = []        // { rpc, file, line }
const gatewayFiles = []
for (const f of files) {
  const text = readFileSync(f, 'utf8')
  if (GATEWAY_CALL.test(text)) gatewayFiles.push(f.replace(`${ROOT}/`, ''))
  let m
  BARE_RPC.lastIndex = 0
  while ((m = BARE_RPC.exec(text)) !== null) {
    const line = text.slice(0, m.index).split('\n').length
    bareCalls.push({ rpc: m[1], file: f.replace(`${ROOT}/`, ''), line })
  }
}
console.log(`\n② العميل: ${bareCalls.length} نداء RPC عارٍ · ${gatewayFiles.length} ملفًّا ينادي البوّابة`)

// ── ③ الثابت: لا نداء عارٍ لدالّة مبوَّبة ────────────────────────────────────
const violations = bareCalls.filter((c) => gatedRpcs.has(c.rpc))
console.log('\n③ الوصلة')
if (violations.length) {
  for (const v of violations) {
    console.log(`     ⚔️  ${v.file}:${v.line}  ينادي ${v.rpc}() عاريًا — والقاعدة تشترط ختم '${gatedRpcs.get(v.rpc)}'`)
  }
}
check('لا نداء عميلٍ عارٍ لدالّة تشترطها القاعدة بختم البوّابة',
  violations.length === 0,
  violations.length ? `${violations.length} نداءً مكسورًا: ${[...new Set(violations.map((v) => v.rpc))].join(' · ')}` : 'صفر')

// ── ③ب الاقتران **الموجب**: لكل فعل مبوَّب مسارُ عميلٍ يمرّ بالبوّابة ────────
// ⚠️ الثابت أعلاه وحده يُرضى **بالغياب**: احذف كل كود التصاريح فيصير «صفر
// نداءات عارية» ويمرّ الحارس على منتجٍ بلا تجارة. فالاقتران يُطلب موجبًا:
// الفعل المبوَّب في القاعدة يجب أن يُنادى من العميل — وإلا فالقدرة ميتة.
const clientActions = new Set()
for (const f of files) {
  const text = readFileSync(f, 'utf8')
  let m
  GATEWAY_ACTION.lastIndex = 0
  while ((m = GATEWAY_ACTION.exec(text)) !== null) clientActions.add(m[1])
}
const gatedActions = [...new Set([...gatedRpcs.values()])]
const orphanActions = gatedActions.filter((a) => !clientActions.has(a))
console.log(`     أفعال القاعدة المبوَّبة: ${gatedActions.join(' · ')}`)
console.log(`     أفعال العميل عبر البوّابة: ${[...clientActions].join(' · ') || '—لا شيء—'}`)
check('لكل فعل مبوَّب في القاعدة نداءُ عميلٍ عبر البوّابة (لا قدرة ميتة)',
  orphanActions.length === 0,
  orphanActions.length ? `بلا مستدعٍ: ${orphanActions.join(' · ')}` : `${gatedActions.length}/${gatedActions.length} مقترنة`)
check('وملفٌّ واحد على الأقلّ ينادي الطرفية فعلًا (القفزة موجودة لا مُدّعاة)',
  gatewayFiles.length > 0, gatewayFiles.join(' · ') || 'لا ملف')

// ── ④ تأكيد مضادّ (§4.2): الحارس يرى المخالفة حين تُصطنع ────────────────────
// لولا هذا لكان «صفر مخالفات» يُرضي ③ مجّانًا لو انكسر المسح (مسارٌ خاطئ،
// regex لا يطابق، مجلّد فارغ) — حارسٌ يمرّ لأنه لا يرى شيئًا.
console.log('\n④ تأكيد مضادّ — محاكاة الالتفاف')
{
  const simulatedSrc = `const x = await supabase.rpc('${[...gatedRpcs.keys()][0] ?? 'start_trial'}')`
  BARE_RPC.lastIndex = 0
  const found = BARE_RPC.exec(simulatedSrc)
  check('المسح يلتقط نداءً عاريًا مصطنعًا (فالصفر لو وقع يكون مستحقًّا)',
    found !== null && gatedRpcs.has(found[1]), found ? found[1] : 'لم يُلتقط')
  // ومحاكاة «الإرضاء بالغياب»: فعلٌ مبوَّب بلا مستدعٍ يجب أن يُكتشف بالاسم.
  const simulatedOrphan = ['start_trial', 'redeem_access_code', 'claim_pending_grants',
    'submit_missing_food', '__never_called_action__']
    .filter((a) => !clientActions.has(a))
  check('ومحاكاة فعلٍ مبوَّب بلا مستدعٍ تُكتشف (فالاقتران يُقاس لا يُفترض)',
    simulatedOrphan.length === 1 && simulatedOrphan[0] === '__never_called_action__',
    simulatedOrphan.join(' · '))
  // وعكسها: نداءٌ لدالّة غير مبوَّبة ليس مخالفة.
  BARE_RPC.lastIndex = 0
  const benign = BARE_RPC.exec(`await supabase.rpc('my_entitlement')`)
  check('ونداء دالّة غير مبوَّبة (my_entitlement) ليس مخالفة — لا تعميم',
    benign !== null && !gatedRpcs.has(benign[1]), benign ? benign[1] : 'لم يُلتقط')
}

const passed = results.filter((r) => r.pass).length
const failedN = results.length - passed
console.log(`\n${'═'.repeat(64)}\nنتيجة: ${passed} نجحت · ${failedN} فشلت`)
if (failedN > 0) {
  console.log('⚔️  الطرفان لا يتّفقان: القاعدة تحرس مسارًا لا يسلكه العميل.')
  process.exit(1)
}
console.log('🛡️  ما تحرسه القاعدة يمرّ به العميل — الوصلة متّسقة.')
