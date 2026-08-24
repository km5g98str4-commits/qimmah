#!/usr/bin/env node
// ============================================================================
// إثبات عقد البوّابة التجارية — [STAGING-COMMISSIONING §7]
// ============================================================================
// نفس نمط `salla-webhook`: المنطق في `contract.mjs` خالصٌ وقابل للاختبار من
// Node، فيُهاجَم هنا بلا نشرٍ ولا شبكة. وحدُّ هذا الطقم معلَن في آخره.
// ============================================================================
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  GATED_ACTIONS, IP_HEADER_ORDER, clientIp, parseGatewayRequest, httpStatusFor,
  readGatewayConfig, mintStamp, verifyStamp, stampWindow, timingSafeEqualHex,
  STAMP_HEADER, STAMP_WINDOW_SECONDS,
} from '../supabase/functions/qimmah-gateway/contract.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0
const fails = []
const check = (label, cond, detail = '') => {
  if (cond) { pass += 1; console.log(`  ✓ ${label}${detail ? `  — ${detail}` : ''}`) }
  else { fails.push(label); console.log(`  ✗ FAIL: ${label}${detail ? `  — ${detail}` : ''}`) }
}
const H = (o) => new Headers(o)

console.log('\n① القائمة البيضاء — البوّابة ليست وكيلًا عامًّا')
check('كل فعل مُعلَن يحمل RPC وحدًّا ووسائط مُعلَنة',
  Object.values(GATED_ACTIONS).every((a) => a.rpc && a.perIpPerHour > 0 && Array.isArray(a.params)))
check('⚔️ وفعلٌ خارج القائمة يُردّ', parseGatewayRequest({ action: 'drop_everything' }).reason === 'action_not_allowed')
check('⚔️ ولا يُميَّز المجهول عن الممنوع — لا عرّاف يعدّد المخطّط',
  parseGatewayRequest({ action: 'admin_grant_premium' }).reason
  === parseGatewayRequest({ action: 'zzz_not_a_function' }).reason)
check('⚔️ ووسيطٌ زائد يُرفض ولا يُحذف بصمت',
  parseGatewayRequest({ action: 'start_trial', args: { p_user_id: 'x' } }).reason === 'unexpected_argument')
check('  ولا يمرّ حتى على فعلٍ له وسائط',
  parseGatewayRequest({ action: 'redeem_access_code', args: { p_code: 'A', p_uid: 'b' } }).reason === 'unexpected_argument')
check('والوسائط المُعلَنة تمرّ',
  parseGatewayRequest({ action: 'redeem_access_code', args: { p_code: 'ABC' } }).args.p_code === 'ABC')
check('والقراءة `my_entitlement` **ليست** خلف البوّابة عمدًا',
  !Object.prototype.hasOwnProperty.call(GATED_ACTIONS, 'my_entitlement'))
// ⚠️ **الفحص الحاسم:** لا فعلٍ يمرّر معرّف مستخدم — تلك هي السلطة الثانية.
const identityish = Object.values(GATED_ACTIONS)
  .flatMap((a) => a.params)
  .filter((p) => /uid|user|email|identity|sub/i.test(p))
check('⚔️ ولا فعلٍ يقبل وسيط هوية — الهويّة من `auth.uid()` وحدها',
  identityish.length === 0, identityish.join(' '))

console.log('\n② عنوان العميل — وصدقٌ فيما لا نعرفه')
check('يقرأ الترتيب المعروف ويقدّم ما تكتبه الحافّة',
  clientIp(H({ 'cf-connecting-ip': '203.0.113.9', 'x-forwarded-for': '1.2.3.4' })).ip === '203.0.113.9')
check('و`x-forwarded-for` يؤخذ **أوّله** — العميل لا الوسيط',
  clientIp(H({ 'x-forwarded-for': '203.0.113.9, 70.0.0.1, 10.0.0.1' })).ip === '203.0.113.9')
check('⚔️ وبلا أي ترويسة **يفشل مغلقًا** ولا يخترع عنوانًا',
  clientIp(H({})).ok === false && clientIp(H({})).ip === null)
