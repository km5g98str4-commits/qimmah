/**
 * إثبات أمان نشرات الفروع — [SOVEREIGN-PREVIEW-SAFETY].
 *
 * ═══ الفجوة التي يغلقها ═══
 * `test:preview-safety` يثبت أن **الأمر** `build:founder-preview` ينزع بيانات
 * اعتماد الإنتاج. لكن النشر الحقيقي لا يمرّ بذلك الأمر: تكامل Git في
 * Cloudflare Pages يبني **كل دفعة على أي فرع** بأمر البناء الواحد المُهيَّأ في
 * المشروع — أي `npm run build` — فتخرج نشرة معاينة الفرع **بوضع الإنتاج**،
 * بالعنوان والمفتاح مخبوزين. فكان أمان المعاينة معلَّقًا على أن يتذكّر إنسانٌ
 * أمرًا، بينما الآلة تنشر تلقائيًا الأمر الآخر.
 *
 * ═══ ما يُثبَت هنا ═══
 *   ① فرع غير إنتاجي  → الأرتيفكت **لا يحمل** عنوان الإنتاج، ووسم البيئة معاينة.
 *   ② الفرع الإنتاجي  → الأرتيفكت **يحمل** العنوان (الإنتاج لم يتغيّر).
 *   ③ تجاوز صريح      → `VITE_APP_ENV=production` يغلب الاشتقاق (لا يُنقَض تعيين يدوي).
 *
 * ② و③ هما **التأكيد المضادّ** (§4.2): لولاهما لكان «غياب العنوان» قابلًا
 * للتحقّق بأن يفشل البناء أصلًا أو ألّا يحمل الأرتيفكت شيئًا.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** مضيف مشروع Supabase الإنتاجي — نفس الثابت الذي يحرسه إثبات المعاينة. */
const PROD_HOST = 'ledlypcyrtnzvjvhykwz'
/** الفرع الذي ينشر إنتاجًا في مشروع Pages. */
const PRODUCTION_BRANCH = 'main'

