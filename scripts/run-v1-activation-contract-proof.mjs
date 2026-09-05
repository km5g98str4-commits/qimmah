#!/usr/bin/env node
/**
 * حارس عقد التفعيل V1 — سطحٌ يبيع لا يجوز أن ينقض ما يبيعه.
 *
 * ═══ الواقعة التي أنشأته ═══
 * حمل `bfbf300c` — مرشّح الإطلاق الأخضر بأربع بوّابات و١٩٣ خطوة — نصًّا حيًّا
 * في `PremiumGate` يقول للمشتري: «الشراء من سلة يفتح حسابك بنفسه — ما يحتاج
 * كود». وهو **نقيض عقد V1 حرفيًّا**: سلة قناة دفع وتسليم فقط، لا webhook
 * منشور ولا منح آليّ، والمشتري يستلم صكًّا فريدًا **ويكتبه في التطبيق** أو لا
 * يحصل على شيء (`docs/product/PURCHASE-CREDENTIAL-MODEL.md`).
 *
 * وظهر النصّ **داخل `{codeOpen && …}`** — أي بعد أن فتح المشتري لوحة الكود وهو
 * ممسك بصكّه. فصرفه عن الفعل الوحيد الذي يمنحه ما دفع مقابله، في اللحظة التي
 * كان فيها يفعله.
 *
 * ═══ ولماذا لم تلتقطه بوّابة كاملة الخضرة ═══
 * `test:premium-copy` يحرس **ألفاظًا ممنوعة** (lifetime · مدى الحياة · 89.99)،
 * و`test:activation-ui` يحرس **بنية** اختيار الرسائل. ولا اختبار واحد كان يذكر
 * `codeBody`. أي أن بواباتنا كانت تحرس **ما يُمنع قوله**، ولا تحرس **أن سطحًا
 * لا ينقض العقد**. هذا الملف يسدّ ذلك الفرق بالضبط.
 *
 * ═══ ويقيس بالاتجاهين (§4.2) ═══
 * ① نافيًا: لا سطح يراه المستخدم يدّعي تفعيلًا تلقائيًّا أو استغناءً عن الكود.
 * ② مُثبِتًا: سطح إدخال الكود **يقول للمشتري من سلة أن يلصق صكّه**.
 * فالنفي وحده يُرضى بحذف النصّ كلّه — وشاشةٌ خرساء ليست شاشةً صادقة.
 *
 * التشغيل: node scripts/run-v1-activation-contract-proof.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0
const fails = []
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`) }
  else { fails.push(name); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`) }
}

/**
 * ═══ التطبيع — لماذا هو قلب هذا الحارس ═══
 * حارسٌ يُلتفّ عليه بفاصلةٍ ليس حارسًا. فتُنزع التشكيلات (فيتساوى «صكّ» و«صك»)
 * والتطويل، وتُوحَّد الألفات والياء، **وتُسحق كل علامة ترقيم إلى مسافة**.
 * فيبقى المقيس **المعنى** لا رسمه: «ما يحتاج كود.» و«ما يحتاج كود!» و«ما
 * يحتاج ـ كود» ثلاثتها نصٌّ واحد عند هذا الحارس.
 */
const normalize = (s) => s
  .replace(/[ً-ٰٟ]/g, '')   // تشكيل وشدّة
  .replace(/ـ/g, '')                   // تطويل
  .replace(/[آأإٱ]/g, 'ا') // آ أ إ ٱ ← ا
  .replace(/ى/g, 'ي')             // ى ← ي
  .replace(/[^\p{L}\p{N}]+/gu, ' ')         // كل ما ليس حرفًا أو رقمًا ← مسافة
  .trim()
  .toLowerCase()

/** أسطح يراها المستخدم — لا وثائق ولا سكربتات. */
const SCAN_DIRS = ['src/i18n/dict', 'src/config', 'src/views', 'src/components', 'src/admin', 'site']
const EXT = /\.(ts|tsx|html)$/

