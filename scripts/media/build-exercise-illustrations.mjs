#!/usr/bin/env node
/**
 * مولّد رسوم الحركة الداخلية (IN-HOUSE) — التمارين التي لا لقطة مرخّصة لها.
 *
 * يبني رسمًا توضيحيًا أصليًا 100% لكل تمرين في فجوة الصور المعلَنة
 * (PRODUCTION_IMAGE_GAP_IDS في src/data/exerciseProductionManifest.generated.ts —
 * «تقود مواصفة التوليد») + تمرينين كانت صورتاهما **خاطئتين نمط حركة** فأُزيلتا
 * (single-leg-rdl كان يعرض جسر ألوية، وnordic-curl كان يعرض ثني أوتار جالسًا).
 *
 * اللغة البصرية هي نفسها لغة `build-machine-placeholders.mjs` حرفًا حرفًا:
 * خلفية متدرّجة داكنة + شبكة + توهّج، جسم فاتح `#e9edf3`، معدّات فولاذية
 * `#8b94a3`، مسار الحركة لهبيّ `#f26a21` منقّط «2 12»، شارة «رسم توضيحي
 * داخلي · قمّة». عمل أصلي — لا أشخاص حقيقيون ولا مادة طرف ثالث ولا علامات
 * تجارية ⇒ حكمه IN-HOUSE بلا التباس حقوق.
 *
 * لماذا وضعية مرسومة لا صورة «قريبة»: صورة تُشبه التمرين وليست إيّاه تكذب
 * على المستخدم في نمط الحركة (§5: صدق المعروض قبل كل شيء). الرسم يقول عن
 * نفسه ما هو — مخطّط حركة — ولا يدّعي فوتوغرافيا.
 *
 * التشغيل (يعيد توليد الأصول + خريطة exerciseIllustrations.ts):
 *   node scripts/media/build-exercise-illustrations.mjs
 * بعده يجب إعادة ختم سجلّ الحقوق:
 *   node scripts/media/media-rights-proof.mjs --bootstrap
 */
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT_DIR = resolve(ROOT, 'public/exercise-illustrations')
const MAP_FILE = resolve(ROOT, 'src/data/exerciseIllustrations.ts')

const BODY = '#e9edf3'
const STEEL = '#8b94a3'
const DARK = '#1b2028'
const PANEL = '#252c36'
const FLOOR = '#3a424f'
const EMBER = '#f26a21'

const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ── ذرّات الرسم ─────────────────────────────────────────────────────────────
const pts = (a) => a.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')
/** طرف/جذع: مسار مستدير الرأسين بسمك موحّد. */
const limb = (a, w = 13, c = BODY) =>
  `<path d="${pts(a)}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
const head = (x, y, r = 19) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${BODY}"/>`
const floor = (x1 = 232, x2 = 568, y = 356) =>
  `<path d="M${x1} ${y} H${x2}" stroke="${FLOOR}" stroke-width="10" stroke-linecap="round"/>`
const grip = (x, y) => `<circle cx="${x}" cy="${y}" r="6" fill="${EMBER}"/>`
/** مسار الحركة: منقّط لهبيّ بنمط الأجهزة نفسه. */
const dash = (d) =>
  `<path d="${d}" stroke="${EMBER}" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="2 12"/>`
const solid = (d) => `<path d="${d}" stroke="${EMBER}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
/** علامتا ثبات (تمرين إيزومتري): خطّان قصيران بدل سهم — لا نوهم بحركة ليست فيه. */
const holdMarks = (x, y) => solid(`M${x} ${y} h22`) + solid(`M${x} ${y + 14} h22`)
const barLine = (x1, y1, x2, y2, w = 7) =>
  `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${STEEL}" stroke-width="${w}" stroke-linecap="round"/>`
const plate = (cx, cy, r = 24) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${DARK}" stroke="${STEEL}" stroke-width="6"/>`
const pulley = (x, y) => `<circle cx="${x}" cy="${y}" r="10" fill="${DARK}" stroke="${STEEL}" stroke-width="5"/>`
const cable = (a) => `<path d="${pts(a)}" stroke="${STEEL}" stroke-width="4" fill="none" stroke-linecap="round"/>`
/** دمبل صغير بزاوية: قضيب + قرصان. */
const dumbbell = (cx, cy, ang = 0) =>
  `<g transform="translate(${cx} ${cy}) rotate(${ang})">` +
  `<path d="M-18 0 H18" stroke="${STEEL}" stroke-width="6" stroke-linecap="round"/>` +
  `<rect x="-26" y="-11" width="10" height="22" rx="3" fill="${DARK}" stroke="${STEEL}" stroke-width="4"/>` +
  `<rect x="16" y="-11" width="10" height="22" rx="3" fill="${DARK}" stroke="${STEEL}" stroke-width="4"/></g>`
/** مقعد/مسند بزاوية. */
const pad = (x, y, len, ang, w = 18) =>
  `<g transform="translate(${x} ${y}) rotate(${ang})"><rect x="0" y="${-w / 2}" width="${len}" height="${w}" rx="${w / 2}" fill="${PANEL}" stroke="${EMBER}" stroke-width="4"/></g>`
const box = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${DARK}" stroke="${STEEL}" stroke-width="5"/>`

