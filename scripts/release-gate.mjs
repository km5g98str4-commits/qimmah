// بوابة الإصدار — نقطة تشغيل واحدة قبل أي إطلاق.
//
// تجمع ثلاث طبقات كانت متفرّقة في أوامر npm منفصلة:
//   ١) الأساس      : typecheck + lint + build (بناء واحد يعاد استخدامه لاحقًا)
//   ٢) الإثباتات   : test:gate — كل سكربتات الإثبات الوحدوية
//   ٣) الطبقة الحيّة: e2e onboarding + journey + settings-security في متصفّح حقيقي
//
// لماذا سكربت بدل سلسلة `&&` في package.json:
//   • السلسلة تتوقّف عند أوّل فشل فلا تعرف ما الذي كان سيمرّ — هنا نُكمل داخل
//     المجموعة الواحدة ونعرض تقريرًا كاملًا (يمكن إيقافه بـ --bail).
//   • نقيس زمن كل مرحلة، والزمن هو أوّل ما يتدهور في بوابة تكبر مع الوقت.
//   • البناء يُنفَّذ مرّة واحدة؛ الأوامر الثلاثة القديمة كانت تعيد البناء كلٌّ لنفسه.
//   • تُكتب نتيجة قابلة للقراءة آليًا في docs/testing/release-gate-latest.json.
//
// التشغيل:
//   npm run test:release-gate            # البوابة كاملة
//   npm run test:release-gate -- --fast  # يتخطّى طبقة المتصفّح (للتكرار السريع)
//   npm run test:release-gate -- --bail  # يتوقّف عند أوّل فشل

import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const FAST = args.includes('--fast')
const BAIL = args.includes('--bail')

/** المراحل بالترتيب: الأرخص أوّلًا كي يفشل الخطأ الواضح بسرعة. */
const STAGES = [
  {
    group: 'أساس',
    steps: [
      { name: 'typecheck', cmd: ['npm', 'run', 'typecheck'] },
      { name: 'lint', cmd: ['npm', 'run', 'lint'] },
      // بناء واحد للمستودع كلّه — تعتمد عليه طبقة المتصفّح أدناه (vite preview).
      { name: 'build', cmd: ['npm', 'run', 'build'] },
    ],
  },
  {
    group: 'إثباتات',
    steps: [{ name: 'test:gate (كل سكربتات الإثبات)', cmd: ['npm', 'run', 'test:gate'] }],
  },
  {
    group: 'متصفّح حيّ',
    browser: true,
    steps: [
      // تُستدعى السكربتات مباشرة لا عبر أوامر npm التي تعيد البناء من جديد.
      { name: 'e2e: onboarding', cmd: ['node', 'scripts/e2e-onboarding.mjs'] },
      { name: 'e2e: journey', cmd: ['node', 'scripts/e2e/journey.mjs'] },
      { name: 'e2e: settings-security', cmd: ['node', 'scripts/e2e/settings-import-security.mjs'] },
    ],
  },
]

const fmt = (ms) => (ms >= 60000 ? `${(ms / 60000).toFixed(1)}د` : `${(ms / 1000).toFixed(1)}ث`)

const results = []
let failed = 0
const startedAt = Date.now()

for (const stage of STAGES) {
  if (stage.browser && FAST) {
    console.log(`\n⏭  تخطّي «${stage.group}» (--fast)`)
    for (const step of stage.steps) results.push({ group: stage.group, name: step.name, status: 'skipped', ms: 0 })
    continue
  }

  console.log(`\n${'═'.repeat(64)}\n▶  ${stage.group}\n${'═'.repeat(64)}`)

  for (const step of stage.steps) {
    if (BAIL && failed > 0) {
      results.push({ group: stage.group, name: step.name, status: 'skipped', ms: 0 })
      continue
    }
    process.stdout.write(`\n── ${step.name}\n`)
    const t0 = Date.now()
    const run = spawnSync(step.cmd[0], step.cmd.slice(1), {
      stdio: 'inherit',
      cwd: ROOT,
      env: process.env,
    })
    const ms = Date.now() - t0
    const ok = run.status === 0
    if (!ok) failed += 1
    results.push({ group: stage.group, name: step.name, status: ok ? 'pass' : 'fail', ms, exitCode: run.status ?? -1 })
    console.log(`${ok ? '✅' : '❌'} ${step.name} — ${fmt(ms)}`)
  }
}

const totalMs = Date.now() - startedAt

// ── التقرير ──
console.log(`\n${'═'.repeat(64)}\n📋  بوابة الإصدار — النتيجة\n${'═'.repeat(64)}`)
let lastGroup = ''
for (const r of results) {
  if (r.group !== lastGroup) {
    console.log(`\n  ${r.group}`)
    lastGroup = r.group
  }
  const icon = r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⏭ '
  console.log(`   ${icon} ${r.name.padEnd(42)} ${r.status === 'skipped' ? '—' : fmt(r.ms)}`)
}

const passed = results.filter((r) => r.status === 'pass').length
const skipped = results.filter((r) => r.status === 'skipped').length
console.log(`\n  المجموع: ${passed} ناجحة · ${failed} فاشلة · ${skipped} متخطّاة`)
console.log(`  الزمن الكلّي: ${fmt(totalMs)}`)

const summary = {
  ok: failed === 0,
  startedAt: new Date(startedAt).toISOString(),
  totalMs,
  totalHuman: fmt(totalMs),
  mode: FAST ? 'fast' : 'full',
  counts: { passed, failed, skipped },
  steps: results.map((r) => ({ ...r, human: r.status === 'skipped' ? null : fmt(r.ms) })),
}

mkdirSync(resolve(ROOT, 'docs/testing'), { recursive: true })
writeFileSync(resolve(ROOT, 'docs/testing/release-gate-latest.json'), `${JSON.stringify(summary, null, 2)}\n`)

console.log(`\n${failed === 0 ? '✅ بوابة الإصدار خضراء' : `❌ بوابة الإصدار حمراء — ${failed} مرحلة فاشلة`}`)
console.log('   التقرير: docs/testing/release-gate-latest.json')
process.exit(failed === 0 ? 0 : 1)
