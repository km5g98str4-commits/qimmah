// مُشغّل إثبات المركز التنفيذي + **محاكاة الالتفاف**.
// [QIMMAH-SOVEREIGN-PHASE-II-001] · AGENT-E.
//
// شقّان:
//   ١) يبني `scripts/admin-dashboard-proof.ts` بـesbuild ويشغّله.
//   ٢) **يهاجم البوّابة**: يحقن في نسخ مؤقّتة من ملفات اللوحة ما يُفترض أن
//      يمنعه الإثبات، ويتأكّد أن كل حقنة **تسقط بفحص مسمّى**.
//      (الميثاق §4.2: «كل شدّ بوابة يُرفَق بمحاكاة التفافٍ تفشل بفحص مسمّى».)
//
// وطريقة الهجوم هنا **ملفّية لا نصّية**: تُكتب النسخة المصابة في شجرة مؤقّتة
// كاملة، ويُعاد تشغيل الإثبات عليها بجذر مختلف. فلو كان الفحص يقرأ نصًّا لا
// يقرأه المستخدم فعلًا، لما سقط.

import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const work = mkdtempSync(join(tmpdir(), 'admin-dash-'))

async function buildProof(outName) {
  const out = await build({
    entryPoints: [resolve(root, 'scripts/admin-dashboard-proof.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    alias: { '@': resolve(root, 'src') },
    define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
    logLevel: 'silent',
  })
  const file = join(work, `${outName}.mjs`)
  writeFileSync(file, out.outputFiles[0].text)
  return file
}

// ─────────────────────── ١) الإثبات على الشجرة الحقيقية ───────────────────────
const realProof = await buildProof('proof')
await import(pathToFileURL(realProof).href)

// ─────────────────────── ٢) محاكاة الالتفاف ───────────────────────
console.log('محاكاة الالتفاف — حقن ما يجب أن يُكشف')

/**
 * الفحوص البنيوية في الإثبات تقرأ الملفات من `process.cwd()`. فلبناء هجوم
 * حقيقي: تُنسخ الشجرة إلى مجلّد مؤقّت، ويُصاب ملف واحد، ثم يُشغَّل الإثبات
 * **بجذر المجلّد المصاب** في عملية فرعية.
 */
const SRC_DIRS = ['src', 'docs', 'scripts']

function makeInfectedTree(name) {
  const dir = join(work, `tree-${name}`)
  for (const d of SRC_DIRS) cpSync(join(root, d), join(dir, d), { recursive: true })
  // البوابة تقرأ `src/App.tsx` و`src/lib/appRoutes.ts` أيضًا — منسوخة ضمن `src`.
  return dir
}

const ATTACKS = [
  {
    name: 'ترقية مقياس يقرأ جدولًا إلى AVAILABLE_NOW',
    file: 'src/admin/contract/metrics.ts',
    patch: (s) =>
      s.replace(
        `    id: 'users.total',
    labelKey: 'users.total',
    group: 'users',
    source: 'public.profiles → count(*)',
    aggregation: 'count',
    privacyClass: 'aggregate',
    requiredRole: 'founder',
    refresh: '5m',
    owner: 'backend',
    availability: 'NEEDS_BACKEND',
    backendGap: 'endpoint-missing',`,
        `    id: 'users.total',
    labelKey: 'users.total',
    group: 'users',
    source: 'public.profiles → count(*)',
    aggregation: 'count',
    privacyClass: 'aggregate',
    requiredRole: 'founder',
    refresh: '5m',
    owner: 'backend',
    availability: 'AVAILABLE_NOW',`,
      ),
  },
  {
    name: 'تحويل الغياب إلى صفر في بطاقة المقياس',
    file: 'src/admin/ui/MetricCard.tsx',
    patch: (s) => s.replace('{format ? format(value.value) : String(value.value)}', '{format ? format(value.value) : String(value.value ?? 0)}'),
  },
  {
    name: 'استيراد التجهيزات في الطريق الإنتاجي',
    file: 'src/admin/contract/source.ts',
    patch: (s) => s.replace("import { unavailable } from './types'", "import { unavailable } from './types'\nimport { snapshotReady } from './fixtures'\nvoid snapshotReady"),
  },
  {
    name: 'صنف اتجاهي ثابت في الواجهة (كسر RTL)',
    file: 'src/admin/ui/AttentionPanel.tsx',
    patch: (s) => s.replace("'flex items-start gap-3 rounded-xl border p-3 text-start'", "'flex items-start gap-3 rounded-xl border p-3 text-left ml-4'"),
  },
  {
    name: 'إسقاط البنود غير القابلة للكشف من الطابور',
    file: 'src/admin/model/attention.ts',
    patch: (s) => s.replace('return [...detected, ...blind]', 'return [...detected]'),
  },
  {
    name: 'تطبيق مصفاة معطّلة فتعيد قائمة فارغة تبدو جوابًا',
    file: 'src/admin/model/filters.ts',
    patch: (s) => s.replace('  if (!isFilterApplicable(id)) return rows', '  if (!isFilterApplicable(id)) return rows.filter(filterPredicate(id, now))'),
  },
  {
    name: 'حقل صحّي حسّاس في صفّ الجدول',
    file: 'src/admin/contract/types.ts',
    patch: (s) => s.replace('  readonly onboarding: OnboardingView\n}', '  readonly onboarding: OnboardingView\n  readonly injuries: string[]\n}'),
  },
  {
    name: 'سجلّ طرفية في كود اللوحة',
    file: 'src/admin/model/attention.ts',
    patch: (s) => s.replace('export function detectedCount', 'export function logIt(x: unknown) { console.log(x) }\nexport function detectedCount'),
  },
  {
    name: 'تسمية رقم الدخول «نشط»',
    file: 'src/i18n/dict/admin.ts',
    patch: (s) => s.replace("'activity.signedIn7d': 'سجّلوا دخول — ٧ أيام'", "'activity.signedIn7d': 'المستخدمون النشطون — ٧ أيام'"),
  },
  {
    name: 'كتابة السعر في القاموس',
    file: 'src/i18n/dict/admin.ts',
    patch: (s) => s.replace("      premium: 'Premium',", "      premium: 'Premium 19.99',"),
  },
  {
    name: 'إسقاط حارس الدور من القشرة',
    file: 'src/admin/ui/AdminShell.tsx',
    patch: (s) => s.replace('  if (!isAdmin(decision)) return <AdminDenied decision={decision} />', '  void isAdmin'),
  },
  {
    name: 'اسم مفتاح مميّز في كود اللوحة',
    file: 'src/admin/contract/source.ts',
    patch: (s) => s.replace('export const WIRING_STATE', 'export const supabaseAdmin = null\nexport const WIRING_STATE'),
  },
  {
    // انحراف عدد الوثيقة عن السجلّ — وقد حدث فعلًا قبل ربطهما.
    name: 'عدد في §10 يخالف السجلّ',
    file: 'docs/product/EXECUTIVE-DASHBOARD-DATA-CONTRACT.md',
    patch: (s) => s.replace('| `AVAILABLE_NOW` | **٤** —', '| `AVAILABLE_NOW` | **٦** —'),
  },
  {
    name: 'حذف بند من السجلّ بلا تحديث الوثيقة',
    file: 'src/admin/contract/metrics.ts',
    patch: (s) =>
      s.replace(
        `  {
    id: 'users.verified',`,
        `  {
    id: 'users.verifiedRENAMED',`,
      ),
  },
]

const { spawnSync } = await import('node:child_process')
let killed = 0

for (const a of ATTACKS) {
  const dir = makeInfectedTree(String(killed))
  const target = join(dir, a.file)
  const original = readFileSync(target, 'utf8')
  const patched = a.patch(original)
  if (patched === original) {
    throw new Error(`FAIL: محاكاة «${a.name}» لم تغيّر الملف — نصّها البديل لم يعد يطابق ${a.file}`)
  }
  writeFileSync(target, patched)

  // يُشغَّل الإثبات المبنيّ من الشجرة **السليمة** لكن بجذر عمل مصاب: الفحوص
  // البنيوية تقرأ الملفات المصابة، والفحوص السلوكية تحتاج بناءً من الشجرة
  // المصابة — فيُبنى منها أيضًا.
  const infectedBuild = await build({
    entryPoints: [join(dir, 'scripts/admin-dashboard-proof.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    alias: { '@': join(dir, 'src') },
    define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
    logLevel: 'silent',
  }).catch((e) => ({ error: e }))

  let failedNamed = false
  let detail = ''
  if ('error' in infectedBuild) {
    // فشل ترجمة **ليس** إثباتًا مقبولًا (§4.2: «سقوط غير مسمّى ليس إثباتًا»).
    throw new Error(`FAIL: محاكاة «${a.name}» أسقطت الترجمة بدل أن تُكشف بفحص مسمّى`)
  }
  const proofFile = join(dir, 'infected-proof.mjs')
  writeFileSync(proofFile, infectedBuild.outputFiles[0].text)
  const run = spawnSync(process.execPath, [proofFile], { cwd: dir, encoding: 'utf8' })
  const output = `${run.stdout}${run.stderr}`
  if (run.status !== 0 && /FAIL: /.test(output)) {
    failedNamed = true
    // يُلتقط سطر `Error: FAIL: …` تحديدًا. المطابقة العامّة كانت تلتقط أوّل
    // ظهور — وهو صدى الشيفرة في أثر المكدّس — فيظهر اسم الفحص «${label}».
    detail = (output.match(/Error: FAIL: (.+)/) ?? output.match(/FAIL: (.+)/) ?? [])[1] ?? ''
  }

  if (!failedNamed) {
    throw new Error(`FAIL: محاكاة «${a.name}» نجت — البوابة رخوة ولا تكشفها`)
  }
  killed += 1
  console.log(`  ✓ كُشفت محاكاة «${a.name}» — سقطت عند: ${detail.slice(0, 90)}`)
  rmSync(dir, { recursive: true, force: true })
}

console.log(`\n✅ إثبات اللوحة تام — ${killed} محاكاة التفاف مكشوفة\n`)
