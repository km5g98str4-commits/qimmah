// سائق معالج الإعداد (Playwright) — مشترك بين offline-session-e2e.mjs وonboarding-matrix-e2e.mjs.
//
// درس مستفاد أثناء البناء: تعيين حالة مربّع الموافقة الصحية عبر خاصية DOM مباشرة (بلا
// نقرة حقيقية) يجعل القيمة تظهر في DOM لكن حالة React الداخلية تبقى false (React لا
// يلتقط الخاصية المباشرة) — فيبقى التحقّق يفشل رغم أن الصندوق «يبدو» محدَّدًا. الحل:
// `locator.check()` من Playwright يُحاكي نقرة مستخدم حقيقية (تُطلق onChange فعليًا).

const CONFIRM_RE = /التالي|Next|إنهاء|إكمال|ابدأ الآن|اعتمد خطي|اعتمد|الدخول للوحة|Approve|Confirm|Enter/
const NAV_EXCLUDE_RE = /التالي|رجوع|تخطّي|Next|Back|Skip|اعتمد|Approve|Confirm/

/**
 * يتقدّم خطوة واحدة من معالج الإعداد: يحدّد أي مربّعات موافقة غير محدَّدة (نقرة حقيقية
 * عبر check())، يختار خيارات غير محدَّدة حسب الحاجة (لمجموعات مثل مكان التمرين/التفضيل)،
 * ثم يحاول زرّ المتابعة. يُستدعى بتكرار حتى ينجح أو تُستنفد المحاولات.
 */
async function advanceOneStep(page, { selectors = {} } = {}) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    // ١) مربّعات موافقة غير محدَّدة — نقرة حقيقية (check()) لا تعيين خاصية.
    const uncheckedBoxes = page.locator('input[type="checkbox"]')
    const boxCount = await uncheckedBoxes.count().catch(() => 0)
    let checkedAny = false
    for (let i = 0; i < boxCount; i += 1) {
      const box = uncheckedBoxes.nth(i)
      const isChecked = await box.isChecked().catch(() => true)
      if (!isChecked) {
        await box.check({ timeout: 2000 }).catch(() => {})
        checkedAny = true
      }
    }

    // ٢) إن حُدِّدت اختيارات مخصّصة لهذه الخطوة (مثل اختيار هدف/مكان معيَّن)، جرّبها أولًا.
    if (selectors.pick) {
      for (const label of selectors.pick) {
        const btn = page.getByRole('button', { name: label }).first()
        if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
          await btn.click({ timeout: 2000 }).catch(() => {})
        }
      }
    }

    // ٣) زرّ المتابعة — إن أصبح مفعَّلًا انقر وارجع بنجاح.
    const confirmBtn = page.getByRole('button', { name: CONFIRM_RE }).first()
    if (await confirmBtn.isEnabled({ timeout: 700 }).catch(() => false)) {
      const clicked = await confirmBtn.click({ timeout: 3000 }).then(() => true).catch(() => false)
      if (clicked) return true
    }

    // ٤) لم يُفعَّل بعد — اختر خيارًا عامًّا غير محدَّد (مجموعة لم تُعالَج بـ selectors.pick).
    if (!checkedAny) {
      const opt = page.locator('main button, [role="main"] button')
        .filter({ hasNotText: NAV_EXCLUDE_RE })
        .filter({ hasNot: page.locator('[aria-pressed="true"]') })
        .nth(attempt)
      const clickedOpt = await opt.click({ timeout: 1500 }).then(() => true).catch(() => false)
      if (!clickedOpt) break
    }
    await page.waitForTimeout(250)
  }
  return false
}

/**
 * يُكمل معالج الإعداد كاملًا حتى الوصول للوحة («مسار اليوم» ظاهر). `stepPicks` اختياري:
 * مصفوفة اختيارات لكل خطوة بالترتيب (مثل [{pick:['نادي']}, {pick:['مزيج']}]) لضبط
 * مسار محدَّد (هدف/معدّات) بدل الاختيار العشوائي الافتراضي.
 */
export async function completeOnboarding(page, { maxSteps = 8, stepPicks = [] } = {}) {
  for (let i = 0; i < maxSteps; i += 1) {
    await page.waitForTimeout(300)
    if (/مسار اليوم/.test(await page.locator('body').innerText().catch(() => ''))) return true
    const advanced = await advanceOneStep(page, { selectors: stepPicks[i] })
    if (!advanced) await page.waitForTimeout(900)
  }
  return /مسار اليوم/.test(await page.locator('body').innerText().catch(() => ''))
}

export function seedMockSession(uid, email = 'qa@qimmah.app') {
  const nowSec = Math.floor(Date.now() / 1000)
  return {
    access_token: `mock.${Buffer.from(JSON.stringify({ sub: uid, role: 'authenticated' })).toString('base64')}.sig`,
    token_type: 'bearer', expires_in: 3600, expires_at: nowSec + 365 * 24 * 3600,
    refresh_token: 'mock-refresh-token',
    user: { id: uid, aud: 'authenticated', role: 'authenticated', email,
      email_confirmed_at: '2026-01-01T00:00:00.000Z', confirmed_at: '2026-01-01T00:00:00.000Z',
      user_metadata: { display_name: 'قِمّة' }, app_metadata: {}, created_at: '2026-01-01T00:00:00.000Z' },
  }
}
