#!/usr/bin/env node
/**
 * إثبات: تصنيف أخطاء الرحلات يُحقَّق **بالمصدر المرصود** لا بالنصّ.
 *
 * ═══ الفجوة التي يغلقها ═══
 * الرحلات تزرع جلسة برمز وهمي، فتردّ الخلفية ٤٠١ حيث توجد شبكة، وتسقط بـ`net::ERR_*`
 * حيث لا توجد. الحالتان أثر أداة اختبار لا عطل منتج. وتجاوزهما بمطابقة نصّية على
 * «401» أو «Failed to load resource» يبتلع معهما أي عطل حقيقي بنفس الصياغة.
 *
 * فـ`classifyClientErrors` تربط العفو بمصدره: البصمات تُجمع من **الطلبات الفعلية**
 * وتُقسَّم بأصل التطبيق. وما يُعفى هو ما رُصد خارج التطبيق **ولم يُرصد داخله**.
 *
 * ═══ ولماذا وُجد هذا الملفّ ═══
 * الآلية أعلاه أقوى من سابقتها (لا تُثبِّت اسم مضيف ولا قائمة رموز)، لكنها هبطت
 * **بلا حارس** — لا ملفّ في المستودع يهاجمها. و§4.2 لا تقبل إحكامًا لم يُهاجَم.
 * فالتأكيد المضادّ هو جوهر ما هنا: كل سطر عفو يقابله سطر **لا يُعفى**.
 */
import { classifyClientErrors } from './e2e/journeys/lib/kit.mjs'

let pass = 0
const fails = []
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ✓ ${name}`) }
  else { fails.push(name); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`) }
}

const APP = 'http://127.0.0.1:4173'
const BACKEND = 'https://ledlypcyrtnzvjvhykwz.supabase.co/rest/v1/rpc/my_entitlement'
const FOREIGN = 'https://tracker.example.com/collect'
const OWN = `${APP}/assets/app-123.js`

const failed = (url, signature) => ({ url, signature })
const res = (e) => `Failed to load resource: the server responded with a status of ${e} ()`
const net = (e) => `Failed to load resource: net::${e}`

console.log('\nإثبات ضجيج الرحلات — العفو بالمصدر المرصود لا بالنصّ\n')

console.log('① ما يُعفى — وله سبب مُعلَن ومرصود')
{
  const network = [failed(BACKEND, '401')]
  check('٤٠١ من الخلفية — مرصود خارج التطبيق — يُعفى',
    classifyClientErrors([res('401')], network, APP).real.length === 0)
}
{
  const network = [failed(BACKEND, 'net::ERR_TUNNEL_CONNECTION_FAILED')]
  check('تعذّر النفق إلى الخلفية يُعفى',
    classifyClientErrors([net('ERR_TUNNEL_CONNECTION_FAILED')], network, APP).real.length === 0)
}

console.log('\n② التأكيد المضادّ — ما **لا** يُعفى مهما شابه')
{
  // نفس البصمة رُصدت على أصل التطبيق أيضًا ⇒ العفو ممنوع، وإلا غطّى عطل التطبيق.
  const network = [failed(BACKEND, '401'), failed(OWN, '401')]
  check('⚔️ بصمة رُصدت على أصل التطبيق كذلك **لا** تُعفى',
    classifyClientErrors([res('401')], network, APP).real.length === 1,
    'عُفي عن بصمة ظهرت داخل التطبيق — الاستثناء صار قاعدة')
}
{
  const network = [failed(OWN, '404')]
  check('⚔️ ٤٠٤ من أصل التطبيق نفسه **لا** يُعفى',
    classifyClientErrors([res('404')], network, APP).real.length === 1)
}
{
  const network = [failed(BACKEND, '401')]
  check('⚔️ خطأ جافاسكربت حقيقي **لا** يُعفى ولو رافقه ضجيج مرصود',
    classifyClientErrors(['TypeError: Cannot read properties of undefined (reading map)'], network, APP).real.length === 1)
}
{
  // بصمة لم تُرصد في الشبكة إطلاقًا ⇒ لا سند للعفو.
  check('⚔️ خطأ ببصمة غير مرصودة **لا** يُعفى',
    classifyClientErrors([res('503')], [failed(BACKEND, '401')], APP).real.length === 1,
    'عُفي عن خطأ لا يقابله طلب مرصود')
}
{
  check('⚔️ شبكة فارغة لا تُعفي شيئًا',
    classifyClientErrors([res('401'), net('ERR_TUNNEL_CONNECTION_FAILED')], [], APP).real.length === 2,
    'العفو بلا رصد يعيد الاستثناء النصّي الذي أُلغي')
}
{
  // مضيف أجنبي ليس الخلفية — يُعفى لأنه خارج التطبيق، وهذا **مقصود ومعلَن**:
  // القاعدة «خارج أصل التطبيق»، لا «الخلفية بالاسم». فيُثبَّت السلوك صراحةً
  // كي لا يتغيّر صامتًا، ويبقى مقروءًا في المخرجات عبر offAppSignatures.
  const out = classifyClientErrors([net('ERR_NAME_NOT_RESOLVED')], [failed(FOREIGN, 'net::ERR_NAME_NOT_RESOLVED')], APP)
  check('مضيف أجنبي خارج التطبيق يُعفى — والبصمة تُعلَن في المخرجات',
    out.real.length === 0 && out.offAppSignatures.includes('net::ERR_NAME_NOT_RESOLVED'))
}

console.log('\n③ القسمة المجمَّعة تُبقي الحقيقي وتطرح المُعلَن')
{
  const network = [failed(BACKEND, '401'), failed(BACKEND, 'net::ERR_TUNNEL_CONNECTION_FAILED'), failed(OWN, '500')]
  const errors = [res('401'), 'TypeError: plan is not iterable', net('ERR_TUNNEL_CONNECTION_FAILED'), res('500')]
  const out = classifyClientErrors(errors, network, APP)
  check('تبقى الأخطاء الحقيقية وحدها', out.real.length === 2, `بقي ${out.real.length}`)
  check('الخطأ البرمجي ضمن الباقي', out.real.some((e) => /TypeError/.test(e)))
  check('عطل أصل التطبيق (٥٠٠) ضمن الباقي', out.real.some((e) => e.includes('500')))
  check('المُعلَن يُعدّ ويُعرَض لا يُبتلع', out.declared.length === 2)
  check('القسمة لا تفقد خطأً ولا تكرّره', out.real.length + out.declared.length === errors.length)
}

console.log(`\n${fails.length === 0 ? '✅' : '❌'} ${pass} نجحت / ${fails.length} فشلت`)
if (fails.length) { fails.forEach((f) => console.log(`   • ${f}`)); process.exit(1) }
