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

const app = read('src/App.tsx')
const routes = read('src/lib/appRoutes.ts')
const view = read('src/views/AccountRequiredView.tsx')
const strings = read('src/config/strings.ts')

console.log('\nإثبات حالة الحساب المطلوبة للمسارات المحمية')
check('الحارس يحوّل الزائر إلى حالة حساب مطلوبة لا 404', app.includes("return 'accountRequired'") && app.includes("view !== 'accountRequired'"))
check('الحالة الجديدة ليست مسار 404 عامًا', routes.includes("| 'accountRequired'") && view.includes('t.accountRequired.title') && !view.includes('t.notFound.title'))
check('الحالة تعرض تسجيل الدخول والضيف', view.includes('onLogin') && view.includes('onGuest') && view.includes('t.accountRequired.login') && view.includes('t.accountRequired.guest'))
check('النص يشرح الحساب والضيف بالعربية والإنجليزية', strings.includes("title: 'هالمسار يحتاج حساب'") && strings.includes("title: 'This path needs an account'"))
check('زر الضيف يعيد استخدام الإعداد المحلي', app.includes("onGuest={() => setView('setup')}") && view.includes('onGuest'))

console.log(`\n✅ حالة الحساب المطلوبة: ${pass} فحوص، 0 فشل.`)
