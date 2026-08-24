#!/usr/bin/env node
// ============================================================================
// مسبار السطح العامّ — ما الذي يبلغه متصفّحٌ يحمل مفتاح `anon` وحده؟
// ============================================================================
// ═══ الفجوة التي يسدّها ═══
// الفحص السلوكي (`staging-smoke.sql`) جرى عبر **واجهة الإدارة**، أي بدور
// **مالك الجداول**. ولا هجرة عندنا تكتب `force row level security`، والمالك
// يتجاوز RLS افتراضًا. فما أثبته ذلك الفحص هو **منطق الدوالّ** على مخطّط
// حقيقي: حساب التجربة · تطبيع الاسم المستعار · حارس §8 · الاسترداد · الحدّ.
//
// ولم يُثبت **طبقةً أخرى بالكامل**: أن مَن يحمل مفتاح `anon` — وهو مفتاحٌ
// عامّ يراه كل زائر في حزمة التطبيق — لا يبلغ ما ليس له. تلك طبقة المنح
// وRLS وPostgREST، ولا يمسّها فحصٌ يعمل بدور المالك.
//
// **والفرق بينهما هو الفرق بين «المنطق صحيح» و«لا يمكن الالتفاف عليه».**
//
// ═══ الضابط الموجب — ولماذا هو ضرورة لا زينة ═══
// `anon` لا يملك شيئًا على جداول `public` (يفرضه `20260806120003`). فلا يوجد
// شيءٌ «مسموح» يُقاس به النجاح. ولولا ضابطٌ موجب لمرّت كل الرفوض **مجّانًا**
// عند أوّل مفتاح خاطئ أو عنوان مغلوط: كلّها تُردّ، ويُقرأ الردّ حراسةً.
//
// فالضابط: نداءٌ بمفتاح صحيح يعود 200، ونفسه بمفتاح مهشَّم يعود 401. فإن لم
// يفترقا، فالمسبار أعمى ويُعلن ذلك ويتوقّف **قبل** أن يطبع رفضًا واحدًا.
//
// ═══ التشغيل ═══
//   SUPABASE_URL='https://<ref>.supabase.co' \
//   SUPABASE_ANON_KEY='<المفتاح العامّ>' \
//   node scripts/staging/anon-surface-probe.mjs
//
// ⛔ **لا يُكتب مفتاح في المستودع** — من البيئة حصرًا (`rules/security.md`).
// ⛔ **ولا يُمرَّر `service_role` هنا إطلاقًا.** المسبار يرفضه صراحةً: تمريره
//    يجعل كل رفضٍ يتحوّل قبولًا فيقلب المعنى رأسًا على عقب.
// ✅ ولا يكتب هذا المسبار شيئًا: كل نداء فيه قراءةٌ أو نداءٌ يُنتظَر رفضه.
// ============================================================================
const URL_ = (process.env.SUPABASE_URL || '').replace(/\/+$/, '')
const KEY = process.env.SUPABASE_ANON_KEY || ''

if (!URL_ || !KEY) {
  console.error('✗ ينقص SUPABASE_URL أو SUPABASE_ANON_KEY — انظر ترويسة الملف.')
  process.exit(2)
}

// ── حارسٌ قبل أي نداء: هذا مفتاح عامّ أم سرّ؟ ─────────────────────────────
// تمريرُ `service_role` سهوًا يقلب المسبار من إثباتٍ إلى تضليل: كل ما يجب أن
// يُرفَض سيُقبَل، فيُقرأ «السطح مفتوح» وهو ليس السطح أصلًا.
try {
  const body = JSON.parse(Buffer.from(KEY.split('.')[1] || '', 'base64url').toString('utf8'))
  if (body.role && body.role !== 'anon') {
    console.error(`✗ المفتاح دوره «${body.role}» لا «anon» — المسبار يرفض العمل به.`)
    console.error('   السرّ يقلب كل رفضٍ قبولًا فيصير المسبار تضليلًا لا إثباتًا.')
    process.exit(2)
  }
  console.log(`\n══ مسبار السطح العامّ — ref ${body.ref || '?'} · role ${body.role || '?'} ══`)
} catch {
  console.error('✗ تعذّر قراءة المفتاح — أهو JWT؟')
  process.exit(2)
}

let pass = 0
const fails = []
const check = (label, ok, detail = '') => {
  if (ok) { pass += 1; console.log(`  ✓ ${label}${detail ? `  — ${detail}` : ''}`) }
  else { fails.push(label); console.log(`  ✗ FAIL: ${label}${detail ? `  — ${detail}` : ''}`) }
}

