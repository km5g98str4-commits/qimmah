// [RR-003] يبني scripts/consent/rr003-consent-upload-proof.ts ويستبدل src/lib/supabaseClient بمسجِّل عبر مُحلِّل esbuild.
import { build } from 'esbuild'; import { writeFileSync, mkdtempSync } from 'node:fs'; import { pathToFileURL, fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'; import { tmpdir } from 'node:os'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'); const out = mkdtempSync(join(tmpdir(), 'rr003-'))
const banner = `const __s=new Map();globalThis.localStorage={getItem:k=>__s.get(k)??null,setItem:(k,v)=>__s.set(k,String(v)),removeItem:k=>__s.delete(k),clear:()=>__s.clear(),key:i=>[...__s.keys()][i]??null,get length(){return __s.size}};globalThis.window={localStorage:globalThis.localStorage,addEventListener(){},removeEventListener(){},dispatchEvent(){},matchMedia:()=>({matches:false})};`
const r = await build({ entryPoints: [resolve(root, 'scripts/consent/rr003-consent-upload-proof.ts')], bundle: true, format: 'esm', platform: 'node', write: false, banner: { js: banner },
  absWorkingDir: root, alias: { '@': resolve(root, 'src') },
  plugins: [{ name: 'rr003-stub', setup(b) { b.onResolve({ filter: /(^|\/)supabaseClient$/ }, () => ({ path: resolve(root, 'scripts/consent/rr003-stub-supabase.ts') })) } }],
  // العلم مطفأ عمدًا: هذا هو شكل الإنتاج، والمسار المطفأ هو ما يُثبَت.
  define: { 'import.meta.env': JSON.stringify({ MODE: 'production', DEV: false, PROD: true }) }, logLevel: 'warning' })
const file = join(out, 'proof.mjs'); writeFileSync(file, r.outputFiles[0].text); await import(pathToFileURL(file).href)
