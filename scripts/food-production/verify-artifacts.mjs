// قِمّة — تحقّق سلامة مخرجات خطّ الإنتاج مقابل البيان.
// يعيد حساب بصمة كل شريحة وفهرس ويقارنها بالمسجَّل — يكشف أي تعديل يدوي أو تلف.
//
//   node scripts/food-production/verify-artifacts.mjs
//
// يفشل بفحص مسمّى، ولا يُصلح شيئًا: التحقّق شاهد لا مُرمِّم.

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { ROOT } from './lib/loadTs.mjs'
import { sha256, assignShard } from './lib/shard.mjs'

const MANIFEST = resolve(ROOT, 'data/food-production/manifests/build-manifest.json')
if (!existsSync(MANIFEST)) {
  console.error('لا بيان بناء — شغّل build-pipeline.mjs أولًا.')
  process.exit(1)
}
const m = JSON.parse(readFileSync(MANIFEST, 'utf8'))
const shardDir = resolve(ROOT, 'data/food-production/accepted/shards')
const failures = []
const fail = (msg) => failures.push(msg)

let records = 0
let gzipTotal = 0
for (const s of m.shards) {
  const jsonPath = resolve(shardDir, `${s.shard}.json`)
  const gzPath = resolve(shardDir, `${s.shard}.json.gz`)
  if (!existsSync(jsonPath)) { fail(`شريحة مفقودة: ${s.shard}`); continue }
  const raw = readFileSync(jsonPath)
  if (sha256(raw) !== s.sha256) fail(`بصمة لا تطابق: ${s.shard}`)
  if (raw.length !== s.bytes_raw) fail(`حجم خام لا يطابق: ${s.shard}`)
  if (existsSync(gzPath)) {
    const gz = readFileSync(gzPath)
    gzipTotal += gz.length
    if (!gunzipSync(gz).equals(raw)) fail(`gzip لا يطابق الأصل: ${s.shard}`)
  }
  const data = JSON.parse(raw.toString('utf8'))
  const keys = Object.keys(data.records)
  records += keys.length
  if (keys.length !== s.count) fail(`عدد السجلات لا يطابق: ${s.shard}`)
  if (!/ODbL/.test(data.licence ?? '')) fail(`إشعار الترخيص مفقود: ${s.shard}`)
  if (data.normalization_version !== m.normalization_version) fail(`نسخة تطبيع مختلفة: ${s.shard}`)
  // التوجيه: كل GTIN يجب أن يقع في شريحته المحسوبة — وإلا فبحث الباركود سيخطئ.
  const idx = Number(s.shard.split('-')[1])
  const misrouted = keys.filter((g) => assignShard(g, m.routing.shard_count) !== idx)
  if (misrouted.length) fail(`${misrouted.length} سجلًا في الشريحة الخطأ: ${s.shard}`)
  const idxPath = resolve(shardDir, `${s.shard}.idx.json`)
  if (existsSync(idxPath) && sha256(readFileSync(idxPath)) !== s.index_sha256) fail(`بصمة فهرس لا تطابق: ${s.shard}`)
}

if (records !== m.totals.accepted) fail(`مجموع السجلات ${records} ≠ المعلن ${m.totals.accepted}`)

const hotPath = resolve(ROOT, 'data/food-production/accepted/hot/hot-set.json')
if (existsSync(hotPath)) {
  const hot = JSON.parse(readFileSync(hotPath, 'utf8'))
  if (hot.count !== m.hot_set.count) fail('عدد الطقم الساخن لا يطابق البيان')
  if (!/ODbL/.test(hot.licence ?? '')) fail('إشعار الترخيص مفقود من الطقم الساخن')
} else fail('الطقم الساخن مفقود')

console.log('════════ تحقّق مخرجات خطّ الإنتاج ════════')
console.log(`شرائح : ${m.shards.length}`)
console.log(`سجلات : ${records.toLocaleString()}`)
console.log(`gzip  : ${(gzipTotal / 1048576).toFixed(2)} MB`)
if (failures.length === 0) { console.log('\n✅ كل المخرجات مطابقة للبيان.'); process.exit(0) }
console.log(`\n❌ ${failures.length} مخالفة:`); for (const f of failures) console.log('  ✗ ' + f)
process.exit(1)
