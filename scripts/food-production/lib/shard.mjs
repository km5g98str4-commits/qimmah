// قِمّة — تقطيع المخرجات إلى شرائح موجَّهة بالمحتوى + فهارس بحث مصاحبة.
//
// ═══ لماذا شرائح لا ملفًّا واحدًا ═══
// مسار التخزين الحيّ اليوم (`src/features/products/store.ts`) يقرأ قاعدة المنتجات كاملة
// من localStorage ويحلّلها عند **كل** استعلام، وحصّة localStorage ≈ 5 ميغابايت. فملف
// واحد ضخم — أو مصفوفة مجمَّعة في الحزمة — لا يتّسع أصلًا ويجمّد الواجهة. لذلك:
//   • البحث بالباركود **مسار مفتاح مباشر**: تجزئة ثابتة ⇒ شريحة واحدة ⇒ مفتاح O(1).
//     لا مسح، ولا حاجة لقراءة بيان لمعرفة أين يقع الكود.
//   • البحث النصّي عبر **فهرس رمز←مواضع** لكل شريحة، يُحمَّل عند الحاجة لا دائمًا.
//   • «الطقم الساخن» ملف صغير منفصل يعمل بلا شبكة.

import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'

/** ميزانية الشريحة المضغوطة — هدف المنسّق: 200–500 كيلوبايت. */
export const SHARD_TARGET_GZIP_BYTES = { min: 200 * 1024, max: 500 * 1024 }
/** ميزانية الطقم الساخن المجمَّع في الحزمة — مذكورة صراحةً لتُقاس لا لتُفترض. */
export const HOT_SET_BUDGET_GZIP_BYTES = 120 * 1024

/**
 * تجزئة FNV-1a 32-بت — **ثابتة عبر اللغات والمنصّات**، فوقت التشغيل يحسب نفس
 * الشريحة التي حسبها خطّ الإنتاج بلا أي جدول توجيه.
 */
export function fnv1a(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/**
 * خلط نهائي (MurmurHash3 finalizer) — **ليس تجميلًا، بل إصلاح عطب مقيس**.
 *
 * ═══ العطب ═══
 * خانة تحقّق GTIN تجعل المجموع الموزون ≡ 0 (مod 10)، وبما أن 3 ≡ 1 (مod 2) فإن
 * **مجموع خانات أي GTIN صالح زوجي دائمًا** — أي أن عدد خاناته الفردية زوجي دائمًا.
 * وفي FNV-1a تكون البتّة الدنيا للناتج = 1 ^ (زوجية عدد المحارف الفردية)، فتخرج
 * **كل** بصمات الـGTIN فردية بلا استثناء. ومع `% N` لأي N زوجي، تُصيب الأرقام
 * الفردية نصف الجيوب فقط ⇒ **نصف الشرائح تبقى فارغة أبدًا**، والنصف الآخر بضعف حجمه.
 *
 * ═══ القياس ═══
 * على 40,000 سجلًا حقيقيًا: `N=30 ⇒ 15/30` شريحة مأهولة · `N=64 ⇒ 32/64`.
 * وبعد الخلط: كل الشرائح مأهولة وفروقها ضمن المعقول.
 *
 * الخلط ينثر البتّات العليا على الدنيا فيكسر هذا الارتباط. ويحرسه تأكيد توزيع
 * في `run-food-production-proof.mjs` يسقط باسمه إن عاد الانحياز.
 */
export function mix32(h) {
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b) >>> 0
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35) >>> 0
  h ^= h >>> 16
  return h >>> 0
}

/** الشريحة المسؤولة عن GTIN معيّن. الدالة نفسها تُنفَّذ وقت التشغيل. */
export function assignShard(gtin14, shardCount) {
  return mix32(fnv1a(gtin14)) % shardCount
}

export const shardName = (i, shardCount) =>
  `shard-${String(i).padStart(String(shardCount - 1).length, '0')}`

/** JSON حتمي: مفاتيح مرتّبة دائمًا ⇒ نفس المدخل ينتج نفس البايتات. */
export function stableStringify(value) {
  return JSON.stringify(value, (_k, v) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
    }
    return v
  })
}

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

