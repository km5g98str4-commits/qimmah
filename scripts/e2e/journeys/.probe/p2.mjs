import { chromium } from 'playwright'
import { startApp } from '../lib/kit.mjs'
const app = await startApp(5313)
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:420,height:912}, locale:'ar-SA' })
await p.goto(app.url, { waitUntil:'networkidle' }); await p.waitForTimeout(600)
const dump = async (label) => {
  const d = await p.evaluate(() => ({
    hash: location.hash,
    h: [...document.querySelectorAll('h1,h2')].map(x=>x.innerText.trim()).slice(0,4),
    btns: [...document.querySelectorAll('button,a')].map(b=>(b.innerText||'').trim().replace(/\s+/g,' ').slice(0,45)).filter(Boolean),
  }))
  console.log(`--- ${label} ---`, JSON.stringify(d))
}
await dump('welcome')
// جرّب مسار الضيف من شاشة التسجيل
await p.getByRole('button', { name:'ابدأ الآن' }).first().click().catch(()=>{})
await p.waitForTimeout(700); await dump('after start')
// هل يوجد ضيف في أي مكان؟
const guest = p.getByRole('button', { name:/ضيف|Guest/ }).first()
console.log('guest visible on signup:', await guest.isVisible().catch(()=>false))
// جرّب المسار المباشر
await p.goto(`${app.url}/#/onboarding`, { waitUntil:'domcontentloaded' }); await p.waitForTimeout(700); await dump('#/onboarding')
await p.goto(`${app.url}/#/today`, { waitUntil:'domcontentloaded' }); await p.waitForTimeout(700); await dump('#/today')
await b.close(); app.server.kill(); process.exit(0)
