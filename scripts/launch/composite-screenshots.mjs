import { execFileSync } from 'node:child_process'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const input = resolve(root, 'docs/appstore/screenshots/raw')
const output = resolve(root, 'docs/appstore/screenshots/final-ar')
mkdirSync(output, { recursive: true })
const shots = [['01-welcome.png','ابدأ رحلتك بوضوح'],['02-today.png','تابع يومك بثقة'],['03-workout.png','سجّل تمرينك فورًا'],['04-nutrition.png','أضف وجبتك بسهولة'],['05-progress.png','شاهد تقدّمك بصدق'],['06-profile.png','اجمع إنجازاتك هنا']]
for (const [file, caption] of shots) {
  const data = readFileSync(resolve(input, file)).toString('base64')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1260" height="2736"><rect width="1260" height="2736" fill="#101216"/><image href="data:image/png;base64,${data}" x="0" y="180" width="1260" height="2556" preserveAspectRatio="xMidYMid slice"/><rect width="1260" height="260" fill="#101216"/><text x="630" y="155" text-anchor="middle" direction="rtl" fill="#fff" font-family="Tajawal,Arial" font-size="72" font-weight="800">${caption}</text><circle cx="1120" cy="128" r="20" fill="#F0512A"/></svg>`
  const tmp = resolve(output, file.replace('.png', '.svg'))
  writeFileSync(tmp, svg)
  execFileSync('sips', ['-s','format','png',tmp,'--out',resolve(output,file)], { stdio: 'ignore' })
}
console.log('6 captioned App Store screenshots rendered at 1260x2736')
