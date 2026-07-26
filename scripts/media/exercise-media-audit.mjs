// جرد وسائط التمارين (Q20) — مصدر واحد للتقرير وللحارس.
//
// لماذا يُجمَّع الكود الحقيقي بدل إعادة تنفيذ منطق الحلّ: أي جرد يعيد كتابة سلسلة
// (المعرّف كما ورد ← القانوني ← الأسماء القديمة ← placeholder-only ← صورة الجهاز)
// سينحرف عن سلوك وقت التشغيل بصمت، فيصير تقريرًا يطمئنك على شيء لا يحدث فعلًا.
// هنا نستورد نفس الوحدات التي يستوردها المكوّن، ونفحص وجود الملفات على القرص.
//
// الاستخدام:
//   node scripts/media/exercise-media-audit.mjs            # تقرير نصّي
//   node scripts/media/exercise-media-audit.mjs --json     # JSON للبوّابة
//   node scripts/media/exercise-media-audit.mjs --markdown # جدول التقرير
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { existsSync, readFileSync, writeFileSync, mkdtempSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const JSON_OUT = process.argv.includes('--json')
const MD_OUT = process.argv.includes('--markdown')

// ————— تحميل وحدات التطبيق الحقيقية —————
const entry = `
export { workoutTemplates } from '@/data/workoutTemplates'
export { exercises, exerciseMap, canonicalExerciseId, isPlaceholderOnlyMedia,
         LEGACY_EXERCISE_ID_MAP, PLACEHOLDER_ONLY_EXERCISE_IDS } from '@/data/exercises'
export { getExerciseMedia, exerciseMedia } from '@/data/exerciseMedia'
export { getExerciseGif, exerciseGifs } from '@/data/exerciseGifs'
export { getMachineImage, machineImages } from '@/data/machineImages'
`
const tmp = mkdtempSync(join(tmpdir(), 'media-audit-'))
const entryFile = join(tmp, 'entry.ts')
writeFileSync(entryFile, entry)
const built = await build({
  entryPoints: [entryFile],
  bundle: true, format: 'esm', platform: 'node', write: false,
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false, VITE_SYNC_ENABLED: '' }) },
  logLevel: 'silent',
})
const modFile = join(tmp, 'mod.mjs')
writeFileSync(modFile, built.outputFiles[0].text)
const M = await import(pathToFileURL(modFile).href)

// ————— نفس ترتيب المرشّحين المستعمل في ExerciseMedia.tsx —————
const CANONICAL_TO_LEGACY = {}
for (const [legacy, canonical] of Object.entries(M.LEGACY_EXERCISE_ID_MAP)) {
  ;(CANONICAL_TO_LEGACY[canonical] ||= []).push(legacy)
}
function idCandidates(id) {
  const canonical = M.canonicalExerciseId(id)
  const all = [id, canonical, ...(CANONICAL_TO_LEGACY[canonical] ?? [])]
  return all.filter((x, i) => all.indexOf(x) === i)
}
function resolveByCandidates(id, get) {
  for (const c of idCandidates(id)) {
    const found = get(c)
    if (found) return found
  }
  return undefined
}

