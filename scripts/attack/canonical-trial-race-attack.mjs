#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// [RED-TEAM] هجوم التزامن على حارس البصمة القانونية للتجربة (F-4 TOCTOU)
// ═══════════════════════════════════════════════════════════════════════════
// **عين طازجة لم تكتب الميزة.** يهاجم الادّعاء «التجربة مرّة واحدة لكل صندوق
// بريد» تحت **تزامنٍ حقيقي** — وهو ما لا تُثبته PGlite (اتصال واحد). يقف عنقود
// Postgres حقيقيًّا عبر scripts/db/lib/pg-staging.mjs ويُطلق نداءين متزامنين.
//
// يفشل قبل هجرة 20260827120001 (كان الصندوق الواحد ينال تجربتين في سباقٍ)،
// وينجح بعدها (قيد الفرادة الجزئي يحوّل الفحص غير القافل إلى قفل إدراج).
//
// التخطّي معلَن (لا نجاح صامت): بلا عنقود على QIMMAH_PG_URL يُعلَن السبب ويخرج 0.
// ═══════════════════════════════════════════════════════════════════════════
import { clusterAvailable, createStaging, makeUser } from '../db/lib/pg-staging.mjs'

const ITER = Number(process.env.RACE_ITER || 12)
let pass = 0, fail = 0
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? '🛡️  PASS' : '❌ FAIL'} — ${label}${detail ? `  ⟨${detail}⟩` : ''}`)
  if (ok) pass++; else fail++
}

if (!clusterAvailable()) {
  console.log('⏭️  تخطٍّ معلَن: لا عنقود Postgres على QIMMAH_PG_URL — هذا الهجوم يحتاج تزامنًا حقيقيًّا (لا PGlite).')
  process.exit(0)
}

const seedPepper = (stg) => stg.sql(
  `insert into private.identity_pepper (version, pepper)
   values (1, 'stg-pepper-v1-' || encode(extensions.gen_random_bytes(16), 'hex'))
   on conflict (version) do nothing;`)

const errline = (r) => (r.err || '').split('\n').find((l) => /ERROR/.test(l)) || r.err || ''

// ── ① السباق: وسمان (+) لنفس صندوق Gmail، نداءان متزامنان ──────────────────
console.log('① سباق الأسماء المستعارة — نفس صندوق Gmail، start_trial متزامن')
let bothWon = 0, oneWon = 0, extraRows = 0
for (let k = 0; k < ITER; k++) {
  const stg = createStaging()
  try {
    seedPepper(stg)
    // نفس الصندوق: القاعدة (a) والوسم (a+farm) — كلاهما بريدٌ يصل ويُؤكَّد.
    const a = makeUser(stg, `racebox${k}@gmail.com`, { confirmed: true })
    const b = makeUser(stg, `racebox${k}+farm@gmail.com`, { confirmed: true })
    const res = await stg.race(
      ['select public.start_trial();', 'select public.start_trial();'],
      [{ role: 'authenticated', uid: a }, { role: 'authenticated', uid: b }],
    )
    const wins = res.filter((r) => /trialActive/.test(r.out || '')).length
    const rows = Number(stg.one('select count(*) from public.trial_ledger;'))
    if (wins === 2) bothWon++
    else oneWon++
    if (rows > 1) extraRows++
    if (wins === 2 || rows > 1) {
      console.log(`     run#${k}: wins=${wins} trial_ledger_rows=${rows}  outs=${JSON.stringify(res.map((r) => (r.out || errline(r)).slice(0, 40)))}`)
    }
  } finally { stg.drop() }
}
check('لا صندوق واحد ينال تجربتين تحت التزامن (0 جولات فاز فيها الاثنان)',
  bothWon === 0, `both-won ${bothWon}/${ITER}, one-won ${oneWon}/${ITER}`)
check('trial_ledger لا يحمل أكثر من صفّ لبصمة قانونية واحدة (0 جولات بصفّ زائد)',
  extraRows === 0, `runs-with-extra-row ${extraRows}/${ITER}`)

// ── ② انحدار تسلسلي: الوسم لا يفتح تجربة ثانية (حارس F-4 الأصلي) ───────────
console.log('\n② انحدار — تسلسليًّا يبقى الوسم محجوبًا (لا يكسر الإصلاحُ الأصلَ)')
{
  const stg = createStaging()
  try {
    seedPepper(stg)
    const a = makeUser(stg, 'seq@gmail.com', { confirmed: true })
    const first = stg.one('select public.start_trial();', { role: 'authenticated', uid: a })
    const b = makeUser(stg, 's.e.q+tag@gmail.com', { confirmed: true })
    let second
    try { second = stg.one('select public.start_trial();', { role: 'authenticated', uid: b }) }
    catch (e) { second = String(e.stderr || e.message).split('\n').find((l) => /ERROR/.test(l)) || '' }
    check('التجربة الأولى تنجح', /trialActive/.test(first || ''), first || '')
    check('الوسم/النقاط تسلسليًّا ⇒ trial_already_used', /trial_already_used/.test(second || ''), second || '')
  } finally { stg.drop() }
}

