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

// يحقن هاش الـ commit في sw.js بعد النسخ من public/ — كل نشر يحمل إصدار
// كاش جديدًا فيُبطل عامل الخدمة كاش النشرة السابقة تلقائيًا (لا bump يدوي).
//
// (QEA-003) كان المسار مثبّتًا حرفيًا على 'dist/' بصرف النظر عن build.outDir المُهيَّأ
// فعليًا — فأي بناء بمخرج مختلف (مثل بناء تدقيق معزول عبر --outDir أو outDir مخصّص في
// تهيئة أخرى) يُنتج sw.js لا يحمل __SW_VERSION__/__SW_PRECACHE_ASSETS__ المُستبدَلين،
// فيفشل عامل الخدمة بصمت ويظهر عطل «غير متصل» لا علاقة له بسلوك الإنتاج الحقيقي.
// الإصلاح: نلتقط outDir المُحلَّل فعليًا عبر configResolved (يعكس أي --outDir أو تخصيصًا
// آخر) بدل افتراض 'dist' دائمًا.
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
          // فصل مكتبات الطرف الثالث عن كود التطبيق لتحسين التخزين المؤقت وتقليل حزمة الدخول.
          // zxing (الباركود) ثقيلة وتُطلب في
          // سطح محدّد — نفصلها لتُخزَّن مستقلّة وتخرج من حِزم الشاشات.
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-icons': ['lucide-react'],
            'vendor-zxing': ['@zxing/browser', '@zxing/library'],
          },
        },
      },
    },
  }
})
