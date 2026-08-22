/**
 * إثبات صدق المنع في نهاية الإعداد — [OVERNIGHT-1].
 *
 * السؤال الذي يجيبه: **حين يرفض كاتبٌ فعلًا مدفوعًا، هل يرى المستخدم الحقيقة
 * (بوّابة Premium) أم كذبة (شاشة «ما قدرنا نجهّز الخطة») بزرّ إعادة لا ينجح؟**
 *
 * لماذا وُجد — عطل حقيقي أحمرَ CI ستة أيام (`test:e2e:onboarding`، السير
 * 31868130097): بوّابتان تحرسان `plan.saveEdit` **بسؤالين مختلفين**:
 *   • `saveCustomization`        يسأل `isExistingPlanEdit()`
 *       = تخصيص محفوظ **و** إعداد مكتمل.
 *   • `saveOnboardingProfile`    يسأل `_meta.completed === true`.
 * والفجوة بينهما حالة حقيقية: **ملفّ مكتمل بلا تخصيص محفوظ** — تنشأ بعد استيراد
 * نسخة، أو ترطيب مزامنة جزئي، أو مسح مفتاح التخصيص وحده. في تلك الحالة كانت
 * الواجهة تمرّر الكتابة (مسندها يكذب) فيرميها الكاتب (مسنده يصدق)، ويبتلع
 * `catch {}` الاستثناءَ فيعرض عطلًا لم يقع. وزرّ «إعادة المحاولة» لا ينجح أبدًا
 * لأن السبب ليس عطلًا عابرًا — حلقة مغلقة يخرج منها المستخدم بإغلاق التطبيق.
 *
 * الإثبات يشغّل الكاتب الحقيقي على تخزين حقيقي (لا محاكاة منطق)، ويهاجم نفسه:
 * إعادة أيٍّ من نصفَي الإصلاح إلى صيغته القديمة تُسقط فحصًا **مسمّى**.
 *
 * ═══ [SOVEREIGN-COMMERCE-001] وامتدّ إلى صدق المنع على مسار التجربة ═══
 * نفس السؤال في موضع ثانٍ: **حين لا تبدأ التجربة، هل يعرف المستخدم لماذا؟**
 * كان الجواب لا: نداء «جرّب Premium ٣ أيام» ميتٌ بنيويًا (مضيفه شاشة عابرة
 * يتلفها الانتقال إلى إنشاء الحساب)، وحين يفشل يُعرض المنعُ الإداري الدائم
 * بنصّ «تأكّد من اتصالك وجرّب مرة ثانية». الأقسام ⑦–⑫ تُثبت الإصلاح
 * **بالتنفيذ**: تخزين حقيقي، ودوالّ حقيقية، وبناء معاينة حقيقي.
 */
import { readFileSync } from 'node:fs'
import { loadTsModule } from './food-production/lib/loadTs.mjs'

const checks = []
const ok = (label, pass, detail = '') => checks.push({ label, pass: !!pass, detail: String(detail) })

