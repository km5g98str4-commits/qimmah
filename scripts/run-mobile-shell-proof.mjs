// إثبات القشرة على الجوال — [MOBILE-SHELL-001]
//
// الواقعة (المؤسس، آيفون): تسجيل الأكل «يقفز ويتمدّد»: التركيز على حقل يكبّر
// الصفحة، لوحة المفاتيح تُخفي الحقل وتترك شريط التنقّل فوقها، والحوارات داخل
// متمرّر القشرة تُحبَس فيه على WebKit.
//
// ثلاثة أسباب بنيوية، وثلاثة إصلاحات مركزية يحرسها هذا الفحص
// (والقياس الحقيقي في scripts/e2e/mobile-shell.mjs):
//   ١) **لا حقل إدخال دون ١٦ بكسل** في أي ملف واجهة: iOS Safari يكبّر الصفحة كلها
//      عند التركيز على حقل أصغر. الإصلاح في الخطّ لا في `user-scalable=no` —
//      التكبير بالقرص يبقى للمستخدم (وصولية).
//   ٢) **لوحة المفاتيح على الويب** تُقاس بـ`visualViewport` (`useKeyboardViewport`)
//      وتنشر `--qimmah-vvh`؛ الأسطح ذات الطول الكامل تقرأه عبر `.app-viewport-h`.
//   ٣) **كل تراكب** يمرّ بـ`AppOverlay` (بوّابة إلى body) — لا `fixed inset-0` يُكتب
//      داخل شجرة القشرة فيُحبَس في متمرّرها.
//   ⚔️ محاكيات التفاف: حقل بـ`text-sm` · تراكب `fixed inset-0` مباشر · نزع
//      `.app-viewport-h` من القشرة — كلّها تسقط باسمها.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')
let pass = 0
const check = (label, condition) => {
  if (!condition) throw new Error(`FAIL: ${label}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ').replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ' ')

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (p.endsWith('.tsx')) out.push(p)
  }
  return out
}
const files = walk(resolve(root, 'src'))

/** نهاية وسم JSX مع احترام الأقواس والنصوص — `onChange={(e) => …}` يحمل `>` داخله. */
function tagEnd(s, start) {
  let depth = 0, str = null
  for (let i = start; i < s.length; i++) {
    const c = s[i]
    if (str) { if (c === '\\') { i++; continue } if (c === str) str = null; continue }
    if (c === '"' || c === "'" || c === '`') str = c
    else if (c === '{') depth++
    else if (c === '}') depth--
    else if (c === '>' && depth === 0) return i + 1
  }
  return s.length
}
const SMALL = /\btext-(?:xs|sm|\[1[0-5]px\])\b/
function smallInputs(source) {
  const s = stripComments(source)
  const hits = []
  for (const m of s.matchAll(/<(?:input|select|textarea)\b/g)) {
    const tag = s.slice(m.index, tagEnd(s, m.index))
    if (SMALL.test(tag)) hits.push(tag.slice(0, 80))
  }
  return hits
}

console.log('\nإثبات القشرة على الجوال — حقول ≥١٦ · لوحة المفاتيح · التراكبات في body')

