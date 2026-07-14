import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const banner = `globalThis.window={localStorage:{getItem:()=>null,setItem(){},removeItem(){},clear(){},get length(){return 0},key:()=>null},addEventListener(){},removeEventListener(){}};globalThis.localStorage=globalThis.window.localStorage;`
const r = await build({ entryPoints:[resolve(root,'scripts/coaching/_dump.ts')], bundle:true, format:'esm', platform:'node', write:false, banner:{js:banner}, alias:{'@':resolve(root,'src')}, define:{'import.meta.env':JSON.stringify({MODE:'test',DEV:false,PROD:false})}, logLevel:'error' })
const dir = mkdtempSync(join(tmpdir(),'coach-')); const f = join(dir,'d.mjs'); writeFileSync(f,r.outputFiles[0].text); await import(pathToFileURL(f).href)
