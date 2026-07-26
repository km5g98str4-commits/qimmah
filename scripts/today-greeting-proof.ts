// إثبات Q16 — صفحة اليوم: تباين البطاقة المميّزة في كل الثيمات + الترحيب بالاسم
// الحقيقي + عبارة اليوم الحتمية + سلامة RTL/LTR.
//
// التباين يُحتسب رياضيًا (WCAG) من توكنات tokens.css الفعلية — لا لقطة ولا تخمين:
// نقرأ الزوج الدلالي للسطح المميّز في الثيم الفاتح ثم في تجاوز الثيم الداكن.

import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildTodayV2Model } from '@/lib/todayV2Model'
import { getDefaultCustomization, type Customization } from '@/lib/customization'
import { dailyPhrases, phraseForDay } from '@/data/dailyPhrases'
import { dailyPhrasesEn } from '@/data/dailyPhrasesEn'

let pass = 0
const check = (label: string, cond: boolean) => {
  assert.ok(cond, `FAIL: ${label}`)
  pass++
  console.log(`  ✓ ${label}`)
}
const ls = globalThis.localStorage
const ROOT = process.env.Q16_ROOT ?? process.cwd()
const css = readFileSync(resolve(ROOT, 'src/design-system/tokens.css'), 'utf8')
const view = readFileSync(resolve(ROOT, 'src/views/TodayV2.tsx'), 'utf8')

