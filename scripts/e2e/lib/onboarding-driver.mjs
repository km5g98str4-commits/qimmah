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

/** Assumes a goal is selected; finishes schedule, lifestyle and limitations. */
export async function finishInputSteps(page, next) {
  await next()
  await page.waitForSelector('#onb-title-training', { timeout: 20000 })
  await next()
  await page.waitForSelector('#onb-title-lifestyle', { timeout: 20000 })
  await group(page, 'training.place').getByRole('button').nth(0).click({ force: true })
  await group(page, 'activity.neat').getByRole('button').nth(1).click({ force: true })
  await group(page, 'nutrition.diet_pattern').getByRole('button').nth(0).click({ force: true })
  await next()
  await page.waitForSelector('#onb-title-limitations', { timeout: 20000 })
  // Yes is first, No is second.
  await group(page, 'limitations.has_injury').getByRole('button').nth(1).click({ force: true })
  // The final CTA changes from “Next” to “Confirm my plan”. Bind to its stable
  // footer position so language/copy cannot strand the driver here.
  await page.locator('footer button').last().click({ force: true })
}
