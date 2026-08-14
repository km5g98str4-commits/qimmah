// مُشغّل إثبات الرسم — يبني الإثبات ويشغّله، ويُخرج لقطات HTML قابلة للفتح.
// [QIMMAH-SOVEREIGN-PHASE-II-001] · AGENT-E.
//
// `--emit` يكتب `docs/proof/admin/admin-preview.html`: صفحة واحدة تجمع كل
// المشاهد بثلاثة عروض (١٢٨٠ · آيباد ٨٢٠ · جوّال ٣٩٠) وبنمط التطبيق الحقيقي
// المستخرج من `dist/`. بدونه لا يُكتب شيء ويُشغَّل الإثبات وحده.
//
// **لماذا نمط `dist/` لا نمط مكتوب باليد:** لقطة بنمط مختلف عن التطبيق تُري
// شيئًا لم يُبنَ. فإن غابت `dist/` تُكتب اللقطة **بلا نمط** ومع تنويه ظاهر،
// لا بنمط مُختلق يوهم بمطابقة.

import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const emit = process.argv.includes('--emit')

// نافذة وتخزين مُحاكيان: المزوّد يقرأ اللغة من التخزين عند الإقلاع.
const banner = `
const __store = new Map();
const __ls = {
  getItem: (k) => (__store.has(k) ? __store.get(k) : null),
  setItem: (k, v) => { __store.set(k, String(v)); },
  removeItem: (k) => { __store.delete(k); },
  clear: () => { __store.clear(); },
  key: (i) => Array.from(__store.keys())[i] ?? null,
  get length() { return __store.size; },
};
const __doc = {
  documentElement: { lang: '', dir: '', classList: { add() {}, remove() {}, toggle() {} }, style: { setProperty() {} } },
  addEventListener() {}, removeEventListener() {}, querySelector: () => null,
};
globalThis.localStorage = __ls;
globalThis.document = __doc;
globalThis.window = { localStorage: __ls, document: __doc, addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`

const out = await build({
  entryPoints: [resolve(root, 'scripts/admin-render-proof.tsx')],
  bundle: true,
  // **CJS لا ESM:** بناء `react-dom/server` لبيئة node يستدعي `require('stream')`
  // ديناميكيًا، وهو ما لا تدعمه وحدة ESM. وبصيغة CJS يعمل الاستدعاء أصلًا.
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: {
    'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: true }),
    'process.env.NODE_ENV': '"production"',
  },
  // **يُحزَم كل شيء بما فيه react.** استثناؤها كان يترك `require('react')` من
  // بناء lucide-react الـCJS بلا معالجة، فينهار الاستيراد في وحدة ESM.
  logLevel: 'warning',
})

// الحزمة مكتفية بذاتها (لا خارجيات)، فتُكتب في مجلّد مؤقّت خارج الشجرة.
const dir = mkdtempSync(join(tmpdir(), 'admin-render-'))
const file = join(dir, 'proof.cjs')
writeFileSync(file, out.outputFiles[0].text)
const mod = await import(pathToFileURL(file).href)

if (!emit) {
  console.log('  (بلا --emit: لم تُكتب لقطات)\n')
  process.exit(0)
}

// ─────────── استخراج نمط التطبيق الحقيقي من dist/ ───────────
let css = ''
let styleNote = ''
const assets = resolve(root, 'dist/assets')
if (existsSync(assets)) {
  const cssFiles = readdirSync(assets).filter((f) => f.endsWith('.css'))
  css = cssFiles.map((f) => readFileSync(join(assets, f), 'utf8')).join('\n')
}
if (!css) {
  styleNote = '<p style="background:#fee;color:#900;padding:12px;font:14px system-ui">⚠ لم تُوجد dist/assets/*.css — هذه اللقطة <b>بلا أنماط التطبيق</b>. شغّل npm run build ثم أعد التوليد.</p>'
}

const VIEWPORTS = [
  { id: 'desktop', label: 'سطح المكتب — 1280', width: 1280 },
  { id: 'ipad', label: 'آيباد — 820', width: 820 },
  { id: 'mobile', label: 'جوّال — 390', width: 390 },
]

