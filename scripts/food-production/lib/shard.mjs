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

/** الشريحة المسؤولة عن GTIN معيّن. الدالة نفسها تُنفَّذ وقت التشغيل. */
export function assignShard(gtin14, shardCount) {
  return fnv1a(gtin14) % shardCount
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
export function chooseShardCount(records, bytesPerRecordGzipEstimate = 190) {
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
