// ============================================================================
// test:attack-gates — مهاجمة البوّابات نفسها (الميثاق §4.2).
// ============================================================================
// [OVERNIGHT-THREAT] · AGENT-F.
//
// «بوّابة يمكن إرضاؤها بنقض مقصدها المُعلَن بوّابة رخوة.» فهذا الملف لا يفحص
// المنتج بل **يفحص الحرّاس**: يقيس نطاقهم، ويبني التفافات، ويثبت أيّها يمرّ.
//
// ═══ قاعدة القراءة ═══
//   ✓ = خاصية حارس متينة، مثبتة.
//   ⚔️ G-n = **حارس رخو أو فجوة تغطية**، مثبتة بالتنفيذ لا بالقراءة. التأكيد
//     يصف الرخاوة كما هي اليوم — فإن شُدَّت الحارس سقط هذا السطر عمدًا، وذلك
//     هو الإشعار المقصود.
//
// **لا يُضعِف هذا الملف أي حارس قائم ولا يعدّله.** يبني نسخًا مؤقّتة في مجلد
// مؤقّت ويهاجمها هناك.
// ============================================================================
import { build } from 'esbuild'
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const dir = mkdtempSync(join(tmpdir(), 'qimmah-gate-attack-'))
const read = (p) => readFileSync(resolve(root, p), 'utf8')
const results = []
const check = (name, pass, detail = '') => {
  results.push({ name, pass })
  console.log(`  ${pass ? '✓' : '✗ FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  return pass
}
const finding = (id, name, pass, detail = '') => check(`⚔️ ${id} ${name}`, pass, detail)

console.log('\n⚔️  هجوم على البوّابات — من يحرس الحرّاس')

const pkg = JSON.parse(read('package.json'))
const gateSteps = pkg.scripts['test:gate'].split('&&').map((s) => s.trim().replace(/^npm run /, ''))
const gateSet = new Set(gateSteps)
const ci = read('.github/workflows/ci.yml')

// ══════════════════════ ① تغطية البوّابة ═══════════════════════════════════
console.log('\n① ما الذي تشغّله البوّابة فعلًا')
check(`test:gate يشغّل ${gateSteps.length} خطوة`, gateSteps.length > 100)

// أ) حارس الحزمة المشحونة **خارج** البوّابة وخارج CI
finding('G-1 [P2]', 'test:bundle-safety غير مذكور في test:gate — ضمان «لا بذرة اختبار في dist» غير مطبَّق على أي دفعة',
  !gateSet.has('test:bundle-safety') && typeof pkg.scripts['test:bundle-safety'] === 'string')
finding('G-1b [P2]', 'ولا في سير CI — فلا مكان يشغّله تلقائيًا إطلاقًا',
  !ci.includes('bundle-safety') && !ci.includes('production-bundle-safety'))
check('التخفيف المطبَّق هنا: test:attack-bundle داخل البوّابة ويغطّي البذور **والأسرار**',
  gateSet.has('test:attack-bundle'))

// ب) أطقم الهجوم الستّة داخل البوّابة — حارس على نفسي
for (const k of ['test:attack-forgery', 'test:attack-commerce', 'test:attack-webhook',
                 'test:attack-admin', 'test:attack-bundle', 'test:attack-gates']) {
  check(`${k} داخل test:gate`, gateSet.has(k))
  check(`  ومُعرَّف في package.json`, typeof pkg.scripts[k] === 'string')
}
// وترتيبها في الذيل كما يوجب الأمر
const firstAttack = gateSteps.findIndex((s) => s.startsWith('test:attack-'))
check('أطقم الهجوم مُسلسَلة في **ذيل** البوّابة', firstAttack >= gateSteps.length - 6)

// ج) الأطقم التي تحتاج متصفّحًا خارج البوّابة عمدًا (§4.0) — تُسمّى لا تُنسى
const browserOutside = ['test:e2e:preview-gate', 'test:e2e:onboarding'].filter((k) => !gateSet.has(k))
check(`أطقم المتصفّح خارج البوّابة عمدًا وتُقرأ من CI (${browserOutside.join(', ')})`,
  browserOutside.length === 2 && ci.includes('test:e2e:onboarding'))
finding('G-2 [P2]', 'لكن test:e2e:preview-gate — السلوك الحيّ للبوّابة المدفوعة — ليس في CI أيضًا: لا بوّابة ولا سير يشغّله',
  !ci.includes('preview-gate'))

// ══════════════════ ② نطاق test:entitlements — الرخاوة الكبرى ══════════════
console.log('\n② نطاق test:entitlements مقابل الهجرات المنشورة')
const migrations = readdirSync(resolve(root, 'supabase/migrations')).filter((f) => f.endsWith('.sql')).sort()
const entProof = read('scripts/db/entitlements-proof.mjs')
// الهجرات التي **تُطبَّق فعلًا** في صندوق الإثبات الرئيسي: كل ثابت يُمرَّر لـmig()
const appliedConsts = new Set([...entProof.matchAll(/await db\.exec\(mig\((\w+)\)\)/g)].map((m) => m[1]))
const constFiles = Object.fromEntries([...entProof.matchAll(/^const (\w+) = '([^']+\.sql)'/gm)].map((m) => [m[1], m[2]]))
const appliedFiles = new Set([...appliedConsts].map((c) => constFiles[c]).filter(Boolean))
const commerceMigrations = migrations.filter((f) => /entitlement|revocation|code_grant|public_execute|salla/.test(f))
const missed = commerceMigrations.filter((f) => !appliedFiles.has(f))
finding('G-3 [P1]',
  `entitlements-proof يطبّق ${appliedFiles.size} هجرة **بالاسم** ويترك خارج نطاقه: ${missed.join(', ') || '—'} — فيثبت خصائص مخطّط لا يوجد في أي بيئة منشورة`,
  missed.includes('20260812120001_salla_webhook_ingest.sql'))
check('والدليل أن طبقة سلة تعيد تعريف دالة يفحصها الإثبات: admin_grant_premium',
  read('supabase/migrations/20260812120001_salla_webhook_ingest.sql').includes('create or replace function public.admin_grant_premium')
  && entProof.includes('admin_grant_premium'))
check('التخفيف المطبَّق هنا: test:attack-commerce يطبّق السلسلة **كاملة** عبر createSandbox()',
  read('scripts/attack/commerce-sql-attack.mjs').includes('createSandbox()')
  && read('scripts/attack/commerce-sql-attack.mjs').includes("applied.includes('20260812120001_salla_webhook_ingest.sql')"))

// ══════════════════ ③ تصنيف الجداول في privileges-proof ════════════════════
console.log('\n③ اكتمال تصنيف الجداول')
{
  const priv = read('scripts/db/privileges-proof.mjs')
  const listOf = (name) => {
    const m = priv.match(new RegExp(`${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`))
    return m ? [...m[1].matchAll(/'([a-z_0-9]+)'/g)].map((x) => x[1]) : []
  }
  const classified = new Set([...listOf('SYNC_TABLES'), ...listOf('READ_ONLY_TABLES'), ...listOf('INVISIBLE_TABLES')])
  const { createSandbox, publicTables } = await import('../db/lib/supabase-sandbox.mjs')
  const { db, failed } = await createSandbox()
  if (failed.length) throw new Error(`FAIL: الصندوق لم يُبنَ — ${failed.map((f) => f.file).join(',')}`)
  const tables = (await publicTables(db)).map((t) => t.table_name)
  const unclassified = tables.filter((t) => !classified.has(t))
  finding('G-4 [P2]',
    `privileges-proof يصنّف ${classified.size} جدولًا من ${tables.length}؛ غير مصنَّف: ${unclassified.join(', ') || '—'} — ولا تأكيد «كل جدول يجب أن يُصنَّف»، فجدول قادم بمنح SELECT لـauthenticated يمرّ`,
    unclassified.includes('salla_webhook_events'))
  check('والفحوص المعمَّمة (TRUNCATE/REFERENCES/TRIGGER وanon) تغطّي الجداول كلّها — فالفجوة في **الشكل** لا في المنع',
    priv.includes('for (const t of tables)') && priv.includes('FORBIDDEN_FOR_CLIENTS'))
  await db.close()
}

// ══════════════════ ④ بطارية منع المسؤول — الأسباب غير محروسة ══════════════
console.log('\n④ مهاجمة بطارية test:admin-access-denial')
{
  const runner = read('scripts/run-admin-access-denial-proof.mjs')
  const batteryBlock = runner.slice(runner.indexOf('function battery('), runner.indexOf('const MUTANTS'))
  finding('G-5 [P2]',
    'بطارية الطفرات تؤكّد !isAdmin وحدها ولا تؤكّد **اسم السبب** — فطفرةٌ تُبقي المنع وتُبدّل التسمية تنجو منها',
    !/\.reason\s*===/.test(batteryBlock) && /isAdmin\(/.test(batteryBlock))

  // البرهان بالتنفيذ: طفرة تُعيد no-role-claim مكان forged-claim
  const guardSrc = read('src/admin/auth/adminRole.ts')
  const mutated = guardSrc.replace(
    "    return { role: 'denied', reason: 'forged-claim' }",
    "    return { role: 'denied', reason: 'no-role-claim' }",
  )
  if (mutated === guardSrc) throw new Error('FAIL: نصّ الطفرة لم يعد يطابق الحارس — يُحدَّث')
  const f = join(dir, 'mutant-reason.ts')
  writeFileSync(f, mutated)
  const out = await build({
    entryPoints: [f], bundle: true, format: 'esm', platform: 'node', write: false,
    alias: { '@': resolve(root, 'src') },
    define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
    logLevel: 'silent',
  })
  const mf = join(dir, 'mutant-reason.mjs')
  writeFileSync(mf, out.outputFiles[0].text)
  const m = await import(pathToFileURL(mf).href)
  const CLAIM = m.ADMIN_ROLE_CLAIM
  // نفس ادّعاءات البطارية حرفيًا (isAdmin وحدها)
  const batteryPasses = [
    !m.isAdmin(m.resolveAdminRole(null)),
    !m.isAdmin(m.resolveAdminRole({ app_metadata: { provider: 'email' } })),
    !m.isAdmin(m.resolveAdminRole({ user_metadata: { [CLAIM]: 'founder' } })),
    !m.isAdmin(m.resolveAdminRole({ app_metadata: {}, user_metadata: { [CLAIM]: 'founder' } })),
    !m.isAdmin(m.resolveAdminRole({ app_metadata: { [CLAIM]: 'admin' } })),
    m.isAdmin(m.resolveAdminRole({ app_metadata: { [CLAIM]: 'founder' } })),
  ].every(Boolean)
  finding('G-5b [P2]',
    'وبرهانه بالتنفيذ: طفرة «forged-claim ⇒ no-role-claim» تنجو من البطارية كاملةً — المحاولة تُمنع لكنها تصير **غير مرئية**',
    batteryPasses === true)
  check('والملف .ts الأصلي يحرس التسمية لحالة واحدة — فالفجوة في بطارية الطفرات لا في الإثبات',
    read('scripts/admin-access-denial-proof.ts').includes("=== 'forged-claim'"))

  // شكل غير مُغطًّى: app_metadata يحمل المفتاح بقيمة null + ادّعاء مزوَّر
  const real = await import(pathToFileURL(await (async () => {
    const o = await build({
      entryPoints: [resolve(root, 'src/admin/auth/adminRole.ts')], bundle: true, format: 'esm',
      platform: 'node', write: false, alias: { '@': resolve(root, 'src') },
      define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) }, logLevel: 'silent',
    })
    const p2 = join(dir, 'real-guard.mjs'); writeFileSync(p2, o.outputFiles[0].text); return p2
  })()).href)
  const nulled = real.resolveAdminRole({ app_metadata: { [CLAIM]: null }, user_metadata: { [CLAIM]: 'founder' } })
  finding('G-5c [P3]',
    `ادّعاء مزوَّر مع app_metadata.${CLAIM}=null يُمنع لكن باسم «${nulled.reason}» لا «forged-claim» — المنع سليم والتسمية تضيع`,
    real.isAdmin(nulled) === false && nulled.reason === 'no-role-claim')
}

// ══════════════════ ⑤ إثبات بوّابة الوصول — موضع الحارس ════════════════════
console.log('\n⑤ مهاجمة test:access-gate')
{
  const gp = read('scripts/run-access-gate-proof.mjs')
  check('يستخرج جسم الدالة بحدوده (لا includes متفرّقة على الملف)', gp.includes('function functionBody(') && gp.includes('depth'))
  check('ويحمل محاكاة التفاف: حارس خارج الجسم لا يُرضي الفحص', gp.includes('حارس خارج جسم الدالة لا يُرضي الفحص'))
  // الرخاوة: `body.includes("assertPaid('x')")` لا يقول **أين** في الجسم.
  const decoyAfterWrite = `
  const day = loadNutritionDay()
  const next = persist({ ...day, foods: [...day.foods, food] })
  assertPaid('nutrition.addFood')
  return next
`
  finding('G-6 [P3]',
    'الفحص يقبل assertPaid **بعد** الكتابة: نفس التأكيد يمرّ على جسم يكتب أولًا ثم يحرس',
    decoyAfterWrite.includes("assertPaid('nutrition.addFood')"))
  // ومع ذلك: الكود الحقيقي يحرس في أول سطر — يُثبَت هنا صراحةً بدل الاتّكال
  const realWriters = [
    ['src/lib/nutritionV2Model.ts', 'addFoodToDay', 'nutrition.addFood'],
    ['src/lib/nutritionV2Model.ts', 'addWaterToDay', 'nutrition.water'],
    ['src/lib/measurementLog.ts', 'addLog', 'progress.logMeasurement'],
    ['src/lib/finishWorkout.ts', 'commitFinishedSession', 'workout.finish'],
    ['src/lib/activeWorkout.ts', 'saveActiveWorkout', 'workout.logSet'],
    ['src/lib/recovery.ts', 'saveRecoveryEntry', 'recovery.log'],
    ['src/lib/recoveryEngine.ts', 'saveRecoveryEngineEntry', 'recovery.log'],
  ]
  const late = []
  for (const [file, fn, action] of realWriters) {
    const src = read(file).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ')
    const start = src.indexOf(`function ${fn}(`)
    if (start < 0) throw new Error(`FAIL: ${fn} غير موجودة في ${file}`)
    const open = src.indexOf('{', src.indexOf(')', start))
    const head = src.slice(open + 1, open + 400)
    const guardAt = head.indexOf(`assertPaid('${action}')`)
    const firstStmt = head.split('\n').map((l) => l.trim()).filter(Boolean)[0] ?? ''
    if (guardAt < 0 || !firstStmt.startsWith('assertPaid(')) late.push(`${fn}:${firstStmt.slice(0, 40)}`)
  }
  check(`التشديد المطبَّق هنا: الحارس **أول عبارة** في كل كاتب من السبعة`, late.length === 0, late.join(' | '))
}

// ══════════════════ ⑥ إثبات واجهة التفعيل — includes على الملف ═════════════
console.log('\n⑥ مهاجمة test:activation-ui')
{
  const ui = read('scripts/run-activation-ui-proof.mjs')
  const decoy = `
    <div role="dialog"></div>
    <span aria-modal="true"></span>
    <p aria-labelledby="premium-gate-title"></p>
    <button class="h-11 w-11"></button>
    <a class="min-h-[48px]"></a>
    <i class="min-h-[44px]"></i><i class="min-h-[44px]"></i>
    <a href={product.checkoutUrl} target="_blank" rel="noopener noreferrer" />
  `
  const satisfied = decoy.includes('role="dialog"') && decoy.includes('aria-modal="true"')
    && decoy.includes('aria-labelledby="premium-gate-title"') && decoy.includes('h-11 w-11')
    && decoy.includes('min-h-[48px]') && (decoy.match(/min-h-\[44px\]/g) ?? []).length >= 2
  finding('G-7 [P3]',
    'خصائص الحوار تُفحص بـincludes على **الملف كلّه**: عناصر متفرّقة لا علاقة لها بالحوار تُرضي الفحص كاملًا',
    satisfied === true && ui.includes("gate.includes('role=\"dialog\"')"))
  check('والحوار الحقيقي يحمل الخصائص الثلاث على **نفس العنصر**',
    /role="dialog"[\s\S]{0,160}aria-modal="true"[\s\S]{0,160}aria-labelledby="premium-gate-title"/.test(read('src/components/PremiumGate.tsx')))
}

// ══════════════════ ⑦ مولّد الأكواد — غيابه يحكم الإنتروبيا ════════════════
console.log('\n⑦ توليد أكواد الوصول')
{
  const roots = ['src', 'scripts', 'supabase', 'docs']
  const files = []
  const walk = (d) => {
    if (!existsSync(d)) return
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git') continue
      const p = join(d, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.(ts|tsx|mjs|js|sql)$/.test(e.name)) files.push(p)
    }
  }
  for (const r of roots) walk(resolve(root, r))
  const generators = files.filter((f) => {
    const t = readFileSync(f, 'utf8')
    return /(gen_random_bytes|crypto\.randomUUID|randomBytes|crypto\.getRandomValues)[\s\S]{0,400}(access_?code|ACCESS_?CODE)/i.test(t)
      || /function\s+\w*[Gg]enerate\w*(Access)?Code/.test(t)
  })
  finding('G-8 [P2]',
    `لا مولّد أكواد آليّ في المستودع (${files.length} ملفًا مُسِحت) — العقد يفرض الشكل، والعشوائية متروكة لمن يكتب الكود يدويًا`,
    generators.length === 0, generators.join(', '))
  check('والعقد نفسه يفرض ≥١٠ رموزًا من ٣٢ — سقف ٥٠ بتًا حين تكون العشوائية تامّة',
    read('supabase/migrations/20260809120004_entitlement_security_remediation.sql').includes('char_length(trimmed) < 10'))
}

// ══════════════════ ⑧ صندوق الهجرات لا يبتلع فشلًا ═════════════════════════
console.log('\n⑧ صندوق الهجرات')
{
  const sandbox = read('scripts/db/lib/supabase-sandbox.mjs')
  check('createSandbox يجمع الفشل في مصفوفة بدل الرمي — فالمستدعي **يجب** أن يفحصها', sandbox.includes('failed.push('))
  for (const [f, label] of [
    ['scripts/db/privileges-proof.mjs', 'privileges-proof'],
    ['scripts/db/salla-webhook-proof.mjs', 'salla-webhook-proof'],
    ['scripts/attack/commerce-sql-attack.mjs', 'commerce-sql-attack (هذه الموجة)'],
    ['scripts/attack/gate-integrity-attack.mjs', 'gate-integrity-attack (هذه الموجة)'],
  ]) check(`${label} يفحص failed بعد createSandbox`, /failed\.length/.test(read(f)))
}

const bad = results.filter((r) => !r.pass)
const found = results.filter((r) => r.name.startsWith('⚔️') && r.pass)
console.log(`\n${bad.length === 0 ? '🎉' : '⛔'} ${results.length - bad.length} نجحت / ${bad.length} فشلت`)
console.log(`   ⚔️ ${found.length} حارسًا رخوًا أو فجوة تغطية — تفصيلها في docs/security/COMMERCE-ADMIN-THREAT-MODEL.md\n`)
if (bad.length) { bad.forEach((f) => console.log(`   ✗ ${f.name}`)); process.exit(1) }
