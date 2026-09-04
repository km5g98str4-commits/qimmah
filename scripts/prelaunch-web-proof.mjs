// Permanent source-contract proof for the low-risk prelaunch web repairs.
// Every repaired contract is attacked by mutating the audited source below.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
let pass = 0
let fail = 0
const check = (label, condition) => {
  if (condition) {
    pass++
    console.log(`  ✓ ${label}`)
  } else {
    fail++
    console.error(`  ✗ FAIL: ${label}`)
  }
}

function audit({ html, app, shell, nutrition }) {
  const viewport = html.match(/<meta name="viewport" content="([^"]+)"/i)?.[1] ?? ''
  const jsonText = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)?.[1]
  let schema = null
  try { schema = jsonText ? JSON.parse(jsonText) : null } catch { schema = null }
  return {
    zoomAllowed: viewport.length > 0 && !/maximum-scale\s*=|user-scalable\s*=\s*no/i.test(viewport),
    schemaTruth: schema?.isAccessibleForFree === false &&
      schema?.hasPart?.isAccessibleForFree === true &&
      schema?.offers?.price === '19.99' && schema?.offers?.priceCurrency === 'SAR',
    oneSkipLink: (app.match(/href="#main-content"/g) ?? []).length === 1 &&
      (shell.match(/href="#main-content"/g) ?? []).length === 0,
    skipDoesNotRoute: /href="#main-content"[\s\S]{0,300}event\.preventDefault\(\)[\s\S]{0,300}getElementById\('main-content'\)\?\.focus/.test(app),
    oneShellMain: (shell.match(/<main\b/g) ?? []).length === 1 &&
      (shell.match(/id="main-content"/g) ?? []).length === 1 &&
      /const ContentRoot = contentOwnsMainTarget \? 'div' : 'main'/.test(app) &&
      /id=\{contentOwnsMainTarget \? undefined : 'main-content'\}/.test(app) &&
      /contentOwnsMainTarget = true[\s\S]{0,500}content = \(/.test(app),
    waterNamed: /<label htmlFor="custom-water-amount"[^>]*>\{t\.customWater\}<\/label>[\s\S]{0,160}<input[\s\S]{0,80}id="custom-water-amount"/.test(nutrition),
    waterValidation: /aria-invalid=\{ml !== '' && !valid/.test(nutrition) &&
      /aria-describedby=\{ml !== '' && !valid \? 'custom-water-msg'/.test(nutrition) &&
      /id="custom-water-msg" role="alert"/.test(nutrition),
  }
}

const source = {
  html: read('index.html'),
  app: read('src/App.tsx'),
  shell: read('src/components/MobileShell.tsx'),
  nutrition: read('src/views/NutritionView.tsx'),
}
const result = audit(source)

console.log('\n① live repaired contracts')
for (const [name, ok] of Object.entries(result)) check(name, ok)

console.log('\n② anti-bypass attacks')
const attacks = [
  ['zoom lock is caught', { ...source, html: source.html.replace('initial-scale=1.0, viewport-fit=cover', 'initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover') }, 'zoomAllowed'],
  ['free whole-product/zero-price lie is caught', { ...source, html: source.html.replace('"isAccessibleForFree": false', '"isAccessibleForFree": true').replace('"price": "19.99"', '"price": "0"') }, 'schemaTruth'],
  ['duplicate shell skip link is caught', { ...source, shell: `${source.shell}\n<a href="#main-content">duplicate</a>` }, 'oneSkipLink'],
  ['hash-routing regression is caught', { ...source, app: source.app.replace('event.preventDefault()', 'void event') }, 'skipDoesNotRoute'],
  ['duplicate shell main landmark is caught', { ...source, shell: `${source.shell}\n<main>duplicate</main>` }, 'oneShellMain'],
  ['duplicate app skip target is caught', { ...source, app: source.app.replace("id={contentOwnsMainTarget ? undefined : 'main-content'}", 'id="main-content"') }, 'oneShellMain'],
  ['placeholder-only water field is caught', { ...source, nutrition: source.nutrition.replace('htmlFor="custom-water-amount"', 'htmlFor="wrong-water-id"') }, 'waterNamed'],
  ['water validation disconnect is caught', { ...source, nutrition: source.nutrition.replace("'custom-water-msg'", "'wrong-water-msg'") }, 'waterValidation'],
]
for (const [label, attacked, key] of attacks) check(label, audit(attacked)[key] === false)

console.log(`\n${'─'.repeat(46)}`)
if (fail) {
  console.error(`❌ prelaunch web proof failed: ${fail}/${pass + fail}`)
  process.exit(1)
}
console.log(`✅ prelaunch web proof passed: ${pass}/${pass + fail}`)
