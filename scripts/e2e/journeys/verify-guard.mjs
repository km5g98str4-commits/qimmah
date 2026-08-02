// أداة تشخيص — **ليست بوابة ولا رحلة**.
//
// تطبع ما يحدث فعلًا لكل مسار عند زائر بلا جلسة: الهاش النهائي، وهل عُرضت
// «الصفحة غير موجودة»، والعنوان الظاهر — عند ثلاث لحظات زمنية.
//
// لماذا بقيت في المستودع: بها التقطتُ خطأً في تقريري أنا. كنتُ فحصتُ
// «#/today» و«#/onboarding» وهما ليسا اسمي مسارين في src/lib/appRoutes.ts
// (الصحيح `dashboard` و`setup`)، فقرأتُ ٤٠٤ المسار المجهول حجبًا مضلّلًا
// ورفعته التقاطةً حمراء. وهذه الأداة أثبتت العكس: `#/workout` يُعاد توجيهه
// إلى `#/start` — الحارس يعمل.
//
// **اسم مسار مخترَع يُنتج بلاغًا أحمر كاذبًا**، وكلفة ذلك حارةٌ كاملة تطارد
// عطلًا لا وجود له. تُشغَّل عند أي شكّ في الحراسة قبل رفع أي بلاغ:
//   node scripts/e2e/journeys/verify-guard.mjs

import { chromium } from 'playwright'
import { startApp, groundStamp } from './lib/kit.mjs'
const app = await startApp(5331)
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:420,height:912}, locale:'ar-SA' })
console.log('📍 الأرض:', JSON.stringify(groundStamp()))
await p.goto(app.url, { waitUntil:'networkidle' }); await p.waitForTimeout(800)
for (const route of ['#/today','#/onboarding','#/workout','#/settings']) {
  await p.evaluate((r)=>{ location.hash = r }, route)
  for (const ms of [300, 900, 2000]) {
    await p.waitForTimeout(ms === 300 ? 300 : ms - (ms === 900 ? 300 : 900))
    const s = await p.evaluate(()=>({ hash: location.hash, notFound: document.body.innerText.includes('الصفحة غير موجودة'), head: (document.querySelector('h1,h2')||{}).innerText || '' }))
    console.log(`${route} @${ms}ms →`, JSON.stringify(s))
  }
}
await b.close(); app.server.kill(); process.exit(0)
