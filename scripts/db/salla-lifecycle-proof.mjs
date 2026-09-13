// ============================================================================
// test:salla-lifecycle — دورة سلة كاملة على جانب قِمّة، على Postgres حقيقي (PGlite)
// ============================================================================
// [SALLA-PROD-001] ما يُثبته من طرف قِمّة (ما يبقى لسلة: الدفع والتسليم — يُثبت
// بشراء تجريبي واحد بيد المؤسس):
//   ① إصدار SALLA-TEST-001 (٥) بيد المؤسس ⇒ خام مرّة واحدة، شكل الصكّ.
//   ② التصدير بالأداة المصلَّبة: يقبل الصحيح فقط، ويرفض بالاسم: عدّ خاطئ · وسم
//      الاحتياطي · مسار داخل المستودع · إطلاق بلا إثبات اختبار · ملف دفعة أخرى ·
//      سطر مكسور/مكرّر. ولا يطبع كودًا. الملف: ترويسة + أكواد **لا غير**.
//   ③ تسجيل التصدير: مرّة واحدة · عدد مطابق · دفعة بِكر · وسم القناة فقط (الاحتياطي
//      مرفوض بنيويًّا) · مؤسس فقط.
//   ④ المخزون: الصادر/المستردّ/المعطَّل/غير المستردّ · إنذار النفاد · مطابقة العدد.
//   ⑤ الاسترداد: صحيح ⇒ Premium دائم واحد · إعادة صاحب الصكّ تتقارب · مستخدم آخر
//      على الصكّ ⇒ رفض · حروف صغيرة/شرطات/مسافات ⇒ ينجح · مشوَّه/فارغ/لاتيني مشابه
//      ⇒ رفض · معطَّل ⇒ رفض (نفس رسالة المجهول) · **الفشل لا يمنح شيئًا**.
//   ⑥ الدعم: البحث بالبصمة يعيد الحالة والوسم والقناة ولا يعيد النصّ.
//   ⑦ التزويد: دفعة ثانية تُصدَر وتُسجَّل؛ دفعة متداولة لا تُسجَّل مصدَّرة.
//   ⚔️ التزامن الحقيقي (فائز واحد · نقرة مزدوجة · سباق الإطفاء) مُثبَت في CI على
//      Postgres متعدّد الاتصالات: test:attack-purchase-race — لا يُعاد هنا.
// ============================================================================
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createSandbox, asRole, makeUser, ROOT } from './lib/supabase-sandbox.mjs'
import { loadTsModule } from '../food-production/lib/loadTs.mjs'

