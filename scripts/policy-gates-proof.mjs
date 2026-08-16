import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
let pass = 0
const check = (label, condition) => {
  if (!condition) throw new Error(`FAIL: ${label}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}

const login = read('src/views/LoginView.tsx')
const policy = read('src/data/policyCopy.ts')
const onbV2 = read('src/views/OnboardingV2.tsx')
const flow = read('src/lib/onboardingV2Flow.ts')
const profile = read('src/lib/planBuilderAnswers.ts')
const pwa = read('src/lib/pwa.ts')
const banner = read('src/components/InstallBanner.tsx')
const prompt = read('src/components/InstallPrompt.tsx')
const shell = read('src/components/MobileShell.tsx')
const labels = read('src/design-system/v2/labels.ts')
const profileV2 = read('src/views/ProfileV2.tsx')
const publicRedirects = read('public/_redirects')

console.log('\n① بوابة أهلية 12+ على سطح الحساب المشترك بين v1 وv2')
check('زر التسجيل محجوب بلا موافقة', /pw\.valid && eligible12/.test(login))
check('حارس الإرسال يعيد التحقق قبل signUp', login.indexOf('if (isSignup && !eligible12)') < login.indexOf('auth.signUp('))
check('روابط الشروط والخصوصية داخلية ولا تفتح صفحة ويب منفصلة', login.includes('POLICY_LINKS.terms') && login.includes('POLICY_LINKS.privacy') && policy.includes("terms: '#/terms'") && policy.includes("privacy: '#/privacy'") && !login.includes('target="_blank"'))
// [QIM-WEB-FOUNDER-UX-006/حزمة ٦] **المقصد نفسه، والضمانة أقوى.**
//
// كان هذا الفحص يتحقّق من الآليّة القديمة: حالة وضع محلّية في `LoginView` تُرفَع
// إلى `App` عبر `onModeChange={setLoginMode}`. تلك الآليّة كانت تحفظ الوضع عبر
// الشاشات القانونية **لكنها تفقده عند التحديث**، ولا تحرّك العنوان، ويقفز
// «رجوع» فوق شاشة الحساب كلها.
//
// الآن الوضع يملكه **المسار**: `#/signup` و`#/forgot` مساران مُعلَنان، فيبقى
// الوضع عبر الشاشات القانونية *وعبر التحديث والرجوع والرابط المباشر* — وهو
// شرط أوسع لا أضيق. فالفحص صار يحرس الملكية الجديدة بدل الآليّة المهجورة.
const appSrc = read('src/App.tsx')
const routesSrc = read('src/lib/appRoutes.ts')
check(
  'وضع إنشاء الحساب يملكه المسار (يبقى عبر القانونية والتحديث والرجوع)',
  routesSrc.includes("'signup'") && routesSrc.includes("'forgot'")
    && appSrc.includes("view === 'login' || view === 'signup' || view === 'forgot'")
    && appSrc.includes('mode={authMode}')
    && !login.includes('useState<Mode>'),
)
check('روابط HTML القانونية القديمة تحوّل للشاشات الداخلية ولا تُشحن كمسودات', publicRedirects.includes('/legal/terms.html      /#/terms') && publicRedirects.includes('/legal/privacy.html    /#/privacy') && !existsSync(resolve(root, 'public/legal/terms.html')) && !existsSync(resolve(root, 'public/legal/privacy.html')))

console.log('\n② موافقة البيانات الصحية محفوظة وليست افتراضًا')
// المقصد نفسه، والبنية تغيّرت: الخطوة الأولى صارت «الجسد» (تجمع العمر/الجنس/
// الطول/الوزن) بدل «الهدف»، لأن حاجز القاصرين يحتاج العمر قبل عرض الأهداف.
// فالموافقة انتقلت معها لتبقى **قبل** أي جمع — وشرطها في validateStep(0) يسبق
// فحص الحقول، فلا يتقدّم أحد خطوة دون إذن صريح.
// ⚠️ كان هذا الفحص خمس `includes()` **منفصلة** — يُرضى بوجود كلٍّ منها في أي
// موضع من الملف. أي أنه كان يمرّ لو نُقل `<BodyStep>` إلى خطوة أخرى وبقيت في
// الملف كتلة `step === 0 && (` لمكوّن آخر. بلّغ وكيل حارة A بالثغرة ورفض
// استغلالها وهو قادر — والردّ الصحيح شدّ البوابة لا الاكتفاء بأخلاق مَن مرّ بها.
//
// البديل: تأكيد **بنيوي مقترن** — كتلة `step === 0` تُستخرج بحدودها، ثم يُشترط
// أن يكون `<BodyStep>` داخلها **ومعه** ضوابط الموافقة الثلاثة. لا يمكن إرضاؤه
// بمكوّن في خطوة وموافقة في أخرى.
const step0Block = (() => {
  const start = onbV2.indexOf('{step === 0 && (')
  if (start === -1) return ''
  // نهاية الكتلة = **أي** `{step === n` تالٍ، لا الرقم 1 تحديدًا.
  // الحدّ على الرقم 1 وحده كان ثغرة: إدراج `{step === 9 && (<BodyStep .../>)}`
  // بينهما يجعل الكتلة تبتلعه فيمرّ الالتفاف. التُقط بمحاكاة الالتفاف نفسه.
  const rest = onbV2.slice(start + 1)
  const m = rest.match(/\{step === \d+ &&/)
  return m ? onbV2.slice(start, start + 1 + m.index) : onbV2.slice(start)
})()
check(
  'بوابة الموافقة على أول خطوة قبل أي جمع بيانات (تأكيد بنيوي مقترن)',
  step0Block.includes('<BodyStep') &&
    step0Block.includes('healthDataConsent={healthDataConsent}') &&
    step0Block.includes('onConsent={setHealthDataConsent}') &&
    onbV2.includes('checked={healthDataConsent}'),
)
// تأكيد مضادّ (§4.2): الكتلة المستخرَجة ليست الملف كله — وإلا لصار الاقتران وهميًا.
check(
  'كتلة الخطوة 0 مستخرَجة بحدودها لا الملف كله',
  step0Block.length > 0 && step0Block.length < onbV2.length * 0.5,
)
check('الموافقة شرط سابق لحقول الجسد في منطق التحقق', /if \(!d\.healthDataConsent\) return 'healthConsent'/.test(flow))
check('v2 يحجب الانتقال بلا موافقة', /if \(!d\.healthDataConsent\) return 'healthConsent'/.test(flow))
check('الموافقة تدخل مصدر الحقيقة', profile.includes('accepted: a.healthDataConsent'))
check('المسودة الجديدة لا تفترض الموافقة', flow.includes('healthDataConsent: false'))
check('سطح v2 يعرض رابط الخصوصية', onbV2.includes('POLICY_LINKS.privacy'))

console.log('\n③ حواجز التطبيق الأصلي والسياسة البصرية')
check('PWA يعتبر الغلاف الأصلي مثبتًا', /if \(isNativePlatform\(\)\) return true/.test(pwa))
check('InstallBanner لا يرندر أصليًا', banner.includes('if (isNativePlatform() || standalone'))
check('InstallPrompt لا يرندر أصليًا', prompt.includes('if (isNativePlatform() || standalone'))
check('التبويبات تستخدم قاموس v2 المركزي', shell.includes('V2_TAB_LABELS.today') && shell.includes('V2_TAB_LABELS.progress'))
check('تسميات §03 الخمس موجودة', ['اليوم', 'التمارين', 'تسجيل', 'التغذية', 'التقدّم'].every((s) => labels.includes(s)))
// [CTO-009/WP-3] حلّ محلّ فحص «قِمّة+ سطر هادئ واحد».
// ذاك الفحص كان يحرس قرار منتج سابق: سطر إعلامي بلا مسار شراء. وقد نسخه
// المؤسس صراحةً — Premium صار بوّابة وصول حقيقية (§0.1) والشراء يتمّ عند سلة.
// فالفحص لا يُحذف بل **يُوجَّه للقرار الجديد**: سطح واحد لا اثنان، بوجهة واحدة
// مصدرها الإعدادات، وبالنصّ المعتمد وحده، وبلا سعر مكتوب في المكوّن.
{
  const productCfg = read('src/config/product.ts')
  const model = read('src/lib/profileV2Model.ts')
  const surfaces = (profileV2.match(/model\.subscription\.url/g) ?? []).length
  check('سطح Premium واحد لا أكثر', surfaces === 1, `${surfaces}`)
  check('الوجهة من مصدر واحد لا نصّ مكتوب في المكوّن',
    model.includes('url: product.checkoutUrl') && !/salla\.sa/i.test(profileV2))
  // [OVERNIGHT-5] كان الفحص سطرًا واحدًا (`/checkoutUrl:.*salla\.sa/`)، فسقط
  // لحظة صارت القيمة متعدّدة الأسطر — **والوجهة لم تتغيّر عن سلة بحرف**. أي
  // أنه كان يقيس تنسيقًا لا مقصدًا. فيُستخرَج الآن **القيمة** ويُفحص مضمونها.
  const checkoutValue = (() => {
    const at = productCfg.indexOf('checkoutUrl:')
    if (at < 0) return ''
    // حتى نهاية التعبير: أوّل سطر ينتهي بفاصلة بعد سلسلة نصّية.
    const tail = productCfg.slice(at)
    const end = tail.search(/',\n/)
    return end < 0 ? tail.slice(0, 400) : tail.slice(0, end + 1)
  })()
  check('قيمة الوجهة استُخرجت بحدودها لا بسطرها', checkoutValue.startsWith('checkoutUrl:') && checkoutValue.length > 20)
  check('مصدر الوجهة هو متجر سلة الحيّ', /salla\.sa\/Qimmahsa/.test(checkoutValue))
  // وأقوى من السابق: الوجهة **صفحة المنتج** لا جذر المتجر. الجذر كان قصورًا
  // موثّقًا في أدلّة الإصدار (`ok:false`)، وقد أُغلق برابط قُرئ من DOM المتجر
  // الحيّ. والارتداد إليه يُسقط هذا الفحص بالاسم.
  check('والوجهة صفحة المنتج نفسها لا جذر المتجر', /p1181109938/.test(checkoutValue))
  check('ولا تشير إلى المنتج المجّاني (سلبي معروف)', !/1084925309/.test(checkoutValue))
  // محاكاة الالتفاف: جذر المتجر وحده يجب أن يسقط فحص المنتج.
  check('ولو عادت الوجهة جذرًا لسقط الفحص أعلاه — فهو ليس تحصيل حاصل',
    !/p1181109938/.test("checkoutUrl: 'https://salla.sa/Qimmahsa',"))
  check('الرابط الخارجي محمي بـnoopener', /rel="noopener noreferrer"/.test(profileV2))
  check('لا دفع داخل التطبيق ولا مزوّد ثالث',
    !/stripe|revenuecat|applepay|in-app purchase/i.test(profileV2 + model + productCfg))
  // النصّ المعتمد وحده (§0.1) — والممنوع يُفحص في المكوّن والنموذج معًا.
  check('النصّ المعتمد لـPremium حاضر', model.includes('يشمل تحديثات قِمّة — بلا اشتراك شهري'))
  const userFacing = model.replace(/\/\/[^\n]*/g, '') + profileV2.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  check('لا «مدى الحياة» ولا lifetime في سطح المستخدم',
    !/مدى الحياة|lifetime|كل التحديثات الحالية/i.test(userFacing))
  // §0.1: السعر يُقرأ من مصدره الوحيد — وسلة هي من تعرضه اليوم.
  check('لا رقم سعر مكتوب في سطح Premium', !/\b19[.,]99\b|\b1999\b|\b26\b\s*(ر\.?س|SAR)/.test(userFacing))
}
check('شاشات الدخول العامة تستخدم viewport داخليًا بدل تمرير صفحة ويب', ['LoginView', 'ResetPasswordView', 'VerifyEmailView', 'NotFoundView'].every((name) => { const source = read(`src/views/${name}.tsx`); return source.includes('h-[100dvh]') && source.includes('app-scroll') && !source.includes('min-h-screen') }))

// ─────────────────────────────────────────────────────────────────────────────
// ④ صدق سياسة الخصوصية — [CTO-67] البند ١
//
// الفجوة التي يُغلقها: السياسة **المنشورة** كانت تفتح بـ«قِمّة يتطلّب حسابًا»
// بينما الضيف مواطن كامل يعبر الحارس بـ`guestReady` ويستخدم كل التبويبات بلا
// حساب. ووصفُ المنتج خطأً في نصّ قانوني بند امتثال لا سهو كاتب (§0 · §9).
//
// ولماذا يُحرَس بالكود لا بالعين: النصّ القانوني يُقرأ مرّة عند كتابته ثم لا
// يقرأه أحد، بينما الكود من حوله يتغيّر. الفحص هنا **يقرن النصّ بالواقع**:
// ما دام لا مستهلك واجهة لـ`setConsent`، يُمنع على السياسة أن تَعِد بمفتاح
// إيقاف في الإعدادات. فإن بُني المفتاح يومًا، يسقط الفحص فيُذكّر بتحديث النصّ —
// وهو السلوك المطلوب: بوابة تتكلّم عند تغيّر الحقيقة لا بوابة تصمت للأبد.
console.log('\n④ صدق سياسة الخصوصية — النصّ المنشور يطابق ما يفعله التطبيق')
const strings = read('src/config/strings.ts')
/** يستخرج كتلة `privacyBody: [...]` رقم n (0 = العربية، 1 = الإنجليزية) بحدودها. */
const privacyBlock = (index) => {
  let from = -1
  for (let i = 0; i <= index; i++) from = strings.indexOf('privacyBody: [', from + 1)
  if (from < 0) return ''
  const to = strings.indexOf('],', from)
  return to < 0 ? '' : strings.slice(from, to)
}
const privacyAr = privacyBlock(0)
const privacyEn = privacyBlock(1)
check('كتلتا الخصوصية استُخرجتا بحدودهما لا الملف كله', privacyAr.length > 200 && privacyEn.length > 200 && privacyAr !== privacyEn && privacyAr.length < strings.length * 0.2)
check('العربية لا تدّعي أن الحساب مطلوب', !/يتطلّب\s+حساب|يشترط\s+حساب|تحتاج\s+حسابًا\s+لاستخدام/.test(privacyAr))
check('الإنجليزية لا تدّعي أن الحساب مطلوب', !/requires?\s+an\s+account/i.test(privacyEn))
check('العربية تنصّ صراحةً على أن الضيف يستخدم التطبيق بلا حساب', /كضيف\s+دون\s+إنشاء\s+حساب/.test(privacyAr))
check('الإنجليزية تنصّ صراحةً على مسار الضيف', /as\s+a\s+guest\s+without\s+creating\s+an\s+account/i.test(privacyEn))
check('العربية تعلن أن المزامنة غير مفعّلة في هذه النسخة', /المزامنة\s+السحابية\s+غير\s+مفعّلة/.test(privacyAr))
check('الإنجليزية تعلن أن المزامنة غير مفعّلة', /sync\s+is\s+not\s+enabled\s+in\s+this\s+version/i.test(privacyEn))
// اقتران النصّ بالكود: علم المزامنة ما زال مطفأً افتراضيًا، فالجملة أعلاه صادقة.
check('علم المزامنة ما زال مطفأً افتراضيًا (وإلا كذبت الجملة)', /VITE_SYNC_ENABLED === 'true'/.test(read('src/lib/syncQueue.ts')))
// اقتران ثانٍ: لا مفتاح إيقاف تحليلات في الواجهة ⇒ لا وعد به في السياسة.
const analyticsToggleInUi = ['src/views/SettingsView.tsx', 'src/views/ProfileV2.tsx', 'src/views/PrivacyView.tsx'].some((p) => /setConsent\s*\(/.test(read(p)))
check('لا وعد بمفتاح إيقاف تحليلات ما دام غير مبنيّ في الواجهة', analyticsToggleInUi || (!/الإعدادات\s*→\s*الخصوصية/.test(privacyAr) && !/Settings\s*→\s*Privacy/i.test(privacyEn)))
check('وبديله المعلَن: لا إرسال إلى أي خادم في هذه النسخة', /لا\s+تُرسَل\s+هذه\s+الإحصاءات\s+إلى\s+أي\s+خادم/.test(privacyAr) && /not\s+sent\s+to\s+any\s+server/i.test(privacyEn))
// وعدُ الحذف يبقى مسنودًا بمسار حقيقي (أُغلق في [CTO-65] البند ١) — لا يُعاد فتحه.
check('وعد «الإعدادات → الحساب → حذف الحساب» ما زال له مسار فعلي', /الإعدادات\s*→\s*الحساب\s*→\s*حذف الحساب/.test(privacyAr) && read('src/views/SettingsView.tsx').includes('DeleteAccountDialog'))

// التأكيد المضادّ (§4.2) — الفحوص أعلاه تُكشَف عند الالتفاف ولا تصرخ على السليم.
console.log('\n④-ب التأكيد المضادّ — البوابة تُمسك النصّ المخالف ولا تُمسك السليم')
const SMUGGLED_AR = "      'قِمّة يتطلّب حسابًا، ويعمل بأسلوب محلي أولًا: تُحفظ بياناتك على جهازك أولًا.',"
const SMUGGLED_EN = "      'Qimmah requires an account and follows a local-first approach.',"
check('التفاف: عودة «يتطلّب حسابًا» تُكشَف', /يتطلّب\s+حساب/.test(SMUGGLED_AR))
check('التفاف: عودة "requires an account" تُكشَف', /requires?\s+an\s+account/i.test(SMUGGLED_EN))
check('التفاف: نصّ يذكر الضيف لكن يشترط الحساب لا يمرّ', /يتطلّب\s+حساب/.test(SMUGGLED_AR + '\nويمكنك استخدام التطبيق كضيف دون إنشاء حساب.'))
check('ولا تُكشَف الجملة السليمة الحالية', !/يتطلّب\s+حساب/.test(privacyAr) && !/requires?\s+an\s+account/i.test(privacyEn))
check('«الحساب اختياري» المشروعة لا تُعدّ اشتراطًا', !/يتطلّب\s+حساب/.test('الحساب اختياري، والغرض منه مزامنة بياناتك بين أجهزتك.'))

console.log(`\n✅ نجحت ${pass} فحوص سياسة/غلاف أصلي.`)
