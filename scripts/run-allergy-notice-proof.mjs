// ═══════════════════════════════════════════════════════════════════════════
//  ALLERGY-NOTICE — حارس تنبيه الحساسيات على **السطح الحيّ**.
//
//  ═══ الفجوة التي يغطّيها التحذير ═══
//  الإعداد يجمع `foodPreferences.allergies` ولا يقرأها أحد — لا `nutritionPlan`
//  ولا `planGenerator` ولا `mealTemplates` ولا `dietFilter` (هذا الأخير يفلتر
//  نمط الأكل فقط، لا مسبّبات الحساسية). الفلترة الحقيقية تحتاج وسم كل صنف
//  غذائي بمسبّباته. حتى ذلك الحين نُظهر تحذيرًا صادقًا بدل الصمت.
//
//  ═══ ولماذا أُعيدت كتابة هذا الإثبات ═══
//  كان يقرأ `src/views/NutritionV2.tsx` — **التوأم غير الموجَّه**
//  (`scripts/canonical-surfaces.mjs`). فبقي أخضر بينما لم يرَ التحذيرَ مستخدمٌ
//  واحد: `App.tsx` يحمّل `@/views/NutritionView` وحده. هذا شكل BUG-019 بالضبط،
//  و«وجود الواجهة ليس دليلًا على عمل الميزة» (الميثاق §2).
//
//  فالحارس الآن **يُصيّر الشاشة الحيّة فعلًا** (`renderToStaticMarkup`) بدل
//  البحث عن نصوص متفرّقة في ملفّ — لا `includes()` مبعثرة على مصدر كامل — ويقرن
//  ذلك برسم الوحدات المشتقّ من `src/main.tsx`: التحذير يجب أن يكون **في الرسم
//  الحيّ ومستورَدًا من المالك الحيّ**، لا من التوأم.
//
//  ═══ محاكاة الالتفاف (§4.2 من الميثاق) — أربع هجمات ═══
//  ① نزع التركيب من الشاشة الحيّة        ⇒ allergy-notice-missing-on-live-render
//  ② إخراس المكوّن نفسه (يُرجِع null دائمًا) ⇒ allergy-notice-missing-on-live-render
//  ③ نصّ يدّعي أن الخطة آمنة/مفلترة        ⇒ allergy-notice-false-safety-claim
//  ④ رسم يستورد التحذير من التوأم وحده     ⇒ allergy-notice-not-imported-by-live-view
//  وكل هجمة **يُتحقَّق أنها طُبِّقت فعلًا** — هجمة تُخطئ موضعها تمرّ صامتة وتجعل
//  «الحارس يسقط» ادّعاءً بلا برهان. والسقوط يجب أن يكون **بالاسم** لا بـTypeError.
// ═══════════════════════════════════════════════════════════════════════════
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tmp = mkdtempSync(path.join(os.tmpdir(), 'allergy-notice-'))
const require = createRequire(import.meta.url)
const read = (p) => readFileSync(path.resolve(root, p), 'utf8')

const LIVE_VIEW = 'src/views/NutritionView.tsx'
const TWIN_VIEW = 'src/views/NutritionV2.tsx'
const COMPONENT = 'src/components/AllergyNotice.tsx'

let pass = 0
const fails = []
const check = (label, ok, detail = '') => {
  if (ok) { pass++; console.log('  ✓ ' + label) }
  else { fails.push(`${label}${detail ? ` — ${detail}` : ''}`); console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`) }
}

/** فشل مسمّى: للحارس اسم يُقتبس في التقرير، لا كومة استدعاءات. */
class NamedFailure extends Error {
  constructor(code, detail) { super(`${code}: ${detail}`); this.name = 'NamedFailure'; this.code = code }
}
const named = (code, ok, detail) => { if (!ok) throw new NamedFailure(code, detail) }

// ═══════════════════════════════════════════════════════════════════════════
//  أدوات الهجوم — إعادة كتابة المصدر مع **إثبات وقوع الهجمة**
// ═══════════════════════════════════════════════════════════════════════════
function sourceRewrite(name, fileSuffix, edits) {
  return {
    name,
    setup(b) {
      b.onLoad({ filter: new RegExp(`${fileSuffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }, (args) => {
        let code = readFileSync(args.path, 'utf8')
        for (const [from, to] of edits) {
          if (!code.includes(from)) {
            throw new Error(`[${name}] هجمة لم تُطبَّق: لم يُعثر على «${from.slice(0, 70)}…» في ${args.path}`)
          }
          code = code.split(from).join(to)
        }
        return { contents: code, loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts' }
      })
    },
  }
}

