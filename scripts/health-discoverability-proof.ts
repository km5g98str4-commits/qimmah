// إثبات اكتشافية «صحتي من Apple» (Q18).
//
// يغطّي: الحالات الأربع، الصدق (لا ادّعاء رفض)، الطلب المجمّع الواحد، القراءة فقط،
// التوطين بلغتين، وعقد الوصول (VoiceOver).
import { deriveHealthLinkState, type HealthLinkInputs, type HealthLinkStatus } from '@/lib/health/linkState'
import { healthStatusCopy, healthStrings } from '@/i18n/dict/health'
import { ALL_HEALTH_METRICS, HEALTH_WRITE_TYPES } from '@/lib/health/metrics'
import type { MetricDataState } from '@/lib/health/connect'
import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'

declare const __SRC_ROOT__: string

let pass = 0
const fails: string[] = []
const check = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ✓ ${label}`) }
  else { fails.push(`${label}${detail ? ' — ' + detail : ''}`); console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`) }
}
const src = (p: string) => readFileSync(resolvePath(__SRC_ROOT__, p), 'utf8')

const rows = (spec: [boolean, MetricDataState][]) => spec.map(([enabled, dataState]) => ({ enabled, dataState }))
const N = ALL_HEALTH_METRICS.length

console.log('════════ إثبات اكتشافية «صحتي من Apple» — قِمّة ════════')

// ─────────────────────────────────────────── ① الحالات الأربع
console.log('\n① الحالات الأربع')
{
  const cases: { name: string; input: HealthLinkInputs; expect: HealthLinkStatus }[] = [
    {
      name: 'غير متاح — منصّة غير مدعومة (ويب/أندرويد)',
      input: { available: false, requested: false, requestedAt: null, rows: rows([[true, 'has-data']]) },
      expect: 'unavailable',
    },
    {
      name: 'غير مربوط — متاح ولم يُطلب بعد',
      input: { available: true, requested: false, requestedAt: null, rows: rows([[false, 'not-connected'], [false, 'not-connected']]) },
      expect: 'not-connected',
    },
    {
      name: 'يحتاج مراجعة — اكتمل الطلب ولا بيانات',
      input: { available: true, requested: true, requestedAt: '2026-07-26T00:00:00.000Z', rows: rows([[true, 'unknown-or-denied'], [true, 'unknown-or-denied']]) },
      expect: 'needs-review',
    },
    {
      name: 'مربوط — اكتمل الطلب ووصلت بيانات',
      input: { available: true, requested: true, requestedAt: '2026-07-26T00:00:00.000Z', rows: rows([[true, 'has-data'], [true, 'unknown-or-denied']]) },
      expect: 'connected',
    },
  ]
  for (const c of cases) {
    const got = deriveHealthLinkState(c.input).status
    check(`${c.name} ⇒ «${c.expect}»`, got === c.expect, `got ${got}`)
  }

  // حالات حدّية
  check(
    'غير متاح يتجاوز أي حالة محفوظة (لا يدّعي ربطًا على جهاز غير مدعوم)',
    deriveHealthLinkState({ available: false, requested: true, requestedAt: 'x', rows: rows([[true, 'has-data']]) }).status === 'unavailable',
  )
  check(
    'فصل كل المقاييس بعد الطلب ⇒ «يحتاج مراجعة» لا «مربوط»',
    deriveHealthLinkState({ available: true, requested: true, requestedAt: 'x', rows: rows([[false, 'not-connected'], [false, 'not-connected']]) }).status === 'needs-review',
  )
  check(
    'مقياس فيه بيانات لكنه مفصول لا يُحتسب «مربوط»',
    deriveHealthLinkState({ available: true, requested: true, requestedAt: 'x', rows: rows([[false, 'has-data']]) }).status === 'needs-review',
  )
  const counted = deriveHealthLinkState({ available: true, requested: true, requestedAt: 'x', rows: rows([[true, 'has-data'], [true, 'has-data'], [true, 'unknown-or-denied'], [false, 'not-connected']]) })
  check('العدّادات دقيقة (بيانات=2، مفعّل=3، إجمالي=4)', counted.withDataCount === 2 && counted.enabledCount === 3 && counted.totalCount === 4,
    `${counted.withDataCount}/${counted.enabledCount}/${counted.totalCount}`)
  check('غير المتاح يصفّر العدّادات', deriveHealthLinkState({ available: false, requested: true, requestedAt: 'x', rows: rows([[true, 'has-data']]) }).withDataCount === 0)
}

