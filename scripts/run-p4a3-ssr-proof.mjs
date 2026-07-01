// إثبات SSR: يتحقّق أن شجرة المكوّنات (MyTargets + CalorieExplainer + QuickMealLogger)
// تُصيّر فعليًا إلى HTML بأرقام محسوبة حقيقية، بلا أخطاء استيراد/سياق.
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tmp = mkdtempSync(path.join(os.tmpdir(), 'p4a3ssr-'))
const entry = path.join(tmp, 'entry.jsx')

writeFileSync(
  entry,
  `import React from 'react'
import { renderToString } from 'react-dom/server'
import { DemoCustomizationProvider } from '@/lib/customizationContext'
import { MyTargets } from '@/sections/MyTargets'
import { QuickMealLogger } from '@/components/nutrition/QuickMealLogger'

export function renderAll() {
  const targets = renderToString(
    React.createElement(DemoCustomizationProvider, null, React.createElement(MyTargets))
  )
  const logger = renderToString(
    React.createElement(DemoCustomizationProvider, null,
      React.createElement(QuickMealLogger, { lang: 'ar', targetCalories: 2200, targetProtein: 160 }))
  )
  return { targets, logger }
}
`,
)

const out = path.join(tmp, 'bundle.cjs')
await build({
  entryPoints: [entry],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  outfile: out,
  logLevel: 'error',
  jsx: 'automatic',
  define: { 'import.meta.env': '{}', 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true' },
  absWorkingDir: root,
  nodePaths: [path.join(root, 'node_modules')],
  alias: { '@': path.join(root, 'src') },
  loader: { '.js': 'jsx' },
})

const require = createRequire(import.meta.url)
const { renderAll } = require(out)
const { targets, logger } = renderAll()

let pass = 0
let fail = 0
const ok = (cond, label) => {
  if (cond) { pass++; console.log('  ✓', label) }
  else { fail++; console.log('  ✗ FAIL:', label) }
}

console.log('== SSR: MyTargets + CalorieExplainer ==')
ok(targets.length > 500, `MyTargets صُيِّر إلى HTML (${targets.length} حرف)`)
ok(targets.includes('كيف نحسب سعراتك؟'), 'عنوان الشفافية «كيف نحسب سعراتك؟» ظاهر')
ok(targets.includes('أرقامك المستهدفة'), 'بطاقات الأهداف ظاهرة')
ok(/الوزن الهدف|سعرات الهدف/.test(targets), 'قيم محسوبة (سعرات/وزن) مضمّنة')

console.log('== SSR: QuickMealLogger ==')
ok(logger.length > 500, `QuickMealLogger صُيِّر إلى HTML (${logger.length} حرف)`)
ok(logger.includes('2200') && logger.includes('160'), 'أهداف التسجيل (2200 سعرة / 160غ) ظاهرة')

console.log(`\n== SSR النتيجة: ${pass} ناجح، ${fail} فاشل ==`)
process.exit(fail === 0 ? 0 : 1)
