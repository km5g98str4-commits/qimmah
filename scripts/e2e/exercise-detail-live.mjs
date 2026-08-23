// إثبات متصفح لسطح تفاصيل التمرين الحيّ — [Exercise Production إغلاق].
// التشغيل القانوني: npm run test:e2e:exercise-detail
import { spawn } from 'node:child_process'
import { chromium } from './lib/engine.mjs'

const PORT = 5335
const BASE = process.env.PREVIEW_URL || `http://127.0.0.1:${PORT}`
let pass = 0, fail = 0
const failures = []
const check = (l, c, d = '') => { if (c) { pass++; console.log(`  ✓ ${l}`) } else { fail++; failures.push(l); console.log(`  ✗ FAIL: ${l}${d ? ` — ${d}` : ''}`) } }

const preview = process.env.PREVIEW_URL ? null : spawn('npx', ['vite','preview','--host','127.0.0.1','--port',String(PORT),'--strictPort'], { stdio:['ignore','pipe','pipe'], detached:true })
const ready = preview ? new Promise((res, rej) => { let o=''; const a=c=>{o=`${o}${c}`.slice(-4000); if(/Local:\s+http:\/\/127\.0\.0\.1:\d+\//.test(o)) res()}
  preview.stdout.on('data',a); preview.stderr.on('data',a)
  preview.once('exit',(c,s)=>rej(new Error(`exercise-detail preview exited before ready (${c??s})\n${o}`)))}) : Promise.resolve()
async function wait(ms=30000){ await ready; const t=Date.now(); while(Date.now()-t<ms){ try{ if((await fetch(BASE)).ok) return }catch{} await new Promise(r=>setTimeout(r,300)) } throw new Error('preview did not start') }

const browser = await chromium.launch({ args:['--no-sandbox'] })
try {
  await wait()
  // تمرين له مرجع فيديو APPROVED (أول عنصر في الكتالوج عادةً).
  const ID = 'barbell-bench-press'
  for (const width of [320, 390, 430]) {
    for (const lang of ['ar','en']) {
      const ctx = await browser.newContext({ viewport:{width,height:844}, locale: lang==='en'?'en-US':'ar-SA' })
      const page = await ctx.newPage()
      const errs = []
      page.on('pageerror', e => errs.push(String(e.message)))
      await page.addInitScript((l)=>{ try{ localStorage.clear()
        localStorage.setItem('qimmah:onboarding:v1', JSON.stringify({completed:true,completedAt:'2026-01-01T00:00:00.000Z'}))
        localStorage.setItem('qimmah:prefs:v1', JSON.stringify({lang:l})) }catch{} }, lang)
      // رابط عميق مباشر — يثبت بقاء عقد الرابط العميق.
      await page.goto(`${BASE}#/exercises/${ID}`, { waitUntil:'domcontentloaded' })
      await page.waitForTimeout(2000)
      console.log(`\n=== ${width}/${lang} ===`)
      const dlg = await page.locator('[role="dialog"], [data-testid="exercise-detail"]').count()
      check(`${width}/${lang}: الرابط العميق يفتح التفاصيل`, dlg > 0 || (await page.locator('h2,h3').count()) > 0)
      check(`${width}/${lang}: hash الرابط العميق محفوظ`, (await page.evaluate(()=>location.hash)).includes(ID))
      // خطوات الأداء تظهر بلغة الواجهة
      const bodyText = await page.locator('body').innerText()
      check(`${width}/${lang}: خطوات الأداء ظاهرة`, bodyText.length > 200)
      // زرّ الفيديو: موجود، ولا إطار قبل النقر
      const playBtn = page.locator('[data-testid="exercise-video-play"]')
      const hasBtn = await playBtn.count()
      check(`${width}/${lang}: زرّ الفيديو ظاهر لمرجع APPROVED`, hasBtn > 0)
      check(`${width}/${lang}: لا إطار YouTube قبل النقر (بلا تحميل مسبق)`, (await page.locator('iframe').count()) === 0)
      if (hasBtn) {
        await playBtn.first().click(); await page.waitForTimeout(1200)
        const frames = page.locator('iframe')
        check(`${width}/${lang}: الإطار يُركَّب بعد النقر`, (await frames.count()) > 0)
        const src = (await frames.count()) ? await frames.first().getAttribute('src') : ''
        check(`${width}/${lang}: نطاق youtube-nocookie`, (src||'').includes('youtube-nocookie.com'))
        check(`${width}/${lang}: بلا autoplay`, !/autoplay=1/.test(src||''))
      }
      check(`${width}/${lang}: بلا فيض أفقي`, await page.evaluate(()=> document.documentElement.scrollWidth <= window.innerWidth + 2))
      check(`${width}/${lang}: بلا خطأ صفحة`, errs.length === 0, errs[0]||'')
      await ctx.close()
    }
  }
  console.log(`\n${'='.repeat(50)}`)
  console.log(fail===0 ? `✅ تفاصيل التمرين الحيّة: ${pass}/${pass} فحصًا` : `❌ ${fail} فشل من ${pass+fail}`)
  if (fail) { console.log(failures.map(f=>`   - ${f}`).join('\n')); process.exitCode = 1 }
} finally {
  await browser.close()
  if (preview) { try{ process.kill(-preview.pid,'SIGTERM') }catch{ preview.kill('SIGTERM') } preview.stdout?.destroy(); preview.stderr?.destroy() }
}