/** ① نزع تركيب التحذير من الشاشة الحيّة — العطل الأصلي حرفيًا. */
const DISCONNECT_MOUNT = sourceRewrite('disconnect-live-mount', 'views/NutritionView.tsx', [
  ['<AllergyNotice lang={lang} className="mb-4" />', '{null /* attack */}'],
])

/** ② إخراس المكوّن — مركَّب في الشجرة لكنه لا يرسم شيئًا أبدًا. */
const MUTE_COMPONENT = sourceRewrite('mute-allergy-component', 'components/AllergyNotice.tsx', [
  ['if (!allergies.length) return null', 'if (allergies.length >= 0) return null'],
])

/** ③ نصّ يدّعي أمانًا غير موجود — انقلاب التحذير الصادق إلى طمأنة كاذبة. */
const FALSE_SAFETY = sourceRewrite('claim-plan-is-safe', 'i18n/dict/nutritionScreen.ts', [
  ['خطة الوجبات الحالية ما تستبعدها تلقائيًا بعد — تأكّد من مكوّنات أي وجبة قبل ما تنفّذها، وبدّلها إذا لزم.',
   'خطتك آمنة تمامًا وخالية من مسبّبات الحساسية.'],
])

// ═══════════════════════════════════════════════════════════════════════════
//  حزمة SSR للسطح الحيّ
// ═══════════════════════════════════════════════════════════════════════════
const STORAGE_SHIM = `
const __store = new Map();
const __ls = {
  getItem: (k) => (__store.has(k) ? __store.get(k) : null),
  setItem: (k, v) => { __store.set(k, String(v)); },
  removeItem: (k) => { __store.delete(k); },
  clear: () => { __store.clear(); },
  key: () => null,
  get length() { return __store.size },
};
globalThis.localStorage = __ls;
globalThis.sessionStorage = __ls;
const __loc = { hash: '', search: '', href: 'http://localhost/', pathname: '/', origin: 'http://localhost' };
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    localStorage: __ls, sessionStorage: __ls, location: __loc,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    setTimeout: (f, t) => setTimeout(f, t), clearTimeout: (h) => clearTimeout(h),
    navigator: { userAgent: 'node', language: 'ar' },
  };
}
// **إعادة الربط إلزامية لا شرطية:** كل حزمة تحمل مخزنها، و\`window\` يُنشأ مرّة
// واحدة فقط. لولا هذا السطر لبقي \`window.localStorage\` مربوطًا بمخزن **الحزمة
// الأولى** — فتُبذر الحساسيات في مخزن ويقرأ \`safeStorage\` من آخر، فتسقط كل
// هجمة «بنجاح» لسبب لا علاقة له بها. مرورٌ غير مستحقّ ليس نجاحًا (§4.2).
globalThis.window.localStorage = __ls;
globalThis.window.sessionStorage = __ls;
if (typeof globalThis.location === 'undefined') globalThis.location = __loc;
if (typeof globalThis.navigator === 'undefined') globalThis.navigator = { userAgent: 'node', language: 'ar' };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`

/**
 * نقطة الدخول تُصيّر **`NutritionView` نفسها** — الشاشة التي يحمّلها `App.tsx`.
 * لا نُصيّر `AllergyNotice` وحده: مكوّن يعمل في معزل لا يثبت أن أحدًا ركّبه.
 */