// ——— ١) لا حقل إدخال دون ١٦ بكسل ———
{
  const offenders = []
  for (const f of files) for (const h of smallInputs(readFileSync(f, 'utf8'))) offenders.push(`${f.replace(root + '/', '')}: ${h}`)
  check(`لا <input|select|textarea> بخطّ دون ١٦ بكسل في ${files.length} ملفًا`, offenders.length === 0)
  if (offenders.length) console.log(offenders.join('\n'))
  check('الأساس يبقى ١٦ بكسل للحقول في index.css', /input,\s*textarea,\s*select\s*\{\s*font-size:\s*16px/.test(read('src/styles/index.css')))
  check('لا user-scalable=no ولا maximum-scale في index.html (التكبير بالقرص يبقى)', !/user-scalable\s*=\s*no|maximum-scale/.test(read('index.html')))
  // ⚔️ محاكاة: حقل بـtext-sm يُكتشف ولو امتدّ الوسم على أسطر وحمل سهمًا.
  const attacked = smallInputs('<input\n  type="text"\n  onChange={(e) => setQ(e.target.value)}\n  className="w-full text-sm"\n/>')
  check('⚔️ محاكاة: حقل text-sm متعدّد الأسطر يُكتشف', attacked.length === 1)
}

// ——— ٢) لوحة المفاتيح على الويب ———
{
  const hook = stripComments(read('src/lib/useKeyboardViewport.ts'))
  const shell = stripComments(read('src/components/MobileShell.tsx'))
  const css = read('src/styles/index.css')
  check('الخطّاف يقيس visualViewport وينشر --qimmah-vvh وdata-keyboard', /window\.visualViewport/.test(hook) && /--qimmah-vvh/.test(hook) && /data-keyboard/.test(hook))
  check('الخطّاف يعيد الإزاحة البصرية بعد الإغلاق (لا فجوة iOS)', /wasOpen && \(vv\.offsetTop > 0 \|\| window\.scrollY > 0\)\) window\.scrollTo\(0, 0\)/.test(hook))
  check('الخطّاف يجلب الحقل المركَّز إلى مرأى المتمرّر', /scrollIntoView\?\.\(\{ block: 'center'/.test(hook))
  check('القشرة تجمع لوحة Capacitor ولوحة الويب', /const keyboardOpen = nativeKeyboardOpen \|\| webKeyboardOpen/.test(shell) && /useKeyboardViewport\(\)/.test(shell))
  check('شريط التنقّل يختفي مع اللوحة', /hidden=\{keyboardOpen \|\| immersive\}/.test(shell))
  check('.app-viewport-h = var(--qimmah-vvh, 100dvh)', /\.app-viewport-h\s*\{\s*height:\s*var\(--qimmah-vvh,\s*100dvh\)/.test(css))
  for (const [file, what] of [['src/components/MobileShell.tsx', 'القشرة'], ['src/components/StandaloneAppScreen.tsx', 'الشاشات المستقلّة'], ['src/components/AppOverlay.tsx', 'التراكبات']]) {
    check(`${what} تقرأ الارتفاع المرئي (.app-viewport-h)`, /app-viewport-h/.test(stripComments(read(file))))
  }
  // ⚔️ محاكاة: العودة إلى h-[100dvh] في القشرة تُكتشف.
  const regressed = shell.replace('app-viewport-h', 'h-[100dvh]')
  check('⚔️ محاكاة: العودة إلى h-[100dvh] في القشرة تُكتشف', !/app-viewport-h/.test(regressed))
}

// ——— ٣) كل تراكب يمرّ بالبوّابة ———
{
  const overlay = stripComments(read('src/components/AppOverlay.tsx'))
  check('AppOverlay بوّابة إلى document.body بارتفاع مرئي', /createPortal\(/.test(overlay) && /document\.body/.test(overlay) && /fixed inset-x-0 top-0 app-viewport-h/.test(overlay))
  // `fixed inset-0` مباشر مسموح فقط للأسطح المعلنة خارج القشرة (الإعداد · الكشف ·
  // الشاشة الافتتاحية). كل ما عداها يمرّ بالبوّابة.
  // باني الجدول وورقة اختيار تمارينه يعيشان أصلًا داخل بوّابة WorkoutView إلى body
  // (CUSTOM-PLAN-IOS-OVERLAY) — فثابتهما لا سلف يحبسه، ويبقى مسموحًا باسمه.
  const ALLOWED = new Set(['src/views/OnboardingV2.tsx', 'src/views/reveal/SynthesisScreen.tsx', 'src/components/SplashScreen.tsx', 'src/components/AppOverlay.tsx',
    'src/views/WorkoutView.tsx', 'src/features/customPlan/CustomPlanBuilder.tsx', 'src/features/customPlan/ExercisePickerSheet.tsx'])
  const direct = []
  for (const f of files) {
    const rel = f.replace(root + '/', '')
    if (ALLOWED.has(rel)) continue
    if (/\bfixed inset-0\b/.test(stripComments(readFileSync(f, 'utf8')))) direct.push(rel)
  }
  check(`لا fixed inset-0 مباشر خارج القائمة المعلنة${direct.length ? ` — وُجد: ${direct.join('، ')}` : ''}`, direct.length === 0)
  for (const f of ['src/features/barcode/ScanFoodPanel.tsx', 'src/components/ExerciseDetail.tsx', 'src/components/PremiumGate.tsx', 'src/components/today/NotifyAskSheet.tsx', 'src/views/WorkoutV2.tsx', 'src/components/IngredientPicker.tsx']) {
    check(`${f.split('/').pop()} يستعمل AppOverlay`, /<AppOverlay\b/.test(stripComments(read(f))))
  }
  check('لا max-h بوحدة vh في التراكبات (dvh فقط)', files.every((f) => !/max-h-\[\d+vh\]/.test(readFileSync(f, 'utf8'))))
  check('باني الجدول يبقى ببوّابته (CUSTOM-PLAN-IOS-OVERLAY)', /createPortal\(/.test(stripComments(read('src/views/WorkoutView.tsx'))))
  // ⚔️ محاكاة: إعادة الماسح إلى fixed inset-0 مباشر تُكتشف.
  const back = stripComments(read('src/features/barcode/ScanFoodPanel.tsx')).replace('<AppOverlay className="', '<div className="fixed inset-0 ')
  check('⚔️ محاكاة: تراكب fixed inset-0 مباشر يُكتشف', /\bfixed inset-0\b/.test(back))
}

console.log(`\n✅ القشرة على الجوال: ${pass} فحصًا، 0 فشل.`)
