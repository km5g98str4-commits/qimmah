#!/usr/bin/env node
// Browser transport attack for qimmah-gateway.
// This models the pre-repair gateway (OPTIONS 405, no CORS) and requires the
// permanent transport wrapper to cover every response class.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const transportPath = resolve(ROOT, 'supabase/functions/qimmah-gateway/cors.mjs')
const indexPath = resolve(ROOT, 'supabase/functions/qimmah-gateway/index.ts')
const indexSource = readFileSync(indexPath, 'utf8')

let passed = 0
const failures = []
const check = (name, condition, detail = '') => {
  if (condition) {
    passed += 1
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`)
  } else {
    failures.push(name)
    console.log(`  ✗ FAIL: ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const requiredHeaders = ['authorization', 'x-client-info', 'apikey', 'content-type', 'x-retry-count']
const splitHeader = (value) => String(value || '').toLowerCase().split(',').map((part) => part.trim())
const hasCors = (response) => response.headers.get('access-control-allow-origin') === '*'
const inspectPreflight = (response) => ({
  status: response.status,
  origin: response.headers.get('access-control-allow-origin'),
  methods: splitHeader(response.headers.get('access-control-allow-methods')),
  headers: splitHeader(response.headers.get('access-control-allow-headers')),
})

console.log('\n① الهجوم المعروف — تنفيذ ما قبل الإصلاح يجب أن يسقط')
const brokenGateway = async () => new Response(JSON.stringify({ outcome: 'method_not_allowed' }), {
  status: 405,
  headers: { 'content-type': 'application/json' },
})
const broken = inspectPreflight(await brokenGateway())
const brokenFailures = [
  broken.status !== 204 && 'PREFLIGHT_STATUS',
  broken.origin !== '*' && 'PREFLIGHT_ALLOW_ORIGIN',
  !broken.methods.includes('post') && 'PREFLIGHT_ALLOW_METHOD_POST',
  ...requiredHeaders.filter((header) => !broken.headers.includes(header)).map((header) => `PREFLIGHT_ALLOW_HEADER_${header}`),
].filter(Boolean)
check('⚔️ يلتقط OPTIONS 405 بلا CORS بفحوص مسمّاة',
  brokenFailures.includes('PREFLIGHT_STATUS')
  && brokenFailures.includes('PREFLIGHT_ALLOW_ORIGIN')
  && brokenFailures.includes('PREFLIGHT_ALLOW_HEADER_authorization'),
  brokenFailures.join(', '))

console.log('\n② ربط الطرفية بالنقل')
check('وحدة نقل CORS موجودة', existsSync(transportPath))
check('الطرفية تستورد غلاف CORS', /from ['"]\.\/cors\.mjs['"]/.test(indexSource))
check('Deno.serve يمرّ عبر غلاف CORS', /Deno\.serve\([\s\S]{0,180}withBrowserCors\(/.test(indexSource))

if (existsSync(transportPath)) {
  const { withBrowserCors } = await import(pathToFileURL(transportPath).href)
  const request = (method, origin) => new Request('https://example.supabase.co/functions/v1/qimmah-gateway', {
    method,
    headers: {
      ...(origin ? { Origin: origin } : {}),
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization, x-client-info, apikey, content-type, x-retry-count',
    },
  })

  console.log('\n③ OPTIONS والمتطلبات الفعلية للمتصفح')
  let routed = false
  const preflight = await withBrowserCors(
    request('OPTIONS', 'https://qimmah-8qp.pages.dev'),
    async () => { routed = true; return new Response('wrong') },
  )
  const inspected = inspectPreflight(preflight)
  check('OPTIONS ينجح بلا دخول مسار السلطة', preflight.status === 204 && !routed)
  check('Origin مسموح يحصل على ACAO', inspected.origin === '*')
  check('POST و OPTIONS معلنان', inspected.methods.includes('post') && inspected.methods.includes('options'))
  check('كل ترويسات Supabase الفعلية مسموحة', requiredHeaders.every((header) => inspected.headers.includes(header)))

  const missingOrigin = await withBrowserCors(request('OPTIONS'), async () => new Response('wrong'))
  check('غياب Origin لا يكسر preflight غير المعتمد', missingOrigin.status === 204 && hasCors(missingOrigin))
  const previewOrigin = await withBrowserCors(request('OPTIONS', 'https://repair-preview.qimmah-8qp.pages.dev'), async () => new Response('wrong'))
  check('عقد wildcard المعلَن يغطي مضيفات المعاينة المتغيرة', previewOrigin.status === 204 && hasCors(previewOrigin))

  console.log('\n④ كل مسارات الرد تحمل CORS')
  const responseCases = [
    ['success', 200],
    ['auth failure', 401],
    ['gateway validation failure', 400],
    ['rate limit', 429],
    ['RPC failure', 502],
    ['malformed request', 400],
  ]
  for (const [name, status] of responseCases) {
    const response = await withBrowserCors(request('POST', 'http://127.0.0.1:4174'), async () =>
      new Response(JSON.stringify({ name }), { status, headers: { 'content-type': 'application/json' } }))
    check(`${name}: non-OPTIONS response has CORS`, response.status === status && hasCors(response))
  }

  const internal = await withBrowserCors(
    request('POST', 'http://127.0.0.1:4174'),
    async () => { throw new Error('attack-sentinel') },
    () => new Response(JSON.stringify({ outcome: 'failed', reason: 'internal_error' }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    }),
  )
  check('internal error: fallback response has CORS', internal.status === 502 && hasCors(internal))
  check('لا تُفعَّل credentials مع wildcard origin', internal.headers.get('access-control-allow-credentials') === null)
}

console.log('\n──────────────────────────────────────────────────────────────')
console.log(`${failures.length === 0 ? '✅' : '❌'} هجوم CORS: ${passed} فحصًا · ${failures.length} فشل`)
if (failures.length) {
  failures.forEach((failure) => console.log(`   • ${failure}`))
  process.exit(1)
}
