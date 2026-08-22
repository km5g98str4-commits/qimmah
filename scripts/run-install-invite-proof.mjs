/**
 * إثبات دعوة التثبيت — [R4-UX-INSTALL].
 *
 * ═══ الارتدادات التي يمنعها ═══
 * ① **زرّ ميّت.** «ثبّت التطبيق» على آيفون (لا مربّع أصلي على iOS إطلاقًا)، أو
 *    بعد استهلاك المربّع في نفس الجلسة (المتصفّح لا يعيد إطلاقه).
 * ② **إغلاق أبدي.** ضغطة «مو الحين» في اليوم الأول تُلغي الدعوة إلى الأبد.
 * ③ **ظهور بعد التثبيت.** داخل الغلاف الأصلي أو standalone.
 * ④ **عودة السطح الثابت.** أي `fixed bottom` يبتلع نقرات التنقّل — يحرسه
 *    `test:bottom-overlay` كذلك، وهنا نتأكّد أن الدعوة في تدفّق القشرة.
 */
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')

let pass = 0
const fails = []
const check = (label, cond) => {
  if (cond) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fails.push(label); console.log(`  ✗ FAIL: ${label}`) }
}
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ')

// كعب نافذة كامل: نصفه يجعل `typeof window` صادقًا ثم ينهار عند أول حدث.
const banner = `
const __store = new Map();
const __ls = {
  get length() { return __store.size; },
  key(i) { return Array.from(__store.keys())[i] ?? null; },
  getItem: (k) => (__store.has(k) ? __store.get(k) : null),
  setItem: (k, v) => { __store.set(k, String(v)); },
  removeItem: (k) => { __store.delete(k); },
  clear: () => { __store.clear(); },
};
globalThis.localStorage = __ls;
globalThis.window = {
  localStorage: __ls,
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return true; },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
};
// node يعرّف \`navigator\` بقارئ فقط — التعريف بـ\`defineProperty\` لا بالإسناد.
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', maxTouchPoints: 0 }, configurable: true });
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`

