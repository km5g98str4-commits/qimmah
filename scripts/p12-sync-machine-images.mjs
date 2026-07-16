#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// P12 — مزامنة خريطة صور الأجهزة (src/data/machineImages.ts) مع الملفات الفعلية.
//
// ماذا يفعل:
//   1) يمسح public/exercise-machine-images/*.{jpg,jpeg,png,webp,gif} (اسم الملف = slug قانوني).
//   2) يبني خريطة slug → مسار، ويكتب src/data/machineImages.ts (مرتّبة أبجديًا، idempotent).
//
// المصدر: scripts/p12-fetch-machine-images.mjs يجلب صور الأجهزة ويحفظها هنا (على الماك).
// بعد الجلب:  node scripts/p12-sync-machine-images.mjs && npm run build
//
// التشغيل:  node scripts/p12-sync-machine-images.mjs           ← يكتب الملف
//           node scripts/p12-sync-machine-images.mjs --check   ← يتحقّق فقط (يفشل إن لم يكن متزامنًا)
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const IMG_DIR = resolve(ROOT, 'public/exercise-machine-images')
const OUT_FILE = resolve(ROOT, 'src/data/machineImages.ts')
const CHECK_ONLY = process.argv.includes('--check')
const IMG_RE = /\.(svg|jpg|jpeg|png|webp|gif)$/i

function main() {
  if (!existsSync(IMG_DIR)) mkdirSync(IMG_DIR, { recursive: true })
  const files = readdirSync(IMG_DIR).filter((f) => IMG_RE.test(f)).sort()

  const map = {}
  for (const f of files) {
    const slug = f.replace(IMG_RE, '')
    if (!map[slug]) map[slug] = `/exercise-machine-images/${f}`
    else console.warn(`⚠ ${slug}: ملف مكرّر ${f} تُجوهِل (المعتمد: ${map[slug]}).`)
  }

  const ordered = Object.keys(map).sort()
  const entries = ordered.map((k) => `  '${k}': '${map[k]}',`).join('\n')

  const out = `// ⚙️ ملف مُولّد آليًا — لا تُحرّره يدويًا. لإعادة التوليد:  node scripts/media/build-machine-placeholders.mjs
// خريطة: مُعرّف جهاز قانوني → رسم توضيحي داخلي (IN-HOUSE) للجهاز في public/exercise-machine-images/.
//
// هذه بطاقات أجهزة لا تملك لقطة جهاز مرخّصة قابلة لإعادة التوزيع من أي مصدر (WorkoutX/free-exercise-db
// تعيدان وزنًا حرًّا، والملفات المحلّية السابقة كانت UNKNOWN/RESTRICTED بلا سلسلة حقوق — انظر
// docs/content/MEDIA-RIGHTS.md). فنعرض رسمًا توضيحيًا متجهيًا أصليًا (SVG) نملك حقوقه بالكامل،
// بدل مادة مقيّدة أو صورة «تشبه» الجهاز فتضلّل المستخدم. غياب الملف → البديل الأنيق (لا صورة مكسورة).
// التغطية الحالية: ${ordered.length} جهازًا.

/** خريطة ثابتة: مُعرّف جهاز قانوني → مسار الرسم التوضيحي الداخلي. */
export const machineImages: Record<string, string> = {
${entries}${entries ? '\n' : ''}}

/** يُرجع مسار صورة الجهاز إن توفّرت، وإلا undefined (فيرجع المكوّن للبديل الأنيق). */
export function getMachineImage(exerciseId: string): string | undefined {
  return machineImages[exerciseId]
}
`

  const current = (() => { try { return readFileSync(OUT_FILE, 'utf8') } catch { return '' } })()
  if (current === out) {
    console.log(`✅ machineImages.ts متزامن (${ordered.length} مدخلًا، ${files.length} ملفًا).`)
    return
  }
  if (CHECK_ONLY) {
    console.error('⛔ machineImages.ts غير متزامن مع public/exercise-machine-images/ — شغّل: node scripts/p12-sync-machine-images.mjs')
    process.exit(1)
  }
  writeFileSync(OUT_FILE, out)
  console.log(`✅ كُتب machineImages.ts: ${ordered.length} مدخلًا من ${files.length} ملفًا.`)
}

main()
