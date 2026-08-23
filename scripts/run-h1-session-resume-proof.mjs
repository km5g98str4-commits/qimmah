// ح-١ — إثبات استئناف الجلسة الجارية.
//
// السلوك المطلوب: من بدأ تمرينًا ثم قُتل التطبيق أو أُعيد تحميله يجد جلسته في
// انتظاره (موضع التمرين + الجولات المكتملة)، ويستطيع تجاهلها والبدء نظيفًا.
//
// الإثبات يشغّل دوال المتجر الحقيقية (src/lib/activeWorkout.ts) في متصفح حقيقي فوق
// localStorage حقيقي، ويُعيد تحميل الصفحة فعليًا بين الكتابة والقراءة — لا محاكاة.
//
// التشغيل:  npm run build && node scripts/run-h1-session-resume-proof.mjs

import { spawn } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { chromium } from './e2e/lib/engine.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const PORT = 4324
const EXTERNAL = process.env.PREVIEW_URL || ''
const URL = EXTERNAL || `http://localhost:${PORT}`
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

const UID = 'acc-00000000-0000-4000-8000-0000000000a1'
const OTHER_UID = 'acc-00000000-0000-4000-8000-0000000000a2'

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
}

async function buildProbe() {
  const outfile = resolve(here, '.h1-probe.js')
  await build({
    entryPoints: [resolve(here, 'h1-session-probe.ts')],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    outfile,
    alias: { '@': resolve(root, 'src') },
    define: { 'import.meta.env': '{}' },
    logLevel: 'warning',
  })
  const code = readFileSync(outfile, 'utf8')
  try {
    rmSync(outfile)
  } catch {
    /* ignore */
  }
  return code
}

function startPreview() {
  if (EXTERNAL) return null
  return spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore',
    env: process.env,
  })
}

async function waitForServer(ms = 20000) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    try {
      const r = await fetch(URL)
      if (r.ok) return true
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('preview server did not start')
}

/** جلسة نصف مُنجَزة: التمرين الثاني، أول جولتين مكتملتان. */
const SESSION = {
  dayId: 'gen-upper-lower-4-d2',
  dayNameAr: 'اليوم 2 · سفلي',
  dayNameEn: 'Day 2 · Lower',
  startedAt: '2026-07-31T17:00:00.000Z',
  current: 1,
  exercises: {
    'd2-leg-press-0': {
      sets: [
        { setNumber: 1, targetReps: '8–12', actualReps: '10', weightKg: '120', completed: true },
        { setNumber: 2, targetReps: '8–12', actualReps: '10', weightKg: '120', completed: true },
        { setNumber: 3, targetReps: '8–12', actualReps: '', weightKg: '120', completed: false },
      ],
      painNote: '',
      notes: '',
    },
  },
  swap: {},
}

