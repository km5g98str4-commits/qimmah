/**
 * إثبات استئناف التجربة المعلّقة — [QIM-FINAL-CLOSURE-001].
 *
 * السؤال الذي يجيبه: **هل الوعد الذي يقطعه زرّ التجربة يُوفَّى فعلًا؟**
 *
 * الحلقة كانت مكسورة عند وصلة واحدة: `OnboardingV2` يكتب النيّة
 * (`markPendingTrialIntent`) حين لا يكون المستخدم داخل حسابه، و`PendingTrialResume`
 * يقرأها — **ولا شيء كان يركّبه**. فالنيّة تنتهي بعد ٢٤ ساعة بلا أن يراها أحد،
 * والمستخدم الذي أنشأ حسابًا استجابةً للوعد لا يُعرض عليه شيء.
 *
 * ولهذا لا يكفي فحص «هل الملف موجود؟» ولا «هل يستورد الدالّة؟» — كلاهما كان
 * أخضر طوال الوقت. الفحص هنا يقيس **البلوغ من نقطة الدخول**: هل يصل
 * `src/main.tsx` إلى المكوّن، ومن يستورده؟
 */
import { build } from 'esbuild'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = process.cwd()
const COMPONENT = 'src/views/reveal/PendingTrialResume.tsx'
const HOST = 'src/App.tsx'
const ENTRY = 'src/main.tsx'
// [COMMISSIONING §1] السلطة الوحيدة للنيّة. كان هنا `src/lib/entryIntent.ts`،
// وهو مخزنٌ ثانٍ بمفتاح ثانٍ لا يقرؤه إلا لافتةٌ يدوية. وفي المقابل كان
// `trialIntent` موصولًا بالاستئناف التلقائي في مزوّد الوصول **وبلا كاتب في
// الإنتاج** — القدرة الأقوى ميتة والأضعف عاملة. فحُذف الثاني ووُحّدت الكتابة.
const INTENT = 'src/lib/access/trialIntent.ts'
const PROVIDER = 'src/lib/access/provider.tsx'
const CTA_HOST = 'src/views/OnboardingV2.tsx'

class NamedFailure extends Error {
  constructor(code, detail) { super(`${code}: ${detail}`); this.name = 'NamedFailure'; this.code = code }
}
const checks = []
const ok = (label, pass, detail = '') => checks.push({ label, pass: !!pass, detail: String(detail) })
const named = (code, pass, detail) => { if (!pass) throw new NamedFailure(code, detail) }

// ── رسم الوحدات الحقيقي من نقطة الدخول ───────────────────────────────────────
async function buildGraph(overrideSource) {
  const plugin = overrideSource && {
    name: 'attack',
    setup(b) {
      b.onLoad({ filter: /\.tsx?$/ }, (args) => {
        const rel = args.path.replace(ROOT + '/', '').replace(/\\/g, '/')
        if (rel !== overrideSource.file) return null
        const original = readFileSync(args.path, 'utf8')
        if (!original.includes(overrideSource.find)) {
          throw new Error(`ATTACK-INVALID: «${overrideSource.find}» غير موجود في ${rel} — الهجمة تقيس شيئًا غير قائم`)
        }
        return { contents: original.replace(overrideSource.find, overrideSource.replace), loader: 'tsx' }
      })
    },
  }
  const res = await build({
    entryPoints: [resolve(ROOT, ENTRY)],
    bundle: true, write: false, metafile: true, format: 'esm', platform: 'browser',
    logLevel: 'silent', jsx: 'automatic',
    alias: { '@': resolve(ROOT, 'src') },
    external: ['*.css'],
    plugins: plugin ? [plugin] : [],
  })
  const inputs = res.metafile.inputs
  const live = new Set(Object.keys(inputs).map((k) => k.replace(/\\/g, '/')))
  const importers = new Map()
  for (const [file, meta] of Object.entries(inputs)) {
    for (const imp of meta.imports ?? []) {
      const key = (imp.path || '').replace(/\\/g, '/')
      if (!importers.has(key)) importers.set(key, new Set())
      importers.get(key).add(file.replace(/\\/g, '/'))
    }
  }
  return { live, importers }
}

