import { chromium } from 'playwright'
import { startApp, seedSession } from '../lib/kit.mjs'
import { loadJourneyCopy } from '../lib/journey-copy.mjs'
const app = await startApp(5315)
const copy = await loadJourneyCopy()
const t = copy.onboarding('ar'); const intent = copy.intent('ar'); const body = copy.body('ar')
const bg = copy.goalWording('ar','beginner')
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:420,height:912}, locale:'ar-SA' })
await seedSession(p)
await p.goto(app.url, { waitUntil:'networkidle' }); await p.waitForTimeout(700)
await p.getByRole('button', { name:/ابدأ|Start/ }).first().click().catch(()=>{}); await p.waitForTimeout(700)
const next = p.getByRole('button', { name: t.next }).first()
await p.getByRole('checkbox').first().check()
const nums = p.locator('input[inputmode="numeric"]')
await nums.nth(0).fill('28'); await nums.nth(1).fill('178'); await nums.nth(2).fill('82')
await p.getByRole('button',{name:body.genderMale}).first().click()
await next.click(); await p.waitForTimeout(400)
await p.getByRole('button',{name:new RegExp(intent.intents[0].label)}).first().click()
await p.getByRole('button',{name:new RegExp(intent.levels.find(l=>l.value==='beginner').label)}).first().click()
await next.click(); await p.waitForTimeout(400)
await p.getByRole('button',{name:new RegExp(bg.cut.label)}).first().click()
await next.click(); await p.waitForTimeout(400)
await next.click(); await p.waitForTimeout(400)
await p.getByRole('button',{name:t.places.find(x=>x.value==='gym').label, exact:true}).first().click()
await p.getByRole('button',{name:t.prefs.find(x=>x.value==='mixed').label, exact:true}).first().click()
await p.getByRole('button',{name:t.equipment.cta}).first().click(); await p.waitForTimeout(1500)
const before = await p.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('qimmah:')).sort())
console.log('KEYS AFTER PLAN READY:', JSON.stringify(before,null,1))
await p.getByRole('button',{name:t.ready.enter}).first().click(); await p.waitForTimeout(1000)
const after = await p.evaluate(()=>{
  const keys = Object.keys(localStorage).filter(k=>k.startsWith('qimmah:')).sort()
  const grab = (k)=>{ const v=localStorage.getItem(k); return v? v.slice(0,220):null }
  return { keys, onboarding: grab(keys.find(k=>/onboarding/i.test(k))||''), plan: grab(keys.find(k=>/plan|routine|customization/i.test(k))||'') }
})
console.log('AFTER ENTER:', JSON.stringify(after,null,1))
await p.getByRole("button",{name:"التمارين",exact:true}).last().click().catch(()=>{})
await p.waitForTimeout(1400)
console.log("WORKOUT SCREEN:", JSON.stringify(await p.evaluate(()=>({
  hash: location.hash,
  text: document.body.innerText.replace(/\s+/g," ").slice(0,240),
  calendar: (localStorage.getItem("qimmah:workoutCalendar:v1")||"").slice(0,260),
})),null,1))
await b.close(); app.server.kill(); process.exit(0)