// ── تخزين حقيقي في الذاكرة (نفس عقد Storage) ────────────────────────────────
class MemStorage {
  #m = new Map()
  getItem(k) { return this.#m.has(k) ? this.#m.get(k) : null }
  setItem(k, v) { this.#m.set(k, String(v)) }
  removeItem(k) { this.#m.delete(k) }
  clear() { this.#m.clear() }
  key(i) { return [...this.#m.keys()][i] ?? null }
  get length() { return this.#m.size }
}
const storage = new MemStorage()
globalThis.window = {
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true }, localStorage: storage, dispatchEvent() {}, addEventListener() {}, removeEventListener() {} }
globalThis.localStorage = storage

const PROFILE_KEY = 'qimmah:onboarding:profile:v1'
const ONBOARDING_KEY = 'qimmah:onboarding:v1'
const CUSTOMIZATION_KEY = 'qimmah:customization:v1'
const LAST_USER_KEY = 'qimmah:lastUser:v1'

const profileMod = await loadTsModule('src/lib/onboardingProfile.ts')
const { hasCompletedOnboardingProfile, saveOnboardingProfile, defaultOnboardingProfile } = profileMod
const { isExistingPlanEdit } = await loadTsModule('src/lib/customization.ts')
const { PaidActionDenied, canPerform } = await loadTsModule('src/lib/access/guard.ts')

/** حالة الفجوة: ملفّ إعداد **مكتمل**، وبلا تخصيص محفوظ. */
const seedGap = () => {
  storage.clear()
  storage.setItem(LAST_USER_KEY, 'guest')
  storage.setItem(ONBOARDING_KEY, JSON.stringify({ completed: false, lastStep: 0 }))
  storage.setItem(PROFILE_KEY, JSON.stringify({
    goal: { type: 'cut' },
    _meta: { schemaVersion: 2, completed: true, source: 'onboarding' },
  }))
}

console.log('\n① الدالّة الواحدة موجودة وتصف الحالة بصدق')
ok('`hasCompletedOnboardingProfile` مُصدَّرة من الكاتب', typeof hasCompletedOnboardingProfile === 'function')
storage.clear()
ok('لا ملفّ ⇒ false (الإكمال الأوّل مجاني — ميثاق §0.1)', hasCompletedOnboardingProfile() === false)
seedGap()
ok('ملفّ مكتمل ⇒ true', hasCompletedOnboardingProfile() === true)

console.log('\n② الفجوة حقيقية لا نظرية — المسندان يختلفان على نفس الحالة')
seedGap()
const gapWriter = hasCompletedOnboardingProfile()
const gapView = isExistingPlanEdit()
ok('★ مسند الكاتب يصدق ومسند الواجهة يكذب على الحالة نفسها',
  gapWriter === true && gapView === false,
  `writer=${gapWriter} · view=${gapView} — لو تساويا لما وُجد العطل ولسقط هذا الإثبات`)
ok('ولو تساوى المسندان لسقط هذا الفحص — فهو ليس تحصيل حاصل', gapWriter !== gapView)

console.log('\n③ الكاتب يرمي خطأً **مسمّى** لا استثناءً عابرًا')
seedGap()
ok('الاستحقاق غير فعّال في هذه الحالة (وإلّا لما رمى الكاتب أصلًا)',
  canPerform('plan.saveEdit') === false)
let thrown = null
try { saveOnboardingProfile(defaultOnboardingProfile()) } catch (e) { thrown = e }
// ملاحظة: `loadTsModule` يحمّل `guard.ts` نسخةً مستقلّة، فهوية الصنف تختلف عن
// النسخة التي يستوردها الكاتب. لذا نفحص **العقد** (الاسم والفعل) لا المرجع —
// وهوية الصنف داخل التطبيق يفحصها البند ⑤ بنيويًا (`error instanceof`).
ok('★ الكتابة فوق ملفّ مكتمل ترمي خطأً باسم `PaidActionDenied`',
  thrown !== null && thrown.name === 'PaidActionDenied',
  `thrown=${thrown && thrown.name}: ${thrown && thrown.message}`)
ok('ولم يكن `TypeError` عابرًا — السقوط بالاسم لا بالعرض (الميثاق §4.2)',
  thrown !== null && !(thrown instanceof TypeError) && thrown instanceof Error)
ok('والخطأ يحمل اسم الفعل — فالواجهة تفتح البوّابة الصحيحة لا بوّابة عامّة',
  thrown && thrown.action === 'plan.saveEdit')
ok('ولم يُكتب شيء — لا نجاح وهمي (الميثاق §٥)',
  JSON.parse(storage.getItem(PROFILE_KEY))._meta.completed === true
  && JSON.parse(storage.getItem(PROFILE_KEY)).goal.type === 'cut')

console.log('\n④ الواجهة: الفحص المسبق يجمع مسندَي البوّابتين')
const view = readFileSync('src/views/OnboardingV2.tsx', 'utf8')
// استخراج الكتلة بحدودها لا `includes()` متفرّقة (الميثاق §4.2).
const gateStart = view.indexOf('if ((isExistingPlanEdit()')
const gateEnd = view.indexOf('saveOnboardingProfile(op)')
const gateBlock = gateStart >= 0 && gateEnd > gateStart ? view.slice(gateStart, gateEnd) : ''
ok('كتلة الفحص المسبق موجودة **قبل** أوّل كتابة', gateBlock.length > 0)
ok('★ الشرط يجمع المسندين بـ`||` — إسقاط أيّهما يفتح الفجوة من جديد',
  /if \(\(isExistingPlanEdit\(\) \|\| hasCompletedOnboardingProfile\(\)\) && !canPaid\('plan\.saveEdit'\)\)/.test(gateBlock),
  gateBlock.slice(0, 160))
ok('والفحص يخرج بـ`return` فلا يصل الكاتب أصلًا', /\breturn\b/.test(gateBlock))
ok('ولا يعرض شاشة خطأ — المنع يعيد الحالة إلى `idle`', /finalizeReduce\(st, 'reset'\)/.test(gateBlock))

console.log('\n⑤ الواجهة: المنع لا يُعرَض عطلًا لو أفلت من الفحص')
const catchStart = view.indexOf('} catch (error) {')
const catchEnd = view.indexOf("setStatus((s) => finalizeReduce(s, 'fail'))", catchStart)
const catchBlock = catchStart >= 0 && catchEnd > catchStart ? view.slice(catchStart, catchEnd) : ''
ok('كتلة الالتقاط تستقبل الخطأ (لا `catch {}` أعمى)', catchBlock.length > 0)
ok('★ `PaidActionDenied` يفتح بوّابة Premium ويعود **قبل** مسار الفشل',
  /error instanceof PaidActionDenied/.test(catchBlock)
  && /guardPaid\(error\.action/.test(catchBlock)
  && /finalizeReduce\(st, 'reset'\)/.test(catchBlock)
  && /\breturn\b/.test(catchBlock),
  catchBlock.slice(0, 200))
ok('وغير المنع يبقى عطلًا صادقًا بشاشته وزرّ إعادته',
  view.includes("setStatus((s) => finalizeReduce(s, 'fail'))"))

console.log('\n⑥ محاكاة الالتفاف (§4.2) — إعادة كلّ نصف إلى صيغته القديمة')
{
  // النصف الأول: شرط الواجهة القديم `isExistingPlanEdit()` وحده.
  seedGap()
  const legacyGatePasses = !(isExistingPlanEdit() && !canPerform('plan.saveEdit'))
  const fixedGatePasses = !((isExistingPlanEdit() || hasCompletedOnboardingProfile()) && !canPerform('plan.saveEdit'))
  ok('★ الشرط القديم يمرّر الكتابة إلى الكاتب فترمي — وهو العطل بعينه',
    legacyGatePasses === true && fixedGatePasses === false,
    `legacy=${legacyGatePasses} · fixed=${fixedGatePasses}`)

  // النصف الثاني: `catch {}` أعمى يعرض العطل بدل البوّابة.
  const blindCatch = (e) => (e instanceof PaidActionDenied ? 'error-screen' : 'error-screen')
  const honestCatch = (e) => (e instanceof PaidActionDenied ? 'premium-gate' : 'error-screen')
  const denial = new PaidActionDenied('plan.saveEdit')
  ok('★ الالتقاط الأعمى يعرض «عطلًا» للمنع، والصادق يعرض البوّابة',
    blindCatch(denial) === 'error-screen' && honestCatch(denial) === 'premium-gate')
  ok('وكلاهما يعرض عطلًا للعطل الحقيقي — فالإصلاح لم يبتلع الأعطال',
    blindCatch(new Error('boom')) === 'error-screen' && honestCatch(new Error('boom')) === 'error-screen')
}


// ═══════════════════════════════════════════════════════════════════════════
//  [SOVEREIGN-COMMERCE-001] ⑦–⑫ — صدق المنع على مسار التجربة والوصول
// ═══════════════════════════════════════════════════════════════════════════
const { build } = await import('esbuild')
const { mkdtempSync, rmSync } = await import('node:fs')
const { tmpdir } = await import('node:os')
const { join, resolve: pathResolve } = await import('node:path')
const { pathToFileURL } = await import('node:url')

const ROOT = pathResolve(import.meta.dirname, '..')
/** يصرّف وحدة TS ويستوردها، مع إمكان **زرع بيئة بناء** حقيقية. */
async function loadWithEnv(relPath, env = {}, patch = null) {
  const dir = mkdtempSync(join(tmpdir(), 'qimmah-trial-'))
  const outfile = join(dir, `m-${Math.random().toString(36).slice(2)}.mjs`)
  try {
    // بذرة الهجوم: تُعدَّل **الشيفرة نفسها** ثم يُعاد بناؤها وتُشغَّل. لا محاكاة
    // منطقٍ بيدنا — ذاك يُثبت أن حسابنا صحيح، لا أن الكود صحيح (الميثاق §4.2).
    const plugins = patch ? [{
      name: 'attack-patch',
      setup(b) {
        b.onLoad({ filter: new RegExp(`${patch.file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }, (a) => {
          const text = readFileSync(a.path, 'utf8')
          const next = patch.apply(text)
          if (next === text) throw new Error(`attack patch had no effect on ${a.path}`)
          return { contents: next, loader: 'ts' }
        })
      },
    }] : []
    await build({
      entryPoints: [pathResolve(ROOT, relPath)],
      bundle: true, format: 'esm', platform: 'node', outfile,
      alias: { '@': pathResolve(ROOT, 'src') },
      external: ['@supabase/supabase-js'],
      define: { 'import.meta.env': JSON.stringify(env) },
      plugins,
      logLevel: 'silent',
    })
    return await import(pathToFileURL(outfile).href)
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* ignore */ }
  }
}

console.log('\n⑦ نيّة التجربة تنجو من رحلة المصادقة — تخزين حقيقي')
const intent = await loadWithEnv('src/lib/access/trialIntent.ts')
storage.clear()
ok('لا نيّة في البداية', intent.readTrialIntent() === null)
const wrote = intent.recordTrialIntent('reveal')
ok('★ التسجيل يعيد `WriteResult` ولا يبتلعه (الميثاق §5)', wrote === 'ok', `wrote=${wrote}`)
ok('والنيّة تعيش في التخزين لا في الذاكرة — فتنجو من إعادة التحميل',
  storage.getItem(intent.TRIAL_INTENT_KEY) !== null, intent.TRIAL_INTENT_KEY)
{
  // نفس التخزين، **نسخة وحدة ثانية** = محاكاة إعادة تحميل كاملة (تبويب جديد
  // من رابط تأكيد البريد)، لا مجرّد إعادة قراءة من نفس الحالة.
  const reloaded = await loadWithEnv('src/lib/access/trialIntent.ts')
  const survived = reloaded.readTrialIntent()
  ok('★ نسخة وحدة جديدة على نفس التخزين تقرأ النيّة — نجت من إعادة التحميل',
    survived !== null && survived.origin === 'reveal', JSON.stringify(survived))
}
{
  storage.setItem(intent.TRIAL_INTENT_KEY, JSON.stringify({ recordedAt: Date.now() - intent.TRIAL_INTENT_TTL_MS - 1000, origin: 'reveal' }))
  ok('★ نيّة تجاوزت مدّتها تُقرأ `null` **وتُمسح**',
    intent.readTrialIntent() === null && storage.getItem(intent.TRIAL_INTENT_KEY) === null)
  storage.setItem(intent.TRIAL_INTENT_KEY, JSON.stringify({ recordedAt: Date.now() + 3_600_000, origin: 'reveal' }))
  ok('★ ساعة الجهاز رجعت للوراء ⇒ تُلغى ولا تُمدَّد', intent.readTrialIntent() === null)
  storage.setItem(intent.TRIAL_INTENT_KEY, '{"nonsense":true}')
  ok('ونيّة مشوَّهة تُمسح ولا تُفسَّر', intent.readTrialIntent() === null && storage.getItem(intent.TRIAL_INTENT_KEY) === null)
}
ok('والنيّة مسجَّلة في سجلّ المفاتيح المركزي',
  readFileSync('src/lib/userDataKeys.ts', 'utf8').includes("key: 'qimmah:access:trial-intent:v1'"))

console.log('\n⑧ استهلاك النيّة — الجواب النهائي وحده، ولا يُعاقَب المستخدم على عطلنا')
for (const [outcome, consumes] of [
  ['started', true], ['already_claimed', true], ['revoked', true],
  ['email_not_verified', false], ['not_authenticated', false],
  ['timeout', false], ['offline', false], ['service_error', false], ['backend_unconfigured', false],
]) {
  ok(`«${outcome}» ${consumes ? 'يستهلك' : 'يُبقي'} النيّة`, intent.consumesTrialIntent(outcome) === consumes)
}
ok('★ `email_not_verified` تُبقي النيّة — وهي اللحظة التي وُجدت لأجلها',
  intent.consumesTrialIntent('email_not_verified') === false)
ok('★ ولا عطلٍ من عندنا يبتلع نيّة المستخدم',
  ['timeout', 'offline', 'service_error', 'backend_unconfigured'].every((o) => !intent.consumesTrialIntent(o)))
ok('★ و`started` وحدها تعني «بدأت» — لا نتيجة أخرى تُقرأ نجاحًا',
  intent.trialDidStart('started') === true
  && ['already_claimed', 'email_not_verified', 'not_authenticated', 'revoked', 'timeout', 'offline', 'service_error', 'backend_unconfigured', null]
    .every((o) => intent.trialDidStart(o) === false))

console.log('\n⑨ بناء المراجعة يفشل **مغلقًا** ويقولها — تنفيذ على بناء حقيقي')
{
  const previewSrc = await loadWithEnv('src/lib/access/entitlementSource.ts', { VITE_APP_ENV: 'founder_preview' })
  const outcome = await previewSrc.startTrial()
  ok('★ بناء المعاينة لا يبدأ تجربة، ويعيد `backend_unconfigured` لا `offline`',
    outcome === 'backend_unconfigured', `outcome=${outcome}`)
  ok('★ ولا يُعرض ذلك «بدأت»', intent.trialDidStart(outcome) === false)
  ok('والنيّة تبقى — لأن الغياب ليس ذنب المستخدم', intent.consumesTrialIntent(outcome) === false)
  const redeemed = await previewSrc.redeemActivationCode('QIMMAH-AAAA-BBBB')
  ok('★ والتفعيل في بناء المعاينة يرفض بـ`backend_unconfigured` لا بلوم النت',
    redeemed === 'backend_unconfigured', `redeem=${redeemed}`)
  ok('والفارغ يُردّ محلّيًا قبل أي رحلة', (await previewSrc.redeemActivationCode('   ')) === 'empty')
  const msgs = await loadWithEnv('src/lib/access/outcomeMessages.ts', { VITE_APP_ENV: 'founder_preview' })
  const text = msgs.trialMessage(outcome, 'ar')
  ok('★ ونصّها يقول «نسخة مراجعة» ولا يذكر النت',
    /نسخة مراجعة/.test(text) && !/النت|اتصال/.test(text), text)
}

console.log('\n⑩ مؤشّر الوصول — كل حالة سطرها، والوقت من الخادم')
const sum = await loadWithEnv('src/lib/access/accessSummary.ts')
const snap = (serverState, extra = {}) => ({
  status: ['premiumActive', 'specialAccessActive', 'trialActive'].includes(serverState) ? 'active' : 'none',
  source: 'backend',
  detail: { serverState, entitlementType: 'trial', noExpiry: false, expiresAtMs: null, activatedAtMs: null, serverTimeMs: 0, receivedAtPerfMs: 0, ...extra },
})
const labels = new Map()
for (const st of ['premiumActive', 'specialAccessActive', 'trialActive', 'trialExpired', 'revoked', 'noAccess']) {
  const r = sum.summarizeAccess(snap(st), 'ar', 0)
  ok(`حالة ${st} لها سطر غير فارغ`, typeof r.label === 'string' && r.label.length > 0, r.label)
  labels.set(st, r.label)
}
ok('★ ستّ حالات ⇒ ستّة سطور — لا حالتان تتقاسمان نصًّا', new Set(labels.values()).size === 6,
  [...labels.values()].join(' | '))
ok('★ «موقوف» يُعرض إيقافًا لا معاينة',
  sum.summarizeAccess(snap('revoked'), 'ar', 0).kind === 'revoked')
ok('★ و«ما قدرنا نتحقّق» ليست «معاينة» — الجهل يُقرّ به لا يُلبَس حالةً',
  sum.summarizeAccess({ status: 'none', source: 'backend', detail: null, lastError: 'backend_error' }, 'ar', 0).kind === 'unknown'
  && sum.summarizeAccess({ status: 'none', source: 'none', detail: null, lastError: 'backend_unconfigured' }, 'ar', 0).kind === 'preview')
{
  // ٧٢ ساعة من ساعة الخادم؛ ونقيس ما مضى بـ`performance.now()` وحده.
  const hours = (h) => h * 3_600_000
  const trial = snap('trialActive', { expiresAtMs: hours(72), serverTimeMs: 0, receivedAtPerfMs: 0 })
  const atStart = sum.summarizeAccess(trial, 'ar', 0)
  ok('عدّاد التجربة يبدأ من ٧٢ ساعة', atStart.remainingMs === hours(72), String(atStart.remainingMs))
  const after70 = sum.summarizeAccess(trial, 'ar', hours(70))
  ok('★ وبعد ٧٠ ساعة يبقى ساعتان — القياس من عدّاد أحادي لا من ساعة الجهاز',
    after70.remainingMs === hours(2), String(after70.remainingMs))
  ok('★ وتحت العتبة تتغيّر النبرة إلى «تقارب تخلص» بلا تهويل',
    after70.tone === 'ending' && !/سارع|بادر|!/.test(after70.label), after70.label)
  const expired = sum.summarizeAccess(trial, 'ar', hours(73))
  ok('★ وبعد انقضائها لا رقم سالب ولا «متبقٍّ» كاذب', expired.remainingMs === 0)
  ok('وأرقام العربية هندية والإنجليزية لاتينية',
    /[٠-٩]/.test(sum.summarizeAccess(trial, 'ar', 0).label) && /[0-9]/.test(sum.summarizeAccess(trial, 'en', 0).label))
  ok('★ وPremium بلا مدّة معروضة — أي وصف مدّة هنا يصير وعدًا (§0.1)',
    sum.summarizeAccess(snap('premiumActive'), 'ar', 0).remainingMs === null
    && !/سنة|سنوي|مدى الحياة|lifetime/i.test(labels.get('premiumActive')))
}

console.log('\n⑪ التأكيد المضادّ — الشيفرة تُعدَّل وتُعاد بناءً، لا تُحاكى بيدنا')
{
  // هجوم ١: «امسح النيّة عند أي جواب» — السلوك الساذج الذي يبتلع نيّة من لم
  // يؤكّد بريده بعد، أي يقتل الميزة في اللحظة التي وُجدت لأجلها بالضبط.
  const greedy = await loadWithEnv('src/lib/access/trialIntent.ts', {}, {
    file: 'src/lib/access/trialIntent.ts',
    apply: (t) => t.replace(
      "return outcome === 'started' || outcome === 'already_claimed' || outcome === 'revoked'",
      'return true'),
  })
  ok('★ بناءٌ يمسح النيّة دائمًا يبتلع `email_not_verified` — والسليم يُبقيها',
    greedy.consumesTrialIntent('email_not_verified') === true
    && intent.consumesTrialIntent('email_not_verified') === false,
    'لو تساوى البناءان لما كان الفحص يقيس شيئًا')
  ok('وكذلك يبتلعها عند عطلٍ من عندنا — والسليم لا',
    greedy.consumesTrialIntent('service_error') === true
    && intent.consumesTrialIntent('service_error') === false)

  // هجوم ٢: «كل ما ليس فشلًا صريحًا = بدأت» — إعلانُ بدءٍ لم يقع.
  const optimistic = await loadWithEnv('src/lib/access/trialIntent.ts', {}, {
    file: 'src/lib/access/trialIntent.ts',
    apply: (t) => t.replace(
      "return outcome === 'started'\n}",
      "return outcome !== null && outcome !== 'offline'\n}"),
  })
  ok('★ بناءٌ متفائل يعلن «بدأت» لتجربة استُهلكت من قبل — والسليم لا',
    optimistic.trialDidStart('already_claimed') === true
    && intent.trialDidStart('already_claimed') === false)
  ok('★ ويعلنها حتى لمن أُوقف حسابه — والسليم يرفض',
    optimistic.trialDidStart('revoked') === true && intent.trialDidStart('revoked') === false)
  ok('وكلا البناءين يوافقان على `started` — فالفحص يميّز ولا يرفض كل شيء',
    optimistic.trialDidStart('started') === true && intent.trialDidStart('started') === true)

  // هجوم ٣: خلط «لا نعرف» بـ«معاينة» — تلبيسُ الجهل حالةً.
  const blurred = await loadWithEnv('src/lib/access/accessSummary.ts', {}, {
    file: 'src/lib/access/accessSummary.ts',
    apply: (t) => t.replace("  if (snapshot.lastError) return 'unknown'\n", ''),
  })
  const unknownSnap = { status: 'none', source: 'backend', detail: null, lastError: 'backend_error' }
  ok('★ بناءٌ يحذف فرع «لا نعرف» يعرض تعذّرَ القراءة «معاينة» — والسليم يقرّ بالجهل',
    blurred.summarizeAccess(unknownSnap, 'ar', 0).kind === 'preview'
    && sum.summarizeAccess(unknownSnap, 'ar', 0).kind === 'unknown')

  ok('ومؤشّر الوصول عرضٌ فقط — لا يُقرَّر منه إذن',
    sum.summarizeAccess(snap('revoked'), 'ar', 0).allowed === false
    && sum.summarizeAccess(snap('premiumActive'), 'ar', 0).allowed === true)
}

console.log('\n⑫ كتابة مدفوعة في المعاينة تبقى مرفوضة — لم يُضعَف شيء')
{
  seedGap()
  ok('★ الحارس ما زال يمنع الفعل المدفوع', canPerform('plan.saveEdit') === false)
  let threw = null
  try { saveOnboardingProfile(defaultOnboardingProfile()) } catch (e) { threw = e }
  ok('★ والكاتب ما زال يرمي `PaidActionDenied` بعد كل هذه الإضافات',
    threw !== null && threw.name === 'PaidActionDenied', `thrown=${threw && threw.name}`)
  const src = readFileSync('src/lib/access/entitlementSource.ts', 'utf8')
  ok('★ ولا نتيجة من النتائج الجديدة تُترجَم نجاحًا',
    ['backend_unconfigured', 'timeout', 'service_error', 'offline', 'empty']
      .every((o) => !new RegExp(`case '${o}': return 'success'`).test(src)))
  ok('والنيّة لا تُقرأ في أي قرار وصول',
    !readFileSync('src/lib/access/guard.ts', 'utf8').includes('trialIntent')
    && !readFileSync('src/lib/access/paidActions.ts', 'utf8').includes('trialIntent'))
}

const failed = checks.filter((c) => !c.pass)
console.log('\n' + '─'.repeat(64))
for (const c of checks) console.log(`  ${c.pass ? '✓' : '✗'} ${c.label}${c.pass ? '' : ` — ${c.detail}`}`)
console.log('─'.repeat(64))
if (failed.length === 0) console.log(`✅ صدق المنع في نهاية الإعداد: ${checks.length} فحصًا، 0 فشل.`)
else console.log(`❌ ${failed.length} فشل من ${checks.length}`)
process.exit(failed.length ? 1 : 0)
