// إثبات تنبيه الحساسيات (RC v1.2.0).
//
// الفجوة المُثبَتة: الإعداد يجمع `foodPreferences.allergies` ولا يقرأها أحد —
// لا nutritionPlan ولا planGenerator ولا mealTemplates ولا dietFilter (هذا الأخير
// يفلتر نمط الأكل فقط، لا مسبّبات الحساسية). الفلترة الحقيقية تحتاج وسم كل صنف
// غذائي بمسبّباته. حتى ذلك الحين نُظهر تحذيرًا صادقًا بدل الصمت.
//
// هذا الإثبات يحرس أمرين: أن التحذير مركَّب فعلًا على شاشة التغذية، وأن نصّه
// يبقى صادقًا — أي لا يدّعي أن الخطة تستبعد المسبّبات.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { strict as assert } from 'node:assert'

const root = resolve(import.meta.dirname, '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')
let pass = 0
const check = (label, cond) => { assert.ok(cond, `FAIL: ${label}`); pass++; console.log(`  ✓ ${label}`) }

console.log('════════ إثبات تنبيه الحساسيات — قِمّة ════════')

const comp = read('src/components/AllergyNotice.tsx')
const view = read('src/views/NutritionV2.tsx')
const dict = read('src/i18n/dict/nutritionScreen.ts')

console.log('\n═══ 1) التركيب ═══')
check('شاشة التغذية تستورد التحذير', /import \{ AllergyNotice \} from '@\/components\/AllergyNotice'/.test(view))
check('شاشة التغذية تركّبه فعلًا', /<AllergyNotice lang=\{lang\} \/>/.test(view))

console.log('\n═══ 2) لا يظهر بلا سبب ═══')
check('يقرأ الحساسيات من ملفّ الإعداد', /profile\?\.foodPreferences\?\.allergies \?\? \[\]/.test(comp))
check('لا يعرض شيئًا لمن لم يسجّل حساسية', /if \(!allergies\.length\) return null/.test(comp))

console.log('\n═══ 3) لا نصوص مكتوبة داخل المكوّن (قاعدة المشروع) ═══')
// أي نص عربي حرفي داخل JSX مخالفة — كل النصوص من القاموس.
const jsx = comp.slice(comp.indexOf('return ('))
check('لا نص عربي حرفي داخل JSX', !/>[^<>{}]*[؀-ۿ][^<>{}]*</.test(jsx))
check('النصوص تُقرأ من قاموس شاشة التغذية', /nutritionScreenStrings\[lang\]/.test(comp))

console.log('\n═══ 4) النصوص معرّفة في اللغتين ═══')
for (const key of ['allergyNoticeTitle', 'allergyNoticeBodyPrefix', 'allergyNoticeBodySuffix', 'allergyNoticeSeparator']) {
  const uses = (dict.match(new RegExp(`\\b${key}:`, 'g')) || []).length
  check(`«${key}» في النوع والعربية والإنجليزية`, uses === 3)
}

console.log('\n═══ 5) النصّ صادق — لا يدّعي فلترة غير موجودة ═══')
check('النص العربي يقول صراحةً إن الخطة لا تستبعدها', /ما تستبعدها تلقائيًا بعد/.test(dict))
check('النص الإنجليزي يقول الشيء نفسه', /does not exclude these automatically yet/.test(dict))
// الادّعاء المحظور: أن الخطة آمنة أو خالية من المسبّبات.
check('لا ادّعاء بأن الخطة آمنة/خالية', !/آمنة تمامًا|خالية من مسبّبات|allergen-free|safe for you/i.test(dict))

console.log('\n═══ 6) الفجوة التي يغطّيها ما زالت قائمة ═══')
// إن صار هناك فلترة حقيقية للحساسيات، يجب تحديث هذا التحذير — يسقط الفحص عمدًا.
const consumers = ['src/lib/nutritionPlan.ts', 'src/lib/dietFilter.ts']
for (const f of consumers) {
  let s = ''
  try { s = read(f) } catch { continue }
  check(`${f.replace('src/lib/', '')} ما زال لا يقرأ allergies (وإلا حدِّث التحذير)`, !/allergies/.test(s))
}

console.log(`\n✅ إثبات تنبيه الحساسيات: ${pass} فحصًا، 0 فشل.`)