// ── الوضعيات — ٣٧ رسمة حركة أصلية ──────────────────────────────────────────
// كل وضعية: منظر جانبي بمقياس موحّد (رأس r=19، الأرض y=356)، الجسم فاتح،
// المعدّات فولاذية، ومسار الحركة وحده لهبيّ. الترتيب أبجدي بالمعرّف.
const POSES = {
  'ankle-mobility': () =>
    floor() +
    `<path d="M292 170 V352" stroke="${STEEL}" stroke-width="6" stroke-linecap="round"/>` + // خط الحائط المرجعي
    head(420, 196) +
    limb([[418, 214], [400, 262]], 16) + // جذع مائل قليلًا للأمام
    limb([[400, 262], [344, 292], [346, 348]]) + // الرجل الأمامية: الركبة تتقدّم فوق أصابع القدم
    limb([[346, 348], [318, 350]]) + // القدم الأمامية
    limb([[400, 262], [452, 300], [468, 348]]) + // الرجل الخلفية راكعة
    limb([[416, 220], [372, 250], [352, 286]]) + // ذراع تتكئ على الركبة
    dash('M344 288 q-26 -6 -44 -2') +
    solid('M300 282 l10 -6 -2 12'),

  'assault-bike': () =>
    floor() +
    `<circle cx="492" cy="296" r="52" fill="none" stroke="${STEEL}" stroke-width="6"/>` + // عجلة المروحة
    `<g stroke="${STEEL}" stroke-width="4">` +
    ['M492 248 V344', 'M444 296 H540', 'M458 262 L526 330', 'M458 330 L526 262']
      .map((d) => `<path d="${d}"/>`).join('') + '</g>' +
    `<path d="M492 296 L430 350" stroke="${STEEL}" stroke-width="7" stroke-linecap="round"/>` + // هيكل سفلي
    `<path d="M448 214 L470 250" stroke="${STEEL}" stroke-width="7" stroke-linecap="round"/>` + // ذراع متحرّكة
    box(346, 306, 58, 18) + // قاعدة المقعد
    `<path d="M374 306 V350" stroke="${STEEL}" stroke-width="7"/>` +
    head(366, 176) +
    limb([[372, 194], [392, 252]], 16) +
    limb([[380, 206], [424, 200], [448, 216]]) + // ذراع للمقبض المتحرّك
    grip(448, 216) +
    limb([[392, 252], [428, 286], [420, 330]]) + // رجل على الدوّاسة
    limb([[392, 252], [372, 296], [398, 326]]) +
    dash('M540 250 a56 56 0 0 1 6 46') +
    solid('M544 288 l4 12 -12 -2'),

  'banded-lateral-walk': () =>
    floor() +
    head(392, 168) +
    limb([[394, 186], [400, 248]], 16) +
    limb([[400, 248], [352, 296], [344, 348]]) + // رجل ثابتة
    limb([[400, 248], [462, 292], [478, 348]]) + // رجل تخطو جانبًا
    limb([[396, 198], [356, 232], [368, 262]]) + // ذراعان على الوركين تقريبًا
    limb([[396, 198], [434, 234], [420, 262]]) +
    `<path d="M348 334 Q412 348 472 334" stroke="${EMBER}" stroke-width="7" fill="none" stroke-linecap="round"/>` + // رباط المقاومة حول الكاحلين
    dash('M492 300 h44') +
    solid('M528 292 l12 8 -12 8'),

  'battle-ropes': () =>
    floor() +
    `<circle cx="556" cy="344" r="9" fill="${DARK}" stroke="${STEEL}" stroke-width="5"/>` + // مرساة الحبال
    head(330, 172) +
    limb([[334, 190], [346, 252]], 16) +
    limb([[346, 252], [316, 300], [312, 350]]) + // وقفة نصف قرفصاء
    limb([[346, 252], [386, 298], [396, 350]]) +
    limb([[338, 202], [382, 224], [402, 240]]) + // الذراعان أمامًا على الحبلين
    limb([[338, 206], [376, 238], [396, 256]]) +
    grip(402, 240) + grip(396, 256) +
    `<path d="M404 238 q36 -26 72 6 t72 42" stroke="${STEEL}" stroke-width="6" fill="none" stroke-linecap="round"/>` +
    `<path d="M398 258 q40 34 76 6 t78 66" stroke="${STEEL}" stroke-width="6" fill="none" stroke-linecap="round"/>` +
    dash('M402 196 q6 -18 0 -34') +
    solid('M394 170 l8 -10 8 10'),

  'belt-squat': () =>
    box(272, 318, 86, 38) + box(442, 318, 86, 38) + // منصّتان
    floor(250, 550) +
    head(398, 152) +
    limb([[400, 170], [402, 232]], 16) +
    limb([[402, 232], [352, 268], [330, 314]]) + // قرفصاء على المنصّتين
    limb([[402, 232], [452, 268], [472, 314]]) +
    limb([[401, 182], [362, 210], [346, 240]]) + // ذراعان أمام الصدر
    limb([[401, 182], [438, 212], [420, 240]]) +
    `<path d="M382 232 H422" stroke="${EMBER}" stroke-width="8" stroke-linecap="round"/>` + // حزام الورك
    cable([[402, 238], [400, 300]]) +
    plate(400, 320, 18) + // الثقل المعلّق بين المنصّتين
    dash('M498 250 v54') + solid('M490 294 l8 12 8 -12'),

  'bicycle-crunch': () =>
    floor() +
    head(292, 264) +
    limb([[304, 278], [376, 322]], 16) + // الكتفان مرفوعان عن الأرض والحوض أرضًا
    limb([[310, 272], [352, 250], [386, 264]]) + // المرفق المقابل يعبر نحو الركبة
    limb([[376, 322], [428, 268], [472, 288]]) + // ركبة مسحوبة عاليًا نحو الصدر
    limb([[376, 322], [458, 336], [540, 312]]) + // الرجل الأخرى ممدودة منخفضة
    dash('M394 246 q22 4 40 20') +
    solid('M424 258 l14 6 -10 10'),

  'burpees': () =>
    floor() +
    head(318, 244) +
    limb([[330, 258], [386, 292]], 16) + // جذع منخفض
    limb([[336, 264], [330, 310], [332, 350]]) + // ذراعان إلى الأرض
    limb([[386, 292], [430, 306], [452, 348]]) + // رجلان مثنيّتان للقفز
    limb([[386, 292], [416, 322], [432, 352]]) +
    dash('M470 300 q40 -78 -18 -142') +
    solid('M440 166 l12 -8 2 14'),

  'cable-hip-adduction': () =>
    floor() +
    pulley(548, 344) +
    head(360, 162) +
    limb([[362, 180], [368, 244]], 16) +
    limb([[368, 244], [346, 300], [344, 350]]) + // الرجل الثابتة
    limb([[368, 244], [438, 280], [488, 316]]) + // الرجل العاملة ممدودة نحو البكرة
    limb([[363, 192], [326, 224], [336, 256]]) +
    limb([[363, 192], [398, 226], [386, 256]]) +
    cable([[540, 344], [494, 320]]) +
    `<path d="M482 310 l14 12" stroke="${EMBER}" stroke-width="8" stroke-linecap="round"/>` + // سوار الكاحل
    dash('M470 336 q-44 18 -92 12') +
    solid('M390 352 l-12 -4 8 -10'),

  'cable-shoulder-press': () =>
    floor() +
    pulley(276, 346) + pulley(524, 346) +
    head(400, 148) +
    limb([[400, 166], [400, 240]], 16) +
    limb([[400, 240], [368, 296], [362, 350]]) +
    limb([[400, 240], [432, 296], [438, 350]]) +
    limb([[400, 176], [354, 176], [340, 132]]) + // ذراعان في منتصف الضغط
    limb([[400, 176], [446, 176], [460, 132]]) +
    grip(340, 132) + grip(460, 132) +
    cable([[276, 340], [316, 240], [338, 140]]) +
    cable([[524, 340], [484, 240], [462, 140]]) +
    dash('M330 112 v-16 M470 112 v-16') +
    solid('M322 100 l8 -12 8 12') + solid('M462 100 l8 -12 8 12'),

  'cable-woodchop': () =>
    floor() +
    `<path d="M268 120 V352" stroke="${STEEL}" stroke-width="8" stroke-linecap="round"/>` + // عمود الكيبل
    pulley(276, 130) +
    head(408, 172) +
    limb([[406, 190], [416, 250]], 16) + // جذع مُدار
    limb([[416, 250], [382, 300], [374, 352]]) +
    limb([[416, 250], [470, 292], [488, 350]]) +
    limb([[404, 198], [372, 220], [352, 200]]) + // الذراعان ممسكتان معًا بالمقبض
    limb([[406, 202], [376, 226], [356, 206]]) +
    grip(350, 202) +
    cable([[282, 138], [346, 198]]) +
    dash('M366 218 q86 54 156 96') +
    solid('M508 306 l14 8 -14 6'),

  'chest-supported-row': () =>
    floor() +
    pad(318, 330, 156, -42) + // مسند مائل
    `<path d="M368 332 V352 M436 262 L462 350" stroke="${STEEL}" stroke-width="7" stroke-linecap="round"/>` +
    head(452, 208) +
    limb([[442, 222], [366, 288]], 16) + // الصدر على المسند
    limb([[380, 292], [408, 330], [452, 336]]) + // رجلان للخلف على الأرض
    limb([[428, 236], [420, 282], [430, 312]]) + // ذراع تسحب دمبل
    dumbbell(432, 318, 0) +
    dash('M462 306 q4 -26 -2 -44') +
    solid('M452 272 l8 -12 6 14'),

  'dumbbell-sumo-squat': () =>
    floor() +
    head(400, 158) +
    limb([[400, 176], [400, 238]], 16) +
    limb([[400, 238], [336, 268], [322, 330]]) + // وقفة سومو عريضة
    limb([[400, 238], [464, 268], [478, 330]]) +
    limb([[322, 330], [298, 348]]) + // قدمان منفرجتان
    limb([[478, 330], [502, 348]]) +
    limb([[400, 186], [388, 244], [396, 282]]) + // الذراعان معًا تمسكان الدمبل
    limb([[400, 186], [410, 244], [404, 282]]) +
    dumbbell(400, 296, 90) +
    dash('M400 318 v24 M400 262 v-24') +
    solid('M392 232 l8 -12 8 12'),

  'elliptical': () =>
    floor(250, 570) +
    `<path d="M520 350 V170" stroke="${STEEL}" stroke-width="8" stroke-linecap="round"/>` + // عمود أمامي
    box(496, 148, 52, 26) + // شاشة
    `<path d="M330 342 L432 330" stroke="${STEEL}" stroke-width="9" stroke-linecap="round"/>` + // دوّاستان
    `<path d="M362 328 L452 318" stroke="${STEEL}" stroke-width="9" stroke-linecap="round"/>` +
    `<path d="M472 300 L496 208" stroke="${STEEL}" stroke-width="6" stroke-linecap="round"/>` + // ذراع متحرّكة
    `<path d="M410 296 L462 206" stroke="${STEEL}" stroke-width="6" stroke-linecap="round"/>` +
    head(404, 152) +
    limb([[406, 170], [416, 232]], 16) +
    limb([[416, 232], [392, 288], [372, 334]]) + // رجل على الدوّاسة الخلفية
    limb([[416, 232], [448, 280], [442, 322]]) +
    limb([[408, 180], [446, 196], [464, 214]]) + // ذراع على المقبض
    grip(464, 214) +
    dash('M330 306 q60 -26 128 -6') +
    solid('M446 296 l14 4 -10 10'),

  'frog-pump': () =>
    floor() +
    head(288, 328) +
    limb([[306, 322], [394, 296]], 16) + // الظهر العلوي أرضًا والورك مرفوع
    limb([[394, 296], [452, 262], [498, 300]]) + // ركبتان منفرجتان
    limb([[394, 296], [446, 318], [498, 306]]) + // القدمان متلاصقتان
    `<path d="M494 292 l12 18" stroke="${BODY}" stroke-width="10" stroke-linecap="round"/>` +
    limb([[318, 318], [352, 336], [382, 344]]) + // ذراع مرتاحة أرضًا
    dash('M398 272 v-40') +
    solid('M390 240 l8 -12 8 12'),

  'high-knees': () =>
    floor() +
    head(396, 140) +
    limb([[398, 158], [402, 224]], 16) +
    limb([[402, 224], [354, 252], [332, 226]]) + // ركبة مرفوعة لمستوى الورك
    limb([[402, 224], [428, 288], [424, 350]]) + // رجل ارتكاز
    limb([[399, 168], [434, 196], [462, 178]]) + // ذراعا جري
    limb([[399, 168], [362, 190], [340, 168]]) +
    dash('M310 250 q-8 -34 10 -62') +
    solid('M312 196 l8 -12 8 10'),

  'hollow-hold': () =>
    floor() +
    head(302, 286) +
    limb([[286, 274], [252, 258]]) + // ذراعان ممدودتان خلف الرأس
    limb([[290, 280], [256, 268]]) +
    limb([[316, 296], [402, 330]], 16) + // أسفل الظهر أرضًا
    limb([[402, 330], [478, 306], [546, 288]]) + // رجلان مرفوعتان مفرودتان
    holdMarks(400, 250),

  'incline-treadmill-walk': () =>
    `<path d="M258 348 L540 296" stroke="${FLOOR}" stroke-width="12" stroke-linecap="round"/>` + // سير مائل
    `<path d="M262 352 L300 352 L540 306" stroke="${DARK}" stroke-width="4" fill="none"/>` +
    `<path d="M540 296 V170" stroke="${STEEL}" stroke-width="8" stroke-linecap="round"/>` +
    box(514, 150, 52, 24) +
    head(394, 148) +
    limb([[396, 166], [404, 230]], 16) +
    limb([[404, 230], [372, 282], [356, 330]]) + // خطوة مشي هادئة
    limb([[404, 230], [442, 278], [452, 316]]) +
    limb([[398, 176], [434, 200], [456, 190]]) +
    limb([[398, 176], [366, 202], [344, 190]]) +
    dash('M300 322 q110 -32 214 -50') +
    solid('M502 276 l14 -6 -4 14'),

  'jump-rope': () =>
    floor() +
    head(400, 138) +
    limb([[400, 156], [400, 222]], 16) +
    limb([[400, 222], [382, 280], [380, 336]]) + // قفزة خفيفة — القدمان فوق الأرض
    limb([[400, 222], [420, 280], [422, 336]]) +
    limb([[400, 166], [364, 196], [340, 218]]) + // ساعدان للخارج
    limb([[400, 166], [436, 196], [460, 218]]) +
    grip(340, 218) + grip(460, 218) +
    `<path d="M340 220 Q400 106 460 220" stroke="${STEEL}" stroke-width="4" fill="none"/>` + // الحبل فوق
    `<path d="M340 222 Q400 368 460 222" stroke="${STEEL}" stroke-width="4" fill="none" stroke-opacity="0.55"/>` +
    dash('M486 168 a96 96 0 0 1 -10 74') +
    solid('M472 234 l4 12 -14 -6'),

  'landmine-press': () =>
    floor() +
    `<path d="M282 344 l-10 10 M282 344 l10 10" stroke="${STEEL}" stroke-width="6" stroke-linecap="round"/>` + // مفصل الأرضية
    barLine(282, 344, 452, 210) + // بار اللاندماين
    plate(306, 326, 16) +
    head(468, 172) +
    limb([[466, 190], [452, 254]], 16) +
    limb([[452, 254], [412, 300], [398, 350]]) + // وقفة متقدّمة
    limb([[452, 254], [492, 302], [502, 350]]) +
    limb([[462, 198], [446, 216]]) + // الذراع الدافعة على طرف البار
    grip(452, 210) +
    dash('M462 196 q28 -30 48 -64') +
    solid('M504 146 l8 -12 4 14'),

  'leg-swings': () =>
    floor() +
    `<path d="M296 168 V352" stroke="${STEEL}" stroke-width="8" stroke-linecap="round"/>` + // عمود الاستناد
    head(374, 158) +
    limb([[376, 176], [382, 240]], 16) +
    limb([[376, 184], [336, 200], [304, 196]]) + // يد على العمود
    grip(300, 196) +
    limb([[382, 240], [392, 300], [388, 352]]) + // رجل ارتكاز
    limb([[382, 240], [446, 268], [498, 258]]) + // الرجل المتأرجحة أمامًا
    dash('M498 240 q-6 -58 -84 -74 M500 276 q10 52 -48 84') +
    solid('M424 160 l-14 2 8 12') + solid('M462 352 l-14 6 4 -14'),

  'meadows-row': () =>
    floor() +
    `<path d="M548 344 l-10 10 M548 344 l10 10" stroke="${STEEL}" stroke-width="6" stroke-linecap="round"/>` +
    barLine(548, 344, 366, 262) + // بار مثبّت الطرف
    plate(388, 272, 20) +
    head(322, 190) +
    limb([[330, 204], [392, 232]], 16) + // جذع منحنٍ فوق البار
    limb([[392, 232], [372, 292], [356, 348]]) +
    limb([[392, 232], [438, 286], [452, 348]]) +
    limb([[336, 212], [352, 244], [364, 262]]) + // ذراع تسحب الطرف
    grip(366, 262) +
    dash('M336 268 q-2 -24 8 -40') +
    solid('M338 240 l6 -14 8 12'),

  'mountain-climber': () =>
    floor() +
    head(296, 262) +
    limb([[312, 274], [432, 258]], 16) + // بلانك
    limb([[318, 278], [320, 316], [318, 350]]) + // ذراعان عموديّتان
    limb([[326, 280], [330, 318], [330, 352]]) +
    limb([[432, 258], [386, 296], [408, 330]]) + // ركبة مدفوعة للصدر
    limb([[432, 258], [498, 300], [546, 340]]) + // رجل ممدودة
    dash('M414 320 q-34 -12 -58 -30') +
    solid('M364 296 l-12 -6 10 -8'),

  'nordic-curl': () =>
    floor() +
    box(478, 330, 74, 26) + // وسادة تثبيت الكاحلين
    head(322, 184) +
    limb([[330, 200], [388, 300]], 16) + // خط مستقيم من الكتف للركبة (نزول مقاوم)
    limb([[388, 300], [426, 344]]) + // ساق راكعة
    limb([[426, 344], [492, 338]]) + // الكاحلان تحت الوسادة
    limb([[334, 210], [318, 254], [330, 288]]) + // ذراعان مستعدّتان للهبوط
    limb([[340, 214], [330, 258], [344, 290]]) +
    dash('M300 214 q-38 46 -28 108') +
    solid('M268 306 l4 14 12 -8'),

  'outdoor-walk': () =>
    floor(232, 568) +
    `<circle cx="286" cy="140" r="16" fill="none" stroke="${EMBER}" stroke-width="5"/>` + // شمس — إشارة خارجية
    `<path d="M240 318 H332 M468 318 H560" stroke="${FLOOR}" stroke-width="4" stroke-linecap="round"/>` + // أفق
    head(398, 150) +
    limb([[400, 168], [406, 232]], 16) +
    limb([[406, 232], [372, 286], [350, 334]]) + // خطوة مشي
    limb([[406, 232], [444, 282], [458, 332]]) +
    limb([[358, 350], [340, 336]], 10) + // قدمان
    limb([[450, 348], [472, 340]], 10) +
    limb([[400, 178], [436, 204], [458, 192]]) +
    limb([[400, 178], [368, 206], [346, 194]]) +
    dash('M482 260 h56') + solid('M528 252 l12 8 -12 8'),

  'pendlay-row': () =>
    floor() +
    barLine(268, 330, 452, 330, 7) + // البار على الأرض بين العدّتين
    plate(268, 330, 26) + plate(452, 330, 26) +
    head(292, 216) +
    limb([[306, 228], [408, 244]], 16) + // جذع أفقي
    limb([[408, 244], [420, 300], [412, 352]]) + // ركبتان مرنتان
    limb([[408, 244], [452, 296], [458, 352]]) +
    limb([[316, 234], [330, 288], [336, 322]]) + // ذراعان للبار
    grip(338, 328) +
    dash('M362 312 q0 -34 -8 -56') +
    solid('M348 274 l6 -14 8 12'),

  'pike-push-up': () =>
    floor() +
    head(330, 300) +
    limb([[344, 288], [428, 212]], 16) + // جذع صاعد لقمة البايك
    limb([[428, 212], [478, 280], [520, 344]]) + // رجلان مفرودتان
    limb([[340, 292], [322, 322], [314, 348]]) + // ذراعان نحو الأرض
    limb([[350, 296], [336, 326], [330, 350]]) +
    dash('M296 268 v56') +
    solid('M288 312 l8 12 8 -12'),

  'rowing-machine': () =>
    floor(250, 570) +
    `<path d="M282 332 L556 322" stroke="${STEEL}" stroke-width="8" stroke-linecap="round"/>` + // السكّة
    box(524, 258, 44, 62) + // صندوق المروحة
    `<path d="M508 316 l20 -22" stroke="${STEEL}" stroke-width="6" stroke-linecap="round"/>` + // مسند القدم
    head(330, 202) +
    limb([[338, 218], [378, 300]], 16) + // جذع مائل للخلف في نهاية السحبة
    box(362, 300, 40, 14) + // المقعد المنزلق
    limb([[378, 300], [452, 288], [506, 302]]) + // رجلان شبه ممدودتين
    limb([[344, 228], [388, 244], [408, 252]]) + // ذراعان ساحبتان للمقبض
    grip(412, 252) +
    cable([[418, 252], [524, 268]]) +
    dash('M470 232 h-92') + solid('M390 224 l-12 8 12 8'),

  'shoulder-dislocates': () =>
    floor() +
    head(400, 158) +
    limb([[400, 176], [400, 244]], 16) +
    limb([[400, 244], [378, 300], [374, 352]]) +
    limb([[400, 244], [424, 300], [428, 352]]) +
    limb([[400, 182], [348, 152], [312, 128]]) + // ذراعان عريضتان للعصا
    limb([[400, 182], [452, 152], [488, 128]]) +
    barLine(292, 122, 508, 122, 6) + // العصا
    grip(312, 126) + grip(488, 126) +
    dash('M508 108 a150 118 0 0 1 -6 118') +
    solid('M498 210 l4 14 -16 -4'),

  'single-arm-pushdown': () =>
    floor() +
    `<path d="M508 108 V352" stroke="${STEEL}" stroke-width="8" stroke-linecap="round"/>` + // عمود الكيبل
    pulley(498, 118) +
    cable([[492, 126], [462, 214]]) +
    head(414, 158) +
    limb([[416, 176], [424, 244]], 16) +
    limb([[424, 244], [398, 298], [390, 350]]) +
    limb([[424, 244], [452, 300], [458, 350]]) +
    limb([[419, 186], [452, 206], [462, 218]]) + // المرفق ملتصق والساعد يدفع
    grip(464, 220) +
    dash('M470 240 v64') +
    solid('M462 292 l8 14 8 -14'),

  'single-leg-hip-thrust': () =>
    floor() +
    box(252, 262, 92, 20) + `<path d="M268 282 V352 M330 282 V352" stroke="${STEEL}" stroke-width="6"/>` + // مقعد
    head(272, 236) +
    limb([[296, 252], [396, 246]], 16) + // الكتفان على المقعد والورك جسر مرفوع
    limb([[396, 246], [428, 296], [432, 348]]) + // الرجل الغارزة
    limb([[396, 246], [472, 236], [532, 252]]) + // الرجل الممدودة
    limb([[306, 258], [332, 288], [352, 302]]) + // ذراع مستندة
    dash('M398 220 v-42') +
    solid('M390 186 l8 -12 8 12'),

  'single-leg-rdl': () =>
    floor() +
    head(304, 212) +
    limb([[318, 224], [416, 216]], 16) + // جذع مفصلي أفقي
    limb([[416, 216], [412, 284], [418, 348]]) + // رجل الارتكاز
    limb([[416, 216], [488, 200], [548, 212]]) + // الرجل الخلفية مرفوعة بامتداد الجذع
    limb([[326, 232], [326, 286], [330, 310]]) + // ذراع متدلّية بدمبل
    dumbbell(332, 322, 0) +
    dash('M282 250 q-14 46 8 84') +
    solid('M282 322 l8 12 10 -10'),

  'stairmaster': () =>
    floor(250, 560) +
    box(452, 296, 62, 60) + box(490, 240, 62, 58) + box(528, 186, 40, 54) + // درجات صاعدة
    `<path d="M300 170 V352" stroke="${STEEL}" stroke-width="8" stroke-linecap="round"/>` + // ذراع المسند
    head(400, 142) +
    limb([[402, 160], [412, 224]], 16) +
    limb([[412, 224], [396, 282], [400, 330]]) + // قدم على الدرجة السفلى...
    limb([[412, 224], [464, 252], [478, 292]]) + // والأخرى تصعد للدرجة التالية
    limb([[404, 170], [366, 190], [332, 186]]) + // يد على المسند
    grip(328, 186) +
    dash('M432 150 q64 10 108 62') +
    solid('M530 200 l10 12 -16 2'),

  'stationary-bike': () =>
    floor() +
    `<circle cx="430" cy="308" r="20" fill="none" stroke="${STEEL}" stroke-width="6"/>` + // الكرنك
    `<g stroke="${STEEL}" stroke-width="7" stroke-linecap="round">` +
    `<path d="M366 244 L430 308"/>` + // أنبوب السرج
    `<path d="M430 308 L494 244"/>` + // الأنبوب الأمامي المائل
    `<path d="M494 244 L494 206"/>` + // عمود المقود
    `<path d="M478 204 L512 204"/>` + // المقود
    `<path d="M430 308 L430 348 M398 352 H462"/>` + // قاعدة الثبات
    `</g>` +
    box(340, 232, 52, 14) + // السرج
    head(346, 152) +
    limb([[352, 170], [366, 238]], 16) + // جذع مائل قليلًا للأمام
    limb([[356, 182], [428, 200], [486, 208]]) + // ذراعان للمقود
    grip(490, 208) +
    limb([[366, 238], [418, 276], [444, 322]]) + // رجل للدوّاسة السفلى
    limb([[366, 238], [402, 284], [412, 296]]) + // والأخرى في أعلى الدورة
    dash('M474 296 a44 44 0 0 1 -58 26') +
    solid('M424 326 l-14 -2 10 -12'),

  'thoracic-rotation': () =>
    floor() +
    head(304, 248) +
    limb([[318, 260], [420, 274]], 16) + // ظهر أفقي (وضعية الطاولة)
    limb([[326, 266], [326, 314], [324, 350]]) + // ذراع سند
    limb([[420, 274], [430, 316], [428, 352]]) + // فخذ عمودي
    limb([[420, 274], [456, 314], [452, 352]]) +
    limb([[322, 258], [330, 218], [352, 202]]) + // اليد خلف الرأس والمرفق يدور للأعلى
    dash('M366 196 a58 58 0 0 1 -50 -34') +
    solid('M330 158 l-14 2 8 12'),

  'toes-to-bar': () =>
    `<path d="M290 118 H510" stroke="${STEEL}" stroke-width="8" stroke-linecap="round"/>` + // العقلة
    `<path d="M298 118 V96 M502 118 V96" stroke="${STEEL}" stroke-width="6" stroke-linecap="round"/>` +
    head(410, 168) +
    limb([[372, 124], [396, 158]]) + // ذراعان معلّقتان
    limb([[436, 124], [416, 158]]) +
    grip(372, 122) + grip(436, 122) +
    limb([[406, 176], [416, 248]], 16) +
    limb([[416, 248], [372, 202], [336, 152]]) + // رجلان مرفوعتان نحو البار
    dash('M330 258 q-28 -62 6 -110') +
    solid('M332 140 l4 -14 10 10'),

  'treadmill-run': () =>
    `<path d="M258 340 H540" stroke="${FLOOR}" stroke-width="12" stroke-linecap="round"/>` + // سطح السير
    `<path d="M262 348 H536" stroke="${DARK}" stroke-width="4"/>` +
    `<path d="M540 336 V166" stroke="${STEEL}" stroke-width="8" stroke-linecap="round"/>` +
    box(514, 146, 52, 24) +
    head(380, 136) +
    limb([[382, 154], [394, 218]], 16) +
    limb([[394, 218], [352, 262], [318, 240]]) + // ركبة أمامية عالية (جري)
    limb([[394, 218], [428, 276], [452, 322]]) + // رجل دافعة خلفًا
    limb([[385, 164], [420, 188], [448, 172]]) + // ذراعا عدو
    limb([[385, 164], [350, 188], [326, 170]]) +
    dash('M300 318 q100 -18 208 -12') +
    solid('M494 300 l14 6 -12 8'),

  'wall-sit': () =>
    floor() +
    `<path d="M302 132 V352" stroke="${STEEL}" stroke-width="10" stroke-linecap="round"/>` + // الحائط
    head(336, 176) +
    limb([[336, 194], [336, 262]], 16) + // ظهر ملاصق للحائط
    limb([[336, 262], [420, 262]]) + // فخذان أفقيّتان
    limb([[420, 262], [420, 348]]) + // ساقان عموديّتان
    limb([[336, 204], [352, 250], [348, 274]]) + // ذراع على الفخذ
    holdMarks(452, 216),
}

