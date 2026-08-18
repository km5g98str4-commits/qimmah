import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

// ═══ [SOVEREIGN-PREVIEW-SAFETY] نشرات الفروع تُبنى معاينةً لا إنتاجًا ═══
//
// تكامل Git في Cloudflare Pages يبني **كل دفعة على أي فرع** بنفس أمر البناء.
// فحتى بعد أن صار `build:founder-preview` ينزع بيانات اعتماد الإنتاج، بقيت
// نشرة الفرع الآلية تُبنى بـ`npm run build` — أي **بوضع الإنتاج**، بالعنوان
// والمفتاح مخبوزين. فكان أمان المعاينة يعتمد على أن يتذكّر إنسانٌ استعمال
// الأمر الصحيح، بينما الآلة تنشر الأمر الخاطئ تلقائيًا عند كل دفعة.
//
// العلاج بنيوي لا إجرائي: البيئة تُشتقّ من `CF_PAGES_BRANCH` — الفرع الإنتاجي
// وحده يُبنى إنتاجًا، وكل ما عداه معاينة. ويبقى `VITE_APP_ENV` الصريح أعلى
// سلطة (لا يُنقَض تعيينٌ يدوي)، ويبقى البناء المحلّي بلا متغيّرات إنتاجًا كما كان.
//
// ملاحظة تنفيذ: نكتب في `process.env` قبل أن يحسم Vite `import.meta.env`،
// لأن `supabaseClient` يقرأ `import.meta.env.VITE_APP_ENV` حرفيًّا وقت البناء —
// فبهذا يطوي المُصغِّر الاحتياط ويحذف الاعتماد من أرتيفكت نشرة الفرع نفسها.
const CF_PRODUCTION_BRANCH = 'main'
if (!process.env.VITE_APP_ENV && process.env.CF_PAGES_BRANCH && process.env.CF_PAGES_BRANCH !== CF_PRODUCTION_BRANCH) {
  process.env.VITE_APP_ENV = 'founder_preview'
}

