// ============================================================================
// test:admin-mount — إثبات نقطة التركيب وطبقة القراءة الحيّة.
// [OVERNIGHT-ADMIN] · AGENT-E.
// ============================================================================
// يجيب أربعة أسئلة **بالتشغيل** لا بقراءة الكود:
//   ١) هل يمنح المسار وحده شيئًا؟ (يُرسم `AdminRoute` بأربع شخصيات)
//   ٢) هل يتحوّل غياب حقل في رد الخادم إلى صفر في أي مسار؟
//   ٣) هل يبقى المقياس **بلا مصدر** غائبًا حتى حين يجيب الخادم بنجاح؟
//   ٤) هل يُسمّى كل فشل بدل أن يُبتلع؟
//
// يُشغَّل عبر `scripts/run-admin-mount-proof.mjs` الذي:
//   • يبدّل `@/lib/supabaseClient` و`@/lib/authContext` بجذعين يتحكّم بهما،
//   • ثم **يهاجم** كل فحص هنا بحقنة تُسقطه باسمه (الميثاق §4.2).
// ============================================================================

import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { LanguageProvider } from '@/i18n'
import { PREFS_KEY } from '@/lib/appPreferences'
import type { Lang } from '@/lib/appPreferences'
import { AdminRoute } from '@/admin/ui/AdminRoute'
import { AdminShell } from '@/admin/ui/AdminShell'
import { ADMIN_ROLE_CLAIM, resolveAdminRole } from '@/admin/auth/adminRole'
import {
  issueAccessCode,
  issueAccessCodeBatch,
  loadCodeBatches,
  loadCodeRedemptions,
  loadLiveCodePage,
  loadLiveExecutiveSnapshot,
  loadLiveUserDetail,
  loadLiveUserPage,
  loadPendingOrders,
  revokeUserAccess,
  setAccessCodeEnabled,
} from '@/admin/contract/liveSource'
import type { MetricValue } from '@/admin/contract/types'

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8')

