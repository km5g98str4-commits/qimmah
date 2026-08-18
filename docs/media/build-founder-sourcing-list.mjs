// يبني docs/media/FOUNDER-SOURCING-LIST.md من **المانيفست الإنتاجي والكتالوج مباشرةً**.
//
// لماذا مولِّد لا وثيقة مكتوبة بيد: الوثيقة السابقة `FOUNDER-MEDIA-GAPS.md` كُتبت يدويًا
// من الطبقة الوسيطة المتجاوَزة، فقالت «٢٥ بطاقة SVG · ٣٥ صورة مفقودة» بينما الطبقة التي
// تحكم الشاشة تقول «٢٣ · ٣٧» — وأسقطت تمرينين كاملين من قائمة المؤسس. وثيقة تُشتقّ من
// المصدر لا تشيخ بهذه الطريقة، و`npm run test:guidance-coverage` يفشل إن اختلفا.
//
// المولِّد **لا يخترع مصادر ولا يقترح صورًا بعينها** — يصف ما هو مطلوب ويقترح عبارة بحث.
// اختيار الأصل وحقوقه قرار المؤسس، ويمرّ بعده ببوابة `npm run test:media-rights`.
//
// Run: node docs/media/build-founder-sourcing-list.mjs

import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../..')

// ————— تحميل وحدات التطبيق الحقيقية (نفس مُحمِّل scripts/media/exercise-media-audit.mjs) —————
const tmp = mkdtempSync(join(tmpdir(), 'founder-sourcing-'))
const entryFile = join(tmp, 'entry.ts')
writeFileSync(
  entryFile,
  `export { exercises } from '@/data/exercises'
export { EXERCISE_PRODUCTION_MANIFEST, PRODUCTION_IMAGE_APPROVED, PRODUCTION_IMAGE_MISSING,
         PRODUCTION_VIDEO_APPROVED, PRODUCTION_CATALOG_TOTAL, PRODUCTION_IMAGE_GAP_IDS }
  from '@/data/exerciseProductionManifest.generated'
`,
)
const built = await build({
  entryPoints: [entryFile],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false, VITE_SYNC_ENABLED: '' }) },
  logLevel: 'silent',
})
const modFile = join(tmp, 'mod.mjs')
writeFileSync(modFile, built.outputFiles[0].text)
const M = await import(pathToFileURL(modFile).href)

const manifest = M.EXERCISE_PRODUCTION_MANIFEST
const catalog = M.exercises

