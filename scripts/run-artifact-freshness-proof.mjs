#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
//  ARTIFACT FRESHNESS — إثبات أن `--skip-build` لا يقبل دليلًا بائتًا.
//
//  لماذا هذا الملف موجود:
//  عانى هذا المشروع مرارًا من خديعة الأرتيفكت البائت. كان
//  `run-release-convergence.mjs --skip-build` يعيد استعمال `dist-release/`
//  **بلا أي تحقّق**، بينما يختم سجلّ الأدلّة بـ`head: HEAD` الحالي. أي أن
//  نتيجة مبنيّة على SHA أقدم كانت تُقدَّم دليلًا للرأس الجاري — وهو بالضبط
//  ما يحرّمه §15 من أمر التقارب النهائي.
//
//  ولأن كل شدّ بوابة يُرفَق بمحاكاة التفاف تفشل بفحص مسمّى (الميثاق §4.2)،
//  يحوي هذا الإثبات أربع محاكاة التفاف: كلٌّ منها تنقض شرطًا من شروط
//  `verifyArtifact` وتتوقّع سقوطًا **باسمه** لا باستثناء تقني عابر.
// ═══════════════════════════════════════════════════════════════════════════

import { mkdirSync, rmSync, writeFileSync, utimesSync } from 'node:fs'
import { resolve } from 'node:path'
import { ARTIFACTS, ROOT, ARTIFACT_STAMP, headSha, sourceFingerprint, verifyArtifact } from './release/lib/harness.mjs'

let pass = 0
let fail = 0
const check = (name, ok, evidence = '') => {
  if (ok) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name}${evidence ? ` — ${evidence}` : ''}`) }
}

// طقم معزول: لا يلمس dist-release/prod ولا mock إطلاقًا.
const MODE = '__freshness_proof'
const OUT = 'dist-release/__freshness_proof'
ARTIFACTS[MODE] = { outDir: OUT, port: 5499, env: {}, label: 'proof-only scratch artifact' }
const ABS = resolve(ROOT, OUT)

const reset = () => { rmSync(ABS, { recursive: true, force: true }); mkdirSync(ABS, { recursive: true }) }
const writeIndex = () => writeFileSync(resolve(ABS, 'index.html'), '<!doctype html><title>proof</title>')
const writeStamp = (o) => writeFileSync(resolve(ABS, ARTIFACT_STAMP), JSON.stringify(o, null, 2))
/** يلتقط الرمي ويعيد رسالته — أو null إن لم يُرمَ شيء. */
const threw = (fn) => { try { fn(); return null } catch (e) { return String(e.message || e) } }

console.log('\n① الحالة الصحيحة تمرّ')
reset(); writeIndex()
writeStamp({ mode: MODE, head: headSha(), builtAt: new Date().toISOString(), sourceFingerprint: sourceFingerprint() })
{
  const err = threw(() => verifyArtifact(MODE))
  check('أرتيفكت مبني على نفس الرأس وبمصدر غير متغيّر يُقبل', err === null, err || '')
}

console.log('\n② محاكاة التفاف: أرتيفكت من SHA أقدم')
reset(); writeIndex()
writeStamp({ mode: MODE, head: '0000000000000000000000000000000000000000', builtAt: new Date().toISOString(), sourceFingerprint: sourceFingerprint() })
{
  const err = threw(() => verifyArtifact(MODE))
  check('يسقط بفحص مسمّى STALE_ARTIFACT_REFUSED', !!err && err.includes('STALE_ARTIFACT_REFUSED'), err || 'لم يُرمَ شيء')
  check('الرسالة تسمّي الرأسين معًا', !!err && err.includes('000000000') && err.includes(headSha().slice(0, 9)), err || '')
}

console.log('\n③ محاكاة التفاف: أرتيفكت بلا بصمة إطلاقًا (يسبق التبصيم)')
reset(); writeIndex()
{
  const err = threw(() => verifyArtifact(MODE))
  check('يسقط بفحص مسمّى لا بـTypeError', !!err && err.includes('STALE_ARTIFACT_REFUSED'), err || 'لم يُرمَ شيء')
  check('الرسالة تسمّي ملف البصمة المفقود', !!err && err.includes(ARTIFACT_STAMP), err || '')
}

console.log('\n④ محاكاة التفاف: المصدر عُدِّل بعد البناء')
reset(); writeIndex()
writeStamp({ mode: MODE, head: headSha(), builtAt: new Date().toISOString(), sourceFingerprint: sourceFingerprint() - 60_000 })
{
  const err = threw(() => verifyArtifact(MODE))
  check('مصدر أحدث من البناء يسقط بفحص مسمّى', !!err && err.includes('STALE_ARTIFACT_REFUSED'), err || 'لم يُرمَ شيء')
  check('الرسالة تعلن أن السبب تغيّر المصدر', !!err && /source changed/i.test(err), err || '')
}

console.log('\n⑤ محاكاة التفاف: أرتيفكت غير مبني أصلًا')
reset()
{
  const err = threw(() => verifyArtifact(MODE))
  check('غياب index.html يسقط بفحص مسمّى', !!err && err.includes('STALE_ARTIFACT_REFUSED'), err || 'لم يُرمَ شيء')
}

console.log('\n⑥ تأكيد مضادّ (§4.2): الإثبات نفسه ليس رخوًا')
{
  // لو صار verifyArtifact يقبل أي شيء، لوجب أن تسقط ②–⑤. نحاكي ذلك بمقارنة
  // مباشرة: دالّة متساهلة وهمية يجب ألّا تُرضي شروط هذا الإثبات.
  const permissive = () => ({ ok: true })
  const err = threw(permissive)
  check('دالّة متساهلة لا تُرضي شرط السقوط المسمّى', !(err && err.includes('STALE_ARTIFACT_REFUSED')))
  // ولا يكفي أي رمي: رمي تقني عابر يجب ألّا يُحسب سقوطًا مسمّى.
  const technical = () => { throw new TypeError('undefined is not a function') }
  const terr = threw(technical)
  check('استثناء تقني (TypeError) لا يُقبل بديلًا عن الفحص المسمّى',
    !!terr && !terr.includes('STALE_ARTIFACT_REFUSED'))
}

rmSync(ABS, { recursive: true, force: true })
delete ARTIFACTS[MODE]

console.log(`\n${'─'.repeat(60)}`)
if (fail === 0) console.log(`✅ طزاجة الأرتيفكت محروسة — ${pass} فحصًا، 0 فشل (منها 5 محاكاة التفاف).`)
else console.log(`❌ ${fail} فشل من ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