// ─────────────────────────────────────────── ② الصدق: لا ادّعاء رفض
console.log('\n② الصدق — iOS لا يكشف رفض القراءة')
{
  const banAr = [/مرفوض/, /رفضت?\b/, /ممنوع/, /محظور/]
  const banEn = [/\bdenied\b/i, /\brejected\b/i, /\bblocked\b/i, /\brefused\b/i]
  for (const lang of ['ar', 'en'] as const) {
    const s = healthStrings[lang]
    const all: string[] = [
      s.title, s.cardIntro, s.statusNotConnected, s.statusNeedsReview, s.statusConnected, s.statusUnavailable,
      s.bodyNotConnected, s.bodyNeedsReview, s.bodyConnected(3, 28), s.bodyUnavailable,
      s.ctaConnect, s.ctaManage, s.ctaBusy, s.ctaConnectA11y, s.ctaManageA11y,
      s.readOnlyTitle, s.readOnlyBody, s.howToTitle, ...s.howToSteps,
      s.metricsTitle, s.metricsHint, s.metricHasData, s.metricNoData, s.metricOff,
      s.errorTitle, s.errorBody, s.announceRequested, s.requestedAtLabel('X'),
    ]
    const bans = lang === 'ar' ? banAr : banEn
    const hits = all.filter((x) => bans.some((b) => b.test(x)))
    check(`[${lang}] لا كلمة «مرفوض/denied» في أي نص (${all.length} نصًّا)`, hits.length === 0, hits.slice(0, 2).join(' | '))
    check(`[${lang}] كل النصوص غير فارغة`, all.every((x) => x.trim().length > 0))
  }
  // متن «يحتاج مراجعة» يجب أن يعترف صراحةً بأننا لا نعرف السبب
  check('العربية تقول صراحةً إن iOS لا يخبرنا', /ما يخبرنا|لا يخبرنا/.test(healthStrings.ar.bodyNeedsReview))
  check('الإنجليزية تقول صراحةً إن iOS لا يخبرنا', /does not tell us/i.test(healthStrings.en.bodyNeedsReview))
  // لا حالة خامسة في النوع
  const lsSrc = src('src/lib/health/linkState.ts')
  check("النوع يعرّف أربع حالات فقط", (lsSrc.match(/'unavailable' \| 'not-connected' \| 'needs-review' \| 'connected'/g) || []).length === 1)
  check("لا حالة 'denied' في طبقة الحالة", !/'denied'/.test(lsSrc))
}