/**
 * العروض الثلاثة تُطبَّق على المشاهد **الحسّاسة للتخطيط** فقط.
 * تكرار كل مشهد ثلاث مرّات كان يضخّم الملف إلى ١٫٢م.ب من ترميز مكرّر بلا فائدة
 * — الأرقام نفسها في ثلاثة عروض تُقرأ مرّة واحدة، أمّا الجدول وشريط البطاقات
 * فتخطيطهما هو ما يتغيّر فعلًا.
 */
const RESPONSIVE_SCENES = new Set(['today-ar', 'users-ar', 'denied-ar'])

const frames = mod.SNAPSHOTS.map((s) => {
  const views = (RESPONSIVE_SCENES.has(s.id) ? VIEWPORTS : VIEWPORTS.slice(0, 1)).map(
    (v) => `
      <section class="shot">
        <h3>${s.id} · ${v.label}</h3>
        <div class="frame" style="width:${v.width}px">
          <div dir="${s.lang === 'ar' ? 'rtl' : 'ltr'}" lang="${s.lang}">${s.html}</div>
        </div>
      </section>`,
  ).join('\n')
  return views
}).join('\n')

/**
 * تُكتب نسختان: داكنة وفاتحة.
 *
 * السبب بنيوي لا تجميلي: رموز الثيم في `dist` مُعرَّفة على **`body`** بمُحدِّد
 * `:root[data-theme=...] body`. فلا يمكن تلوين إطار داخل الصفحة بثيم مختلف عن
 * الصفحة، ولا يجوز نسخ قيم الرموز يدويًا هنا (نسخةٌ تشيخ وتناقض المصدر).
 * فالحلّ ملفّان، كلٌّ بـ`data-theme` على `<html>` — والرموز تأتي من `dist`
 * نفسها بلا لمس.
 */
function buildPage(theme) {
  const other = theme === 'dark' ? 'light' : 'dark'
  return `<!doctype html>
<html lang="ar" dir="rtl" data-theme="${theme}"><head><meta charset="utf-8">
<title>لقطات المركز التنفيذي (${theme}) — QIMMAH-SOVEREIGN-PHASE-II-001</title>
<style>${css}</style>
<style>
  /* هيكل اللقطة يستعمل رموز التطبيق نفسها — لا لون مكتوب باليد يخالف الثيم. */
  body { margin:0; padding:24px; }
  .harness-h1 { font-size:20px; color: rgb(var(--c-ink-900)); }
  .harness-note { font-size:13px; color: rgb(var(--c-ink-500)); }
  h3 { font-size:13px; margin:24px 0 6px; font-family: ui-monospace, monospace; color: rgb(var(--c-ink-500)); }
  .frame { border:1px solid rgb(var(--c-line)); border-radius:12px; overflow:hidden; max-width:100%; background: rgb(var(--c-page)); }
  .shot { margin-bottom:8px }
</style>
</head><body>
${styleNote}
<h1 class="harness-h1">لقطات المركز التنفيذي — ثيم ${theme === 'dark' ? 'داكن' : 'فاتح'} · رسم ساكن</h1>
<p class="harness-note">مولّدة بـ<code>node scripts/run-admin-render-proof.mjs --emit</code>. الأزرار غير تفاعلية: هذه لقطة خادم لا تطبيق. النسخة الأخرى: <a href="admin-preview-${other}.html">admin-preview-${other}.html</a></p>
${frames}
</body></html>`
}

const outDir = resolve(root, 'docs/proof/admin')
mkdirSync(outDir, { recursive: true })
let bytes = 0
for (const theme of ['dark', 'light']) {
  const page = buildPage(theme)
  bytes += page.length
  writeFileSync(join(outDir, `admin-preview-${theme}.html`), page)
}
console.log(
  `  \u2713 كُتبت اللقطات: docs/proof/admin/admin-preview-{dark,light}.html ` +
    `(${mod.SNAPSHOTS.length} مشهدًا · ${RESPONSIVE_SCENES.size} منها بثلاثة عروض · ${Math.round(bytes / 1024)}ك.ب)\n`,
)
