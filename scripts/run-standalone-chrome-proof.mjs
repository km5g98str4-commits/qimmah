// إثبات كروم الشاشات المستقلّة — [STANDALONE-CHROME-001]
//
// الواقعة (المؤسس، آيفون Brave): شاشة «العضوية» يقع عنوانها وزرّ رجوعها **تحت
// شريط الحالة**، ولا شريط تنقّل، فتبدو معلّقة. وكان رجوعها مثبَّتًا على «الإعدادات»
// مهما كان المصدر — فمن دخلها من «التقدّم» لا يعود إليه.
//
// الشاشات المستقلّة (خارج `MobileShell`) لا تملك رأس القشرة ولا شريطها، فكل واحدة
// تملك كرومها بنفسها. وحين تبنيه ارتجالًا يسقط أوّل ما يسقط: منطقة الأمان.
//
// ما يحرسه هذا الفحص بنيويًا (والقياس الحقيقي في scripts/e2e/standalone-chrome.mjs):
//   ١) `StandaloneAppScreen` — الغلاف المعتمد — يحترم النتوء بـ`var(--safe-top)`
//      (لا `env()` خامًا فيتفرّق المصدر) وله متمرّره الخاص بحشوة سفلية آمنة.
//   ٢) كل شاشة مستقلّة إمّا تستعمل الغلاف، أو تُصرّح بحشوة علوية من `var(--safe-top)`.
//      لا شاشة تبدأ بـ`pt-*` عارية.
//   ٣) `PremiumView` يمرّ بالغلاف ويحتفظ بوسومه (`premium-view` · `data-access-kind`).
//   ٤) الرجوع من العضوية والتعافي يعود إلى **المصدر المتذكَّر** لا إلى وجهة مثبَّتة.
//   ⚔️ ثلاث محاكيات التفاف: نزع الحشوة · العودة إلى `env()` · تثبيت وجهة الرجوع.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')
let pass = 0
const check = (label, condition) => {
  if (!condition) throw new Error(`FAIL: ${label}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ')

console.log('\nإثبات كروم الشاشات المستقلّة — منطقة الأمان · المتمرّر · وجهة الرجوع')

const shell = stripComments(read('src/components/StandaloneAppScreen.tsx'))
const app = stripComments(read('src/App.tsx'))

// ——— ١) الغلاف المعتمد ———
{
  check('الغلاف يحترم النتوء بـvar(--safe-top)', /paddingTop: 'var\(--safe-top\)'/.test(shell))
  check('وحشوته السفلية من var(--safe-bottom)', /paddingBottom: 'calc\(1\.5rem \+ var\(--safe-bottom\)\)'/.test(shell))
  check('لا env\\(\\) خامّ في الغلاف — مصدر واحد للنتوء', !/env\(safe-area-inset/.test(shell))
  check('الغلاف يملك متمرّره الخاص لا المستند', /className="app-scroll min-h-0 flex-1 overflow-y-auto/.test(shell))
  check('الغلاف موسوم data-standalone-screen للقياس', /data-standalone-screen=""/.test(shell))
  check('وله زرّ رجوع بهدف لمس ٤٤ بكسل', /aria-label=\{backLabel\}[\s\S]{0,160}h-11 w-11/.test(shell))
  // ⚔️ محاكاة: العودة إلى env() الخامّ تُكتشف.
  const regressed = shell.replace("paddingTop: 'var(--safe-top)'", "paddingTop: 'env(safe-area-inset-top)'")
  check('⚔️ محاكاة: العودة إلى env() الخامّ تُكتشف', !/paddingTop: 'var\(--safe-top\)'/.test(regressed))
}

// ——— ٢) كل شاشة مستقلّة تحترم النتوء ———
{
  // الشاشات التي يركّبها App خارج MobileShell وتصل المستخدم في الاستعمال العادي.
  const SCREENS = [
    ['src/views/PremiumView.tsx', 'wrapper'],
    ['src/views/CalcExplainerView.tsx', 'wrapper'],
    ['src/views/ContactView.tsx', 'wrapper'],
    ['src/views/StepsView.tsx', 'own'],
    ['src/views/RecoveryView.tsx', 'own'],
    ['src/components/AppNav.tsx', 'own'],
  ]
  for (const [file, kind] of SCREENS) {
    const src = stripComments(read(file))
    const usesWrapper = /<StandaloneAppScreen[\s>]/.test(src)
    const declaresSafeTop = /var\(--safe-top\)/.test(src)
    check(
      `${file.split('/').pop()} يحترم النتوء (${kind === 'wrapper' ? 'بالغلاف' : 'بحشوة معلنة'})`,
      kind === 'wrapper' ? usesWrapper : declaresSafeTop,
    )
  }
  // ⚔️ محاكاة: نزع الحشوة من شاشة تبني كرومها بنفسها يُكتشف.
  const steps = stripComments(read('src/views/StepsView.tsx'))
  const stripped = steps.replace(/paddingTop: 'max\(0\.75rem, var\(--safe-top\)\)'/, "paddingTop: '0.75rem'")
  check('⚔️ محاكاة: نزع حشوة النتوء من StepsView يُكتشف', !/var\(--safe-top\)/.test(stripped))
}

// ——— ٣) العضوية تمرّ بالغلاف بلا فقدان وسومها ———
{
  const premium = stripComments(read('src/views/PremiumView.tsx'))
  check('PremiumView يستورد الغلاف ويستعمله', /import \{ StandaloneAppScreen \}/.test(premium) && /<StandaloneAppScreen lang=\{lang\} title=\{s\.title\} backLabel=\{s\.back\} onBack=\{onBack\}>/.test(premium))
  check('ولم يعد يبني رأسه بنفسه (container-page py-4)', !/className="container-page py-4"/.test(premium))
  check('الوسوم باقية للفحوص القائمة', /data-testid="premium-view" data-access-kind=\{kind\}/.test(premium))
}

// ——— ٤) الرجوع إلى المصدر لا إلى وجهة مثبَّتة ———
{
  for (const [name, ref, fallback] of [['premium', 'beforePremiumRef', 'settings'], ['recovery', 'beforeRecoveryRef', 'dashboard']]) {
    check(
      `${name}: المصدر يُتذكَّر ببديل مسمّى (${fallback})`,
      new RegExp(`const ${ref} = useRef<AppRoute>\\('${fallback}'\\)[\\s\\S]{0,160}if \\(view !== '${name}'\\) ${ref}\\.current = view`).test(app),
    )
    check(`${name}: الرجوع يستهلك المصدر المتذكَّر`, new RegExp(`onBack=\\{\\(\\) => navigate\\(${ref}\\.current\\)\\}`).test(app))
  }
  // ⚔️ محاكاة: إعادة تثبيت الوجهة تُكتشف.
  const pinned = app.replace('onBack={() => navigate(beforePremiumRef.current)}', "onBack={() => navigate('settings')}")
  check('⚔️ محاكاة: تثبيت رجوع العضوية على وجهة واحدة يُكتشف', !/onBack=\{\(\) => navigate\(beforePremiumRef\.current\)\}/.test(pinned))
}

console.log(`\n✅ كروم الشاشات المستقلّة: ${pass} فحصًا، 0 فشل.`)