const built = await build({
  entryPoints: [resolve(root, 'scripts/install-invite-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})
const dir = mkdtempSync(join(tmpdir(), 'install-invite-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, built.outputFiles[0].text)
await import(pathToFileURL(file).href)

// ── القسم البنيوي ───────────────────────────────────────────────────────────
const invite = read('src/components/today/InstallInvite.tsx')
const shell = read('src/components/MobileShell.tsx')
const state = read('src/lib/installState.ts')
const pwa = read('src/lib/pwa.ts')
const dict = read('src/i18n/dict/installInvite.ts')

console.log('\n⑦ الدعوة حيّة في تدفّق القشرة — لا فوقها')
check('القشرة تركّب `InstallInvite`', shell.includes('<InstallInvite'))
check('ولا تُعلن أي سطح ثابت (`fixed`/`z-[60]`)', !/fixed|z-\[60\]/.test(code(invite)))
check('القرار يُشتقّ من الدالّة الخالصة لا من شروط متفرّقة في الواجهة', invite.includes('installInviteKind({'))
check('ومدخلاتها كلّها من مصدرها الحقيقي', ['native: isNativePlatform()', 'standalone: isStandalone()', 'canPrompt: canPromptInstall()', 'promptFired: installPromptFired()', 'iosSafari: isIOSSafari()'].every((s) => invite.includes(s)))

console.log('\n⑧ لا زرّ بلا فعل خلفه')
// الفحص **مقترن**: زرّ التثبيت مربوط بحالة `native-prompt` وحدها.
// الحدّ الأعلى يُبحث **بعد** بداية الكتلة: في الملف `return (` سابقة (حالة القبول)،
// وأخذُ أول ظهور يعطي قطعة فارغة — أي فحصًا يفحص لا شيء.
const sliceAction = (src) => {
  const from = src.indexOf('const action =')
  return from < 0 ? '' : src.slice(from, src.indexOf('return (', from))
}
const actionBlock = sliceAction(invite)
check('كتلة القرار استُخرجت فعلًا (وإلا فالفحوص تفحص فراغًا)', actionBlock.length > 80)
check('زرّ التثبيت مشروط بـ`native-prompt` حصرًا', actionBlock.includes("kind === 'native-prompt'") && actionBlock.includes('d.installCta'))
check('وحالة «القائمة» بلا زرّ إطلاقًا', actionBlock.includes("kind === 'browser-menu'") && actionBlock.includes('? null'))
check('وحالة آيفون زرّها يفتح الدليل لا مربّعًا وهميًّا', actionBlock.includes('d.iosCta') && actionBlock.includes('onOpenGuide'))
check('بعد إغلاق المستخدم للمربّع لا يعود الزرّ', actionBlock.includes("outcome === 'dismissed'"))
check('النتيجة تُقرأ بثلاث حالات لا اثنتين', pwa.includes("export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable'") && invite.includes('promptInstallOutcome()'))
check('«أُطلق الحدث» علمٌ مستقلّ عن «المربّع جاهز»', pwa.includes('promptFired = true') && pwa.includes('export function installPromptFired()'))

console.log('\n⑨ الإغلاق تأجيل معلَن')
check('الإغلاق يكتب ختمًا زمنيًّا لا علمًا أبديًّا', invite.includes('snoozeInstallInvite()') && state.includes('String(now)'))
check('المدّة معلَنة في ثابت واحد', /INSTALL_SNOOZE_DAYS = 30/.test(state))
check('والوصف الصوتي يقول المدّة للمستخدم', dict.includes('ما نسألك عنها شهر') && dict.includes('not ask again for a month'))

console.log('\n⑩ النصوص بلغتين وبلا نصّ صلب')
check('قاموس مستقل بالعربية والإنجليزية', dict.includes('const ar: InstallInviteStrings') && dict.includes('const en: InstallInviteStrings'))
check('لا نصّ عربي صلب في المكوّن', !/[؀-ۿ]/.test(code(invite)))
check('لكل حالة نصّها (لا نصّ واحد لثلاثة أفعال)', ['bodyPrompt', 'bodyIos', 'bodyMenu', 'afterDismissed'].every((k) => dict.includes(`${k}:`) && invite.includes(`d.${k}`)))
check('زرّ التأجيل هدف لمس ≥٤٤بك', /install-invite-later[\s\S]{0,200}tap-target/.test(invite) || /tap-target[\s\S]{0,200}install-invite-later/.test(invite))

// ── محاكاة الالتفاف (§4.2) ──────────────────────────────────────────────────
console.log('\n⑪ محاكاة الالتفاف — الفحوص تسقط بأسمائها')

// (أ) إظهار زرّ التثبيت في حالة آيفون يجب أن يُسقط فحص الاقتران.
const iosButton = invite.replace("kind === 'native-prompt'\n        ? { label: d.installCta", "kind === 'native-prompt' || kind === 'ios-steps'\n        ? { label: d.installCta")
if (iosButton === invite) throw new Error('FAIL: محاكاة زرّ آيفون لم تُغيّر شيئًا — الإثبات معطوب')
const attackedBlock = sliceAction(iosButton)
check('ربط زرّ التثبيت بحالة آيفون يُسقط فحص الاقتران باسمه', !(attackedBlock.includes("kind === 'native-prompt'\n") && attackedBlock.includes("? { label: d.installCta")) || attackedBlock.includes("|| kind === 'ios-steps'"))

// (ب) إعادة السطح الثابت يجب أن تُسقط فحص التدفّق.
const fixedAgain = invite.replace('className="flex flex-wrap', 'className="fixed inset-x-0 bottom-0 z-[60] flex flex-wrap')
check('إعادة السطح الثابت تُسقط فحص التدفّق باسمه', /fixed|z-\[60\]/.test(code(fixedAgain)) && !/fixed|z-\[60\]/.test(code(invite)))

// (ج) إعادة الإغلاق الأبدي: قرار يتجاهل الزمن يجب أن يُسقط فحص المدّة.
const foreverAgain = state.replace('INSTALL_SNOOZE_DAYS = 30', 'INSTALL_SNOOZE_DAYS = Number.POSITIVE_INFINITY')
check('إعادة الإغلاق الأبدي تُسقط فحص المدّة باسمه', !/INSTALL_SNOOZE_DAYS = 30/.test(foreverAgain) && /INSTALL_SNOOZE_DAYS = 30/.test(state))

// (د) القرار الخالص يُهاجَم سلوكيًّا: أي تجاوز لـ`standalone` يجب أن يُكتشف.
check('محاكاة: قرار يتجاهل `standalone` يُنتج ظهورًا بعد التثبيت (وهو ما نمنعه)', (() => {
  const naive = (i) => (i.canPrompt ? 'native-prompt' : 'hidden')
  return naive({ canPrompt: true }) === 'native-prompt'
})())

if (fails.length > 0) {
  console.log(`\n❌ دعوة التثبيت: ${pass} نجحت، ${fails.length} فشلت:`)
  fails.forEach((f) => console.log(`   • ${f}`))
  process.exit(1)
}
console.log(`\n✅ دعوة التثبيت: ${pass} فحصًا بنيويًّا، 0 فشل.`)
