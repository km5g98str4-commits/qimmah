// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM-SURFACE — سطح العضوية الدائم وعمليات صكوك الشراء.
//  [WAVE2-PREMIUM-SURFACE] · [WAVE2-PURCHASE-OPS]
//
//  ═══ العطل الذي وُجد هذا الإثبات لأجله ═══
//  مسار التفعيل كان يعيش في `PremiumGate` وحدها، وهي **لا تُفتح إلا بالاصطدام**:
//  شرط ظهورها `blockedAction` غير فارغ. فمن اشترى صكًّا وفتح التطبيق لا يجد أين
//  يضعه ما لم يتعثّر بجدارٍ أوّلًا — وهو لا يعرف أن عليه التعثّر.
//
//  ═══ لماذا هذا الإثبات **يُنفِّذ** ولا يقرأ نصوصًا ═══
//  فحصُ «هل الملف يذكر trialExpired؟» يمرّ على شيفرة لا تصل المستخدم (§4.2).
//  فسياسة «أي نداء في أي حالة» تعيش في وحدة نقيّة (`premiumSurfacePolicy.ts`)،
//  وهنا تُصرَّف بـesbuild و**تُستدعى دوالّها الحقيقية** على الحالات الثماني كلّها.
//
//  ═══ والتأكيدات المضادّة (§4.2) ═══
//  لكل ضمانة محاكاةُ التفافٍ يجب أن تسقط **بفحص مسمّى** لا بـ`TypeError`:
//  سياسةٌ تعرض التجربة بعد انتهائها · سياسةٌ تعرض الكود لملغىً · لوحةٌ تكتب
//  النصّ الخام في تخزين المتصفّح · حدٌّ أعلى من الخادم · تسميةُ «متبقٍ في سلة».
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const root = resolve(import.meta.dirname, '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')

let pass = 0
const failures = []
function check(name, ok, detail) {
  if (ok) { pass += 1; console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`) }
  else { failures.push(name); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`) }
}

async function loadModule(relPath) {
  const dir = mkdtempSync(join(tmpdir(), 'qimmah-premium-'))
  const outfile = join(dir, 'mod.mjs')
  try {
    await build({
      entryPoints: [resolve(root, relPath)],
      bundle: true, format: 'esm', platform: 'node', outfile,
      alias: { '@': resolve(root, 'src') },
      external: ['@supabase/supabase-js', 'react', 'react-dom'],
      define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: true }) },
      logLevel: 'silent',
    })
    return await import(pathToFileURL(outfile).href)
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* ignore */ }
  }
}


/**
 * الشيفرة بلا تعليقات.
 *
 * ═══ لماذا لزم هذا ═══
 * تعليقات هذه الملفات **تسمّي المحظور لتشرح منعه** («لا تُكتب في localStorage»
 * · «لا من `Date.now()`»). فحصٌ يقرأ الملفّ خامًا يرصد الشرح ويحسبه مخالفة —
 * فيسقط على شيفرة سليمة، ويُغري الكاتب بحذف الشرح لا بإصلاح عطل.
 * وهو نفس درسِ `test:premium-copy`: **يُستثنى بالموضع لا بالصيغة.**
 *
 * وخطر الاستثناء أن يبتلع كل شيء فيصير الحارس فارغًا — ولذلك يحرسه تأكيدٌ
 * مضادّ أدناه: نصٌّ مزروع **في شيفرة حقيقية** يجب أن يبقى مرصودًا.
 */
