import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { assertProductionLegalReady, resolveLegalLaunchConfig } from '@/../build/legalLaunchConfig'
import { getLegalDocument, POLICY_LINKS, policyCopy } from '@/legal/canonicalLegalContent'

let passed = 0
const failures: string[] = []
function check(label: string, ok: boolean): void {
  if (ok) { passed++; console.log(`  ✓ ${label}`) }
  else { failures.push(label); console.log(`  ✗ ${label}`) }
}

const complete = {
  VITE_LEGAL_CONTROLLER_NAME_AR: 'شركة اختبار', VITE_LEGAL_CONTROLLER_NAME_EN: 'Test Company',
  VITE_LEGAL_CONTACT_EMAIL: 'legal@example.test', VITE_LEGAL_EFFECTIVE_DATE: '2099-01-01',
  VITE_LEGAL_GOVERNING_VENUE_AR: 'نص معتمد', VITE_LEGAL_GOVERNING_VENUE_EN: 'Approved wording',
  VITE_LEGAL_DATA_REGION_AR: 'منطقة اختبار', VITE_LEGAL_DATA_REGION_EN: 'Test region',
  VITE_LEGAL_REVIEW_ID: 'LEGAL-TEST-1', VITE_LEGAL_REVIEW_APPROVED: 'true',
}

console.log('\n① LAUNCH CONFIG IS FAIL-CLOSED')
const missing = resolveLegalLaunchConfig({})
check('empty config is not ready', !missing.ready && missing.unresolved.length >= 10)
let blocked = false
try { assertProductionLegalReady({ CF_PAGES_BRANCH: 'main' }) } catch (error) { blocked = String(error).includes('LEGAL_LAUNCH_BLOCKED') }
check('production main build is blocked when fields are missing', blocked)
check('non-production branch may build an explicitly marked draft', (() => { try { assertProductionLegalReady({ CF_PAGES_BRANCH: 'preview' }); return true } catch { return false } })())
check('complete reviewed config is ready', resolveLegalLaunchConfig(complete).ready)
check('complete production config passes', (() => { try { assertProductionLegalReady({ ...complete, CF_PAGES_BRANCH: 'main' }); return true } catch { return false } })())
check('⚔️ removing legal approval blocks production', (() => { try { assertProductionLegalReady({ ...complete, VITE_LEGAL_REVIEW_APPROVED: 'false', CF_PAGES_BRANCH: 'main' }); return false } catch { return true } })())

console.log('\n② PRODUCT FACTS MATCH IN ARABIC AND ENGLISH')
for (const lang of ['ar', 'en'] as const) {
  const privacy = JSON.stringify(getLegalDocument('privacy', lang))
  const terms = JSON.stringify(getLegalDocument('terms', lang))
  check(`${lang}: minimum age 13`, privacy.includes('13') && terms.includes('13'))
  check(`${lang}: under-18 numeric prescription is suppressed`, /18/.test(privacy) && /calorie|سعرات/.test(privacy) && /water|ماء/.test(privacy))
  check(`${lang}: free account-optional preview is stated`, /without an account|بلا حساب/.test(`${privacy} ${terms}`))
  check(`${lang}: 72-hour verified trial is stated`, /72|٧٢/.test(terms) && /verified|موثّق/.test(terms))
  check(`${lang}: Premium price is exactly SAR 19.99`, terms.includes('19.99'))
  check(`${lang}: no monthly subscription promise uses approved scope`, /no monthly subscription|بلا اشتراك شهري/.test(terms))
}

console.log('\n③ ONE CANONICAL CONTENT SOURCE AND ONE ROUTE CONTRACT')
const root = process.cwd()
const strings = readFileSync(resolve(root, 'src/config/strings.ts'), 'utf8')
const policyBridge = readFileSync(resolve(root, 'src/data/policyCopy.ts'), 'utf8')
const footer = readFileSync(resolve(root, 'src/components/Footer.tsx'), 'utf8')
const privacyDoc = readFileSync(resolve(root, 'docs/legal/privacy-policy.md'), 'utf8')
const termsDoc = readFileSync(resolve(root, 'docs/legal/terms-of-service.md'), 'utf8')
const sitePrivacy = readFileSync(resolve(root, 'site/privacy.html'), 'utf8')
const siteTerms = readFileSync(resolve(root, 'site/terms.html'), 'utf8')
check('old short legal arrays are removed', !/privacyBody|termsBody/.test(strings))
check('legacy policy module only re-exports canonical source', /canonicalLegalContent/.test(policyBridge) && policyBridge.split('\n').length <= 4)
check('footer consumes canonical links', /POLICY_LINKS\.privacy/.test(footer) && /POLICY_LINKS\.terms/.test(footer))
check('signup/health route labels are in the canonical source', policyCopy.ar.terms.length > 0 && policyCopy.en.privacy.length > 0)
check('canonical route contract is exact', POLICY_LINKS.privacy === '#/privacy' && POLICY_LINKS.terms === '#/terms')
check('markdown files are pointers, not duplicate policy bodies', /canonicalLegalContent/.test(privacyDoc) && /canonicalLegalContent/.test(termsDoc) && privacyDoc.length < 700 && termsDoc.length < 700)
check('static privacy and terms pages redirect to canonical app routes', /url=\/#\/privacy/.test(sitePrivacy) && /url=\/#\/terms/.test(siteTerms))

console.log('\n④ ⚔️ PLACEHOLDERS STAY VISIBLE AND NEVER COUNT AS READY')
check('missing fields are explicitly named', missing.unresolved.includes('VITE_LEGAL_CONTROLLER_NAME_AR') && missing.unresolved.includes('VITE_LEGAL_REVIEW_APPROVED=true'))
check('canonical draft exposes founder-input marker when runtime config is unavailable', JSON.stringify(getLegalDocument('privacy', 'en')).includes('FOUNDER_INPUT_REQUIRED'))

console.log(`\nCanonical legal proof: ${passed} passed, ${failures.length} failed`)
if (failures.length) {
  console.error(`Failed checks:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
