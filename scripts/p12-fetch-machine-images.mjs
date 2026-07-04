#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// P12 — جلب صور **الأجهزة الحقيقية** لبطاقات الأجهزة التي لا نملك لها لقطة جهاز.
// يُشغَّل على ماك زياد (بيئة الوكيل بلا إنترنت). يقرأ PLACEHOLDER_ONLY_EXERCISE_IDS
// من src/data/exercises.ts، ولكل جهاز:
//   (أ) يجرّب WorkoutX أولًا: لقطة جهاز حقيقية (اسمها يدل على جهاز، لا بار/دمبل) → gif.
//   (ب) وإلا صورة من مصادر **مفتوحة الترخيص فقط** (Wikimedia Commons ثم Openverse؛ واختياريًا
//       Unsplash/Pexels عند وجود مفاتيح) بحثًا باسم الجهاز الإنجليزي.
//   (ج) صورة أفقية واحدة نظيفة → توحيد بـ sips (1024×576، JPEG) → public/exercise-machine-images/{slug}.jpg
//       (أو {slug}.gif لِلقطة WorkoutX)، مع طباعة المصدر + الترخيص وإلحاقهما بـ docs/product/P12_ASSETS.md.
//   (د) إن لم توجد صورة مقبولة في أي مصدر → يبقى على البديل الأنيق (placeholder).
//
// المبدأ (تطبيق تجاري): **لا صور محفوظة الحقوق**. المقبول فقط: Public Domain / CC0 / CC-BY / CC-BY-SA
// (مع حفظ الإسناد). يُرفض NC/ND/ARR وأي ترخيص غير معروف.
//
// التشغيل على الماك:
//   WORKOUTX_API_KEY=wx_xxx node scripts/p12-fetch-machine-images.mjs         # يجرّب WorkoutX ثم الويب
//   node scripts/p12-fetch-machine-images.mjs                                  # الويب فقط (بلا مفتاح)
//   UNSPLASH_ACCESS_KEY=... PEXELS_API_KEY=... node scripts/p12-fetch-machine-images.mjs  # + مصادر إضافية
//   node scripts/p12-fetch-machine-images.mjs --force   # يعيد جلب الموجود
//   node scripts/p12-fetch-machine-images.mjs --dry      # يطبع الخطة بلا تنزيل
// بعده:  node scripts/p12-sync-machine-images.mjs && npm run typecheck && npm run build
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT_DIR = resolve(ROOT, 'public/exercise-machine-images')
const ASSETS_DOC = resolve(ROOT, 'docs/product/P12_ASSETS.md')
const FORCE = process.argv.includes('--force')
const DRY = process.argv.includes('--dry')

const WORKOUTX_KEY = process.env.WORKOUTX_API_KEY || ''
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY || ''
const PEXELS_KEY = process.env.PEXELS_API_KEY || ''

const TARGET_W = 1024
const TARGET_H = 576 // 16:9 أفقي

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const UA = 'QimmahMachineImageFetcher/1.0 (educational; contact via repo)'

// ── قراءة قائمة الأجهزة (placeholder) + أسماؤها الإنجليزية من المصدر ──
function loadMachines() {
  const src = readFileSync(resolve(ROOT, 'src/data/exercises.ts'), 'utf8')
  const start = src.indexOf('PLACEHOLDER_ONLY_EXERCISE_IDS: readonly string[] = [')
  if (start === -1) throw new Error('PLACEHOLDER_ONLY_EXERCISE_IDS غير موجودة في exercises.ts')
  const open = src.indexOf('[', src.indexOf('= [', start))
  const ids = [...src.slice(open + 1, src.indexOf(']', open)).matchAll(/'([^']+)'/g)].map((m) => m[1])
  return ids.map((id) => {
    const m = src.match(new RegExp("ex\\(\\{ id: '" + id + "',[^\\n]*?nameEn: '([^']+)'"))
    return { id, nameEn: m ? m[1] : id.replace(/-/g, ' ') }
  })
}

