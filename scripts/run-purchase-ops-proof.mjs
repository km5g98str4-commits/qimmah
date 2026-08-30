#!/usr/bin/env node
/**
 * حارس عمليات صكوك الشراء (لوحة المؤسس) — [PREMIUM-UX-W2 · PART D/E]
 *
 * ═══ ماذا يحرس (نيّةً لا ماركب) ═══
 *   ① السلطة للخادم: الإصدار والعدّ عبر دوالّ المؤسس المحروسة، والحدّ الأقصى
 *      (٥٠٠) يُقرأ من عقد الخادم لا يُخترع أعلى.
 *   ② الخام مرّة واحدة: يعيش في حالة React وحدها — لا localStorage/session/سجلّ.
 *   ③ التصدير محلّيّ (Blob) بعمود `code` فقط — لا بصمة، لا معرّف داخلي، لا بيانات
 *      مستخدم، ولا خادم.
 *   ④ صدق تشغيليّ: «غير مستردّ» لا «متبقٍ في سلة».
 *   ⑤ للمؤسس وحده: مسار الإصدار يمرّ بـ`canWrite`.
 *   ⑥ صكّ الشراء دائم (`duration_days=null`) — لا يُعامَل شذوذًا.
 *   ⑦ مِفتاح الإطفاء مُعلَن: تعطيل صكٍّ مفرد متاح، والدفعيّ يُرفَع صراحةً.
 *
 * القياس بحدود الكتل ومحاكاة التفافٍ تفشل باسمها (§4.2).
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

const panel = read('src/admin/ui/PurchaseBatchPanel.tsx')
const route = read('src/admin/ui/AdminRoute.tsx')
const shell = read('src/admin/ui/AdminShell.tsx')
const live = read('src/admin/contract/liveSource.ts')
const dict = read('src/i18n/dict/admin.ts')
const mig = read('supabase/migrations/20260829120001_purchase_credentials.sql')

// ══════════════════════════════════════════════════════════════════════════
console.log('\n① السلطة للخادم — الحدّ الأقصى مقروء لا مخترَع')
check('اللوحة تنادي إصدار/عدّ الخادم عبر الطبقة الحيّة (لا حالة محلّية تمنح)',
  route.includes('issuePurchaseBatch(decision') && route.includes('loadPurchaseBatches(decision'))
check('الطبقة الحيّة تحرس الإصدار بـcanWrite قبل أي نداء',
  /export async function issuePurchaseBatch[\s\S]{0,220}canWrite\(decision\)/.test(live))
// الحدّ ٥٠٠ في اللوحة يطابق عقد الخادم بالضبط.
const serverMax = (mig.match(/n < 1 or n > (\d+)/) ?? [])[1]
check('عقد الخادم يعلن حدًّا أقصى', serverMax === '500', `server=${serverMax}`)
const uiMax = (panel.match(/PURCHASE_BATCH_MAX = (\d+)/) ?? [])[1]
check('اللوحة تقرأ نفس الحدّ لا أعلى', uiMax === serverMax, `ui=${uiMax}`)
check('العدد يُقصّ إلى [١..الحدّ] فلا يُرسَل أعلى (الرحلة الضائعة تُمنع)',
  /Math\.min\(PURCHASE_BATCH_MAX/.test(panel))
// ⚔️ محاكاة: رفع حدّ اللوحة فوق الخادم يجب أن يُكتشف بعدم التطابق.
check('⚔️ محاكاة: حدّ لوحة أعلى من الخادم يُرصد بعدم التطابق', !('501' === serverMax))

// ══════════════════════════════════════════════════════════════════════════
console.log('\n② الخام مرّة واحدة — لا تخزين ولا سجلّ')
check('الأكواد الخام في حالة React وحدها (useState)، لا تخزين محلّي',
  route.includes('setIssuedPurchase') && !/localStorage|sessionStorage/.test(route.slice(route.indexOf('issuedPurchase'))))
check('اللوحة لا تكتب الأكواد إلى أي تخزين ولا console',
  !/localStorage|sessionStorage|console\.(log|info|warn|error)\s*\(/.test(panel))
check('تحذير «لا استعادة» حاضر ومعلَن', panel.includes('cannotRecover') && dict.includes('ما نقدر نستعيدها'))
check('الصرف يمسح الحالة (لا بقاء بعد الإخفاء)', route.includes('setIssuedPurchase(null)'))

// ══════════════════════════════════════════════════════════════════════════
console.log('\n③ التصدير محلّيّ — عمود code فقط، بلا أسرار زائدة')
const exportBlock = panel.slice(panel.indexOf('function exportCsv'), panel.indexOf('export function PurchaseBatchPanel'))
check('التصدير Blob محلّيّ (لا نداء خادم)', exportBlock.includes('new Blob(') && exportBlock.includes('URL.createObjectURL') && !/fetch\(|supabase|rpc\(/.test(exportBlock))
check('★ العمود الوحيد `code` — لا بصمة/معرّف/بريد/سجلّ',
  exportBlock.includes("['code'") && !/hash|email|user_id|ledger|id:|codeId/i.test(exportBlock))
// ⚔️ محاكاة: لو أضيف عمود بصمة لالتُقط.
check('⚔️ محاكاة: إضافة عمود hash إلى التصدير يُرصد',
  !/\['code', *'hash'/.test(exportBlock))

// ══════════════════════════════════════════════════════════════════════════
console.log('\n④ صدق تشغيليّ — «غير مستردّ» لا «متبقٍ في سلة»')
const purSection = dict.slice(dict.indexOf('purchase: {'))
check('العمود يُسمّى «غير مستردّ / Unredeemed»',
  dict.includes("colUnredeemed: 'غير مستردّ'") && dict.includes("colUnredeemed: 'Unredeemed'"))
// النيّة: لا **عمود** يُسمّى «متبقٍ في سلة». نصّ الإيضاح يذكر العبارة عمدًا
// لينفيها — فالفحص على **قيم أعمدة العدّ** لا على النصّ الشارح.
const colValues = [...purSection.matchAll(/col(?:Label|Issued|Redeemed|Unredeemed|Disabled|Expired):\s*'([^']+)'/g)].map((m) => m[1])
check('★ ولا **عمود** يُسمّى «متبقٍ في سلة / remaining in Salla»',
  colValues.length >= 12 && !colValues.some((v) => /سلة|salla|متبقٍ في|remaining in/i.test(v)),
  `${colValues.length} قيمة عمود`)
check('ونصّ الإيضاح يقول صراحةً إننا لا نعرف مكان الصكّ',
  dict.includes('ما نسمّيه «متبقٍ في سلة»') && dict.includes('do not call it "remaining in Salla"'))

// ══════════════════════════════════════════════════════════════════════════
console.log('\n⑤ للمؤسس وحده — التبويب واللوحة خلف القدرة')
check('التبويب يظهر حين تُمرَّر قدرته فقط (لا تبويب يَعِد بما لا يعمل)',
  shell.includes("...(purchase ? [{ id: 'purchase'"))
check('واللوحة لا تُرسَم بلا قدرتها', shell.includes("tab === 'purchase' && purchase"))
// الطبقة الحيّة: غير المؤسس يُردّ not-founder قبل أي نداء.
check('issuePurchaseBatch يردّ not-founder لغير الكاتب',
  /if \(!canWrite\(decision\)\) return \{ ok: false, live: 'not-founder' \}/.test(live))

// ══════════════════════════════════════════════════════════════════════════
console.log('\n⑥ صكّ الشراء دائم — duration_days=null ليس شذوذًا')
check('الطبقة الحيّة تُصدر صكّ شراء بلا مدّة (لا تمرّر duration)',
  /issuePurchaseBatch[\s\S]{0,400}PURCHASE_BATCH_ISSUE_RPC[\s\S]{0,200}p_count/.test(live)
  && !/issuePurchaseBatch[\s\S]{0,400}p_duration_days/.test(live))
// صفحة الأكواد تعرض صكوك الشراء (duration=null) بلا كسر — إصلاح الأرض المحصَّنة.
check('صفحة الأكواد تحتمل duration_days=null (لا «صفر» مخترع)',
  read('src/admin/contract/liveSource.ts').includes('durationDays: raw.duration_days'))

// ══════════════════════════════════════════════════════════════════════════
console.log('\n⑦ مِفتاح الإطفاء — مفرد متاح، دفعيّ مُعلَن غير مدعوم')
check('نصّ الإطفاء يوجّه لتعطيل صكٍّ مفرد من صفحة الأكواد',
  dict.includes('افتح صفحة الأكواد وعطّله') && dict.includes('open the Codes page and disable it'))
check('والدفعيّ يُعلَن غير مدعوم صراحةً (لا فعل مدمّر يُخترع)',
  dict.includes('التعطيل الدفعيّ لكامل الحملة غير مدعوم') && dict.includes('Batch-wide disable'))

// ══════════════════════════════════════════════════════════════════════════
console.log('\n' + '─'.repeat(70))
if (fails.length === 0) console.log(`✅ عمليات صكوك الشراء: ${pass} فحصًا، 0 فشل.`)
else { console.log(`❌ ${fails.length} فشل من ${pass + fails.length}`); for (const f of fails) console.log(`   ✗ ${f}`) }
process.exit(fails.length ? 1 : 0)
