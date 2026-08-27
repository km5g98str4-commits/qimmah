// ============================================================================
// [RED-TEAM] إثبات إغلاق الالتفاف على البوّابة — أحمر قبل / أخضر بعد
// ============================================================================
// يُثبت على **Postgres حقيقي** أن هجرة 20260827120004 تحوّل ختم `x-qimmah-gate`
// من زينة إلى سلطة: قبلها ينجح النداء المباشر بلا ختم (الثغرة)، وبعدها يُرفض،
// ولا يمرّ إلا ختمٌ صحيح يسكّه **mintStamp الحقيقي من عقد البوّابة نفسه**.
//
// لا grep بنيويّ: كل بند نداءٌ فعليّ عبر psql على اتصال حقيقي، ويُقرأ مخرَجه.
//
//   red    → قاعدة بلا الهجرة: start_trial المباشر بلا ختم ينجح (bypass قائم).
//   green  → قاعدة كاملة: مصفوفة الهجوم السبعة + رحلة كل RPC مبوَّبة.
//
// التشغيل: node scripts/attack/gateway-stamp-enforcement-attack.mjs
//   (يتطلّب عنقود Postgres على QIMMAH_PG_URL؛ يتخطّى معلنًا إن غاب.)
// ============================================================================
import { clusterAvailable, createStaging, provision, makeUser, mintStampSync } from '../db/lib/pg-staging.mjs'
// الختم الحقيقي كما تسكّه البوّابة (Web Crypto، غير متزامن) — إثبات أن القاعدة
// تقبل مُخرَج البوّابة الفعليّ لا نسخةً موازية.
import { mintStamp } from '../../supabase/functions/qimmah-gateway/contract.mjs'

const GATE_MIG = '20260827120004_gateway_stamp_enforcement.sql'
const NOW = () => Date.now()
const WMS = 120 * 1000

let pass = 0, fail = 0
const check = (name, cond, extra = '') => {
  const ok = !!cond
  console.log(`${ok ? '✓' : '✗'} ${name}${extra ? '  [' + extra + ']' : ''}`)
  ok ? pass++ : fail++
  return ok
}
// نداء RPC؛ يعيد {ok, out} أو {ok:false, err}. الرفض يأتي استثناءً من psql.
function attempt(stg, sql, opts) {
  try { return { ok: true, out: stg.one(sql, opts) } }
  catch (e) { return { ok: false, err: String(e.stderr || e.message || e) } }
}
const rejected = (r, reason = 'gate_stamp_invalid') => !r.ok && r.err.includes(reason)

if (!clusterAvailable()) {
  console.log('SKIP: no Postgres cluster on QIMMAH_PG_URL — gateway-stamp proof needs a real cluster.')
  process.exit(0)
}

// ═══════════════════ RED — قبل الهجرة: الالتفاف قائم ═══════════════════
{
  const before = createStaging(undefined, { exclude: [GATE_MIG] })
  if (before.failed.length) { console.log('RED build failed:', JSON.stringify(before.failed)); process.exit(1) }
  provision(before, {})
  check('RED before: gate_stamp_valid لا وجود لها',
    before.one(`select to_regprocedure('private.gate_stamp_valid(text,uuid,text)') is null`) === 't')
  const uRed = makeUser(before, 'red@ex.com')
  const red = attempt(before, 'select public.start_trial()', { uid: uRed, stamp: false })
  check('RED before: نداء start_trial مباشر بلا ختم **ينجح** (الثغرة المقيسة)',
    red.ok && red.out === 'trialActive', red.ok ? red.out : red.err.slice(0, 70))
  before.drop()
}

// ═══════════════════ GREEN — بعد الهجرة: كل التفاف يُرفض ═══════════════════
const stg = createStaging()
if (stg.failed.length) { console.log('GREEN build failed:', JSON.stringify(stg.failed)); process.exit(1) }
provision(stg, {})
const secret = stg.gateSecret
check('GREEN: gate_stamp_valid موجودة (السلطة التي يسمّيها contract.mjs)',
  stg.one(`select to_regprocedure('private.gate_stamp_valid(text,uuid,text)') is not null`) === 't')
check('GREEN: gate_secret يُقرأ من بديل vault (فشل مغلق لو غاب)',
  stg.one(`select private.gate_secret() is not null`) === 't')

const uA = makeUser(stg, 'attacker@ex.com')       // الحارس يرفض قبل أي حالة ⇒ قابل لإعادة الاستعمال
const uOther = makeUser(stg, 'other@ex.com')

// ─ مصفوفة الهجوم السبعة على start_trial ─
check('DIRECT_RPC_WITHOUT_STAMP → مرفوض',
  rejected(attempt(stg, 'select public.start_trial()', { uid: uA, stamp: false })))

const forged = mintStampSync('WRONG-SECRET-' + 'x'.repeat(40), 'start_trial', uA, NOW())
check('FORGED_STAMP (سرّ خاطئ) → مرفوض',
  rejected(attempt(stg, 'select public.start_trial()', { uid: uA, stamp: forged })))

const expired = mintStampSync(secret, 'start_trial', uA, NOW() - 2 * WMS)   // نافذة now-2
check('EXPIRED_STAMP (نافذة منتهية) → مرفوض',
  rejected(attempt(stg, 'select public.start_trial()', { uid: uA, stamp: expired })))

check('MALFORMED_STAMP (بلا فاصل) → مرفوض',
  rejected(attempt(stg, 'select public.start_trial()', { uid: uA, stamp: 'abcdef' })))