const probe = await buildProbe()
const preview = startPreview()
let browser
try {
  await waitForServer()
  browser = await chromium.launch({ executablePath: CHROME, headless: true })
  const page = await browser.newPage()
  const inject = async () => {
    await page.addScriptTag({ content: probe })
  }

  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await inject()

  // ١) بدء تمرين وحفظ تقدّمه.
  await page.evaluate(
    ({ uid, session }) => {
      localStorage.clear()
      window.__h1.saveActiveWorkout(uid, session)
    },
    { uid: UID, session: SESSION },
  )

  // ٢) قتل التطبيق: إعادة تحميل كاملة للصفحة.
  await page.reload({ waitUntil: 'domcontentloaded' })
  await inject()

  const resumed = await page.evaluate(({ uid }) => window.__h1.loadActiveWorkout(uid), { uid: UID })
  check('الجلسة تنجو من إعادة التحميل', Boolean(resumed))
  check(
    'موضع التمرين محفوظ',
    resumed?.current === SESSION.current,
    `current = ${resumed?.current}`,
  )
  check(
    'الجولات المكتملة محفوظة',
    resumed?.exercises['d2-leg-press-0']?.sets.filter((s) => s.completed).length === 2,
    `${resumed?.exercises['d2-leg-press-0']?.sets.filter((s) => s.completed).length} جولتان`,
  )
  check(
    'القرار على معرّف اليوم لا على النص المعروض',
    resumed?.dayId === SESSION.dayId,
    resumed?.dayId,
  )

  // ٣) سلبي أول: هوية أخرى لا ترث الجلسة.
  // القيم تُختصر إلى منطقية داخل الصفحة: `undefined` العائد من evaluate يصل Node مفقودًا.
  const otherIdentity = await page.evaluate(
    ({ otherUid, uid }) => ({
      otherEmpty: window.__h1.loadActiveWorkout(otherUid) === undefined,
      otherHas: window.__h1.hasActiveWorkout(otherUid),
      guestEmpty: window.__h1.loadActiveWorkout(null) === undefined,
      guestHas: window.__h1.hasActiveWorkout(null),
      // ونتأكّد أنّ صاحبها ما زال يراها بعد كل هذه القراءات.
      ownerStillHas: window.__h1.hasActiveWorkout(uid),
    }),
    { otherUid: OTHER_UID, uid: UID },
  )
  check('حساب آخر لا يرث الجلسة', otherIdentity.otherEmpty && otherIdentity.otherHas === false)
  check('الضيف لا يرث جلسة حساب', otherIdentity.guestEmpty && otherIdentity.guestHas === false)
  check('صاحب الجلسة ما زال يراها', otherIdentity.ownerStillHas === true)

  // ٤) سلبي ثانٍ: جلسة فاسدة → بداية نظيفة (وتُمسح فلا يُسأل المستخدم مرّتين).
  const corrupt = await page.evaluate(
    ({ uid, key }) => {
      const out = []
      const cases = {
        'نص غير JSON': '}{ not json',
        'حقول ناقصة': JSON.stringify({ [uid]: { version: 1, dayId: 'x' } }),
        'إصدار مجهول': JSON.stringify({ [uid]: { version: 99, dayId: 'x', dayNameAr: '', dayNameEn: '', startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), current: 0, exercises: {}, swap: {} } }),
        'نوع خاطئ في الجولات': JSON.stringify({
          [uid]: {
            version: 1, dayId: 'x', dayNameAr: '', dayNameEn: '',
            startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            current: 0, swap: {},
            exercises: { a: { sets: [{ setNumber: 'أولى', targetReps: 1, actualReps: null, weightKg: {}, completed: 'نعم' }], painNote: '', notes: '' } },
          },
        }),
        'سجلّ مصفوفة لا كائن': JSON.stringify([1, 2, 3]),
      }
      for (const [label, raw] of Object.entries(cases)) {
        localStorage.setItem(key, raw)
        const loaded = window.__h1.loadActiveWorkout(uid)
        out.push({ label, cleanStart: loaded === undefined })
      }
      return out
    },
    { uid: UID, key: 'qimmah:activeWorkout:v1' },
  )
  corrupt.forEach((c) => check(`جلسة فاسدة تبدأ نظيفة — ${c.label}`, c.cleanStart))

  // ٥) جلسة منتهية الصلاحية → بداية نظيفة.
  const expired = await page.evaluate(
    ({ uid, key, session }) => {
      const old = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString()
      localStorage.setItem(key, JSON.stringify({ [uid]: { ...session, version: 1, updatedAt: old } }))
      const loaded = window.__h1.loadActiveWorkout(uid)
      return { cleanStart: loaded === undefined, leftBehind: localStorage.getItem(key) }
    },
    { uid: UID, key: 'qimmah:activeWorkout:v1', session: SESSION },
  )
  check('جلسة منتهية الصلاحية تبدأ نظيفة', expired.cleanStart)
  check(
    'السجلّ التالف/المنتهي يُمسح فلا يُسأل المستخدم مرّتين',
    !String(expired.leftBehind).includes(UID),
    String(expired.leftBehind),
  )

  // ٦) التجاهل الصريح: «ابدأ نظيفًا» يمسح الجلسة.
  const discarded = await page.evaluate(
    ({ uid, session }) => {
      localStorage.clear()
      window.__h1.saveActiveWorkout(uid, session)
      const before = window.__h1.hasActiveWorkout(uid)
      window.__h1.clearActiveWorkout(uid)
      return { before, after: window.__h1.hasActiveWorkout(uid) }
    },
    { uid: UID, session: SESSION },
  )
  check('«ابدأ نظيفًا» يمسح الجلسة', discarded.before === true && discarded.after === false)
} catch (e) {
  check('إثبات ح-١ اشتغل', false, e.message)
} finally {
  await browser?.close()
  preview?.kill('SIGKILL')
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${failed.length ? `❌ ${failed.length} FAILED` : `✅ ALL ${results.length} PASSED`} — ح-١ استئناف الجلسة`)
process.exit(failed.length ? 1 : 0)
