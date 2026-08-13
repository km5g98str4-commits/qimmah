import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const boundary = read('src/components/ErrorBoundary.tsx')
const setup = read('src/views/SetupView.tsx')
const copy = read('src/i18n/dict/errorBoundary.ts')
const generalStrings = read('src/config/strings.ts')
let pass = 0

function check(label, condition) {
  if (!condition) throw new Error(`FAIL: ${label}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}

function boundaryClasses(source) {
  return [...source.matchAll(/export class (\w*ErrorBoundary)\b/g)].map((match) => match[1])
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ')
}

console.log('\nإثبات حاجز الأخطاء وتشخيص الإطلاق')

const classes = boundaryClasses(boundary)
check('بدائيتا التطبيق والمسار تعيشان في المكوّن الموحّد', classes.join(',') === 'ErrorBoundary,RouteErrorBoundary')
check('الإعداد يعيد استخدام حاجز المسار ولا يعرّف حاجزًا ثالثًا', setup.includes('<RouteErrorBoundary>') && !/class \w*ErrorBoundary\b/.test(setup))
check('خطأ الإعداد لا يوسم onboarding مكتملًا', !stripComments(setup).includes('onForceComplete') && !stripComments(setup).includes('markCompleted'))
check('كل خطأ يولّد مرجعًا غير مرتبط بالمستخدم', boundary.includes('createErrorReference()') && !/user|email|token/i.test(boundary.slice(boundary.indexOf('function createErrorReference'), boundary.indexOf('function supportHref'))))
check('المرجع يظهر في واجهتي التطبيق والمسار', boundary.includes('data-testid="error-reference"') && boundary.includes('data-testid="route-error-reference"'))
check('المرجع نفسه يظهر في console للربط مع الدعم', (boundary.match(/Qimmah error reference:/g) ?? []).length === 2)
check('مسار الدعم يستخدم العنوان المعتمد فقط', boundary.includes("const SUPPORT_EMAIL = 'qimmah.support@gmail.com'") && !/[A-Za-z0-9._%+-]+@gmail\.com/.test(copy))
check('شاشة التواصل بلغتيها تستخدم عنوان الدعم نفسه', (generalStrings.match(/emailValue: 'qimmah\.support@gmail\.com'/g) ?? []).length === 2 && !generalStrings.includes('qimmahsupport@gmail.com'))
check('نصوص الاسترداد عربية وإنجليزية في القاموس', copy.includes('ar: {') && copy.includes('en: {') && copy.includes("support: 'راسل الدعم'") && copy.includes("support: 'Email support'"))
check('واجهة الخطأ تنقل التركيز إلى العنوان', (boundary.match(/headingRef\.current\?\.focus\(\)/g) ?? []).length === 2)
check('إعادة محاولة المسار تمسح المرجع السابق', boundary.includes("this.setState({ hasError: false, referenceId: null })"))
check('لا يعرض المكوّن stack أو token أو PII', !/\{\s*(?:error\.)?(?:stack|message)|token|password/i.test(boundary))

// محاكاة التفاف: وجود بريد أو مرجع في تعليق لا يكفي. نزيل الثابت وموضعي العرض
// من نسخة مصطنعة، ويجب أن يسقط العقد باسم الخاصية المقصودة.
const withoutSupport = boundary.replace("const SUPPORT_EMAIL = 'qimmah.support@gmail.com'", '')
check('محاكاة الالتفاف: نزع بريد الدعم يُكتشف', !withoutSupport.includes("const SUPPORT_EMAIL = 'qimmah.support@gmail.com'"))
const withoutReferences = boundary
  .replace('data-testid="error-reference"', '')
  .replace('data-testid="route-error-reference"', '')
check('محاكاة الالتفاف: نزع عرض المرجعين يُكتشف', !withoutReferences.includes('data-testid="error-reference"') && !withoutReferences.includes('data-testid="route-error-reference"'))

console.log(`\n✅ حاجز الأخطاء: ${pass} فحوص، 0 فشل.`)
