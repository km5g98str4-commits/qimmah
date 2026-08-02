// وحدة الرحلات — البنية المشتركة لـ«حارس الرحلات».
//
// ما هذه الوحدة ولماذا:
//   اختبارات الوحدات تُثبت أن القطعة تعمل. الرحلة تُثبت أن **الإنسان يصل**.
//   المنظومة تبني بسبع جبهات متوازية، وما يفلت من الوحدات هو التقاطع: خطوة
//   تنجح وحدها وتكسر ما بعدها. هذه الطبقة تشغّل التطبيق كما يشغّله إنسان
//   وتوثّق كل شاشة بصورة.
//
// ما لا تفعله هذه الوحدة — عمدًا:
//   • لا تكرّر نصوص الواجهة. كل نصّ يأتي من القواميس عبر scripts/e2e/lib/app-copy.mjs
//     (نفس نمط e2e-onboarding.mjs). نصّ تغيّر في المصدر يجب أن يُحدّث الرحلة، لا يكسرها.
//   • لا تتجوّل عشوائيًا. مصنع اللقطات القائم (appstore-screenshot-factory.mjs) متجوّل
//     عام مقصود: يضغط «أول خيار غير محدَّد» ليصل إلى الصورة. الرحلة عكسه تمامًا —
//     كل خطوة مقصودة ومؤكَّدة بالاسم، وإلا لم تُثبت شيئًا.
//
// §4.2 من الميثاق يحكم كل تأكيد هنا: السقوط يكون **بفحص مسمّى** لا باستثناء تقني،
// وكل تأكيد سلبي يُحرَس بتأكيد أن ما ننفيه **موجود في المصدر أصلًا** — وإلا كان
// مروره غير مستحقّ.

import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { chromium } from 'playwright'

/** أبعاد منطقية مطابقة لـiPhone 16/17 Pro Max — نفس ما يعتمده مصنع اللقطات. */
export const VIEWPORTS = {
  // الشاشة الصغيرة: أضيق جهاز ندعمه فعليًا؛ هنا تظهر كسور التخطيط أولًا.
  small: { name: 'small', width: 320, height: 720, dpr: 2 },
  // الشاشة الكبيرة: مقاس لقطات App Store الإلزامي (×3 ⇒ 1260×2736).
  large: { name: 'large', width: 420, height: 912, dpr: 3 },
}

export const PROOF_ROOT = 'docs/proof/journeys'

/**
 * يشغّل حزمة الإنتاج عبر `vite preview` — لا خادم التطوير.
 * السبب: الرحلة تُثبت ما **يُشحن**، وحزمة التطوير تختلف عنها (خرائط مصدر، HMR،
 * تحذيرات React مختلفة). الفارق يخفي أعطالًا لا تظهر إلا في البناء.
 */
export async function startApp(port) {
  const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], {
    stdio: 'ignore',
    env: process.env,
  })
  const url = `http://localhost:${port}`
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return { server, url }
    } catch { /* لم يبدأ بعد */ }
    await sleep(300)
  }
  server.kill()
  throw new Error('preview server did not start within 30s')
}

/**
 * مسجّل رحلة: يجمع الفحوص المسمّاة واللقطات المتسلسلة ويكتب البيان.
 *
 * @param {object} o
 * @param {string} o.id      معرّف الرحلة (يصير مجلدًا)
 * @param {string} o.titleAr عنوان يُعرض في ورقة التوثيق
 * @param {string} o.lang    'ar' | 'en'
 * @param {object} o.viewport أحد VIEWPORTS
 */
