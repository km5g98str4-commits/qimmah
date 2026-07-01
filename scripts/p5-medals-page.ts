// يبني صفحة HTML تعرض كل أوسمة قِمّة الـ19 (مفتوحة + مقفلة) باستخدام نفس قرص SVG
// (lib/medalArt) ونفس أيقونات lucide المستخدمة في التطبيق — لضمان تطابق لقطة الشاشة مع الواجهة.
// يُكتب إلى docs/product/assets/p5-medals.html ثم تُلتقط صورته عبر Chromium headless.

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { ACHIEVEMENTS, CATEGORY_LABELS, type AchievementCategory } from '@/data/achievements'
import { buildMedalCoin, medalPalette } from '@/lib/medalArt'
import { getIcon } from '@/lib/icons'

// يُشغَّل من جذر المستودع (عبر run-p5-medals-shot.mjs).
const root = process.cwd()

const CATEGORIES = Object.keys(CATEGORY_LABELS) as AchievementCategory[]
const COIN = 92
const GLYPH = Math.round(COIN * 0.4)

function glyphSvg(icon: string, color: string): string {
  const Cmp = getIcon(icon)
  return renderToStaticMarkup(
    createElement(Cmp as never, { width: GLYPH, height: GLYPH, color, strokeWidth: 2.25 }),
  )
}

function medal(icon: string, category: AchievementCategory, unlocked: boolean, uid: string): string {
  const coin = buildMedalCoin({ category, unlocked, uid, size: COIN })
  const p = medalPalette(category, unlocked)
  const glyphColor = unlocked ? '#ffffff' : '#6B7280'
  const glyph = glyphSvg(icon, glyphColor)
  const lockBadge = unlocked
    ? ''
    : `<div style="position:absolute;right:-3px;bottom:-3px;width:${Math.round(COIN * 0.3)}px;height:${Math.round(COIN * 0.3)}px;border-radius:9999px;background:#fff;border:1px solid #E7E1D6;box-shadow:0 1px 2px rgba(0,0,0,.12);display:grid;place-items:center;color:#9CA3AF;">${glyphSvg('Lock', '#9CA3AF')}</div>`
  const glyphShadow = unlocked ? 'filter:drop-shadow(0 1px 1px rgba(0,0,0,.35));' : ''
  return `<div style="position:relative;width:${COIN}px;height:${COIN}px;display:grid;place-items:center;" title="${category} · ${p.base}">
    <div style="position:absolute;inset:0;">${coin}</div>
    <div style="position:relative;width:${GLYPH}px;height:${GLYPH}px;display:grid;place-items:center;${glyphShadow}">${glyph}</div>
    ${lockBadge}
  </div>`
}

function tile(icon: string, title: string, category: AchievementCategory, unlocked: boolean, uid: string): string {
  return `<div style="width:132px;display:flex;flex-direction:column;align-items:center;gap:8px;">
    ${medal(icon, category, unlocked, uid)}
    <span style="font-size:12px;font-weight:800;color:#2A2620;text-align:center;line-height:1.25;">${title}</span>
  </div>`
}

function stateColumn(unlocked: boolean): string {
  const head = unlocked ? 'مفتوحة — Unlocked' : 'مقفلة — Locked'
  const groups = CATEGORIES.map((cat) => {
    const items = ACHIEVEMENTS.filter((a) => a.category === cat)
    const tiles = items
      .map((a) => tile(a.icon, a.title, cat, unlocked, `${cat}-${unlocked ? 'u' : 'l'}-${a.id}`))
      .join('')
    return `<div style="margin-bottom:14px;">
      <div style="font-size:12px;font-weight:900;color:#8A8172;letter-spacing:.02em;margin-bottom:8px;">${CATEGORY_LABELS[cat]}</div>
      <div style="display:flex;flex-wrap:wrap;gap:14px 10px;">${tiles}</div>
    </div>`
  }).join('')
  return `<div style="flex:1;background:#FBF8F2;border:1px solid #EDE7DB;border-radius:20px;padding:20px 22px;">
    <div style="font-size:15px;font-weight:900;color:#1F1B15;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
      <span style="width:10px;height:10px;border-radius:9999px;background:${unlocked ? '#22C55E' : '#9CA3AF'};display:inline-block;"></span>${head}
    </div>
    ${groups}
  </div>`
}

const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>أوسمة قِمّة — P5</title>
<style>
  * { box-sizing: border-box; }
  body { margin:0; font-family: -apple-system, "Segoe UI", "Noto Sans Arabic", Tahoma, sans-serif;
    background: linear-gradient(160deg, #F3EEE4 0%, #EFE8DA 100%); padding: 28px; }
  .head { max-width: 1120px; margin: 0 auto 20px; }
  .h-title { font-size: 24px; font-weight: 900; color:#1F1B15; }
  .h-sub { font-size: 13px; color:#8A8172; margin-top: 4px; }
  .cols { max-width: 1120px; margin: 0 auto; display:flex; gap: 20px; align-items: flex-start; }
</style>
</head>
<body>
  <div class="head">
    <div class="h-title">أوسمة قِمّة — ${ACHIEVEMENTS.length} وسامًا بأسلوب Apple Fitness</div>
    <div class="h-sub">أقراص SVG معدنية بلون كل فئة (سلاسل=برتقالي، بروتين=أخضر، خطوات=أزرق، قوّة=ذهبي، بدايات=بنفسجي) — مفتوحة بلون كامل ولمعان، ومقفلة رمادية مع قفل. بلا إيموجي.</div>
  </div>
  <div class="cols">
    ${stateColumn(true)}
    ${stateColumn(false)}
  </div>
</body>
</html>`

const outDir = resolve(root, 'docs/product/assets')
mkdirSync(outDir, { recursive: true })
writeFileSync(resolve(outDir, 'p5-medals.html'), html)
console.log('✅ كُتبت docs/product/assets/p5-medals.html')