check('  وقيمةٌ فارغة تُعامَل غيابًا لا عنوانًا', clientIp(H({ 'x-forwarded-for': '   ' })).ok === false)
check('والترتيب مُعلَن في ثابت يُقرأ لا مدفون في شرط', IP_HEADER_ORDER.length === 3)

console.log('\n③ الختم — يقول «مررتُ بالبوّابة» لا «أنا فلان»')
const SECRET = 'x'.repeat(48)
const NOW = 1_700_000_000_000
const stamp = await mintStamp(SECRET, 'redeem_access_code', 'uid-1', NOW)
check('ختمٌ صحيح يُقبل', (await verifyStamp(SECRET, 'redeem_access_code', 'uid-1', stamp, NOW)).ok)
check('⚔️ وسرٌّ آخر لا ينتجه', !(await verifyStamp('y'.repeat(48), 'redeem_access_code', 'uid-1', stamp, NOW)).ok)
check('⚔️ وختمُ فعلٍ لا يصلح لفعلٍ آخر — لا إعادة توجيه',
  (await verifyStamp(SECRET, 'start_trial', 'uid-1', stamp, NOW)).reason === 'stamp_bad')
check('⚔️ وختمُ مستخدمٍ لا يصلح لآخر',
  (await verifyStamp(SECRET, 'redeem_access_code', 'uid-2', stamp, NOW)).reason === 'stamp_bad')
check('⚔️ وغيابُه يُردّ باسمه', (await verifyStamp(SECRET, 'redeem_access_code', 'uid-1', '', NOW)).reason === 'stamp_missing')
check('⚔️ ومشوَّهُه كذلك', (await verifyStamp(SECRET, 'redeem_access_code', 'uid-1', 'nodot', NOW)).reason === 'stamp_malformed')
// الطزاجة: نافذة حالية وسابقة تُقبلان، وما قبلهما **منتهٍ** لا «قريب».
check('ونافذةُ ما قبل تُقبل — فلا يسقط طلبٌ عبر الحدّ',
  (await verifyStamp(SECRET, 'redeem_access_code', 'uid-1', stamp, NOW + STAMP_WINDOW_SECONDS * 1000)).ok)
check('⚔️ وختمٌ ملتقَط قديم يُردّ `stamp_expired` — فالالتقاط لا يُعاد للأبد',
  (await verifyStamp(SECRET, 'redeem_access_code', 'uid-1', stamp, NOW + 3600_000)).reason === 'stamp_expired')
check('والنافذة تتقدّم فعلًا مع الزمن',
  stampWindow(NOW + STAMP_WINDOW_SECONDS * 1000) === stampWindow(NOW) + 1)
check('والمقارنة ثابتة الزمن ترفض اختلاف الطول', !timingSafeEqualHex('aa', 'aaa'))
check('  وتقبل التطابق', timingSafeEqualHex('abcd', 'abcd'))

console.log('\n④ التهيئة — إلزامية بلا افتراضات')
check('⚔️ نقصُ أي متغيّر يوقف الطرفية', readGatewayConfig({}).ok === false)
check('  والسبب يسمّي الناقص', readGatewayConfig({}).reason.startsWith('missing:'))
check('⚔️ وسرٌّ قصير يُرفض — سرٌّ ضعيف يجعل الختم زينة',
  readGatewayConfig({
    SUPABASE_URL: 'u', SUPABASE_ANON_KEY: 'a', SUPABASE_SERVICE_ROLE_KEY: 's',
    QIMMAH_GATE_SECRET: 'short',
  }).reason === 'gate_secret_too_short')
check('وتهيئة كاملة تمرّ',
  readGatewayConfig({
    SUPABASE_URL: 'u', SUPABASE_ANON_KEY: 'a', SUPABASE_SERVICE_ROLE_KEY: 's',
    QIMMAH_GATE_SECRET: 'z'.repeat(32),
  }).ok)

