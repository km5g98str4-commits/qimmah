import { chromium } from 'playwright'
import { startApp, seedSession } from '../lib/kit.mjs'
const app = await startApp(5314)
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:420,height:912}, locale:'ar-SA' })
await seedSession(p)
await p.goto(app.url, { waitUntil:'networkidle' }); await p.waitForTimeout(700)
const dump = async (label) => {
  const d = await p.evaluate(() => ({
    hash: location.hash,
    h: [...document.querySelectorAll('h1,h2,h3')].map(x=>x.innerText.trim()).slice(0,6),
    btns: [...document.querySelectorAll('button')].map(b=>(b.innerText||'').trim().replace(/\s+/g,' ')).filter(Boolean).slice(0,20),
    inputs: [...document.querySelectorAll('input')].map(i=>({t:i.type, im:i.getAttribute('inputmode'), ph:i.placeholder, aria:i.getAttribute('aria-label')})),
    nav: [...document.querySelectorAll('nav a, nav button, [role=tablist] *')].map(x=>(x.innerText||'').trim()).filter(Boolean).slice(0,10),
  }))
  console.log(`\n--- ${label} ---\n`, JSON.stringify(d,null,1))
}
for (const h of ['#/workout','#/nutrition']) {
  await p.goto(`${app.url}/${h}`, { waitUntil:'domcontentloaded' }); await p.waitForTimeout(1000); await dump(h)
}
await b.close(); app.server.kill(); process.exit(0)
