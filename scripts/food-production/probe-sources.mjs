// قِمّة — مسبار مصادر بيانات المنتجات.
// يقيس **ما وصلنا إليه فعلًا** (رمز HTTP · الحجم · robots) ويكتب الدليل إلى
// `data/food-production/reports/source-probe.json`. لا يفترض شيئًا ولا يخمّن.
//
//   node scripts/food-production/probe-sources.mjs
//
// المهلة قصيرة عمدًا: مصدر لا يستجيب خلال المهلة يُسجَّل EXTERNALLY_BLOCKED بدليله،
// ولا يوقف بقية المسبار.

import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { ROOT } from './lib/loadTs.mjs'

const UA = 'Qimmah-DataPipeline/1.0 (+https://qimmah.app; contact via repository owner)'
const TIMEOUT_MS = Number(process.env.PROBE_TIMEOUT_MS ?? 20000)

/** يجلب رأس/جسم عنوان بمهلة، ويعيد وصفًا للنتيجة أو للفشل — لا يرمي أبدًا. */
async function probe(url, { method = 'HEAD', wantBody = false } = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  const started = Date.now()
  try {
    const res = await fetch(url, { method, redirect: 'follow', headers: { 'User-Agent': UA }, signal: ctrl.signal })
    const out = {
      url,
      method,
      reachable: true,
      http_status: res.status,
      content_length: res.headers.get('content-length'),
      content_type: res.headers.get('content-type'),
      last_modified: res.headers.get('last-modified'),
      elapsed_ms: Date.now() - started,
    }
    if (wantBody) out.body_head = (await res.text()).slice(0, 1200)
    return out
  } catch (err) {
    return {
      url,
      method,
      reachable: false,
      error: String(err?.cause?.code ?? err?.name ?? err?.message ?? err),
      elapsed_ms: Date.now() - started,
      verdict: 'EXTERNALLY_BLOCKED',
    }
  } finally {
    clearTimeout(timer)
  }
}

const TARGETS = [
  { id: 'openfoodfacts', label: 'Open Food Facts — robots.txt', url: 'https://world.openfoodfacts.org/robots.txt', method: 'GET', wantBody: true },
  { id: 'openfoodfacts', label: 'Open Food Facts — bulk CSV export (the permitted bulk path)', url: 'https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz' },
  { id: 'openfoodfacts', label: 'Open Food Facts — bulk JSONL export', url: 'https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz' },
  { id: 'usda_fdc', label: 'USDA FoodData Central — robots.txt', url: 'https://fdc.nal.usda.gov/robots.txt', method: 'GET', wantBody: true },
  { id: 'usda_fdc', label: 'USDA FoodData Central — branded foods bulk JSON', url: 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_branded_food_json_2025-04-24.zip' },
  { id: 'sfda', label: 'Saudi Food & Drug Authority — site root', url: 'https://www.sfda.gov.sa/', method: 'GET' },
  { id: 'saudi_open_data', label: 'Saudi Open Data portal — robots.txt', url: 'https://open.data.gov.sa/robots.txt', method: 'GET' },
  { id: 'almarai', label: 'Almarai (manufacturer) — robots.txt', url: 'https://www.almarai.com/robots.txt', method: 'GET', wantBody: true },
]

const results = []
for (const t of TARGETS) {
  const r = await probe(t.url, { method: t.method ?? 'HEAD', wantBody: t.wantBody })
  results.push({ source_id: t.id, label: t.label, ...r })
  const status = r.reachable ? `HTTP ${r.http_status}${r.content_length ? ` · ${(Number(r.content_length) / 1048576).toFixed(1)} MB` : ''}` : `${r.verdict} (${r.error})`
  console.log(`${r.reachable ? '✓' : '✗'} ${t.label}\n    ${status}`)
}

const outDir = resolve(ROOT, 'data/food-production/reports')
mkdirSync(outDir, { recursive: true })
const payload = {
  probed_at: new Date().toISOString(),
  user_agent: UA,
  timeout_ms: TIMEOUT_MS,
  note: 'Evidence of what was ACTUALLY reachable from the build machine. Unreachable sources are recorded as EXTERNALLY_BLOCKED with the transport error, never silently dropped.',
  results,
}
writeFileSync(resolve(outDir, 'source-probe.json'), JSON.stringify(payload, null, 2) + '\n')
console.log(`\n→ data/food-production/reports/source-probe.json (${results.filter((r) => r.reachable).length}/${results.length} reachable)`)
