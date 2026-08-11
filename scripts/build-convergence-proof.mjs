/**
 * إثبات تقارب النسخ — [QIM-WEB-RELEASE-001] البندان ٢ و٨
 *
 * يحرس السبب الجذري لتقرير المؤسس «نفس الرابط يعرض نسخًا مختلفة، والجوال نسخة
 * ثالثة»: كان تسجيل عامل الخدمة سطرًا واحدًا بلا أي منطق تحديث، وعامل الخدمة
 * يستدعي `skipWaiting` + `clients.claim` — فيستولي العامل الجديد على صفحة تشغّل
 * JS قديمًا، ويحذف كاشات النسخة السابقة، ولا شيء يعيد تحميل الصفحة. فيبقى الجهاز
 * على بناء قديم بلا مخرج غير مسح الكاش يدويًا.
 *
 * يفحص طبقتين:
 *   ١) هوية البناء مقروءة من `dist/index.html` بلا تشغيل أي سكربت.
 *   ٢) وحدة `src/lib/swUpdate.ts` الحقيقية في بيئة متصفّح مُموّهة.
 *
 * ومعها محاكاة التفاف (§4.2): إسقاط حارس `hadController` **يجب** أن يُنتج
 * إعادة تحميل عند أول تثبيت — أي الحلقة اللانهائية بعينها.
 */
