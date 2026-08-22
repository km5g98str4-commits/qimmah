// يجمع إثبات الأوسمة (TS) عبر esbuild مع حلّ الاسم المستعار @/، ويشغّله فوق
// localStorage مُحاكى في Node. لا يلمس التطبيق — أداة إثبات فقط.

import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// shim: window.localStorage + performance، تُحقن قبل كود الحزمة.
const banner = `
const __store = new Map();
const __ls = {
  getItem: (k) => (__store.has(k) ? __store.get(k) : null),
  setItem: (k, v) => { __store.set(k, String(v)); },
  removeItem: (k) => { __store.delete(k); },
  clear: () => { __store.clear(); },
};
globalThis.localStorage = __ls;
globalThis.window = {
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true }, localStorage: __ls };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`

const result = await build({
  entryPoints: [resolve(root, 'scripts/achievements-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  // بدون هذا يفشل التجميع وقت التشغيل: المحرّك يستورد سلسلةً تصل إلى syncQueue
  // الذي يقرأ import.meta.env.VITE_SYNC_ENABLED، وهي غير معرّفة خارج vite.
  // نفس النمط المستعمل في run-data-safety-proof.mjs.
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false, VITE_SYNC_ENABLED: '' }) },
  logLevel: 'warning',
})

const out = result.outputFiles[0].text
const dir = mkdtempSync(join(tmpdir(), 'ach-proof-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, out)
// ─────────────────────────────────────────────────────────────────────────────
// فحص التوصيل (RC v1.2.0) — المحرّك أعلاه سليم، لكنه كان معزولًا عن التطبيق.
//
// بعد انتقال الشاشات إلى V2 صارت DashboardView/WorkoutView محوّلات من ثلاثة أسطر،
// وسقط آخر استدعاء لـ evaluateAchievements بمدخلات حقيقية. بقي مسار وحيد داخل
// registerWorkoutPRs يستدعيه بلا مدخلات وخلف حارس `prs.length === 0`، فصارت أوسمة
// البروتين الأربعة غير قابلة للفتح إطلاقًا (تشترط proteinTarget > 0). الاختبارات
// أعلاه تستدعي المحرّك مباشرةً فما كشفت العزلة — لذلك يوجد هذا الفحص.
// ─────────────────────────────────────────────────────────────────────────────
const { readFileSync: readSrc } = await import('node:fs')
const src = (p) => readSrc(resolve(root, p), 'utf8')
let wired = 0
const wireCheck = (label, cond) => {
  if (!cond) { console.error(`\n❌ FAIL (توصيل): ${label}`); process.exit(1) }
  wired++
  console.log(`  ✓ ${label}`)
}

console.log('\n═══ 8) توصيل المحرّك بالتطبيق (لا يكفي أن يكون سليمًا معزولًا) ═══')

const hook = src('src/features/achievements/useAchievements.ts')
wireCheck('useAchievements يصدّر هوكًا بلا واجهة للتقييم', /export function useAchievementsEngine\(\): void/.test(hook))
wireCheck(
  'الهوك يمرّر المدخلات الحقيقية الثلاثة',
  /evaluateAchievements\(\{ proteinToday, proteinTarget, daysPerWeek \}\)/.test(hook),
)

const today = src('src/views/TodayV2.tsx')
wireCheck('الرئيسية (TodayV2) تستورد الهوك', /import \{ useAchievementsEngine \}/.test(today))
wireCheck('الرئيسية تركّب الهوك فعليًا', /^\s*useAchievementsEngine\(\)/m.test(today))

// السطح المركَّب عليه يجب أن يكون حيًّا فعلًا — لا مكوّنًا يتيمًا مثل AchievementsCard.
const dashboard = src('src/views/DashboardView.tsx')
wireCheck('TodayV2 هو ما تعرضه DashboardView (سطح حيّ)', /TodayV2/.test(dashboard))

console.log(`\n✅ التوصيل سليم — ${wired} فحوص.`)


await import(pathToFileURL(file).href)