console.log('\n⑤ رموز HTTP — مصدر واحد يقرؤه الطرفية والاختبار')
check('الخنق ٤٢٩', httpStatusFor('rate_limited') === 429)
check('وغير المصادَق ٤٠١', httpStatusFor('unauthenticated') === 401)
check('والتهيئة الناقصة ٥٠٣ — لا ٢٠٠', httpStatusFor('misconfigured') === 503)
check('والمجهول ٥٠٢ لا ٢٠٠ — لا نجاح افتراضي', httpStatusFor('who_knows') === 502)

console.log('\n⑥ الطرفية تصل ولا تقرّر — والبنية تُقرأ من المصدر')
const idx = readFileSync(resolve(ROOT, 'supabase/functions/qimmah-gateway/index.ts'), 'utf8')
// ⚠️ **الفحص الأهمّ في هذا الملف كلّه.**
check('⚔️ الطرفية تمرّر ترويسة المتصل — الهويّة تبقى `auth.uid()`',
  /global:\s*\{\s*headers:\s*\{\s*Authorization:\s*authHeader/.test(idx))
check('⚔️ ولا تمرّر معرّف مستخدم في أي وسيط RPC — لا سلطة هوية ثانية',
  !/p_user_id|p_uid|p_email\s*:/.test(idx))
check('ومفتاح الخدمة يُستعمل للحارس وحده لا للطفرة',
  idx.indexOf('serviceKey') > 0 && idx.indexOf('serviceKey') < idx.indexOf('stamped'))
check('والحارس يُنادى **قبل** التمرير', idx.indexOf('gate_admit') < idx.indexOf('.rpc(parsed.rpc'))
check('وعطلُ الحارس لا يفتح الباب', /admitErr[\s\S]{0,220}return json\('failed'/.test(idx))
check('وغيابُ العنوان لا يفتح الباب', /!ip\.ok[\s\S]{0,220}return json\('no_client_ip'/.test(idx))
check('والختم يُرسل بالاسم المُعلَن', idx.includes('[STAMP_HEADER]: stamp') && STAMP_HEADER === 'x-qimmah-gate')
// ⟲ محاكاة الالتفاف: نقلُ الحارس بعد التمرير يجب أن يُسقط الفحص أعلاه.
const reordered = idx.replace("'gate_admit'", "'zz_removed_guard'")
check('⟲ ونزعُ الحارس يُسقط فحص الترتيب — فالفحص قادر على الرسوب',
  reordered.indexOf('gate_admit') === -1
  && !(reordered.indexOf('gate_admit') > -1 && reordered.indexOf('gate_admit') < reordered.indexOf('.rpc(parsed.rpc')))

console.log('\n⑦ الإعلان — الحدّ مكتوب حيث يُقرأ')
const contract = readFileSync(resolve(ROOT, 'supabase/functions/qimmah-gateway/contract.mjs'), 'utf8')
check('العقد يعلن أن هذه طبقةٌ في العمق لا حصن', /دفاعٌ في العمق|طبقة الثانية|لا بديلٌ عنها/.test(contract))
check('ويعلن أن ترويسة العنوان لم تُثبَت عندنا', /لم يُثبَت/.test(contract) && /يحتاج نشرًا فعليًّا/.test(contract))
check('والطرفية تعلن أن المتصفّح يستطيع تخطّيها', /يستطيع\*\* تخطّي هذه|تخطّي هذه/.test(idx))

console.log('\n──────────────────────────────────────────────────────────────')
console.log('⚠️ حدّ هذا الطقم المعلَن: يثبت **المنطق** لا **النشر**. أن تُسلّم')
console.log('   Supabase ترويسةَ عنوانٍ موثوقة لطرفية منشورة — غير مُثبَت هنا،')
console.log('   ويحتاج نشرًا فعليًّا ونداءً من شبكتين. مُصنَّف EXTERNAL_BLOCKED.')
console.log(`\n${fails.length === 0 ? '✅' : '❌'} عقد البوّابة: ${pass} فحصًا · ${fails.length} فشل`)
if (fails.length) { fails.forEach((f) => console.log(`   • ${f}`)); process.exit(1) }