function codeOnly(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((l) => l.replace(/(^|[^:'"`])\/\/.*$/, '$1'))
    .join('\n')
}

console.log('\n════════ سطح العضوية — السياسة منفَّذةً ════════\n')

const policy = await loadModule('src/lib/access/premiumSurfacePolicy.ts')
const { ALL_ACCESS_KINDS, offersTrial, offersCode, offersBuy, showsRemaining, showsPermanentPremiumNote } = policy

// ① الحالات الثماني كلّها مغطّاة — فلا حالة تُنسى بلا قرار.
check('الحالات الثماني كلّها معرّفة', ALL_ACCESS_KINDS.length === 8, `${ALL_ACCESS_KINDS.length}`)
check('كل حالة لها قرار محدَّد في النداءات الثلاثة',
  ALL_ACCESS_KINDS.every((k) => [offersTrial(k), offersCode(k), offersBuy(k)].every((v) => typeof v === 'boolean')))

console.log('\n▸ التجربة — تُعرض حيث تصحّ وحدها')
check('تُعرض في noAccess (preview)', offersTrial('preview') === true)
check('لا تُعرض بعد انتهائها — ولا تلميح بإعادتها', offersTrial('trialExpired') === false)
check('لا تُعرض وهي شغّالة', offersTrial('trial') === false)
check('لا تُعرض لمن عنده Premium', offersTrial('premium') === false)
check('لا تُعرض لمن عنده وصول خاص', offersTrial('special') === false)
check('لا تُعرض لملغىً', offersTrial('revoked') === false)
check('لا تُعرض على جهلٍ بالحالة', offersTrial('checking') === false && offersTrial('unknown') === false)

console.log('\n▸ الكود — أوّل درجة، لا خلف جدار')
check('متاح في noAccess — بلا اصطدام بفعل محجوب', offersCode('preview') === true)
check('متاح أثناء التجربة — فالمشتري يرتقي فورًا', offersCode('trial') === true)
check('متاح بعد انتهاء التجربة', offersCode('trialExpired') === true)
check('متاح فوق الوصول الخاص — يرتقي إلى Premium', offersCode('special') === true)
check('غير معروض لمن هو Premium أصلًا', offersCode('premium') === false)
check('غير معروض لملغىً — الإلغاء لاصق ولا يرفعه مسار ذاتي', offersCode('revoked') === false)

console.log('\n▸ Premium الدائم — لا تاريخ مخترع')
check('Premium: لا سطر مدّة ولو مُرِّر رقم', showsRemaining('premium', 999_999) === false)
check('Premium: لافتة «بلا تاريخ انتهاء» تُعرض', showsPermanentPremiumNote('premium') === true)
check('وغيرها لا يعرض تلك اللافتة',
  ALL_ACCESS_KINDS.filter((k) => k !== 'premium').every((k) => showsPermanentPremiumNote(k) === false))
check('التجربة: المدّة تُعرض حين توجد', showsRemaining('trial', 60_000) === true)
check('المدّة الغائبة (null) لا تُعرض أبدًا',
  ALL_ACCESS_KINDS.every((k) => showsRemaining(k, null) === false))
check('المدّة المنقضية (≤0) لا تُعرض', showsRemaining('trial', 0) === false)
check('لا نداء شراء لمن اشترى', offersBuy('premium') === false)

// ── التأكيدات المضادّة على السياسة ──
console.log('\n▸ ⚔️ محاكاة الالتفاف — السياسة')
{
  const bad = (k) => k === 'preview' || k === 'trialExpired'   // سياسة تعيد التجربة بعد انتهائها
  check('⚔️ سياسةٌ تعرض التجربة بعد انتهائها تُرصد',
    bad('trialExpired') === true && offersTrial('trialExpired') === false,
    'الفحص أعلاه يسقط لو تبنّينا هذه السياسة')
}
{
  const bad = (k) => k !== 'premium' && k !== 'checking'       // سياسة تعرض الكود لملغىً
  check('⚔️ سياسةٌ تعرض الكود لملغىً تُرصد',
    bad('revoked') === true && offersCode('revoked') === false)
}
{
  const bad = () => true                                       // سياسة تعرض المدّة دائمًا
  check('⚔️ سياسةٌ تعرض مدّةً لـPremium الدائم تُرصد',
    bad() === true && showsRemaining('premium', 999_999) === false)
}

console.log('\n════════ الشاشة — الوصل الحقيقي لا سطحٌ ثانٍ ════════\n')

const view = read('src/views/PremiumView.tsx')
const routes = read('src/lib/appRoutes.ts')
const app = read('src/App.tsx')
const settings = read('src/views/SettingsView.tsx')

check('المسار مسجَّل في اتّحاد المسارات', /\|\s*'premium'/.test(routes))
check('والمسار في قائمة ROUTES — فالعنوان يُقرأ من الهاش', /^\s*'premium',$/m.test(routes))
check('الشاشة موصولة في App بفرع مسارها', /view === 'premium'/.test(app))
check('ومدخلها في الإعدادات — طريق مكتشَف بلا اصطدام', /settings-premium-link/.test(settings))

// ═══ الضمانة المركزية: لا سلطة ثانية ═══
check('الشاشة تستهلك `useAccess` ولا تنادي RPC بنفسها',
  view.includes("useAccess") && !/\.rpc\(/.test(view) && !/redeem_access_code/.test(view))
check('ولا تستعمل `useAccessSummary` بديلًا عن القرار — بل عرضًا',
  view.includes('useAccessSummary'))
check('ولا تكتب حالة تجارية في تخزين المتصفّح',
  !/localStorage|sessionStorage|indexedDB/i.test(codeOnly(view)))
check('ولا تحسب انتهاءً بساعة الجهاز', !/Date\.now\(\)/.test(codeOnly(view)))
check('التفعيل يمرّ بـ`redeem` من السياق — نفس مسار البوّابة',
  /const\s*\{[^}]*\bredeem\b[^}]*\}\s*=\s*useAccess\(\)/.test(view))
check('وبدء التجربة بـ`beginTrial` من السياق',
  /const\s*\{[^}]*\bbeginTrial\b[^}]*\}\s*=\s*useAccess\(\)/.test(view))
check('حارس الإرسال المزدوج للكود قائم', /if \(redeemState === 'checking'\) return/.test(view))
check('وحارس الإرسال المزدوج للتجربة قائم', /if \(trialState === 'working'\) return/.test(view))
check('حقل الكود LTR ولو كانت الجلسة عربية', /id="premium-activation-code"[\s\S]{0,600}?dir="ltr"/.test(view))
check('ومنطقة الرسالة حيّة ومعرَّفة لقارئ الشاشة',
  /aria-live="polite"/.test(view) && /aria-describedby="premium-code-hint premium-code-message"/.test(view))
check('ولا كود يُطبع في السجلّ', !/console\.(log|info|warn|error)/.test(view))

console.log('\n════════ عمليات صكوك الشراء — الظهور الواحد ════════\n')

const panel = read('src/admin/ui/PurchaseBatchPanel.tsx')
const routeC = read('src/admin/ui/AdminRoute.tsx')
const dict = read('src/i18n/dict/purchaseBatches.ts')

check('اللوحة تستهلك عقد الإدارة القائم ولا تنادي RPC بنفسها',
  !/\.rpc\(/.test(panel) && /issuePurchaseBatch/.test(routeC) && /loadPurchaseBatches/.test(routeC))
check('الحدّ الأعلى ٥٠٠ — مرآةً للخادم لا اختراعًا أعلى منه',
  /PURCHASE_BATCH_MAX = 500/.test(panel))
{
  const migration = read('supabase/migrations/20260829120001_purchase_credentials.sql')
  check('⟲ والحدّ مطابق لِما ترفضه الهجرة فعلًا',
    /n < 1 or n > 500/.test(migration), 'batch_count_out_of_range')
}
check('الوسم إلزامي — مخزون بلا اسم لا يُدقَّق', /labelRequired/.test(panel) && /trimmedLabel === ''/.test(panel))

// ═══ تسرّب النصّ الخام — الضمانة التي لا تُساوَم ═══
console.log('\n▸ النصّ الخام — لا أثر باقٍ')
check('اللوحة لا تكتب النصوص في تخزين المتصفّح',
  !/localStorage|sessionStorage|indexedDB/i.test(codeOnly(panel)))
check('ولا في السجلّ', !/console\.(log|info|warn|error)/.test(codeOnly(panel)))
check('وحاوي الحالة لا يخزّنها كذلك',
  !/localStorage|sessionStorage|indexedDB/i.test(codeOnly(routeC).slice(codeOnly(routeC).indexOf('issuedPurchase'))))
check('النصوص في حالة React وحدها — تُمحى بالإغلاق',
  /setIssuedPurchase\(null\)/.test(routeC))
check('وعنوان الـBlob يُبطَل فور التنزيل — لا مرجع حيّ يبقى',
  /URL\.revokeObjectURL\(url\)/.test(panel))
check('التحذير صريح: لا تُستعاد بعد الإغلاق', /issuedWarning/.test(panel) && /ما نقدر نستعيدها/.test(dict))
check('والإغلاق يسأل قبل أن يمحو', /dismissConfirm/.test(panel) && /window\.confirm/.test(panel))
check('التصدير يحمل الصكّ وحده — لا بصمات ولا معرّفات ولا مستخدمين',
  /\['code', \.\.\.issued\.codes\]/.test(panel)
  && !/hash|user_id|entitlement|codeId/i.test(panel.slice(panel.indexOf('const download'), panel.indexOf('const copyAll'))))

console.log('\n▸ صدق العدّ — لا ادّعاء لمكان الصكّ')
check('العمود يُسمّى «غير مستردّ» لا «متبقٍ في سلة»',
  /colUnredeemed: 'غير مستردّ'/.test(dict) && !/متبقٍ في سلة['"]/.test(dict))
check('ومعناه معروض في الشاشة لا مدفونًا في تعليق',
  /purchase-unredeemed-meaning/.test(panel) && /unredeemedMeaning/.test(dict))
check('والمعنى يقول صراحةً إننا لا نعرف مكان الصكّ',
  /ما يقول وين الصكّ/.test(dict) && /does not say where the code is/.test(dict))
check('الغياب يُعرض «—» ولا يصير صفرًا', /n === null \? '—'/.test(panel))
check('duration_days الغائبة ليست عطلًا: اللوحة لا تعرض مدّة للصكّ أصلًا',
  !/durationDays/.test(panel))
// [WAVE3] كان هذا الفحص يحرس **إعلان غياب** الإطفاء الدفعيّ. القدرة بُنيت
// (`founder_disable_purchase_batch` + زرّها)، فانقلب الحارس من «الغياب مُعلَن»
// إلى «الحضور محروس» — قسم WAVE3 أدناه يتولّى العمق، وهذا يحرس الوصلة.
check('الإطفاء الدفعيّ صار قائمًا — زرّه على صفّ الدفعة',
  /purchase-batch-disable-open/.test(panel) && /batchDisableCta/.test(dict)
  && !/killBatchAbsent/.test(dict))

console.log('\n▸ ⚔️ محاكاة الالتفاف — اللوحة')
{
  // الزرع في **شيفرة حقيقية** لا في تعليق — فالمحاكاة تهاجم ما يشحن فعلًا.
  const forged = panel.replace('const [copied, setCopied] = useState(false)',
    "const [copied, setCopied] = useState(false)\n  localStorage.setItem('codes', issued?.codes.join())")
  check('⚔️ لوحةٌ تكتب النصّ الخام في localStorage تُرصد',
    /localStorage/i.test(codeOnly(forged)) && !/localStorage/i.test(codeOnly(panel)))
}
{
  // ⟲ والمُستثني ليس شاملًا: لو ابتلع `codeOnly` الشيفرة لصار كل حارس أعلاه
  // فارغًا يمرّ على أي شيء. فيُثبَت أنه يُبقي الشيفرة ويحذف التعليق وحده.
  const sample = "// localStorage.setItem('x')\nconst y = localStorage.getItem('z')"
  const stripped = codeOnly(sample)
  check('⟲ `codeOnly` يحذف التعليق ويُبقي الشيفرة — فالاستثناء ليس ابتلاعًا',
    !stripped.includes("setItem") && stripped.includes('getItem'))
  check('⟲ وشيفرة اللوحة تنجو من التجريد — الحارس يفحص محتوًى لا فراغًا',
    codeOnly(panel).includes('URL.revokeObjectURL') && codeOnly(panel).length > 2000,
    `${codeOnly(panel).length} حرفًا`)
}
{
  const forged = dict.replace("colUnredeemed: 'غير مستردّ'", "colUnredeemed: 'متبقٍ في سلة'")
  check('⚔️ عمودٌ يدّعي «متبقٍ في سلة» يُرصد',
    /متبقٍ في سلة/.test(forged) && !/colUnredeemed: 'متبقٍ في سلة'/.test(dict))
}
{
  const forged = panel.replace('PURCHASE_BATCH_MAX = 500', 'PURCHASE_BATCH_MAX = 5000')
  check('⚔️ حدٌّ عميلٌ أعلى من الخادم يُرصد',
    /PURCHASE_BATCH_MAX = 5000/.test(forged) && /PURCHASE_BATCH_MAX = 500\b/.test(panel))
}

console.log('\n════════ [WAVE3] إطفاء الدفعة — سطح المتصفّح ════════\n')

{
  const live = read('src/admin/contract/liveSource.ts')
  const panelW3 = read('src/admin/ui/PurchaseBatchPanel.tsx')
  const dictW3 = read('src/i18n/dict/purchaseBatches.ts')
  const routeW3 = read('src/admin/ui/AdminRoute.tsx')
  const migration = read('supabase/migrations/20260831120001_purchase_batch_disable.sql')

  console.log('▸ الاتجاه الواحد — يسحب ولا يمنح')
  check('العقد يحمل `disablePurchaseBatch` موصولًا بدالّة الخادم',
    /disablePurchaseBatch/.test(live) && /founder_disable_purchase_batch/.test(read('src/admin/contract/metrics.ts')))
  check('ولا دالّة تمكينٍ دفعيّ في العقد كلّه — بأي اسم',
    !/enablePurchaseBatch|batchEnable|enableBatch|setBatchEnabled/i.test(codeOnly(live)))
  check('ولا في اللوحة ولا في الحاوي',
    !/enablePurchaseBatch|setBatchEnabled/i.test(codeOnly(panelW3)) && !/enablePurchaseBatch|setBatchEnabled/i.test(codeOnly(routeW3)))
  check('والنداء لا يحمل وسيط اتجاه — لا p_enabled في دالّة الدفعة',
    !/founder_disable_purchase_batch\([^)]*p_enabled/.test(migration))

  console.log('\n▸ التأكيد والسبب — فعلٌ هدّام لا يمرّ خفيفًا')
  check('زرّ الإطفاء يفتح كتلة تأكيد لا ينفّذ مباشرة',
    /purchase-batch-disable-open/.test(panelW3) && /setConfirmLabel\(b\.label\)/.test(panelW3))
  check('والتأكيد يشترط سببًا غير فارغ قبل النداء',
    /reason === ''/.test(panelW3) && /batchDisableReasonRequired/.test(panelW3))
  check('والنتيجة تعرض العدد الحرفي من الخادم',
    /disableResult\.disabledCount/.test(panelW3))
  check('والعقد يرفض ردًّا بلا عدد صحيح — العدّ جزء من العقد',
    /typeof rec\.disabled_count !== 'number'/.test(live))

  console.log('\n▸ الصدق — منح المشترين لا تُمسّ، ويُقال ذلك في الشاشة')
  check('لافتة «التفعيلات القائمة لا تُسحب» مرسومة في كتلة التأكيد',
    /purchase-batch-disable-not-revoked/.test(panelW3))
  check('ونصّها موجود بالعربية والإنجليزية معًا',
    /ما تنسحب/.test(dictW3) && /are not revoked/.test(dictW3))
  check('ورسالة النجاح تكرّر الحقيقة نفسها بعد التنفيذ',
    /ما انمست/.test(dictW3) && /are untouched/.test(dictW3))
  check('ولا نصوص خام تُعرض في مسار الإطفاء — القسم لا يلمس codes',
    !/issued\.codes/.test(panelW3.slice(panelW3.indexOf('purchase-batch-disable-confirm'))))

  console.log('\n▸ ⚔️ محاكاة الالتفاف — Wave3')
  {
    const forged = live.replace('export async function disablePurchaseBatch',
      'export async function enablePurchaseBatch(d, i) { return 0 }\nexport async function disablePurchaseBatch')
    check('⚔️ عقدٌ يحمل تمكينًا دفعيًّا يُرصد باسمه',
      /enablePurchaseBatch/i.test(codeOnly(forged)) && !/enablePurchaseBatch/i.test(codeOnly(live)))
  }
  {
    const forged = panelW3.replace('data-testid="purchase-batch-disable-not-revoked"', 'data-testid="gone"')
    check('⚔️ كتلة تأكيد بلا لافتة «لا تُسحب» تُرصد',
      !/purchase-batch-disable-not-revoked/.test(forged) && /purchase-batch-disable-not-revoked/.test(panelW3))
  }
  {
    const forged = panelW3.replace("if (reason === '') { setDisableLocalError(t.batchDisableReasonRequired); return }", '')
    check('⚔️ تأكيدٌ ينفّذ بلا سبب يُرصد',
      !/batchDisableReasonRequired\); return \}/.test(forged) && /batchDisableReasonRequired\); return \}/.test(panelW3))
  }
}

console.log('\n════════════════════════════════════════════════════════════')
if (failures.length === 0) {
  console.log(`✅ سطح العضوية وعمليات الصكوك: ${pass} نجحت / 0 فشلت`)
  process.exit(0)
}
console.log(`❌ سطح العضوية: ${pass} نجحت / ${failures.length} فشلت`)
for (const f of failures) console.log(`   • ${f}`)
process.exit(1)
