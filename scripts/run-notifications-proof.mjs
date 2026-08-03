import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const banner = `
const __store = new Map();
const __ls = {
  get length() { return __store.size; },
  key: (i) => Array.from(__store.keys())[i] ?? null,
  getItem: (k) => (__store.has(k) ? __store.get(k) : null),
  setItem: (k, v) => { __store.set(k, String(v)); },
  removeItem: (k) => { __store.delete(k); },
  clear: () => { __store.clear(); },
};
globalThis.localStorage = __ls;
globalThis.window = { localStorage: __ls, addEventListener() {}, removeEventListener() {} };
globalThis.__notificationHarness = { permission: 'granted', cancels: [], schedules: [], requests: 0, delivered: [], removedDelivered: [] };
`

const nativeMocks = {
  name: 'native-notification-mocks',
  setup(context) {
    context.onResolve({ filter: /^@capacitor\/core$/ }, () => ({ path: 'capacitor-core', namespace: 'notification-mock' }))
    context.onResolve({ filter: /^@capacitor\/local-notifications$/ }, () => ({ path: 'local-notifications', namespace: 'notification-mock' }))
    context.onLoad({ filter: /.*/, namespace: 'notification-mock' }, (args) => {
      if (args.path === 'capacitor-core') return { contents: `export const Capacitor = { getPlatform: () => 'ios' };`, loader: 'js' }
      return {
        contents: `
          const h = globalThis.__notificationHarness;
          export const LocalNotifications = {
            requestPermissions: async () => { h.requests += 1; return { display: h.permission }; },
            checkPermissions: async () => ({ display: h.permission }),
            cancel: async ({ notifications }) => { h.cancels.push(notifications.map((item) => item.id)); },
            schedule: async ({ notifications }) => { h.schedules.push(notifications); },
            // [CTO-72] البند ٦ — الإشعار الذي رنّ فعلًا يعيش في مركز الإشعارات،
            // ودالّة الإلغاء لا تمسّه. المحاكاة تمثّل الاثنين حتى يُقاس التنظيف لا يُفترض.
            getDeliveredNotifications: async () => ({ notifications: h.delivered.slice() }),
            removeDeliveredNotifications: async ({ notifications }) => {
              const ids = notifications.map((item) => item.id);
              h.removedDelivered.push(ids);
              h.delivered = h.delivered.filter((item) => !ids.includes(item.id));
            },
            removeAllDeliveredNotifications: async () => { h.removedDelivered.push('ALL'); h.delivered = []; },
          };
        `,
        loader: 'js',
      }
    })
  },
}

const result = await build({
  entryPoints: [resolve(root, 'scripts/notifications-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: {
    'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }),
    __APP_VERSION__: JSON.stringify('1.0.0'),
    __BUILD_COMMIT__: JSON.stringify('proof'),
  },
  plugins: [nativeMocks],
  logLevel: 'warning',
})

const directory = mkdtempSync(join(tmpdir(), 'qimmah-notifications-'))
const file = join(directory, 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)

// ═══ [CTO-72] البند ٦ — حارس «السلاح الموضوع» ═══
//
// `src/lib/notifications/copy.ts` **يتيم بلا مستورد**، ويحمل `supplementsCopy`
// التي تبني «موعد: كرياتين، أوميغا ٣…» من بيانات المستخدم. النصّ الحيّ اليوم
// عامّ عمدًا (`data/notificationCopy.ts`)، فلا أسماء تصل شاشة القفل الآن.
//
// لكن ملفًا يتيمًا يحمل خطرًا **لا يُترك بلا حارس** (§2-٦): توصيله يومًا يضع
// أسماء أدوية المستخدم على شاشة قفل يراها أي عابر. هذا الفحص **بنيوي على
// الاستيراد لا على النصّ**: أول من يستورده يحمرّ عنده السير، فيقرّر واعيًا بدل
// أن ينزلق. وليس منعًا أبديًا — إن لزم التوصيل يومًا، يُحدَّث هذا الفحص بقرار
// معلَن كما يُحدَّث أي استثناء.
{
  const src = readdirSync(resolve(root, 'src'), { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('notifications/copy.ts'))
  const importers = src.filter((f) => {
    const body = readFileSync(resolve(root, 'src', f), 'utf8')
    return /from '(\.\/copy|\.\.\/copy|@\/lib\/notifications\/copy)'/.test(body)
  })
  if (importers.length > 0) {
    console.log(`\n  ✗ FAIL: النصّ الذي يسرد أسماء المكمّلات صار موصولًا — ${importers.join(' · ')}`)
    console.log('          توصيله يضع أسماء أدوية المستخدم على شاشة القفل. قرار معلَن أم انزلاق؟')
    process.exit(1)
  }
  console.log('  ✓ النصّ الذي يسرد أسماء المكمّلات ما زال غير موصول (حارس بنيوي على الاستيراد)')
}

