/**
 * ═══ [RED-TEAM-FINAL] الأطقم التي تحتاج عنقودًا حقيقيًّا — تُشغَّل حيث يوجد ═══
 *
 * ثلاثة أطقم أمنية كانت **موصولة بالبوّابة ولم تُنفَّذ قطّ في CI**:
 *   • `attack-trial-race`          — ذرّية بدء التجربة (تجربتان لحساب واحد)
 *   • `attack-redeem-race`         — ذرّية استهلاك الكود (مستخدمان · كود واحد)
 *   • `attack-gateway-enforcement` — ختم البوّابة سلطةً في القاعدة
 *
 * والسبب **ترتيب خطوات لا عيب منطق**: `test:gate` يسبق تشغيل Postgres في السير،
 * فيجد كلٌّ منها `clusterAvailable() === false` فيُعلن تخطّيه ويخرج بـ0. والإعلان
 * صادق (§4.2: لا تخطٍّ صامت) — لكنه يمرّ داخل ١٨٥ خطوة فلا يقرؤه أحد، فيقرأ
 * القارئ «أخضر» ويظنّ السباقات مُقاسة. **وهي لم تُقَس قطّ.**
 *
 * فيُشغَّل هذا المُشغِّل **بعد** إقلاع العنقود، ويبدأ بالتأكّد من وجوده: غياب
 * العنقود هنا **فشلٌ أحمر** لا تخطٍّ — لأن هذه الخطوة سببُ وجودها هو العنقود.
 */
import { execFileSync } from 'node:child_process'
import { clusterAvailable } from '../db/lib/pg-staging.mjs'

const SUITES = ['test:attack-trial-race', 'test:attack-redeem-race', 'test:attack-gateway-enforcement',
  // [COMMERCE-W1] ذرّية صكّ الشراء تحت التزامن — منحة Premium دائمة، فالسباق أثمن.
  'test:attack-purchase-race',
  // [COMMERCE-W1-HARDENING] شراءٌ واحد ⇒ منحة واحدة · ولا هبوط عن Premium.
  'test:attack-premium-authority']

if (!clusterAvailable()) {
  console.error('❌ لا عنقود Postgres — وهذه الخطوة **تفشل** بغيابه ولا تتخطّاه.')
  console.error('   سببُ وجودها تشغيلُ ما لا يعمل بلا عنقود؛ فالتخطّي هنا يعيد العطل نفسه.')
  process.exit(1)
}

let failed = 0
for (const s of SUITES) {
  console.log(`\n▶ ${s}`)
  try {
    const out = execFileSync('npm', ['run', '--silent', s], { encoding: 'utf8', stdio: 'pipe' })
    process.stdout.write(out)
    // ⚔️ التأكيد المضادّ: الطقم قد يخرج بـ0 **وهو متخطٍّ**. فيُقرأ المخرَج نفسه.
    if (/تخطٍّ معلَن|^SKIP:/m.test(out)) {
      console.error(`❌ ${s} أعلن تخطّيه رغم وجود العنقود — وهذا بعينه العطل المُصلَح.`)
      failed += 1
    }
  } catch (e) {
    process.stdout.write(String(e.stdout || ''))
    process.stderr.write(String(e.stderr || ''))
    console.error(`❌ ${s} سقط.`)
    failed += 1
  }
}

console.log(`\n${failed === 0 ? '✅' : '❌'} أطقم العنقود الحقيقي: ${SUITES.length - failed}/${SUITES.length} نُفِّذت ونجحت.`)
process.exit(failed === 0 ? 0 : 1)