// ── ترخيص: هل مسموح تجاريًا (PD/CC0/BY/BY-SA)؟ نرفض NC/ND/ARR وغير المعروف ──
function licenseAllowed(raw) {
  const s = String(raw || '').toLowerCase()
  if (!s) return false
  if (/(\bnc\b|non-?commercial|\bnd\b|no-?deriv|all rights reserved|copyright|arr)/.test(s)) return false
  return /(public domain|\bpdm\b|\bcc0\b|cc-?by(?!-?nc|-?nd)|creative commons attribution|\bby-sa\b|\bby\b)/.test(s)
}
const isLandscape = (w, h) => Number(w) > 0 && Number(h) > 0 && Number(w) >= Number(h)

// ── WorkoutX: لقطة جهاز حقيقية (اسم يدل على جهاز، لا وزن حرّ) ──
const MACHINE_HINT = /(machine|lever|sled|cable|smith|hack|pec deck|leg press|leg extension|leg curl|pulldown|assisted|seated)/i
const FREEWEIGHT_HINT = /(barbell|dumbbell|kettlebell|\bband\b|bodyweight|\bez[- ]?bar\b)/i
const WX_BASE = 'https://api.workoutxapp.com'

async function tryWorkoutX(nameEn) {
  if (!WORKOUTX_KEY) return null
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  const want = norm(nameEn)
  const wantTokens = new Set(want.split(' '))
  let best = null
  for (let page = 1; page <= 140; page++) {
    let list
    try {
      const res = await fetch(`${WX_BASE}/v1/exercises?page=${page}&limit=100`, {
        headers: { 'X-WorkoutX-Key': WORKOUTX_KEY, Accept: 'application/json' },
      })
      if (!res.ok) break
      const data = await res.json()
      list = Array.isArray(data) ? data : data.exercises || data.data || data.results || []
    } catch { break }
    if (!list || !list.length) break
    for (const ex of list) {
      const name = ex.name || ex.title || ex.exerciseName || ''
      if (!MACHINE_HINT.test(name) || FREEWEIGHT_HINT.test(name)) continue
      const gif = ex.gifUrl || ex.gif || ex.animatedUrl || ex.gif_url
      if (!gif || !/^https?:/.test(gif)) continue
      const toks = norm(name).split(' ')
      const overlap = toks.filter((t) => wantTokens.has(t)).length / Math.max(1, wantTokens.size)
      if (!best || overlap > best.overlap) best = { name, url: gif, overlap, ext: 'gif' }
    }
    await sleep(150)
  }
  // نقبل فقط تطابقًا معقولًا (≥0.6) واسمًا يدل على جهاز
  return best && best.overlap >= 0.6 ? { ...best, source: 'WorkoutX', license: 'WorkoutX API (machine footage)' } : null
}

