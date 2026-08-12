import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
let pass = 0
const check = (label, condition) => {
  if (!condition) throw new Error(`FAIL: ${label}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}

const start = read('src/views/StartViewV2.tsx')
const adapter = read('src/views/StartView.tsx')
const app = read('src/App.tsx')
const strings = read('src/config/strings.ts')
const onboarding = read('src/lib/onboarding.ts')

console.log('\nإثبات مدخل الضيف المحلي')
check('قاموس الضيف موجود بالعربية والإنجليزية', strings.includes("continueGuest: 'كمّل كضيف'") && strings.includes("continueGuest: 'Continue as guest'"))
check('زر الضيف مربوط بواجهة البداية', start.includes('onGuest: () => void') && start.includes('onClick={onGuest}') && start.includes('getStrings(lang).start.continueGuest'))
check('المحوّل يمرّر عقد الضيف', adapter.includes('onGuest: () => void') && adapter.includes('<StartViewV2 {...props} />'))
// [QIM-WEB-FOUNDER-UX-006/حزمة ٦] الوجهة صارت **مشروطة بحالة الضيف**، والفحص
// يتبعها بدل أن يتشبّث بسطر حرفي:
//   • ضيف جديد ⇒ معالج الإعداد (كما كان).
//   • ضيف **مكتمل** ⇒ «اليوم» في وضع المعاينة — لا محرّر الخطة.
// كان كلاهما يُرسَل إلى `setup`، فيهبط العائد على محرّر الخطة (بلاغ المؤسس).
check(
  'زرّ الضيف يوجّه حسب حالة الضيف لا وجهةً واحدة',
  app.includes('const enterAsGuest = useCallback(')
    && app.includes("setView(isOnboardingComplete(null) ? guardRoute('dashboard', null) : 'setup')")
    && app.includes('onGuest={enterAsGuest}'),
)
check('الضيف المكتمل يمر من حارس المسارات', app.includes('const guestReady = !userId && isOnboardingComplete(null)') && app.includes('!userId && !guestReady'))
check('الشارة تعكس وضع الضيف', app.includes("const badge: AppBadge = uid ? 'account' : 'guest'"))
check('إكمال الضيف محفوظ محليًا', onboarding.includes('completed: true') && onboarding.includes('saveOnboarding({'))

console.log(`\n✅ مدخل الضيف: ${pass} فحوص، 0 فشل.`)
