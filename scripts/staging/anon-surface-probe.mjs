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
import { diagnose, EXPLAIN, classifyConfirmEmail } from './probe-diagnosis.mjs'

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
let unknowns = 0
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

/**
 * ═══ ٠) الضابط الموجب — ولماذا صار **جدولًا** لا نقطةً واحدة ═══
 *
 * أوّل صيغةٍ قاست نقطةً واحدة (`/rest/v1/`). فعادت `401` بمفتاحٍ صحيح على
 * staging الحقيقي، فأعلن المسبار عماه وتوقّف — **وهو الصواب**. لكنه توقّف
 * **بلا أن يُفيد**: و`401` لها سببان متناقضان تمامًا، ولم يُعطِ ما يفرّق:
 *
 *   ① ضابطي رديء — لنقطة PostgREST الجذر دلالةٌ خاصّة قد تردّ بلا مصادقة
 *     مستخدم حتى بمفتاح صحيح.
 *   ② أو **المفتاح لا يعمل أصلًا** — وذاك أخطر بكثير: يعني أن بناء التطبيق
 *     على staging لا يصادق، فلا تسجيل ولا تجربة ولا استرداد. (والمرجَّح:
 *     المفتاح من طراز JWT القديم، وقد يكون المشروع أوقف المفاتيح القديمة
 *     لصالح `sb_publishable_…`.)
 *
 * **والتوقّف الآمن ليس توقّفًا مفيدًا.** بوابةٌ ترفض أن تضلّل ثم لا تسلّم
 * الدليل اللازم لإصلاحها تُكلّف دورةً كاملة — وقد كلّفت واحدة فعلًا.
 *
 * فصار يجرّب **عدّة نقاط** ويطبع جدولها كاملًا **قبل أي حكم**: يكفي أن
 * تفرّق واحدةٌ منها ليكون المسبار مبصرًا. وإن عميت كلّها، خرج الجدول معه —
 * فتُقرأ العلّة من رقمٍ لا من تخمين.
 */
console.log('\n① الضابط الموجب — جدول نقاط، لا نقطة واحدة')
const mangled = `${KEY.slice(0, -6)}XXXXXX`
const CONTROLS = [
  { path: '/auth/v1/health',   note: 'صحّة خدمة المصادقة' },
  { path: '/auth/v1/settings', note: 'إعدادات المصادقة العامّة' },
  { path: '/rest/v1/',         note: 'جذر PostgREST' },
]
let sighted = null
const table = []
console.log('   نقطة                     بمفتاح صحيح   بمفتاح مهشَّم')
for (const c of CONTROLS) {
  const okRes = await call(c.path)
  const badRes = await call(c.path, { key: mangled })
  const distinguishes = okRes.status === 200 && badRes.status !== 200
  table.push({ path: c.path, ok: okRes.status, bad: badRes.status })
  console.log(`   ${c.path.padEnd(24)} ${String(okRes.status).padEnd(13)} ${badRes.status}`
    + (distinguishes ? '   ← يفرّق' : ''))
  if (distinguishes && !sighted) sighted = { ...c, res: okRes }
}
check('نقطةٌ واحدة على الأقل تفرّق بين المفتاح الصحيح والمهشَّم',
  sighted !== null, sighted ? sighted.path : 'لا واحدة')

if (!sighted) {
  console.log('\n⛔ المسبار **أعمى**: لا نقطة تفرّق بين مسموحٍ وممنوع.')
  console.log('   وكل رفضٍ بعد هذا لا يُثبت حراسة — فيتوقّف قبل أن يضلّل.')
  /**
   * ═══ والاستنتاج **يُحسب** من الجدول، لا يُترك قائمةً يقرؤها القارئ ═══
   * أوّل صيغةٍ طبعت أربع احتمالات وتركت المطابقة للإنسان. وهو نصفُ إفادة:
   * الحالة الأرجح — `health` تعمل بلا مفتاح بينما البقيّة تُردّ — لم تكن في
   * القائمة أصلًا، فكان القارئ سيقع بين سطرين.
   * فالمسبار يقول ما رآه: أوصلت الشبكة؟ وهل رُدّ المفتاح؟
   */
  // الحكم من `probe-diagnosis.mjs` — **سلطة واحدة** يستوردها هذا وإثباته،
  // فلا تشيخ نسخةٌ منه في مكانٍ ويُعدَّل الأصل في آخر.
  const verdict = diagnose(table)
  console.log('')
  for (const line of EXPLAIN[verdict]) console.log(`   ${line === EXPLAIN[verdict][0] ? '⇒ ' : '  '}${line}`)
  process.exit(1)
}