/**
 * فهرس بحث مضغوط: رمز ← مواضع في مصفوفة سجلات الشريحة.
 * المواضع أعداد صغيرة، فهي أرخص كثيرًا من تكرار الـGTIN في كل قائمة.
 */
export function buildSearchIndex(records, tokenize) {
  const postings = new Map()
  records.forEach((rec, i) => {
    const text = [rec.name_ar, rec.name_en, rec.brand_ar, rec.brand_en, rec.category]
      .filter(Boolean)
      .join(' ')
    for (const token of tokenize(text)) {
      const list = postings.get(token)
      if (list) list.push(i)
      else postings.set(token, [i])
    }
  })
  const tokens = {}
  for (const key of [...postings.keys()].sort()) tokens[key] = postings.get(key)
  return tokens
}

/** يختار عدد الشرائح بحيث يقارب الحجم المضغوط منتصف الميزانية. */
export function chooseShardCount(records, bytesPerRecordGzipEstimate = 245) {
  const target = (SHARD_TARGET_GZIP_BYTES.min + SHARD_TARGET_GZIP_BYTES.max) / 2
  const perShard = Math.max(1, Math.floor(target / bytesPerRecordGzipEstimate))
  return Math.max(1, Math.ceil(records.length / perShard))
}

/**
 * يكتب الشرائح وفهارسها والبيان.
 * كل شريحة ملفّان: `<name>.json` (سجلات مفتاحها GTIN) و`<name>.idx.json` (فهرس البحث).
 */
export function writeShards({ records, outDir, shardCount, tokenize, normalizationVersion, schemaVersion }) {
  mkdirSync(outDir, { recursive: true })
  const buckets = Array.from({ length: shardCount }, () => [])
  for (const rec of records) buckets[assignShard(rec.gtin, shardCount)].push(rec)

  const shards = []
  let totalRaw = 0
  let totalGzip = 0
  let totalIdxGzip = 0

  buckets.forEach((bucket, i) => {
    bucket.sort((a, b) => (a.gtin < b.gtin ? -1 : a.gtin > b.gtin ? 1 : 0))
    const name = shardName(i, shardCount)

    // السجلات كخريطة مفتاحها GTIN ⇒ البحث بالباركود O(1) بعد التحميل.
    const byGtin = {}
    for (const rec of bucket) byGtin[rec.gtin] = rec
    const payload = {
      schema_version: schemaVersion,
      normalization_version: normalizationVersion,
      shard: name,
      shard_count: shardCount,
      count: bucket.length,
      licence: 'ODbL 1.0 — contains information from Open Food Facts (https://world.openfoodfacts.org), made available under the Open Database License.',
      records: byGtin,
    }
    const raw = Buffer.from(stableStringify(payload))
    const gz = gzipSync(raw, { level: 9 })
    writeFileSync(resolve(outDir, `${name}.json`), raw)
    writeFileSync(resolve(outDir, `${name}.json.gz`), gz)

    const idxPayload = {
      normalization_version: normalizationVersion,
      shard: name,
      order: bucket.map((r) => r.gtin),
      tokens: buildSearchIndex(bucket, tokenize),
    }
    const idxRaw = Buffer.from(stableStringify(idxPayload))
    const idxGz = gzipSync(idxRaw, { level: 9 })
    writeFileSync(resolve(outDir, `${name}.idx.json`), idxRaw)
    writeFileSync(resolve(outDir, `${name}.idx.json.gz`), idxGz)

    totalRaw += raw.length
    totalGzip += gz.length
    totalIdxGzip += idxGz.length

    shards.push({
      shard: name,
      count: bucket.length,
      bytes_raw: raw.length,
      bytes_gzip: gz.length,
      sha256: sha256(raw),
      sha256_gzip: sha256(gz),
      index_bytes_raw: idxRaw.length,
      index_bytes_gzip: idxGz.length,
      index_sha256: sha256(idxRaw),
      index_tokens: Object.keys(idxPayload.tokens).length,
      within_budget: gz.length >= SHARD_TARGET_GZIP_BYTES.min && gz.length <= SHARD_TARGET_GZIP_BYTES.max,
    })
  })

  return {
    shards,
    totals: {
      shard_count: shardCount,
      records: records.length,
      bytes_raw: totalRaw,
      bytes_gzip: totalGzip,
      index_bytes_gzip: totalIdxGzip,
      bytes_gzip_all: totalGzip + totalIdxGzip,
    },
  }
}

