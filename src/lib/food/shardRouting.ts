/**
 * توجيه الشرائح — **تنفيذ واحد** يستهلكه خطّ الإنتاج ووقت التشغيل معًا.
 *
 * كان هذا المنطق يعيش في `scripts/food-production/lib/shard.mjs` وحده، وتعليقه
 * يطلب من وقت التشغيل «إعادة تنفيذه بدقّة». وإعادة التنفيذ هي المشكلة لا الحل:
 * تباعُد بسيط بين الاثنين يعني أن الواجهة تبحث في شريحةٍ غير التي بُني فيها
 * الفهرس، فتفشل عمليات بحثٍ صحيحة **بصمت** ولا يكشفها اختبار طرفٍ واحد.
 *
 * فالمصدر هنا الآن، و`shard.mjs` يستورده (نفس نمط `foodNormalize.ts` القائم).
 */

/** ميزانية الشريحة المضغوطة — معلَنة لتُقاس لا لتُفترض. */
export const SHARD_TARGET_GZIP_BYTES = { min: 200 * 1024, max: 500 * 1024 } as const

/** ميزانية الطقم الساخن. */
export const HOT_SET_BUDGET_GZIP_BYTES = 120 * 1024

export const ROUTING_METHOD_DESCRIPTION =
  'shard = (mix32(fnv1a(gtin14)) mod shard_count), where mix32 is the MurmurHash3 32-bit finalizer. ' +
  'The finalizer is REQUIRED, not cosmetic: every valid GTIN has an even digit sum (a consequence of the ' +
  'mod-10 check digit), which makes every raw FNV-1a hash odd and leaves half the shards permanently empty. ' +
  'Runtime and pipeline import this one module — see src/lib/food/shardRouting.ts.'

/** تجزئة FNV-1a 32-بت — ثابتة عبر اللغات والمنصّات. */
export function fnv1a(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/**
 * خلط نهائي (MurmurHash3 finalizer) — إصلاح عطب مقيس لا تجميل.
 *
 * خانة تحقّق GTIN تجعل مجموع خانات أي GTIN صالح زوجيًا، فتخرج كل بصمات FNV-1a
 * فردية، ومع `% N` لأي N زوجي تبقى **نصف الشرائح فارغة أبدًا**. الخلط ينثر
 * البتّات العليا على الدنيا فيكسر هذا الارتباط.
 */
export function mix32(h: number): number {
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b) >>> 0
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35) >>> 0
  h ^= h >>> 16
  return h >>> 0
}

/** الشريحة المسؤولة عن GTIN معيّن. */
export function assignShard(gtin14: string, shardCount: number): number {
  return mix32(fnv1a(gtin14)) % shardCount
}

/** اسم ملفّ الشريحة — نفس الترقيم الذي يكتبه خطّ الإنتاج. */
export function shardName(i: number, shardCount: number): string {
  return `shard-${String(i).padStart(String(shardCount - 1).length, '0')}`
}
