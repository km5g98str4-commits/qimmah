#!/usr/bin/env node
/**
 * إثبات: ما يُخزَّن من أرقام غربيٌّ قانوني — والمُدخل العربي لا يُفقد بصمت.
 *
 * ═══ العطل الذي يغلقه ═══
 * حقلا الوزن والتكرارات في `WorkoutMode` يسلّمان ما كُتب حرفيًّا، ومسارا الكتابة
 * (لقطة الجلسة الجارية · وسجلّ الجلسة المنتهية) كانا يمرّرانه كما هو. فمن سجّل
 * «٨٥» خزّن «٨٥» — وقارئو المخزون **لا يطوون**:
 *   • `progressStats.num` = `Number('٨٥')` = NaN ⇒ حجم الجلسة **صفر**.
 *   • `exerciseHistory.numOf` = `/[\d.]+/` أرقام ASCII حصرًا ⇒ **لا رقم قياسيًّا**.
 * فالمجموعة تظهر محفوظة في الواجهة وتختفي من التقدّم بلا رسالة. وذلك أسوأ من
 * رفضٍ صريح: المستخدم لا يعلم أن جهده لم يُحتسب (§5 · §6-٤).
 *
 * ═══ ولماذا يُفحص القارئ لا الكاتب وحده ═══
 * لو فُحص الطيّ وحده لمرّ الإثبات ولو بقي قارئ واحد أعمى. فالفحص هنا يقيس
 * **النتيجة**: حجم جلسة ورقمًا قياسيًّا من قيم عربية، ويقارنهما بالغربية.
 */
import { build } from 'esbuild'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let pass = 0
const fails = []
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`) }
  else { fails.push(name); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`) }
}

const dir = mkdtempSync(join(tmpdir(), 'qimmah-arabic-storage-'))
const ENTRY = join(dir, 'entry.ts')
writeFileSync(ENTRY, `
export { foldDigits } from '@/lib/numberFormat'
export { sessionVolume } from '@/lib/progressStats'
export { topCompletedWeight } from '@/lib/exerciseHistory'
`)
const out = await build({
  entryPoints: [ENTRY], bundle: true, write: false, format: 'esm', platform: 'neutral',
  alias: { '@': join(process.cwd(), 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: true }) },
  logLevel: 'silent',
})
const bundlePath = join(dir, 'bundle.mjs')
writeFileSync(bundlePath, out.outputFiles[0].text)
const { foldDigits, sessionVolume, topCompletedWeight } = await import(bundlePath)

const sessionWith = (weight, reps) => ({
  id: 's1', date: '2026-08-23', startedAt: 1, finishedAt: '2026-08-23T00:00:00Z',
  workoutDayId: 'd1', workoutDayName: 'يوم',
  exercises: [{ exerciseId: 'e1', targetSets: 1, targetReps: '10', targetRestSec: 60, completed: true,
    sets: [{ setNumber: 1, targetReps: '10', actualReps: reps, weightKg: weight, completed: true }] }],
})

console.log('\n① الطيّ عند حدّ التخزين يجعل القيمتين متطابقتين')
{
  const latin = sessionVolume(sessionWith('85', '10'))
  const foldedArabic = sessionVolume(sessionWith(foldDigits('٨٥'), foldDigits('١٠')))
  check('حجم الجلسة من مُدخل عربي مطويّ = حجمه من مُدخل غربي', latin === foldedArabic && latin > 0,
    `غربي=${latin} · عربي مطويّ=${foldedArabic}`)

  const topLatin = topCompletedWeight(sessionWith('85', '10').exercises[0])
  const topArabic = topCompletedWeight(sessionWith(foldDigits('٨٥'), foldDigits('١٠')).exercises[0])
  check('الرقم القياسي من مُدخل عربي مطويّ = نظيره الغربي', topLatin === topArabic && topLatin === 85,
    `غربي=${topLatin} · عربي مطويّ=${topArabic}`)
}

console.log('\n② التأكيد المضادّ — بلا طيّ يضيع الجهد بصمت')
{
  // هذا هو المخزون قبل الإصلاح حرفيًّا: أرقام عربية خام.
  const raw = sessionWith('٨٥', '١٠')
  const vol = sessionVolume(raw)
  check('⚔️ حجم جلسة من أرقام عربية خام = صفر — الجهد يختفي بلا رسالة', vol === 0, `الحجم=${vol}`)
  const top = topCompletedWeight(raw.exercises[0])
  check('⚔️ ولا رقم قياسيًّا منها', Number.isNaN(top), `الرقم=${top}`)
  check('⚔️ والفارق ليس تقريبًا بل فقدًا كاملًا', sessionVolume(sessionWith('85', '10')) > 0 && vol === 0)
}

console.log('\n③ الطيّ يغطّي الفاصلة العربية والأرقام الفارسية')
{
  check('«٨٥٫٥» ⇒ 85.5 لا 855', foldDigits('٨٥٫٥') === '85.5', foldDigits('٨٥٫٥'))
  check('الفارسية «۸۵» ⇒ 85', foldDigits('۸۵') === '85', foldDigits('۸۵'))
  const decimal = sessionVolume(sessionWith(foldDigits('٨٥٫٥'), foldDigits('١٠')))
  check('وحجم الجلسة يقرأ العشري مطويًّا', decimal === 855, `الحجم=${decimal}`)
}

console.log(`\n${fails.length === 0 ? '✅' : '❌'} صدق تخزين الأرقام: ${pass} نجحت / ${fails.length} فشلت`)
if (fails.length) { fails.forEach((f) => console.log(`   • ${f}`)); process.exit(1) }
