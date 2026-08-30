// Polish-2 guards (P1 promises/accessibility). Static source + WCAG math — no
// browser. Behavioural return-context coverage lives in today-v2-model-proof.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { strict as assert } from 'node:assert'

const root = resolve(import.meta.dirname, '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')
let pass = 0
const check = (label, cond) => { assert.ok(cond, `FAIL: ${label}`); pass++; console.log(`  ✓ ${label}`) }

// ── D: green small-text contrast ≥ 4.5:1 (AA) on white ──
function lum(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}
const contrast = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }

const tokens = read('src/design-system/tokens.css')
const greenText = tokens.match(/--v2-green-text:\s*(#[0-9a-fA-F]{6})/)[1]
const ratio = contrast(greenText, '#ffffff')
check(`--v2-green-text ${greenText} ≥ 4.5:1 on white (is ${ratio.toFixed(2)})`, ratio >= 4.5)
/**
 * سطح «اليوم» صار **عدّة ملفات** بعد إعادة التصميم، فالحراسة تتبع السطح لا الملف.
 *
 * كان الفحصان يقرآن `TodayV2.tsx` وحده. وحين انتقل النصّ الأخضر الصغير (نسبة
 * النبض · سطر «خلّصت التمرين» · «كمّلت هدف مويتك») إلى مكوّناته، أنذر الحارس
 * كذبًا على سطح **ملتزم بالسياسة بالكامل** — ولو عُولج بحذف الفحص لصار الالتزام
 * بلا حارس. والصياغة الجديدة أقوى لا أضعف: تشترط استعمال الرمز المطابق لـAA،
 * **وتمنع** إسناد `--v2-green` الخام إلى نصّ في أيّ من ملفات السطح.
 */
const TODAY_SURFACE = [
  'src/views/TodayV2.tsx',
  'src/components/today/DailyRingsCard.tsx',
  'src/components/today/NextActionCard.tsx',
  'src/components/today/WaterCard.tsx',
  'src/components/today/WeeklyPulseCard.tsx',
].map((p) => ({ path: p, src: read(p) }))
check(
  'سطح اليوم يستعمل رمز الأخضر المطابق لـAA للنصّ الصغير',
  TODAY_SURFACE.some((f) => f.src.includes('text-[color:var(--v2-green-text)]')),
)
const rawGreenText = TODAY_SURFACE.filter((f) => f.src.includes('text-[color:var(--v2-green)]'))
check(
  `ولا ملفّ في السطح يُسند الأخضر الخام إلى نصّ (المخالفون: ${rawGreenText.length})`,
  rawGreenText.length === 0,
)
// التأكيد المضادّ (§4.2): الأخضر الخام دون AA فعلًا، فالمنع ليس تحصيل حاصل.
const rawGreen = tokens.match(/--v2-green:\s*(#[0-9a-fA-F]{6})/)[1]
check(
  `التفاف: الأخضر الخام ${rawGreen} على الأبيض ${contrast(rawGreen, '#ffffff').toFixed(2)} — دون AA للنصّ الصغير`,
  contrast(rawGreen, '#ffffff') < 4.5,
)
check(
  'ودسّ الأخضر الخام في نصّ يُسقط الفحص أعلاه',
  [{ src: 'className="text-[color:var(--v2-green)]"' }].filter((f) => f.src.includes('text-[color:var(--v2-green)]')).length === 1,
)

// ── D-2 [CTO-67] البند ٥: النصّ الأزرق الصغير يمرّ AA في **الثيمين** ──
// «نبض أسبوعك» (`v2-text-blue` · 12px/900) كان يبقى على قيمة الفاتح في الثيم
// الداكن: 3.08:1 على سطح الجرافيت — المخالف الوحيد للـAA في اللوحة كلها.
// الأخضر عولج هكذا من قبل (سطر واحد فوق) والأزرق نُسي؛ فيُقاس الاثنان معًا الآن.
const DARK_SURFACE = '#161410' // --c-page في الثيم الداكن (22 20 15)
const LIGHT_SURFACE = '#efeae2' // Sand
const darkBlock = tokens.slice(tokens.indexOf("[data-theme='dark'] body"), tokens.indexOf('.v2-text-ember'))
check('كتلة الثيم الداكن استُخرجت بحدودها لا الملف كله', darkBlock.length > 100 && darkBlock.length < tokens.length * 0.5)
const blueLight = tokens.match(/--v2-blue-text:\s*(#[0-9a-fA-F]{6})/)[1]
const blueOnDark = tokens.match(/--v2-blue-on-dark:\s*(#[0-9a-fA-F]{6})/)[1]
check('الثيم الداكن يعيد ربط --v2-blue-text بنغمة السطح الداكن', /--v2-blue-text:\s*var\(--v2-blue-on-dark\)/.test(darkBlock))
const blueDarkRatio = contrast(blueOnDark, DARK_SURFACE)
const blueLightRatio = contrast(blueLight, LIGHT_SURFACE)
check(`الأزرق على السطح الداكن ${blueOnDark} ≥ 4.5:1 (هو ${blueDarkRatio.toFixed(2)})`, blueDarkRatio >= 4.5)
check(`والأزرق على السطح الفاتح ${blueLight} ≥ 4.5:1 (هو ${blueLightRatio.toFixed(2)})`, blueLightRatio >= 4.5)
// نفس المعاملة للأخضر — الاستثناء الذي سبق يُحرَس معه لا بمعزل عنه.
check('والأخضر ما زال معاد الربط في الثيم الداكن', /--v2-green-text:\s*#[0-9a-fA-F]{6}/.test(darkBlock))
// التأكيد المضادّ (§4.2): القيمة القديمة تسقط بالحساب نفسه، فالفحص ليس تحصيل حاصل.
check(`التفاف: قيمة الفاتح على السطح الداكن كانت ${contrast(blueLight, DARK_SURFACE).toFixed(2)} — دون AA`, contrast(blueLight, DARK_SURFACE) < 4.5)
check('ولذلك حذف إعادة الربط يُسقط الفحص أعلاه', contrast(blueLight, DARK_SURFACE) < 4.5 && blueDarkRatio >= 4.5)

// ── B: active workout is a real modal; shell chrome goes inert ──
const workout = read('src/views/WorkoutV2.tsx')
check('active overlay is aria-modal dialog', workout.includes('role="dialog"') && workout.includes('aria-modal="true"'))
check('workout signals immersive focus', workout.includes("'qimmah:immersive'"))
const shell = read('src/components/MobileShell.tsx')
check('shell makes header/nav inert on immersive', shell.includes('el.inert = immersive'))
check('shell listens for immersive events', shell.includes("'qimmah:immersive'"))

// ── C: touch targets ≥ 44px (min-h/-w or expanded hit-area) ──
// [SOVEREIGN-003] القيد لا الهجاء.
// كان الفحص يطابق النصّ `min-h-[44px] items-center gap-2` حرفيًّا، فسقط حين
// استعمل الزرّ صنف `.tap-target` المشترك — وهو **نفس القيد** (`@apply
// min-h-[44px] min-w-[44px]`) وأفضل هجاءً: الصنف كان مُعلَنًا في الأنماط
// ومستعمَلًا صفر مرّة. فحصٌ يرفض تحسينًا مكافئًا يحرس هجاءه لا مستخدمه.
// ويبقى محكمًا باتجاهين: يُقبل الهجاءان، **ويُتحقَّق أن الصنف نفسه ما زال
// يعني ٤٤ بكسلًا** — فلو أُفرغ `.tap-target` غدًا سقط الفحص باسمه.
const TAP_TARGET_RULE = /\.tap-target\s*\{[^}]*min-h-\[44px\][^}]*\}/
const brandOk = shell.includes('min-h-[44px] items-center gap-2') || /class[^>]*tap-target/.test(shell)
check('header brand button ≥44 tall (صراحةً أو عبر .tap-target)', brandOk)
check('⟲ و`.tap-target` ما زال يعني ٤٤ بكسلًا فعلًا', TAP_TARGET_RULE.test(read('src/styles/index.css')))
check('language toggle (compact) ≥44 tall', read('src/i18n/LanguageToggle.tsx').includes('min-h-[44px]'))
check('close-workout button 44×44', workout.includes('h-11 w-11 place-items-center rounded-xl'))
check('plate + warmup buttons use expanded hit-area', (workout.match(/before:-inset/g) ?? []).length >= 2)
// [CTO-009/WP-3 → PREMIUM-UX-W2] كان يحرس زرّ «اعرف المزيد» ثم نداء Premium في
// ProfileV2. الآن نداء الشراء يعيش في بطاقة الوصول (AccessCard) عبر PurchaseCta،
// وأزرارها كلها `min-h-[44px]`. **الضمان لم يتغيّر** — هدف لمس ≥44بكسل — والفحص
// وُجّه للعنصر الذي حلّ محلّه: رابط الشراء الخارجي في AccessCard.
{
  const accessCard = read('src/components/AccessCard.tsx')
  const purchaseCtaTall = /product\.checkoutUrl[\s\S]{0,400}?min-h-\[44px\]/.test(accessCard)
    || /min-h-\[44px\][\s\S]{0,400}?product\.checkoutUrl/.test(accessCard)
  check('profile Premium CTA ≥44 tall (بطاقة الوصول)', purchaseCtaTall)
}

// ── A: return hero is an honest single path (no separate-session promise) ──
const model = read('src/lib/todayV2Model.ts')
check('return hero promises the plan itself (not a fake session)', /خطتك|of your plan/.test(model))
check('no "full plan" alternative card (would be the same path)', !model.includes("'I’d rather do today’s full plan'"))

console.log(`\n✅ polish-2 proof: green AA contrast, workout modal+inert, ≥44 touch targets, honest return promise — ${pass} checks`)
