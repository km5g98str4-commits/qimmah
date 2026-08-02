import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
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
globalThis.__notificationHarness = { permission: 'granted', cancels: [], schedules: [], requests: 0 };
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

