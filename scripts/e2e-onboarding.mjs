// Onboarding v2 browser E2E — runs the real component through the repository's
// dev-only visual harness, so no Supabase account or production data is needed.
// Covers the blocking health consent, all steps, assembly status, failure/retry,
// RTL, and horizontal overflow. Never contacts a backend.
//
// كل نصوص الواجهة تأتي من القواميس المركزية (scripts/e2e/lib/app-copy.mjs) لا
// مكرّرة هنا: تغيير نصّ في المصدر يجب أن يُحدّث الاختبار تلقائيًا، لا أن يكسره.
//
// ═══ ولماذا يُشتقّ الترتيب أيضًا، لا النصّ وحده؟ ═══
// هذا الهيكل احمرّ ستة أيام على الجذع لسببين متراكمين:
//   • موجة بيانات الجسم أدخلت خطوة جديدة، فتبدّل ترتيب الخطوات قبل سؤال الهدف
//     ولم يعد الهيكل يبلغ أزرار الهدف أصلًا.
//   • موجة النية جعلت **صياغة الأهداف تابعة للمستوى**: المبتدئ يرى «خسارة دهون»
//     حيث كان الجميع يرون «تنشيف» — والهيكل كان يثبّت الاسم الثاني.
// فاستبدال نصّ بنصّ يعيد الفخّ نفسه. الحلّ: الترتيب يُشتقّ من `validateStep`
// في `src/lib/onboardingV2Flow.ts`، والوسوم تُقرأ من قواميسها لحظةَ التشغيل —
// فأي إعادة صياغة أو إعادة ترتيب لاحقة يتبعها الهيكل بدل أن ينكسر بها. وخطوة
// جديدة بلا معالج تُسقط الاختبار برسالة صريحة، لا تُتخطّى بصمت.

import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'
import { loadAppCopy, loadOnboardingFlow, labelOf, assertDevFlag } from './e2e/lib/app-copy.mjs'

const PORT = 4319
const BASE = `http://127.0.0.1:${PORT}/scripts/momentum-shot/?surface=onboarding`
const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
}

/**
 * نصوص القواميس تدخل في RegExp، وفيها أقواس حرفية («تنشيف (Cut)») تُفسَّر
 * كتجميع نمطي فلا تطابق شيئًا. التهريب يمنع فشلًا صامتًا من هذا النوع.
 */
const re = (s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE)).ok) return } catch { /* starting */ }
    await sleep(250)
  }
  throw new Error('onboarding proof server did not start')
}

