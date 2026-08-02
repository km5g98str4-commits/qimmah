#!/usr/bin/env node
/**
 * مولّد كتالوج وسائط التمارين (P10) — يبني src/data/exerciseMediaManifest.generated.ts
 * لكل تمارين الكتالوج (181): إطار بداية/نهاية بمقاساته الحقيقية المفحوصة من ملفات JPEG
 * على القرص، مع المصدر والترخيص من سجلّ الحقوق المُراجَع (scripts/media/provenance-manifest.json).
 *
 *   node scripts/build-media-manifest.mjs           # يعيد التوليد ويكتب الملف
 *   node scripts/build-media-manifest.mjs --check   # يفشل إذا كان الملف المُلتزَم قد انحرف
 *
 * مبادئ صدق (يفرضها npm run test:media-pipeline):
 * - gif/video = null دائمًا حاليًا — لا يوجد مصدر GIF/فيديو نظيف الحقوق (روابط «بحث يوتيوب»
 *   في exercises.ts ليست وسائط ولا تدخل هذا الكتالوج أبدًا).
 * - أصل بلا صف مُراجَع في سجلّ الحقوق ⇒ license: 'unverified' — لا يُخترع ترخيص أبدًا.
 * - التمرين بلا وسائط يُدرج بحالة صريحة ('placeholder-only' أو 'missing') لا يُحذف بصمت.
 */
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { mkdtempSync } from 'node:fs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = resolve(ROOT, 'public')
const OUT_FILE = resolve(ROOT, 'src/data/exerciseMediaManifest.generated.ts')
const PROVENANCE = resolve(ROOT, 'scripts/media/provenance-manifest.json')
const CHECK = process.argv.includes('--check')

// ── 1) قراءة كتالوج التمارين وخريطة الوسائط من مصدر الحقيقة (bundle ثم تنفيذ) ──
async function loadCatalog() {
  const entrySource = `
import { exercises, PLACEHOLDER_ONLY_EXERCISE_IDS, LEGACY_EXERCISE_ID_MAP } from '@/data/exercises'
import { exerciseMedia } from '@/data/exerciseMedia'
console.log('__CATALOG__' + JSON.stringify({
  ids: exercises.map((e) => e.id),
  placeholderOnly: [...PLACEHOLDER_ONLY_EXERCISE_IDS],
  legacyMap: LEGACY_EXERCISE_ID_MAP,
  media: exerciseMedia,
}))
`
  const dir = mkdtempSync(join(tmpdir(), 'media-manifest-'))
  const entry = join(dir, 'entry.ts')
  writeFileSync(entry, entrySource)
  const banner = `
globalThis.window = undefined;
globalThis.document = undefined;
`
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    banner: { js: banner },
    alias: { '@': resolve(ROOT, 'src') },
    define: { 'import.meta.env': JSON.stringify({ MODE: 'build', DEV: false, PROD: true }) },
    logLevel: 'warning',
  })
  const bundled = join(dir, 'entry.mjs')
  writeFileSync(bundled, result.outputFiles[0].text)
  const stdout = execFileSync(process.execPath, [bundled], { encoding: 'utf8' })
  const line = stdout.split('\n').find((l) => l.startsWith('__CATALOG__'))
  if (!line) throw new Error('catalog extraction failed')
  return JSON.parse(line.slice('__CATALOG__'.length))
}

// ── 2) فحص مقاسات JPEG من البايتات مباشرة (قراءة علامات SOF) — صفر اعتماديات ──
export function jpegDimensions(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
  let offset = 2
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1
      continue
    }
    const marker = bytes[offset + 1]
    // علامات SOF0..SOF15 (عدا DHT/JPG/DAC) تحمل الأبعاد
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = bytes.readUInt16BE(offset + 5)
      const width = bytes.readUInt16BE(offset + 7)
      return width > 0 && height > 0 ? { width, height } : null
    }
    const length = bytes.readUInt16BE(offset + 2)
    if (length < 2) return null
    offset += 2 + length
  }
  return null
}

