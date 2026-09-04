// مُشغّل إثبات منظومة التتبّع المحلية (test:analytics) — [CTO-68] البند ٦.
//
// نصفان: فحوص مصدرية هنا (مواضع الالتقاط · خلوّ الطبقة من الشبكة · محاكاة التهريب)،
// ثم النصف التنفيذي في scripts/analytics-proof.ts فوق localStorage مُحاكى ومصائد شبكة.
//   الاستدعاء:  node scripts/run-analytics-proof.mjs

import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync, readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')

let pass = 0
const check = (label, condition) => {
  if (!condition) throw new Error(`FAIL: ${label}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}

/** كل ملفات المصدر (ts/tsx) تحت مسار. */
function walk(dir, out = []) {
  for (const name of readdirSync(resolve(root, dir))) {
    const rel = `${dir}/${name}`
    if (statSync(resolve(root, rel)).isDirectory()) walk(rel, out)
    else if (/\.tsx?$/.test(name)) out.push(rel)
  }
  return out
}

const registry = read('src/lib/tracking/registry.ts')
const trackingFiles = walk('src/lib/tracking')
// مواضع الالتقاط = كل المصدر عدا بنية الطبقة نفسها (السجلّ/المخزن/الواجهة).
// `signals.ts` **ليس** بنية: هو مُطلِق الإشارات المشتقّة، فيُحتسب موضع التقاط.
const INFRA = ['src/lib/tracking/registry.ts', 'src/lib/tracking/store.ts', 'src/lib/tracking/index.ts']
const appFiles = walk('src').filter((f) => !INFRA.includes(f))
const appSource = appFiles.map((f) => ({ file: f, text: read(f) }))

// ————————————————————————————————————————————————————————————————
console.log('\n① السجلّ مصدر حقيقة واحد')
const listBlock = registry.slice(registry.indexOf('export const TRACKED_EVENTS'), registry.indexOf('] as const'))
const names = [...listBlock.matchAll(/^\s*'([a-z0-9_]+)',$/gm)].map((m) => m[1])
check('السجلّ يعلن خمسة عشر اسمًا', names.length === 15)
check('الأسماء snake_case إنجليزية', names.every((n) => /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(n)))
// ملف سجل واحد: لا اتحاد أسماء ثانٍ داخل طبقة التتبّع.
const otherUnions = trackingFiles.filter((f) => f !== 'src/lib/tracking/registry.ts' && /^export const [A-Z_]+ = \[/m.test(read(f)))
check('لا قائمة أسماء ثانية داخل طبقة التتبّع (مصدر حقيقة واحد)', otherUnions.length === 0)

// ————————————————————————————————————————————————————————————————
console.log('\n② موضع التقاط حقيقي لكل حدث مبنيّ')
// نلتقط **حرفيّة المصفوفة** بعد `=` لا أول `]` في السطر: التعليق النوعي
// `readonly TrackedEventName[]` يحمل قوسًا مغلقًا قبلها ويقصّ الكتلة خطأً.
const awaitingLiteral = registry.match(/AWAITING_SURFACE[^=]*=\s*\[([^\]]*)\]/)?.[1] ?? ''
const awaiting = [...awaitingLiteral.matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1])
// العدد يتقلّص كلّما بُني سطح ([CTO-70] وصل «أول انتصار» ثم «ملخّص اليوم ٧»).
// فلا يُثبَّت رقم: المطلوب أن تبقى القائمة **متّسقة** — كل اسم فيها من السجلّ،
// والقاعدة ذات الاتجاهين أدناه هي الحارس الحقيقي لا العدّ.
check('قائمة «ينتظر سطحه» كلّها أسماء من السجلّ', awaiting.every((n) => names.includes(n)))

/** مواضع نداء trackLocal لهذا الاسم في كود المنتج (خارج طبقة التتبّع نفسها). */
const callSites = (name) =>
  appSource.filter(({ text }) => new RegExp(`trackLocal\\(\\s*'${name}'`).test(text)).map(({ file }) => file)

/**
 * الملفات القابلة للوصول فعلًا من مدخل التطبيق — مشي على رسم الاستيراد من `src/main.tsx`.
 *
 * لماذا هذا الفحص موجود: أول زرع لخمس نقاط التقاط وقع في `views/WorkoutV2.tsx`
 * و`views/NutritionV2.tsx`، وكلاهما **بلا مستورد** — كودٌ لا يُرسَم للمستخدم.
 * البوابة كانت خضراء («للحدث موضع نداء») والحدث لا يقع أبدًا. لم يكشفه إلا فحص
 * `dist/` بعد البناء. فالقاعدة الآن بنيوية: موضع الالتقاط يجب أن **يصل المستخدم**.
 */
function reachableFromEntry() {
  const seen = new Set()
  const stack = ['src/main.tsx']
  const resolveSpec = (spec, from) => {
    let base
    if (spec.startsWith('@/')) base = `src/${spec.slice(2)}`
    else if (spec.startsWith('.')) base = join(dirname(from), spec).replaceAll('\\', '/')
    else return null
    for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
      try { if (statSync(resolve(root, cand)).isFile()) return cand } catch { /* التالي */ }
    }
    return null
  }
  while (stack.length) {
    const file = stack.pop()
    if (seen.has(file)) continue
    seen.add(file)
    let text
    try { text = read(file) } catch { continue }
    // الاستيراد الساكن والكسول (import(...)) وإعادة التصدير — كلّها مسارات وصول حقيقية.
    for (const m of text.matchAll(/(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g)) {
      const next = resolveSpec(m[1], file)
      if (next) stack.push(next)
    }
  }
  return seen
}
const reachable = reachableFromEntry()
check('رسم الوصول مبنيّ من المدخل ويشمل مئات الملفات (لا مشي فاشل يمرّ صامتًا)', reachable.size > 100 && reachable.has('src/App.tsx'))
// تأكيد مضادّ (§4.2): الرسم يميّز الحيّ من الميّت فعلًا، لا يقول «الكل حيّ».
check('الرسم يستثني شاشة V2 اليتيمة المعروفة (تمييز حقيقي لا قبولٌ شامل)', !reachable.has('src/views/WorkoutV2.tsx') && !reachable.has('src/views/NutritionV2.tsx'))
check('ويشمل الشاشة V2 الموصولة فعلًا (لا يرفض الحيّ)', reachable.has('src/views/TodayV2.tsx'))

for (const name of names) {
  const sites = callSites(name)
  if (awaiting.includes(name)) {
    // القاعدة تعمل بالاتجاهين: المعلَّم «ينتظر سطحه» يجب ألّا يُنادى بعد.
    check(`«${name}» معلَّم ينتظر سطحه ولا موضع نداء له`, sites.length === 0)
  } else {
    check(`«${name}» له موضع التقاط في كود المنتج (${sites[0] ?? '—'})`, sites.length >= 1)
    // ولا يكفي وجوده: يجب أن يكون في ملف **يصل المستخدم**.
    const live = sites.filter((f) => reachable.has(f))
    check(`  └ وموضعه في كود حيّ يصل المستخدم (${live.join(' · ') || 'لا شيء'})`, live.length >= 1)
  }
}
// إشارتان مشتقّتان لا تُنادَيان مباشرة من الواجهة — يُغطّيهما مسارهما في signals.ts.
check('«next_day_opened» يُطلق من الإشارات لا من الواجهة', /trackLocal\('next_day_opened'/.test(read('src/lib/tracking/signals.ts')))
check('مُطلق الإشارة مربوط فعلًا بإقلاع التطبيق', /recordDayOpen\(\)/.test(read('src/App.tsx')))

// اقتران النصّ بالكود: الحدث ١١ يُسجَّل **بعد** كتابة الجلسة لا قبلها — فلا يُسجَّل
// إكمالٌ لجلسة لم تُكتب. (الشاشة الحيّة v1 تكتب عبر persistFinishedSession.)
const workout = read('src/views/WorkoutView.tsx')
// [CTO-71] البند ٢ حوّل الشاشة إلى المسار المتحقَّق، فالمرساة صارت `commit`.
// والشرط أقوى الآن: التسجيل بعد **نجاح** الكتابة لا بعد محاولتها.
const commitIdx = workout.indexOf('const commit = commitFinishedSession(session)')
const bailIdx = workout.indexOf("setSaveError(commit.failure ?? 'error')")
const completedIdx = workout.indexOf("trackLocal('workout_session_completed'")
check('إكمال التمرين يُسجَّل بعد نجاح الكتابة لا بعد محاولتها', commitIdx > 0 && bailIdx > commitIdx && completedIdx > bailIdx)
// وموضع القطع يُقرأ قبل المسح — بعده تضيع الحالة فيُسجَّل صفر كاذب.
const discardIdx = workout.indexOf('clearActiveWorkout(userId)')
const abandonIdx = workout.indexOf("trackLocal('workout_session_abandoned', { at: 'recovered-prompt'")
check('عدّ المجموعات عند القطع يُقرأ قبل المسح لا بعده', abandonIdx > 0 && abandonIdx < discardIdx)

// ————————————————————————————————————————————————————————————————
console.log('\n③ صفر endpoint — الطبقة خالية من بدائيات الشبكة')
const NET_PATTERNS = [
  ['fetch(', /\bfetch\s*\(/],
  ['sendBeacon', /sendBeacon/],
  ['XMLHttpRequest', /XMLHttpRequest/],
  ['WebSocket', /WebSocket/],
  ['EventSource', /EventSource/],
  ['navigator.connection/إرسال', /navigator\s*\.\s*send/],
  ['new Image()', /new\s+Image\s*\(/],
  ['import() لوحدة شبكة', /import\s*\(\s*['"]https?:/],
]
/**
 * يزيل التعليقات قبل الفحص — وإلا سقطت الملفات التي **توثّق** المنع بذكر البدائيات
 * الممنوعة في ترويستها (وهو ما حدث فعلًا عند أول تشغيل: ترويسة store.ts أسقطت نفسها).
 * الكود وحده يُفحص؛ والتعليق لا ينفّذ شيئًا فلا يُخفي تهريبًا.
 */
const stripComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')

/** يفحص نصًّا ويعيد أسماء البدائيات الموجودة — الفحص المسمّى الذي يسقط عنده التهريب. */
function networkPrimitivesIn(text) {
  const code = stripComments(text)
  return NET_PATTERNS.filter(([, re]) => re.test(code)).map(([label]) => label)
}
for (const file of trackingFiles) {
  const found = networkPrimitivesIn(read(file))
  check(`${file} خالٍ من بدائيات الشبكة${found.length ? ` — وُجد: ${found.join(', ')}` : ''}`, found.length === 0)
}
check('لا متغيّر بيئة endpoint في طبقة التتبّع', trackingFiles.every((f) => !/VITE_[A-Z_]*ENDPOINT|VITE_[A-Z_]*URL|VITE_[A-Z_]*DSN/.test(stripComments(read(f)))))
// [CTO-71] البند ١ — الغياب البنيوي: لا طبقة إرسال في المستودع أصلًا.
check('طبقة lib/analytics القادرة على الإرسال محذوفة بالكامل', !existsSync(resolve(root, 'src/lib/analytics')))
check('لا مزوّد HTTP ولا sendBeacon في أي مكان من المصدر', appSource.every(({ file, text }) => file.startsWith('src/lib/tracking') || !/sendBeacon|createHttpProvider/.test(stripComments(text))))
check('لا متغيّر VITE_ANALYTICS_ENDPOINT في المصدر ولا في أنواع البيئة', !/VITE_ANALYTICS_ENDPOINT/.test(read('src/vite-env.d.ts')) && appSource.every(({ text }) => !/VITE_ANALYTICS_ENDPOINT/.test(stripComments(text))))
check('لا مفتاح تحليلات ناجٍ في سجلّ المفاتيح ولا في قائمة السماح', !/qimmah:analytics/.test(read('src/lib/userDataKeys.ts')) && !/qimmah:analytics/.test(read('src/lib/accountScope.ts')))
check('لا مكتبة تحليلات خارجية في الاعتماديات', (() => {
  const pkg = JSON.parse(read('package.json'))
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).join(' ')
  return !/posthog|mixpanel|amplitude|segment|analytics\.js|plausible|firebase|ga-lite|gtag/i.test(deps)
})())
check('لا معرّف إعلاني في الطبقة', trackingFiles.every((f) => !/idfa|advertisingId|gaid|adid/i.test(read(f))))

// ————————————————————————————————————————————————————————————————
console.log('\n④ التأكيد المضادّ — محاكاة endpoint مهرَّب تسقط بفحص مسمّى (§4.2)')
// كل شدّ بوابة يُرفَق بمحاكاة التفافٍ تفشل **بفحص مسمّى** لا باستثناء تقني.
const clean = read('src/lib/tracking/index.ts')
check('المصدر السليم الحالي يمرّ (البوابة لا تصرخ على السليم)', networkPrimitivesIn(clean).length === 0)

const SMUGGLES = [
  ['fetch مباشر', `${clean}\nfetch('https://ingest.example.com', { method: 'POST' })`, 'fetch('],
  ['sendBeacon متخفٍّ داخل دالة', `${clean}\nfunction flush(b){ navigator.sendBeacon('https://x.example', b) }`, 'sendBeacon'],
  ['XHR قديم', `${clean}\nconst x = new XMLHttpRequest(); x.open('POST','https://x.example')`, 'XMLHttpRequest'],
  ['بكسل صورة (تسريب بلا fetch)', `${clean}\nnew Image().src = 'https://x.example/p.gif?e=' + name`, 'new Image()'],
  ['قناة WebSocket', `${clean}\nconst s = new WebSocket('wss://x.example')`, 'WebSocket'],
]
for (const [label, smuggled, expected] of SMUGGLES) {
  const found = networkPrimitivesIn(smuggled)
  check(`التفاف «${label}» يسقط بفحص مسمّى: ${expected}`, found.includes(expected))
}
// وسقوط غير مسمّى ليس إثباتًا: نتأكّد أن الفحص يعيد **اسم** البدائية لا مجرّد false.
check('السقوط مسمّى لا صامت (الفحص يعيد اسم البدائية)', networkPrimitivesIn(SMUGGLES[0][1])[0] === 'fetch(')
// ومحاكاة endpoint مهرَّب عبر متغيّر بيئة تُكشف كذلك.
check('تهريب endpoint عبر متغيّر بيئة يُكشف', /VITE_[A-Z_]*ENDPOINT/.test(`${clean}\nconst e = import.meta.env.VITE_TRACKING_ENDPOINT`))

// ————————————————————————————————————————————————————————————————
console.log('\n⑤ العارض للمطوّر فقط — لا سطح مستخدم')
const index = read('src/lib/tracking/index.ts')
const viewer = index.slice(index.indexOf('export function initTrackingDevViewer'))
check('العارض يعود مبكرًا خارج التطوير', /if\s*\(!import\.meta\.env\.DEV\)\s*return/.test(viewer))
check('الطباعة الفورية محكومة بالتطوير أيضًا', /function devLog[\s\S]{0,200}?if\s*\(!import\.meta\.env\.DEV\)\s*return/.test(index))
check('لا مكوّن واجهة ولا مسار للعارض', !/tsx|AppRoute|<div/.test(viewer))
check('لا مدخل للعارض من أي شاشة', appSource.every(({ file, text }) => file === 'src/main.tsx' || !/initTrackingDevViewer|__qimmahEvents/.test(text)))

// ————————————————————————————————————————————————————————————————
console.log('\n⑥ التسجيل في سجلّي المفاتيح والنقل')
const keys = read('src/lib/userDataKeys.ts')
const keyLine = keys.split('\n').find((l) => l.includes("'qimmah:tracking:events:v1'")) ?? ''
check('المفتاح مسجّل في سجلّ المفاتيح المركزي', keyLine.length > 0)
check('مصنّف بيانات مستخدم (فيُمسح مع بياناته) لا تفضيل جهاز', /kind:\s*'user'/.test(keyLine))
check('موسوم بالمالك بنيويًا', /scoped:\s*true/.test(keyLine))
check('داخل التصدير', /exported:\s*true/.test(keyLine))
check('خارج المزامنة قطعًا (لا وجهة سحابية)', /synced:\s*false/.test(keyLine))
// اقتران حاسم: خارج قائمة السماح العامّة ⇒ wipeUserData يمسحه. لو أُدرج فيها لنجا من المسح.
check('ليس في قائمة السماح العامّة في accountScope (وإلا نجا من المسح)', !read('src/lib/accountScope.ts').includes('qimmah:tracking:events:v1'))
check('مسجّل في allowlist النقل', read('src/lib/portability/registry.ts').includes("id: 'trackingEvents'"))

// ————————————————————————————————————————————————————————————————
console.log('\n⑦-أ حزمة الأسبوع الأول ([CTO-70]) — الأسطح الجديدة حيّة ومحايدة')
// التعليقات تُزال قبل فحص النبرة: ترويسة القاموس **توثّق** المنع بذكر الكلمات
// الممنوعة (streak/لوم)، فتُسقط نفسها. نفس درس ترويسة store.ts في [CTO-68].
const firstWeekDict = stripComments(read('src/i18n/dict/firstWeek.ts'))
// ترتيب ملخّص اليوم السابع **إلزامي** (Q-212): السلوك ← التحصين ← الوزن ← الحساب.
const weekScreen = stripComments(read('src/components/today/WeekSummaryScreen.tsx'))
const order = ['weekBehaviourHeading', 'weekScaleBody', 'weekWeightHeading', 'weekAccountBody'].map((k) => weekScreen.indexOf(k))
check('ترتيب ملخّص اليوم ٧: السلوك ← تحصين الميزان ← الوزن ← الحساب', order.every((i) => i > 0) && order.every((v, i) => i === 0 || v > order[i - 1]))
check('تحصين الميزان يسبق الوزن نصًّا لا ترتيبًا فقط', weekScreen.indexOf('weekScaleBody') < weekScreen.indexOf('weekWeightLine'))
// عرض الحساب بالصياغة الموقّعة — لا وعد حفظ/استعادة والمزامنة مطفأة.
check('عرض الحساب لا يعد بحفظ أو استعادة (المزامنة مطفأة)', /أول ما تنزل المزامنة/.test(firstWeekDict) && !/نحفظ لك|نسترجع|احفظ بياناتك|back ?up your data|restore/i.test(firstWeekDict))
// لا لوم ولا streak ولا أحمر في أي حالة فوات.
const missedCard = stripComments(read('src/components/today/MissedDayCard.tsx'))
check('بطاقة اليوم الفائت بلا أحمر', !/text-danger|bg-danger|--c-danger|#(e|f)[0-9a-f]{2}[0-3][0-9a-f]{3}/i.test(missedCard))
check('ولا streak في نصوص الحزمة', !/streak|سلسلة أيام|يومًا متتاليًا/i.test(firstWeekDict))
check('ولا لوم/تهويل في نصوص الحزمة', !/فشلت|خسرت|ضاع|للأسف|you failed|you lost/i.test(firstWeekDict))
check('ولا تكديس علامات تعجّب', !/!!|؟!/.test(firstWeekDict))
// النبرة عامية بيضاء — علامات محكيّة حاضرة في العربية.
check('النبرة عامية بيضاء (علامات محكيّة حاضرة)', ['وش', 'تقدر', 'خلّ', 'بكرة'].some((w) => firstWeekDict.includes(w)))
check('كل نصّ جديد بلغتيه (قاموس واحد يحمل ar وen)', /const AR: FirstWeekStrings/.test(firstWeekDict) && /const EN: FirstWeekStrings/.test(firstWeekDict))
// الأسطح الأربعة داخل رسم الوصول — الحارس البنيوي يفرضه تلقائيًا.
for (const surface of ['src/components/today/FirstWinCard.tsx', 'src/components/today/NotifyAskSheet.tsx', 'src/components/today/MissedDayCard.tsx', 'src/components/today/WeekSummaryScreen.tsx']) {
  check(`سطح حيّ يصل المستخدم: ${surface.split('/').pop()}`, reachable.has(surface))
}
// [CTO-71] البند ٨ / [QA-27] — نيّة فتح خطوة المكمّلات تُقرأ **بنقاء**.
// أثر جانبي داخل حساب يُفترض نقاؤه يضيع تحت StrictMode (يُستدعى مرّتين عمدًا)،
// فتُقرأ النيّة وتُمسح في الأولى ويُحتفظ بنتيجة الثانية `null`. والمسح موضعه أثر.
const center = stripComments(read('src/sections/CustomizationCenter.tsx'))
const readIdx = center.indexOf('getItem(SETUP_FOCUS_KEY)')
const clearIdx = center.indexOf('removeItem(SETUP_FOCUS_KEY)')
check('[QA-27]: قراءة النيّة والمسح مفصولان (لا أثر جانبي في الحساب)', readIdx > 0 && clearIdx > readIdx)
check('[QA-27]: المسح داخل useEffect لا داخل المُهيّئ', /useEffect\(\(\) => \{[^}]*removeItem\(SETUP_FOCUS_KEY\)/s.test(center))
check('[QA-27]: المُهيّئ لا يمسح شيئًا (وإلا عاد العطل بشكل آخر)', !/useState<string \| null>\(\(\) => \{[\s\S]{0,220}?removeItem/.test(center))

// [CTO-71] البند ٧ — تسلسل العناوين يبدأ من h1 في المعالج (QA-44).
const stepHeader = read('src/components/customizer/StepHeader.tsx')
check('البند ٧: ترويسة خطوات المعالج <h1> لا <h2>', /<h1 className/.test(stepHeader) && !/<h2 className/.test(stepHeader))
check('البند ٧: خطوة واحدة تُركَّب في كل مرّة (فلا تعدّد h1)', /const Current = steps\[step\]\.Component/.test(read('src/sections/CustomizationCenter.tsx')))
// [CTO-71] البند ٦ — نافذة الخميس تُلتقط مرّة عند التركيب فلا تضيع تحت سطح أولى.
check('البند ٦: نافذة الخميس محفوظة لهذه الجلسة لا مُعاد تقييمها كل رسم', /const \[thursdayWindow\] = useState\(\(\) => isThursdayMorning\(\)\)/.test(read('src/views/TodayV2.tsx')))
check('البند ٦: العرض يستهلك النافذة المحفوظة لا النداء المباشر', /\{thursdayWindow && \(/.test(read('src/views/TodayV2.tsx')) && !/\{isThursdayMorning\(\) && \(/.test(read('src/views/TodayV2.tsx')))
// ذرّية الإذن منسوخة لا مُعاد اختراعها: الإذن قبل رفع المفتاح، والرفع عند granted وحده.
const todayView = read('src/views/TodayV2.tsx')
const permIdx = todayView.indexOf('await requestNotificationPermission()')
const raiseIdx = todayView.indexOf('masterEnabled: true')
check('م١: الإذن يُطلب قبل رفع masterEnabled', permIdx > 0 && raiseIdx > permIdx)
check('م١: المفتاح لا يُرفع إلا عند granted', /perm === 'granted' && uid/.test(todayView))
check('م١: الرفض يُثبَّت فلا يتكرّر السؤال', /markNotifyAsked\(/.test(todayView) && /markNotifyAsked\('declined'\)/.test(todayView))
// م١-ب: اللوحة اليتيمة حُذفت ولا مرجع لها.
check('م١-ب: NotificationSettingsPanel محذوفة ولا مرجع لها', !existsSync(resolve(root, 'src/components/NotificationSettingsPanel.tsx')) && appSource.every(({ text }) => !text.includes('NotificationSettingsPanel')))

console.log('\n⑦ سياسة الخصوصية تبقى صادقة')
const legal = read('src/legal/canonicalLegalContent.ts')
check('العربية تنصّ أن التشخيص الاختياري متوقف ما لم يُضبط ويُوافق عليه',
  /التشخيص\s+الاختياري\s+متوقفًا\s+ما\s+لم\s+يُضبط\s+وتوافق\s+عليه/.test(legal))
check('الإنجليزية تنصّ على العقد نفسه',
  /optional\s+diagnostics\s+remain\s+disabled\s+unless\s+configured\s+and\s+consented\s+to/i.test(legal))
check('ووعد التخزين المحلي الافتراضي مسنود بمخزن فعلي',
  /على\s+جهازك\s+افتراضيًا/.test(legal) &&
  /on\s+your\s+device\s+by\s+default/i.test(legal) &&
  read('src/lib/tracking/store.ts').includes('TRACKING_EVENTS_KEY_BASE'))
check('التفاف: ادعاء إرسال التشخيص افتراضيًا يناقض العقد ويُكشف',
  /enabled\s+by\s+default/i.test('Diagnostics are enabled by default'))

console.log(`\n✅ نجحت ${pass} فحوص تتبّع محلي (مصدرية).`)

// ————————————————————————————————————————————————————————————————
// النصف التنفيذي — localStorage مُحاكى + مصائد شبكة تسجّل ثم ترمي باسمها.
const banner = `
const __store = new Map();
const __ls = {
  get length() { return __store.size; },
  key: (i) => Array.from(__store.keys())[i] ?? null,
  getItem: (k) => (__store.has(k) ? __store.get(k) : null),
  setItem: (k, v) => { __store.set(k, String(v)); },
  removeItem: (k) => { __store.delete(k); },
  clear: () => { __store.clear(); },
};
Object.defineProperty(__ls, Symbol.iterator, { value: undefined });
globalThis.__netCalls = [];
const __trap = (name) => (...a) => { globalThis.__netCalls.push(name); throw new Error('NETWORK_CALL_ATTEMPTED:' + name); };
globalThis.fetch = __trap('fetch');
globalThis.XMLHttpRequest = function () { globalThis.__netCalls.push('XMLHttpRequest'); throw new Error('NETWORK_CALL_ATTEMPTED:XMLHttpRequest'); };
globalThis.WebSocket = function () { globalThis.__netCalls.push('WebSocket'); throw new Error('NETWORK_CALL_ATTEMPTED:WebSocket'); };
globalThis.EventSource = function () { globalThis.__netCalls.push('EventSource'); throw new Error('NETWORK_CALL_ATTEMPTED:EventSource'); };
globalThis.Image = function () { globalThis.__netCalls.push('Image'); throw new Error('NETWORK_CALL_ATTEMPTED:Image'); };
const __nav = { sendBeacon: __trap('sendBeacon'), userAgent: 'proof', language: 'ar' };
// node ٢٥ يعرّف globalThis.navigator بـgetter فقط — الإسناد المباشر يرمي.
Object.defineProperty(globalThis, 'navigator', { value: __nav, writable: true, configurable: true });
globalThis.localStorage = __ls;
globalThis.window = { localStorage: __ls, navigator: __nav, fetch: globalThis.fetch, addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false }) };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`

const result = await build({
  entryPoints: [resolve(root, 'scripts/analytics-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})

const dir = mkdtempSync(join(tmpdir(), 'analytics-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