function assertChainIntact(graph) {
  named('trial-resume-outside-live-graph',
    graph.live.has(COMPONENT),
    `${COMPONENT} لا يبلغه ${ENTRY} — المكوّن يتيم والوعد لا يُوفَّى`)
  named('trial-resume-not-mounted-by-root',
    (graph.importers.get(COMPONENT) ?? new Set()).has(HOST),
    `${COMPONENT} ليس مستورَدًا من جذر التطبيق ${HOST} (مستورِدوه: ${[...(graph.importers.get(COMPONENT) ?? [])].join(', ') || 'لا أحد'})`)
  named('trial-intent-writer-not-live',
    graph.live.has(INTENT) && (graph.importers.get(INTENT) ?? new Set()).has(CTA_HOST),
    `كاتب النيّة ${INTENT} غير موصول بزرّ التجربة في ${CTA_HOST}`)
  // والقارئ التلقائي على نفس السلطة: لولاه لعاد المستخدم إلى ضغطةٍ ثانية.
  named('trial-intent-autoresume-not-live',
    graph.live.has(PROVIDER) && (graph.importers.get(INTENT) ?? new Set()).has(PROVIDER),
    `مزوّد الوصول ${PROVIDER} لا يقرأ ${INTENT} — لا استئناف تلقائي`)
}

console.log('① الحلقة كاملة — من نقطة الدخول إلى المكوّن')
const GRAPH = await buildGraph(null)
assertChainIntact(GRAPH)
ok('جذر التطبيق يبلغه رسم الوحدات من main.tsx', GRAPH.live.has(COMPONENT))
ok('جذر التطبيق هو من يركّبه (لا شاشة فرعية ولا توأم ميت)',
  (GRAPH.importers.get(COMPONENT) ?? new Set()).has(HOST),
  [...(GRAPH.importers.get(COMPONENT) ?? [])].join(', '))
ok('كاتب النيّة موصول بزرّ التجربة', (GRAPH.importers.get(INTENT) ?? new Set()).has(CTA_HOST))
ok('والمزوّد يقرأ **نفس** السلطة — فالاستئناف تلقائي لا ضغطة ثانية',
  (GRAPH.importers.get(INTENT) ?? new Set()).has(PROVIDER))
// **سلطة واحدة لا اثنتان**: المخزن الثاني حُذف، ولا يعود بلا أن يسقط هذا.
ok('ولا مخزن نيّة ثانٍ في الشجرة الحيّة',
  ![...GRAPH.live].some((f) => f.endsWith('src/lib/entryIntent.ts')))

console.log('\n② العقد الذي يجب ألّا ينكسر — قراءة المصدر المقترنة')
const comp = readFileSync(resolve(ROOT, COMPONENT), 'utf8')
const intent = readFileSync(resolve(ROOT, INTENT), 'utf8')

// الاقتران: الشرط والحارس في نفس الكتلة، لا وجود متفرّق في الملف.
ok('لا يُعرض شيء بلا حساب فعليّ ولا بلا نيّة سارية',
  /if \(!pending \|\| !signedIn\) return null/.test(comp))
ok('السلطة للخادم — `beginTrial` لا منح محلّي',
  /const outcome = await beginTrial\(\)/.test(comp) && !/localStorage[^\n]*premium/i.test(comp))
