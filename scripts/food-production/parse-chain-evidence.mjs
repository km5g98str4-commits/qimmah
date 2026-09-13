#!/usr/bin/env node
/**
 * قارئ أدلة السلاسل — [RESTAURANT-MENUS-001]
 *
 * يحوّل text.txt المُلتقط في CI (data/food-production/chain-evidence/<slug>/) إلى ملف مصدر
 * مُراجَع في docs/data-factory/restaurants/<chain>.json. كل قارئ مخصّص لبنية مصدره؛ ما لا
 * يُقرأ بنمط ثابت لا يُخمَّن. الملف الناتج يُراجَع بالعين قبل الالتزام (الأسماء العربية · الحصص).
 *
 *   node scripts/food-production/parse-chain-evidence.mjs shawarmer
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const EV = (slug, file = 'text.txt') => {
  const p = resolve(ROOT, 'data/food-production/chain-evidence', slug, file)
  return existsSync(p) ? readFileSync(p, 'utf8') : null
}
const stripHtml = (html) => html
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ')
  .replace(/<[^>]+>/g, '\n')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n')
const textOf = (slug) => EV(slug) ?? (EV(slug, 'rendered.html') ? stripHtml(EV(slug, 'rendered.html')) : null)
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const PARSERS = {
  // شاورمر: المنيو الرسمي يعرض لكل صنف «Protein / N g / M kcal / وصف / SR / سعر».
  // الأسماء العربية من الصفحة العربية بنفس البنية، تُحاذى بثلاثية (kcal · protein · سعر).
  shawarmer() {
    const parse = (txt) => {
      const L = txt.split('\n')
      const out = []
      for (let i = 0; i < L.length; i++) {
        if (!/^(Protein|البروتين|بروتين)$/i.test(L[i])) continue
        const p = L[i + 1]?.match(/^(\d+)\s*(g|غ|جم|غرام)$/i)
        const k = L[i + 2]?.match(/^(\d+)\s*(kcal|سعرة|سعره|كالوري)/i)
        if (!p || !k) continue
        const name = L[i - 1]
        let j = i + 3; let desc = ''; let price = null
        while (j < L.length && j < i + 8) { if (/^(SR|ر\.س|ريال)$/i.test(L[j])) { price = Number(L[j + 1]?.replace(/[^\d.]/g, '')) || null; break } desc += (desc ? ' ' : '') + L[j]; j++ }
        out.push({ name, protein: Number(p[1]), kcal: Number(k[1]), desc, price })
      }
      return out
    }
    const en = parse(textOf('shawarmer-menu') ?? '')
    const ar = parse(textOf('shawarmer-menu-ar') ?? '')
    const key = (r) => `${r.kcal}|${r.protein}|${r.price}`
    const arByKey = new Map(ar.map((r) => [key(r), r]))
    const seen = new Set()
    const items = []
    for (const r of en) {
      const k = key(r)
      if (seen.has(k)) continue
      seen.add(k)
      const a = arByKey.get(k)
      const lower = r.desc.toLowerCase()
      const type = /gathering|box|platter|sahen/i.test(r.name) || /box|platter/.test(lower) ? 'box' : /salad/i.test(r.name) ? 'salad' : /fries|potato/i.test(r.name) ? 'fries' : /nachos|bites|balls|sticks/i.test(r.name) ? 'side' : /drink|juice|soda|water/i.test(r.name) ? 'drink' : /dessert|cake|cookie|kunafa|brownie/i.test(r.name) ? 'dessert' : 'wrap'
      items.push({ id: slugify(r.name), nameAr: a?.name ?? null, nameEn: r.name, sourceName: r.name, kcal: r.kcal, protein: r.protein, type, servingLabelAr: type === 'box' ? 'بوكس' : type === 'salad' ? 'صحن' : type === 'drink' ? 'كوب' : 'حبة', keywords: [], descEn: r.desc, priceSar: r.price })
    }
    return {
      chain: { slug: 'shawarmer', ar: 'شاورمر', en: 'Shawarmer', keywords: ['shawarmer', 'شورمر', 'شاورمر'] },
      source: { url: 'https://shawarmer.com/en/menu/83', urlAr: 'https://shawarmer.com/ar/menu/83', kind: 'official-menu-sfda', market: 'SA', accessed: new Date().toISOString().slice(0, 10), note: 'المنيو الرسمي يعرض السعرات والبروتين لكل صنف (لائحة SFDA)؛ الكارب والدهون غير معروضين ⇒ تقدير موسوم.' },
      items,
    }
  },
}

const which = process.argv[2]
if (!which || !PARSERS[which]) { console.error(`استعمال: parse-chain-evidence.mjs <${Object.keys(PARSERS).join('|')}>`); process.exit(2) }
const doc = PARSERS[which]()
const out = resolve(ROOT, 'docs/data-factory/restaurants', `${which}.json`)
writeFileSync(out, JSON.stringify(doc, null, 1) + '\n')
const missingAr = doc.items.filter((i) => !i.nameAr).length
console.log(`${which}: ${doc.items.length} صنفًا → ${out}${missingAr ? ` · ⚠️ ${missingAr} بلا اسم عربي (الصفحة العربية لم تُلتقط بعد)` : ''}`)