check('MALFORMED_STAMP (توقيع ليس ست عشريًّا ٦٤) → مرفوض',
  rejected(attempt(stg, 'select public.start_trial()', { uid: uA, stamp: '999.not-a-valid-hex' })))

const crossAction = mintStampSync(secret, 'redeem_access_code', uA, NOW())  // ختم فعلٍ آخر
check('CROSS_ACTION_REPLAY (ختم redeem على start_trial) → مرفوض',
  rejected(attempt(stg, 'select public.start_trial()', { uid: uA, stamp: crossAction })))

const crossUser = mintStampSync(secret, 'start_trial', uOther, NOW())       // ختم مستخدمٍ آخر
check('CROSS_USER_REPLAY (ختم uid آخر) → مرفوض',
  rejected(attempt(stg, 'select public.start_trial()', { uid: uA, stamp: crossUser })))

// ─ الرحلة الصحيحة: بختم البوّابة الحقيقيّ ─
const uV = makeUser(stg, 'valid@ex.com')
const realStamp = await mintStamp(secret, 'start_trial', uV, NOW())
const good = attempt(stg, 'select public.start_trial()', { uid: uV, stamp: realStamp })
check('VALID_GATEWAY_CALL (mintStamp الحقيقي) → ينجح trialActive',
  good.ok && good.out === 'trialActive', good.ok ? good.out : good.err.slice(0, 80))
check('gate_stamp_valid في القاعدة تقبل ختم البوّابة الحقيقيّ حرفيًّا',
  stg.one(`select private.gate_stamp_valid('start_trial', '${uV}'::uuid, '${realStamp}')`) === 't')

// ─ الهوية تبقى auth.uid() وحدها: ختمٌ صحيح بلا JWT لا يمنح ─
const noJwtStamp = await mintStamp(secret, 'start_trial', '00000000-0000-0000-0000-000000000000', NOW())
const noJwt = attempt(stg, 'select public.start_trial()', { uid: null, stamp: noJwtStamp })
check('بلا JWT (auth.uid فارغ) → "not authenticated" ولو حمل ختمًا',
  !noJwt.ok && noJwt.err.includes('not authenticated'))

// ═══════════ رحلة كل RPC مبوَّبة: بلا ختم يُرفض / بختم صحيح يُنفَّذ ═══════════
// REDEEM — كود حقيقيّ من مسار المؤسس (غير مبوَّب)
const founderId = makeUser(stg, 'founder@qimmah.test')
stg.sql(`select public.admin_set_role('founder@qimmah.test','founder','proof')`, { role: 'service_role' })
const issued = JSON.parse(stg.one(`select public.founder_issue_access_code('proof-campaign','once',7,1)`, { uid: founderId }))
const uRedeem = makeUser(stg, 'redeemer@ex.com')
check('REDEEM بلا ختم → مرفوض',
  rejected(attempt(stg, `select public.redeem_access_code_v2('${issued.code}')`, { uid: uRedeem, stamp: false })))
const rStamp = await mintStamp(secret, 'redeem_access_code', uRedeem, NOW())
const rOut = attempt(stg, `select public.redeem_access_code_v2('${issued.code}')`, { uid: uRedeem, stamp: rStamp })
check('REDEEM_ACCESS_CODE بختم صحيح → يُنفَّذ (specialAccessActive)',
  rOut.ok && String(rOut.out).includes('specialAccessActive'), rOut.ok ? String(rOut.out).slice(0, 60) : rOut.err.slice(0, 60))

// CLAIM_PENDING_GRANTS — مستخدم موثَّق بلا معلّقات ⇒ noAccess (لكنه نفّذ الحارس)
const uClaim = makeUser(stg, 'claim@ex.com')
check('CLAIM بلا ختم → مرفوض',
  rejected(attempt(stg, 'select public.claim_pending_grants()', { uid: uClaim, stamp: false })))
const cStamp = await mintStamp(secret, 'claim_pending_grants', uClaim, NOW())
const cOut = attempt(stg, 'select public.claim_pending_grants()', { uid: uClaim, stamp: cStamp })
check('CLAIM_PENDING_GRANTS بختم صحيح → يُنفَّذ',
  cOut.ok && String(cOut.out).length > 0, cOut.ok ? String(cOut.out) : cOut.err.slice(0, 60))

// SUBMIT_MISSING_FOOD
const uFood = makeUser(stg, 'food@ex.com')
check('SUBMIT بلا ختم → مرفوض',
  rejected(attempt(stg, `select public.submit_missing_food('Proof Bar')`, { uid: uFood, stamp: false })))
const fStamp = await mintStamp(secret, 'submit_missing_food', uFood, NOW())
const fOut = attempt(stg, `select public.submit_missing_food('Proof Bar')`, { uid: uFood, stamp: fStamp })
check('SUBMIT_MISSING_FOOD بختم صحيح → يُنفَّذ (queued)',
  fOut.ok && String(fOut.out).includes('queued'), fOut.ok ? String(fOut.out).slice(0, 60) : fOut.err.slice(0, 60))

// ═══════════ ما لا يُبوَّب: my_entitlement يعمل بلا ختم (قراءة كل صفحة) ═══════════
const uMe = makeUser(stg, 'me@ex.com')
const meOut = attempt(stg, 'select public.my_entitlement()', { uid: uMe, stamp: false })
check('my_entitlement **غير مبوَّبة**: تُقرأ بلا ختم', meOut.ok, meOut.ok ? 'ok' : meOut.err.slice(0, 60))

stg.drop()
console.log(`\nGATEWAY_STAMP_ENFORCEMENT: ${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