/**
 * يبني حمولة الطقم الساخن لعدد معيّن من السجلات (بلا كتابة) — لقياس الحجم قبل الالتزام به.
 * الترتيب داخل الملفّ بالـGTIN دائمًا، لكن **الاختيار** يتبع ترتيب `records` الوارد
 * (الأهمّ أولًا)، فالقصّ يُسقط الأقلّ أهمّية لا عشوائيًّا.
 */
function buildHotPayload(records, tokenize, normalizationVersion, schemaVersion) {
  const sorted = [...records].sort((a, b) => (a.gtin < b.gtin ? -1 : 1))
  const byGtin = {}
  for (const rec of sorted) byGtin[rec.gtin] = rec
  return {
    schema_version: schemaVersion,
    normalization_version: normalizationVersion,
    set: 'hot',
    count: sorted.length,
    budget_bytes_gzip: HOT_SET_BUDGET_GZIP_BYTES,
    licence: 'ODbL 1.0 — contains information from Open Food Facts, made available under the Open Database License. Qimmah-curated records are Qimmah-owned.',
    tokens: buildSearchIndex(sorted, tokenize),
    order: sorted.map((r) => r.gtin),
    records: byGtin,
  }
}

/**
 * أكبر عدد سجلات يتّسع داخل ميزانية الطقم الساخن المضغوطة.
 * **الميزانية تحكم العدد، لا العكس.** العدد الثابت كان يتجاوز الميزانية بمجرّد أن
 * تتحسّن البيانات (وقع فعلًا: ١٢٠٫٣ ك.ب مقابل سقف ١٢٠) — ورفع السقف عندها كان سيكون
 * تدليسًا على قيد أُعلن. فالحلّ أن يُقصّ الذيل الأقلّ أهمّية حتى يتّسع.
 */
export function fitHotSetToBudget(records, tokenize, normalizationVersion, schemaVersion) {
  let lo = 0
  let hi = records.length
  let best = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (mid === 0) { lo = 1; continue }
    const payload = buildHotPayload(records.slice(0, mid), tokenize, normalizationVersion, schemaVersion)
    const size = gzipSync(Buffer.from(stableStringify(payload)), { level: 9 }).length
    if (size <= HOT_SET_BUDGET_GZIP_BYTES) { best = mid; lo = mid + 1 } else { hi = mid - 1 }
  }
  return best
}

/** يكتب الطقم الساخن (ملف واحد صغير) ويعيد قياسه مقابل الميزانية المعلنة. */
export function writeHotSet({ records, outDir, tokenize, normalizationVersion, schemaVersion }) {
  mkdirSync(outDir, { recursive: true })
  const sorted = [...records].sort((a, b) => (a.gtin < b.gtin ? -1 : 1))
  const byGtin = {}
  for (const rec of sorted) byGtin[rec.gtin] = rec
  const payload = {
    schema_version: schemaVersion,
    normalization_version: normalizationVersion,
    set: 'hot',
    count: sorted.length,
    budget_bytes_gzip: HOT_SET_BUDGET_GZIP_BYTES,
    licence: 'ODbL 1.0 — contains information from Open Food Facts, made available under the Open Database License. Qimmah-curated records are Qimmah-owned.',
    tokens: buildSearchIndex(sorted, tokenize),
    order: sorted.map((r) => r.gtin),
    records: byGtin,
  }
  const raw = Buffer.from(stableStringify(payload))
  const gz = gzipSync(raw, { level: 9 })
  writeFileSync(join(outDir, 'hot-set.json'), raw)
  writeFileSync(join(outDir, 'hot-set.json.gz'), gz)
  return {
    count: sorted.length,
    bytes_raw: raw.length,
    bytes_gzip: gz.length,
    sha256: sha256(raw),
    budget_bytes_gzip: HOT_SET_BUDGET_GZIP_BYTES,
    within_budget: gz.length <= HOT_SET_BUDGET_GZIP_BYTES,
  }
}