// ── أدوات WCAG ──────────────────────────────────────────────────────────────
const srgb = (v: number) => {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const lum = ([r, g, b]: number[]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
const contrast = (a: number[], b: number[]) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
const hex = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
/** يمزج لونًا بنسبة مئوية فوق خلفية (يحاكي color-mix مع transparent). */
const mixOver = (fg: number[], pct: number, bg: number[]) => fg.map((c, i) => Math.round((c * pct + bg[i] * (100 - pct)) / 100))

/** يقرأ قيمة توكن من كتلة CSS مع تتبّع var() بسيط. */
function tokenValue(block: string, name: string, depth = 0): string | null {
  const m = block.match(new RegExp(`--${name}:\\s*([^;]+);`))
  if (!m) return null
  const raw = m[1].trim()
  const v = raw.match(/^var\(--([a-z0-9-]+)\)$/i)
  if (v && depth < 5) return tokenValue(css, v[1], depth + 1) // التتبّع من الملف كله (القاعدة)
  return raw
}
const darkBlock = css.split(":root[data-theme='dark'] body")[1].split('}')[0]

console.log('\n① الزوج الدلالي للسطح المميّز موجود ومُتجاوَز لكل ثيم')
check('توكنات الزوج معرَّفة في القاعدة', ['v2-surface-featured', 'v2-on-featured', 'v2-on-featured-muted', 'v2-featured-wash'].every((t) => tokenValue(css, t) !== null))
check('الثيم الداكن يتجاوز السطح والحبر (لا يورث انقلاب الحبر)', /--v2-surface-featured:/.test(darkBlock) && /--v2-on-featured:/.test(darkBlock))

console.log('\n② تباين البطاقة المميّزة يجتاز AA في كل الثيمات (محسوب)')
const lightSurface = hex(tokenValue(css, 'v2-surface-featured') as string)
const lightOn = hex(tokenValue(css, 'v2-on-featured') as string)
const rLight = contrast(lightOn, lightSurface)
check(`فاتح: الحبر على السطح المميّز = ${rLight.toFixed(2)}:1 ≥ 4.5`, rLight >= 4.5)
const darkSurface = hex(tokenValue(darkBlock, 'v2-surface-featured') as string)
const darkOn = hex(tokenValue(darkBlock, 'v2-on-featured') as string)
const rDark = contrast(darkOn, darkSurface)
check(`داكن: الحبر على السطح المميّز = ${rDark.toFixed(2)}:1 ≥ 4.5`, rDark >= 4.5)
// النص الثانوي (muted) — نسبة الخلط الفعلية من التوكن فوق السطح نفسه.
const mutedPct = (v: string) => Number((v.match(/(\d+)%/) ?? [])[1] ?? 100)
const rLightMuted = contrast(mixOver(lightOn, mutedPct(tokenValue(css, 'v2-on-featured-muted') as string), lightSurface), lightSurface)
const rDarkMuted = contrast(mixOver(darkOn, mutedPct(tokenValue(darkBlock, 'v2-on-featured-muted') as string), darkSurface), darkSurface)
check(`فاتح: النص الثانوي = ${rLightMuted.toFixed(2)}:1 ≥ 4.5`, rLightMuted >= 4.5)
check(`داكن: النص الثانوي = ${rDarkMuted.toFixed(2)}:1 ≥ 4.5`, rDarkMuted >= 4.5)
// الانفصال البصري عن خلفية الصفحة (البطاقة يجب أن تُرى كسطح مستقل).
const pageRgb = (block: string) => (block.match(/--c-page:\s*(\d+) (\d+) (\d+)/) as string[]).slice(1).map(Number)
const lightPage = pageRgb(css.split(':root body,')[1].split('}')[0])
check('فاتح: البطاقة منفصلة عن الصفحة', contrast(lightSurface, lightPage) > 1.5)
check('داكن: البطاقة منفصلة عن الصفحة', contrast(darkSurface, pageRgb(darkBlock)) > 1.05)

console.log('\n③ ممنوع الألوان الصلبة على سطح يتغيّر بالثيم')
const code = view.replace(/\/\/[^\n]*/g, '') // اطرح التعليقات
check('لا bg-ink-900 في البطاقة (كان جذر الخلل)', !/bg-ink-900/.test(code))
check('لا text-white / text-white\\/NN', !/text-white/.test(code))
check('لا rgb(255 255 255) صريح', !/rgb\(255 255 255/.test(code))
check("لا color: 'white'", !/['"]white['"]/.test(code))
check('البطاقة تستخدم الزوج الدلالي', /var\(--v2-surface-featured\)/.test(code) && /var\(--v2-on-featured\)/.test(code))

console.log('\n④ الترحيب — الاسم الحقيقي موجود/غائب')
const base = (extra?: Partial<Customization>): Customization => {
  const c = getDefaultCustomization()
  return { ...c, targetsMeta: { ...c.targetsMeta, manuallyEdited: true }, nutritionPlan: { ...c.nutritionPlan, targetCalories: 2200, targetProtein: 160 }, ...extra }
}
const seedActive = () => {
  ls.clear()
  ls.setItem('qimmah:history:migrated:v1', 'done')
  ls.setItem('qimmah:onboarding:profile:v1', '{}')
  ls.setItem('qimmah:steps:v1', JSON.stringify({ [new Date().toISOString().slice(0, 10)]: 4000 }))
}
seedActive()
const withName = buildTodayV2Model(base({ profile: { ...getDefaultCustomization().profile, name: 'زياد الفهاد', goal: 'cut', workoutDuration: 45 } }), 'ar')
check('AR: الترحيب يحمل الاسم الأول فقط', withName.greeting.includes('زياد') && !withName.greeting.includes('الفهاد'))
check('AR: الصياغة «هلا <الاسم>، يومك في قِمّة»', /^هلا زياد،/.test(withName.greeting) && withName.greeting.includes('قِمّة'))
const withNameEn = buildTodayV2Model(base({ profile: { ...getDefaultCustomization().profile, name: 'Ziyad Alfahhad', goal: 'cut', workoutDuration: 45 } }), 'en')
check('EN: ترحيب طبيعي بالاسم', /^Hey Ziyad,/.test(withNameEn.greeting) && !withNameEn.greeting.includes('Alfahhad'))
const noName = buildTodayV2Model(base({ profile: { ...getDefaultCustomization().profile, name: '', goal: 'cut', workoutDuration: 45 } }), 'ar')
check('بلا اسم: صياغة عامة سليمة بلا اسم وهمي', noName.greeting === 'يومك في قِمّة')
const noNameEn = buildTodayV2Model(base({ profile: { ...getDefaultCustomization().profile, name: '', goal: 'cut', workoutDuration: 45 } }), 'en')
check('بلا اسم EN: بلا اسم وهمي', noNameEn.greeting === 'Your day in Qimmah' && !/undefined|null|Hey/.test(noNameEn.greeting))
const spaces = buildTodayV2Model(base({ profile: { ...getDefaultCustomization().profile, name: '   ', goal: 'cut', workoutDuration: 45 } }), 'ar')
check('اسم فراغات فقط = كأنه غائب', spaces.greeting === 'يومك في قِمّة')

console.log('\n⑤ عبارة اليوم — ثابتة خلال اليوم وتتغيّر بتغيّر التاريخ')
check('النموذج يعرض عبارة غير فارغة', withName.dailyPhrase.length > 0)
const d1 = new Date(2026, 6, 26)
check('حتمية: ٥ نداءات لنفس اليوم = عبارة واحدة', new Set(Array.from({ length: 5 }, () => phraseForDay(d1, 'ar'))).size === 1)
check('حتمية عبر لحظات مختلفة من نفس اليوم', phraseForDay(new Date(2026, 6, 26, 1, 5), 'ar') === phraseForDay(new Date(2026, 6, 26, 23, 55), 'ar'))
check('تتغيّر باليوم التالي', phraseForDay(d1, 'ar') !== phraseForDay(new Date(2026, 6, 27), 'ar'))
check('تدور على السنة بلا خروج عن الحدود', Array.from({ length: 366 }, (_, i) => phraseForDay(new Date(2026, 0, 1 + i), 'ar')).every((p) => typeof p === 'string' && p.length > 0))
check('EN بنفس الفهرس (تماثل المصفوفتين)', dailyPhrases.length === dailyPhrasesEn.length && phraseForDay(d1, 'en') === dailyPhrasesEn[dailyPhrases.indexOf(phraseForDay(d1, 'ar'))])
check('EN عبارة إنجليزية فعلية (لا عربية)', !/[؀-ۿ]/.test(phraseForDay(d1, 'en')))
check('AR عبارة عربية فعلية', /[؀-ۿ]/.test(phraseForDay(d1, 'ar')))
check('النموذج يتبع لغة الواجهة', withNameEn.dailyPhrase === phraseForDay(new Date(), 'en') && !/[؀-ۿ]/.test(withNameEn.dailyPhrase))
check('صفر تكرار في المصفوفتين', new Set(dailyPhrases).size === dailyPhrases.length && new Set(dailyPhrasesEn).size === dailyPhrasesEn.length)

console.log('\n⑥ RTL / LTR')
check('الجذر يقلب الاتجاه بلغة الواجهة', /dir=\{ar \? 'rtl' : 'ltr'\}/.test(view))
check('الشيفرون ينقلب مع الاتجاه', /ar \? 'ChevronLeft' : 'ChevronRight'/.test(view))
check('لا تصنيفات اتجاهية صريحة (left-/right-/ml-/mr-/pl-/pr-)', !/\b(?:ml|mr|pl|pr)-\d|\bleft-\d|\bright-\d|text-left|text-right/.test(code))
check('العنصر الزخرفي يستخدم خصائص منطقية (-end-)', /-end-8/.test(code) && !/-right-8/.test(code))
check('عبارة اليوم تُعرض تحت الترحيب فقط عند وجودها', /model\.dailyPhrase && \(/.test(view))

console.log('\n⑦ الصفحة تبقى مختصرة والترتيب كما هو')
check('ترتيب المهام الأصلي محفوظ (workout→meal→water→progress)', /key: 'workout'[\s\S]*key: 'meal'[\s\S]*key: 'water'[\s\S]*key: 'progress'/.test(view))
check('لا أقسام جديدة أُضيفت للصفحة (نفس أربعة أقسام)', (view.match(/<section/g) ?? []).length <= 3)
check('عبارة اليوم سطر واحد داخل الهيدر (لا بطاقة جديدة)', /<header>[\s\S]{0,600}dailyPhrase[\s\S]{0,120}<\/header>/.test(view))

console.log(`\n✅ إثبات Q16 (اليوم: تباين + ترحيب + عبارة) — ${pass} فحصًا.`)
