/** Stable onboarding driver: selectors bind to the 18-question registry, not copy. */
import { loadOnboardingFlow } from './app-copy.mjs'

const group = (page, id) => page.locator(`[data-question-id="${id}"]`)

/**
 * نمط الأكل — يُجاب حين ينطبق، ويُتحقَّق من **غيابه** حين لا ينطبق.
 * [QIM-V1-001]
 *
 * ═══ لماذا تأكيدان لا تسامُح ═══
 * الحلّ السهل «انقر إن وُجد، وتجاوز إن غاب» يجعل الحصّاد أخضر في الحالتين —
 * وفي حالة ثالثة لم تخطر لأحد: أن يختفي السؤال عن **كل** النيّات. أي أن
 * التسامُح يحوّل فحصًا إلى لا-فحص. فالحصّاد هنا يفحص العقد في اتجاهيه:
 *   · `intent === 'meals'` ⇒ السؤال **موجود** ويُجاب.
 *   · غير ذلك            ⇒ السؤال **غائب**، وظهورُه إخفاقٌ باسمه.
 *
 * والقاعدة نفسها تُستورد من `onboardingV2Flow` لا تُكتب هنا، فلا ينحرف
 * الحصّاد عن المنتج بمرور الوقت.
 *
 * والاتجاه الثاني هو **الإثبات المضادّ**: من يُعيد السؤال بلا شرط يسقط هنا
 * بخطأ مسمّى، لا بمهلة ثلاثين ثانية غامضة.
 */
export async function answerDietPattern(page, intent = 'plan') {
  const { dietPatternApplies } = await loadOnboardingFlow()
  const diet = group(page, 'nutrition.diet_pattern')

  if (dietPatternApplies(intent)) {
    const count = await diet.count()
    if (count === 0) {
      throw new Error(
        `[diet-pattern] النيّة «${intent}» تُوجب عرض «نمط الأكل» — ولم يُعرض. عقد الإعداد مكسور.`,
      )
    }
    await diet.getByRole('button').nth(0).click({ force: true })
    return true
  }

  const count = await diet.count()
  if (count !== 0) {
    throw new Error(
      `[diet-pattern] السؤال ظهر للنيّة «${intent}» ومستهلكه (مولّد الوجبات) لا يعمل لها — ` +
        `سؤالٌ بلا أثر يخالف §5. راجع dietPatternApplies في src/lib/onboardingV2Flow.ts.`,
    )
  }
  return false
}

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
 * Assumes a goal is selected; finishes schedule, lifestyle and limitations.
 *
 * `intent` هو ما اختاره المستدعي في خطوة النية. الافتراض `'plan'` لأنه
 * `intents[0]` — وهو ما يختاره كل مستدعٍ اليوم. ومن يختار غيره يمرّره، وإلا
 * سقط هنا **بخطأ مسمّى** لا بصمت (fail closed).
 */
export async function finishInputSteps(page, next, { intent = 'plan' } = {}) {
  await next()
  await page.waitForSelector('#onb-title-training', { timeout: 20000 })
  await next()
  await page.waitForSelector('#onb-title-lifestyle', { timeout: 20000 })
  await group(page, 'training.place').getByRole('button').nth(0).click({ force: true })
  await group(page, 'activity.neat').getByRole('button').nth(1).click({ force: true })
  await answerDietPattern(page, intent)
  await next()
  await page.waitForSelector('#onb-title-limitations', { timeout: 20000 })
  // Yes is first, No is second.
  await group(page, 'limitations.has_injury').getByRole('button').nth(1).click({ force: true })
  // The final CTA changes from “Next” to “Confirm my plan”. Bind to its stable
  // footer position so language/copy cannot strand the driver here.
  await page.locator('footer button').last().click({ force: true })
}
