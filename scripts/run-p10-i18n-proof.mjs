// إثبات i18n (P10 A4): يشغّل تطبيق الإنتاج المبني، يبدّل اللغة (EN/AR) عبر localStorage،
// يلتقط لقطات لكل شاشة، ويفحص النص الظاهر بحثًا عن سلاسل «شاردة» (عربية في وضع الإنجليزية أو
// العكس). يستخدم Chromium المثبّت مسبقًا عبر بروتوكول CDP (بلا مكتبات خارجية). لا يلمس التطبيق.
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(root, 'docs/product/assets')
mkdirSync(OUT, { recursive: true })

const PORT = 5199
const CDP = 9222
const BASE = `http://127.0.0.1:${PORT}`
const CHROME =
  process.env.CHROME_BIN ||
  ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'].find(
    (p) => existsSync(p),
  )
if (!CHROME) throw new Error('Chromium not found')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// شاشات نلتقطها. login لا يتطلّب إعدادًا؛ البقية تتطلّب إكمال إعداد (نزرعه في localStorage).
const ROUTES = ['login', 'dashboard', 'workout', 'nutrition', 'progress', 'measurements', 'profile', 'settings']
// نصوص ثنائية اللغة مقصودة (لا تُعدّ شاردة): أسماء اللغات في المبدّل + الاسم التجاري بالعربية في اللوغو.
const INTENTIONAL_AR = ['العربية', 'ع', 'قِمّة']

async function main() {
  // 1) خادم معاينة الإنتاج المبني.
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
  })
  await waitFor(`${BASE}/`, 20000)

  // 2) Chromium بمنفذ تصحيح.
  const userDir = resolve(root, '.p10-chrome')
  rmSync(userDir, { recursive: true, force: true })
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      `--remote-debugging-port=${CDP}`,
      `--user-data-dir=${userDir}`,
      '--window-size=430,932',
      'about:blank',
    ],
    { stdio: 'ignore' },
  )

  const wsUrl = await getWsUrl()
  const cdp = await connect(wsUrl)
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')

  const report = { generatedAt: new Date().toISOString(), langs: {} }

  for (const lang of ['en', 'ar']) {
    report.langs[lang] = {}
    // اذهب للأصل ثم ازرع localStorage (إعداد مكتمل + لغة) قبل تحميل الـ SPA.
    await navigate(cdp, `${BASE}/`)
    await cdp.send('Runtime.evaluate', {
      expression: `
        localStorage.clear();
        localStorage.setItem('qimmah:onboarding:v1', JSON.stringify({ completed: true, completedAt: '2026-01-01T00:00:00.000Z' }));
        localStorage.setItem('qimmah:prefs:v1', JSON.stringify({ language: ${JSON.stringify(lang)} }));
        true;
      `,
    })

    let idx = 0
    for (const route of ROUTES) {
      idx++
      await navigate(cdp, `${BASE}/?p=${lang}${idx}#/${route}`)
      await sleep(1600) // رسم الـ SPA + الحِزم عند الطلب

      // النص الظاهر + اتجاه الجذر.
      const { result } = await cdp.send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(() => {
          const dir = document.documentElement.dir;
          const htmlLang = document.documentElement.lang;
          const text = document.body ? document.body.innerText : '';
          const lines = [...new Set(text.split('\\n').map(s => s.trim()).filter(Boolean))];
          const arabic = lines.filter(l => /[\\u0600-\\u06FF]/.test(l));
          const latinWord = lines.filter(l => /[A-Za-z]{4,}/.test(l));
          return { dir, htmlLang, lineCount: lines.length, arabic, latinWord };
        })()`,
      })
      const v = result.value
      const strayArabic =
        lang === 'en' ? v.arabic.filter((l) => !INTENTIONAL_AR.some((w) => l === w || l.includes(w))) : []
      report.langs[lang][route] = {
        dir: v.dir,
        htmlLang: v.htmlLang,
        lineCount: v.lineCount,
        strayArabicInEn: strayArabic,
        arabicLines: v.arabic.length,
        latinLines: lang === 'ar' ? v.latinWord : undefined,
      }

      // لقطة.
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
      writeFileSync(resolve(OUT, `p10-${lang}-${route}.png`), Buffer.from(shot.data, 'base64'))
      const flag = strayArabic.length ? `⚠️ ${strayArabic.length} stray AR` : '✓'
      console.log(`[${lang}] ${route.padEnd(10)} dir=${v.dir} lines=${v.lineCount} ${flag}`)
      if (strayArabic.length) strayArabic.slice(0, 12).forEach((l) => console.log('      · ' + l))
    }
  }

  writeFileSync(resolve(OUT, 'p10-i18n-report.json'), JSON.stringify(report, null, 2))
  console.log('\n✅ report → docs/product/assets/p10-i18n-report.json')

  cdp.close()
  chrome.kill()
  server.kill()
  await sleep(500)
  try {
    rmSync(userDir, { recursive: true, force: true })
  } catch {
    /* best-effort cleanup */
  }
  // ملخّص شارد
  let stray = 0
  for (const l of ['en'])
    for (const r of ROUTES) stray += report.langs[l][r].strayArabicInEn.length
  console.log(`\nStray Arabic labels in EN mode (excluding data + intentional): ${stray}`)
  process.exit(0)
}

async function navigate(cdp, url) {
  const loaded = cdp.once('Page.loadEventFired')
  await cdp.send('Page.navigate', { url })
  await Promise.race([loaded, sleep(8000)])
}

async function waitFor(url, timeout) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const r = await fetch(url)
      if (r.ok) return
    } catch {
      /* retry */
    }
    await sleep(300)
  }
  throw new Error('server did not start: ' + url)
}

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${CDP}/json`)
      const list = await r.json()
      const page = list.find((t) => t.type === 'page') || list[0]
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
    } catch {
      /* retry */
    }
    await sleep(300)
  }
  throw new Error('no CDP target')
}

function connect(wsUrl) {
  return new Promise((resolvePromise, reject) => {
    const ws = new WebSocket(wsUrl)
    let id = 0
    const pending = new Map()
    const waiters = []
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id)
        pending.delete(msg.id)
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result)
      } else if (msg.method) {
        for (let i = waiters.length - 1; i >= 0; i--) {
          if (waiters[i].method === msg.method) {
            waiters[i].res(msg.params)
            waiters.splice(i, 1)
          }
        }
      }
    })
    ws.addEventListener('error', reject)
    ws.addEventListener('open', () =>
      resolvePromise({
        send: (method, params = {}) =>
          new Promise((res, rej) => {
            const mid = ++id
            pending.set(mid, { res, rej })
            ws.send(JSON.stringify({ id: mid, method, params }))
          }),
        once: (method) => new Promise((res) => waiters.push({ method, res })),
        close: () => ws.close(),
      }),
    )
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
