#!/usr/bin/env node
/**
 * حارس بطاقة الوصول والمدخل الظاهر للتفعيل — [PREMIUM-UX-W2]
 *
 * ═══ ماذا يحرس (نيّةً لا سطورًا) ═══
 * التكليف يطلب ضمانات دائمة، وهذا الحارس يفرضها على **المصدر المعروض**:
 *   ① مدخل التفعيل يبقى في متناول غير المشترك (تجربة/منتهية/موقوت/معاينة).
 *   ② حالة Premium تُعرَض من الخادم وحده — لا يقرّرها العميل.
 *   ③ واجهة التجربة **لا تدّعي Premium**.
 *   ④ واجهة الوصول الموقوت **لا تدّعي Premium مشترى**.
 *   ⑤ بطاقة Premium **بلا انتهاء** — لا عدّاد ولا تاريخ.
 *   ⑥ التفعيل يمرّ بالبوّابة المحصَّنة نفسها — لا مسار ثانٍ، ولا فتح محلّي.
 *   ⑦ النجاح يُحدِّث الاستحقاق **بلا إعادة تحميل**، والفشل لا يمسّ الحالة.
 *
 * القياس **بحدود الكتل** (block) لا `includes()` متفرّقة (الميثاق §4.2)، ومع كل
 * إحكام محاكاة التفافٍ تسقط باسمها. ولا يُثبِّت هذا الحارس ماركب عرضيًّا (فئات
 * CSS، أسطر استيراد) — يقيس السلوك والوعد.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8')
let pass = 0
const fails = []
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`) }
  else { fails.push(name); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`) }
}

/** يستخرج كتلة فرع حالة بحدّها: من `data-access-kind="X"` حتى الفرع التالي. */
function kindBlock(src, kind) {
  const marker = `data-access-kind="${kind}"`
  const a = src.indexOf(marker)
  if (a < 0) return ''
  // نهاية الفرع = أوّل `data-access-kind=` بعده، أو نهاية الملف.
  const next = src.indexOf('data-access-kind="', a + marker.length)
  return next > a ? src.slice(a, next) : src.slice(a)
}

const card = read('src/components/AccessCard.tsx')
const line = read('src/components/AccessStatusLine.tsx')
const provider = read('src/lib/access/provider.tsx')
const context = read('src/lib/access/context.ts')
const gate = read('src/components/PremiumGate.tsx')
const dict = read('src/i18n/dict/access.ts')

// ══════════════════════════════════════════════════════════════════════════
console.log('\n① المدخل الظاهر — التفعيل مسار أوّليّ لا يُكتشف بالخطأ')

// البطاقة تقرأ الحالة المحسومة من الخادم، ولا تكتب استحقاقًا.
check('البطاقة تشتقّ حالتها من useAccessSummary (الخادم) لا من حالة محلّية',
  card.includes('useAccessSummary(lang)'))
check('ولا تكتب استحقاقًا بنفسها (لا setEntitlement ولا localStorage)',
  !/setEntitlement|localStorage|entitlement\s*=/.test(card))
check('ولا تفتح فعلًا مدفوعًا محلّيًّا (لا can/guard مُتجاوَز، ولا "premiumActive" مزروعة)',
  !card.includes("'premiumActive'") && !/status\s*:\s*'active'/.test(card))

// مدخل الكود ظاهر لكل حالة غير المفعّلة — بالفرع لا بالادّعاء.
for (const kind of ['special', 'trial', 'trialExpired', 'noAccess']) {
  const b = kindBlock(card, kind)
  check(`فرع «${kind}» يحمل مدخل تفعيلٍ ظاهرًا (openActivation)`, b.includes('openActivation'), b ? '' : 'الفرع غير موجود')
}

// ══════════════════════════════════════════════════════════════════════════
console.log('\n② حالة Premium من الخادم — بلا انتهاء، بلا سعر، بلا اشتراك')
const premium = kindBlock(card, 'premium')
check('فرع Premium موجود بحدّه', premium.length > 0)
check('★ يعرض «مفعّل» لا «اشترِ» (شارة الحالة، لا نداء شراء)',
  premium.includes('cardPremiumBadge') && !premium.includes('openActivation'))
check('★ وبلا انتهاء: لا عدّاد ولا تاريخ في فرع Premium',
  !/remainingMs|formatRemaining|expires|expiresAt|summary\.label/.test(premium))
check('★ وبلا رابط شراء: البطاقة الفاعلة تحلّ محلّ المدخل (لا PurchaseCta)',
  !premium.includes('PurchaseCta') && !premium.includes('checkoutUrl'))
check('والنصّ هو الصيغة المعتمدة (§0.1) — cardPremiumNote',
  premium.includes('cardPremiumNote'))
// محاكاة الالتفاف: لو دُسّ عدّاد في فرع Premium لالتُقط.
check('⚔️ محاكاة: عدّاد مدسوس في فرع Premium يُرصد',
  /remainingMs|formatRemaining/.test(premium + 'remainingMs'))

// ══════════════════════════════════════════════════════════════════════════
console.log('\n③ التجربة لا تدّعي Premium')
const trial = kindBlock(card, 'trial')
check('فرع التجربة لا يعرض شارة Premium ولا نصّها',
  !trial.includes('cardPremiumBadge') && !trial.includes('cardPremiumNote') && !trial.includes('statusPremium'))
check('ويعرض حالته من summary (عدّاد الخادم) لا حالةً مخترعة', trial.includes('summary.label'))

