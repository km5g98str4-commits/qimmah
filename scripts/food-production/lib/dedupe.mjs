// قِمّة — إزالة التكرار بتسلسل صارم.
//
// الترتيب ملزم ولا يُقفز فيه:
//   ١. GTIN صالح مطابق          (يقين — نفس السلعة عالميًا)
//   ٢. معرّف سجل المصدر مطابق   (يقين داخل المصدر)
//   ٣. مفتاح مطبَّع: علامة+اسم+حجم (ترجيح قوي)
//   ٤. مرشّح ضبابي              ⇒ **طابور مراجعة، لا دمج**
//
// ⛔ **لا يُدمج أبدًا سجلان يحملان GTINين صالحين مختلفين** — مهما تشابه الاسم.
//    اختلاف الـGTIN يعني سلعتين مختلفتين بحكم التعريف، والتشابه لا ينقض ذلك.

/** أولوية المصادر عند التعارض — الأعلى يفوز بالحقل المتنازع عليه. */
const SOURCE_RANK = { qimmah_curated: 3, openfoodfacts: 2, usda_fdc: 1 }

/** المفتاح الثالث: علامة + اسم + حجم الحصّة، كلّها مطبَّعة. */
export function normalizedKey(rec, normalizeProductKey) {
  const brand = normalizeProductKey(rec.brand_en ?? rec.brand_ar ?? '')
  const name = normalizeProductKey(rec.name_en ?? rec.name_ar ?? '')
  if (!name) return null
  const size = rec.serving_size !== null ? `${Math.round(rec.serving_size)}${rec.serving_unit ?? ''}` : ''
  return `${brand}|${name}|${size}`
}

/** أيّ السجلّين أجدر بالبقاء: الثقة ثم رتبة المصدر ثم أحدث تحديث. */
function better(a, b) {
  if (a.confidence !== b.confidence) return a.confidence > b.confidence ? a : b
  const ra = SOURCE_RANK[a.source] ?? 0
  const rb = SOURCE_RANK[b.source] ?? 0
  if (ra !== rb) return ra > rb ? a : b
  const ta = Date.parse(a.source_updated_at ?? '') || 0
  const tb = Date.parse(b.source_updated_at ?? '') || 0
  return tb > ta ? b : a
}

/** هل تتعارض القيم الغذائية جوهريًا بين سجلين؟ (يُبلَّغ عنه ولا يُدمج صامتًا) */
function nutritionConflict(a, b) {
  const fields = ['energy_kcal', 'protein_g', 'carbs_g', 'fat_g']
  return fields.some((f) => {
    const av = a[f]
    const bv = b[f]
    if (typeof av !== 'number' || typeof bv !== 'number' || av <= 0 || bv <= 0) return false
    return Math.abs(av - bv) > Math.max(av, bv) * 0.15
  })
}

/**
 * ينفّذ التسلسل على دفعة سجلات.
 * يعيد: المقبول النهائي · طابور المراجعة الضبابي · التعارضات · الإحصاءات.
 */
export function dedupe(records, normalizeProductKey) {
  const byGtin = new Map()
  const conflicts = []
  let mergedByGtin = 0
  let mergedBySourceId = 0
  let mergedByNormalizedKey = 0

  // ══ المستوى ١: GTIN صالح — فضاء المفاتيح الموحَّد (GTIN-14) ══
  for (const rec of records) {
    const existing = byGtin.get(rec.gtin)
    if (!existing) { byGtin.set(rec.gtin, rec); continue }
    if (nutritionConflict(existing, rec)) {
      conflicts.push({
        gtin: rec.gtin,
        reason: 'nutrition_divergence',
        a: { source: existing.source, id: existing.source_record_id, kcal: existing.energy_kcal },
        b: { source: rec.source, id: rec.source_record_id, kcal: rec.energy_kcal },
      })
    }
    byGtin.set(rec.gtin, better(existing, rec))
    mergedByGtin++
  }

  // ══ المستوى ٢: معرّف سجل المصدر (داخل المصدر الواحد) ══
  const bySourceId = new Map()
  for (const rec of byGtin.values()) {
    const key = `${rec.source}::${rec.source_record_id}`
    const existing = bySourceId.get(key)
    if (!existing) { bySourceId.set(key, rec); continue }
    bySourceId.set(key, better(existing, rec))
    mergedBySourceId++
  }

  // ══ المستوى ٣: مفتاح مطبَّع (علامة+اسم+حجم) ══
  // ⛔ الحارس القاطع: لا يُدمج مفتاحان يحملان GTINين صالحين مختلفين.
  const byKey = new Map()
  const survivors = []
  for (const rec of bySourceId.values()) {
    const key = normalizedKey(rec, normalizeProductKey)
    if (!key) { survivors.push(rec); continue }
    const existing = byKey.get(key)
    if (!existing) { byKey.set(key, rec); continue }
    if (existing.gtin !== rec.gtin) {
      // نفس الاسم والعلامة والحجم، وGTINان مختلفان صالحان ⇒ **سلعتان**، لا تُدمجان.
      conflicts.push({
        reason: 'same_key_distinct_gtin',
        key,
        gtins: [existing.gtin, rec.gtin],
        note: 'NOT merged — distinct valid GTINs are distinct trade items by definition.',
      })
      survivors.push(rec)
      continue
    }
    byKey.set(key, better(existing, rec))
    mergedByNormalizedKey++
  }

  const accepted = [...byKey.values(), ...survivors]

  // ══ المستوى ٤: مرشّحون ضبابيون ⇒ طابور مراجعة، بلا دمج ══
  const reviewQueue = []
  const nameIndex = new Map()
  for (const rec of accepted) {
    const n = normalizeProductKey(rec.name_en ?? rec.name_ar ?? '')
    if (!n || n.length < 6) continue
    const bucket = nameIndex.get(n)
    if (bucket) bucket.push(rec)
    else nameIndex.set(n, [rec])
  }
  for (const [name, group] of nameIndex) {
    if (group.length < 2) continue
    reviewQueue.push({
      reason: 'fuzzy_same_name_distinct_gtin',
      normalized_name: name,
      count: group.length,
      gtins: group.map((r) => r.gtin).slice(0, 12),
      note: 'Queued for human review. NEVER auto-merged.',
    })
  }

  return {
    accepted,
    conflicts,
    reviewQueue,
    stats: {
      input: records.length,
      merged_by_gtin: mergedByGtin,
      merged_by_source_id: mergedBySourceId,
      merged_by_normalized_key: mergedByNormalizedKey,
      duplicates_removed: records.length - accepted.length,
      output: accepted.length,
      conflicts: conflicts.length,
      review_queue: reviewQueue.length,
    },
  }
}
