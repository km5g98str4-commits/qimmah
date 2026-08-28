import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const banner = `const __s=new Map();const __ls={get length(){return __s.size},key:i=>[...__s.keys()][i]??null,getItem:k=>__s.has(k)?__s.get(k):null,setItem:(k,v)=>{__s.set(k,String(v))},removeItem:k=>{__s.delete(k)},clear:()=>{__s.clear()}};globalThis.localStorage=__ls;globalThis.window={localStorage:__ls,addEventListener(){},removeEventListener(){}};if(typeof globalThis.performance==='undefined')globalThis.performance={now:()=>0};`
const r = await build({ entryPoints: [resolve(root, 'scripts/warmup-peek.ts')], bundle: true, format: 'esm', platform: 'node', write: false, banner: { js: banner }, alias: { '@': resolve(root, 'src') }, define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) }, logLevel: 'warning' })
const f = join(mkdtempSync(join(tmpdir(), 'wpeek-')), 'p.mjs'); writeFileSync(f, r.outputFiles[0].text); await import(pathToFileURL(f).href)
