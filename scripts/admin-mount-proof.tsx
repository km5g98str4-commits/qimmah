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
import { loadLiveExecutiveSnapshot, loadLiveUserPage } from '@/admin/contract/liveSource'
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
  activity: { signedIn7d: 418, signedIn30d: 769, dormant30d: 515 },
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

  console.log(`\n✅ ${pass} فحصًا — التركيب والقراءة الحيّة صادقان\n`)
}

main().catch((e) => {
  console.error(String((e as Error).message ?? e))
  process.exitCode = 1
})