// معرّف → [عربي، إنجليزي] — مستخرَجة حرفيًا من src/data/exercises.ts.
const NAMES = {
  'ankle-mobility': ['مرونة الكاحل', 'Ankle Mobility Drill'],
  'assault-bike': ['الدراجة الهوائية (أسولت)', 'Assault Bike'],
  'banded-lateral-walk': ['مشي جانبي بالمطاط', 'Banded Lateral Walk'],
  'battle-ropes': ['حبال القتال', 'Battle Ropes'],
  'belt-squat': ['سكوات بالحزام', 'Belt Squat'],
  'bicycle-crunch': ['كرنش الدراجة', 'Bicycle Crunch'],
  'burpees': ['بيربي', 'Burpees'],
  'cable-hip-adduction': ['ضم الفخذ كيبل', 'Cable Hip Adduction'],
  'cable-shoulder-press': ['ضغط كتف كيبل', 'Cable Shoulder Press'],
  'cable-woodchop': ['قطع الخشب كيبل', 'Cable Woodchop'],
  'chest-supported-row': ['تجديف بإسناد الصدر', 'Chest-Supported Row'],
  'dumbbell-sumo-squat': ['سكوات سومو دمبل', 'Dumbbell Sumo Squat'],
  'elliptical': ['الإليبتيكال', 'Elliptical'],
  'frog-pump': ['ضخّ الضفدع للجلوت', 'Frog Pump'],
  'high-knees': ['رفع الركب (جري ثابت)', 'High Knees'],
  'hollow-hold': ['ثبات الجسم المقعّر', 'Hollow Body Hold'],
  'incline-treadmill-walk': ['مشي مائل على السير', 'Incline Treadmill Walk'],
  'jump-rope': ['نط الحبل', 'Jump Rope'],
  'landmine-press': ['ضغط لاندماين', 'Landmine Press'],
  'leg-swings': ['أرجحة الأرجل (إحماء)', 'Leg Swings'],
  'meadows-row': ['تجديف ميدوز', 'Meadows Row'],
  'mountain-climber': ['تسلق الجبل', 'Mountain Climber'],
  'nordic-curl': ['نوردك كيرل', 'Nordic Hamstring Curl'],
  'outdoor-walk': ['مشي خارجي', 'Outdoor Walk'],
  'pendlay-row': ['تجديف بندلاي', 'Pendlay Row'],
  'pike-push-up': ['ضغط بايك', 'Pike Push-Up'],
  'rowing-machine': ['جهاز التجديف', 'Rowing Machine'],
  'shoulder-dislocates': ['مرونة الكتف بالعصا/المطاط', 'Shoulder Dislocates'],
  'single-arm-pushdown': ['دفع ترايسبس بذراع واحدة', 'Single-Arm Pushdown'],
  'single-leg-hip-thrust': ['دفع الورك برجل واحدة', 'Single-Leg Hip Thrust'],
  'single-leg-rdl': ['رفعة رومانية برجل واحدة', 'Single-Leg RDL'],
  'stairmaster': ['جهاز الدرج (ستيرماستر)', 'Stairmaster'],
  'stationary-bike': ['دراجة ثابتة', 'Stationary Bike'],
  'thoracic-rotation': ['تدوير الفقرات الصدرية', 'Thoracic Rotation'],
  'toes-to-bar': ['أصابع للبار', 'Toes to Bar'],
  'treadmill-run': ['جري على السير', 'Treadmill Run'],
  'wall-sit': ['جلسة الحائط', 'Wall Sit'],
}

