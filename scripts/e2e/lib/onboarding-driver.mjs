/** Stable onboarding driver: selectors bind to the 18-question registry, not copy. */
const group = (page, id) => page.locator(`[data-question-id="${id}"]`)

export async function answerHistory(page, next, { trained = false } = {}) {
  await next()
  await page.waitForSelector('#onb-title-history', { timeout: 20000 })
  const trainedBefore = group(page, 'history.trained_before').getByRole('button')
  await trainedBefore.nth(trained ? 2 : 0).click({ force: true })
  if (trained) {
    await group(page, 'history.total_months').getByRole('button').nth(1).click({ force: true })
    await group(page, 'history.last_trained').getByRole('button').nth(0).click({ force: true })
    await group(page, 'history.consistency').getByRole('button').nth(2).click({ force: true })
  }
  const historyGroups = await page.locator('[data-question-id^="history."]').count()
  await next()
  await page.waitForSelector('#onb-title-goal', { timeout: 20000 })
  return { historyGroups }
}

/**
 * يقود بقيّة خطوات الإدخال، ويعيد **وقائع مقيسة** يفحصها المستدعي بأسمائها.
 *
 * ═══ لماذا يأخذ `intent` بدل أن يضغط ما يجده ═══
 * سؤال نمط الأكل صار مشروطًا بالنيّة (`dietPatternApplies` = `intent === 'meals'`)
 * لأن مستهلكه الوحيد مولّد الوجبات — سؤالٌ بلا أثر لغيرهم (§5). والحصّاد كان
 * يضغطه **بلا شرط**، فسقط بمهلة ٣٠ ثانية على نيّة `plan` وأحمرَّ الجذع.
 *
 * الحلّ ليس تخطّي السؤال — ذلك إضعاف. الحلّ أن يعرف السائق **العقد**: يظهر
 * السؤال **إن وإلّا** كانت النيّة `meals`. فنقيس الاتجاهين ونعيدهما، ويصير
 * الفحص أقوى ممّا كان: الضغط وحده لم يكن يكشف ظهوره في نيّة لا تستهلكه.
 */
export async function finishInputSteps(page, next, { intent = 'plan' } = {}) {
  await next()
  await page.waitForSelector('#onb-title-training', { timeout: 20000 })
  await next()
  await page.waitForSelector('#onb-title-lifestyle', { timeout: 20000 })
  await group(page, 'training.place').getByRole('button').nth(0).click({ force: true })

  // الأدوات تحجب التقدّم حين تُترك فارغة (`onboardingV2Flow` → `'equipment'`).
  // المكان يبذرها، لكنّ البذر يُقاس لا يُفترَض: إن لم يبذر شيئًا نحسمها بأنفسنا
  // كي يبقى سبب أي سقوط لاحق هو العقد لا خطوة ناقصة في السائق.
  const equipmentGroup = group(page, 'equipment.available')
  const pressedEquipment = () => equipmentGroup.locator('button[aria-pressed="true"]').count()
  const seededEquipment = await pressedEquipment()
  if (seededEquipment === 0) await equipmentGroup.getByRole('button').nth(0).click({ force: true })
  const equipmentSelected = await pressedEquipment()

  await group(page, 'activity.neat').getByRole('button').nth(1).click({ force: true })

  // نمط الأكل — الاتجاهان معًا.
  const dietApplies = intent === 'meals'
  const dietRendered = (await group(page, 'nutrition.diet_pattern').count()) > 0
  if (dietRendered) await group(page, 'nutrition.diet_pattern').getByRole('button').nth(0).click({ force: true })

  await next()
  await page.waitForSelector('#onb-title-limitations', { timeout: 20000 })
  // Yes is first, No is second.
  await group(page, 'limitations.has_injury').getByRole('button').nth(1).click({ force: true })
  // The final CTA changes from “Next” to “Confirm my plan”. Bind to its stable
  // footer position so language/copy cannot strand the driver here.
  await page.locator('footer button').last().click({ force: true })

  return { dietApplies, dietRendered, equipmentSelected, seededEquipment }
}

/**
 * سؤال نمط الأكل — مشترك بين كل الأطقم كي لا يتفرّق العقد على ستّ نسخ.
 *
 * منطق الشرط نفسه مُثبَت حتميًّا في `onboarding-questions-proof.ts` (كل نيّة
 * غير `meals` لا تعرضه، و`meals` تعرضه). ما يخصّ المتصفّح هنا شيء واحد:
 * أن **الشاشة تطابق المُسنَد**. فنعيد الاتجاهين ويفحصهما المستدعي باسمه.
 */
export async function answerDietPattern(page, intent) {
  const applies = intent === 'meals'
  const rendered = (await group(page, 'nutrition.diet_pattern').count()) > 0
  if (rendered) {
    await group(page, 'nutrition.diet_pattern').getByRole('button').nth(0).click({ force: true })
  }
  return { applies, rendered, agrees: applies === rendered }
}