const walk = (dir, acc = []) => {
  let entries = []
  try { entries = readdirSync(resolve(ROOT, dir)) } catch { return acc }
  for (const e of entries) {
    const rel = `${dir}/${e}`
    if (statSync(resolve(ROOT, rel)).isDirectory()) walk(rel, acc)
    else if (EXT.test(e)) acc.push(rel)
  }
  return acc
}

/**
 * يستخرج **قيم السلاسل** وحدها بعد نزع التعليقات — الوحدة المقيسة هي السلسلة
 * الواحدة، لأن الادّعاء يعيش داخل جملة واحدة يقرؤها المستخدم دفعةً واحدة.
 * وتعليقٌ يشرح المنع لا يُرصد، وإلّا احمرّ الحارس على الملفّ الذي يشرحه.
 */
function userFacingStrings(source, isHtml) {
  if (isHtml) {
    const noComments = source.replace(/<!--[\s\S]*?-->/g, '')
    return [...noComments.matchAll(/>([^<>]{4,})</g)].map((m) => m[1])
  }
  const noBlock = source.replace(/\/\*[\s\S]*?\*\//g, '')
  const noLine = noBlock.split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n')
  const out = []
  const re = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g
  let m
  while ((m = re.exec(noLine)) !== null) out.push(m[1] ?? m[2] ?? m[3] ?? '')
  return out
}

// ═══ العقد: موضوعٌ تجاري + ادّعاء ممنوع في السلسلة نفسها ═══
//
// الاقتران مقصود. «تجربتك تبدأ بلا كود» جملة **صادقة** عن التجربة، ومنعُها
// بكلمة مفتاحية وحدها كان سيحمّر الحارس على نصّ صحيح — ثم يُعطَّل بعد يومين.
const COMMERCE_SUBJECT = /سله|سلة|salla|شراء|شرائك|اشتريت|purchase|bought|premium/i

const CLAIMS = [
  {
    id: 'تفعيل تلقائي بعد الشراء',
    re: [
      /(يفتح|تفتح|يفعل|تفعل|يمنح|تمنح|ينقل|تنقل)[^]{0,30}?(حسابك|الحساب|الوصول|premium)[^]{0,20}?(بنفسه|بنفسها|تلقائيا|لحاله|من نفسه)/u,
      /(بنفسه|بنفسها|تلقائيا|لحاله)[^]{0,20}?(يفتح|تفتح|يفعل|تفعل|يمنح|تمنح)/u,
      /(unlocks?|activates?|opens?|grants?)[^]{0,30}?(account|access|premium)[^]{0,25}?(automatically|on its own|by itself|for you)/i,
      /(automatically|on its own|by itself)[^]{0,25}?(unlocks?|activates?|opens?|grants?)/i,
    ],
    why: 'لا webhook منشور في V1 — لا شيء يفتح الحساب بعد الدفع إلا الصكّ الذي يكتبه المشتري.',
  },
  {
    id: 'استغناء عن الكود',
    re: [
      /(ما|لا)\s*(يحتاج|تحتاج|يحتاجك|يلزم|يستلزم)\s*(الي\s*)?(كود|صك|صكا)/u,
      /(بلا|بدون|من غير)\s*(كود|صك)\b/u,
      /no\s+(activation\s+|purchase\s+)?code\s+(is\s+)?(needed|required)/i,
      /(without|don'?t need|does not need|doesn'?t need|no need for)\s+(a\s+|an\s+)?(activation\s+|purchase\s+)?code/i,
    ],
    why: 'الصكّ هو الرابط الوحيد بين دفعةٍ في سلة وحسابٍ في قِمّة. نفيُ الحاجة إليه يترك المشتري ينتظر فتحًا لا يأتي.',
  },
  {
    id: 'نقل آليّ إلى التطبيق',
    re: [
      // نافذة قصيرة لا التصاق: «ينتقل للتطبيق نقلًا تلقائيًّا» يفصل بينهما حشوٌ
      // لا يغيّر المعنى. وأوّل صيغة هنا اشترطت الالتصاق فمرّت المحاكاة — أُصلحت
      // بالمهاجمة لا بالمراجعة (§4.2).
      /(نقل|تحويل|ترحيل|ينتقل|تنتقل|انتقال)[^]{0,20}?(تلقائي|اتوماتيك|اوتوماتيك)/u,
      /automatic(ally)?\s+(transfer|migration|sync of your purchase)/i,
    ],
    why: 'لا مسار نقل بين سلة والتطبيق في V1 — الوعد به وعدٌ بما لا يحدث.',
  },
  {
    id: 'تفعيل عبر واتساب',
    re: [/(واتساب|whatsapp)[^]{0,30}?(تفعيل|فعل|activat)/iu, /(تفعيل|activat)[^]{0,30}?(واتساب|whatsapp)/iu],
    why: 'التفعيل داخل التطبيق. واتساب قناة تواصل لا قناة تفعيل — وخلطهما يرسل المشتري إلى باب مغلق.',
  },
]

const violates = (raw) => {
  const t = normalize(raw)
  if (!COMMERCE_SUBJECT.test(t)) return null
  for (const c of CLAIMS) if (c.re.some((r) => r.test(t))) return c
  return null
}

console.log('\n① لا سطح يراه المستخدم ينقض عقد التفعيل V1')
const files = SCAN_DIRS.flatMap((d) => walk(d))
const violations = []
for (const rel of files) {
  const src = readFileSync(resolve(ROOT, rel), 'utf8')
  for (const s of userFacingStrings(src, rel.endsWith('.html'))) {
    const v = violates(s)
    if (v) violations.push(`${rel} :: [${v.id}] «${s.trim().slice(0, 80)}» — ${v.why}`)
  }
}
check(`صفر نقضٍ عبر ${files.length} ملفًّا في ${SCAN_DIRS.length} أدلّة`, violations.length === 0,
  violations.slice(0, 5).join('\n      '))

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n② سطح إدخال الكود يقول للمشتري ما يفعل — النفي وحده لا يكفي')

/** يستخرج قيمتي `codeBody` بترتيب الملفّ: العربية ثمّ الإنجليزية. */
function codeBodies(rel) {
  const src = readFileSync(resolve(ROOT, rel), 'utf8')
  const noBlock = src.replace(/\/\*[\s\S]*?\*\//g, '')
  const hits = [...noBlock.matchAll(/codeBody:\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1])
  return hits
}

const ARABIC = /[؀-ۿ]/
const SURFACES = [
  {
    rel: 'src/i18n/dict/access.ts',
    what: 'PremiumGate — اللوحة التي يصطدم بها المشتري',
    // هذا السطح حمل النقض؛ فيلزمه أن يسمّي مسار سلة صراحةً لا أن يكتفي بالنفي.
    requireSalla: true,
  },
  { rel: 'src/i18n/dict/premium.ts', what: 'PremiumView — شاشة العضوية', requireSalla: false },
]

const CREDENTIAL = /صك الشراء|كود التفعيل|purchase code|activation code/i
const INSTRUCT_AR = /الصق|الصقه|اكتب|ادخل|فعل/u
const INSTRUCT_EN = /paste|enter|activate/i
const SALLA = /سله|سلة|salla/i

for (const s of SURFACES) {
  const bodies = codeBodies(s.rel)
  check(`${s.rel}: قيمتا codeBody موجودتان`, bodies.length === 2, `عُثر على ${bodies.length}`)
  if (bodies.length !== 2) continue

  const [ar, en] = bodies
  // تأكيد بنيوي: لو انقلب ترتيب اللغتين لفحصنا النصّ الخطأ ومرّ الحارس صامتًا.
  check(`${s.rel}: الأولى عربية والثانية إنجليزية — الترتيب مقيس لا مفترض`,
    ARABIC.test(ar) && !ARABIC.test(en))

  const nar = normalize(ar), nen = normalize(en)
  check(`  ${s.what} — العربية تسمّي الصكّ`, CREDENTIAL.test(nar), `«${ar.slice(0, 60)}…»`)
  check(`  ${s.what} — العربية تأمر بإدخاله`, INSTRUCT_AR.test(nar))
  check(`  ${s.what} — الإنجليزية تسمّي الصكّ`, CREDENTIAL.test(nen))
  check(`  ${s.what} — الإنجليزية تأمر بإدخاله`, INSTRUCT_EN.test(nen))
  if (s.requireSalla) {
    check(`  ${s.what} — تخاطب مشتري سلة بالاسم (عربي)`, SALLA.test(nar))
    check(`  ${s.what} — وبالإنجليزية`, SALLA.test(nen))
  }
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n③ ⚔️ محاكاة الالتفاف — بوّابةٌ لم تُهاجَم ليست بوّابة')

const OLD_AR = 'اكتب كود الوصول اللي وصلك من حملة أو دعوة. الشراء من سلة يفتح حسابك بنفسه — ما يحتاج كود.'
const OLD_EN = 'Enter an access code from a campaign or invite. A Salla purchase unlocks your account on its own — no code needed.'

check('⚔️ النصّ الساقط بعينه (عربي) يُرصد', violates(OLD_AR)?.id === 'تفعيل تلقائي بعد الشراء',
  violates(OLD_AR)?.id ?? 'لم يُرصد')
check('⚔️ والنصّ الساقط (إنجليزي) يُرصد', violates(OLD_EN) !== null, violates(OLD_EN)?.id ?? 'لم يُرصد')

// الالتفاف الأرخص: نفس الجملة بترقيم مختلف وشدّة منزوعة ومسافات مضاعفة.
check('⚔️ وترقيمٌ مختلف لا ينجّيه — الحارس يقيس المعنى لا رسمه',
  violates('الشراء من سلة  يفتح حسابك   بنفسه!! ما يحتاج صكّ؟؟') !== null)
check('⚔️ ولا صيغة إنجليزية مُعاد ترتيبها',
  violates('Your Salla purchase automatically unlocks Premium access.') !== null)
check('⚔️ ولا وعد نقل آليّ', violates('شراؤك من سلة ينتقل للتطبيق نقلًا تلقائيًّا.') !== null)
check('⚔️ ولا تفعيل عبر واتساب', violates('بعد الشراء نرسل لك رابط التفعيل على واتساب.') !== null)

// ═══ والاتجاه الآخر: ما يجب ألّا يُرصد ═══
check('⚔️ تعليقٌ يشرح المنع لا يُرصد — الحارس يقيس المعروض لا الشارح',
  userFacingStrings("// الشراء من سلة يفتح حسابك بنفسه — ما يحتاج كود\nconst ok = 'الصق صكّ الشراء'", false)
    .every((s) => violates(s) === null))
check('⚔️ وذكرٌ بريء لسلة لا يُرصد — الاقتران شرط لا الكلمة',
  violates('راحوا لسلة') === null && violates('مخزون إطلاق سلة') === null)
check('⚔️ و«التجربة تبدأ بلا كود» تمرّ — جملة صادقة عن التجربة لا عن الشراء',
  violates('تجربتك تبدأ بلا كود') === null)
check('⚔️ والنصّ المعتمد الحالي يمرّ — الحارس لا يمنع ما يفرضه',
  violates(codeBodies('src/i18n/dict/access.ts')[0]) === null
  && violates(codeBodies('src/i18n/dict/access.ts')[1]) === null)

// ═══ التأكيد المضادّ على الفحص المُثبِت — كي لا يمرّ مجّانًا ═══
{
  const gutted = normalize('اكتب اللي وصلك هنا.')
  check('⚔️ ونصٌّ خالٍ من تسمية الصكّ يُسقط الفحص المُثبِت — ② ليس فارغًا',
    !CREDENTIAL.test(gutted))
}
{
  const noSalla = normalize('صكّ الشراء اللي وصلك — الصقه هنا.')
  check('⚔️ ونصٌّ لا يخاطب مشتري سلة يُسقط شرط السطح المصطدَم به',
    CREDENTIAL.test(noSalla) && !SALLA.test(noSalla))
}

console.log(`\n${fails.length === 0 ? '✅' : '❌'} عقد التفعيل V1: ${pass} نجحت / ${fails.length} فشلت`)
if (fails.length) { fails.forEach((f) => console.log(`   • ${f}`)); process.exit(1) }
