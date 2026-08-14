// جسر تحميل وحدات TypeScript داخل سكربتات Node — نفس نمط `scripts/food-db-validate.mjs`.
// الغرض: خطّ الإنتاج يستورد **نفس** وحدات التطبيق (التطبيع · GTIN) لا نسخة ثانية منها،
// فلا يمكن أن يتباعد سلوك القرص عن سلوك وقت التشغيل.

import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { resolve, join } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

export const ROOT = resolve(new URL('../../..', import.meta.url).pathname)

/** يجمّع وحدة TS إلى ESM مؤقتة ويستوردها. الملف المؤقت يُحذف دائمًا. */
export async function loadTsModule(relPath) {
  const dir = mkdtempSync(join(tmpdir(), 'qimmah-food-'))
  const outfile = join(dir, 'mod.mjs')
  try {
    await build({
      entryPoints: [resolve(ROOT, relPath)],
      bundle: true,
      format: 'esm',
      platform: 'node',
      outfile,
      alias: { '@': resolve(ROOT, 'src') },
      define: { 'import.meta.env': '{}' },
      logLevel: 'silent',
    })
    return await import(pathToFileURL(outfile).href)
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* ignore */ }
  }
}

/** الوحدات المشتركة بين التطبيق وخطّ الإنتاج — نقطة استيراد واحدة. */
export async function loadShared() {
  const [norm, gtin] = await Promise.all([
    loadTsModule('src/lib/text/foodNormalize.ts'),
    loadTsModule('src/lib/food/gtin.ts'),
  ])
  return { norm, gtin }
}
