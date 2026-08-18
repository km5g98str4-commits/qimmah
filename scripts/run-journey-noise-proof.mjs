#!/usr/bin/env node
/**
 * إثبات: استثناء ضجيج الخلفية المزروعة يُحقَّق **بالوجهة** لا بالنصّ.
 *
 * ═══ الفجوة التي يغلقها ═══
 * الرحلات تزرع جلسة برمز وهمي فتردّ الخلفية 401، وكان الاستثناء يُمسك بـ`/401/`.
 * وفي بيئة بلا منفذ خارجي لا يصل النداء أصلًا فيصير `ERR_TUNNEL_CONNECTION_FAILED`
 * — نفس السبب بنصّ آخر. وتوسيع النصّ وحده كان سيبتلع أخطاء حقيقية، فصار العفو
 * مشروطًا بأن تكون **الوجهة مضيف الخلفية المُعلَن**.
 *
 * والتأكيد المضادّ هو جوهر هذا الملفّ (§4.2): كل سطر عفو يقابله سطر **لا يُعفى**.
 */
import { seededBackendNoise, realClientErrors } from './e2e/journeys/lib/kit.mjs'

let pass = 0
const fails = []
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ✓ ${name}`) }
  else { fails.push(name); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`) }
}

const BACKEND = 'https://ledlypcyrtnzvjvhykwz.supabase.co/rest/v1/rpc/my_entitlement'
const FOREIGN = 'https://tracker.example.com/collect'
const OWN = 'http://127.0.0.1:4173/assets/app-123.js'

console.log('\nإثبات ضجيج الرحلات — العفو بالوجهة لا بالنصّ\n')

console.log('① ما يُعفى — وله سبب مُعلَن')
check('401 من مضيف الخلفية يُعفى',
  seededBackendNoise(`Failed to load resource: the server responded with a status of 401 () @ ${BACKEND}`))
check('تعذّر النفق إلى مضيف الخلفية يُعفى',
  seededBackendNoise(`Failed to load resource: net::ERR_TUNNEL_CONNECTION_FAILED @ ${BACKEND}`))
check('تعذّر تحليل الاسم إلى مضيف الخلفية يُعفى',
  seededBackendNoise(`Failed to load resource: net::ERR_NAME_NOT_RESOLVED @ ${BACKEND}`))

console.log('\n② التأكيد المضادّ — ما **لا** يُعفى مهما شابه')
check('⚔️ نفس رمز العطل إلى مضيف أجنبي **لا** يُعفى',
  !seededBackendNoise(`Failed to load resource: net::ERR_TUNNEL_CONNECTION_FAILED @ ${FOREIGN}`),
  'وجهة غير الخلفية عُفي عنها — الاستثناء صار قاعدة')
check('⚔️ ٤٠٤ من أصل التطبيق نفسه **لا** يُعفى',
  !seededBackendNoise(`Failed to load resource: the server responded with a status of 404 () @ ${OWN}`))
check('⚔️ خطأ جافاسكربت حقيقي **لا** يُعفى',
  !seededBackendNoise('TypeError: Cannot read properties of undefined (reading map)'))
check('⚔️ عطل شبكة بلا وجهة مذكورة **لا** يُعفى',
  !seededBackendNoise('Failed to load resource: net::ERR_TUNNEL_CONNECTION_FAILED'),
  'العفو بلا وجهة يعيد الاستثناء النصّي الذي أُلغي')
check('⚔️ ٤٠١ من مضيف أجنبي **لا** يُعفى',
  !seededBackendNoise(`Failed to load resource: the server responded with a status of 401 () @ ${FOREIGN}`),
  'الوجهة الأجنبية عُفي عنها لمجرّد الرقم')
check('⚔️ نصّ يذكر supabase داخل رسالة خطأ لا في الوجهة **لا** يُعفى',
  !seededBackendNoise('TypeError: supabase.co client failed @ ' + OWN))

console.log('\n③ المصفاة المجمَّعة تُبقي الحقيقي وتطرح المُعلَن')
const mixed = [
  `Failed to load resource: net::ERR_TUNNEL_CONNECTION_FAILED @ ${BACKEND}`,
  'TypeError: plan is not iterable',
  `Failed to load resource: the server responded with a status of 401 () @ ${BACKEND}`,
  `Failed to load resource: net::ERR_TUNNEL_CONNECTION_FAILED @ ${FOREIGN}`,
]
const real = realClientErrors(mixed)
check('تبقى الأخطاء الحقيقية وحدها', real.length === 2, `بقي ${real.length}`)
check('الخطأ البرمجي ضمن الباقي', real.some((e) => /TypeError/.test(e)))
check('عطل المضيف الأجنبي ضمن الباقي', real.some((e) => e.includes(FOREIGN)))

console.log(`\n${fails.length === 0 ? '✅' : '❌'} ${pass} نجحت / ${fails.length} فشلت`)
if (fails.length) { fails.forEach((f) => console.log(`   • ${f}`)); process.exit(1) }