// ── ٠-ب) وسؤالٌ يُجاب مجّانًا من نقطةٍ عامّة: أتأكيدُ البريد مُفعَّل؟ ──────
// `Confirm email` بقي «غير متحقَّق منه» لأن `/config/auth` الإدارية تحتاج
// صلاحيةً أوسع، **ولا تُوسَّع صلاحية رمزٍ من أجل قراءة إعداد**. لكن
// `/auth/v1/settings` نقطةٌ **عامّة** يقرؤها المتصفّح بالمفتاح العامّ نفسه.
{
  const s = await call('/auth/v1/settings')
  console.log('\n② تأكيد البريد — من نقطةٍ عامّة، بلا توسيع صلاحية')
  if (s.status !== 200) {
    console.log(`  ⓘ تعذّر قراءة إعدادات المصادقة (HTTP ${s.status}) — يبقى غير متحقَّق.`)
  } else {
    let cfg = null
    try { cfg = JSON.parse(s.text) } catch { cfg = null }
    const verdict = classifyConfirmEmail(cfg)
    if (verdict === 'ENABLED') {
      check('Confirm email مُفعَّل — التأكيد مطلوب', true, 'mailer_autoconfirm = false')
    } else if (verdict === 'DISABLED') {
      // فشلٌ حقيقي: كل مسار في نموذج الوصول يشترط `email_confirmed_at`.
      check('Confirm email مُفعَّل — التأكيد مطلوب', false,
        'mailer_autoconfirm = true ⇒ **التأكيد مُعطَّل**، وكل نموذج الوصول ينكسر')
    } else {
      /**
       * ⚠️ «لا أعرف» تُبلَّغ **ومعها الدليل** — ولا تُسقِط.
       * غيابُ الحقل تعذُّرُ معرفة لا خللُ إعداد. وإسقاطُ المسبار عليه يسم
       * نتيجةً ناجحة بالفشل: خمسة عشر رفضًا مرّت، ثم يُقرأ الرمز ١ «السطح
       * مكسور». وطباعةُ المفاتيح تُنهي السؤال في دورةٍ واحدة بدل دورتين.
       */
      unknowns += 1
      const keys = cfg && typeof cfg === 'object' ? Object.keys(cfg) : []
      const related = keys.filter((k) => /confirm|mailer|signup|autoconfirm|email/i.test(k))
      console.log('  ⓘ **غير متحقَّق** — الحقل `mailer_autoconfirm` غائب عن الناتج.')
      console.log('     وهذا تعذُّرُ معرفة، لا خللُ إعداد — فلا يُسقِط المسبار.')
      console.log(`     مفاتيح الناتج (${keys.length}): ${keys.join(' · ') || '—'}`)
      if (related.length) {
        console.log('     وذات الصلة بقيمها:')
        for (const k of related) console.log(`       ${k} = ${JSON.stringify(cfg[k])}`)
      }
      console.log('     ⇒ أرسل هذين السطرين؛ يُحسم منهما بلا دورةٍ أخرى.')
    }
  }
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

// ⚠️ «غير متحقَّق» يُعدّ على حدة ولا يُخلط بالفشل — الخلط بينهما يسم نتيجةً
//    ناجحة بالفشل، وقد وقع فعلًا.
console.log(`\n${fails.length === 0 ? '✅' : '❌'} السطح العامّ: ${pass} فحصًا · ${fails.length} فشل`
  + (unknowns ? ` · ${unknowns} غير متحقَّق` : ''))
if (fails.length) { fails.forEach((f) => console.log(`   • ${f}`)); process.exit(1) }
console.log('\n⚠️ حدّه المعلَن: يُثبت أن السطح **يرفض**، لا أن المصادَق **ينجح**.')
console.log('   ذاك يحتاج JWT مستخدمٍ حقيقي — أي حسابًا، أي بعد Confirm email.\n')
