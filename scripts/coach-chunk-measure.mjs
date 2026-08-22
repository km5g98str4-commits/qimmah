// قياس حجم حزمة المرشد الكسولة — أداة تقرير لا بوّابة.
// تقيس **كودها ومعتمَداتها غير المشتركة** عبر esbuild؛ حزمة Vite الحقيقية أصغر
// أو مساوية لأن ما يتشارك مع حزم قائمة يُنقل إلى حزمة مشتركة.
import { build } from 'esbuild'
import { gzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
async function measure(entry, label, extraExternal = [], plugins = []) {
  const r = await build({
    entryPoints: [resolve(root, entry)],
    bundle: true, format: 'esm', platform: 'browser', write: false, minify: true,
    alias: { '@': resolve(root, 'src') },
    external: ['react', 'react-dom', 'react/jsx-runtime', 'lucide-react', '@supabase/supabase-js', ...extraExternal],
    define: { 'import.meta.env': JSON.stringify({ MODE: 'production', DEV: false, PROD: true }) },
    jsx: 'automatic', logLevel: 'error', plugins,
  })
  const out = r.outputFiles[0].text
  console.log(`${label}: raw ${(out.length / 1024).toFixed(1)} KB · gzip ${(gzipSync(Buffer.from(out)).length / 1024).toFixed(1)} KB`)
}
await measure('src/features/coach/CoachView.tsx', 'CoachView (الشاشة + المحرّك + القاموس)')
await measure('src/features/coach/CoachTodayEntry.tsx', 'CoachTodayEntry (بطاقة اليوم)')
await measure('src/i18n/dict/coach.ts', 'قاموس المرشد وحده')
await measure('src/lib/coach/index.ts', 'طبقة lib/coach وحدها')

// الشيفرة **الجديدة وحدها**: كل وحدة `@/…` خارج شجرة المرشد تُعلَن خارجية
// (الكتالوج · المولّد · نموذج التغذية …) لأنها تشحن أصلًا في حزم قائمة. فيبقى
// الرقم هو ما يضيفه المرشد فعلًا لا ما يشاركه.
const onlyCoach = {
  name: 'external-shared',
  setup(b) {
    b.onResolve({ filter: /^@\// }, (args) => {
      const isCoach = /^@\/(lib\/coach|features\/coach|i18n\/dict\/coach)/.test(args.path)
      return isCoach ? null : { path: args.path, external: true }
    })
  },
}
await measure('src/features/coach/CoachView.tsx', 'الجديد فقط: الشاشة + اللوحة + القاموس', [], [onlyCoach])
await measure('src/lib/coach/index.ts', 'الجديد فقط: محرّك المرشد', [], [onlyCoach])
await measure('src/features/coach/CoachTodayEntry.tsx', 'الجديد فقط: بطاقة اليوم', [], [onlyCoach])
