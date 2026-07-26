import { defineConfig } from 'vite'
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

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    plugins: [react(), swVersionPlugin()],
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
          // zxing (الباركود) و react-body-highlighter (خريطة العضلات) ثقيلتان وتُطلبان في
          // أسطح محدّدة — نفصلهما ليُخزَّنا مستقلّين ويخرجا من حِزم الشاشات.
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
            if (id.includes('/node_modules/react-body-highlighter/')) return 'vendor-charts'

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