const ENTRY = `import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { StaticCustomizationProvider } from '@/lib/customizationContext'
import { getDefaultCustomization } from '@/lib/customization'
import { NutritionView } from '@/views/NutritionView'
import { ONBOARDING_PROFILE_KEY } from '@/lib/onboardingProfile'
import { nutritionScreenStrings } from '@/i18n/dict/nutritionScreen'

export { nutritionScreenStrings }

/**
 * @param {'ar'|'en'} lang
 * @param {string[]|null} allergies  null = لا ملفّ إعداد أصلًا (ضيف جديد)
 */
export function renderLive(lang, allergies) {
  // القراءة في \`safeStorage\` تمرّ عبر \`window.localStorage\` — نبذر في نفس المرجع.
  const ls = globalThis.window.localStorage
  ls.removeItem(ONBOARDING_PROFILE_KEY)
  if (allergies !== null) {
    ls.setItem(
      ONBOARDING_PROFILE_KEY,
      JSON.stringify({ foodPreferences: { dislikedFoods: [], allergies } }),
    )
  }
  try {
    return renderToStaticMarkup(
      React.createElement(
        StaticCustomizationProvider,
        { customization: getDefaultCustomization() },
        React.createElement(NutritionView, { lang }),
      ),
    )
  } finally {
    ls.removeItem(ONBOARDING_PROFILE_KEY)
  }
}
`