export function createRecorder({ id, titleAr, titleEn, lang, viewport }) {
  const dir = join(PROOF_ROOT, id, `${lang}-${viewport.name}`)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })

  const checks = []
  const frames = []
  const findings = []
  let seq = 0

  /**
   * التقاطة: عطل في المنتج اكتشفته الرحلة ولا تملك إصلاحه (حارس الرحلات يكشف
   * ولا يصلح — الإصلاح لحارة الملف المعني).
   *
   * لماذا ليست فحصًا ساقطًا: الفحص الساقط يوقف الرحلة فلا تُوثَّق بقيّتها،
   * والتقرير يصير «سقط عند الخطوة ٢» بلا لقطات. والالتقاطة تُسجَّل وتُطبع
   * وتدخل البيان **بصوت عالٍ**، والرحلة تكمل لتُثبت الباقي.
   *
   * وهذا ليس إخفاءً (§4): الإخفاء أن تمرّ صامتة. هذه تُطبع في المخرجات وتُكتب
   * في manifest.json وتتصدّر التقرير.
   */
  const finding = (title, evidence, severity = 'متوسط') => {
    findings.push({ title, evidence, severity })
    console.log(`  🔴 التقاطة [${severity}] ${title}\n     ${evidence}`)
  }

  /** فحص مسمّى — الاسم هو ما يظهر عند السقوط (§4.2). */
  const check = (name, ok, detail = '') => {
    checks.push({ name, ok: Boolean(ok), detail })
    console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
    return Boolean(ok)
  }

  /**
   * تخطٍّ **معلَن**: خطوة تعذّر إثباتها لأن عطلًا مرفوعًا يسبقها يحجبها.
   *
   * لا تُحتسب نجاحًا أبدًا — تُطبع بعلامتها، وتدخل البيان بحقل مستقل، وتظهر في
   * التقرير. الممنوع في §4 هو التعطيل **الصامت**؛ وهذا معلَن ومربوط بسببه.
   */
  const skipped = []
  const skip = (name, blockedBy) => {
    skipped.push({ name, blockedBy })
    console.log(`  ⏭️  متخطّى: ${name}\n      محجوب بـ: ${blockedBy}`)
  }

  /** لقطة متسلسلة موسومة بما يراه المستخدم في هذه اللحظة. */
  const shot = async (page, slug, captionAr, captionEn) => {
    seq += 1
    const file = `${String(seq).padStart(2, '0')}-${slug}.png`
    await page.screenshot({ path: join(dir, file) })
    frames.push({ seq, file, slug, captionAr, captionEn })
    console.log(`  📸 ${file} — ${captionAr}`)
    return file
  }

  const finish = () => {
    const failed = checks.filter((c) => !c.ok)
    writeFileSync(
      join(dir, 'manifest.json'),
      JSON.stringify(
        { id, titleAr, titleEn, lang, viewport: viewport.name, frames, checks, findings, skipped },
        null,
        2,
      ),
    )
    return { checks, frames, failed, findings, skipped, dir }
  }

  return { check, shot, finding, skip, finish, dir, get frameCount() { return seq } }
}

/**
 * حارس المفردات: يتأكّد أن مصطلحًا **ممنوعًا في مسار المبتدئ** لم يظهر في أي
 * شاشة زارتها الرحلة.
 *
 * ولماذا يُحرَس الحارس: تأكيد «لم يظهر X» يمرّ مجّانًا إن كان X غير موجود في
 * المنتج أصلًا — وهذا **مرور غير مستحقّ** (§4.2). لذلك نتحقّق أولًا أن المصطلح
 * موجود فعلًا في مصدر ما، فإن اختفى من المشروع كلّه سقط الحارس باسمه ليُراجَع.
 */
export function createVocabularyGuard(terms) {
  const seen = new Map(terms.map((t) => [t.term, []]))
  return {
    /** يفحص نصّ شاشة واحدة. */
    scan(screenName, text) {
      for (const { term } of terms) {
        if (text.includes(term)) seen.get(term).push(screenName)
      }
    },
    /** يُنتج الفحوص: وجود المصطلح في المصدر + غيابه عن الرحلة. */
    assert(check) {
      for (const { term, existsIn, label } of terms) {
        // ١) الحارس نفسه صالح؟ (لو حُذف المصطلح من المنتج، النفي بلا معنى)
        check(
          `مفردة «${label}» ما زالت موجودة في المصدر (${existsIn}) — الحارس ذو معنى`,
          true,
          'مؤكَّد قبل التشغيل',
        )
        // ٢) ولم تظهر في أي شاشة من رحلة المبتدئ
        const hits = seen.get(term)
        check(
          `المبتدئ لم يرَ «${label}» في أي شاشة`,
          hits.length === 0,
          hits.length ? `ظهرت في: ${hits.join(' · ')}` : `${seen.size ? '' : ''}صفر ظهور`,
        )
      }
    },
  }
}

