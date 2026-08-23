#!/usr/bin/env node
/**
 * إثبات حدّ تفعيل QA — يُفتح في معاينة المؤسس، ويستحيل في الإنتاج.
 *
 * ═══ لماذا وُجد ═══
 * فحص المؤسس الحيّ على iPhone توقّف عند «هذي نسخة مراجعة — بلا حسابات»: تعذّر
 * عليه بلوغ أي فعل مدفوع، فتعذّرت مراجعة نصف المنتج. والآلية كانت موجودة
 * (`VITE_ENTITLEMENT_MODE=mock`) لكنها **بناءٌ آخر** لا يصل المؤسس.
 *
 * فوُسِّع الفتح ليشمل `VITE_APP_ENV=founder_preview`. وهذا الملفّ يثبت أن
 * التوسعة **لا تتسرّب**: يبني الأرتيفكتين فعلًا ويفتّش بايتاتهما — لا يقرأ
 * شرطًا في مصدر ويصدّقه.
 *
 * التشغيل: node scripts/run-founder-qa-boundary-proof.mjs
 */
import { execFileSync } from 'node:child_process'
import { readdirSync, statSync, readFileSync, rmSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0
const fails = []
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`) }
  else { fails.push(name); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`) }
}

const walk = (dir, acc = []) => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, acc)
    else acc.push(p)
  }
  return acc
}
const countFilesWith = (dir, needle) =>
  walk(dir).filter((f) => { try { return readFileSync(f, 'utf8').includes(needle) } catch { return false } }).length

const build = (outDir, env) => {
  rmSync(resolve(ROOT, outDir), { recursive: true, force: true })
  execFileSync('npx', ['vite', 'build', '--outDir', outDir, '--emptyOutDir'], {
    cwd: ROOT, stdio: 'ignore', env: { ...process.env, ...env },
  })
  return resolve(ROOT, outDir)
}

console.log('\n① بناء المعاينة — مسار QA حاضر ومعلَن')
const previewDir = build('.qa-boundary/preview', { VITE_APP_ENV: 'founder_preview' })
const QA_CODE = 'QIMMAH-TEST-OK'
const MOCK_KEY = 'qimmah:entitlement-mock'
check('كود QA حاضر في أرتيفكت المعاينة', countFilesWith(previewDir, QA_CODE) >= 1,
  `${countFilesWith(previewDir, QA_CODE)} ملفًّا`)
check('مخزن التقليد حاضر في المعاينة', countFilesWith(previewDir, MOCK_KEY) >= 1)
check('وسم البيئة يعلن المعاينة',
  readFileSync(join(previewDir, 'index.html'), 'utf8').includes('content="founder_preview"'))
check('ولا عنوان مشروع إنتاجي في المعاينة', countFilesWith(previewDir, 'ledlypcyrtnzvjvhykwz') === 0)
check('ولا مفتاح anon إنتاجي', countFilesWith(previewDir, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9') === 0)

console.log('\n② التأكيد المضادّ — بناء الإنتاج يستحيل فيه التفعيل')
const prodDir = build('.qa-boundary/prod', { VITE_APP_ENV: '' })
check('⚔️ كود QA **غائب تمامًا** من الإنتاج — لا موجودًا معطَّلًا', countFilesWith(prodDir, QA_CODE) === 0,
  `${countFilesWith(prodDir, QA_CODE)} ملفًّا`)
check('⚔️ ومخزن التقليد غائب', countFilesWith(prodDir, MOCK_KEY) === 0)
check('⚔️ وبقيّة أكواد الاختبار غائبة', countFilesWith(prodDir, 'QIMMAH-TEST-USED') === 0)
check('⚔️ ووسم البيئة لا يقول معاينة',
  !readFileSync(join(prodDir, 'index.html'), 'utf8').includes('content="founder_preview"'))

console.log('\n③ الفحص ليس فارغًا — الأرتيفكتان مبنيّان فعلًا ومختلفان')
check('أرتيفكت المعاينة غير فارغ', walk(previewDir).length > 20, `${walk(previewDir).length} ملفًّا`)
check('أرتيفكت الإنتاج غير فارغ', walk(prodDir).length > 20, `${walk(prodDir).length} ملفًّا`)
check('⚔️ والإنتاج يحمل اعتماد الإنتاج — فالغياب أعلاه ليس بناءً فاشلًا',
  countFilesWith(prodDir, 'ledlypcyrtnzvjvhykwz') >= 1)

console.log('\n④ التجربة الحقيقية لا تُقلَّد — الفصل الذي طلبه المؤسس')
const src = readFileSync(resolve(ROOT, 'src/lib/access/entitlementSource.ts'), 'utf8')
const trialBody = src.slice(src.indexOf('export async function startTrial'))
const trialHead = trialBody.slice(0, trialBody.indexOf('\n}\n') + 3)
check('`startTrial` لا تسأل مسار QA إطلاقًا', !trialHead.includes('founderQaEntitlementEnabled')
  && !trialHead.includes('localEntitlementEnabled'))
check('⚔️ وهي تسأل `mockEnabled` وحدها — فالفحص يميّز ولا يمرّ بالفراغ',
  trialHead.includes('mockEnabled()'))

rmSync(resolve(ROOT, '.qa-boundary'), { recursive: true, force: true })
console.log(`\n${fails.length === 0 ? '✅' : '❌'} حدّ تفعيل QA: ${pass} نجحت / ${fails.length} فشلت`)
if (fails.length) { fails.forEach((f) => console.log(`   • ${f}`)); process.exit(1) }