// ─────────────────────────────────────────── ③ الطلب المجمّع الواحد
console.log('\n③ الطلب المجمّع — مرّة واحدة لكل الأنواع')
{
  const card = src('src/components/health/HealthLinkCard.tsx')
  const page = src('src/views/HealthLinkView.tsx')
  const connect = src('src/lib/health/connect.ts')

  check('البطاقة تستدعي الطلب المجمّع', /requestAllHealthAccess\(\)/.test(card))
  check('الصفحة تستدعي الطلب المجمّع', /requestAllHealthAccess\(\)/.test(page))
  // لا مسار طلب لكل مقياس من واجهة Q18
  for (const [name, s] of [['البطاقة', card], ['الصفحة', page]] as const) {
    check(`${name}: لا استدعاء تفويض لكل مقياس`, !/requestAuthorization|connectHealthKit|connectHealthWeight|connectHeartRate/.test(s))
  }
  check('الطلب المجمّع يمرّر كل المقاييس المدعومة في نداء واحد', /requestAuthorization\(\{ metrics: \[\.\.\.metrics\] \}\)/.test(connect))
  check('نداء التفويض يحدث مرّة واحدة في الطلب المجمّع', (connect.match(/bridge\.requestAuthorization\(/g) || []).length === 1)
  check(`الكتالوج يحوي ${N} مقياسًا وكلها ضمن الطلب`, N >= 20 && /ALL_HEALTH_METRICS\.filter/.test(connect))

  // بعد الطلب **يجب** أن تُسحب أول دفعة. بدونها يبقى العدّاد صفرًا فتقول الواجهة
  // «يحتاج مراجعة» للأبد حتى مع صلاحيات ممنوحة — ادّعاء غير صحيح عن حالة المستخدم.
  for (const [name, s] of [['البطاقة', card], ['الصفحة', page]] as const) {
    check(`${name}: تسحب أول دفعة بعد نجاح الطلب`, /await syncAllEnabled\(\)/.test(s))
    check(`${name}: لا تسحب عند فشل الطلب`, /status !== 'error'/.test(s) || /status === 'error'[\s\S]{0,160}return/.test(s))
    // السحب داخل try/catch: فشله لا يُبطل الطلب الذي اكتمل فعلًا.
    check(`${name}: فشل السحب لا يُسقط التدفّق`, /try \{\s*\n\s*await syncAllEnabled\(\)\s*\n\s*\} catch \{/.test(s))
  }
  check('السحب قراءة صرفة لا يفتح ورقة تفويض', !/requestAuthorization/.test(connect.slice(connect.indexOf('export async function syncAllEnabled'))))
}

// ─────────────────────────────────────────── ④ القراءة فقط
console.log('\n④ القراءة فقط — لا كتابة إلى HealthKit')
{
  check('قائمة أنواع الكتابة فارغة', HEALTH_WRITE_TYPES.length === 0, `${HEALTH_WRITE_TYPES.length}`)
  const card = src('src/components/health/HealthLinkCard.tsx')
  const page = src('src/views/HealthLinkView.tsx')
  for (const [name, s] of [['البطاقة', card], ['الصفحة', page]] as const) {
    check(`${name}: لا استدعاء كتابة/حفظ إلى HealthKit`, !/\bsave(Quantity|Sample|Workout)|writeToHealth|HKSave/i.test(s))
  }
  check('نصّ «قراءة فقط» معروض في الصفحة', /readOnlyTitle/.test(page) && /readOnlyBody/.test(page))
}

// ─────────────────────────────────────────── ⑤ الاكتشافية والتنقّل
console.log('\n⑤ الاكتشافية — أعلى الإعدادات وصفحة واحدة للتفاصيل')
{
  const settings = src('src/views/SettingsView.tsx')
  const routes = src('src/lib/appRoutes.ts')
  const app = src('src/App.tsx')

  check('الإعدادات تركّب البطاقة', /<HealthLinkCard /.test(settings))
  // البطاقة قبل مجموعة الحساب = أعلى القائمة
  const idxCard = settings.indexOf('<HealthLinkCard')
  const idxAccount = settings.indexOf('groupAccount')
  check('البطاقة أعلى الإعدادات (قبل مجموعة الحساب)', idxCard > 0 && idxCard < idxAccount, `${idxCard} < ${idxAccount}`)
  check("مسار 'health' مُعرَّف", /\| 'health'/.test(routes) && /'health',/.test(routes))
  check('التطبيق يعرض صفحة الربط', /view === 'health'/.test(app) && /HealthLinkView/.test(app))
  check('صفحة الربط تتطلّب حسابًا (حراسة المسار)', /route === 'health' \|\|/.test(app))
  check('البطاقة تفتح الصفحة عبر onOpenDetails', /onOpenDetails=\{\(\) => onNavigate\('health'\)\}/.test(settings))
  // التفاصيل المتقدّمة في الصفحة لا في الإعدادات
  const page = src('src/views/HealthLinkView.tsx')
  check('خطوات تعديل الصلاحيات داخل الصفحة', /howToSteps/.test(page))
  check('قائمة الأنواع داخل الصفحة', /healthConnectionSummary\(\)/.test(page))
  check('الإعدادات لا تعرض قائمة الأنواع', !/healthConnectionSummary/.test(settings))
}

// ─────────────────────────────────────────── ⑥ زرّ أساسي واحد
console.log('\n⑥ زرّ أساسي واحد لكل حالة')
{
  const card = src('src/components/health/HealthLinkCard.tsx')
  check('زرّ أساسي واحد فقط في البطاقة', (card.match(/btn-primary/g) || []).length === 1)
  check('نصّه «اربط صحتي» قبل الطلب و«إدارة الربط» بعده', /manage \? s\.ctaManage : s\.ctaConnect/.test(card))
  check('«إدارة الربط» مشروط باكتمال الطلب', /const manage = snap\.hasRequested/.test(card))
  check('لا زرّ في حالة «غير متاح»', /const showCta = snap\.status !== 'unavailable'/.test(card))
  // hasRequested يعكس الطلب فعلًا
  check('hasRequested=false قبل الطلب', deriveHealthLinkState({ available: true, requested: false, requestedAt: null, rows: [] }).hasRequested === false)
  check('hasRequested=true بعده', deriveHealthLinkState({ available: true, requested: true, requestedAt: 'x', rows: [] }).hasRequested === true)
}

// ─────────────────────────────────────────── ⑦ التوطين + VoiceOver
console.log('\n⑦ التوطين وقارئ الشاشة')
{
  const ARABIC = new RegExp('[\\u0600-\\u06FF\\uFB50-\\uFEFF]')
  const en = healthStrings.en
  const enAll = [en.title, en.cardIntro, en.statusNotConnected, en.statusNeedsReview, en.statusConnected, en.statusUnavailable,
    en.bodyNotConnected, en.bodyNeedsReview, en.bodyConnected(1, 2), en.bodyUnavailable, en.ctaConnect, en.ctaManage, en.ctaBusy,
    en.ctaConnectA11y, en.ctaManageA11y, en.readOnlyTitle, en.readOnlyBody, en.howToTitle, ...en.howToSteps,
    en.metricsTitle, en.metricsHint, en.metricHasData, en.metricNoData, en.metricOff, en.errorTitle, en.errorBody, en.announceRequested]
  const leaked = enAll.filter((x) => ARABIC.test(x))
  check('لا حرف عربي في النصوص الإنجليزية', leaked.length === 0, leaked.slice(0, 2).join(' | '))
  check('لكل حالة نصّ في اللغتين', (['unavailable', 'not-connected', 'needs-review', 'connected'] as const).every((st) =>
    healthStatusCopy(healthStrings.ar, st, 1, 2).label.length > 0 && healthStatusCopy(healthStrings.en, st, 1, 2).label.length > 0))
  check('العنوان الإنجليزي «Apple Health»', en.title === 'Apple Health')
  check('العنوان العربي «صحتي من Apple»', healthStrings.ar.title === 'صحتي من Apple')
  check('نفس عدد خطوات الشرح في اللغتين', healthStrings.ar.howToSteps.length === en.howToSteps.length)

  const card = src('src/components/health/HealthLinkCard.tsx')
  const page = src('src/views/HealthLinkView.tsx')
  check('للزرّ الأساسي وصف VoiceOver يشرح ما سيحدث', /aria-label=\{manage \? s\.ctaManageA11y : s\.ctaConnectA11y\}/.test(card))
  check('الحالة نصّ مقروء لا لون فقط', /\{copy\.label\}/.test(card))
  check('الأيقونات مخفيّة عن القارئ الصوتي', (card.match(/aria-hidden="true"/g) || []).length >= 3)
  check('منطقة إعلان مؤدَّبة بعد الطلب', /role="status"[\s\S]{0,40}aria-live="polite"/.test(card))
  check('خطأ الفتح يُعلَن كتنبيه', /role="alert"/.test(card) && /role="alert"/.test(page))
  check('البطاقة قسم معنون', /aria-labelledby="health-link-title"/.test(card))
  check('أقسام الصفحة معنونة', (page.match(/aria-labelledby="health-/g) || []).length >= 4)
  check('زر الرجوع له وصف', /aria-label=\{s\.pageBack\}/.test(page))
  check('مساحة لمس ≥44px للزرّ الأساسي', (card.match(/min-h-\[44px\]/g) || []).length >= 1 && /min-h-\[44px\]/.test(page))
  check('الصفحة تحمل هدف تخطّي المحتوى', /id="main-content"/.test(page))
}

// ─────────────────────────────────────────── ⑧ التشخيص: بيانات وصفية فقط
console.log('\n⑧ التشخيص — لا قيم صحية')
{
  const diag = src('src/lib/health/diagnostics.ts')
  // الحقول المسموحة كلها أعداد/حالات — لا حقل قيمة
  check('لا حقل قيمة في تقرير التشخيص', !/\bvalue\b\s*:/.test(diag.slice(diag.indexOf('export interface HealthMetricDiagnostics'), diag.indexOf('}', diag.indexOf('export interface HealthMetricDiagnostics')))))
  check('التقرير يحمل عدّادات وحالات فقط', /sampleCount/.test(diag) && /hasData/.test(diag) && /lastStatus/.test(diag))
  const card = src('src/components/health/HealthLinkCard.tsx')
  const page = src('src/views/HealthLinkView.tsx')
  check('واجهة Q18 لا تعرض أي قيمة صحية', !/samples\[0\]|\.value|latestValue/.test(card + page))
}

console.log(`\n${fails.length === 0 ? '✅' : '❌'} إثبات اكتشافية الصحة: ${pass} نجح · ${fails.length} فشل`)
if (fails.length > 0) {
  console.log('\nالإخفاقات:')
  fails.forEach((f) => console.log('  • ' + f))
  process.exit(1)
}
