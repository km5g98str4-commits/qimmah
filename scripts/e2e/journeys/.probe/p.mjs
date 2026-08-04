import { chromium } from 'playwright'
import { startApp } from '../lib/kit.mjs'
const app = await startApp(5312)
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:420,height:912}, locale:'ar-SA' })
await p.goto(app.url, { waitUntil:'networkidle' }); await p.waitForTimeout(500)
await p.getByRole('button', { name:'ابدأ الآن' }).first().click().catch(()=>{})
await p.waitForTimeout(800)
const info = await p.evaluate(() => ({
  buttons: [...document.querySelectorAll('button')].map(b=>({t:(b.innerText||'').trim().slice(0,40), dis:b.getAttribute('aria-disabled'), type:b.type})),
  inputs: [...document.querySelectorAll('input')].map(i=>({type:i.type, im:i.getAttribute('inputmode'), aria:i.getAttribute('aria-label'), id:i.id})),
  h: [...document.querySelectorAll('h1,h2')].map(x=>x.innerText.trim()),
}))
console.log(JSON.stringify(info,null,1))
await b.close(); app.server.kill(); process.exit(0)