// نسخة الحزمة + هاش الـ commit وقت البناء — لإظهار معرّف بناء يمكن التحقق منه.
const pkgVersion = (() => {
  try {
    return JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')).version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
})()

// على Cloudflare Pages يتوفّر CF_PAGES_COMMIT_SHA؛ محليًا نقرأ git؛ وإلا 'dev'.
const buildCommit = (() => {
  const ref = process.env.CF_PAGES_COMMIT_SHA
  if (ref) return ref.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
})()

// يحقن هاش الـ commit في sw.js بعد النسخ من public/ — كل نشر يحمل إصدار
// كاش جديدًا فيُبطل عامل الخدمة كاش النشرة السابقة تلقائيًا (لا bump يدوي).
//
// (QEA-003) كان المسار مثبّتًا حرفيًا على 'dist/' بصرف النظر عن build.outDir المُهيَّأ
// فعليًا — فأي بناء بمخرج مختلف (مثل بناء تدقيق معزول عبر --outDir أو outDir مخصّص في
// تهيئة أخرى) يُنتج sw.js لا يحمل __SW_VERSION__/__SW_PRECACHE_ASSETS__ المُستبدَلين،
// فيفشل عامل الخدمة بصمت ويظهر عطل «غير متصل» لا علاقة له بسلوك الإنتاج الحقيقي.
// الإصلاح: نلتقط outDir المُحلَّل فعليًا عبر configResolved (يعكس أي --outDir أو تخصيصًا
// آخر) بدل افتراض 'dist' دائمًا.
// هوية البناء داخل index.html نفسه — [QIM-WEB-RELEASE-001] البند ٢.
//
// `BUILD_LABEL` كان يعيش داخل حزمة JS فقط (الفوتر + console)، فقراءته تتطلّب
// **تشغيل التطبيق**. وحين يكون السؤال «أي نسخة يرى هذا الجهاز؟» فالتطبيق قد يكون
// هو نفسه العاجز عن الإقلاع، أو الجهاز بعيدًا لا متصفّح فيه تحت اليد. فنضع الهوية
// في وسوم meta: تُقرأ بطلب واحد بلا تنفيذ أي سكربت، وتحمل الهاش ووقت البناء
// وإصدار عامل الخدمة معًا — فيُحسم فورًا خلافُ «بناء مختلف» عن «حالة محلية مختلفة».
//
// تُحقن في index.html وحده (لا داخل الأصول المُهشّمة)، فلا تُغيّر هاشات الحِزم،
// وindex.html مضبوط على `no-cache` في `_headers` فتصل القراءة طازجة دائمًا.
function buildIdentityPlugin() {
  const buildTime = new Date().toISOString()
  const appEnv = process.env.VITE_APP_ENV === 'founder_preview' ? 'founder_preview' : 'production'
  return {
    name: 'qimmah-build-identity',
    apply: 'build' as const,
    transformIndexHtml() {
      return [
        { tag: 'meta', attrs: { name: 'qimmah-build', content: `v${pkgVersion}·${buildCommit}` }, injectTo: 'head' as const },
        { tag: 'meta', attrs: { name: 'qimmah-commit', content: buildCommit }, injectTo: 'head' as const },
        { tag: 'meta', attrs: { name: 'qimmah-build-time', content: buildTime }, injectTo: 'head' as const },
        { tag: 'meta', attrs: { name: 'qimmah-sw-version', content: `qimmah-${buildCommit}` }, injectTo: 'head' as const },
        // [FOUNDER-QA-PREVIEW-SAFETY] البيئة تُعلَن في الوسم كما يُعلَن الهاش:
        // تُقرأ بطلب واحد بلا تنفيذ سكربت، فيُحسم «أهذه معاينة أم إنتاج؟» فورًا.
        { tag: 'meta', attrs: { name: 'qimmah-env', content: appEnv }, injectTo: 'head' as const },
      ]
    },
  }
}

function swVersionPlugin() {
  let outDir = path.resolve(__dirname, 'dist')
  return {
    name: 'qimmah-sw-version',
    apply: 'build' as const,
    configResolved(config: { build: { outDir: string }; root: string }) {
      outDir = path.isAbsolute(config.build.outDir) ? config.build.outDir : path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const swPath = path.resolve(outDir, 'sw.js')
      try {
        // أصول الإقلاع من index.html (entry + modulepreload + CSS) داخل outDir الفعلي —
        // تُخزَّن مسبقًا عند التثبيت كي تعمل القشرة دون اتصال من أول زيارة.
        const html = readFileSync(path.resolve(outDir, 'index.html'), 'utf-8')
        const bootAssets = [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[\w.-]+\.(?:js|css))"/g)].map((m) => m[1]))]
        const src = readFileSync(swPath, 'utf-8')
        writeFileSync(
          swPath,
          src.replace('__SW_VERSION__', buildCommit).replace('__SW_PRECACHE_ASSETS__', JSON.stringify(bootAssets)),
        )
      } catch {
        // لا نُفشل البناء إن غاب sw.js (مثلًا بناء جزئي) — التسجيل في main.tsx متسامح أصلًا.
      }
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    plugins: [react(), buildIdentityPlugin(), swVersionPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(pkgVersion),
      __BUILD_COMMIT__: JSON.stringify(buildCommit),
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          // Keep an application's dependency from being pulled into a manual chunk
          // merely because one selected module imports it. This preserves route-level
          // lazy boundaries (especially the nutrition catalogue below).
          onlyExplicitManualChunks: true,
          // فصل مكتبات الطرف الثالث عن كود التطبيق لتحسين التخزين المؤقت وتقليل حزمة الدخول.
          // zxing (الباركود) ثقيلة وتُطلب في سطح محدّد — نفصلها لتُخزَّن مستقلّة
          // وتخرج من حِزم الشاشات.
          manualChunks(id) {
            if (id.includes('/node_modules/lucide-react/')) return 'vendor-icons'
            if (
              id.includes('/node_modules/react/') ||
              id.includes('/node_modules/react-dom/') ||
              id.includes('/node_modules/scheduler/')
            ) {
              return 'vendor-react'
            }
            if (id.includes('/node_modules/@zxing/')) return 'vendor-zxing'

            // The nutrition ledger is shared by Today, Nutrition, portability and sync.
            // Without an explicit feature boundary Rollup promotes its full GCC food
            // catalogue into the entry chunk. None of it is required to render the
            // account/start shell, so keep it behind the screens that consume it.
            if (
              id.includes('/src/lib/nutritionHistory.ts') ||
              id.includes('/src/lib/nutritionV2Model.ts') ||
              id.includes('/src/data/foodItems.ts') ||
              id.includes('/src/data/saudiFoods.ts') ||
              id.includes('/src/data/gccStaples.ts') ||
              id.includes('/src/data/foodR2')
            ) {
              return 'feature-nutrition-catalog'
            }
          },
        },
      },
    },
  }
})