// ── Wikimedia Commons (بلا مفتاح): صور CC/PD مع بيانات ترخيص ──
async function tryWikimedia(nameEn) {
  const q = encodeURIComponent(`${nameEn} gym machine`)
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|extmetadata|mime|size&iiurlwidth=1400&format=json&origin=*`
  let data
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    if (!res.ok) return null
    data = await res.json()
  } catch { return null }
  const pages = Object.values(data?.query?.pages || {})
  for (const p of pages) {
    const ii = p.imageinfo?.[0]
    if (!ii) continue
    if (!/image\/(jpeg|png)/i.test(ii.mime || '')) continue
    const md = ii.extmetadata || {}
    const lic = md.LicenseShortName?.value || md.License?.value || md.UsageTerms?.value || ''
    if (!licenseAllowed(lic)) continue
    if (!isLandscape(ii.thumbwidth || ii.width, ii.thumbheight || ii.height)) continue
    const artist = (md.Artist?.value || '').replace(/<[^>]+>/g, '').trim()
    return {
      url: ii.thumburl || ii.url,
      ext: 'jpg',
      source: 'Wikimedia Commons',
      pageUrl: ii.descriptionurl || p.title,
      license: lic.replace(/<[^>]+>/g, '').trim(),
      credit: artist,
    }
  }
  return null
}

// ── Openverse (بلا مفتاح): يجمّع صور CC، نطلب المرخّصة تجاريًا فقط ──
async function tryOpenverse(nameEn) {
  const q = encodeURIComponent(`${nameEn} gym machine`)
  const url = `https://api.openverse.org/v1/images/?q=${q}&license_type=commercial&mature=false&page_size=12`
  let data
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    if (!res.ok) return null
    data = await res.json()
  } catch { return null }
  for (const r of data?.results || []) {
    const lic = `${r.license || ''} ${r.license_version || ''}`.trim()
    if (!licenseAllowed(lic)) continue
    if (!isLandscape(r.width, r.height)) continue
    return {
      url: r.url,
      ext: 'jpg',
      source: `Openverse (${r.source || 'unknown'})`,
      pageUrl: r.foreign_landing_url || r.url,
      license: `CC ${lic.toUpperCase()}`,
      credit: r.creator || '',
    }
  }
  return null
}

// ── Unsplash / Pexels (اختياري بمفتاح؛ ترخيصهما يسمح بالاستخدام التجاري) ──
async function tryUnsplash(nameEn) {
  if (!UNSPLASH_KEY) return null
  try {
    const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(nameEn + ' gym machine')}&orientation=landscape&per_page=5`, {
      headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    const r = (data.results || [])[0]
    if (!r) return null
    return { url: r.urls.regular, ext: 'jpg', source: 'Unsplash', pageUrl: r.links.html, license: 'Unsplash License (free commercial)', credit: r.user?.name || '' }
  } catch { return null }
}
async function tryPexels(nameEn) {
  if (!PEXELS_KEY) return null
  try {
    const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(nameEn + ' gym machine')}&orientation=landscape&per_page=5`, {
      headers: { Authorization: PEXELS_KEY },
    })
    if (!res.ok) return null
    const data = await res.json()
    const r = (data.photos || [])[0]
    if (!r) return null
    return { url: r.src.large, ext: 'jpg', source: 'Pexels', pageUrl: r.url, license: 'Pexels License (free commercial)', credit: r.photographer || '' }
  } catch { return null }
}