ok('النقر المزدوج لا يبدأ تجربتين', /if \(state === 'working'\) return/.test(comp))
ok('النيّة تُستهلك مرّة واحدة على كل نتيجة حاسمة',
  /if \(outcome !== 'offline'\) \{[\s\S]{0,120}clearTrialIntent\(\)/.test(comp))
// اللافتة صارت **احتياطًا**: نتيجةٌ وصلت تلقائيًّا تُخفيها فورًا، فلا يُطلب
// من أحد أن يضغط على ما تمّ.
ok('ونتيجة الاستئناف التلقائي تُخفي اللافتة بدل أن تكرّر الطلب',
  /if \(trialResume\) \{[\s\S]{0,220}setPending\(false\)/.test(comp)
  && /acknowledgeTrialResume\(\)/.test(comp))
ok('وانقطاع الشبكة لا يُسقط النيّة — لا يُعاقَب المستخدم على عطل ليس منه',
  /outcome !== 'offline'/.test(comp))
ok('النيّة تنتهي صلاحيتها ولا تُبعث صامتة',
  /TRIAL_INTENT_TTL_MS/.test(intent) && /age > TRIAL_INTENT_TTL_MS/.test(intent))
// وساعةٌ رجعت إلى الوراء لا تُمدِّد النيّة — تُلغى لا تُمنح.
ok('وساعة الجهاز الراجعة تُلغي النيّة ولا تمدّدها', /age < 0/.test(intent))
ok('كل نتيجة لها رسالتها الصادقة — لا رسالة عامّة',
  ['trialStarting','trialStarted','trialNeedsVerifiedEmail','trialAlreadyUsed','trialOffline','trialNeedsAccount']
    .every((k) => comp.includes(k)))

console.log('\n③ محاكاة الالتفاف (§4.2) — إعادة كسر الحلقة يجب أن تسقط باسمها')
const attacks = [
  // نزع التركيب وحده يكفي: إزالة الاستعمال تجعل esbuild يهزّ الوحدة خارج الحزمة،
  // فيُمسك العطل عند **البلوغ** لا عند المُركِّب. والاسمان يصفان العطل نفسه —
  // مكوّن لا يصل المستخدم — فالمُلتقِط الأول هو الصادق هنا، ولا يُليَّن الفحص
  // ليقبل أيّ اسم: `trial-resume-not-mounted-by-root` له هجمته المخصّصة أدناه.
  { code: 'trial-resume-outside-live-graph', label: 'نزع التركيب من الجذر (تهتزّ الوحدة خارج الحزمة)',
    file: HOST, find: '<PendingTrialResume lang={LANG} signedIn={Boolean(auth.user)} />', replace: '{null}' },
  { code: 'trial-resume-outside-live-graph', label: 'نزع الاستيراد كلّه من الجذر',
    file: HOST, find: "import { PendingTrialResume } from '@/views/reveal/PendingTrialResume'", replace: '' },
]
for (const a of attacks) {
  let outcome = 'لم تسقط إطلاقًا'
  try {
    const g = await buildGraph(a)
    assertChainIntact(g)
  } catch (e) {
    outcome = e instanceof NamedFailure ? (e.code === a.code ? 'PASS' : `سقطت باسم آخر: ${e.code}`) : `سقطت بغير اسمها: ${e.message.slice(0, 80)}`
  }
  ok(`كُشفت «${a.label}» ⇒ ${a.code}`, outcome === 'PASS', outcome)
}
// هجمة ثالثة — الحالة التي يحرسها `not-mounted-by-root` وحده: الوحدة **حيّة**
// لكن مُركِّبها ليس الجذر (مثلًا يستوردها سطح فرعي أو توأم). تُحاكى على الرسم
// نفسه لأن هزّ الأشجار لا يصنع هذه الحالة تلقائيًّا.
{
  let outcome = 'لم تسقط إطلاقًا'
  try {
    assertChainIntact({
      live: GRAPH.live,
      importers: new Map([...GRAPH.importers, [COMPONENT, new Set(['src/views/reveal/SomeOtherSurface.tsx'])]]),
    })
  } catch (e) {
    outcome = e instanceof NamedFailure
      ? (e.code === 'trial-resume-not-mounted-by-root' ? 'PASS' : `سقطت باسم آخر: ${e.code}`)
      : `سقطت بغير اسمها: ${e.message.slice(0, 80)}`
  }
  ok('كُشفت «حيّ لكن يركّبه غير الجذر» ⇒ trial-resume-not-mounted-by-root', outcome === 'PASS', outcome)
}

// ضابط: بعد الهجمات، الحزمة السليمة ما زالت تمرّ — فالسقوط سببه الهجمة لا المِعْدَان
{
  let clean = true
  try { assertChainIntact(await buildGraph(null)) } catch { clean = false }
  ok('حزمة ضابطة بعد الهجمات تمرّ — المِعْدَان نظيف', clean)
}

const failed = checks.filter((c) => !c.pass)
console.log('\n' + '─'.repeat(66))
for (const c of checks) console.log(`  ${c.pass ? '✓' : '✗'} ${c.label}${c.pass ? '' : ` — ${c.detail}`}`)
console.log('─'.repeat(66))
console.log(failed.length ? `❌ ${failed.length} فشل من ${checks.length}` : `✅ استئناف التجربة: ${checks.length} فحصًا، 0 فشل.`)
process.exit(failed.length ? 1 : 0)