// ————— ما هو المطلوب بالضبط، لكل تمرين ناقص —————
// مكتوبة بيد لكل معرّف: وصفٌ يصلح أمرَ تصويرٍ أو أمرَ بحث، لا عبارة عامّة.
// `need` = ما نحتاجه · `search` = عبارة البحث المقترحة (إنجليزية — سوق الأصول إنجليزي).
const SPEC = {
  'chest-press-machine': {
    need: 'رسم SVG داخلي للجهاز بنفس أسلوب الـ٢٣ رسمًا القائمة: منظر جانبي، المقعد والمسند ومقبضا الدفع ورَصّة الأثقال. **ليست صورة وزن حرّ** — الصورة الفوتوغرافية السابقة سُحبت لأنها نُسبت لتمرين غير هذا.',
    search: 'seated chest press machine side view line diagram',
  },
  'incline-chest-press-machine': {
    need: 'رسم SVG داخلي للجهاز، منظر جانبي بمسند مائل يميّزه بوضوح عن جهاز الضغط المستوي (زاوية المسند هي الفرق البصري الوحيد).',
    search: 'incline chest press machine side view line diagram',
  },
  'cable-shoulder-press': { need: 'إطاران: البداية والمقبضان عند مستوى الكتف، والنهاية والذراعان ممدودتان فوق الرأس. عمود الكيبل ظاهر في الإطارين.', search: 'cable shoulder press start and lockout position' },
  'mountain-climber': { need: 'إطاران من وضع البلانك العالي: ركبة واحدة مسحوبة نحو الصدر، ثم الأخرى. الظهر مستقيم في الاثنين.', search: 'mountain climber exercise plank position both knees' },
  'treadmill-run': { need: 'شخص يجري على سير كهربائي — منظر جانبي كامل الجسم يُظهر وضعية الجذع المنتصبة ولوحة التحكّم.', search: 'person running on treadmill side view full body' },
  'stationary-bike': { need: 'منظر جانبي لراكب على دراجة ثابتة: ارتفاع الكرسي بحيث تكاد الرِّجل تمتدّ في أسفل الدورة.', search: 'stationary exercise bike proper seat height side view' },
  'rowing-machine': { need: 'إطاران من جهاز التجديف: «القبض» (الركبتان مثنيّتان والمقبض قريب) و«النهاية» (الرِّجلان ممدودتان والمقبض عند أسفل الأضلاع).', search: 'rowing machine erg catch and finish position' },
  elliptical: { need: 'منظر جانبي لمستخدم على الإليبتيكال، القدمان على الدوّاستين واليدان على المقبضين المتحرّكين.', search: 'elliptical cross trainer proper posture side view' },
  'jump-rope': { need: 'إطاران: القدمان على الأرض والحبل خلف الجسم، ثم القفزة القصيرة والحبل تحت القدمين.', search: 'jump rope basic bounce technique two frames' },
  'pendlay-row': { need: 'إطاران: البار على الأرض والجذع موازٍ لها، ثم البار مسحوبًا إلى أسفل الصدر والجذع **بلا تغيّر** في زاويته.', search: 'pendlay row barbell start on floor and top position' },
  'chest-supported-row': { need: 'منظر جانبي على مقعد مائل والصدر مسنود، إطار الاستطالة وإطار الانقباض والمرفقان للخلف.', search: 'chest supported dumbbell row incline bench side view' },
  'meadows-row': { need: 'وقفة جانبية على طرف بار لاندماين، قبضة واحدة، إطارا البداية والنهاية.', search: 'meadows row landmine single arm technique' },
  'landmine-press': { need: 'إطاران: البار عند الكتف بزاوية، ثم الدفع للأمام والأعلى مع بقاء الطرف الآخر مثبّتًا في الأرض.', search: 'landmine press single arm start and finish' },
  'pike-push-up': { need: 'وضع V مقلوب: إطار الاستطالة والرأس قريب من الأرض، وإطار الفرد الكامل.', search: 'pike push up shoulders bodyweight two positions' },
  'single-arm-pushdown': { need: 'قبضة واحدة على بكرة عالية: المرفق ملاصق للجنب في الإطارين، الاستطالة ثم الفرد الكامل.', search: 'single arm cable triceps pushdown technique' },
  'belt-squat': { need: 'جهاز سكوات بالحزام: الحزام حول الورك والحمل معلّق بينهما — إطار الوقوف وإطار القاع.', search: 'belt squat machine hip belt setup and bottom position' },
  'wall-sit': { need: 'إطار واحد يكفي: الظهر مسند على الجدار والفخذ موازٍ للأرض والركبة بزاوية قائمة.', search: 'wall sit correct position ninety degree knees' },
  'single-leg-hip-thrust': { need: 'الكتفان على مقعد ورِجل واحدة على الأرض والأخرى مرفوعة — إطار القاع وإطار قمة الامتداد.', search: 'single leg hip thrust bench bottom and top' },
  'banded-lateral-walk': { need: 'المطاط حول الساقين أو الكاحلين، وقفة نصف سكوات، إطاران يُظهران خطوة جانبية والمطاط مشدود.', search: 'banded lateral walk resistance band side steps' },
  'frog-pump': { need: 'الاستلقاء على الظهر وباطنا القدمين متلاصقان والركبتان مفتوحتان — إطار القاع وإطار رفع الورك.', search: 'frog pump glute exercise soles together' },
  'bicycle-crunch': { need: 'إطاران متعاكسان: المرفق نحو الركبة المقابلة والرِّجل الأخرى ممدودة، ثم العكس. **تنبيه تسمية:** بعض المكتبات تسمّيه «Air Bike».', search: 'bicycle crunch abs alternating elbow to knee' },
  'hollow-hold': { need: 'إطار واحد جانبي: أسفل الظهر ملاصق للأرض والكتفان والقدمان مرفوعتان قليلًا.', search: 'hollow body hold gymnastics position side view' },
  'cable-woodchop': { need: 'إطاران قطريان: من أعلى الكتف إلى الورك المقابل، والجذع يدور والوركان ثابتان نسبيًا.', search: 'cable woodchop high to low rotation start and end' },
  'toes-to-bar': { need: 'تعلّق كامل من البار: إطار التعلّق الممدود، وإطار ملامسة أصابع القدم للبار.', search: 'toes to bar hang and contact position' },
  'incline-treadmill-walk': { need: 'منظر جانبي والسير مائل بوضوح والمستخدم يمشي **بلا اتّكاء على المقابض**.', search: 'incline treadmill walk side view no handrail' },
  stairmaster: { need: 'منظر جانبي على جهاز الدرج: الجذع منتصب واليد خفيفة على المقبض لا حاملة للوزن.', search: 'stairmaster stair climber upright posture side view' },
  burpees: { need: 'ثلاثة إطارات إن أمكن، وإلا إطاران: الوقوف/القفز ثم البلانك أو الضغط. حركة متعدّدة المراحل بطبعها.', search: 'burpee movement sequence stand plank jump' },
  'high-knees': { need: 'إطاران: ركبة مرفوعة إلى مستوى الورك، ثم الأخرى — والجري في المكان واضح.', search: 'high knees running in place knee to hip height' },
  'battle-ropes': { need: 'وقفة نصف سكوات وطرفا الحبل باليدين وموجتان ظاهرتان في الحبل.', search: 'battle ropes alternating waves athletic stance' },
  'assault-bike': { need: 'منظر جانبي لدراجة بمروحة: اليدان على الذراعين المتحرّكين والقدمان على الدوّاستين معًا.', search: 'air assault bike fan bike proper position side view' },
  'outdoor-walk': { need: 'صورة مشي خارجي بسيطة وصادقة — لا وضعية «تمرين». **الأقرب إلى صورة سياقية منها إلى صورة تعليمية**، وهذا مقبول لهذا المدخل تحديدًا.', search: 'person walking outdoors side view natural gait' },
  'leg-swings': { need: 'إطاران لأرجحة أمامية-خلفية بيد مستندة: أقصى أمام وأقصى خلف. (لو أضفنا الأرجحة الجانبية لاحقًا فهي مدخل ثانٍ.)', search: 'leg swings dynamic warm up front to back' },
  'shoulder-dislocates': { need: 'ثلاثة أوضاع للمطاط أو العصا: أمام الجسم، فوق الرأس، خلف الظهر. المسافة بين اليدين واسعة.', search: 'shoulder dislocates band pass through mobility' },
  'thoracic-rotation': {
    need: 'إطاران لتمرين **واحد محدَّد** يُختار أولًا — «open book» جانبيًا أو «thread the needle» على أربع. الاسم الحالي يغطّي عدّة دروب مختلفة، فاختيار الصورة يحسم أيّها نعني.',
    search: 'thoracic rotation open book stretch side lying',
  },
  'ankle-mobility': { need: 'اختبار/درب ثني الكاحل نحو الجدار: الركبة تلمس الجدار والكعب على الأرض — إطار البداية وإطار أقصى مدى.', search: 'ankle dorsiflexion knee to wall mobility drill' },
  'dumbbell-sumo-squat': { need: 'وقفة واسعة وأصابع القدم للخارج ودمبل واحد معلّق بين الفخذين — إطار الوقوف وإطار القاع.', search: 'dumbbell sumo squat wide stance goblet hold' },
  'cable-hip-adduction': { need: 'كاحل مربوط ببكرة سفلية: إطار الرِّجل مبعَدة، وإطار ضمّها عبر خطّ الجسم.', search: 'cable hip adduction ankle strap low pulley' },
}