// ── تنزيل ملف ──
async function download(url, absPath) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`تنزيل فشل ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(absPath, buf)
  return buf.length
}

// ── توحيد بـ sips (ماك): ملء 1024×576 أفقي ثم قصّ مركزي، JPEG ──
function standardize(absPath) {
  try {
    const dim = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', absPath]).toString()
    const w = Number(dim.match(/pixelWidth:\s*(\d+)/)?.[1] || 0)
    const h = Number(dim.match(/pixelHeight:\s*(\d+)/)?.[1] || 0)
    if (w && h) {
      // املأ الإطار: إن كانت أعرض من 16:9 ثبّت الارتفاع، وإلا ثبّت العرض — كي يغطّي القصّ 1024×576.
      if (w / h >= TARGET_W / TARGET_H) execFileSync('sips', ['--resampleHeight', String(TARGET_H), absPath])
      else execFileSync('sips', ['--resampleWidth', String(TARGET_W), absPath])
    }
    execFileSync('sips', ['-c', String(TARGET_H), String(TARGET_W), '-s', 'format', 'jpeg', absPath])
    return true
  } catch (e) {
    console.warn(`    ⚠ sips غير متاح/فشل (${e.message}) — الصورة محفوظة بلا توحيد.`)
    return false
  }
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })
  const machines = loadMachines()
  console.log(`▶ ${machines.length} جهازًا على البديل الأنيق. WorkoutX: ${WORKOUTX_KEY ? 'مفعّل' : 'بلا مفتاح'} • Unsplash: ${UNSPLASH_KEY ? 'مفعّل' : '—'} • Pexels: ${PEXELS_KEY ? 'مفعّل' : '—'}`)
  console.log(`الأفضلية: WorkoutX(جهاز) → Wikimedia → Openverse${UNSPLASH_KEY ? ' → Unsplash' : ''}${PEXELS_KEY ? ' → Pexels' : ''}. المقبول: PD/CC0/CC-BY/CC-BY-SA فقط.\n`)

  const ledger = [] // { id, result, source, pageUrl, license, credit }
  for (const { id, nameEn } of machines) {
    const jpg = resolve(OUT_DIR, `${id}.jpg`)
    const gif = resolve(OUT_DIR, `${id}.gif`)
    if (!FORCE && (existsSync(jpg) || existsSync(gif))) {
      console.log(`⏭ ${id} — موجود، تخطٍّ.`)
      ledger.push({ id, result: 'exists', source: '(present)', pageUrl: '', license: '', credit: '' })
      continue
    }
    if (DRY) { console.log(`(dry) ${id} ← «${nameEn}»`); continue }

    let hit = null
    for (const fn of [tryWorkoutX, tryWikimedia, tryOpenverse, tryUnsplash, tryPexels]) {
      try { hit = await fn(nameEn) } catch { hit = null }
      if (hit) break
      await sleep(200)
    }

    if (!hit) {
      console.log(`○ ${id} ← «${nameEn}» — لا صورة جهاز مقبولة (placeholder).`)
      ledger.push({ id, result: 'placeholder', source: '', pageUrl: '', license: '', credit: '' })
      continue
    }
    const out = resolve(OUT_DIR, `${id}.${hit.ext}`)
    try {
      const bytes = await download(hit.url, out)
      let kind = hit.ext === 'gif' ? 'workoutx-gif' : 'web-image'
      if (hit.ext !== 'gif') standardize(out)
      console.log(`⬇ ${id} ← [${kind}] ${hit.source} • ${hit.license}${hit.credit ? ' • ' + hit.credit : ''} (${Math.round(bytes / 1024)}KB)`)
      ledger.push({ id, result: kind, source: hit.source, pageUrl: hit.pageUrl || hit.url, license: hit.license, credit: hit.credit || '' })
    } catch (e) {
      console.log(`✗ ${id} — تنزيل فشل (${e.message}) → placeholder.`)
      ledger.push({ id, result: 'placeholder', source: '', pageUrl: '', license: '', credit: '' })
    }
    await sleep(400)
  }

  // ── إلحاق سجلّ المصادر/التراخيص بوثيقة الأصول ──
  const stamp = process.env.FETCH_DATE || 'run-date'
  const rows = ledger
    .map((l) => `| \`${l.id}\` | ${l.result} | ${l.source || '—'} | ${l.pageUrl ? `[link](${l.pageUrl})` : '—'} | ${l.license || '—'} | ${l.credit || '—'} |`)
    .join('\n')
  const block = `\n\n### 🖼️ سجلّ صور الأجهزة (p12-fetch-machine-images) — ${stamp}\n\n` +
    `| الجهاز | النتيجة | المصدر | الرابط | الترخيص | الإسناد |\n| --- | --- | --- | --- | --- | --- |\n${rows}\n`
  if (!DRY) appendFileSync(ASSETS_DOC, block)

  const by = (k) => ledger.filter((l) => l.result === k).length
  console.log(`\n══════════ الخلاصة ══════════`)
  console.log(`workoutx-gif: ${by('workoutx-gif')} • web-image: ${by('web-image')} • placeholder: ${by('placeholder')} • موجود: ${by('exists')}`)
  console.log(`سُجِّلت المصادر/التراخيص في docs/product/P12_ASSETS.md.`)
  console.log(`التالي:  node scripts/p12-sync-machine-images.mjs && npm run typecheck && npm run build`)
}

main().catch((e) => { console.error('✗', e.message); process.exit(1) })