const IDS = Object.keys(POSES).sort()
{
  const missingNames = IDS.filter((id) => !NAMES[id])
  const missingPoses = Object.keys(NAMES).filter((id) => !POSES[id])
  if (missingNames.length || missingPoses.length) {
    throw new Error(`عدم تطابق الوضعيات والأسماء: ${[...missingNames, ...missingPoses].join(', ')}`)
  }
}

function svgFor(id, nameAr, nameEn) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500" role="img" aria-label="${xml(nameAr)} — رسم توضيحي داخلي">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#12151b"/>
      <stop offset="0.5" stop-color="#1b2028"/>
      <stop offset="1" stop-color="#12151b"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.5">
      <stop offset="0" stop-color="${EMBER}" stop-opacity="0.20"/>
      <stop offset="1" stop-color="${EMBER}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0 H0 V40" fill="none" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="800" height="500" fill="url(#bg)"/>
  <rect width="800" height="500" fill="url(#grid)"/>
  <rect width="800" height="500" fill="url(#glow)"/>
  <g>${POSES[id]()}
  </g>
  <g font-family="'SF Arabic','Geeza Pro','Segoe UI',system-ui,sans-serif" direction="rtl">
    <g transform="translate(40 30) scale(0.34)" fill="none" stroke="${EMBER}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 60 L34 20 L62 60"/>
    </g>
    <text x="80" y="46" font-size="22" font-weight="800" fill="#e9edf3" text-anchor="start">قمّة</text>
    <text x="400" y="412" font-size="34" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(nameAr)}</text>
    <text x="400" y="444" font-size="18" font-weight="600" fill="#9099a6" text-anchor="middle" direction="ltr">${xml(nameEn)}</text>
    <text x="400" y="474" font-size="15" font-weight="700" fill="#6b7280" text-anchor="middle">رسم توضيحي داخلي · قمّة</text>
  </g>