// ══════════════════════════════════════════════════════════════════════════
console.log('\n④ الوصول الموقوت لا يدّعي Premium مشترى')
const special = kindBlock(card, 'special')
check('فرع الوصول الموقوت لا يعرض شارة Premium المفعّلة',
  !special.includes('cardPremiumBadge'))
check('★ ولا يسمّي نفسه «قِمّة Premium مفعّل» — يستعمل summary.label (وصولك مفتوح)',
  special.includes('summary.label') && !special.includes('statusPremium'))
check('والنصّ يميّزه ويعرض ترقيةً بكود — cardSpecialNote',
  special.includes('cardSpecialNote'))
// المفردات نفسها لا تخلط: نصّ الوصول الموقوت لا يقول «مفعّل» ولا «Premium».
const specialNoteAr = (dict.match(/cardSpecialNote:\s*'([^']+)'/) ?? [])[1] ?? ''
check('نصّ cardSpecialNote لا يزعم أن الوصول Premium **مفعّل**',
  specialNoteAr.length > 0 && !/مفعّل/.test(specialNoteAr), specialNoteAr.slice(0, 50))

// ══════════════════════════════════════════════════════════════════════════
console.log('\n⑤ التفعيل يمرّ بالبوّابة المحصَّنة نفسها — لا مسار ثانٍ')
// openActivation في العقد والمزوّد، والبوّابة تُفتح به.
check('العقد يعلن openActivation و activationOpen', context.includes('openActivation') && context.includes('activationOpen'))
check('المزوّد يوصل openActivation إلى activationOpen', provider.includes('setActivationOpen(true)'))
check('★ closeGate يغلق المدخلين معًا (لا نافذة حيّة من مسارٍ نُسي)',
  /setBlockedAction\(null\);\s*setActivationOpen\(false\)/.test(provider))
check('★ البوّابة تُفتح بأحد المدخلين (blockedAction أو activationOpen)',
  gate.includes('activationOpen') && /const open =\s*blockedAction !== null \|\| activationOpen/.test(gate))
check('والبطاقة لا تبني نافذة تفعيلٍ خاصّة — تنادي المدخل الواحد',
  !card.includes('role="dialog"') && !/redeem\(/.test(card))
// البطاقة لا تفتح فعلًا محليًّا: لا window.location ولا reload.
check('لا إعادة تحميل ولا تنقّل قسريّ في البطاقة', !/location\.reload|window\.location/.test(card))

// ══════════════════════════════════════════════════════════════════════════
console.log('\n⑥ الشراء مسار مستقلّ عن الكود، ومصدره وجهة المنتج الواحدة')
check('رابط الشراء يمرّ من product.checkoutUrl (سلة) — لا رابط مخترع',
  card.includes('product.checkoutUrl') && card.includes('rel="noopener noreferrer"'))
check('وبدء التجربة سلطته الخادم (beginTrial) لا العميل', card.includes('beginTrial'))
check('ونيّة التجربة تُسجَّل قبل النداء (وعدٌ يُوفّى بعد التسجيل)',
  /recordTrialIntent\('settings'\)/.test(card))

// ══════════════════════════════════════════════════════════════════════════
console.log('\n⑦ النجاح يُحدِّث بلا إعادة تحميل، والفشل لا يمسّ الحالة')
// المزوّد: redeem يُعيد الحسم على النجاح فقط، بلا reload.
const redeemBlock = provider.slice(provider.indexOf('const redeem = useCallback'), provider.indexOf('const beginTrial'))
check('redeem يُعيد الحسم على النجاح وحده', /if \(outcome === 'success'\) await refresh\(\)/.test(redeemBlock))
check('★ ولا إعادة تحميل في مسار التفعيل — refresh لا reload',
  !/location\.reload|window\.location\.reload/.test(provider) && provider.includes('await refresh()'))
// الفشل لا يفتح شيئًا: البوّابة تعرض الرسالة ولا تُعيد الحسم إلا على النجاح.
check('البوّابة لا تُعيد الحسم إلا على النجاح (الفشل لا يمسّ الحالة)',
  gate.includes('setState(await redeem(code))'))

// ══════════════════════════════════════════════════════════════════════════
console.log('\n⑧ سطر الحالة — مدخل تفعيل من أي شاشة، بلا وعدٍ لا يقع')
check('سطر الحالة يعرض «عندك كود؟» للتجربة والمنتهية (canActivate)',
  /const canActivate = summary\.kind === 'trial' \|\| summary\.kind === 'trialExpired'/.test(line))
check('★ ولا يعرضه للإيقاف الإداري (revoked لاصق لا يرفعه كود)',
  !/revoked[\s\S]{0,40}canActivate/.test(line) && line.includes("summary.kind === 'trial' || summary.kind === 'trialExpired'"))
check('وزرّه ينادي المدخل الواحد openActivation', line.includes('openActivation'))
// محاكاة الالتفاف: لو أُضيف revoked إلى canActivate لكسر النيّة — نتحقّق أن النصّ لا يشمله.
check('⚔️ محاكاة: توسيع canActivate إلى revoked يُرصد بالمطابقة الحرفية',
  !line.includes("=== 'revoked'"))

// ══════════════════════════════════════════════════════════════════════════
console.log('\n' + '─'.repeat(70))
if (fails.length === 0) console.log(`✅ بطاقة الوصول والمدخل الظاهر: ${pass} فحصًا، 0 فشل.`)
else { console.log(`❌ ${fails.length} فشل من ${pass + fails.length}`); for (const f of fails) console.log(`   ✗ ${f}`) }
process.exit(fails.length ? 1 : 0)