let browser
try {
  // القواميس المركزية — نفس المصدر الذي يرسم منه المكوّن.
  const { onboarding: t, goals, policy } = await loadAppCopy()
  // التدفّق نفسه — ترتيب الخطوات وحدود القيم وقواميس الخطوتين الجديدتين.
  const flow = await loadOnboardingFlow()
  const gymPlace = labelOf(t.places, 'gym')
  const mixedPref = labelOf(t.prefs, 'mixed')
  // عَلَم تطوير (ليس مفتاح بيانات) — نتحقّق أنه ما زال مقروءًا في المكوّن.
  const FORCE_FAIL = assertDevFlag('qimmah:onboarding:force-fail', 'src/views/OnboardingV2.tsx')

  // ═══ إجابات الهيكل — **قيم** لا نصوص ═══
  // الوسم يُشتقّ من القيمة عند التشغيل، فإعادة صياغة أي خيار لا تكسر شيئًا.
  // و«مبتدئ» مقصود: هو المسار الذي انكسر عليه الهيكل، وصياغته أبعد ما تكون عن
  // الصياغة المركزية القديمة — فهو أقسى اختبار للوعي بالمستوى.
  const PICK = { intent: 'plan', level: 'beginner', goal: 'cut', place: 'gym', pref: 'mixed' }
  // أرقام الجسم بيانات اختبار، لكن **صلاحيتها** تُثبت مقابل نطاقات التدفّق نفسها:
  // لو ضُيّق نطاق يومًا سقط الاختبار برسالة واضحة بدل تعطّل غامض عند الحقل.
  const BODY = { age: 24, height: 175, weight: 78 }
  const outOfRange = [
    ['age', BODY.age, flow.ranges.age],
    ['height', BODY.height, flow.ranges.height],
    ['weight', BODY.weight, flow.ranges.weight],
  ].filter(([, v, r]) => !flow.inRange(v, r))
  if (outOfRange.length) {
    throw new Error(`بيانات الاختبار خرجت عن نطاق التدفّق: ${outOfRange.map(([k]) => k).join(', ')}`)
  }
  // العمر أعلى من 18 عمدًا: القاصر تُقيَّد أهدافه (المحافظة فقط) فلا يصحّ اختيار
  // «تنشيف» على مساره. حاجز القاصرين نفسه يحرسه `test:age-13` و`test:minors`.
  if (BODY.age < 18) throw new Error('عمر الاختبار دون 18 — مسار الهدف المقيَّد لا يناسب هذا الهيكل')

  await waitForServer()
  browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 320, height: 720 }, locale: 'ar-SA' })
  const consoleErrors = []
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
  page.on('pageerror', (e) => consoleErrors.push(String(e)))
  await page.goto(BASE, { waitUntil: 'networkidle' })

  const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
  check('RTL root', await page.evaluate(() => document.documentElement.dir === 'rtl'))
  check('320px has no horizontal overflow', await noOverflow())
  const next = page.getByRole('button', { name: t.next })
  check('Next starts blocked', await next.getAttribute('aria-disabled') === 'true')

  // ═══ اشتقاق ترتيب الخطوات من التدفّق ═══
  // مسودّة «فارغة بالكامل» تجعل كل خطوة تكشف مفتاح تحقّقها. الأيام والمدة صفر
  // عمدًا: قيمهما الافتراضية صالحة، فلولا التصفير لأعادت الخطوة `null` وبدت
  // بلا هوية.
  const BLANK = {
    age: null, gender: null, heightCm: null, weightKg: null,
    intent: null, level: null, trainingYears: null,
    goal: null, days: 0, duration: 0, place: null, pref: null, healthDataConsent: false,
  }
  const order = Array.from({ length: flow.lastInputStep + 1 }, (_, i) => flow.validateStep(i, BLANK))

  const steps = {
    // الخطوة الأولى: الموافقة الصحية **ثم** بيانات الجسم في شاشة واحدة.
    healthConsent: async () => {
      // البوابة تسبق أي حقل: ضغط «التالي» بلا موافقة يُظهر الرسالة.
      await next.click({ force: true })
      check('health consent validation is visible', await page.getByRole('alert').isVisible())
      await page.getByRole('checkbox', { name: re(policy.healthConsent) }).check()
      // الموافقة **لازمة لا كافية** — الجسد ناقص فالزر يبقى مقفلًا.
      check('consent alone does not unlock Next', await next.getAttribute('aria-disabled') === 'true')
      await page.getByLabel(re(flow.body.ageLabel)).fill(String(BODY.age))
      await page.getByLabel(re(flow.body.heightLabel)).fill(String(BODY.height))
      await page.getByLabel(re(flow.body.weightLabel)).fill(String(BODY.weight))
      await page.getByRole('button', { name: flow.body.genderMale, exact: true }).click()
      check('Next unlocks only after consent and body data', await next.getAttribute('aria-disabled') === 'false')
    },

    // الخطوة الثانية: النية والمستوى — المستوى هنا يحدّد لغة الأهداف بعده.
    intentLevel: async () => {
      check('intent and level step rendered', await page.getByRole('heading', { name: flow.intent.title }).isVisible())
      const groupFor = (legend) => page.getByRole('group', { name: legend })
      await groupFor(flow.intent.legends.intent)
        .getByRole('button', { name: re(labelOf(flow.intent.intents, PICK.intent)) }).click()
      await groupFor(flow.intent.legends.level)
        .getByRole('button', { name: re(labelOf(flow.intent.levels, PICK.level)) }).click()
    },

    // الخطوة الثالثة: الهدف — وهنا يقع قلب الانحدار الذي أحمر الجذع.
    goal: async () => {
      check('goal step rendered', await page.getByRole('heading', { name: t.goal.title }).isVisible())
      const group = page.getByRole('group', { name: t.legends.goal })
      const wording = flow.goalWordingFor('ar', PICK.level)
      const shown = goals.map((g) => wording[g.value].label)

      // إثبات موجب: صياغة **هذا المستوى** هي المعروضة فعلًا.
      const missing = []
      for (const g of goals) {
        if (await group.getByRole('button', { name: re(wording[g.value].label) }).count() !== 1) {
          missing.push(wording[g.value].label)
        }
      }
      // وإثبات سالب: صياغة المستويات الأخرى غائبة — فلا يمرّ الاختبار لأن
      // المكوّن رجع إلى وسم مركزي واحد للجميع.
      const leaked = []
      for (const level of flow.intent.levels) {
        const other = flow.goalWordingFor('ar', level.value)
        for (const g of goals) {
          const label = other[g.value].label
          if (shown.includes(label)) continue
          if (await group.getByText(label, { exact: true }).count() !== 0) leaked.push(`${level.value}:${label}`)
        }
      }
      check(
        `goal wording follows declared level (${PICK.level})`,
        missing.length === 0 && leaked.length === 0,
        [missing.length ? `مفقود: ${missing.join(', ')}` : '', leaked.length ? `تسرّب: ${leaked.join(', ')}` : ''].filter(Boolean).join(' | '),
      )
      await group.getByRole('button', { name: re(wording[PICK.goal].label) }).click()
    },

    // الخطوة الرابعة: التدريب — قيمه الافتراضية صالحة، فلا إجابة لازمة.
    training: async () => {
      check('training step rendered', await page.getByRole('heading', { name: t.training.title }).isVisible())
    },

    // الخطوة الخامسة: المعدّات.
    equipment: async () => {
      check('equipment step exact dialect copy', await page.getByRole('heading', { name: t.equipment.title }).isVisible())
      await page.getByRole('group', { name: t.legends.place }).getByRole('button', { name: gymPlace, exact: true }).click()
      await page.getByRole('group', { name: t.legends.pref }).getByRole('button', { name: mixedPref, exact: true }).click()
    },
  }

  // خطوة بلا معالج = التدفّق تغيّر ولم يُبلَّغ الهيكل. نُسقط بصراحة بدل أن نمرّ
  // على خطوة لم تُفحص إطلاقًا.
  const unhandled = order.map((key, i) => [i, key]).filter(([, key]) => !key || !steps[key])
  check(
    'every flow step has a harness handler',
    unhandled.length === 0,
    unhandled.map(([i, key]) => `الموضع ${i}: ${key ?? 'بلا مفتاح تحقّق'}`).join(' | '),
  )
  if (unhandled.length) {
    throw new Error('ترتيب خطوات الإعداد تغيّر — أضِف معالج الخطوة في scripts/e2e-onboarding.mjs')
  }

  const overflowing = []
  for (const [i, key] of order.entries()) {
    await steps[key]()
    if (!(await noOverflow())) overflowing.push(key)
    // نصّ الزرّ يتبع موضع الخطوة: آخر خطوة إدخال تحمل «اعتمد خطتي» لا «التالي».
    const cta = i === flow.lastInputStep ? t.equipment.cta : t.next
    await page.getByRole('button', { name: cta }).click()
  }
  check('no horizontal overflow at 320px on any step', overflowing.length === 0, overflowing.join(', '))

  check('summary rendered', await page.getByRole('heading', { name: t.ready.title }).isVisible())
  // الملخّص يعرض صياغة المستوى نفسها — إثبات أن الاختيار وصل المخرجات لا الشاشة وحدها.
  const goalLabel = flow.goalWordingFor('ar', PICK.level)[PICK.goal].label
  check(
    'summary carries the level-aware goal wording',
    await page.getByText(re(`${t.training.suitsGoal} ${goalLabel}`)).isVisible(),
  )

  await page.evaluate((k) => localStorage.setItem(k, '1'), FORCE_FAIL)
  await page.getByRole('button', { name: t.ready.enter }).click()
  check('forced failure is visible', await page.getByRole('heading', { name: t.error.title }).isVisible())
  await page.evaluate((k) => localStorage.removeItem(k), FORCE_FAIL)
  await page.getByRole('button', { name: t.error.retry }).click()
  await page.getByRole('heading', { name: t.error.title }).waitFor({ state: 'hidden' })
  check('retry clears failure', true)
  check('zero console errors', consoleErrors.length === 0, consoleErrors.join(' | '))
} catch (error) {
  check('E2E harness completed', false, String(error))
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${failed.length ? `❌ ${failed.length} FAILED` : `✅ ALL ${results.length} PASSED`} — onboarding v2 e2e`)
process.exit(failed.length ? 1 : 0)
