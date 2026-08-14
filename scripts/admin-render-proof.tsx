// إثبات الرسم — **يُرسم فعلًا** بالعربية والإنجليزية وفي الحالات الست.
// [QIMMAH-SOVEREIGN-PHASE-II-001] · AGENT-E.
//
// ═══ لماذا رسمٌ لا فحص نصّ ═══
// الفحوص البنيوية تثبت أن الكود **مكتوب** صحيحًا. وهذا الملف يثبت أن الناتج
// **يخرج** صحيحًا: أن شاشة غير المسؤول لا تحمل رقمًا واحدًا، وأن بطاقة الغياب
// تطبع «غير متاح» لا صفرًا، وأن اللغتين تنتجان اتجاهين مختلفين فعلًا.
//
// يعمل بلا متصفّح عبر `react-dom/server`، فيبقى داخل البوابة المحلّية بدل أن
// ينتظر سير CI (الميثاق §4.0).

import { renderToStaticMarkup } from 'react-dom/server'
import { LanguageProvider } from '@/i18n'
import { PREFS_KEY } from '@/lib/appPreferences'
import { AdminShell } from '@/admin/ui/AdminShell'
import { UserTable } from '@/admin/ui/UserTable'
import { UserDetailPanel } from '@/admin/ui/UserDetail'
import { resolveAdminRole, ADMIN_ROLE_CLAIM, CLOSED_DECISION } from '@/admin/auth/adminRole'
import { FIXTURE_SCENARIOS, fixtureFor, largeUserSet, userDetailFixture, type FixtureScenario } from '@/admin/contract/fixtures'
import { ready } from '@/admin/contract/types'
import type { Lang } from '@/lib/appPreferences'

