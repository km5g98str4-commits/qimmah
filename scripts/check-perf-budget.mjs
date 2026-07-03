#!/usr/bin/env node
// بوابة ميزانية الأداء (P12) — تفشل إن تجاوزت أحجام gzip حدودها.
//
// تُشغَّل بعد `npm run build`:  npm run perf:budget
// الحدود مقصودة كسقف تراجع (regression ceiling) لا كهدف — عدّلها بوعي فقط
// عند إضافة ميزة تبرّر الزيادة، واذكر السبب في رسالة الـ commit.

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'

const DIST = new URL('../dist', import.meta.url).pathname
const ASSETS = join(DIST, 'assets')

// —— الميزانيات (bytes، بعد gzip) ——
const BUDGETS = [
  // حزمة الدخول (entry): كانت 137KB قبل P12؛ الحدّ يمنع العودة للوراء.
  { label: 'entry (index-*.js المُشار إليه من index.html)', kind: 'entry', maxGzip: 80_000 },
  // إجمالي JS المُحمَّل عند الإقلاع: entry + vendor-react + vendor-icons (modulepreload).
  { label: 'boot JS (entry + modulepreload)', kind: 'boot', maxGzip: 140_000 },
  // أكبر حزمة كسولة مفردة (ScanFoodPanel حاليًا — مكتبة الباركود).
  { label: 'أكبر حزمة كسولة', kind: 'largest-lazy', maxGzip: 130_000 },
]

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('✗ dist/index.html غير موجود — شغّل npm run build أولًا.')
  process.exit(1)
}

const html = readFileSync(join(DIST, 'index.html'), 'utf-8')
const entryName = html.match(/assets\/(index-[\w-]+\.js)/)?.[1]
const preloads = [...html.matchAll(/rel="modulepreload"[^>]*href="\/assets\/([\w.-]+\.js)"/g)].map((m) => m[1])

const gzipSize = (file) => gzipSync(readFileSync(join(ASSETS, file))).length
const jsFiles = readdirSync(ASSETS).filter((f) => f.endsWith('.js'))

const entryGzip = entryName ? gzipSize(entryName) : Infinity
const bootFiles = [entryName, ...preloads].filter(Boolean)
const bootGzip = bootFiles.reduce((sum, f) => sum + gzipSize(f), 0)
const lazySizes = jsFiles
  .filter((f) => !bootFiles.includes(f))
  .map((f) => ({ f, gz: gzipSize(f) }))
  .sort((a, b) => b.gz - a.gz)
const largestLazy = lazySizes[0] ?? { f: '(لا شيء)', gz: 0 }

const kb = (n) => `${(n / 1000).toFixed(1)}KB`
let failed = false
for (const b of BUDGETS) {
  const actual = b.kind === 'entry' ? entryGzip : b.kind === 'boot' ? bootGzip : largestLazy.gz
  const detail =
    b.kind === 'entry' ? entryName : b.kind === 'boot' ? bootFiles.join(' + ') : largestLazy.f
  const ok = actual <= b.maxGzip
  if (!ok) failed = true
  console.log(`${ok ? '✓' : '✗'} ${b.label}: ${kb(actual)} (الحد ${kb(b.maxGzip)}) — ${detail}`)
}

process.exit(failed ? 1 : 0)