let pass = 0
const check = (label: string, condition: boolean) => {
  if (!condition) throw new Error(`FAIL: ${label}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}

type RpcHandler = (name: string, args?: unknown) => Promise<{ data: unknown; error: unknown }>
declare global {
  // eslint-disable-next-line no-var
  var __RPC__: RpcHandler
  // eslint-disable-next-line no-var
  var __RPC_CALLS__: string[]
  // eslint-disable-next-line no-var
  var __AUTH__: { user: unknown; loading: boolean }
  // eslint-disable-next-line no-var
  var __SB_CONFIGURED__: boolean
  // eslint-disable-next-line no-var
  var __SB_CLIENT_CALLS__: number
}

function setRpc(fn: RpcHandler) {
  globalThis.__RPC_CALLS__ = []
  globalThis.__SB_CLIENT_CALLS__ = 0
  globalThis.__RPC__ = (name, args) => {
    globalThis.__RPC_CALLS__.push(name)
    return fn(name, args)
  }
}
const ok = (data: unknown): RpcHandler => async () => ({ data, error: null })
const fail = (error: unknown): RpcHandler => async () => ({ data: null, error })

const FOUNDER = resolveAdminRole({ app_metadata: { [ADMIN_ROLE_CLAIM]: 'founder' } })
const NORMAL = resolveAdminRole({ app_metadata: { provider: 'email' } })

/** حمولة خادم صحيحة — الشكل الذي تُرجعه `founder_executive_snapshot()`. */
const AS_OF = '2026-08-16T00:00:00.000Z'
const PAYLOAD = {
  as_of: AS_OF,
  users: { total: 1284, newToday: 7, new7d: 41, new30d: 160, verified: 900, growthSeries: [{ date: '2026-08-15', value: 3 }] },
  activity: { signedInToday: 12, signedIn7d: 418, signedIn30d: 769, dormant30d: 515 },
  entitlement: { premiumActive: 188, trialActive: 24, trialExpired: 61, previewOnly: 1072, revokedActive: 3 },
  commerce: { ordersSeen: 241, ordersPaid: 188, ordersFailed: 9, codesIssued: 500, codesRedeemed: 213, codesUnused: 287 },
}

// الجسم داخل `main()`: صيغة الإخراج CJS (يفرضها `react-dom/server`) لا تقبل
// `await` في المستوى الأعلى. والالتقاط في النهاية يطبع `FAIL: …` كما هو، فيبقى
// السقوط **مسمّى** لمن يقرأ المخرجات — وهو ما يعتمد عليه مُشغّل المحاكاة.
async function main() {
console.log('\nإثبات التركيب والقراءة الحيّة — المركز التنفيذي')

// ═══════════════ ١) المسار وحده لا يمنح شيئًا ═══════════════
function render(node: React.ReactElement, lang: Lang = 'ar'): string {
  window.localStorage.setItem(PREFS_KEY, JSON.stringify({ language: lang }))
  return renderToStaticMarkup(<LanguageProvider>{node}</LanguageProvider>)
}

/** آثار لا يجوز أن تظهر لغير المؤسس. */
const TRACES = ['data-admin-shell', 'data-metric', 'data-user-row', 'data-posture', 'data-live-state']

const PERSONAS: { name: string; auth: { user: unknown; loading: boolean } }[] = [
  { name: 'زائر بلا جلسة', auth: { user: null, loading: false } },
  { name: 'أثناء استعادة الجلسة', auth: { user: null, loading: true } },
  { name: 'مستخدم مسجّل عادي', auth: { user: { id: 'u1', app_metadata: { provider: 'email' } }, loading: false } },
  {
    name: 'منتحل عبر user_metadata',
    auth: { user: { id: 'u2', app_metadata: {}, user_metadata: { [ADMIN_ROLE_CLAIM]: 'founder' } }, loading: false },
  },
  { name: 'دور غير معروف', auth: { user: { id: 'u3', app_metadata: { [ADMIN_ROLE_CLAIM]: 'admin' } }, loading: false } },
]

for (const p of PERSONAS) {
  globalThis.__AUTH__ = p.auth
  setRpc(ok(PAYLOAD))
  const html = render(<AdminRoute />)
  check(`${p.name}: شاشة منع بلا أي أثر للوحة`, TRACES.every((t) => !html.includes(t)))
  check(`${p.name}: الناتج شاشة منع صريحة`, html.includes('data-admin-denied'))
  // ⚠️ **ولا نداء واحد يُرسَل** — المسار لا يُطلق طلبًا قبل حسم الدور.
  check(`${p.name}: لا نداء خادم إطلاقًا`, globalThis.__RPC_CALLS__.length === 0)
  check(`${p.name}: لا طلب عميل خادم أصلًا`, globalThis.__SB_CLIENT_CALLS__ === 0)
  check(`${p.name}: لا رقم في الناتج`, !/>\s*\d{2,}\s*</.test(html))
}

// المؤسس **قبل وصول البيانات** يرى انتظارًا لا أرقامًا.
globalThis.__AUTH__ = { user: { id: 'f1', app_metadata: { [ADMIN_ROLE_CLAIM]: 'founder' } }, loading: false }
const founderHtml = render(<AdminRoute />)
check('المؤسس قبل البيانات يرى انتظارًا لا لوحة', founderHtml.includes('data-admin-loading'))
check('شاشة الانتظار بلا رقم واحد', !/>\s*\d+\s*</.test(founderHtml))

// ═══════════════ ٢) غير المؤسس لا يصل الطبقة الحيّة أصلًا ═══════════════
setRpc(ok(PAYLOAD))
const denied = await loadLiveExecutiveSnapshot(NORMAL)
check('طلب غير مؤسس: لا نداء خادم', globalThis.__RPC_CALLS__.length === 0)
// ⚠️ **والعميل نفسه لا يُطلب**: «اجلب العميل ثم افحص الدور» التفافٌ لا يظهر في
// عدّاد الـRPC، ويُكشف هنا وحده.
check('طلب غير مؤسس: لا طلب لعميل الخادم', globalThis.__SB_CLIENT_CALLS__ === 0)
check('طلب غير مؤسس: الحالة not-founder', denied.live === 'not-founder')
check('طلب غير مؤسس: لا رقم واحد جاهز', denied.snapshot.users.total.state === 'unavailable')
setRpc(ok([]))
const deniedPage = await loadLiveUserPage(NORMAL)
check('صفحة غير مؤسس: لا نداء خادم', globalThis.__RPC_CALLS__.length === 0)
check('صفحة غير مؤسس: لا طلب لعميل الخادم', globalThis.__SB_CLIENT_CALLS__ === 0)
check('صفحة غير مؤسس: غير متاحة', deniedPage.page.state !== 'ready')

// ═══════════════ ٣) الفشل يُسمّى ولا يصير صفرًا ═══════════════
const FAILURES: { name: string; error: unknown; expect: string }[] = [
  { name: 'الدالة غير موجودة (الهجرة لم تُطبَّق)', error: { code: 'PGRST202', message: 'Could not find the function' }, expect: 'rpc-missing' },
  { name: 'القاعدة ترفض الدور', error: { code: '42501', message: 'founder_role_required' }, expect: 'denied-by-server' },
  { name: 'خطأ غير مصنّف', error: { code: 'XX000', message: 'boom' }, expect: 'failed' },
]
for (const f of FAILURES) {
  setRpc(fail(f.error))
  const r = await loadLiveExecutiveSnapshot(FOUNDER)
  check(`${f.name} ⇒ ${f.expect}`, r.live === f.expect)
  const all: MetricValue<unknown>[] = [
    r.snapshot.users.total,
    r.snapshot.users.newToday,
    r.snapshot.activity.signedIn7d,
    r.snapshot.entitlement.premiumActive,
    r.snapshot.commerce.ordersPaid,
    r.snapshot.commerce.codesIssued,
  ]
  check(`${f.name}: لا رقم واحد يُخترع`, all.every((m) => m.state === 'unavailable'))
}

// نداء ينهار تمامًا (شبكة) — لا يُبتلع ولا يُصفَّر.
setRpc(async () => {
  throw new Error('network down')
})
const thrown = await loadLiveExecutiveSnapshot(FOUNDER)
check('انهيار النداء ⇒ failed لا صفر', thrown.live === 'failed' && thrown.snapshot.users.total.state === 'unavailable')

// رد بلا لحظة قياس **يُرفض بالكامل** — قيمة بلا `asOf` تبدو حيّة وقد تكون بايتة.
setRpc(ok({ users: { total: 999 } }))
const noAsOf = await loadLiveExecutiveSnapshot(FOUNDER)
check('رد بلا asOf يُرفض كلّه', noAsOf.live === 'failed' && noAsOf.snapshot.users.total.state === 'unavailable')

// ═══════════════ ٤) النجاح: الأرقام تمرّ، والغياب يبقى غيابًا ═══════════════
setRpc(ok(PAYLOAD))
const live = await loadLiveExecutiveSnapshot(FOUNDER)
check('نجاح ⇒ الحالة live', live.live === 'live')
check('إجمالي الحسابات وصل', live.snapshot.users.total.state === 'ready' && live.snapshot.users.total.value === 1284)
check('لحظة القياس من الخادم لا من المتصفّح', live.snapshot.users.total.state === 'ready' && live.snapshot.users.total.asOf === AS_OF)
// [ADMIN-CONV] «دخلوا اليوم» يمرّ حين يرسله الخادم.
check('signedInToday يصل حيًّا', live.snapshot.activity.signedInToday.state === 'ready' && live.snapshot.activity.signedInToday.value === 12)
check('التجارة وصلت', live.snapshot.commerce.ordersPaid.state === 'ready' && live.snapshot.commerce.ordersPaid.value === 188)
check('نسبة التحوّل مشتقّة لا مخترعة', live.snapshot.entitlement.conversionOfAccounts.state === 'ready')

// ⚠️ **جوهر الإثبات**: ما لا مصدر له يبقى غائبًا **حتى في رد ناجح**.
const SOURCELESS: [string, MetricValue<unknown>][] = [
  ['commerce.redemptionFailures24h', live.snapshot.commerce.redemptionFailures24h],
  ['errors.clientErrors24h', live.snapshot.errors.clientErrors24h],
  ['errors.rpcFailures24h', live.snapshot.errors.rpcFailures24h],
  ['entitlement.activationFailed24h', live.snapshot.entitlement.activationFailed24h],
  ['onboarding.completionRate', live.snapshot.onboarding.completionRate],
  ['activity.workoutsCompleted7d', live.snapshot.activity.workoutsCompleted7d],
]
for (const [id, m] of SOURCELESS) {
  check(`${id} يبقى غير متاح في رد ناجح`, m.state === 'unavailable')
}

// وحتى لو **حشا الخادم** مفتاحًا بهذا الاسم، لا يُقرأ: لا مصدر يعني لا مصدر.
setRpc(ok({ ...PAYLOAD, commerce: { ...PAYLOAD.commerce, redemptionFailures24h: 42 } }))
const injected = await loadLiveExecutiveSnapshot(FOUNDER)
check('مفتاح محشوّ بلا مصدر لا يُقرأ', injected.snapshot.commerce.redemptionFailures24h.state === 'unavailable')

// حقل ناقص في رد ناجح ⇒ **غياب لا صفر**.
setRpc(ok({ as_of: AS_OF, users: { total: 10 }, entitlement: {}, commerce: {}, activity: {} }))
const partial = await loadLiveExecutiveSnapshot(FOUNDER)
check('حقل ناقص ⇒ غياب لا صفر', partial.snapshot.users.newToday.state === 'unavailable')
check('كتلة ناقصة ⇒ غياب لا صفر', partial.snapshot.commerce.ordersPaid.state === 'unavailable')
// [ADMIN-CONV] ردّ هجرةٍ أقدم لا يحمل المفتاح الجديد — **غياب نوعًا لا صفر**.
check('signedInToday ناقص ⇒ غياب لا صفر', partial.snapshot.activity.signedInToday.state === 'unavailable')
check('الحقل الموجود بجانب الناقص يمرّ', partial.snapshot.users.total.state === 'ready')

// قيم غير عددية ⇒ غياب.
setRpc(ok({ as_of: AS_OF, users: { total: '1284', newToday: null, new7d: NaN }, entitlement: {}, commerce: {}, activity: {} }))
const junk = await loadLiveExecutiveSnapshot(FOUNDER)
check('نصّ بدل عدد ⇒ غياب', junk.snapshot.users.total.state === 'unavailable')
check('null ⇒ غياب', junk.snapshot.users.newToday.state === 'unavailable')
check('NaN ⇒ غياب', junk.snapshot.users.new7d.state === 'unavailable')

// ⚠️ **والصفر المقيس يبقى صفرًا** — الشرط المعاكس، وبدونه يصير الحارس رقابة على الحقيقة.
setRpc(ok({ ...PAYLOAD, users: { ...PAYLOAD.users, newToday: 0 } }))
const zero = await loadLiveExecutiveSnapshot(FOUNDER)
check('الصفر المقيس يمرّ صفرًا', zero.snapshot.users.newToday.state === 'ready' && zero.snapshot.users.newToday.value === 0)

// ═══════════════ ٥) صفحة الجدول ═══════════════
const ROW = {
  user_id: '11111111-1111-1111-1111-111111111111',
  display_name: 'زياد',
  email_masked: 'z••••@example.com',
  created_at: '2026-08-01T00:00:00.000Z',
  last_sign_in_at: null,
  entitlement: 'premium',
  onboarding: 'unknown',
  total_rows: 1,
}
setRpc(ok([ROW]))
const page = await loadLiveUserPage(FOUNDER, { search: 'زياد', page: 1, pageSize: 25 })
check('صفحة الجدول تصل', page.live === 'live' && page.page.state === 'ready')
check('البريد يصل مُقنَّعًا', page.page.state === 'ready' && (page.page.value.rows[0].emailMasked ?? '').includes('••••'))
check('العدد الكلّي من الخادم', page.page.state === 'ready' && page.page.value.total === 1)
setRpc(ok([{ ...ROW, entitlement: 'GOD_MODE' }]))
const weird = await loadLiveUserPage(FOUNDER)
check('قيمة استحقاق مجهولة تصير unknown لا تُخترع', weird.page.state === 'ready' && weird.page.value.rows[0].entitlement === 'unknown')
setRpc(ok([{ nonsense: true }]))
const broken = await loadLiveUserPage(FOUNDER)
check('صفّ مشوّه يُسقط الصفحة كلّها لا نصفها', broken.live === 'failed' && broken.page.state !== 'ready')

// ═══════════════ ٦) الشاشة تطبع «غير متاح» لا صفرًا ═══════════════
setRpc(fail({ code: 'PGRST202', message: 'Could not find the function' }))
const blocked = await loadLiveExecutiveSnapshot(FOUNDER)
const blockedHtml = render(<AdminShell decision={FOUNDER} snapshot={blocked.snapshot} live={blocked.live} />)
check('الشاشة تعلن حالة القراءة باسمها', blockedHtml.includes('data-live-state="rpc-missing"'))
check('الشاشة تطبع «غير متاح»', blockedHtml.includes('غير متاح'))
const cards = blockedHtml.split('data-metric=').slice(1)
const gapCards = cards.filter((c) => c.includes('data-state="unavailable"'))
check(`بطاقات الغياب موجودة للفحص (${gapCards.length})`, gapCards.length >= 20)
check('لا بطاقة غياب تحمل صفرًا', gapCards.every((c) => !/>\s*0\s*</.test(c.slice(0, 1400))))
// أقسام الشاشة الستّة معروضة — قسمٌ محذوف يُقرأ «لا شيء هنا» لا «لا نقيس».
// الفحص على `data-section` لا على النصّ: النصّ قد يظهر صدفةً في سبب أو تسمية.
for (const id of ['growth', 'entitlement', 'commerce', 'funnel', 'errors', 'product']) {
  check(`قسم «${id}» معروض ولو كان فارغًا`, blockedHtml.includes(`data-section="${id}"`))
}
check('قسم الأخطاء يحمل بطاقتيه', blockedHtml.includes('data-metric="errors.clientErrors24h"') && blockedHtml.includes('data-metric="errors.rpcFailures24h"'))

// وبالإنجليزية الشاشة تنقلب كاملة.
const enHtml = render(<AdminShell decision={FOUNDER} snapshot={blocked.snapshot} live={blocked.live} />, 'en')
check('الشاشة بالإنجليزية', enHtml.includes('Unavailable') && enHtml.includes('Orders and codes'))
check('لا نصّ عربي متسرّب في الإنجليزية', !enHtml.includes('غير متاح'))

// ═══════════════ ٧) بنيوي: لا مسار التفاف في نقطة التركيب ═══════════════
const routeCode = read('src/admin/ui/AdminRoute.tsx')
const guardIdx = routeCode.indexOf('if (!allowed) return <AdminDenied')
check('نقطة التركيب تحمل الحارس', guardIdx > 0)
check('الحارس يسبق رسم القشرة', guardIdx < routeCode.indexOf('<AdminShell'))
for (const bad of ['localStorage', 'sessionStorage', 'document.cookie', 'URLSearchParams', 'import.meta.env']) {
  check(`نقطة التركيب لا تقرأ ${bad}`, !routeCode.includes(bad))
}
check('نقطة التركيب مُصدَّرة من الباب الرئيسي', read('src/admin/index.ts').includes("export { AdminRoute }"))

// ═══════════════ ٨) القرّاء الجدد [ADMIN-R4]: تفصيل · أكواد · كتابة ═══════════════
// ⚠️ **الغياب هنا أخطر منه في اللقطة**: صفحةٌ فارغة تُقرأ «حساب بلا نشاط»،
// وقائمة أكواد فارغة تُقرأ «ما أصدرنا شيئًا». فالفشل يجب أن يُسمّى دائمًا.

// ٨-أ) غير المؤسس لا يصل الشبكة أصلًا — في القرّاء الأربعة.
type Decision = typeof FOUNDER
const NEW_READERS: [string, (d: Decision) => Promise<{ live: string }>][] = [
  ['تفصيل الحساب', (d) => loadLiveUserDetail(d, 'u1')],
  ['قائمة الأكواد', (d) => loadLiveCodePage(d)],
  ['إصدار كود', async (d) => {
    const r = await issueAccessCode(d, { reason: 'x', durationDays: 14, maxRedemptions: 1 })
    return { live: r.ok ? 'live' : r.live }
  }],
  ['تعطيل كود', async (d) => {
    const r = await setAccessCodeEnabled(d, 'c1', false, 'x')
    return { live: r.ok ? 'live' : r.live }
  }],
  ['سحب وصول', async (d) => {
    const r = await revokeUserAccess(d, 'u1', 'x')
    return { live: r.ok ? 'live' : r.live }
  }],
  // [ADMIN-CONV] القرّاء والكاتب الجدد — نفس عقد «لا نداء قبل حسم الدور».
  ['سجلّ المستبدلين', async (d) => {
    const r = await loadCodeRedemptions(d, 'c1')
    return { live: r.ok ? 'live' : r.live }
  }],
  ['حملات الأكواد', async (d) => {
    const r = await loadCodeBatches(d)
    return { live: r.ok ? 'live' : r.live }
  }],
  ['الطلبات المعلّقة', async (d) => {
    const r = await loadPendingOrders(d)
    return { live: r.ok ? 'live' : r.live }
  }],
  ['إصدار دفعة', async (d) => {
    const r = await issueAccessCodeBatch(d, { reason: 'x', durationDays: 14, maxRedemptions: 1, expiresAt: null, count: 3 })
    return { live: r.ok ? 'live' : r.live }
  }],
]
for (const [label, run] of NEW_READERS) {
  setRpc(ok({}))
  const r = await run(NORMAL)
  check(`${label}: غير المؤسس ⇒ not-founder بلا نداء`, r.live === 'not-founder' && globalThis.__RPC_CALLS__.length === 0)
  check(`${label}: ولا طلب لعميل الخادم`, globalThis.__SB_CLIENT_CALLS__ === 0)
}

// ٨-ب) **بلا خادم مضبوط: حالة مسمّاة لا فراغ** — بشخصية المؤسس، وإلا مُنع قبله.
globalThis.__SB_CONFIGURED__ = false
for (const [label, run] of NEW_READERS) {
  setRpc(ok({}))
  const r = await run(FOUNDER)
  check(`${label}: بلا خادم ⇒ no-backend مسمّاة`, r.live === 'no-backend')
}
const codesNoBackend = await loadLiveCodePage(FOUNDER)
check('قائمة الأكواد بلا خادم غير متاحة — لا قائمة فارغة تبدو جوابًا', codesNoBackend.page.state === 'unavailable')
globalThis.__SB_CONFIGURED__ = true

// ٨-ج) الدالة غير موجودة (الهجرة لم تُطبَّق) ⇒ rpc-missing لا فراغ.
setRpc(fail({ code: 'PGRST202', message: 'Could not find the function' }))
const detailMissing = await loadLiveUserDetail(FOUNDER, 'u1')
check('تفصيل الحساب: الهجرة غير مطبَّقة ⇒ rpc-missing', detailMissing.live === 'rpc-missing' && detailMissing.detail === null)
setRpc(fail({ code: '42501', message: 'founder_role_required' }))
const codesDenied = await loadLiveCodePage(FOUNDER)
check('قائمة الأكواد: منع الخادم ⇒ denied-by-server', codesDenied.live === 'denied-by-server')
setRpc(fail({ code: '42501', message: 'founder_role_required' }))
const issueDenied = await issueAccessCode(FOUNDER, { reason: 'x', durationDays: 14, maxRedemptions: 1 })
check('الإصدار: منع الخادم يُسمّى ولا يُبتلع', !issueDenied.ok && issueDenied.live === 'denied-by-server')

// ٨-د) ═══ [COMMERCE-W1-HARDENING] صكّ الشراء لا يُعمي لوحة الأكواد ═══
// صكوك الشراء دائمة، فـ`duration_days = NULL`. وكان مُحوّل الصفوف يشترط رقمًا،
// وردُّ صفٍّ واحد يُسقط **الصفحة كلّها** — فأوّل صكّ يُصدره المؤسس كان يُطفئ
// اللوحة ومعها زرّ التعطيل، وهو مِفتاح الإطفاء الوحيد داخل المنتج لصكٍّ انكشف.
// (والصفحة مرتّبة بالأحدث، فالصكّ الجديد يقع في أوّل صفحة تُحمَّل دائمًا.)
const codeRow = (over: Record<string, unknown>) => ({
  code_id: '11111111-1111-4111-8111-111111111111', label: 'SPECIAL-1', status: 'issued',
  duration_days: 14, max_redemptions: 1, redemption_count: 0,
  starts_at: '2026-08-30T00:00:00Z', expires_at: null, created_by: 'founder:x',
  created_reason: 'proof', created_at: '2026-08-30T00:00:00Z', total_rows: 2, ...over,
})
setRpc(ok([
  codeRow({}),
  codeRow({ code_id: '22222222-2222-4222-8222-222222222222', label: 'SALLA-LAUNCH-001',
            duration_days: null, grant_purpose: 'purchase' }),
]))
const mixedPage = await loadLiveCodePage(FOUNDER)
check('صفحة فيها صكّ شراء (مدّة NULL) تُقرأ حيّةً — لا تُطفأ اللوحة',
  mixedPage.live === 'live' && mixedPage.page.state === 'ready')
check('وصفّاها كلاهما حاضر — الشراء لا يُسقِط الموقوت معه',
  mixedPage.page.state === 'ready' && mixedPage.page.value.rows.length === 2)
check('ومدّة الصكّ الدائم تصل null لا رقمًا مخترعًا',
  mixedPage.page.state === 'ready' && mixedPage.page.value.rows[1].durationDays === null)
// ⚔️ التأكيد المضادّ: التشوّه **الحقيقي** ما زال يُسقط الصفحة — القبول توسّع
// بقدر الشكل المشروع لا أكثر، وإلّا لصار الحارس بابًا مفتوحًا.
setRpc(ok([codeRow({ duration_days: 'forever' })]))
const malformed = await loadLiveCodePage(FOUNDER)
check('⚔️ ومدّة نصّية ما زالت تُسقط الصفحة — لا نصف قائمة أكواد',
  malformed.live === 'failed' && malformed.page.state === 'unavailable')
setRpc(ok([codeRow({ max_redemptions: null })]))
const malformed2 = await loadLiveCodePage(FOUNDER)
check('⚔️ وحدّ استخدام NULL يُسقطها كذلك — الاستثناء للمدّة وحدها',
  malformed2.live === 'failed' && malformed2.page.state === 'unavailable')

// ٨-د) رد ناجح: الحقول تمرّ، وكتل المنتج **تبقى غائبة**.
const DETAIL_OK = {
  as_of: AS_OF,
  account: {
    user_id: 'u1', display_name: 'زياد', email_masked: 'z••••@x.com',
    email_verified: true, created_at: '2026-08-01T00:00:00Z', last_sign_in_at: null,
  },
  entitlement: { state: 'premiumActive', source: 'salla', activated_at: '2026-08-01T00:00:00Z', expires_at: null, revoked_at: null, revoked_reason: null },
  onboarding: 'unknown',
  commerce: {
    codesRedeemed: 0, purchases: 1, lastOrderId: 'O-1', lastPurchaseAt: '2026-08-01T00:00:00Z', accessRevoked: false,
    // [ADMIN-CONV] سجلّ الأكواد كما تعيده الهجرة الأحدث.
    codeHistory: [{ label: 'ramadan', redeemed_at: '2026-08-02T00:00:00Z', duration_days: 30 }],
  },
  foodSubmissions: [{ id: 'fs1', status: 'pending', product_name: 'تمر', submitted_at: '2026-08-10T00:00:00Z' }],
}
setRpc(ok(DETAIL_OK))
const detailLive = await loadLiveUserDetail(FOUNDER, 'u1')
check('تفصيل الحساب يصل حيًّا', detailLive.live === 'live' && detailLive.detail !== null)
const d = detailLive.detail!
check('حالة الاستحقاق وصلت', d.entitlementDetail.state.state === 'ready')
check('تاريخ انتهاء null **جواب** لا غياب', d.entitlementDetail.expiresAt.state === 'ready' && d.entitlementDetail.expiresAt.value === null)
check('البريد المُقنَّع وحده', (d.row.emailMasked ?? '').includes('••••'))
// ⚠️ **جوهر الفحص**: كتل المنتج غائبة حتى في رد ناجح.
for (const [id, m] of [
  ['planSummary', d.planSummary],
  ['workoutsCompleted', d.activity.workoutsCompleted],
  ['measurementEvents', d.activity.measurementEvents],
  ['recentWorkouts', d.recentWorkouts],
] as [string, MetricValue<unknown>][]) {
  check(`${id} يبقى غير متاح في رد ناجح`, m.state === 'unavailable')
}
// وحتى لو **حشا الخادم** كتلة منتج، لا تُقرأ: لا مصدر يعني لا مصدر.
setRpc(ok({ ...DETAIL_OK, activity: { workoutsCompleted: 42, measurementEvents: 7 }, planSummary: 'دفع/سحب' }))
const stuffed = await loadLiveUserDetail(FOUNDER, 'u1')
check('كتلة منتج محشوّة لا تُقرأ', stuffed.detail!.activity.workoutsCompleted.state === 'unavailable')
// ورد بلا كتلة حساب يُرفض كلّه.
setRpc(ok({ as_of: AS_OF, entitlement: {}, commerce: {} }))
const noAccount = await loadLiveUserDetail(FOUNDER, 'u1')
check('رد بلا كتلة حساب يُرفض كلّه', noAccount.live === 'failed' && noAccount.detail === null)

// ٨-د-٢) [ADMIN-CONV] سجلّ الأكواد وبلاغات الطعام في صفحة الحساب.
check('سجلّ الأكواد يصل جاهزًا من الرد الكامل',
  d.commerce.codeHistory.state === 'ready' && d.commerce.codeHistory.value.length === 1
    && d.commerce.codeHistory.value[0].label === 'ramadan' && d.commerce.codeHistory.value[0].durationDays === 30)
check('بلاغات الطعام تصل جاهزة من الرد الكامل',
  d.foodSubmissions.state === 'ready' && d.foodSubmissions.value.length === 1
    && d.foodSubmissions.value[0].status === 'pending' && d.foodSubmissions.value[0].productName === 'تمر')
// ردّ هجرةٍ أقدم **بلا المفتاحين** ⇒ الغياب نوعًا، لا مصفوفة فارغة تُقرأ «لا سجلّ».
{
  const oldPayload = { ...DETAIL_OK } as Record<string, unknown>
  delete oldPayload.foodSubmissions
  const oldCommerce = { ...DETAIL_OK.commerce } as Record<string, unknown>
  delete oldCommerce.codeHistory
  setRpc(ok({ ...oldPayload, commerce: oldCommerce }))
  const oldDetail = await loadLiveUserDetail(FOUNDER, 'u1')
  check('كتلة قديمة بلا سجلّ الأكواد ⇒ غياب نوعًا لا مصفوفة فارغة',
    oldDetail.detail !== null && oldDetail.detail.commerce.codeHistory.state === 'unavailable')
  check('كتلة قديمة بلا بلاغات الطعام ⇒ غياب نوعًا كذلك',
    oldDetail.detail !== null && oldDetail.detail.foodSubmissions.state === 'unavailable')
}
// صفّ سجلّ مشوّه (بلا وقت استهلاك) **يُسقط الكتلة كلّها** — لا نصف سجلّ.
setRpc(ok({ ...DETAIL_OK, commerce: { ...DETAIL_OK.commerce, codeHistory: [{ label: 'x' }] } }))
const brokenHistory = await loadLiveUserDetail(FOUNDER, 'u1')
check('صفّ سجلّ أكواد مشوّه يُسقط الكتلة كلّها',
  brokenHistory.detail !== null && brokenHistory.detail.commerce.codeHistory.state === 'unavailable')
// حالة بلاغ خارج القائمة لا تُخترع ولا تُطوى في pending.
setRpc(ok({ ...DETAIL_OK, foodSubmissions: [{ id: 'fs1', status: 'GOD_MODE', product_name: 'تمر', submitted_at: AS_OF }] }))
const weirdFood = await loadLiveUserDetail(FOUNDER, 'u1')
check('حالة بلاغ مجهولة تُسقط الكتلة لا تُخترع',
  weirdFood.detail !== null && weirdFood.detail.foodSubmissions.state === 'unavailable')

// ٨-هـ) صفحة الأكواد: حالة مجهولة تُسقط الصفحة، والخام لا يُقبل بلا نصّ.
const CODE_ROW = {
  code_id: 'c1', label: 'ramadan', status: 'issued', duration_days: 30, max_redemptions: 5,
  redemption_count: 1, starts_at: AS_OF, expires_at: null, created_by: 'founder:u1',
  created_reason: 'حملة', created_at: AS_OF, total_rows: 1,
}
setRpc(ok([CODE_ROW]))
const codes = await loadLiveCodePage(FOUNDER)
check('صفحة الأكواد تصل', codes.live === 'live' && codes.page.state === 'ready')
setRpc(ok([{ ...CODE_ROW, status: 'GOD_MODE' }]))
const weirdCode = await loadLiveCodePage(FOUNDER)
check('حالة كود مجهولة تُسقط الصفحة كلّها لا تُخترع', weirdCode.live === 'failed')
setRpc(ok({ id: 'c9' }))
const noPlain = await issueAccessCode(FOUNDER, { reason: 'x', durationDays: 14, maxRedemptions: 1 })
check('إصدار بلا نصّ كود ليس نجاحًا', !noPlain.ok)

// ═══════════════ ٩) [ADMIN-CONV] المستبدلون · الحملات · المعلّق · الدفعة ═══════════════
// ٩-أ) سجلّ المستبدلين: الفشل يُسمّى ولا يصير قائمة فارغة تُقرأ «ما استخدمه أحد».
setRpc(fail({ code: '42501', message: 'founder_role_required' }))
const redsDenied = await loadCodeRedemptions(FOUNDER, 'c1')
check('سجلّ المستبدلين: منع الخادم يُسمّى ولا يصير قائمة فارغة', !redsDenied.ok && redsDenied.live === 'denied-by-server')
setRpc(ok([{ redeemed_at: AS_OF, user_id: 'u9', masked_email: 'zi***@x.com' }]))
const redsLive = await loadCodeRedemptions(FOUNDER, 'c1')
check('سجلّ المستبدلين يصل بصفوفه', redsLive.ok && redsLive.rows.length === 1 && redsLive.rows[0].userId === 'u9')
check('بريد المستبدل مُقنَّع كما أرسله الخادم', redsLive.ok && (redsLive.rows[0].maskedEmail ?? '').includes('***@'))

// ٩-ب) الحملات: «الهجرة ما انطبقت» تتدهور بأدب إلى rpc-missing لا إلى فراغ.
setRpc(fail({ code: 'PGRST202', message: 'Could not find the function' }))
const batchesMissing = await loadCodeBatches(FOUNDER)
check('الحملات: الهجرة غير مطبَّقة ⇒ rpc-missing مسمّاة', !batchesMissing.ok && batchesMissing.live === 'rpc-missing')
setRpc(ok([{ label: 'ramadan', codes_issued: '5', codes_redeemed: 1, codes_remaining: 4, codes_disabled: 0, last_issued_at: AS_OF }]))
const batchesLive = await loadCodeBatches(FOUNDER)
check('الحملات تصل — وbigint النصّي يُقرأ عددًا', batchesLive.ok && batchesLive.rows[0].codesIssued === 5)
// عددٌ غائب في صفّ حملة يبقى null — **لا يصير «صفر أكواد»**.
setRpc(ok([{ label: 'x' }]))
const batchesSparse = await loadCodeBatches(FOUNDER)
check('عدد غائب في الحملة يبقى null لا صفرًا', batchesSparse.ok && batchesSparse.rows[0].codesIssued === null)

// ٩-ج) الطلبات المعلّقة — نفس عقد الفاشلة حرفيًّا.
setRpc(fail({ code: 'PGRST202', message: 'Could not find the function' }))
const pendingMissing = await loadPendingOrders(FOUNDER)
check('المعلّق: الهجرة غير مطبَّقة ⇒ rpc-missing', !pendingMissing.ok && pendingMissing.live === 'rpc-missing')
setRpc(ok([{ provider_order_id: 'O-9', classification: 'received', reason: null, received_at: AS_OF, amount_minor: 1999, currency: 'SAR', identity_ref: 'ab12cd34' }]))
const pendingLive = await loadPendingOrders(FOUNDER)
check('المعلّق يصل بصفوفه ومرجع الهوية مقصوص', pendingLive.ok && pendingLive.rows[0].providerOrderId === 'O-9' && pendingLive.rows[0].identityRef === 'ab12cd34')

// ٩-د) الدفعة: **ردّ بلا قائمة أكواد ليس نجاحًا** — النجاح هو ظهور الأكواد مرّة.
setRpc(ok({ label: 'x', count: 2, duration_days: 14, max_redemptions: 1, expires_at: null, codes: ['ABCDEFGHJKLMNPQ2', 'ABCDEFGHJKLMNPQ3'], issued_at: AS_OF }))
const batchOk = await issueAccessCodeBatch(FOUNDER, { reason: 'x', durationDays: 14, maxRedemptions: 1, expiresAt: null, count: 2 })
check('الدفعة تصل بأكوادها', batchOk.ok && batchOk.value.codes.length === 2)
setRpc(ok({ label: 'x', count: 2 }))
const batchNoCodes = await issueAccessCodeBatch(FOUNDER, { reason: 'x', durationDays: 14, maxRedemptions: 1, expiresAt: null, count: 2 })
check('دفعة بلا قائمة أكواد ليست نجاحًا', !batchNoCodes.ok)
setRpc(ok({ label: 'x', count: 2, codes: [] }))
const batchEmptyCodes = await issueAccessCodeBatch(FOUNDER, { reason: 'x', durationDays: 14, maxRedemptions: 1, expiresAt: null, count: 2 })
check('دفعة بأكواد صفر ليست نجاحًا — النجاح هو ظهور الأكواد', !batchEmptyCodes.ok)
setRpc(ok({ codes: ['GOOD5678JKLMNPQ2', 42] }))
const batchJunk = await issueAccessCodeBatch(FOUNDER, { reason: 'x', durationDays: 14, maxRedemptions: 1, expiresAt: null, count: 2 })
check('كودٌ غير نصّي في الدفعة يُسقطها كلّها', !batchJunk.ok)
setRpc(fail({ code: '42501', message: 'founder_role_required' }))
const batchDenied = await issueAccessCodeBatch(FOUNDER, { reason: 'x', durationDays: 14, maxRedemptions: 1, expiresAt: null, count: 2 })
check('الدفعة: منع الخادم يُسمّى ولا يُبتلع', !batchDenied.ok && batchDenied.live === 'denied-by-server')

  console.log(`\n✅ ${pass} فحصًا — التركيب والقراءة الحيّة صادقان\n`)
}

main().catch((e) => {
  console.error(String((e as Error).message ?? e))
  process.exitCode = 1
})
