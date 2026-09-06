// إثبات مصفوفة المحرّك (تدريب/تغذية) — يبني scripts/engine-matrix-proof.ts ويشغّله. npm run test:engine-matrix
import { build } from 'esbuild'; import { writeFileSync } from 'node:fs'; import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'; import { dirname, resolve, join } from 'node:path'; import { mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'); const S = mkdtempSync(join(tmpdir(), 'engine-matrix-'))
const banner = `const __s=new Map();globalThis.localStorage={getItem:k=>__s.get(k)??null,setItem:(k,v)=>__s.set(k,String(v)),removeItem:k=>__s.delete(k),clear:()=>__s.clear(),key:i=>[...__s.keys()][i]??null,get length(){return __s.size}};globalThis.window={localStorage:globalThis.localStorage,addEventListener(){},removeEventListener(){},dispatchEvent(){},matchMedia:()=>({matches:false})};`
const r = await build({ entryPoints: [resolve(root, 'scripts/engine-matrix-proof.ts')], bundle: true, format: 'esm', platform: 'node', write: false, banner: { js: banner }, alias: { '@': resolve(root, 'src') }, absWorkingDir: root, define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) }, logLevel: 'warning' })
writeFileSync(`${S}/engine-matrix.out.mjs`, r.outputFiles[0].text); await import(pathToFileURL(`${S}/engine-matrix.out.mjs`).href)
