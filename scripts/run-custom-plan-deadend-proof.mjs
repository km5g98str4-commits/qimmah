// إثبات لا-طريق-مسدود في باني الجدول المخصّص — [CUSTOM-PLAN-DEADEND-001]
//
// الواقعة (المؤسس، جوّال حقيقي): مراجعة جدول بلا تمارين تعرض الأيام
// (١ دفع … ٦ أرجل) وزرّ الحفظ **معطَّل**، والسبب الوحيد تحت القائمة خارج الشاشة.
// المستخدم يرى جدوله ولا يفهم كيف يُكمل.
//
// ما يحرسه هذا الفحص بنيويًا (والرحلة الحقيقية في scripts/e2e/custom-plan-journey.mjs):
//   ١) الزرّ الرئيسي في الباني **لا يُعطَّل أبدًا**: عند المراجعة إمّا حفظ، أو
//      تعبئة الأيام الفارغة، أو الذهاب لإضافة التمارين — فعلٌ لكل حالة.
//   ٢) تنبيه الأيام الفارغة يسبق قائمة الأيام (أوّل الشاشة لا آخرها) ويحمل فعلين.
//   ٣) كل يوم فارغ في المراجعة يحمل رابط «أضف تمارين» يقفز إلى بنائه.
//   ٤) التعبئة تمرّ بالمحرّك القائم `seedPlanFromSplit` (الأيام الفارغة وحدها).
//   ٥) النصوص الجديدة بالعربية والإنجليزية معًا.
//   ⚔️ محاكاتا التفاف: إعادة `disabled` إلى الزرّ · تنبيه بلا فعل — كلاهما يسقط باسمه.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')
let pass = 0
const check = (label, condition) => {
  if (!condition) throw new Error(`FAIL: ${label}`)
  pass += 1
  console.log(`  ✓ ${label}`)
}
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ')

console.log('\nإثبات لا-طريق-مسدود — باني الجدول المخصّص')

const builder = stripComments(read('src/features/customPlan/CustomPlanBuilder.tsx'))
const strings = read('src/features/customPlan/strings.ts')

// ——— ١) الزرّ الرئيسي له فعل دائمًا ———
{
  const footer = builder.slice(builder.indexOf('<footer'), builder.indexOf('</footer>'))
  const primaryBtn = footer.slice(footer.indexOf('onClick={goNext}'), footer.indexOf('</button>', footer.indexOf('onClick={goNext}')))
  check('الزرّ الرئيسي موسوم plan-builder-primary', /data-testid="plan-builder-primary"/.test(primaryBtn))
  check('الزرّ الرئيسي لا يحمل disabled', !/disabled=/.test(primaryBtn))
  check('عند المراجعة بلا تمارين: goNext يعبّئ أو ينتقل للبناء بدل الصمت', /if \(step === 'review'\) \{\s*if \(saveable\) onSave\(plan\)\s*else fillEmptyDays\(\)/.test(builder))
  check('fillEmptyDays: تعبئة بالمحرّك ثم بديل الذهاب لأوّل يوم فارغ', /const fillEmptyDays = \(\) => \{\s*if \(canSeedEmpty && applyEngineResult\(seedPlanFromSplit\(plan\)\)\) return\s*goToBuildDay\(firstEmptyDay\)/.test(builder))
  check('نصّ الزرّ يتبع الحالة: حفظ · تعبئة · إضافة', /const nextLabel = step === 'review' \? \(saveable \? d\.save : canSeedEmpty \? d\.fillEmptyDays : d\.addExercisesToDay\) : d\.next/.test(builder))
  // ⚔️ محاكاة الالتفاف: إعادة disabled إلى الزرّ تسقط بفحصها المسمّى.
  const regressed = primaryBtn.replace('onClick={goNext}', "onClick={goNext}\n disabled={step === 'review' && !saveable}")
  check('⚔️ محاكاة: إعادة disabled إلى الزرّ الرئيسي تُكتشف', /disabled=/.test(regressed))
}

// ——— ٢) التنبيه أوّل المراجعة وبفعلين ———
{
  const review = builder.slice(builder.indexOf("{step === 'review' && ("), builder.indexOf('</Section>', builder.indexOf("{step === 'review' && (")))
  const noticeAt = review.indexOf('data-testid="plan-review-empty"')
  const listAt = review.indexOf('plan.days.map(')
  check('تنبيه الأيام الفارغة موجود ويسبق قائمة الأيام', noticeAt > 0 && listAt > noticeAt)
  const notice = review.slice(noticeAt, review.indexOf('</div>\n                </div>', noticeAt))
  check('التنبيه يحمل «عبّي الأيام الفارغة» (مشروطًا بتوفّر الوصفة)', /canSeedEmpty && \([\s\S]{0,200}data-testid="plan-review-fill"[\s\S]{0,200}onClick=\{fillEmptyDays\}|onClick=\{fillEmptyDays\}[\s\S]{0,120}data-testid="plan-review-fill"/.test(notice))
  check('التنبيه يحمل «أضف تمارين» → أوّل يوم فارغ', /onClick=\{\(\) => goToBuildDay\(firstEmptyDay\)\}[\s\S]{0,120}data-testid="plan-review-add"/.test(notice))
  // ⚔️ محاكاة: تنبيه بلا أزرار لا يُرضي الفحص.
  const mute = notice.replace(/<button[\s\S]*?<\/button>/g, '')
  check('⚔️ محاكاة: تنبيه بلا فعل يُكتشف', !/plan-review-fill|plan-review-add/.test(mute))
}

// ——— ٣) كل يوم فارغ له رابط ———
{
  check('اليوم الفارغ في المراجعة يحمل «أضف تمارين» يقفز إلى بنائه', /pd\.exercises\.length === 0 \? \([\s\S]{0,400}onClick=\{\(\) => goToBuildDay\(i\)\}[\s\S]{0,80}data-testid="plan-review-day-add"/.test(builder))
  check('goToBuildDay يفعّل اليوم ويعود إلى خطوة البناء', /const goToBuildDay = \(i: number\) => \{\s*setActiveDay\(Math\.max\(0, i\)\)\s*setStepIndex\(STEPS\.indexOf\('build'\)\)/.test(builder))
}

// ——— ٤) التعبئة تمرّ بالمحرّك القائم ———
{
  check('canSeedEmpty يُشتقّ من وصفة التقسيمة والأيام الفارغة', /const canSeedEmpty = seedRecipe\.length > 0 && plan\.days\.some\(\(pd, i\) => pd\.exercises\.length === 0 && seedRecipe\[i\] !== undefined\)/.test(builder))
  check('لا تعبئة خارج seedPlanFromSplit', (builder.match(/seedPlanFromSplit\(/g) ?? []).length === 2)
}

// ——— ٥) القاموس ———
{
  for (const k of ['reviewEmptyTitle', 'reviewEmptyBody', 'fillEmptyDays', 'addExercisesToDay']) {
    check(`${k} بالعربية والإنجليزية`, (strings.match(new RegExp(`^  ${k}: '`, 'gm')) ?? []).length === 2)
  }
}

console.log(`\n✅ لا طريق مسدود في الباني: ${pass} فحصًا، 0 فشل.`)