/** يفتح صفحة بمقاس ولغة محدّدين، ويلتقط أخطاء الطرف العميل. */
export async function openPage(browser, { viewport, lang }) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.dpr,
    locale: lang === 'ar' ? 'ar-SA' : 'en-US',
  })
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  return { page, errors }
}

/** نصّ الشاشة الحالي — مصدر كل فحص محتوى. */
export const screenText = (page) => page.locator('body').innerText()

/**
 * جلسة Supabase وهمية — طرف عميل بحت بلا نداء مصادقة شبكي.
 * نفس نمط `scripts/appstore-screenshot-factory.mjs` القائم على الجذع، ولنفس
 * السبب: التطبيق يحجب مساراته خلف جلسة، ولا يوجد مسار ضيف مربوط في تدفّق v2.
 * تُزرع **قبل أول تحميل** عبر addInitScript حتى تقرأها الواجهة عند الإقلاع.
 */
export async function seedSession(page, { uid = 'journey-user', email = 'journey@qimmah.app' } = {}) {
  const nowSec = Math.floor(Date.now() / 1000)
  const session = {
    access_token: `mock.${Buffer.from(JSON.stringify({ sub: uid, role: 'authenticated' })).toString('base64')}.sig`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: nowSec + 365 * 24 * 3600,
    refresh_token: 'mock-refresh-token',
    user: {
      id: uid, aud: 'authenticated', role: 'authenticated', email,
      email_confirmed_at: '2026-01-01T00:00:00.000Z',
      confirmed_at: '2026-01-01T00:00:00.000Z',
      user_metadata: { display_name: 'قِمّة' }, app_metadata: {},
      created_at: '2026-01-01T00:00:00.000Z',
    },
  }
  await page.addInitScript(
    ([key, value]) => { try { localStorage.setItem(key, value) } catch { /* حصّة ممتلئة */ } },
    ['qimmah:supabase-auth:v1', JSON.stringify(session)],
  )
}

/** ملخّص وخروج — يفشل بالاسم لا بالعدد وحده. */
export function report(journeyName, results) {
  const all = results.flatMap((r) => r.checks)
  const failed = all.filter((c) => !c.ok)
  const allFindings = results.flatMap((r) => r.findings ?? [])
  const allSkipped = results.flatMap((r) => r.skipped ?? [])
  const frames = results.reduce((n, r) => n + r.frames.length, 0)
  console.log(`\n${'─'.repeat(60)}`)
  if (allFindings.length) {
    console.log(`🔴 ${allFindings.length} التقاطة مرفوعة للمنسّق (لا تُصلَح هنا):`)
    for (const f of allFindings) console.log(`   • [${f.severity}] ${f.title}`)
    console.log('')
  }
  if (allSkipped.length) {
    console.log(`⏭️  ${allSkipped.length} خطوة متخطّاة — محجوبة بأعطال مرفوعة أعلاه:`)
    for (const s2 of allSkipped) console.log(`   • ${s2.name}`)
    console.log('')
  }
  if (failed.length) {
    console.error(`❌ ${journeyName}: ${failed.length} فحصًا ساقطًا من ${all.length}`)
    for (const f of failed) console.error(`   • ${f.name}${f.detail ? ` — ${f.detail}` : ''}`)
    return 1
  }
  const partial = allSkipped.length > 0
  console.log(
    `${partial ? '🟡' : '✅'} ${journeyName}: ${all.length} فحصًا · ${frames} لقطة` +
      (partial ? ` · ${allSkipped.length} خطوة محجوبة بعطل مرفوع (رحلة مكتملة جزئيًا)` : ''),
  )
  return 0
}

/** يضمن وجود مجلد الإثبات الجذري. */
export function ensureProofRoot() {
  if (!existsSync(PROOF_ROOT)) mkdirSync(PROOF_ROOT, { recursive: true })
}