let pass = 0
const fails = []
const check = (label, cond, detail = '') => {
  if (cond) {
    pass += 1
    console.log(`  ✓ ${label}`)
  } else {
    fails.push(label)
    console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

/** يبني بالبيئة المعطاة إلى مجلد مؤقّت، ويعيد {prodHostFiles, envMeta}. */
function buildWith(env) {
  const outDir = mkdtempSync(join(tmpdir(), 'qimmah-branch-preview-'))
  try {
    execFileSync('npx', ['vite', 'build', '--outDir', outDir, '--emptyOutDir'], {
      cwd: root,
      stdio: 'ignore',
      env: { ...process.env, VITE_APP_ENV: '', CF_PAGES_BRANCH: '', ...env },
    })
    const files = walk(outDir)
    const prodHostFiles = files.filter((f) => {
      try {
        return readFileSync(f, 'utf8').includes(PROD_HOST)
      } catch {
        return false
      }
    })
    let envMeta = ''
    try {
      const html = readFileSync(join(outDir, 'index.html'), 'utf8')
      envMeta = (html.match(/name="qimmah-env"\s+content="([a-z_]+)"/) || [])[1] || ''
    } catch {
      envMeta = ''
    }
    const stagingHostFiles = files.filter((f) => {
      try { return readFileSync(f, 'utf8').includes('qimmahstaging1234') } catch { return false }
    })
    return {
      prodHostFiles: prodHostFiles.length,
      stagingHostFiles: stagingHostFiles.length,
      envMeta,
      fileCount: files.length,
    }
  } finally {
    rmSync(outDir, { recursive: true, force: true })
  }
}

console.log('\n① فرع غير إنتاجي يُبنى معاينةً — بلا بيانات اعتماد الإنتاج')
const branch = buildWith({ CF_PAGES_BRANCH: 'codex/some-feature-branch' })
check('بناء الفرع أنتج أرتيفكتًا فعليًا (ليس فشلًا صامتًا)', branch.fileCount > 5, `files=${branch.fileCount}`)
check('لا ملف واحد في أرتيفكت الفرع يحمل عنوان مشروع الإنتاج', branch.prodHostFiles === 0, `files=${branch.prodHostFiles}`)
check('وسم البيئة يعلن المعاينة', branch.envMeta === 'founder_preview', `qimmah-env=${branch.envMeta || '(غائب)'}`)

console.log('\n② التأكيد المضادّ — الفرع الإنتاجي ما زال إنتاجًا')
const prod = buildWith({ CF_PAGES_BRANCH: PRODUCTION_BRANCH })
check('أرتيفكت الفرع الإنتاجي يحمل عنوان الإنتاج (الفحص ليس فارغًا)', prod.prodHostFiles > 0, `files=${prod.prodHostFiles}`)
check('وسم البيئة يعلن الإنتاج', prod.envMeta === 'production', `qimmah-env=${prod.envMeta || '(غائب)'}`)

console.log('\n③ التأكيد المضادّ — التعيين الصريح يغلب الاشتقاق')
const override = buildWith({ CF_PAGES_BRANCH: 'codex/some-feature-branch', VITE_APP_ENV: 'production' })
check('فرع غير إنتاجي + `VITE_APP_ENV=production` يبقى إنتاجًا', override.prodHostFiles > 0, `files=${override.prodHostFiles}`)
check('وسم البيئة يتبع التعيين الصريح', override.envMeta === 'production', `qimmah-env=${override.envMeta || '(غائب)'}`)

console.log('\n④ الاشتقاق معلَن في مصدر البناء لا مخفيًّا')
const viteConfig = readFileSync(join(root, 'vite.config.ts'), 'utf8')
check(
  'vite.config.ts يشتقّ البيئة من CF_PAGES_BRANCH صراحةً',
  /CF_PAGES_BRANCH/.test(viteConfig) && /founder_preview/.test(viteConfig),
)
check(
  'الاشتقاق لا يتجاوز تعيينًا صريحًا لـVITE_APP_ENV',
  /!process\.env\.VITE_APP_ENV\s*&&/.test(viteConfig),
)

console.log('\n⑤ بناء staging — يشير إلى مشروع غير إنتاجي ولا يحمل اعتماد الإنتاج')
/**
 * ═══ لماذا هذا الفحص موجود ═══
 * التكليف يطلب «تطبيقًا يصل staging وحده» و«معاينة بلا اعتماد إنتاج». وكان
 * بناءُ staging **يحمل عنوان الإنتاج فعلًا** — مقيسًا في الأرتيفكت لا مستنتَجًا:
 * `VITE_SUPABASE_URL?.trim()` يمنع المُصغِّر من طيّ الاختيار (لا يطوي `.trim()`
 * على نصّ حرفي)، فيبقى الاحتياط محمولًا. صار التشذيب **بعد** الاختيار.
 *
 * ⚠️ ولاحظ ما لا يفعله هذا البناء: `VITE_APP_ENV` **ليست** `founder_preview`،
 * وإلا لقُصِرت الاستحقاقات على مخزن التقليد ولما لمست staging أبدًا — أي أن
 * «نسخة تجريبية» كانت ستُثبت التطبيق ولا تُثبت الخادم إطلاقًا.
 */
const STAGING_HOST = 'qimmahstaging1234'
const staging = buildWith({
  VITE_SUPABASE_URL: `https://${STAGING_HOST}.supabase.co`,
  VITE_SUPABASE_ANON_KEY: 'staging.anon.key',
})
check('بناء staging أنتج أرتيفكتًا فعليًا', staging.fileCount > 5, `files=${staging.fileCount}`)
check('⚔️ ولا ملف واحد فيه يحمل عنوان مشروع الإنتاج',
  staging.prodHostFiles === 0, `files=${staging.prodHostFiles}`)
check('  ويشير فعلًا إلى المشروع التجريبي — الفحص ليس فارغًا',
  staging.stagingHostFiles > 0, `files=${staging.stagingHostFiles}`)
check('  ووسم البيئة يبقى إنتاجًا — فالاستحقاق يُسأل من الخادم لا من مخزن تقليد',
  staging.envMeta === 'production', `qimmah-env=${staging.envMeta || '(غائب)'}`)

// ⟲ محاكاة الالتفاف: إعادة التشذيب قبل الاختيار تُسقط الفحص **باسمه**.
const clientPath = resolve(root, 'src/lib/supabaseClient.ts')
const clientSrc = readFileSync(clientPath, 'utf8')
const regressed = clientSrc
  .replace("const explicitUrl = import.meta.env.VITE_SUPABASE_URL || ''",
           "const explicitUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || ''")
  .replace("const url = (explicitUrl || (IS_FOUNDER_PREVIEW ? '' : DEFAULT_SUPABASE_URL)).trim()",
           "const url = explicitUrl || (IS_FOUNDER_PREVIEW ? '' : DEFAULT_SUPABASE_URL)")
check('⟲ نسخة الانحدار اختلفت فعلًا عن المصدر', regressed !== clientSrc)
let regressedProdFiles = -1
try {
  writeFileSync(clientPath, regressed)
  regressedProdFiles = buildWith({
    VITE_SUPABASE_URL: `https://${STAGING_HOST}.supabase.co`,
    VITE_SUPABASE_ANON_KEY: 'staging.anon.key',
  }).prodHostFiles
} finally {
  writeFileSync(clientPath, clientSrc)
}
check('⟲ وبها يعود اعتماد الإنتاج إلى أرتيفكت staging — فالفحص قادر على الرسوب',
  regressedProdFiles > 0, `files=${regressedProdFiles}`)
check('⟲ والمصدر أُعيد كما كان بعد المحاكاة',
  readFileSync(clientPath, 'utf8') === clientSrc)

console.log(`\n${fails.length === 0 ? '✅' : '❌'} أمان نشرات الفروع — نجح ${pass} · فشل ${fails.length}`)
if (fails.length) {
  for (const f of fails) console.log(`   · ${f}`)
  process.exit(1)
}
