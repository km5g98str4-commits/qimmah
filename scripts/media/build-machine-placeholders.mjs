#!/usr/bin/env node
/**
 * مولّد أصول داخلية (IN-HOUSE) لبطاقات الأجهزة — pipeline الهوية.
 *
 * يبني رسمًا توضيحيًا (schematic) مُوحّدًا لكل جهاز من الأجهزة الأربعة والعشرين التي لا تملك
 * لقطة جهاز مرخّصة قابلة لإعادة التوزيع. الرسم عمل أصلي 100% (SVG متجهي، بلا أشخاص ولا علامات
 * تجارية ولا مادة طرف ثالث) فيكون حكمه CLEARLY-LICENSED / IN-HOUSE بلا التباس حقوق.
 *
 * لماذا SVG لا raster: هو الصيغة الأصلية لـ pipeline الهوية (scripts/brand/render-mark.mjs)،
 * حتمي (نفس البايتات في كل تشغيل → SHA ثابت)، صغير، وقابل للتدقيق نصيًا (المصدر مقروء).
 *
 * التشغيل (يُعيد توليد الأصول + خريطة machineImages.ts):
 *   node scripts/media/build-machine-placeholders.mjs
 *
 * بعده يجب إعادة ختم سجل الحقوق:
 *   node scripts/media/media-rights-proof.mjs --bootstrap
 */
import { mkdirSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT_DIR = resolve(ROOT, 'public/exercise-machine-images')
const MAP_FILE = resolve(ROOT, 'src/data/machineImages.ts')

// خريطة الأجهزة: مُعرّف قانوني → الاسم العربي + الإنجليزي (مصدرها src/data/exercises.ts).
// الترتيب أبجدي بالمعرّف كي يبقى المخرَج حتميًا ومستقرًا في الـ diff.
const MACHINES = [
  // [مهمة الصور] الجهازان كانا الوحيدين في قائمة placeholder-only بلا رسم — صورتاهما
  // القديمتان كانتا لمحطة كيبل لا لجهاز الضغط، فحُذفتا وحلّ الرسم الداخلي محلّهما.
  ['chest-press-machine', 'جهاز ضغط صدر', 'Chest Press Machine'],
  ['incline-chest-press-machine', 'جهاز ضغط صدر علوي', 'Incline Chest Press Machine'],
  ['chest-supported-row-machine', 'تجديف بمسند صدر', 'Chest-Supported Row Machine'],
  ['decline-chest-press-machine', 'جهاز ضغط صدر سفلي', 'Decline Chest Press Machine'],
  ['glute-kickback-machine', 'جهاز ركل خلفي', 'Glute Kickback Machine'],
  ['glute-machine', 'جهاز الألوية', 'Glute Machine'],
  ['hack-squat-machine', 'هاك سكوات جهاز', 'Hack Squat Machine'],
  ['hip-abduction-machine', 'جهاز مباعدة الأرجل', 'Hip Abduction Machine'],
  ['hip-adductor-machine', 'جهاز ضم الفخذ', 'Hip Adductor Machine'],
  ['iso-lateral-chest-press', 'ضغط صدر أيزو-لاترال', 'Iso-Lateral Chest Press'],
  ['iso-lateral-high-row', 'تجديف عالي أيزو-لاترال', 'Iso-Lateral High Row'],
  ['iso-lateral-incline-press', 'ضغط علوي أيزو-لاترال', 'Iso-Lateral Incline Press'],
  ['iso-lateral-pulldown', 'سحب أيزو-لاترال', 'Iso-Lateral Pulldown'],
  ['lateral-raise-machine', 'جهاز رفرفة جانبية', 'Lateral Raise Machine'],
  ['pec-deck-machine', 'جهاز فلاي صدر', 'Pec Deck Machine'],
  ['preacher-curl-machine', 'جهاز مرجحة بايسبس', 'Preacher Curl Machine'],
  ['rear-delt-row-machine', 'تجديف كتف خلفي', 'Rear Delt Row Machine'],
  ['seated-calf-raise-machine', 'رفع بطات جالس', 'Seated Calf Raise Machine'],
  ['seated-leg-curl', 'ثني أرجل جالس', 'Seated Leg Curl'],
  ['shoulder-press-machine', 'جهاز ضغط كتف', 'Shoulder Press Machine'],
  ['single-arm-lat-pulldown', 'سحب علوي بذراع واحدة', 'Single-Arm Lat Pulldown'],
  ['standing-calf-raise-machine', 'رفع بطات واقف', 'Standing Calf Raise Machine'],
  ['standing-hip-extension-machine', 'مد ورك واقف', 'Standing Hip Extension Machine'],
  ['standing-leg-curl', 'ثني أرجل واقف', 'Standing Leg Curl'],
  ['triceps-extension-machine', 'جهاز مد ترايسبس', 'Triceps Extension Machine'],
  ['wide-grip-iso-lateral-pulldown', 'سحب أيزو-لاترال واسع', 'Wide-Grip Iso-Lateral Pulldown'],
]

const EMBER = '#f26a21'
const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// رسم متجهي موحّد لجهاز مقاومة عام: إطار قائم + رزمة أوزان + مقعد ومسند + ذراع وبكرة + سهم حركة.
// عمل أصلي — لا يدّعي أنه صورة الجهاز المحدّد، بل مخطّط هوية نظيف حتى تُصوَّر مجموعة أصلية.
const machineGlyph = `
    <g fill="none" stroke="#e9edf3" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
      <!-- قضيب الأرضية -->
      <path d="M232 356 H568" stroke="#3a424f" stroke-width="10"/>
      <!-- العمود الخلفي للإطار -->
      <path d="M486 150 V352" stroke="#8b94a3"/>
      <!-- الذراع العلوي والبكرة -->
      <circle cx="486" cy="150" r="12" fill="#1b2028" stroke="#8b94a3"/>
      <path d="M486 162 V208" stroke="#8b94a3" stroke-width="4"/>
      <!-- رزمة الأوزان -->
      <rect x="452" y="208" width="66" height="132" rx="9" fill="#1b2028" stroke="#8b94a3"/>
      <path d="M458 236 H512 M458 264 H512 M458 292 H512 M458 320 H512" stroke="#5b6474" stroke-width="4"/>
      <circle cx="485" cy="224" r="6" fill="${EMBER}" stroke="none"/>
      <!-- المسند الخلفي والمقعد -->
      <path d="M300 214 q-18 4 -18 26 V300" stroke="${EMBER}"/>
      <rect x="272" y="300" width="118" height="20" rx="10" fill="#252c36" stroke="${EMBER}"/>
      <path d="M300 320 V352" stroke="#8b94a3"/>
      <!-- ذراع الدفع والمقبض -->
      <path d="M322 226 H430" stroke="#e9edf3"/>
      <circle cx="322" cy="226" r="14" fill="#1b2028" stroke="${EMBER}"/>
      <!-- سهم الحركة -->
      <path d="M348 176 q60 -20 118 0" stroke="${EMBER}" stroke-width="5" stroke-dasharray="2 12"/>
      <path d="M462 168 l10 8 -12 8" stroke="${EMBER}" stroke-width="5"/>
    </g>`

function svgFor(nameAr, nameEn) {
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
  ${machineGlyph}
  <!-- شارة الهوية + نزاهة: رسم توضيحي داخلي (ليس صورة فوتوغرافية للجهاز المحدّد).
       توضع أعلى اليسار كي لا تصطدم برقائق العضلات التي تعرضها البطاقة أعلى اليمين (RTL). -->
  <g font-family="'SF Arabic','Geeza Pro','Segoe UI',system-ui,sans-serif" direction="rtl">
    <!-- علامة قمّة (chevron) -->
    <g transform="translate(40 30) scale(0.34)" fill="none" stroke="${EMBER}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 60 L34 20 L62 60"/>
    </g>
    <text x="80" y="46" font-size="22" font-weight="800" fill="#e9edf3" text-anchor="start">قمّة</text>
    <!-- اسم الجهاز + شارة النزاهة في المنتصف الآمن (text-anchor=middle يتجنّب قصّ RTL) -->
    <text x="400" y="412" font-size="34" font-weight="800" fill="#ffffff" text-anchor="middle">${xml(nameAr)}</text>
    <text x="400" y="444" font-size="18" font-weight="600" fill="#9099a6" text-anchor="middle" direction="ltr">${xml(nameEn)}</text>
    <text x="400" y="474" font-size="15" font-weight="700" fill="#6b7280" text-anchor="middle">رسم توضيحي داخلي · قمّة</text>
  </g>
</svg>
`
}

function buildMapFile(entries) {
  const rows = entries.map(([slug]) => `  '${slug}': '/exercise-machine-images/${slug}.svg',`).join('\n')
  return `// ⚙️ ملف مُولّد آليًا — لا تُحرّره يدويًا. لإعادة التوليد:  node scripts/media/build-machine-placeholders.mjs
// خريطة: مُعرّف جهاز قانوني → رسم توضيحي داخلي (IN-HOUSE) للجهاز في public/exercise-machine-images/.
//
// هذه بطاقات أجهزة لا تملك لقطة جهاز مرخّصة قابلة لإعادة التوزيع من أي مصدر (WorkoutX/free-exercise-db
// تعيدان وزنًا حرًّا، والملفات المحلّية السابقة كانت UNKNOWN/RESTRICTED بلا سلسلة حقوق — انظر
// docs/content/MEDIA-RIGHTS.md). فنعرض رسمًا توضيحيًا متجهيًا أصليًا (SVG) نملك حقوقه بالكامل،
// بدل مادة مقيّدة أو صورة «تشبه» الجهاز فتضلّل المستخدم. غياب الملف → البديل الأنيق (لا صورة مكسورة).
// التغطية الحالية: ${entries.length} جهازًا.

/** خريطة ثابتة: مُعرّف جهاز قانوني → مسار الرسم التوضيحي الداخلي. */
export const machineImages: Record<string, string> = {
${rows}
}

/** يُرجع مسار صورة الجهاز إن توفّرت، وإلا undefined (فيرجع المكوّن للبديل الأنيق). */
export function getMachineImage(exerciseId: string): string | undefined {
  return machineImages[exerciseId]
}
`
}

// 1) نظافة: احذف كل ملف قديم غير آمن (jpg/jpeg/png/webp/gif) من مسار الشحن — بما فيه أصل FITWILL.
mkdirSync(OUT_DIR, { recursive: true })
let removed = 0
for (const f of readdirSync(OUT_DIR)) {
  if (/\.(jpe?g|png|webp|gif)$/i.test(f)) {
    rmSync(resolve(OUT_DIR, f))
    removed++
  }
}

// 2) اكتب رسمًا توضيحيًا داخليًا لكل جهاز.
const sorted = [...MACHINES].sort((a, b) => a[0].localeCompare(b[0]))
for (const [slug, nameAr, nameEn] of sorted) {
  writeFileSync(resolve(OUT_DIR, `${slug}.svg`), svgFor(nameAr, nameEn))
}

// 3) أعد توليد الخريطة.
writeFileSync(MAP_FILE, buildMapFile(sorted))

console.log(`IN_HOUSE_SCHEMATICS_OK removed_unsafe=${removed} wrote_svg=${sorted.length} map=${existsSync(MAP_FILE)}`)
