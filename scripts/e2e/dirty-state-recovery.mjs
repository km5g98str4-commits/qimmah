// إثبات متصفح لمسار الإقلاع على حالة متّسخة — البندان ٢٢ و٢٩ في سجلّ القبول.
// التشغيل القانوني: npm run test:e2e:dirty-state
//
// لماذا في متصفح وقد مرّت إثباتات الوحدة؟ لأن `loadOnboarding` وحدها ليست
// مسار الإقلاع: بين التخزين والشاشة يقع `App` وحرّاسه وسياقاته وتحميل الحِزم
// عند الطلب. إثبات الوحدة يقول «الدالّة لا ترمي»؛ وهذا يقول «المستخدم يصل
// إلى شاشة صالحة» — وهما ليسا الادعاء نفسه.
//
// القاعدة الحاكمة: **قيمة تالفة لا تُقرأ إكمالًا أبدًا.** أسوأ فشل ممكن هنا
// ليس الانهيار بل الدخول الصامت إلى لوحة بخطة غير موجودة.

import { spawn } from 'node:child_process'
import { chromium } from './lib/engine.mjs'
import { loadAppCopy, requireKey } from './lib/app-copy.mjs'

const { dataKeys } = await loadAppCopy()
const K_ONBOARDING = requireKey(dataKeys, 'qimmah:onboarding:v1')
const K_ACCOUNTS = requireKey(dataKeys, 'qimmah:onboarding:accounts:v1')
/** نصّ زرّ الضيف من مصدر الحقيقة نفسه الذي يعرضه التطبيق. */
const GUEST_CTA = 'كمّل كضيف'
const PORT = 5331
const EXTERNAL = process.env.PREVIEW_URL || ''
const URL = EXTERNAL || `http://127.0.0.1:${PORT}`

