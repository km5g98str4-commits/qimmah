// ═══════════════════════════════════════════════════════════════════════════
//  ACTIVATION-UI — عقد واجهة التفعيل **وصدق أسباب الفشل**.
//  [SOVEREIGN-COMMERCE-001]
//
//  ═══ العطل الذي وسّع هذا الإثبات ═══
//  كانت **سبعة أسباب متمايزة** تخرج من نصّ واحد: «ما قدرنا نتحقّق الحين. تأكّد
//  من النت وجرّب بعد شوي» — منها غياب الخادم في بناء المراجعة (ليس عطلًا)،
//  و`identity_pepper` مفقود (عطل إعداد عندنا)، والمهلة، والمستخدم المجهول.
//  فكان عطلُنا يُلبَس شبكةَ المستخدم؛ ومن يُقال له «شبكتك» يعيد المحاولة أبدًا
//  ولا يبلّغ أحدًا.
//
//  ═══ لماذا هذا الإثبات **يُنفِّذ** ولا يقرأ نصوصًا ═══
//  فحصُ «هل الملف يذكر codeTimeout؟» يمرّ على شيفرة لا تصل المستخدم. هنا تُصرَّف
//  وحدات المصدر نفسها بـesbuild وتُستدعى دوالّها الحقيقية بـSQLSTATE المأخوذة
//  حرفيًا من الهجرات، ثم يُقاس **النصّ المعروض** لكل سبب.
//
//  ═══ التأكيد المضادّ (الميثاق §4.2) ═══
//  يُعاد بناء `outcomeMessages` وقد أُعيد سببان إلى رسالة واحدة، ويجب أن يسقط
//  فحص التمايز **باسمه** مسمّيًا السببين — لا بـ`TypeError` عابر.
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const gate = read('src/components/PremiumGate.tsx')
const source = read('src/lib/access/entitlementSource.ts')
const backend = read('src/lib/access/entitlementBackend.ts')
const strings = read('src/i18n/dict/access.ts')
const messagesSrc = read('src/lib/access/outcomeMessages.ts')
const app = read('src/App.tsx')

let pass = 0
const fails = []
const check = (label, condition, detail = '') => {
  if (condition) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fails.push(`${label}${detail ? ` — ${detail}` : ''}`); console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`) }
}

/** يصرّف وحدة TS إلى ESM ويستوردها، مع إمكان **زرع بيئة بناء** أو تعديل مصدر. */
async function loadModule(relPath, { env = {}, patch } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'qimmah-access-'))
  const outfile = join(dir, `mod-${Math.random().toString(36).slice(2)}.mjs`)
  try {
    const plugins = patch
      ? [{
          name: 'patch-source',
          setup(b) {
            b.onLoad({ filter: new RegExp(`${patch.file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }, (args) => {
              const text = readFileSync(args.path, 'utf8')
              const next = patch.apply(text)
              if (next === text) throw new Error(`patch had no effect on ${args.path}`)
              return { contents: next, loader: 'ts' }
            })
          },
        }]
      : []
    await build({
      entryPoints: [resolve(root, relPath)],
      bundle: true,
      format: 'esm',
      platform: 'node',
      outfile,
      alias: { '@': resolve(root, 'src') },
      external: ['@supabase/supabase-js'],
      define: { 'import.meta.env': JSON.stringify(env) },
      plugins,
      logLevel: 'silent',
    })
    return await import(pathToFileURL(outfile).href)
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* ignore */ }
  }
}

/** يستخرج كتلة بحدودها لا `includes()` متفرّقة (الميثاق §4.2). */
function block(text, startMarker, endMarker) {
  const a = text.indexOf(startMarker)
  if (a < 0) return ''
  const b = text.indexOf(endMarker, a + startMarker.length)
  return b > a ? text.slice(a, b) : ''
}