/** أصل عام (يبدأ بـ /) → مسار على القرص داخل public/. */
const publicPath = (url) => (url && url.startsWith('/') ? resolve(root, 'public', url.slice(1)) : null)
function assetState(url) {
  if (!url) return { url: null, state: 'absent' }
  if (/^https?:\/\//.test(url)) return { url, state: 'remote' }
  const p = publicPath(url)
  if (!p || !existsSync(p)) return { url, state: 'missing' } // مُشار إليه ولا وجود له = عطل
  const size = statSync(p).size
  if (size === 0) return { url, state: 'invalid', bytes: 0 }
  return { url, state: 'present', bytes: size }
}

// ————— جرد تمرين واحد —————
function auditExercise(id) {
  const canonical = M.canonicalExerciseId(id)
  const ex = M.exerciseMap[canonical] ?? M.exerciseMap[id]
  const placeholderOnly = M.isPlaceholderOnlyMedia(id)

  // بطاقة الجهاز: الخريطة أولًا ثم الاصطلاح — نفس ما يفعله المكوّن.
  const machineUrl = placeholderOnly
    ? (M.getMachineImage(canonical) ?? `/exercise-machine-images/${canonical}.svg`)
    : null
  const machine = placeholderOnly ? assetState(machineUrl) : { url: null, state: 'n/a' }

  const media = placeholderOnly ? undefined : resolveByCandidates(id, M.getExerciseMedia)
  const gifUrl = placeholderOnly ? undefined : resolveByCandidates(id, M.getExerciseGif)

  const start = media ? assetState(media.img0) : { url: null, state: 'absent' }
  const end = media ? assetState(media.img1) : { url: null, state: 'absent' }
  const startRemote = media?.img0Remote ? 'remote-fallback' : 'none'
  const endRemote = media?.img1Remote ? 'remote-fallback' : 'none'
  const gif = gifUrl ? assetState(gifUrl) : { url: null, state: 'absent' }

  // ما الذي سيراه المستخدم فعلًا؟
  let renders
  if (placeholderOnly) renders = machine.state === 'present' ? 'machine-diagram' : 'fallback'
  else if (gif.state === 'present') renders = 'gif'
  else if (start.state === 'present' && end.state === 'present') renders = 'start+end'
  else if (start.state === 'present') renders = 'start-only'
  else if (start.state === 'missing' && startRemote === 'remote-fallback') renders = 'remote-only'
  else renders = 'fallback'

  // عطل = أصل مُشار إليه وغير موجود بلا بديل صريح.
  const broken = []
  if (start.state === 'missing' && startRemote === 'none') broken.push('img0')
  if (end.state === 'missing' && endRemote === 'none') broken.push('img1')
  if (start.state === 'invalid') broken.push('img0(0 bytes)')
  if (end.state === 'invalid') broken.push('img1(0 bytes)')
  if (gif.state === 'missing' || gif.state === 'invalid') broken.push('gif')
  // صورة الجهاز غائبة ليست عطلًا: المكوّن يتدهور إلى الحالة الصادقة.

  return {
    id, canonical,
    nameAr: ex?.nameAr ?? '(غير معروف في الكتالوج)',
    inCatalog: !!ex,
    placeholderOnly,
    start: start.state, startUrl: start.url, startRemote,
    end: end.state, endUrl: end.url, endRemote,
    gif: gif.state, gifUrl: gif.url,
    machine: machine.state, machineUrl: machine.url,
    renders, broken,
  }
}

// ————— نطاق الجرد —————
const templateRefs = []
for (const tpl of M.workoutTemplates) {
  for (const day of tpl.days) {
    for (const id of day.exerciseIds) templateRefs.push({ template: tpl.id, day: day.id, id })
  }
}
const templateIds = [...new Set(templateRefs.map((r) => r.id))].sort()
const catalogIds = M.exercises.map((e) => e.id).sort()
const allIds = [...new Set([...templateIds, ...catalogIds])].sort()

const rows = allIds.map(auditExercise)
const byId = Object.fromEntries(rows.map((r) => [r.id, r]))
const templateRows = templateIds.map((id) => byId[id])

const summary = {
  templateExercises: templateIds.length,
  templateRefs: templateRefs.length,
  catalogExercises: catalogIds.length,
  // في القوالب
  tplStartEnd: templateRows.filter((r) => r.renders === 'start+end').length,
  tplMachine: templateRows.filter((r) => r.renders === 'machine-diagram').length,
  tplFallback: templateRows.filter((r) => r.renders === 'fallback').length,
  tplOther: templateRows.filter((r) => !['start+end', 'machine-diagram', 'fallback'].includes(r.renders)).length,
  tplNotInCatalog: templateRows.filter((r) => !r.inCatalog).map((r) => r.id),
  tplBroken: templateRows.filter((r) => r.broken.length > 0).map((r) => ({ id: r.id, broken: r.broken })),
  // الكتالوج كاملًا
  catStartEnd: rows.filter((r) => r.renders === 'start+end').length,
  catFallback: rows.filter((r) => r.renders === 'fallback').length,
  catBroken: rows.filter((r) => r.broken.length > 0).map((r) => ({ id: r.id, broken: r.broken })),
  gifsConfigured: Object.keys(M.exerciseGifs).length,
  machineDiagrams: Object.keys(M.machineImages).length,
}

if (JSON_OUT) {
  console.log(JSON.stringify({ summary, templateRows, rows }, null, 2))
  process.exit(0)
}

// ————— حارس البوّابة (--check) —————
// يمنع شحن قالب يشير إلى أصل مفقود بلا حالة بديلة صريحة. «بديل صريح» يعني أحد اثنين:
//   • رابط بعيد مُعلَن في نفس المدخلة (img0Remote/img1Remote) يلتقطه FallbackImg، أو
//   • تدهور إلى حالة «الشرح المرئي قيد الإضافة» — وهي حالة مقصودة لا عطل.
// أي شيء آخر (مسار مُشار إليه ولا ملف له ولا بديل) = صورة مكسورة عند المستخدم.
if (process.argv.includes('--check')) {
  const failures = []

  for (const r of templateRows) {
    if (!r.inCatalog) failures.push(`«${r.id}» مُشار إليه في قالب وغير موجود في الكتالوج.`)
    if (r.broken.length) failures.push(`«${r.id}» يشير إلى أصل مفقود بلا بديل صريح: ${r.broken.join(', ')}`)
    const known = ['start+end', 'machine-diagram', 'gif', 'start-only', 'remote-only', 'fallback']
    if (!known.includes(r.renders)) failures.push(`«${r.id}» ينتهي إلى حالة عرض غير معروفة: ${r.renders}`)
  }

  // الكتالوج كلّه أيضًا: مكتبة التمارين تعرضها للمستخدم.
  for (const r of rows) {
    if (r.broken.length) failures.push(`«${r.id}» (الكتالوج) أصل مفقود بلا بديل: ${r.broken.join(', ')}`)
  }

  // الحالة الصادقة يجب أن تبقى موجودة في المكوّن — الحارس بلا فائدة إن حُذفت.
  const comp = readFileSync(resolve(root, 'src/components/ExerciseMedia.tsx'), 'utf8')
  if (!/function MediaPending/.test(comp)) failures.push('MediaPending (الحالة الصادقة) غير موجود في ExerciseMedia.')
  if (!/loading="lazy"/.test(comp)) failures.push('فقدان loading="lazy" في ExerciseMedia.')

  console.log('════════ حارس وسائط التمارين ════════\n')
  console.log(`فُحص: ${templateRows.length} تمرين قالب · ${rows.length} تمرين كتالوج`)
  if (failures.length) {
    console.error(`\n❌ ${failures.length} مخالفة:`)
    for (const f of failures) console.error(`   • ${f}`)
    process.exit(1)
  }
  console.log(`\n✅ لا أصل مُشار إليه ومفقود بلا بديل صريح.`)
  console.log(`   بداية+نهاية ${summary.tplStartEnd} · رسم جهاز ${summary.tplMachine} · «قيد الإضافة» ${summary.tplFallback} (حالة مقصودة)`)
  process.exit(0)
}

if (MD_OUT) {
  const badge = (s) => ({ present: '✅', missing: '❌', invalid: '⚠️', absent: '—', remote: '🌐', 'n/a': '—' })[s] ?? s
  const renderLabel = {
    'start+end': 'بداية + نهاية',
    'machine-diagram': 'رسم جهاز',
    'start-only': 'بداية فقط',
    'remote-only': 'بعيد فقط',
    gif: 'GIF',
    fallback: '«قيد الإضافة»',
  }
  const table = (list) =>
    ['| التمرين | المعرّف | بداية | نهاية | GIF | رسم جهاز | ما يُعرض |', '|---|---|:--:|:--:|:--:|:--:|---|']
      .concat(list.map((r) => `| ${r.nameAr} | \`${r.id}\` | ${badge(r.start)} | ${badge(r.end)} | ${badge(r.gif)} | ${badge(r.machine)} | ${renderLabel[r.renders] ?? r.renders} |`))
      .join('\n')
  console.log(table(templateRows))
  console.log('\n\n<!-- CATALOG -->\n')
  console.log(table(rows))
  process.exit(0)
}

// ————— تقرير نصّي —————
console.log('════════ جرد وسائط التمارين — قِمّة ════════\n')
console.log(`القوالب: ${summary.templateExercises} تمرينًا فريدًا (${summary.templateRefs} إشارة) · الكتالوج: ${summary.catalogExercises}`)
console.log(`GIF مُهيّأة: ${summary.gifsConfigured} · رسوم أجهزة: ${summary.machineDiagrams}\n`)
console.log('— تمارين القوالب —')
console.log(`  بداية + نهاية : ${summary.tplStartEnd}`)
console.log(`  رسم جهاز      : ${summary.tplMachine}`)
console.log(`  «قيد الإضافة» : ${summary.tplFallback}`)
if (summary.tplOther) console.log(`  أخرى          : ${summary.tplOther}`)
console.log(`\n— الكتالوج كاملًا —`)
console.log(`  بداية + نهاية : ${summary.catStartEnd}`)
console.log(`  «قيد الإضافة» : ${summary.catFallback}`)
if (summary.tplNotInCatalog.length) console.log(`\n❌ في القوالب وغير موجودة في الكتالوج: ${summary.tplNotInCatalog.join(', ')}`)
if (summary.catBroken.length) {
  console.log(`\n❌ أصول مُشار إليها ومفقودة بلا بديل (${summary.catBroken.length}):`)
  for (const b of summary.catBroken) console.log(`   ${b.id}: ${b.broken.join(', ')}`)
} else {
  console.log('\n✅ لا أصل مُشار إليه ومفقود بلا بديل صريح.')
}
console.log('\n— تفصيل تمارين القوالب —')
for (const r of templateRows) {
  console.log(`  ${r.renders.padEnd(16)} ${r.id.padEnd(32)} ${r.nameAr}`)
}