function probeAsset(publicPath) {
  const abs = join(PUBLIC, publicPath.replace(/^\//, ''))
  if (!existsSync(abs)) return null
  const bytes = readFileSync(abs)
  const dims = jpegDimensions(bytes)
  if (!dims) return null
  return { path: publicPath, width: dims.width, height: dims.height, bytes: statSync(abs).size }
}

// ── 3) الحقوق: صفوف السجلّ المُراجَع مفهرسة بالمسار المحلّي — لا اختراع لأي ترخيص ──
function loadProvenanceByPath() {
  const manifest = JSON.parse(readFileSync(PROVENANCE, 'utf8'))
  const byPath = new Map()
  for (const entry of manifest.entries) {
    byPath.set(entry.localPath, entry)
  }
  return byPath
}

function rightsFor(byPath, stillPaths) {
  const rows = stillPaths.map((p) => byPath.get(p)).filter(Boolean)
  if (rows.length !== stillPaths.length) {
    // أصل موجود على القرص بلا صف مُراجَع — يُعلن «غير مُتحقَّق» بصدق، لا يُخترع ترخيص.
    return { source: 'unknown', license: 'unverified', attribution: null }
  }
  const [first] = rows
  const consistent = rows.every((r) => r.sourceId === first.sourceId && r.license === first.license)
  if (!consistent) return { source: 'unknown', license: 'unverified', attribution: null }
  return {
    source: first.sourceId,
    license: first.license,
    attribution: first.attributionRequired ? (first.sourceRepo ?? first.sourceId) : null,
  }
}

// ── 4) التوليد ──────────────────────────────────────────────────────────────
function renderAsset(asset) {
  return `{ "path": ${JSON.stringify(asset.path)}, "width": ${asset.width}, "height": ${asset.height}, "bytes": ${asset.bytes} }`
}

async function main() {
  const { ids, placeholderOnly, legacyMap, media } = await loadCatalog()
  const byPath = loadProvenanceByPath()
  const placeholderSet = new Set(placeholderOnly)

  // نفس ترتيب حلّ المكوّن ExerciseMedia: المعرّف القانوني ← الأسماء القديمة المقابلة له.
  const canonicalToLegacy = {}
  for (const [legacy, canonical] of Object.entries(legacyMap)) {
    ;(canonicalToLegacy[canonical] ??= []).push(legacy)
  }
  const resolveMedia = (id) => {
    for (const candidate of [id, ...(canonicalToLegacy[id] ?? [])]) {
      if (media[candidate]) return media[candidate]
    }
    return undefined
  }

  const entries = []
  const missingIds = []
  let stillsCount = 0

  for (const id of ids) {
    const mapped = resolveMedia(id)
    let entry
    if (mapped && !placeholderSet.has(id)) {
      const start = probeAsset(mapped.img0)
      const end = probeAsset(mapped.img1)
      if (!start || !end) {
        throw new Error(`exercise ${id}: mapped media missing on disk or unreadable (${mapped.img0}, ${mapped.img1})`)
      }
      const rights = rightsFor(byPath, [mapped.img0, mapped.img1])
      stillsCount += 1
      entry = { id, status: 'stills', stillStart: start, stillEnd: end, rights }
    } else {
      const status = placeholderSet.has(id) ? 'placeholder-only' : 'missing'
      if (status === 'missing') missingIds.push(id)
      entry = { id, status, stillStart: null, stillEnd: null, rights: null }
    }
    entries.push(entry)
  }

  const lines = entries.map((e) => {
    if (e.status !== 'stills') {
      return `  ${JSON.stringify(e.id)}: { "id": ${JSON.stringify(e.id)}, "status": ${JSON.stringify(e.status)}, "stillStart": null, "stillEnd": null, "gif": null, "video": null, "source": null, "license": null, "attribution": null },`
    }
    return (
      `  ${JSON.stringify(e.id)}: { "id": ${JSON.stringify(e.id)}, "status": "stills", ` +
      `"stillStart": ${renderAsset(e.stillStart)}, "stillEnd": ${renderAsset(e.stillEnd)}, ` +
      `"gif": null, "video": null, ` +
      `"source": ${JSON.stringify(e.rights.source)}, "license": ${JSON.stringify(e.rights.license)}, ` +
      `"attribution": ${e.rights.attribution === null ? 'null' : JSON.stringify(e.rights.attribution)} },`
    )
  })

  const output = `// ⚙️ ملف مُولّد آليًا — لا تُحرّره يدويًا. المولّد: scripts/build-media-manifest.mjs
// إعادة التوليد: node scripts/build-media-manifest.mjs · الحارس: npm run test:media-pipeline
// التغطية: ${stillsCount}/${ids.length} تمرينًا بإطارَي بداية/نهاية حقيقيَّين (المقاسات مفحوصة من الملفات).
// gif/video = null بصدق — لا مصدر متحرّك نظيف الحقوق حاليًا (روابط «بحث يوتيوب» ليست وسائط).
// الحقوق من سجلّ scripts/media/provenance-manifest.json المُراجَع — أصل بلا صف = 'unverified'.

/** أصل صورة واحد: مسار عام + مقاسات حقيقية مفحوصة وقت التوليد. */
export interface ExerciseMediaAsset {
  path: string
  width: number
  height: number
  /** حجم الملف بالبايت — لموازنة أداء التحميل المسبق. */
  bytes: number
}

/**
 * حالة وسائط التمرين — صادقة دائمًا:
 * stills = إطارا بداية/نهاية حقيقيان · placeholder-only = بطاقة جهاز تُعرض بالبديل
 * الأنيق عمدًا (لا تُطابَق بصور وزن حرّ خاطئة) · missing = لا وسائط مطابقة بعد.
 */
export type ExerciseMediaStatus = 'stills' | 'placeholder-only' | 'missing'

export interface ExerciseMediaManifestEntry {
  id: string
  status: ExerciseMediaStatus
  stillStart: ExerciseMediaAsset | null
  stillEnd: ExerciseMediaAsset | null
  /** لا مصدر GIF نظيف الحقوق حاليًا — null بصدق (أصول WorkoutX المُعلَّمة أُزيلت في P0). */
  gif: ExerciseMediaAsset | null
  /** لا فيديو مضمَّن — روابط «بحث يوتيوب» في exercises.ts ليست وسائط ولا تدخل هنا. */
  video: ExerciseMediaAsset | null
  source: string | null
  license: string | null
  attribution: string | null
}

/** عدد التمارين المغطاة بإطارات حقيقية. */
export const MEDIA_STILLS_COVERAGE = ${stillsCount}
/** إجمالي تمارين الكتالوج وقت التوليد. */
export const MEDIA_CATALOG_TOTAL = ${ids.length}
/** تمارين بلا وسائط مطابقة بعد (لا تشمل بطاقات placeholder-only المتعمّدة). */
export const MEDIA_MISSING_IDS: readonly string[] = ${JSON.stringify(missingIds, null, 2)}

export const exerciseMediaManifest: Record<string, ExerciseMediaManifestEntry> = {
${lines.join('\n')}
}
`

  if (CHECK) {
    const current = existsSync(OUT_FILE) ? readFileSync(OUT_FILE, 'utf8') : ''
    if (current !== output) {
      console.error('✗ exerciseMediaManifest.generated.ts منحرف عن مصادره — أعد التوليد: node scripts/build-media-manifest.mjs')
      process.exit(1)
    }
    console.log(`✓ الكتالوج مطابق لمصادره (${stillsCount}/${ids.length} تغطية، ${missingIds.length} ناقصة)`)
    return
  }

  writeFileSync(OUT_FILE, output)
  console.log(`✓ كُتب ${OUT_FILE}`)
  console.log(`  التغطية: ${stillsCount}/${ids.length} · placeholder-only: ${placeholderOnly.length} · ناقصة: ${missingIds.length}`)
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isDirectRun) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
