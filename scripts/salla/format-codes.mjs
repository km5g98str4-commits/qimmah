// قِمّة — تحويل ملف دفعة الأكواد (تصدير اللوحة) إلى قالب رفع سلة — [SALLA-V1]
//
//   node scripts/salla/format-codes.mjs --in SALLA-LAUNCH-001.csv --out salla-upload.csv [--header code] [--extra "expiry="]
//
// ═══ ما يفعله وما لا يفعله ═══
//   • يقرأ تصدير اللوحة (عمود `code` أو سطر لكل كود) ويكتب ملفًا بالترويسة التي يطلبها
//     قالب سلة (الافتراض `code`؛ تُضبط بـ--header بعد تأكيد القالب في لوحة سلة).
//   • يتحقّق قبل الكتابة: كل كود ١٦ رمزًا من أبجدية قِمّة (بلا 0 O 1 I L) بعد نزع الشرطات،
//     ولا تكرار، ولا سطر فارغ — فلا يصل سلة كودٌ مكسور يفشل استرداده.
//   • **لا يطبع الأكواد** إلى الطرفية ولا يكتبها إلى المستودع: المدخل والمخرج خارج git
//     (المسار الذي يعطيه المؤسس)، ويُبلَّغ عن العدد والبصمة فقط.
//   • لا يلمس القاعدة: التسوية تجري بالـSQL في docs/product/SALLA-V1-LAUNCH-RUNBOOK.md §٢-٥.

/* global process */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const argOf = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d }
const IN = argOf('--in'); const OUT = argOf('--out'); const HEADER = argOf('--header', 'code'); const EXTRA = argOf('--extra', '')
if (!IN || !OUT) { console.error('usage: --in <export.csv> --out <salla.csv> [--header code] [--extra "col=value,col2=value2"]'); process.exit(2) }
if (resolve(IN).includes(resolve(import.meta.dirname, '../..')) || resolve(OUT).includes(resolve(import.meta.dirname, '../..'))) {
  console.error('⛔ الملفان يجب أن يكونا خارج المستودع — الأكواد لا تدخل git.'); process.exit(2)
}
const ALPHABET = /^[A-HJ-NP-Z2-9]{16}$/
const lines = readFileSync(IN, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
const body = lines[0].toLowerCase() === 'code' ? lines.slice(1) : lines
const seen = new Set(); const bad = []
for (const raw of body) {
  const code = raw.replace(/[-\s]/g, '').toUpperCase()
  if (!ALPHABET.test(code)) bad.push(`شكل غير صالح في السطر ${body.indexOf(raw) + 1}`)
  else if (seen.has(code)) bad.push(`تكرار في السطر ${body.indexOf(raw) + 1}`)
  seen.add(code)
}
if (bad.length) { console.error(`⛔ ${bad.length} مشكلة:\n  ` + bad.join('\n  ')); process.exit(1) }
const extras = EXTRA ? EXTRA.split(',').map((kv) => kv.split('=')) : []
const header = [HEADER, ...extras.map(([k]) => k)].join(',')
const rows = body.map((raw) => [raw.trim(), ...extras.map(([, v]) => v ?? '')].join(','))
writeFileSync(OUT, [header, ...rows].join('\r\n') + '\r\n')
const digest = createHash('sha256').update(body.map((r) => r.replace(/[-\s]/g, '').toUpperCase()).sort().join('\n')).digest('hex')
console.log(`✓ ${body.length} كودًا · ترويسة «${header}» · بصمة المجموعة ${digest.slice(0, 16)}… → ${OUT}`)
console.log('  التسوية: issued في القاعدة يجب أن يساوي هذا العدد (runbook §٢-٥).')