const call = async (path, { method = 'GET', key = KEY, body } = {}) => {
  const res = await fetch(`${URL_}${path}`, {
    method,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  let text = ''
  try { text = await res.text() } catch { text = '' }
  return { status: res.status, text: text.slice(0, 300) }
}

// ── ٠) الضابط الموجب — يسبق كل شيء، ويوقف كل شيء إن سقط ──────────────────
console.log('\n① الضابط الموجب — أيميّز المسبار المسموحَ من الممنوع؟')
const good = await call('/rest/v1/')
const bad = await call('/rest/v1/', { key: `${KEY.slice(0, -6)}XXXXXX` })
check('نداءٌ بمفتاح صحيح يصل (200)', good.status === 200, `HTTP ${good.status}`)
check('ونفسه بمفتاح مهشَّم يُردّ (401)', bad.status === 401, `HTTP ${bad.status}`)
if (good.status !== 200 || bad.status === good.status) {
  console.log('\n⛔ المسبار **أعمى**: لا يفرّق بين مسموحٍ وممنوع.')
  console.log('   وكل رفضٍ سيطبعه بعد هذا لا يُثبت حراسة — فيتوقّف قبل أن يضلّل.')
  process.exit(1)
}

// ── ١) جداول لا يملك `anon` عليها شيئًا ───────────────────────────────────
console.log('\n② الجداول — `anon` لا يملك شيئًا على `public` (20260806120003)')
for (const t of ['entitlements', 'access_codes', 'trial_ledger',
                 'code_redemption_ledger', 'purchase_ledger']) {
  const r = await call(`/rest/v1/${t}?select=*&limit=1`)
  // 200 مع صفوف = تسريب. و200 مع `[]` تعني RLS حجبت — وهي مقبولة لكن أضعف،
  // فتُسمّى كما هي بدل أن تُخلط بالمنع الكامل.
  const leaked = r.status === 200 && r.text.trim() !== '[]'
  check(`لا يقرأ \`${t}\``, !leaked,
    r.status === 200 ? 'HTTP 200 — لكن بلا صفوف (RLS)' : `HTTP ${r.status}`)
}

// ── ٢) دوالّ إدارية لا تُنادى من متصفّح ───────────────────────────────────
console.log('\n③ الدوالّ الإدارية — لا تُنادى بمفتاح عامّ')
for (const fn of ['admin_grant_premium', 'admin_create_access_code',
                  'admin_set_role', 'admin_revoke', 'founder_issue_access_code']) {
  const r = await call(`/rpc/${fn}`, { method: 'POST', body: {} })
  check(`\`${fn}\` غير قابلة للنداء`, r.status !== 200, `HTTP ${r.status}`)
}

// ── ٣) دوالّ العميل — للمصادَق لا للزائر ─────────────────────────────────
console.log('\n④ دوالّ العميل — مصادَقٌ لا زائر')
for (const fn of ['start_trial', 'my_entitlement', 'claim_pending_grants']) {
  const r = await call(`/rest/v1/rpc/${fn}`, { method: 'POST', body: {} })
  check(`\`${fn}\` لا تعمل بلا مصادقة`, r.status !== 200, `HTTP ${r.status}`)
}
{
  const r = await call('/rest/v1/rpc/redeem_access_code_v2',
    { method: 'POST', body: { p_code: 'AAAAAAAAAAAAAAAA' } })
  check('`redeem_access_code_v2` لا تعمل بلا مصادقة', r.status !== 200, `HTTP ${r.status}`)
}

// ── ٤) المسار القديم — مسحوبٌ من العميل (legacy_open = 0) ────────────────
console.log('\n⑤ المسار القديم — مسحوب')
{
  const r = await call('/rest/v1/rpc/redeem_access_code',
    { method: 'POST', body: { p_code: 'AAAAAAAAAAAAAAAA' } })
  check('`redeem_access_code` غير معروضة للعميل', r.status !== 200, `HTTP ${r.status}`)
}

console.log(`\n${fails.length === 0 ? '✅' : '❌'} السطح العامّ: ${pass} فحصًا · ${fails.length} فشل`)
if (fails.length) { fails.forEach((f) => console.log(`   • ${f}`)); process.exit(1) }
console.log('\n⚠️ حدّه المعلَن: يُثبت أن السطح **يرفض**، لا أن المصادَق **ينجح**.')
console.log('   ذاك يحتاج JWT مستخدمٍ حقيقي — أي حسابًا، أي بعد Confirm email.\n')