</svg>
`
}

// ── التوليد ─────────────────────────────────────────────────────────────────
if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true })
mkdirSync(OUT_DIR, { recursive: true })
for (const id of IDS) {
  const [ar, en] = NAMES[id]
  writeFileSync(resolve(OUT_DIR, `${id}.svg`), svgFor(id, ar, en))
}

const mapTs = `// ⚙️ ملف مُولّد آليًا — لا تُحرّره يدويًا. لإعادة التوليد:  node scripts/media/build-exercise-illustrations.mjs
// خريطة: مُعرّف تمرين قانوني → رسم حركة داخلي (IN-HOUSE) في public/exercise-illustrations/.
//
// هذه تمارين لا تملك لقطة مرخّصة قابلة لإعادة التوزيع (أغلبها كارديو/إحماء/حركات كيبل
// خارج تغطية free-exercise-db)، وتمرينان أُزيلت صورتاهما لأنهما كانتا لنمط حركة مختلف
// (single-leg-rdl · nordic-curl — انظر docs/content/MEDIA-RIGHTS.md). فنعرض رسم حركة
// متجهيًا أصليًا نملك حقوقه بالكامل، يقول عن نفسه إنه رسم لا صورة — لا مادة «تشبه»
// التمرين فتضلّل. غياب الملف → البديل الأنيق (لا صورة مكسورة).
// التغطية الحالية: ${IDS.length} تمرينًا.

/** خريطة ثابتة: مُعرّف تمرين قانوني → مسار رسم الحركة الداخلي. */
export const exerciseIllustrations: Record<string, string> = {
${IDS.map((id) => `  '${id}': '/exercise-illustrations/${id}.svg',`).join('\n')}
}

/** رسم الحركة الداخلي لتمرين، أو undefined إن لم يكن له رسم. */
export function getExerciseIllustration(exerciseId: string): string | undefined {
  return exerciseIllustrations[exerciseId]
}
`
writeFileSync(MAP_FILE, mapTs)
console.log(`✅ ${IDS.length} رسم حركة → public/exercise-illustrations/ + src/data/exerciseIllustrations.ts`)