import { build } from 'esbuild'
import { readFileSync, existsSync, mkdtempSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

let pass = 0
let fail = 0
const failures = []
function check(name, ok, detail = '') {
  if (ok) {
    pass += 1
    console.log(`  ✅ ${name}`)
  } else {
    fail += 1
    failures.push(name)
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

// ───────────────── الطبقة ١: هوية البناء في HTML ─────────────────

console.log('\n▸ الطبقة ١ — هوية البناء مقروءة بلا تشغيل سكربت')

const indexPath = resolve(root, 'dist/index.html')
if (!existsSync(indexPath)) {
  console.error('\n✖ لا يوجد dist/index.html — شغّل `npm run build` أولًا.')
  process.exit(1)
}
const indexHtml = readFileSync(indexPath, 'utf-8')

const metaOf = (name) =>
  indexHtml.match(new RegExp(`<meta[^>]*name="${name}"[^>]*content="([^"]*)"`))?.[1] ??
  indexHtml.match(new RegExp(`<meta[^>]*content="([^"]*)"[^>]*name="${name}"`))?.[1] ??
  null

const buildLabel = metaOf('qimmah-build')
const commit = metaOf('qimmah-commit')
const buildTime = metaOf('qimmah-build-time')
const swVersion = metaOf('qimmah-sw-version')

check('meta هوية البناء موجود في index.html', Boolean(buildLabel), String(buildLabel))
check('يحمل هاش الـcommit', Boolean(commit) && commit !== 'dev', String(commit))
check('يحمل وقت البناء بصيغة ISO', Boolean(buildTime) && !Number.isNaN(Date.parse(buildTime)), String(buildTime))
check('يحمل إصدار عامل الخدمة', Boolean(swVersion) && swVersion.includes(commit ?? '∅'), String(swVersion))

// إصدار عامل الخدمة في الـmeta يجب أن يطابق ما حُقن فعلًا في sw.js المنشور.
const swDist = readFileSync(resolve(root, 'dist/sw.js'), 'utf-8')
const swDeclared = swDist.match(/const VERSION = '([^']+)'/)?.[1] ?? null
check(
  'إصدار عامل الخدمة المُعلَن في HTML = المحقون في sw.js (لا هويّتان)',
  swDeclared === swVersion,
  `html=${swVersion} sw=${swDeclared}`,
)
check('sw.js المنشور لا يحمل عناصر نائبة غير مُستبدَلة', !swDist.includes('__SW_'))

// ───────────────── الطبقة ٢: وحدة التقارب الحقيقية ─────────────────

console.log('\n▸ الطبقة ٢ — وحدة swUpdate الحقيقية في بيئة مُموّهة')

const tmp = mkdtempSync(join(tmpdir(), 'qimmah-conv-'))

async function bundle(source, name) {
  const outfile = join(tmp, `${name}.mjs`)
  await build({
    stdin: source
      ? { contents: source, resolveDir: resolve(root, 'src/lib'), loader: 'ts', sourcefile: 'swUpdate.ts' }
      : undefined,
    entryPoints: source ? undefined : [resolve(root, 'src/lib/swUpdate.ts')],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    outfile,
    logLevel: 'silent',
  })
  return import(pathToFileURL(outfile).href + `?t=${name}`)
}

/**
 * بديل `HTMLElement` — **يُعرَّف مرّة واحدة عمدًا**.
 *
 * كان يُعرَّف داخل `installEnv`، فكل بيئة تصنع صنفًا جديدًا؛ وعنصرٌ أُنشئ قبل
 * تركيب البيئة يُقاس بـ`instanceof` مقابل صنف آخر فيسقط الفحص. عيب في المِرْقاة
 * لا في المنتج — التقطه احمرار «أثناء الكتابة: تأجيل لا مقاطعة».
 */
class HTMLElementStub {
  constructor(tagName, isContentEditable = false) {
    this.tagName = tagName
    this.isContentEditable = isContentEditable
  }
}

/** بيئة متصفّح مُموّهة بالحدّ الأدنى الذي تلمسه الوحدة. */
function installEnv({ hasController, activeElement = null }) {
  const swListeners = {}
  const winListeners = {}
  const docListeners = {}
  const state = { reloads: 0, updates: 0, registered: 0 }

  const registration = {
    update: async () => {
      state.updates += 1
    },
  }

  const g = globalThis
  const def = (k, v) => Object.defineProperty(g, k, { value: v, configurable: true, writable: true })

  def('HTMLElement', HTMLElementStub)
  def('navigator', {
    serviceWorker: {
      controller: hasController ? {} : null,
      addEventListener: (t, f) => ((swListeners[t] ||= []).push(f)),
      register: async () => {
        state.registered += 1
        return registration
      },
    },
  })
  def('window', {
    addEventListener: (t, f) => ((winListeners[t] ||= []).push(f)),
    removeEventListener: (t, f) => {
      winListeners[t] = (winListeners[t] ?? []).filter((x) => x !== f)
    },
    location: {
      reload: () => {
        state.reloads += 1
      },
    },
  })
  def('document', {
    activeElement,
    visibilityState: 'visible',
    addEventListener: (t, f) => ((docListeners[t] ||= []).push(f)),
  })

  const fire = async (bag, type) => {
    for (const f of bag[type] ?? []) await f()
  }

  return {
    state,
    fireSw: (t) => fire(swListeners, t),
    fireWin: (t) => fire(winListeners, t),
    fireDoc: (t) => fire(docListeners, t),
  }
}

const mod = await bundle(null, 'real')

// أول تثبيت: لا متحكّم ⇒ ممنوع إعادة التحميل (وإلّا حلقة عند كل زيارة أولى).
{
  const env = installEnv({ hasController: false })
  mod.registerServiceWorkerWithUpdates()
  await env.fireWin('load')
  await env.fireSw('controllerchange')
  check('أول تثبيت: لا إعادة تحميل (لا حلقة عند الزيارة الأولى)', env.state.reloads === 0, `${env.state.reloads}`)
  check('عامل الخدمة سُجِّل فعلًا', env.state.registered === 1)
}

// نشر جديد على تبويب يعمل: إعادة تحميل واحدة بالضبط.
{
  const env = installEnv({ hasController: true })
  mod.registerServiceWorkerWithUpdates()
  await env.fireWin('load')
  await env.fireSw('controllerchange')
  check('نشر جديد ⇒ إعادة تحميل واحدة (تقارب حتمي)', env.state.reloads === 1, `${env.state.reloads}`)

  await env.fireSw('controllerchange')
  await env.fireSw('controllerchange')
  check('أحداث متكرّرة لا تزيد العدد — حدّ أقصى واحد لكل تحميل صفحة', env.state.reloads === 1, `${env.state.reloads}`)
}

// المستخدم يكتب: لا نقطع عليه، ونعيد التحميل عند ترك الحقل.
{
  const env = installEnv({ hasController: true, activeElement: new HTMLElementStub('INPUT') })
  mod.registerServiceWorkerWithUpdates()
  await env.fireWin('load')
  await env.fireSw('controllerchange')
  check('أثناء الكتابة: تأجيل لا مقاطعة', env.state.reloads === 0, `${env.state.reloads}`)
  await env.fireWin('blur')
  check('بعد ترك الحقل: إعادة التحميل تتمّ', env.state.reloads === 1, `${env.state.reloads}`)
}

// العودة إلى الواجهة تسأل عن نسخة جديدة، بخنق.
{
  const env = installEnv({ hasController: true })
  mod.registerServiceWorkerWithUpdates()
  await env.fireWin('load')
  await env.fireDoc('visibilitychange')
  check('العودة إلى الواجهة تفحص وجود نسخة جديدة', env.state.updates === 1, `${env.state.updates}`)
  await env.fireDoc('visibilitychange')
  check('الفحص مخنوق — لا طلب عند كل تبديل تبويب', env.state.updates === 1, `${env.state.updates}`)
}

// ───────────── محاكاة التفاف: إسقاط حارس أول تثبيت (§4.2) ─────────────

console.log('\n▸ محاكاة التفاف — إسقاط حارس `hadController`')
{
  const src = readFileSync(resolve(root, 'src/lib/swUpdate.ts'), 'utf-8')
  const weakened = src.replace(
    'if (!hadController || reloadedOnce) return',
    'if (reloadedOnce) return',
  )
  check('نُقض الحارس فعلًا في نسخة المحاكاة', weakened !== src)

  const weakMod = await bundle(weakened, 'weak')
  const env = installEnv({ hasController: false })
  weakMod.registerServiceWorkerWithUpdates()
  await env.fireWin('load')
  await env.fireSw('controllerchange')
  check(
    'بإسقاطه تعود الحلقة: أول تثبيت يعيد التحميل — فالحارس هو المانع فعلًا',
    env.state.reloads === 1,
    `${env.state.reloads}`,
  )
}

console.log(`\n${'─'.repeat(60)}`)
console.log(`إثبات تقارب النسخ: ${pass} ناجح · ${fail} فاشل`)
if (fail > 0) {
  console.log('الفاشل:')
  for (const f of failures) console.log(`  • ${f}`)
  process.exit(1)
}
console.log('✅ كل الفحوص خضراء')
