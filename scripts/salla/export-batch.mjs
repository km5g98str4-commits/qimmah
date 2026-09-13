#!/usr/bin/env node
// ============================================================================
// قِمّة — تصدير دفعة صكوك شراء إلى ملف رفع سلة — [SALLA-PROD-001]
// ============================================================================
//   node scripts/salla/export-batch.mjs --batch SALLA-TEST-001 --count 5 \
//        --in  ~/Downloads/SALLA-TEST-001.csv  --out ~/salla/SALLA-TEST-001.salla.csv
//
// ═══ ما يفرضه (يُرفض بخطأ مسمّى، لا تحذير) ═══
//   • `--batch` إلزامي بنمط قناة سلة `SALLA-(TEST|LAUNCH|SUPPORT)-nnn` — الاحتياطي
//     (`FOUNDER-RESERVE-*`) وأي وسم آخر **لا يُصدَّر** من هنا أصلًا.
//   • `--count` إلزامي ويساوي عدد الأكواد في الملف — عددٌ مختلف = ملف خاطئ.
//   • اسم ملف الإدخال يحمل وسم الدفعة (تنزيل اللوحة يسمّيه به) — حماية من تحويل ملف دفعة أخرى.
//   • المدخل والمخرج **خارج المستودع** — الأكواد لا تدخل git.
//   • `SALLA-LAUNCH-*` يحتاج `--test-lifecycle-passed <SALLA-TEST-nnn>` صراحةً: لا مخزون
//     إطلاق قبل إثبات دورة الاختبار.
//   • شكل كل كود: ١٦ رمزًا من أبجدية قِمّة (بلا 0 O 1 I L) بعد نزع الشرطات؛ لا تكرار؛ لا فراغ.
//
// ═══ ما يكتبه ═══
//   • ملف سلة: عمود واحد — «كود التفعيل» هو الحقل الإلزامي الوحيد في سلة (help.salla.sa: إضافة
//     البطاقات الرقمية). الافتراض ترويسة `code` (`--header` لاسم عمود قالب سلة)، و`--no-header` يكتب
//     كودًا في كل سطر للّصق المباشر في «الإدخال اليدوي». **لا شيء غيره** (لا وسم، لا تاريخ، لا بريد).
//   • بيان `<out>.manifest.json`: الوسم · العدد · بصمة المجموعة (sha256 للمرتَّب) · الوقت.
//     البصمة هي ما يُسجَّل في `founder_mark_purchase_batch_exported` — تسوية بلا نصّ خام.
//   • الطرفية: العدد والبصمة فقط. **لا كود يُطبع أبدًا.**
// ============================================================================
/* global process */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const args = process.argv.slice(2)
const argOf = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d }
const fail = (msg, code = 2) => { console.error(`⛔ ${msg}`); process.exit(code) }

const BATCH = argOf('--batch'); const COUNT = Number(argOf('--count')); const IN = argOf('--in'); const OUT = argOf('--out')
const HEADER = argOf('--header', 'code'); const TEST_PASSED = argOf('--test-lifecycle-passed'); const NO_HEADER = args.includes('--no-header')
if (!BATCH || !IN || !OUT || !Number.isInteger(COUNT)) fail('usage: --batch SALLA-TEST-001 --count N --in <export.csv> --out <salla.csv> [--header code] [--test-lifecycle-passed SALLA-TEST-001]')

export const SALLA_LABEL = /^SALLA-(TEST|LAUNCH|SUPPORT)-[0-9]{3}$/
export const CODE_SHAPE = /^[A-HJ-NP-Z2-9]{16}$/
if (!SALLA_LABEL.test(BATCH)) fail(`الوسم «${BATCH}» ليس وسم قناة سلة (SALLA-TEST/LAUNCH/SUPPORT-nnn) — الاحتياطي وغيره لا يُصدَّر من هنا.`)
if (/^SALLA-LAUNCH-/.test(BATCH) && !(TEST_PASSED && /^SALLA-TEST-[0-9]{3}$/.test(TEST_PASSED))) fail('مخزون الإطلاق يحتاج --test-lifecycle-passed SALLA-TEST-nnn بعد نجاح دورة الاختبار كاملة.')
if (COUNT < 1 || COUNT > 500) fail('العدد خارج [1, 500].')
if (/^SALLA-TEST-/.test(BATCH) && COUNT > 10) fail('دفعة الاختبار صغيرة عمدًا (≤ ١٠).')
if (resolve(IN).startsWith(ROOT) || resolve(OUT).startsWith(ROOT)) fail('الملفان يجب أن يكونا خارج المستودع — الأكواد لا تدخل git.')
if (!basename(IN).includes(BATCH)) fail(`اسم ملف الإدخال «${basename(IN)}» لا يحمل وسم الدفعة «${BATCH}» — تحقّق أنك تحوّل الدفعة الصحيحة.`)
if (!/[/\\]/.test(HEADER) && !/^[a-z_]{1,32}$/i.test(HEADER)) fail('ترويسة غير صالحة.')
if (!existsSync(IN)) fail('ملف الإدخال غير موجود.')
if (existsSync(OUT)) fail('ملف المخرج موجود — لا كتابة فوق ملف رفع سابق (احذفه يدويًّا إن كان مقصودًا).')

const lines = readFileSync(IN, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
const body = lines[0].toLowerCase() === 'code' ? lines.slice(1) : lines
const seen = new Set(); const problems = []
const codes = body.map((raw, i) => {
  const code = raw.replace(/[-\s]/g, '').toUpperCase()
  if (raw.includes(',')) problems.push(`السطر ${i + 1}: أكثر من عمود`)
  else if (!CODE_SHAPE.test(code)) problems.push(`السطر ${i + 1}: شكل غير صالح`)
  else if (seen.has(code)) problems.push(`السطر ${i + 1}: تكرار`)
  seen.add(code)
  return code
})
if (problems.length) fail(`${problems.length} مشكلة في الملف:\n  ${problems.join('\n  ')}`, 1)
if (codes.length !== COUNT) fail(`العدد في الملف ${codes.length} ≠ --count ${COUNT}.`, 1)

const digest = createHash('sha256').update([...codes].sort().join('\n')).digest('hex')
writeFileSync(OUT, (NO_HEADER ? codes : [HEADER, ...codes]).join('\r\n') + '\r\n', { mode: 0o600 })
const manifest = { batch: BATCH, channel: 'salla', count: codes.length, digest, header: NO_HEADER ? null : HEADER, createdAt: new Date().toISOString(), testLifecyclePassed: TEST_PASSED ?? null }
writeFileSync(`${OUT}.manifest.json`, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 })
console.log(`✓ ${BATCH}: ${codes.length} كودًا · ${NO_HEADER ? 'بلا ترويسة (للّصق)' : `ترويسة «${HEADER}»`} · بصمة ${digest}`)
console.log(`  → ${OUT}\n  → ${OUT}.manifest.json`)
console.log('  التالي: #/admin ← دفعات الشراء ← «سُجِّلت مرفوعة إلى سلة» بالعدد والبصمة أعلاه، ثم احذف ملفي التنزيل والرفع من جهازك بعد الرفع.')