const PATTERN_AR = {
  push: 'دفع', pull: 'سحب', squat: 'سكوات', hinge: 'مفصلة ورك', lunge: 'طعن',
  isolation: 'عزل', carry: 'حمل', core: 'جذع', cardio: 'كارديو', mobility: 'حركية',
}

const missing = catalog.filter((e) => manifest[e.id]?.imageStatus === 'MISSING')
const videoReview = catalog.filter((e) => manifest[e.id]?.videoStatus === 'NEEDS_REVIEW')
const tally = (key, value) => catalog.filter((e) => manifest[e.id]?.[key] === value).length

const unspecced = missing.filter((e) => !SPEC[e.id]).map((e) => e.id)
if (unspecced.length) {
  console.error(`✗ ${unspecced.length} تمرينًا ناقص الصورة بلا وصفٍ مكتوب: ${unspecced.join(', ')}`)
  console.error('  أضف مدخلًا في SPEC — قائمة المؤسس لا تُسلَّم بعبارة عامّة.')
  process.exit(1)
}

const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ')

const rows = missing
  .map((e, i) => {
    const spec = SPEC[e.id]
    const vid = manifest[e.id].videoStatus === 'NEEDS_REVIEW' ? ' · ⚠️ الفيديو كذلك بانتظار المراجعة' : ''
    return `| ${i + 1} | \`${e.id}\` | ${esc(e.nameAr)} | ${esc(e.nameEn)} | ${e.equipment.join(' + ')} | ${PATTERN_AR[e.movementPattern] ?? e.movementPattern} (\`${e.movementPattern}\`) | ${esc(spec.need)}${vid} | \`${esc(spec.search)}\` |`
  })
  .join('\n')

