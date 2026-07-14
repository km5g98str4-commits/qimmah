import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

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

// يحقن هاش الـ commit في dist/sw.js بعد النسخ من public/ — كل نشر يحمل إصدار
// كاش جديدًا فيُبطل عامل الخدمة كاش النشرة السابقة تلقائيًا (لا bump يدوي).
function swVersionPlugin() {
  return {
    name: 'qimmah-sw-version',
    apply: 'build' as const,
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/sw.js')
      try {
        // أصول الإقلاع من dist/index.html (entry + modulepreload + CSS) — تُخزَّن
        // مسبقًا عند التثبيت كي تعمل القشرة دون اتصال من أول زيارة.
        const html = readFileSync(path.resolve(__dirname, 'dist/index.html'), 'utf-8')
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

// تصميم v2.1 هو الافتراضي المعتمد في بناء الإنتاج. نبصم
// السمة `data-design="v2"` مباشرةً على وسم <html> في index.html المبني. بهذا يصبح
// الوضع الافتراضي v2 جزءًا من الـ HTML المُقدَّم نفسه — قبل تشغيل أي JavaScript،
// فلا اعتماد على ترتيب تنفيذ الوحدات ولا وميض هوية عند أول رسم، ويظهر التفعيل
// مباشرةً عند فحص الناتج المبني. الرجوع الطارئ فقط هو
// `VITE_DESIGN_V2=false npm run build`. تبقى معاينة المطوّر عبر `?design=` تعمل
// كما هي. `isDesignV2()` يقرأ هذه السمة فقط، فلا تثبّت حالة v1 قديمة المستخدم عليها.
function designPromotionPlugin(enabled: boolean) {
  return {
    name: 'qimmah-design-promotion',
    apply: 'build' as const,
    transformIndexHtml(html: string) {
      if (!enabled) return html
      return html.replace(/<html(\s[^>]*)?>/i, (m, attrs = '') =>
        /\bdata-design=/i.test(m) ? m : `<html${attrs} data-design="v2">`,
      )
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // العلَم متغيّر `VITE_*` قد يأتي من البيئة أو من ملفات `.env*` (مثل
  // `.env.production.local`) لوضع البناء الحالي — نحمّله صراحةً لأنه يؤثّر على
  // بصم الـ HTML وقت البناء، لا على كود التطبيق فقط.
  const env = loadEnv(mode, process.cwd(), '')
  const designV2 = mode === 'production' && env.VITE_DESIGN_V2 !== 'false'

  return {
    plugins: [react(), swVersionPlugin(), designPromotionPlugin(designV2)],
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
          // فصل مكتبات الطرف الثالث عن كود التطبيق لتحسين التخزين المؤقت وتقليل حزمة الدخول.
          // zxing (الباركود) و react-body-highlighter (خريطة العضلات) ثقيلتان وتُطلبان في
          // أسطح محدّدة — نفصلهما ليُخزَّنا مستقلّين ويخرجا من حِزم الشاشات.
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-icons': ['lucide-react'],
            'vendor-zxing': ['@zxing/browser', '@zxing/library'],
            'vendor-charts': ['react-body-highlighter'],
          },
        },
      },
    },
  }
})
