// القسم السلوكي من إثبات اتجاه سطر التاريخ — [R3-UX-BIDI].
//
// يقود `buildTodayV2Model` فوق تخزين مُحاكى ويثبت أن سطر التاريخ يخرج **مفكَّكًا**
// وأن النصّ المركَّب مشتقّ من جزأيه، فلا يمكن لأحدهما أن يشيخ دون الآخر.

import { getDefaultCustomization } from '@/lib/customization'
import { buildTodayV2Model, DATE_PART_SEPARATOR } from '@/lib/todayV2Model'

let pass = 0
const fails: string[] = []
const check = (label: string, cond: boolean): void => {
  if (cond) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fails.push(label); console.log(`  ✗ FAIL: ${label}`) }
}

const DIGITS = /[0-9٠-٩۰-۹]/

for (const lang of ['ar', 'en'] as const) {
  console.log(`\n▸ ${lang}`)
  const model = buildTodayV2Model(getDefaultCustomization(), lang, null)
  const { weekday, detail } = model.dateParts

  check(`[${lang}] اسم اليوم غير فارغ`, weekday.trim().length > 0)
  check(`[${lang}] اسم اليوم بلا أرقام — فالأرقام كلّها في الجزء المعزول`, !DIGITS.test(weekday))
  check(
    `[${lang}] النصّ المركَّب مشتقّ من الجزأين بالفاصل نفسه`,
    model.dateLabel === (detail ? `${weekday}${DATE_PART_SEPARATOR}${detail}` : weekday),
  )
  check(
    `[${lang}] الفاصل «·» لا يظهر داخل أيّ جزء — لأنه ليس ملكًا لأحدهما`,
    !weekday.includes('·') && !detail.includes('·'),
  )
  check(`[${lang}] الجزءان يغطّيان النصّ كاملًا بلا بقايا`, model.dateLabel.replace(DATE_PART_SEPARATOR, '') === `${weekday}${detail}`)
}

console.log(`\nنجح ${pass} · فشل ${fails.length}`)
if (fails.length) { for (const f of fails) console.log(`  ✗ ${f}`); process.exit(1) }