const fullRows = catalog
  .map((e) => {
    const m = manifest[e.id]
    const img = m.imageStatus === 'APPROVED' ? (m.image?.kind === 'diagram' ? '✅ APPROVED (رسم داخلي)' : m.image?.end ? '✅ APPROVED (إطاران)' : '✅ APPROVED (إطار واحد)') : `🟥 ${m.imageStatus}`
    const vidCell = m.videoStatus === 'APPROVED' ? '✅ APPROVED' : `🟠 ${m.videoStatus}`
    return `| \`${e.id}\` | ${esc(e.nameAr)} | ${esc(e.nameEn)} | ${img} | ${vidCell} |`
  })
  .join('\n')

const videoRows = videoReview
  .map((e) => `| \`${e.id}\` | ${esc(e.nameAr)} | ${esc(e.nameEn)} | ${esc(manifest[e.id].notes).slice(0, 160)} |`)
  .join('\n')

const doc = `<!-- ⚙️ AUTO-GENERATED by docs/media/build-founder-sourcing-list.mjs — do not edit by hand.
     Regenerate: node docs/media/build-founder-sourcing-list.mjs
     Guard:      npm run test:guidance-coverage  (يفشل إن خالف هذا الملفُّ المانيفست) -->

# قائمة تزويد الوسائط — للمؤسس

**المصدر:** \`src/data/exerciseProductionManifest.generated.ts\` (الطبقة التي تحكم الشاشة) + \`src/data/exercises.ts\`.
**مشتقّة برمجيًا** — لا عدّ يدوي ولا رقم منقول عن تقرير سابق.

> **لماذا وثيقة ثانية بجانب \`docs/execution/qimmah-canonical-launch/FOUNDER-MEDIA-GAPS.md\`:**
> تلك كُتبت يدويًا من **الطبقة الوسيطة المتجاوَزة** (\`exerciseMediaManifest\`)، فأعلنت «٢٥ رسمًا · ٣٥ صورة مفقودة»
> بينما الطبقة الإنتاجية — وهي التي تقرؤها الشاشة — تقول **٢٣ رسمًا · ٣٧ صورة مفقودة**، وأسقطت من قائمة
> المؤسس تمرينين كاملين (\`chest-press-machine\` · \`incline-chest-press-machine\`). هذه الوثيقة تُشتقّ من المصدر
> ويحرسها إثبات، فلا تشيخ بصمت. **الوثيقة القديمة تُترك كما هي** — تصحيحها ملكُ حارتها.

---

## ⓪ الجرد الكامل بالأرقام

| البند | العدد | من ${M.PRODUCTION_CATALOG_TOTAL} |
|---|---|---|
| **صورة APPROVED** | **${tally('imageStatus', 'APPROVED')}** | ${((tally('imageStatus', 'APPROVED') / catalog.length) * 100).toFixed(1)}% |
| صورة NEEDS_REVIEW | ${tally('imageStatus', 'NEEDS_REVIEW')} | — |
| صورة REJECTED | ${tally('imageStatus', 'REJECTED')} | — |
| **صورة MISSING** | **${tally('imageStatus', 'MISSING')}** | ${((tally('imageStatus', 'MISSING') / catalog.length) * 100).toFixed(1)}% |
| **فيديو APPROVED** | **${tally('videoStatus', 'APPROVED')}** | ${((tally('videoStatus', 'APPROVED') / catalog.length) * 100).toFixed(1)}% |
| **فيديو NEEDS_REVIEW** | **${tally('videoStatus', 'NEEDS_REVIEW')}** | ${((tally('videoStatus', 'NEEDS_REVIEW') / catalog.length) * 100).toFixed(1)}% |
| فيديو MISSING | ${tally('videoStatus', 'MISSING')} | — |

تفكيك الـ${tally('imageStatus', 'APPROVED')} المعتمدة: **${catalog.filter((e) => manifest[e.id]?.image?.kind === 'stills').length}** لقطة فوتوغرافية + **${catalog.filter((e) => manifest[e.id]?.image?.kind === 'diagram').length}** رسمًا داخليًا SVG.

> **APPROVED وحدها تصل المستخدم.** NEEDS_REVIEW وMISSING تعنيان حالة فارغة صادقة على الشاشة
> («الشرح المرئي قيد الإضافة») — لا صورة قديمة تُملأ بها الفجوة، ولا صورة مكسورة.

---

## ① ما لا يمكن استرجاعه — بحث تاريخ git

بحثٌ في تاريخ المستودع كاملًا عن وسائط حُذفت وقد تكون آمنة الحقوق:

| الحذف | العدد | السبب في رسالة الالتزام | قابل للاسترجاع؟ |
|---|---|---|---|
| \`bf07512\` — \`public/exercise-gifs/*.gif\` | ٨١ ملفًا | «Watermarked images: removed the entire WorkoutX gif layer» | ❌ **لا** — عليها علامة مائية لطرف ثالث |
| \`1d4d64f\` — \`public/exercise-machine-images/*.jpg\` | ٢٤ ملفًا | «remediate 24 unsafe machine assets → in-house SVG schematics» | ❌ **لا** — استُبدلت برسومنا الداخلية |
| \`e650e7c\` — صور أجهزة | ١١ ملفًا | «remove 11 mismatched machine images (wrong exercise shown)» | ❌ **لا** — تعرض تمرينًا غير المقصود |
| \`00d46ca\` — \`public/exercise-images/*\` | ١١ مجلدًا | «remove 11 unreferenced exercise-image dirs» | ❌ **بلا فائدة** — فُحصت المعرّفات الـ١١ واحدًا واحدًا: **٨ منها ليست في الكتالوج إطلاقًا**، و٣ (\`glute-kickback-machine\` · \`seated-leg-curl\` · \`shoulder-press-machine\`) لها **رسم داخلي معتمد اليوم**. ولا واحد منها ضمن الـ${tally('imageStatus', 'MISSING')} الناقصة. |

**الحكم: لا يوجد أصل آمن الحقوق ضاع ويمكن استرجاعه.** كل حذف في التاريخ كان **معالجة حقوق**،
واسترجاعه يعيد المخالفة التي عولجت. الفجوة الحالية فجوة **تزويد** لا فجوة **فقد**.

---

## ② قائمة التزويد — ${missing.length} تمرينًا بلا صورة

كل صفٍّ يصلح أمرَ تصويرٍ أو أمرَ بحث. **العبارات المقترحة إنجليزية** لأن سوق الأصول إنجليزي.

> **شرط الحقوق قبل أي أصل:** الأصل يدخل عبر \`scripts/media/provenance-manifest.json\` بحكم
> \`CLEARLY-LICENSED\` أو \`IN-HOUSE\`، ويمرّ بـ\`npm run test:media-rights\`. **لا صورة تُشحن بلا سلسلة حقوق.**

| # | المعرّف | الاسم العربي | English name | العدّة | نمط الحركة | الصورة المطلوبة بالضبط | عبارة البحث المقترحة |
|---|---------|--------------|--------------|--------|------------|------------------------|----------------------|
${rows}

### الطابع الحاكم للفجوة

| المجموعة | العدد | ملاحظة |
|---|---|---|
| كارديو وتكييف | ${missing.filter((e) => e.movementPattern === 'cardio').length} | أجهزة الكارديو والحركات الإيقاعية |
| حركية وإحماء | ${missing.filter((e) => e.movementPattern === 'mobility').length} | دروب إطالة/تجهيز |
| بطاقتا جهاز بلا رسم داخلي | ٢ | \`chest-press-machine\` · \`incline-chest-press-machine\` — **رسم SVG لا صورة** |
| الباقي (وزن حرّ · كيبل · جذع · وزن الجسم) | ${missing.length - missing.filter((e) => e.movementPattern === 'cardio').length - missing.filter((e) => e.movementPattern === 'mobility').length - 2} | — |

**استنتاج (لا حقيقة مؤكَّدة):** المكتبة العامّة التي جاءت منها اللقطات الـ${catalog.filter((e) => manifest[e.id]?.image?.kind === 'stills').length}
لا تغطّي أجهزة الكارديو ولا دروب الحركية — فالفجوة **شكل المصدر**، لا حذفٌ وقع. يدعمه بحث تاريخ git في §①.

---

## ③ الفيديو بانتظار المراجعة — ${videoReview.length} تمرينًا

**لا يصل المستخدم منها شيء.** المرجع موجود في السجلّ لكنه لم يُعتمد، فالزرّ لا يظهر.

| المعرّف | الاسم العربي | English name | سبب التوقّف (من المانيفست) |
|---|---|---|---|
${videoRows}

---

## ④ الجرد الكامل — كل تمرين وحالته

| المعرّف | الاسم العربي | English name | الصورة | الفيديو |
|---|---|---|---|---|
${fullRows}
`

writeFileSync(resolve(here, 'FOUNDER-SOURCING-LIST.md'), doc)
console.log(`wrote FOUNDER-SOURCING-LIST.md — ${catalog.length} exercises · ${missing.length} image gaps · ${videoReview.length} video reviews`)