// ── ③ التأكيد المضادّ (§4.2): الفرادة لم تصر قاعدة تبتلع الأبرياء ──────────
// نقطتان خارج Gmail = صندوقان مختلفان لشخصين مختلفين ⇒ بصمتان قانونيتان
// مختلفتان ⇒ الفرادة لا تصطدم، وكلاهما ينال تجربته. لو دمجهما الإصلاح لكان
// حرم بريئًا — وهذا ما يمنعه هذا التأكيد.
console.log('\n③ تأكيد مضادّ — نقطتان خارج Gmail (صندوقان مختلفان) لا يُدمجان')
{
  const stg = createStaging()
  try {
    seedPepper(stg)
    const x = makeUser(stg, 'p.q@outlook.com', { confirmed: true })
    const first = stg.one('select public.start_trial();', { role: 'authenticated', uid: x })
    const y = makeUser(stg, 'pq@outlook.com', { confirmed: true })
    let second
    try { second = stg.one('select public.start_trial();', { role: 'authenticated', uid: y }) }
    catch (e) { second = String(e.stderr || e.message).split('\n').find((l) => /ERROR/.test(l)) || '' }
    check('p.q@outlook.com ينال تجربته', /trialActive/.test(first || ''), first || '')
    check('pq@outlook.com (شخص آخر) ينال تجربته — لا دمج زائف', /trialActive/.test(second || ''), second || '')
  } finally { stg.drop() }
}

// ── ④ النقطة اللاحقة في النطاق (F-4-LOW) — بعد إصلاح 20260827120002 ──────────
// `foo@gmail.com.` كان يخالف `foo@gmail.com` فيفتح تجربة ثانية للصندوق نفسه.
// والإصلاح يقصّ النقطة اللاحقة (نفس الوجهة في DNS)، فتتّحد البصمة. مقيس على
// القاعدة الحيّة عبر `canonical_identity` نفسها، ثم سلوكيًّا عبر `start_trial`.
console.log('\n④ النقطة اللاحقة في النطاق — نفس الصندوق، بصمة واحدة')
{
  const stg = createStaging()
  try {
    seedPepper(stg)
    const canon = (e) => stg.one(`select private.canonical_identity('${e}');`)
    check('canonical(foo@gmail.com.) = canonical(foo@gmail.com)',
      canon('foo@gmail.com.') === canon('foo@gmail.com'), `${canon('foo@gmail.com.')} vs ${canon('foo@gmail.com')}`)
    check('canonical(a@x.com.) = canonical(a@x.com) — لا يخصّ جيميل وحده',
      canon('a@x.com.') === canon('a@x.com'), `${canon('a@x.com.')} vs ${canon('a@x.com')}`)
    // ⟲ تأكيد مضادّ: نطاقان مختلفان حقًّا لا يُدمجان بقصّ النقطة.
    check('⟲ a@x.com ≠ a@y.com — القصّ لا يدمج نطاقين مختلفين',
      canon('a@x.com') !== canon('a@y.com'))
    // سلوكيًّا: تجربة ثم النقطة اللاحقة ⇒ مرفوضة.
    const u1 = makeUser(stg, 'dotdomain@gmail.com', { confirmed: true })
    const t1 = stg.one('select public.start_trial();', { role: 'authenticated', uid: u1 })
    const u2 = makeUser(stg, 'dotdomain@gmail.com.', { confirmed: true })
    let t2
    try { t2 = stg.one('select public.start_trial();', { role: 'authenticated', uid: u2 }) }
    catch (e) { t2 = String(e.stderr || e.message).split('\n').find((l) => /ERROR/.test(l)) || '' }
    check('التجربة الأولى تنجح', /trialActive/.test(t1 || ''), t1 || '')
    check('والنطاق بنقطة لاحقة يُرفض — لا تجربة ثانية', /trial_already_used/.test(t2 || ''), t2 || '')
  } finally { stg.drop() }
}

// ── التقرير ────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(60)}\nنتيجة: ${pass} نجحت · ${fail} فشلت`)
if (fail > 0) {
  console.error('❌ الحارس مخروق — البصمة القانونية تُلتفّ عليها بالتزامن (أو الإصلاح دمج بريئًا).')
  process.exit(1)
}
console.log('🛡️  البصمة القانونية تصمد تسلسليًّا وتحت التزامن، ولا تبتلع بريئًا.')