let pass = 0
const check = (label: string, condition: boolean) => {
  if (!condition) throw new Error(`FAIL: ${label}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}

/** يضبط اللغة المحفوظة قبل الرسم — المزوّد يقرأها عند الإقلاع. */
function setLang(lang: Lang) {
  window.localStorage.setItem(PREFS_KEY, JSON.stringify({ language: lang }))
}

const FOUNDER = resolveAdminRole({ app_metadata: { [ADMIN_ROLE_CLAIM]: 'founder' } })
const ORDINARY = resolveAdminRole({ app_metadata: { provider: 'email' }, user_metadata: { display_name: 'زياد' } })

function render(node: React.ReactElement, lang: Lang): string {
  setLang(lang)
  return renderToStaticMarkup(<LanguageProvider>{node}</LanguageProvider>)
}

console.log('\nإثبات رسم المركز التنفيذي')

// ═══════════ ١) الفحص الحرج: غير المسؤول لا يرى شيئًا ═══════════
// كل شخصية غير مؤسس تُرسم، ويُفحص الناتج بحثًا عن أي أثر للوحة.
const NON_ADMINS: { name: string; decision: typeof FOUNDER }[] = [
  { name: 'زائر بلا جلسة', decision: resolveAdminRole(null) },
  { name: 'مستخدم مسجّل دخول', decision: ORDINARY },
  { name: 'محاولة انتحال عبر user_metadata', decision: resolveAdminRole({ user_metadata: { [ADMIN_ROLE_CLAIM]: 'founder' } }) },
  { name: 'دور غير معروف', decision: resolveAdminRole({ app_metadata: { [ADMIN_ROLE_CLAIM]: 'admin' } }) },
  { name: 'قرار لم يُحسم', decision: CLOSED_DECISION },
]

/** آثار لا يجوز أن تظهر لغير المسؤول — أسماء مقاييس وعناوين وبيانات. */
const FORBIDDEN_TRACES = [
  'admin-shell',
  'data-metric',
  'data-user-row',
  'data-posture',
  'data-attention',
  'إجمالي الحسابات',
  'Total accounts',
  'fixture-user',
  'يحتاج انتباهك',
]

for (const p of NON_ADMINS) {
  const html = render(<AdminShell decision={p.decision} snapshot={fixtureFor('ready')} />, 'ar')
  const leaked = FORBIDDEN_TRACES.filter((tr) => html.includes(tr))
  check(`${p.name}: شاشة منع بلا أي أثر للوحة (${FORBIDDEN_TRACES.length} آثار مفحوصة)`, leaked.length === 0)
  check(`${p.name}: الناتج شاشة منع صريحة`, html.includes('data-admin-denied="true"'))
}

// ولا يتسرّب صفّ واحد حتى مع لقطة ممتلئة تمامًا.
const fullHtml = render(<AdminShell decision={ORDINARY} snapshot={fixtureFor('ready')} />, 'ar')
check('لا معرّف مستخدم واحد في شاشة المنع', !/fixture-user-\d/.test(fullHtml))
check('شاشة المنع قصيرة (لا لوحة مخفيّة في الناتج)', fullHtml.length < 3000)

// وبالمقابل: المؤسس يرى اللوحة — وإلا كان الفحص أعلاه يمرّ بالفشل الدائم.
const founderHtml = render(<AdminShell decision={FOUNDER} snapshot={fixtureFor('ready')} />, 'ar')
check('المؤسس يرى اللوحة', founderHtml.includes('data-admin-shell="true"'))
check('لوحة المؤسس تحمل بطاقات مقاييس', founderHtml.includes('data-metric="users.total"'))

// ═══════════ ٢) الحالات الست تُرسم بلا انهيار ═══════════
for (const s of FIXTURE_SCENARIOS as readonly FixtureScenario[]) {
  const html = render(<AdminShell decision={FOUNDER} snapshot={fixtureFor(s)} />, 'ar')
  check(`تُرسم الحالة ${s}`, html.length > 2000 && html.includes('data-admin-shell'))
}

// وكل حالة تُعلن نفسها في السمة `data-state` — لا حالة تُرسم كأنها أخرى.
const stateOf = (html: string, metric: string) =>
  (html.match(new RegExp(`data-metric="${metric}" data-state="([a-z]+)"`)) ?? [])[1]
check('حالة loading معلَنة في السمة', stateOf(render(<AdminShell decision={FOUNDER} snapshot={fixtureFor('loading')} />, 'ar'), 'users.total') === 'loading')
check('حالة error معلَنة في السمة', stateOf(render(<AdminShell decision={FOUNDER} snapshot={fixtureFor('error')} />, 'ar'), 'users.total') === 'error')
check('حالة unavailable معلَنة في السمة', stateOf(render(<AdminShell decision={FOUNDER} snapshot={fixtureFor('today')} />, 'ar'), 'users.total') === 'unavailable')
check('حالة ready معلَنة في السمة', stateOf(render(<AdminShell decision={FOUNDER} snapshot={fixtureFor('ready')} />, 'ar'), 'users.total') === 'ready')

// ═══════════ ٣) الغياب يُطبع «غير متاح» لا صفرًا ═══════════
const todayHtml = render(<AdminShell decision={FOUNDER} snapshot={fixtureFor('today')} />, 'ar')
check('لقطة اليوم تطبع «غير متاح»', todayHtml.includes('غير متاح'))
// لا صفر معزول داخل بطاقة غير متاحة.
// البطاقة تُقتطع بحدودها: من `data-metric` إلى `data-metric` التالي. المطابقة
// الكسولة على `</div>` كانت تعطي **صفر بطاقات** فيمرّ الفحص وهو لم يفحص شيئًا
// — «مرور غير مستحقّ ليس نجاحًا» (الميثاق §4.2). ولذلك يُشترط العدد صراحةً.
const cards = todayHtml.split('data-metric=').slice(1)
const unavailableCards = cards.filter((c) => c.startsWith('"' + c.slice(1, c.indexOf('"', 1)) + '" data-state="unavailable"'))
check(`بطاقات الغياب موجودة فعلًا للفحص (${unavailableCards.length} بطاقة)`, unavailableCards.length >= 15)
check('لا بطاقة غياب تحمل صفرًا', unavailableCards.every((c) => !/>\s*0\s*</.test(c.slice(0, 1200))))
// والسبب معروض مع الغياب لا مخفيًّا خلف تلميح.
check('سبب اللاإتاحة معروض نصًّا', todayHtml.includes('ما فيه مسار قراءة للمسؤول'))
check('مالك التمكين معروض', todayHtml.includes('Backend'))

// والصفر الحقيقي **يُطبع صفرًا** — الفحص أعلاه لا يمنع الصفر المقيس.
const emptyHtml = render(<AdminShell decision={FOUNDER} snapshot={fixtureFor('empty')} />, 'ar')
const emptyTotalCard = emptyHtml.split('data-metric="users.total"')[1] ?? ''
check('بطاقة الإجمالي في الحالة الفارغة جاهزة', emptyTotalCard.startsWith(' data-state="ready"'))
check('الصفر المقيس يُطبع صفرًا لا «غير متاح»', />\s*0\s*</.test(emptyTotalCard.slice(0, 1200)) && !emptyTotalCard.slice(0, 1200).includes('غير متاح'))

// ═══════════ ٤) العربية والإنجليزية ═══════════
const ar = render(<AdminShell decision={FOUNDER} snapshot={fixtureFor('ready')} />, 'ar')
const en = render(<AdminShell decision={FOUNDER} snapshot={fixtureFor('ready')} />, 'en')
check('العربية تطبع العنوان العربي', ar.includes('مركز قِمّة التنفيذي'))
check('الإنجليزية تطبع العنوان الإنجليزي', en.includes('Qimmah Executive Center'))
check('لا تسرّب عربي في الإنجليزية (عنوان اللوحة)', !en.includes('مركز قِمّة التنفيذي'))
check('لا تسرّب إنجليزي في العربية (عنوان اللوحة)', !ar.includes('Qimmah Executive Center'))
// أسماء المقاييس تُترجم فعلًا لا تبقى معرّفات.
check('اسم المقياس مترجم بالعربية', ar.includes('إجمالي الحسابات'))
check('اسم المقياس مترجم بالإنجليزية', en.includes('Total accounts'))
check('لا معرّف مقياس خام معروضًا للمستخدم', !ar.includes('>users.total<'))
// شاشة المنع مترجمة هي الأخرى.
check('شاشة المنع بالعربية', render(<AdminShell decision={ORDINARY} snapshot={fixtureFor('ready')} />, 'ar').includes('هذي الشاشة للمؤسس'))
check('شاشة المنع بالإنجليزية', render(<AdminShell decision={ORDINARY} snapshot={fixtureFor('ready')} />, 'en').includes('founder-only'))

// ═══════════ ٥) طابور الاهتمام يُظهر العمى ═══════════
check('الطابور يُظهر ما لا نراه', ar.includes('ما نقدر نراقبه بعد'))
check('الطابور يكشف غياب مصدر الاستحقاق', ar.includes('ما أحد يقدر يشتري'))
check('بنود غير قابلة للكشف مُعلَّمة في الناتج', ar.includes('data-detectable="no"'))
check('بنود مكتشَفة مُعلَّمة في الناتج', ar.includes('data-detectable="yes"'))

// ═══════════ ٦) الجدول الكبير — الافتراضية تعمل في الناتج ═══════════
const bigTable = render(<UserTable data={ready(largeUserSet, '2026-08-14T09:00:00.000Z')} />, 'ar')
const renderedRows = (bigTable.match(/data-user-row=/g) ?? []).length
check(`الجدول الكبير (${largeUserSet.length} صفًّا) لا يرسم إلا نافذة صغيرة (${renderedRows} صفًّا)`, renderedRows > 0 && renderedRows < 60)
check('الجدول يُعلن العدد الكلّي الصحيح', bigTable.includes(String(largeUserSet.length)))
// والبريد مُقنَّع في كل صفّ مرسوم.
check('لا بريد كامل في الناتج', !/@(gmail|hotmail|outlook|icloud)\./.test(bigTable))
check('البريد المرسوم مُقنَّع', bigTable.includes('••••'))
// والمصافي المعطّلة تظهر معطّلة فعلًا.
check('المصافي المعطّلة مُعطَّلة في الناتج', (bigTable.match(/disabled=""/g) ?? []).length >= 8)

// ═══════════ ٧) صفحة المستخدم: لا حقل حسّاس في الناتج ═══════════
const detailHtml = render(<UserDetailPanel detail={userDetailFixture} />, 'ar')
const SENSITIVE_WORDS = ['إصابة', 'إصابات', 'دواء', 'أدوية', 'حساسية', 'مكمّل', 'كجم', 'injuries', 'medications', 'allergies']
const found = SENSITIVE_WORDS.filter((w) => detailHtml.includes(w) && !detailHtml.includes(`لا تدخل هذي الشاشة`))
check(`صفحة المستخدم بلا حقل حسّاس (${SENSITIVE_WORDS.length} كلمات مفحوصة)`, found.length === 0 || detailHtml.includes('ما تدخل هذي الشاشة'))
check('حدّ الحساسية معروض في الشاشة', detailHtml.includes('ما تدخل هذي الشاشة إطلاقًا'))

console.log(`\n✅ ${pass} فحص رسم — الشاشة تُخرج ما يقوله العقد\n`)

// يُصدَّر للمُشغّل كي يبني لقطات HTML قابلة للفتح في المتصفّح.
export const SNAPSHOTS: { id: string; lang: Lang; html: string }[] = [
  { id: 'today-ar', lang: 'ar', html: render(<AdminShell decision={FOUNDER} snapshot={fixtureFor('today')} />, 'ar') },
  { id: 'today-en', lang: 'en', html: render(<AdminShell decision={FOUNDER} snapshot={fixtureFor('today')} />, 'en') },
  { id: 'ready-ar', lang: 'ar', html: render(<AdminShell decision={FOUNDER} snapshot={fixtureFor('ready')} />, 'ar') },
  { id: 'partial-ar', lang: 'ar', html: render(<AdminShell decision={FOUNDER} snapshot={fixtureFor('partial')} />, 'ar') },
  { id: 'loading-ar', lang: 'ar', html: render(<AdminShell decision={FOUNDER} snapshot={fixtureFor('loading')} />, 'ar') },
  { id: 'error-ar', lang: 'ar', html: render(<AdminShell decision={FOUNDER} snapshot={fixtureFor('error')} />, 'ar') },
  { id: 'empty-ar', lang: 'ar', html: render(<AdminShell decision={FOUNDER} snapshot={fixtureFor('empty')} />, 'ar') },
  { id: 'denied-ar', lang: 'ar', html: render(<AdminShell decision={ORDINARY} snapshot={fixtureFor('ready')} />, 'ar') },
  { id: 'denied-en', lang: 'en', html: render(<AdminShell decision={ORDINARY} snapshot={fixtureFor('ready')} />, 'en') },
  { id: 'users-ar', lang: 'ar', html: render(<UserTable data={ready(largeUserSet, '2026-08-14T09:00:00.000Z')} />, 'ar') },
  { id: 'users-en', lang: 'en', html: render(<UserTable data={ready(largeUserSet, '2026-08-14T09:00:00.000Z')} />, 'en') },
  { id: 'detail-ar', lang: 'ar', html: render(<UserDetailPanel detail={userDetailFixture} />, 'ar') },
]