async function bundle(plugins, tag) {
  const dir = mkdtempSync(path.join(tmp, `${tag}-`))
  const entry = path.join(dir, 'entry.jsx')
  writeFileSync(entry, ENTRY)
  const outfile = path.join(dir, 'bundle.cjs')
  await build({
    entryPoints: [entry],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    outfile,
    logLevel: 'error',
    jsx: 'automatic',
    banner: { js: STORAGE_SHIM },
    define: { 'import.meta.env': '{}', 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true' },
    absWorkingDir: root,
    nodePaths: [path.join(root, 'node_modules')],
    alias: { '@': path.join(root, 'src') },
    loader: { '.js': 'jsx' },
    plugins,
  })
  return require(outfile)
}

/** نصّ مرئي فقط — الوسوم والأصناف ليست ما يقرأه المستخدم. */
const visible = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')

/** ادّعاءات الأمان المحظورة: التحذير يقول «راجِع»، لا «أنت بأمان». */
const FALSE_SAFETY_CLAIM = /آمنة تمامًا|خالية من مسبّبات|allergen-free|safe for you/i

// ═══════════════════════════════════════════════════════════════════════════
//  التدقيق المقترن — كل فحص مسمّى، ويُشغَّل على كل حزمة (حقيقية أو مهاجَمة)
// ═══════════════════════════════════════════════════════════════════════════
/**
 * الفحص الحاكم: **الحساسيات المسجَّلة تصل شاشة التغذية الحيّة مقترنةً بنصّها
 * الصادق**. مقترن لا مبعثر: الاسم والعنوان والذيل الصادق في **نفس المخرَج
 * المُصيَّر** من نفس الشجرة — لا ثلاثة `includes()` قد تُرضى من مواضع متفرّقة.
 */
function auditLiveSurface(mod) {
  const S = mod.nutritionScreenStrings
  const ALLERGENS = { ar: ['مكسّرات', 'لاكتوز'], en: ['Nuts', 'Lactose'] }

  for (const lang of ['ar', 'en']) {
    const s = S[lang]
    const allergens = ALLERGENS[lang]
    const html = visible(mod.renderLive(lang, allergens))

    named('allergy-notice-missing-on-live-render',
      html.includes(s.allergyNoticeTitle),
      `[${lang}] الشاشة الحيّة (${LIVE_VIEW}) لا تعرض «${s.allergyNoticeTitle}» رغم حساسيات مسجَّلة`)
    named('allergy-notice-missing-on-live-render',
      allergens.every((a) => html.includes(a)),
      `[${lang}] التحذير ظهر بلا تسمية ما سجّله المستخدم (${allergens.join(', ')})`)
    named('allergy-notice-missing-on-live-render',
      html.includes(s.allergyNoticeBodyPrefix) && html.includes(s.allergyNoticeBodySuffix),
      `[${lang}] نصّ التحذير غير مكتمل على الشاشة الحيّة`)
    // الاقتران: الأسماء داخل الجملة نفسها، بين المقدّمة والذيل الصادق.
    const between = html.slice(
      html.indexOf(s.allergyNoticeBodyPrefix),
      html.indexOf(s.allergyNoticeBodySuffix) + s.allergyNoticeBodySuffix.length,
    )
    named('allergy-notice-uncoupled-text',
      allergens.every((a) => between.includes(a)) && between.includes(s.allergyNoticeSeparator.trim() || ','),
      `[${lang}] الأسماء ليست داخل جملة التحذير — أجزاء متفرّقة لا تحذير واحد`)
    named('allergy-notice-false-safety-claim',
      !FALSE_SAFETY_CLAIM.test(between),
      `[${lang}] التحذير يدّعي أمانًا لا تنفّذه الخطة: «${between.slice(0, 120)}»`)
    named('allergy-notice-not-a-note',
      /role="note"/.test(mod.renderLive(lang, allergens)),
      `[${lang}] التحذير بلا دور معلَن للقارئ الشاشي`)

    // لا لافتة بلا سبب — حالتان: قائمة فارغة، ولا ملفّ إعداد أصلًا.
    for (const [why, value] of [['قائمة فارغة', []], ['بلا ملفّ إعداد', null]]) {
      named('allergy-notice-unconditional-banner',
        !visible(mod.renderLive(lang, value)).includes(s.allergyNoticeTitle),
        `[${lang}/${why}] التحذير ظهر بلا سبب`)
    }
  }
  return true
}

/**
 * الفحص الثاني: التحذير **مستورَد من المالك الحيّ**، لا من التوأم. يُشتقّ من
 * رسم الوحدات الحقيقي لا من قائمة مكتوبة بيد (نفس منهج CANONICAL-SURFACE-LOCK).
 */
function auditModuleGraph(graph) {
  named('allergy-notice-outside-live-graph',
    graph.live.has(COMPONENT),
    `${COMPONENT} خارج رسم الوحدات المشتقّ من src/main.tsx — لا يصل المستخدم`)
  named('allergy-notice-not-imported-by-live-view',
    (graph.importers.get(COMPONENT) ?? new Set()).has(LIVE_VIEW),
    `${COMPONENT} ليس مستورَدًا من المالك الحيّ ${LIVE_VIEW} (مستورِدوه: ${[...(graph.importers.get(COMPONENT) ?? [])].join(', ') || 'لا أحد'})`)
  named('allergy-notice-live-view-not-live',
    graph.live.has(LIVE_VIEW) && !graph.live.has(TWIN_VIEW),
    `المالك الحيّ/التوأم انقلبا في الرسم — راجع scripts/canonical-surfaces.mjs`)
  return true
}

console.log('════════ إثبات تنبيه الحساسيات — على السطح الحيّ ════════')

// ═══ ① رسم الوحدات الحيّ — من نقطة دخول التطبيق ═══
console.log('\n═══ ① الوصول من نقطة الدخول الحقيقية ═══')
let graphResult
try {
  graphResult = await build({
    entryPoints: [path.resolve(root, 'src/main.tsx')],
    bundle: true, write: false, metafile: true, format: 'esm', platform: 'browser',
    outdir: path.resolve(root, '.allergy-graph'),
    alias: { '@': path.resolve(root, 'src') },
    define: { 'import.meta.env': JSON.stringify({ MODE: 'production', DEV: false, PROD: true }) },
    loader: {
      '.png': 'dataurl', '.jpg': 'dataurl', '.jpeg': 'dataurl', '.svg': 'dataurl', '.webp': 'dataurl',
      '.gif': 'dataurl', '.woff': 'dataurl', '.woff2': 'dataurl', '.ttf': 'dataurl', '.eot': 'dataurl', '.css': 'css',
    },
    logLevel: 'silent',
  })
} catch (e) {
  const detail = (e?.errors ?? []).slice(0, 3).map((x) => `${x.location?.file ?? '?'}: ${x.text}`).join(' | ')
  throw new NamedFailure('allergy-notice-graph-unbuildable', `تعذّر اشتقاق رسم الوحدات — ${detail || e.message}`)
}
const inputs = graphResult.metafile.inputs
const live = new Set(Object.keys(inputs).filter((p) => p.startsWith('src/')).map((p) => p.replace(/\\/g, '/')))
const importers = new Map()
for (const [file, meta] of Object.entries(inputs)) {
  for (const imp of meta.imports ?? []) {
    if (!imp.path?.startsWith('src/')) continue
    const key = imp.path.replace(/\\/g, '/')
    if (!importers.has(key)) importers.set(key, new Set())
    importers.get(key).add(file.replace(/\\/g, '/'))
  }
}
const GRAPH = { live, importers }
check(`الرسم مبنيّ ويميّز (${live.size} وحدة حيّة، والتوأم ${TWIN_VIEW} خارجه)`, live.size > 100 && !live.has(TWIN_VIEW))
check('التحذير في الرسم الحيّ ومستورَد من مالكه الحيّ', auditModuleGraph(GRAPH))

// ═══ ② الشاشة الحيّة مُصيَّرة فعلًا ═══
console.log('\n═══ ② التصيير الحقيقي لشاشة التغذية الحيّة ═══')
const real = await bundle([], 'real')
check('الحساسيات المسجَّلة تصل الشاشة الحيّة بنصّها الصادق (ar+en)', auditLiveSurface(real))
{
  const withAllergy = visible(real.renderLive('ar', ['مكسّرات']))
  const without = visible(real.renderLive('ar', []))
  check('التحذير فرقٌ حقيقي بين الحالتين لا زينة دائمة',
    withAllergy.length > without.length && withAllergy.includes(real.nutritionScreenStrings.ar.allergyNoticeTitle))
  check('بقيّة الشاشة تُرسَم في الحالتين (لم نكسر السطح لنمرّر فحصًا)',
    without.includes(real.nutritionScreenStrings.ar.gramsUnit) && withAllergy.includes(real.nutritionScreenStrings.ar.gramsUnit))
}

// ═══ ③ المكوّن: لا نصوص صلبة، والنصوص من القاموس باللغتين ═══
console.log('\n═══ ③ النصوص من القاموس باللغتين (قاعدة المشروع §6) ═══')
const comp = read(COMPONENT)
const dict = read('src/i18n/dict/nutritionScreen.ts')
const jsx = comp.slice(comp.indexOf('return ('))
check('لا نص عربي حرفي داخل JSX المكوّن', !/>[^<>{}]*[؀-ۿ][^<>{}]*</.test(jsx))
check('النصوص تُقرأ من قاموس شاشة التغذية', /nutritionScreenStrings\[lang\]/.test(comp))
check('يقرأ الحساسيات من ملفّ الإعداد', /profile\?\.foodPreferences\?\.allergies \?\? \[\]/.test(comp))
check('لا يعرض شيئًا لمن لم يسجّل حساسية', /if \(!allergies\.length\) return null/.test(comp))
for (const key of ['allergyNoticeTitle', 'allergyNoticeBodyPrefix', 'allergyNoticeBodySuffix', 'allergyNoticeSeparator']) {
  const uses = (dict.match(new RegExp(`\\b${key}:`, 'g')) || []).length
  check(`«${key}» في النوع والعربية والإنجليزية`, uses === 3)
}
check('الشاشة الحيّة لا تحمل نص التحذير مكرّرًا (المكوّن واحد لا نسخة ثانية)',
  !/allergyNoticeTitle|سجّلت حساسية من/.test(read(LIVE_VIEW)))

// ═══ ④ الفجوة التي يغطّيها التحذير ما زالت قائمة ═══
console.log('\n═══ ④ الفجوة ما زالت قائمة (وإلّا وجب تحديث التحذير) ═══')
for (const f of ['src/lib/nutritionPlan.ts', 'src/lib/dietFilter.ts']) {
  let src = ''
  try { src = read(f) } catch { continue }
  check(`${f.replace('src/lib/', '')} ما زال لا يقرأ allergies`, !/allergies/.test(src))
}

// ═══ ⑤ محاكاة الالتفاف — كل هجمة تسقط بفحص مسمّى ═══
console.log('\n═══ ⑤ محاكاة الالتفاف — السقوط بالاسم لا بـTypeError ═══')

async function attackRender(label, plugins, tag, expectedCode) {
  let mod
  try {
    mod = await bundle(plugins, tag)
  } catch (e) {
    check(`${label} ⇒ ${expectedCode}`, false, `الهجمة لم تُبنَ (لم تُطبَّق؟): ${e.message}`)
    return
  }
  try {
    auditLiveSurface(mod)
    check(`${label} ⇒ ${expectedCode}`, false, 'الحارس مرّ رغم الهجمة — بوابة رخوة')
  } catch (e) {
    if (e instanceof NamedFailure && e.code === expectedCode) {
      check(`${label} ⇒ ${expectedCode}`, true)
      console.log(`      ↳ ${e.message}`)
    } else {
      check(`${label} ⇒ ${expectedCode}`, false, `سقط بغير اسمه (${e.name}: ${e.message.slice(0, 140)})`)
    }
  }
}

await attackRender('① نزع تركيب التحذير من الشاشة الحيّة', [DISCONNECT_MOUNT], 'attack-mount', 'allergy-notice-missing-on-live-render')
await attackRender('② إخراس المكوّن (null دائمًا)', [MUTE_COMPONENT], 'attack-mute', 'allergy-notice-missing-on-live-render')
await attackRender('③ نصّ يدّعي أن الخطة آمنة', [FALSE_SAFETY], 'attack-safety', 'allergy-notice-false-safety-claim')

// ④ رسم يستورد التحذير من التوأم وحده — شكل العطل الأصلي حرفيًا.
{
  const twinOnly = {
    live: new Set([...live]),
    importers: new Map([...importers, [COMPONENT, new Set([TWIN_VIEW])]]),
  }
  try {
    auditModuleGraph(twinOnly)
    check('④ استيراد من التوأم وحده ⇒ allergy-notice-not-imported-by-live-view', false, 'الحارس مرّ — بوابة رخوة')
  } catch (e) {
    const ok = e instanceof NamedFailure && e.code === 'allergy-notice-not-imported-by-live-view'
    check('④ استيراد من التوأم وحده ⇒ allergy-notice-not-imported-by-live-view', ok,
      ok ? '' : `سقط بغير اسمه (${e.name}: ${e.message.slice(0, 140)})`)
    if (ok) console.log(`      ↳ ${e.message}`)
  }
}

// الحارس لا يمرّ بلا محتوى: هجمة لم تُطبَّق تجعل كل ما سبق ادّعاءً.
check('الهجمات الأربع مبنيّة على نصوص موجودة فعلًا (تُثبَّت وقت البناء)', true)

// ⑤-ض) حزمة **ضابطة** تُبنى بعد الهجمات كلّها: لو كانت الهجمات تسقط بسبب
// المِعْدَان (مخزن مربوط بحزمة سابقة، بيئة متسخة) لسقطت هذه أيضًا. مرورها هو
// ما يجعل «سقطت بالهجمة» جملةً مُثبَتة لا تفسيرًا.
{
  const control = await bundle([], 'control')
  let ok = true
  let why = ''
  try { auditLiveSurface(control) } catch (e) { ok = false; why = `${e.name}: ${e.message.slice(0, 160)}` }
  check('حزمة ضابطة بعد الهجمات تمرّ — فالسقوط سببه الهجمة لا المِعْدَان', ok, why)
}

if (fails.length) {
  console.error(`\n❌ إثبات تنبيه الحساسيات: ${fails.length} فشل من ${pass + fails.length}`)
  for (const f of fails) console.error(`   - ${f}`)
  process.exit(1)
}
console.log(`\n✅ إثبات تنبيه الحساسيات: ${pass} فحصًا، 0 فشل.`)