let pass = 0
let fail = 0
const failures = []
function check(label, condition, detail = '') {
  if (condition) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fail += 1; failures.push(label); console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`) }
}

// `detached`: انظر نفس التعليل في `profile-reliability.mjs` — `npx` يولّد
// `vite` حفيدًا، وقتل الغلاف وحده يترك الأنابيب مفتوحة فلا يخرج Node.
const preview = EXTERNAL ? null : spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: process.env,
  detached: true,
})

// نفس تحصين BUG-023: نثبت أن **طفلنا** جهز، فلا يقبل الإثبات خادمًا غريبًا على المنفذ.
const previewReady = preview ? new Promise((resolve, reject) => {
  let output = ''
  const append = (chunk) => {
    output = `${output}${chunk}`.slice(-4_000)
    if (/Local:\s+http:\/\/127\.0\.0\.1:\d+\//.test(output)) resolve()
  }
  preview.stdout.on('data', append)
  preview.stderr.on('data', append)
  preview.once('error', (e) => reject(new Error(`dirty-state preview failed to start: ${e.message}`)))
  preview.once('exit', (code, signal) => reject(new Error(`dirty-state preview exited before ready (${code ?? signal ?? 'unknown'})\n${output}`)))
}) : Promise.resolve()

async function waitForServer(ms = 30_000) {
  await previewReady
  const started = Date.now()
  while (Date.now() - started < ms) {
    try { if ((await fetch(URL)).ok) return } catch { /* preview is starting */ }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('dirty-state preview did not start')
}

/** الحالات المتّسخة المطلوبة — كل واحدة قيمة خام حقيقية تُزرع قبل الإقلاع. */
const CASES = [
  { id: 'fresh', label: 'مستخدم جديد تمامًا', seed: null },
  { id: 'guest-complete', label: 'ضيف مكتمل قائم', seed: JSON.stringify({ completed: true, completedAt: '2026-01-01T00:00:00.000Z' }) },
  { id: 'draft-v5', label: 'مسودة إعداد قديمة (v5)', seed: JSON.stringify({ completed: false, draft: { v: 5, age: 30, sex: 'male', heightCm: 180, weightKg: 80 } }) },
  { id: 'legacy-guest', label: 'ضيف قديم مكتمل بحقول ناقصة', seed: JSON.stringify({ completed: true }) },
  { id: 'malformed-json', label: 'JSON تالف', seed: '{{{ not json at all' },
  { id: 'wrong-type-array', label: 'نوع خاطئ — مصفوفة بدل كائن', seed: '[1,2,3]' },
  { id: 'wrong-type-scalar', label: 'نوع خاطئ — نصّ مفرد', seed: '"just-a-string"' },
  { id: 'null-literal', label: 'قيمة null صريحة', seed: 'null' },
  { id: 'missing-version', label: 'مسودة بلا رقم نسخة', seed: JSON.stringify({ completed: false, draft: { age: 30 } }) },
  { id: 'unknown-version', label: 'مسودة بنسخة مجهولة (v99)', seed: JSON.stringify({ completed: false, draft: { v: 99, age: 30 } }) },
  { id: 'completed-not-boolean', label: 'completed بنوع خاطئ', seed: JSON.stringify({ completed: 'yes-please' }) },
]

const browser = await chromium.launch({ args: ['--no-sandbox'] })

try {
  await waitForServer()
  console.log(`\n=== إقلاع على حالة متّسخة — ${CASES.length} حالة ===`)

  for (const c of CASES) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    const pageErrors = []
    page.on('pageerror', (e) => pageErrors.push(String(e.message)))
    page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(`console: ${m.text()}`) })

    // البذرة تُزرع قبل أي تنفيذ للتطبيق — وإلا لم نختبر الإقلاع أصلًا.
    await page.addInitScript(([key, accountsKey, value]) => {
      try {
        window.localStorage.clear()
        if (value !== null) window.localStorage.setItem(key, value)
        window.localStorage.removeItem(accountsKey)
      } catch { /* ignore */ }
    }, [K_ONBOARDING, K_ACCOUNTS, c.seed])

    await page.goto(URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)

    console.log(`\n— ${c.label} (${c.id})`)

    const mounted = await page.evaluate(() => {
      const root = document.getElementById('root')
      return !!root && root.children.length > 0 && (root.textContent || '').trim().length > 0
    })
    check(`${c.id}: التطبيق يُركَّب ويعرض محتوى`, mounted)

    const onBoundary = await page.locator('[data-testid="route-error-card"], [data-testid="error-reference"]').count()
    check(`${c.id}: لا يهبط على حدّ الخطأ`, onBoundary === 0)

    check(`${c.id}: بلا خطأ صفحة أو console`, pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '))

    /**
     * الحكم يقع عند **باب الضيف** لا عند الإقلاع.
     *
     * الإقلاع بلا hash يهبط على شاشة البداية دائمًا (`initialRoute`: `if (!userId)
     * return 'start'`) — للمكتمل وللتالف سواء. فالتمييز لا يظهر في hash الإقلاع
     * أصلًا، بل في وجهة «كمّل كضيف»: العقد المثبت في `test:guest-entry` أن الزرّ
     * «يوجّه حسب حالة الضيف لا وجهةً واحدة».
     *
     * ولهذا يُدفع كل حالة عبر الزرّ نفسه: المكتمل الحقيقي يدخل التطبيق، والتالف
     * يُعاد إلى الإعداد. وهذا أقوى من فحص hash الإقلاع لأنه يفحص القرار الفعلي.
     */
    const corrupt = ['malformed-json', 'wrong-type-array', 'wrong-type-scalar', 'null-literal', 'completed-not-boolean'].includes(c.id)
    if (corrupt || c.id === 'guest-complete') {
      const guestCta = page.getByRole('button', { name: GUEST_CTA, exact: true })
      const reachable = await guestCta.count()
      check(`${c.id}: باب الضيف ظاهر على شاشة البداية`, reachable > 0)
      if (reachable > 0) {
        await guestCta.first().click()
        await page.waitForTimeout(1500)
        const hash = await page.evaluate(() => window.location.hash)
        const enteredApp = /#\/(dashboard|workout|nutrition|progress|profile)/.test(hash)
        if (corrupt) {
          check(`${c.id}: قيمة تالفة لا تُقرأ إكمالًا صامتًا`, !enteredApp, `hash=${hash}`)
        } else {
          // الضبط الموجب — بلا هذا يصير الإثبات «كل شيء يُرفض» فلا يثبت شيئًا.
          check(`${c.id}: الضيف المكتمل الحقيقي يدخل التطبيق`, enteredApp, `hash=${hash}`)
        }
      }
    }

    await context.close()
  }

  // ═══ فشل الكتابة عند الإقلاع: التخزين يرمي على كل setItem ═══
  console.log('\n— فشل كتابة التخزين أثناء الإقلاع (quota/blocked)')
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    const pageErrors = []
    page.on('pageerror', (e) => pageErrors.push(String(e.message)))
    await page.addInitScript(() => {
      const proto = Object.getPrototypeOf(window.localStorage)
      const realSet = proto.setItem
      proto.setItem = function blocked() { void realSet; throw new DOMException('QuotaExceededError', 'QuotaExceededError') }
    })
    await page.goto(URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)
    const mounted = await page.evaluate(() => {
      const root = document.getElementById('root')
      return !!root && (root.textContent || '').trim().length > 0
    })
    check('كتابة محجوبة: التطبيق يُقلع ولا ينهار', mounted)
    check('كتابة محجوبة: بلا خطأ صفحة غير ملتقط', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '))
    await context.close()
  }

  console.log(`\n${'='.repeat(52)}`)
  console.log(fail === 0 ? `✅ إقلاع الحالة المتّسخة: ${pass}/${pass} فحصًا` : `❌ ${fail} فشل من ${pass + fail}`)
  if (fail > 0) { console.log(failures.map((f) => `   - ${f}`).join('\n')); process.exitCode = 1 }
} finally {
  await browser.close()
  if (preview) {
    try { process.kill(-preview.pid, 'SIGTERM') } catch { preview.kill('SIGTERM') }
    preview.stdout?.destroy()
    preview.stderr?.destroy()
  }
}