let pass = 0
const check = (label, cond, detail = '') => {
  if (!cond) { console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`); process.exit(1) }
  pass += 1
  console.log(`  ✓ ${label}`)
}
const AUTH_STUB = `
  alter table auth.users add column if not exists raw_app_meta_data jsonb default '{}'::jsonb;
  alter table auth.users add column if not exists last_sign_in_at timestamptz;
  alter table auth.users add column if not exists created_at timestamptz not null default now();
`
console.log('\nدورة سلة على جانب قِمّة — Postgres منفَّذ بالهجرات كاملة')
const MIG = '20260913120001_salla_batch_exports.sql'
const { db, applied, failed } = await createSandbox()
check('كل هجرات المستودع تُطبَّق من قاعدة نظيفة', failed.length === 0, failed.map((f) => `${f.file}: ${f.message}`).join(' | '))
check(`هجرة سجلّ التصدير ${MIG} ضمن المُطبَّق`, applied.includes(MIG))
await db.exec(AUTH_STUB)
await asRole(db, null)
await db.exec(`insert into private.identity_pepper (version, pepper) values (1, 'salla-lifecycle-pepper-0123456789ab')`)
const founderId = await makeUser(db, 'founder@qimmah.test')
await asRole(db, 'service_role')
await db.query(`select public.admin_set_role('founder@qimmah.test', 'founder', 'salla lifecycle proof')`)

const issue = async (label, count) => { await asRole(db, 'authenticated', founderId); const r = await db.query(`select public.founder_issue_purchase_batch($1, $2, $3) as res`, ['salla lifecycle', label, count]); return r.rows[0].res }
const redeem = async (uid, code) => { await asRole(db, 'authenticated', uid); const r = await db.query(`select public.redeem_access_code_v2($1) as res`, [code]); return r.rows[0].res }
const state = async () => (await db.query(`select * from public.my_entitlement()`)).rows[0]
const entCount = async (email) => { await asRole(db, null); return (await db.query(`select count(*)::int as n from public.entitlements e join auth.users u on u.id = e.user_id where u.email = $1`, [email])).rows[0].n }
const founderCall = async (sql, params = []) => { await asRole(db, 'authenticated', founderId); try { return { ok: true, rows: (await db.query(sql, params)).rows } } catch (e) { return { ok: false, m: String(e.message || e) } } }
const rowId = async (raw) => { await asRole(db, null); return (await db.query(`select id from public.access_codes where code_hash in (select ih.email_hash from private.identity_hashes(private.normalize_access_code($1)) ih)`, [raw])).rows[0].id }

// ═══ ① الإصدار ═══
console.log('\n① إصدار SALLA-TEST-001 — خمسة صكوك، خام مرّة واحدة')
const test1 = await issue('SALLA-TEST-001', 5)
check('٥ صكوك خام بشكل قِمّة (١٦ رمزًا من الأبجدية)', Array.isArray(test1.codes) && test1.codes.length === 5 && test1.codes.every((c) => /^[A-HJ-NP-Z2-9]{16}$/.test(c.replace(/-/g, ''))))
const reserve = await issue('FOUNDER-RESERVE-001', 3)
check('دفعة احتياطي (محاكاة) موجودة لتُهاجَم لاحقًا', reserve.codes.length === 3)

// ═══ ② التصدير ═══
console.log('\n② التصدير — الأداة تقبل الصحيح وترفض الخطر بالاسم، ولا تطبع كودًا')
const tmp = mkdtempSync(join(tmpdir(), 'qimmah-salla-'))
const inFile = join(tmp, 'SALLA-TEST-001.csv')
writeFileSync(inFile, ['code', ...test1.codes].join('\r\n') + '\r\n')
const tool = resolve(ROOT, 'scripts/salla/export-batch.mjs')
const run = (a) => { const r = spawnSync(process.execPath, [tool, ...a], { encoding: 'utf8' }); return { code: r.status, out: (r.stdout || '') + (r.stderr || '') } }
const outFile = join(tmp, 'SALLA-TEST-001.salla.csv')
const ok = run(['--batch', 'SALLA-TEST-001', '--count', '5', '--in', inFile, '--out', outFile])
check('التصدير الصحيح ينجح ويطبع العدد والبصمة', ok.code === 0 && /5 كودًا/.test(ok.out) && /بصمة [0-9a-f]{64}/.test(ok.out), ok.out.slice(0, 200))
check('⚔️ لا كود يظهر في مخرجات الطرفية', !test1.codes.some((c) => ok.out.includes(c)))
const sallaFile = readFileSync(outFile, 'utf8').split(/\r?\n/).filter(Boolean)
check('ملف سلة = ترويسة «code» + ٥ أكواد لا غير (لا أعمدة أخرى)', sallaFile[0] === 'code' && sallaFile.length === 6 && sallaFile.slice(1).every((l) => /^[A-HJ-NP-Z2-9]{16}$/.test(l)))
const manifest = JSON.parse(readFileSync(`${outFile}.manifest.json`, 'utf8'))
check('البيان: الوسم والعدد والبصمة، ولا أكواد فيه', manifest.batch === 'SALLA-TEST-001' && manifest.count === 5 && /^[0-9a-f]{64}$/.test(manifest.digest) && !JSON.stringify(manifest).match(/[A-HJ-NP-Z2-9]{16}/))
check('⚔️ عدد مختلف يُرفض', run(['--batch', 'SALLA-TEST-001', '--count', '4', '--in', inFile, '--out', join(tmp, 'x1.csv')]).code === 1)
const resFile = join(tmp, 'FOUNDER-RESERVE-001.csv'); writeFileSync(resFile, reserve.codes.join('\n'))
check('⚔️ وسم الاحتياطي يُرفض قبل قراءة الملف', run(['--batch', 'FOUNDER-RESERVE-001', '--count', '3', '--in', resFile, '--out', join(tmp, 'x2.csv')]).code === 2)
check('⚔️ مسار داخل المستودع يُرفض', run(['--batch', 'SALLA-TEST-001', '--count', '5', '--in', inFile, '--out', resolve(ROOT, 'data', 'x3.csv')]).code === 2 && !existsSync(resolve(ROOT, 'data', 'x3.csv')))
const launchIn = join(tmp, 'SALLA-LAUNCH-001.csv'); writeFileSync(launchIn, ['code', ...test1.codes].join('\n'))
check('⚔️ مخزون إطلاق بلا إثبات دورة الاختبار يُرفض', run(['--batch', 'SALLA-LAUNCH-001', '--count', '5', '--in', launchIn, '--out', join(tmp, 'x4.csv')]).code === 2)
check('⚔️ ملف دفعة أخرى (الاسم لا يحمل الوسم) يُرفض', run(['--batch', 'SALLA-TEST-002', '--count', '5', '--in', inFile, '--out', join(tmp, 'x5.csv')]).code === 2)
const badIn = join(tmp, 'SALLA-TEST-001-bad.csv'); writeFileSync(badIn, ['code', ...test1.codes, test1.codes[0], 'ABC'].join('\n'))
check('⚔️ تكرار وسطر مكسور يُرفضان بالاسم', (() => { const r = run(['--batch', 'SALLA-TEST-001', '--count', '7', '--in', badIn, '--out', join(tmp, 'x6.csv')]); return r.code === 1 && /تكرار/.test(r.out) && /شكل غير صالح/.test(r.out) })())
check('⚔️ لا كتابة فوق ملف رفع موجود', run(['--batch', 'SALLA-TEST-001', '--count', '5', '--in', inFile, '--out', outFile]).code === 2)
const pasteOut = join(tmp, 'SALLA-TEST-001.paste.txt')
check('--no-header يكتب كودًا في كل سطر للّصق المباشر في سلة، بلا ترويسة', run(['--batch', 'SALLA-TEST-001', '--count', '5', '--in', inFile, '--out', pasteOut, '--no-header']).code === 0 && readFileSync(pasteOut, 'utf8').split(/\r?\n/).filter(Boolean).every((l) => /^[A-HJ-NP-Z2-9]{16}$/.test(l)))

// ═══ ③ تسجيل التصدير ═══
console.log('\n③ تسجيل التصدير في القاعدة — مرّة، عدد مطابق، دفعة بِكر، وسم القناة فقط')
const mark = (label, count, digest = manifest.digest) => founderCall(`select public.founder_mark_purchase_batch_exported($1, 'salla', $2, $3) as res`, [label, count, digest])
let m = await mark('SALLA-TEST-001', 5)
check('التسجيل الصحيح ينجح', m.ok && m.rows[0].res.expected_count === 5, JSON.stringify(m).slice(0, 160))
m = await mark('SALLA-TEST-001', 5); check('⚔️ تسجيل ثانٍ لنفس الدفعة ⇒ already_exported', !m.ok && /already_exported/.test(m.m))
m = await mark('FOUNDER-RESERVE-001', 3); check('⚔️ الاحتياطي لا يُسجَّل مصدَّرًا لسلة ⇒ label_not_salla_channel', !m.ok && /label_not_salla_channel/.test(m.m))
const test2 = await issue('SALLA-TEST-002', 5)
m = await mark('SALLA-TEST-002', 4); check('⚔️ عدد لا يساوي الصادر ⇒ count_mismatch', !m.ok && /count_mismatch/.test(m.m))
m = await mark('SALLA-TEST-009', 5); check('⚔️ وسم بلا دفعة ⇒ no_such_batch', !m.ok && /no_such_batch/.test(m.m))
{
  const other = await makeUser(db, 'not-founder@qimmah.test')
  await asRole(db, 'authenticated', other)
  let denied = false
  try { await db.query(`select public.founder_mark_purchase_batch_exported('SALLA-TEST-002', 'salla', 5, $1)`, [manifest.digest]) } catch (e) { denied = /founder|forbidden|denied|permission|42501|28000/i.test(String(e.message)) }
  check('⚔️ غير المؤسس لا يسجّل تصديرًا', denied)
}

// ═══ ④ المخزون ═══
console.log('\n④ المخزون — أرقام صادقة وإنذار نفاد')
let inv = await founderCall(`select * from public.founder_salla_inventory(20)`)
check('صفّ واحد: SALLA-TEST-001 صادر ٥ · مستردّ ٠ · غير مستردّ ٥ · العدد مطابق', inv.ok && inv.rows.length === 1 && inv.rows[0].label === 'SALLA-TEST-001' && Number(inv.rows[0].codes_issued) === 5 && Number(inv.rows[0].codes_unredeemed) === 5 && inv.rows[0].count_matches === true)
check('إنذار النفاد: ٥ ≤ عتبة ٢٠ ⇒ low_stock، و٥ > عتبة ٢ ⇒ لا', inv.rows[0].low_stock === true && (await founderCall(`select low_stock from public.founder_salla_inventory(2)`)).rows[0].low_stock === false)
const batches = await founderCall(`select label, exported_channel from public.founder_purchase_batches(50)`)
check('عرض الدفعات يحمل حالة التصدير: TEST-001 ⇒ salla · الاحتياطي ⇒ بلا قناة', batches.ok && batches.rows.find((r) => r.label === 'SALLA-TEST-001')?.exported_channel === 'salla' && batches.rows.find((r) => r.label === 'FOUNDER-RESERVE-001')?.exported_channel === null)

// ═══ ⑤ الاسترداد ═══
console.log('\n⑤ الاسترداد — مرّة واحدة بالضبط، والفشل لا يمنح')
const [c1, c2, c3] = test1.codes
const A = await makeUser(db, 'a@qimmah.test'); const B = await makeUser(db, 'b@qimmah.test'); const C = await makeUser(db, 'c@qimmah.test'); const D = await makeUser(db, 'd@qimmah.test'); const E = await makeUser(db, 'e@qimmah.test')
let r = await redeem(A, c1); check('A يستردّ الصكّ ١ ⇒ premiumActive', r.outcome === 'premiumActive', JSON.stringify(r))
let st = await state(); check('A: Premium دائم بلا انتهاء من purchase_code', st.state === 'premiumActive' && st.no_expiry === true && st.source === 'purchase_code')
r = await redeem(A, c1); check('A يعيد المحاولة (ردّ ضاع) ⇒ premiumActive بلا منحة ثانية', r.outcome === 'premiumActive' && (await entCount('a@qimmah.test')) === 1)
r = await redeem(B, c1); check('B على الصكّ نفسه ⇒ رفض (invalid_code) — الصكّ لا يُستردّ مرّتين', r.outcome === 'failed' && /invalid_code/.test(r.reason) && (await entCount('b@qimmah.test')) === 0)
// التطبيع طبقتان: العميل ينزع الشرطات والمسافات ويرفع الأحرف (`normalizeActivationCode`)، والخادم
// يقصّ الأطراف ويطوي الأحرف ويرفض أي رمز خارج الأبجدية. نثبت الطبقتين كلًّا في موضعها.
const access = await loadTsModule('src/lib/access/entitlementSource.ts')
const typed = `  ${c2.slice(0, 4).toLowerCase()}-${c2.slice(4, 8)} ${c2.slice(8, 12).toLowerCase()}-${c2.slice(12)}\u00a0`
check('العميل يطبّع ما كتبه المستخدم (شرطات · مسافات · NBSP · حروف صغيرة) إلى الصكّ كما صدر', access.normalizeActivationCode(typed) === c2)
r = await redeem(C, `  ${c2.toLowerCase()}  `)
check('C: الصكّ ٢ كما يصل من العميل (بحروف صغيرة ومسافات طرفية) ⇒ premiumActive', r.outcome === 'premiumActive', JSON.stringify(r))
r = await redeem(D, `${c3.slice(0, 4)}-${c3.slice(4)}`)
check('⚔️ نداء مباشر للخادم بشرطة (يتجاوز تطبيع العميل) ⇒ رفض، لا قبول متساهل', r.outcome === 'failed')
for (const [label, bad] of [['مشوَّه قصير', 'abc'], ['فارغ', ''], ['لاتيني مشابه (ſ)', c3.replace(/[A-Z]/, 'ſ')], ['بأحرف محظورة (0/O)', c3.slice(0, 14) + 'O0']]) {
  r = await redeem(D, bad)
  check(`D: ${label} ⇒ رفض ولا منحة`, r.outcome === 'failed' && (await entCount('d@qimmah.test')) === 0, JSON.stringify(r))
}
const c3Id = await rowId(c3)
m = await founderCall(`select public.founder_set_code_enabled($1, false, 'support: suspected leak') as res`, [c3Id])
check('المؤسس يعطّل الصكّ ٣ بسبب مكتوب', m.ok, JSON.stringify(m).slice(0, 120))
r = await redeem(E, c3); check('E على صكّ معطَّل ⇒ رفض بنفس رسالة المجهول ولا منحة', r.outcome === 'failed' && /invalid_code/.test(r.reason) && (await entCount('e@qimmah.test')) === 0)
await asRole(db, null)
const ledger = (await db.query(`select count(*)::int as n from public.purchase_ledger`)).rows[0].n
check('سجلّ الشراء: صفّان بالضبط (A وC) — لا صفّ لأي فشل', ledger === 2)

// ═══ ⑥ الدعم ═══
console.log('\n⑥ الدعم — بحث بالبصمة بلا نصّ')
let lk = await founderCall(`select * from public.founder_code_lookup($1)`, [`  ${c1.toLowerCase()} `])
check('الصكّ ١ (ملصوق بمسافات وحروف صغيرة) ⇒ found · redeemed · SALLA-TEST-001 · قناة salla', lk.ok && lk.rows[0].found && lk.rows[0].status === 'redeemed' && lk.rows[0].label === 'SALLA-TEST-001' && lk.rows[0].exported_channel === 'salla' && lk.rows[0].last_redeemed_at)
lk = await founderCall(`select * from public.founder_code_lookup($1)`, [c3]); check('الصكّ ٣ ⇒ disabled بسببه', lk.rows[0].status === 'disabled' && /leak/.test(lk.rows[0].disabled_reason))
lk = await founderCall(`select * from public.founder_code_lookup('zz')`); check('نصّ مشوَّه ⇒ malformed', lk.rows[0].found === false && lk.rows[0].status === 'malformed')
lk = await founderCall(`select * from public.founder_code_lookup('ABCDEFGHJKMNPQRS')`); check('شكل صحيح غير موجود ⇒ not_found', lk.rows[0].found === false && lk.rows[0].status === 'not_found')
check('⚔️ لا عمود في نتيجة البحث يعيد نصّ الصكّ', !Object.values(lk.rows[0]).some((v) => typeof v === 'string' && /^[A-HJ-NP-Z2-9]{16}$/.test(v)))

// ═══ ⑦ التزويد والدفعة المتداولة ═══
console.log('\n⑦ التزويد — دفعة ثانية تُسجَّل؛ دفعة متداولة لا تُسجَّل')
inv = await founderCall(`select * from public.founder_salla_inventory(20)`)
check('بعد الدورة: TEST-001 مستردّ ٢ · معطَّل ١ · غير مستردّ ٢', Number(inv.rows[0].codes_redeemed) === 2 && Number(inv.rows[0].codes_disabled_unredeemed) === 1 && Number(inv.rows[0].codes_unredeemed) === 2)
m = await mark('SALLA-TEST-002', 5, 'a'.repeat(64)); check('SALLA-TEST-002 تُسجَّل مصدَّرة (تزويد آمن)', m.ok)
const test3 = await issue('SALLA-TEST-003', 2)
await redeem(await makeUser(db, 'f@qimmah.test'), test3.codes[0])
m = await mark('SALLA-TEST-003', 2, 'b'.repeat(64)); check('⚔️ دفعة استُردّ منها صكّ لا تُسجَّل مصدَّرة ⇒ batch_not_pristine', !m.ok && /batch_not_pristine/.test(m.m))
inv = await founderCall(`select label from public.founder_salla_inventory(20)`); check('المخزون يعرض الدفعتين المصدَّرتين فقط', inv.rows.length === 2 && inv.rows.map((x) => x.label).sort().join(',') === 'SALLA-TEST-001,SALLA-TEST-002')

rmSync(tmp, { recursive: true, force: true })
console.log(`\n✅ دورة سلة (جانب قِمّة): ${pass} فحصًا، 0 فشل.`)
