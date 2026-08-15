// STATIC — what actually ships.
//
// Everything here reads the BUILT production artifact, not the source tree. The
// question is not "is the seam gated in the code?" but "did the gated code
// survive into the bytes a user downloads?".
//
// Covered: the test-entitlement seam · dev/localhost endpoints · secrets ·
// source maps · the Salla purchase binding · route/rewrite parity.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { createRecorder, ROOT } from '../lib/harness.mjs'

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

export async function run({ artifactDir }) {
  const rec = createRecorder('static-bundle-safety')
  const dist = resolve(ROOT, artifactDir)
  if (!existsSync(dist)) {
    rec.check('the production artifact exists', false, dist)
    return rec.summary()
  }

  const files = walk(dist)
  const code = files.filter((f) => /\.(js|css|html|webmanifest|json)$/.test(f) && !/\/exercise-(gifs|images|machine-images)\//.test(f))
  const readAll = () => code.map((f) => ({ f: f.slice(dist.length + 1), s: readFileSync(f, 'utf8') }))
  const bundle = readAll()
  const hits = (re) => bundle.filter(({ s }) => re.test(s)).map(({ f }) => f)

  rec.section('the test-entitlement seam must not exist in a production build')
  // The mock codes are the seam's only user-facing key material. Their presence
  // in shipped bytes would mean the seam survived tree-shaking.
  const mockCodes = hits(/QIMMAH-TEST-(OK|USED|EXPIRED|OFFLINE)/)
  rec.check('no mock activation code string ships', mockCodes.length === 0, mockCodes.join(', '))
  const mockKey = hits(/qimmah:entitlement-mock/)
  rec.check('no entitlement-mock storage key ships', mockKey.length === 0, mockKey.join(', '))
  const mockMode = hits(/VITE_ENTITLEMENT_MODE/)
  rec.check('no VITE_ENTITLEMENT_MODE reference ships', mockMode.length === 0, mockMode.join(', '))
  // Counter-proof (§4.2): the same scan MUST find the seam in the mock artifact,
  // otherwise the three checks above pass because the scan is broken.
  const mockDist = resolve(ROOT, 'dist-release/mock')
  if (existsSync(mockDist)) {
    const mockFiles = walk(mockDist).filter((f) => /\.js$/.test(f))
    const foundInMock = mockFiles.some((f) => /QIMMAH-TEST-OK/.test(readFileSync(f, 'utf8')))
    rec.check('counter-proof: the SAME scan does find the seam in the mock artifact', foundInMock,
      foundInMock ? 'seam detected in dist-release/mock as expected' : 'scan found nothing in the mock build either — the scan is not measuring anything')
  } else {
    rec.blocked('counter-proof for the seam scan', 'dist-release/mock was not built in this pass')
  }

  rec.section('no development or localhost endpoint ships')
  //
  // NAMED EXCLUSION (§4.2): `@supabase/supabase-js` (gotrue-js) carries its own
  // internal default `http://localhost:9999` as a vendor constant. It is inert —
  // the client is always constructed with the configured URL — and it is NOT a
  // Qimmah endpoint. Excluding the exact vendor literal keeps the scan honest;
  // the counter-proof below shows any OTHER loopback URL is still caught.
  const VENDOR_LOOPBACK = /^http:\/\/localhost:9999$/
  const loopbackUrls = new Set()
  for (const { s: text } of bundle) {
    for (const m of text.matchAll(/https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?/g)) loopbackUrls.add(m[0])
  }
  const firstParty = [...loopbackUrls].filter((u) => !VENDOR_LOOPBACK.test(u))
  rec.check('no first-party localhost/loopback URL ships', firstParty.length === 0,
    `found: [${[...loopbackUrls].join(', ')}] · excluded vendor default: http://localhost:9999 (gotrue-js)`)
  rec.check('counter-proof: the loopback scan does detect URLs (it found the known vendor default)',
    loopbackUrls.size > 0, `scan located ${loopbackUrls.size} loopback literal(s) — the pattern is live, not vacuous`)
  const devHosts = hits(/https?:\/\/[\w.-]*(ngrok|staging|\.local\b|test\.supabase|dev\.qimmah)/i)
  rec.check('no staging/tunnel/dev host ships', devHosts.length === 0, devHosts.join(', '))
  const maps = files.filter((f) => f.endsWith('.map'))
  rec.check('no source map ships', maps.length === 0, maps.map((f) => f.slice(dist.length + 1)).join(', '))
  const sourceMapRefs = hits(/\/\/# sourceMappingURL=(?!data:)/)
  rec.check('no shipped file points at an external source map', sourceMapRefs.length === 0, sourceMapRefs.join(', '))

  rec.section('no secret material ships')
  // VITE_* values are public by design (charter §9); what must never ship is a
  // service-role key, a private key block, or a bearer token literal.
  const secrets = [
    { re: /service_role/i, name: 'Supabase service_role key' },
    { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, name: 'PEM private key' },
    { re: /\bsk_live_[A-Za-z0-9]{10,}/, name: 'live secret key' },
    { re: /\bghp_[A-Za-z0-9]{20,}/, name: 'GitHub token' },
    { re: /AKIA[0-9A-Z]{16}/, name: 'AWS access key id' },
  ]
  for (const s of secrets) {
    const found = hits(s.re)
    rec.check(`no ${s.name} ships`, found.length === 0, found.join(', '))
  }

  rec.section('the purchase binding that the commercial funnel depends on')
  const sallaRefs = new Set()
  for (const { s } of bundle) for (const m of s.matchAll(/https:\/\/salla\.sa\/[A-Za-z0-9_\-/?=&.]*/g)) sallaRefs.add(m[0])
  const urls = [...sallaRefs]
  rec.check('a Salla purchase destination ships at all', urls.length > 0, urls.join(', '))
  // A store ROOT is not a product binding. §0.1 fixes one price on one product;
  // a root URL cannot carry the buyer to that product, so this is reported as a
  // real commercial gap, not a pass.
  const productBound = urls.some((u) => /\/(p|product)\//i.test(u) || /\d{9,}/.test(u))
  rec.check('the shipped destination is a PRODUCT URL, not just the store root',
    productBound, `shipped: ${urls.join(', ')}`)
  rec.check('no second, conflicting checkout destination ships', urls.length <= 1, urls.join(', '))

  rec.section('forbidden Premium promises must not ship')
  const forbidden = [
    { re: /مدى الحياة/, name: '«مدى الحياة»' },
    { re: /\blifetime\b/i, name: '"lifetime"' },
    { re: /كل التحديثات الحالية والمستقبلية/, name: '«كل التحديثات الحالية والمستقبلية»' },
  ]
  for (const f of forbidden) {
    const found = hits(f.re)
    rec.check(`${f.name} does not ship`, found.length === 0, found.join(', '))
  }

  rec.section('shipped shell integrity')
  const html = readFileSync(resolve(dist, 'index.html'), 'utf8')
  rec.check('index.html carries a verifiable build identity', /name="qimmah-commit"/.test(html) && /name="qimmah-build-time"/.test(html),
    (html.match(/<meta name="qimmah-[^>]+>/g) || []).join(' '))
  const sw = existsSync(resolve(dist, 'sw.js')) ? readFileSync(resolve(dist, 'sw.js'), 'utf8') : ''
  rec.check('the service worker has its build placeholders substituted',
    !sw || (!sw.includes('__SW_VERSION__') && !sw.includes('__SW_PRECACHE_ASSETS__')),
    sw ? 'sw.js present' : 'no sw.js in artifact')
  rec.check('the artifact ships an offline/404 fallback', existsSync(resolve(dist, '404.html')))

  return rec.summary()
}