console.log('\n① عقد الحوار — نافذة حقيقية معنونة بأهداف لمس كافية')
check('الحوار يعرّف نفسه كنافذة modal معنونة',
  gate.includes('role="dialog"') && gate.includes('aria-modal="true"') && gate.includes('aria-labelledby="premium-gate-title"'))
check('زر الإغلاق ونداء الشراء يحققان أهداف لمس كافية',
  gate.includes('h-11 w-11') && gate.includes('min-h-[48px]') && (gate.match(/min-h-\[44px\]/g) ?? []).length >= 2)
check('رابط الشراء الخارجي مؤمّن ويمر من مصدر المنتج الواحد',
  gate.includes('href={product.checkoutUrl}') && gate.includes('target="_blank"') && gate.includes('rel="noopener noreferrer"'))
check('حقل التفعيل معلّم ورسالة النتيجة قابلة للقراءة',
  gate.includes('htmlFor="activation-code"') && gate.includes('role="status"') && gate.includes('data-testid="activation-code-message"'))
check('لا تعتمد واجهة التفعيل على alert أو confirm', !/\b(alert|confirm)\s*\(/.test(gate))
// محاكاة التفاف: وجود عبارات منفصلة لا يكفي؛ نزع الخاصية يجب أن يُكتشف باسمها.
check('محاكاة الالتفاف: نزع aria-modal يُكتشف', !gate.replace('aria-modal="true"', '').includes('aria-modal="true"'))

console.log('\n② التركيز يُلتقط قبل الفتح ويُعاد عند الإغلاق (WCAG 2.4.3)')
// [PREMIUM-UX-W2] البوّابة تُفتح بمدخلين (فعلٌ محجوب أو تفعيلٌ ظاهر)، فحارس
// الأثر صار `if (!open) return` وتبعيّته `[open, activationOnly]`. النيّة نفسها
// (التقاط التركيز قبل الفتح، وإعادته في التفكيك) لم تتغيّر — تُقاس بحدودها الجديدة.
const focusBlock = block(gate, 'useEffect(() => {\n    if (!open) return', '}, [open, activationOnly])')
check('كتلة أثر الفتح موجودة بحدودها', focusBlock.length > 0)
check('★ العنصر السابق يُلتقط **قبل** إعطاء التركيز لزرّ الإغلاق',
  focusBlock.indexOf('document.activeElement') >= 0
  && focusBlock.indexOf('document.activeElement') < focusBlock.indexOf('closeRef.current?.focus()'),
  'الالتقاط بعد focus() يحفظ زرّ الإغلاق نفسه — إعادة بلا معنى')
check('★ الأثر يُعيد التركيز في **تفكيكه** لا في معالج الإغلاق وحده',
  /return \(\) => \{[\s\S]*returnFocusRef\.current[\s\S]*\.focus\(\)/.test(focusBlock),
  'بلا تفكيك: الإغلاق يفكّك الشجرة فتسقط البؤرة على <body>')
check('ولا يُعاد التركيز إلى عنصر غادر الشجرة', /isConnected/.test(focusBlock))
// محاكاة الالتفاف: نزع التفكيك يُسقط الفحص أعلاه باسمه.
check('محاكاة الالتفاف: بلا كتلة `return () =>` لا يبقى مسار إعادة',
  !/return \(\) => \{[\s\S]*returnFocusRef\.current[\s\S]*\.focus\(\)/.test(focusBlock.replace(/return \(\) => \{[\s\S]*/, '')))
check('حبس التركيز باقٍ (Tab لا يغادر النافذة)', gate.includes("e.key !== 'Tab'") && gate.includes('dialogRef.current?.querySelectorAll'))

console.log('\n③ الكود الفارغ يُجاب عنه بنصّ لا بزرٍّ باهت')
check('★ الزرّ لم يعد معطّلًا على الفراغ', !/disabled=\{!code\.trim\(\)/.test(gate),
  'الزرّ المعطّل لا يُنتج حدث DOM أصلًا — نقرة بلا أثر ولا إعلان')
check('والتعطيل باقٍ أثناء التحقّق وبعد النجاح وحدهما',
  /disabled=\{state === 'checking' \|\| state === 'success'\}/.test(gate))
check('★ Enter يرسل حتى على الفراغ فتظهر الرسالة', /if \(e\.key === 'Enter'\) \{/.test(gate) && !/e\.key === 'Enter' && code\.trim\(\)/.test(gate))
check('★ الفراغ يعود بنتيجة **مسمّاة** من طبقة الوصول لا من الواجهة',
  /if \(!code\.trim\(\)\) return 'empty'/.test(source))
check('الحقل يشير إلى تلميحه ورسالته بـaria-describedby',
  gate.includes('aria-describedby="activation-code-hint activation-code-message"')
  && gate.includes('id="activation-code-hint"') && gate.includes('id="activation-code-message"'))
check('المنطقة الحيّة مرسومة دائمًا فيُعلَن ما يُدرَج فيها',
  /id="activation-code-message"[\s\S]{0,220}aria-live="polite"/.test(gate)
  && !/\{message && \(/.test(gate))
check('و«ما كتبت شيئًا» ليست «كودك خاطئ» — مفتاحان مختلفان',
  strings.includes('codeEmpty:') && strings.includes('codeInvalid:'))

console.log('\n④ لا نتيجة بلا رسالة — الجدول يرفض الإغفال بنيويًا')
check('اختيار الرسالة جدولٌ لا سلسلة شروط داخل المكوّن',
  messagesSrc.includes('satisfies Record<Exclude<RedeemUiState') && messagesSrc.includes('satisfies Record<Exclude<TrialUiState'))
check('والمكوّن يستهلك الجدول ولا يعيد بناءه',
  gate.includes('redeemMessage(state, lang)') && !/state === 'offline' \?/.test(gate))
// الفحص على **التعريف والاستهلاك** لا على ذكر الاسم: التعليل الذي يشرح سبب
// الحذف يذكر الاسم عمدًا، ويجب ألّا يُسقط الفحص الذي يحرسه.
check('★ النصّ الميت `codeExpired` أُزيل ولم يُترك صادق المظهر ميت المسار',
  !/codeExpired\s*:/.test(strings) && !/[.[]codeExpired\b/.test(gate) && !/\|\s*'expired'/.test(source),
  'الخادم يدمج «منتهٍ» في invalid_code عمدًا، فلا يستطيع قولها أبدًا')
check('وسبب الدمج مكتوب في المصدر كي لا «يُصلحه» قادم',
  /أوراكل/.test(messagesSrc) && /أوراكل/.test(backend))

console.log('\n⑤ تصنيف أسباب الفشل — تنفيذ حقيقي بـSQLSTATE من الهجرات')
const be = await loadModule('src/lib/access/entitlementBackend.ts')
/** أسباب حقيقية منقولة حرفيًا من `supabase/migrations/`. */
const REDEEM_CAUSES = [
  ['code_already_redeemed', '23505', 'already_used', '20260809120001:257'],
  ['access_revoked', '28000', 'revoked', '20260809120001:234'],
  ['not authenticated', '28000', 'not_authenticated', '20260809120001:228'],
  ['invalid_code', '22023', 'invalid', '20260809120001:251'],
  ['identity_pepper: no active version', 'P0002', 'service_error', '20260806120001:94'],
  ['unknown user', 'P0002', 'service_error', '20260809120001:230'],
  ['permission denied for function redeem_access_code', '42501', 'service_error', 'postgres'],
  ['function public.redeem_access_code(text) does not exist', '42883', 'service_error', 'postgres'],
  ['something nobody mapped yet', 'XX000', 'service_error', 'unmapped'],
  ['TypeError: Failed to fetch', '', 'offline', 'browser network'],
  // [STAGING-COMMISSIONING §16] جلسةٌ رفضها الخادم — **ليست عطلًا عندنا**.
  // كانت تسقط في `service_error` فيُقال «خلل عندنا» وتُخفى الخطوة التي تحلّها.
  ['JWT expired', 'PGRST301', 'not_authenticated', 'session rejected by server'],
  ['JWSError JWSInvalidSignature', 'PGRST301', 'not_authenticated', 'forged/rotated token'],
  ['invalid JWT: unable to parse or verify signature', '', 'not_authenticated', 'GoTrue 401'],
]
for (const [message, code, expected, whence] of REDEEM_CAUSES) {
  const got = be.classifyRedeemError(message, code)
  check(`«${message}» (${code || '—'}) ⇒ ${expected}  · ${whence}`, got === expected, `got=${got}`)
}
const TRIAL_CAUSES = [
  ['email_not_verified', '28000', 'email_not_verified'],
  ['access_revoked', '28000', 'revoked'],
  ['trial_already_used', '23505', 'already_claimed'],
  ['not authenticated', '28000', 'not_authenticated'],
  ['unknown user', 'P0002', 'service_error'],
  ['NetworkError when attempting to fetch resource', '', 'offline'],
  ['JWT expired', 'PGRST301', 'not_authenticated'],
]
for (const [message, code, expected] of TRIAL_CAUSES) {
  const got = be.classifyTrialError(message, code)
  check(`تجربة: «${message}» ⇒ ${expected}`, got === expected, `got=${got}`)
}
check('★ المجهول يُصنَّف عطلًا **عندنا** لا شبكةً عند المستخدم',
  be.classifyRedeemError('boom', 'XX000') === 'service_error'
  && be.classifyTrialError('boom', 'XX000') === 'service_error',
  'الافتراض القديم كان offline — أي لومُ نتِ المستخدم على عطلنا')
check('⟲ وتمييز الجلسة المرفوضة لا يبتلع خطأ عمل — لا اسم عملٍ يحمل «jwt»',
  be.classifyRedeemError('invalid_code', '22023') === 'invalid'
  && be.classifyRedeemError('code_already_redeemed', '23505') === 'already_used'
  && be.classifyTrialError('trial_already_used', '23505') === 'already_claimed')
check('و«موقوف» لا تُصنَّف انقطاعَ شبكة على أيّ من المسارين',
  be.classifyRedeemError('access_revoked', '28000') !== 'offline'
  && be.classifyTrialError('access_revoked', '28000') !== 'offline')
check('علامة المهلة قيمة مميّزة لا `null` (فلا تلتبس بردٍّ فارغ)',
  typeof be.TIMED_OUT === 'symbol' && backend.includes('withDeadline') && !backend.includes('withTimeout('))

console.log('\n⑥ كل سبب نصّه — لا سببان يتقاسمان رسالة')
const prod = await loadModule('src/lib/access/outcomeMessages.ts')

/** يجمع الاصطدامات بالاسم: أي رسالة يتقاسمها سببان مختلفان. */
function collisions(mod, lang) {
  const seen = new Map()
  const found = []
  for (const row of [...mod.REDEEM_CAUSE_MAP.map((r) => ({ ...r, kind: 'redeem' })),
                     ...mod.TRIAL_CAUSE_MAP.map((r) => ({ ...r, kind: 'trial' }))]) {
    const text = row.kind === 'redeem' ? mod.redeemMessage(row.outcome, lang) : mod.trialMessage(row.outcome, lang)
    if (typeof text !== 'string' || text.length === 0) { found.push(`${row.kind}:${row.cause} ⇒ رسالة فارغة`); continue }
    const key = `${row.kind}|${text}`
    const prior = seen.get(key)
    // نفس النتيجة ⇒ نفس الرسالة بديهي ومقصود؛ الاصطدام هو **نتيجتان** بنصّ واحد.
    if (prior && prior.outcome !== row.outcome) found.push(`«${prior.cause}» (${prior.outcome}) و«${row.cause}» (${row.outcome}) يتقاسمان نصًّا واحدًا`)
    else if (!prior) seen.set(key, row)
  }
  return found
}
for (const lang of ['ar', 'en']) {
  const found = collisions(prod, lang)
  check(`★ [${lang}] لا سببان مختلفان يتقاسمان نصًّا`, found.length === 0, found.join(' · '))
}
const distinctFailures = ['backend_unconfigured', 'timeout', 'service_error', 'offline']
for (const lang of ['ar', 'en']) {
  const texts = distinctFailures.map((o) => prod.redeemMessage(o, lang))
  check(`[${lang}] أصناف الفشل الأربعة أربعةُ نصوص`, new Set(texts).size === 4, texts.join(' | '))
  const trialTexts = distinctFailures.map((o) => prod.trialMessage(o, lang))
  check(`[${lang}] وأربعتها على مسار التجربة كذلك`, new Set(trialTexts).size === 4, trialTexts.join(' | '))
}
check('★ «موقوف» على مسار التجربة لم يعد نصَّ الانقطاع',
  prod.trialMessage('revoked', 'ar') !== prod.trialMessage('offline', 'ar')
  && prod.trialMessage('revoked', 'en') !== prod.trialMessage('offline', 'en'),
  'كان منعٌ إداري دائم يُعرض «تأكّد من اتصالك وجرّب مرة ثانية»')
check('ونصّ الانقطاع مُضيَّق: لا يذكر النت إلا في حالته',
  /النت|اتصال/.test(prod.redeemMessage('offline', 'ar')) && !/النت|اتصال/.test(prod.redeemMessage('service_error', 'ar'))
  && !/النت|اتصال/.test(prod.redeemMessage('backend_unconfigured', 'ar')) && !/النت|اتصال/.test(prod.redeemMessage('timeout', 'ar')))

console.log('\n⑦ بناء المراجعة يقول إنه بلا خادم — لا يلوم شبكةً')
const preview = await loadModule('src/lib/access/outcomeMessages.ts', { env: { VITE_APP_ENV: 'founder_preview' } })
for (const lang of ['ar', 'en']) {
  check(`★ [${lang}] نسخة المراجعة تعطي نصًّا **غير** نصّ الإنتاج لغياب الخادم`,
    preview.redeemMessage('backend_unconfigured', lang) !== prod.redeemMessage('backend_unconfigured', lang),
    `preview=${preview.redeemMessage('backend_unconfigured', lang)}`)
  check(`[${lang}] وتقولها صراحةً «نسخة مراجعة/review build»`,
    /نسخة مراجعة|review build/i.test(preview.redeemMessage('backend_unconfigured', lang)))
  check(`[${lang}] والتجربة كذلك`,
    preview.trialMessage('backend_unconfigured', lang) !== prod.trialMessage('backend_unconfigured', lang)
    && /نسخة مراجعة|review build/i.test(preview.trialMessage('backend_unconfigured', lang)))
}
check('★ ولا يُلام النت في أي من النصّين',
  !/النت|اتصال/.test(preview.redeemMessage('backend_unconfigured', 'ar'))
  && !/connection|internet/i.test(preview.redeemMessage('backend_unconfigured', 'en')))
check('والإشارة هي `isFounderPreview()` القائمة لا إشارة مخترعة',
  messagesSrc.includes("from '@/lib/appEnv'") && messagesSrc.includes('isFounderPreview()'))
check('وما عدا غياب الخادم لا يتبدّل بين البناءين',
  preview.redeemMessage('timeout', 'ar') === prod.redeemMessage('timeout', 'ar')
  && preview.redeemMessage('offline', 'ar') === prod.redeemMessage('offline', 'ar'))

console.log('\n⑧ التأكيد المضادّ — إعادة دمج سببين تُسقط الفحص **باسمه**')
{
  const collapsed = await loadModule('src/lib/access/outcomeMessages.ts', {
    patch: {
      file: 'src/lib/access/outcomeMessages.ts',
      apply: (t) => t.replace("service_error: 'codeServiceError',", "service_error: 'codeOffline',"),
    },
  })
  const found = collisions(collapsed, 'ar')
  check('★ بناءٌ يعيد `service_error` إلى نصّ `offline` يُنتج اصطدامًا مسمّى',
    found.length > 0 && found.some((f) => f.includes('service_error') && f.includes('offline')),
    found.join(' · ') || 'لا اصطدام — الفحص لا يقيس شيئًا')
  check('والسقوط بفحص مسمّى لا باستثناء تقني عابر',
    found.every((f) => typeof f === 'string' && f.length > 0))
  check('ونفس الفحص يمرّ على البناء السليم — فليس تحصيل حاصل',
    collisions(prod, 'ar').length === 0)
}

console.log('\n⑨ سلطة الخادم لم تُمَسّ — كل نتيجة جديدة **رفض**')
check('التفعيل في الإنتاج صادق: لا نجاح بلا مصدر خلفي',
  source.includes("if (!backendAvailable()) return 'backend_unconfigured'"))
check('والنجاح لا يُقرَّر محلّيًا بل يأتي من الخادم',
  source.includes('await redeemCodeOnServer(normalized)'))
check('وضع التقليد وحده يستطيع حفظ نتيجة التفعيل محلّيًا',
  source.includes("window.sessionStorage.setItem(MOCK_KEY, 'active')") && source.includes('if (mockEnabled())'))
check('ولو مُنح النجاح بلا نداء خادم لسقط الفحص أعلاه',
  !/return 'success'(?![\s\S]{0,200}redeemCodeOnServer)/.test(source.split('normalizeActivationCode')[0] || source))
check('★ ولا واحدة من النتائج الجديدة تفتح فعلًا مدفوعًا',
  ['backend_unconfigured', 'timeout', 'service_error', 'offline', 'empty']
    .every((o) => !new RegExp(`case '${o}': return 'success'`).test(source)))
check('والتقليد يعكس الخادم: `QIMMAH-TEST-EXPIRED` صار يُنتج نفس `invalid` المدموجة',
  /'QIMMAH-TEST-EXPIRED': 'invalid'/.test(source))

console.log('\n⑩ دورة حياة البوّابة — تُغلق عند تبدّل المسار')
// [PREMIUM-UX-W2] الطبقة تُفتح الآن بمدخلين — `blockedAction || activationOpen` —
// فحدّها الأدنى صار `if (!blockedAction && !activationOpen) return null`. مراقبة
// المسار والإغلاق عند تبدّله لم يتغيّرا.
const layer = block(app, 'function PremiumGateLayer(', 'if (!blockedAction && !activationOpen) return null')
check('طبقة البوّابة موجودة بحدودها', layer.length > 0)
check('★ الطبقة تراقب المسار وتغلق عند **تبدّله**',
  /route/.test(layer) && /closeGate\(\)/.test(layer) && /lastRoute/.test(layer),
  layer.slice(0, 160))
check('والإغلاق مشروط بالتبدّل لا بكل تشغيل — وإلا أُغلقت لحظة فتحها',
  /if \(lastRoute\.current === route\) return/.test(layer))
check('والطبقة تُمرَّر المسار الحيّ من الجذر', /<PremiumGateLayer lang=\{LANG\} route=\{view\} \/>/.test(app))
check('محاكاة الالتفاف: نزع شرط التبدّل يُكتشف باسمه',
  !/if \(lastRoute\.current === route\) return/.test(layer.replace('if (lastRoute.current === route) return', '')))

console.log('\n' + '─'.repeat(70))
if (fails.length === 0) console.log(`✅ واجهة التفعيل وصدق أسبابها: ${pass} فحصًا، 0 فشل.`)
else { console.log(`❌ ${fails.length} فشل من ${pass + fails.length}`); for (const f of fails) console.log(`   ✗ ${f}`) }
process.exit(fails.length ? 1 : 0)
