// فنّ الأوسمة (Apple-style) — مولّد SVG لقُرص الوسام المعدني، مشترك بين مكوّن React
// (MedalBadge) وأداة لقطة الشاشة (scripts/p5-medals-page.ts) لضمان تطابق البصريات تمامًا.
//
// القُرص وحده هنا (حلقة معدنية + وجه + لمعان). الأيقونة المركزية (glyph) تُركّب فوقه
// من مكتبة الأيقونات (lucide) في الطبقة الأعلى، فيبقى الوسام SVG نقيًا وحادًّا بأي حجم.

import type { AchievementCategory } from '@/data/achievements'

/** لوحة ألوان قرص الوسام: فاتح (لمعان) → أساس → داكن (حافة) + لون توهّج. */
export interface MedalPalette {
  light: string
  base: string
  dark: string
  glow: string
}

/** لون مميّز لكل فئة (مطابق لروح Apple Fitness): سلاسل=برتقالي، بروتين=أخضر، خطوات=أزرق، قوّة/أرقام=ذهبي، بدايات/معالم=بنفسجي. */
export const MEDAL_COLORS: Record<AchievementCategory, MedalPalette> = {
  streak: { light: '#FED7AA', base: '#F97316', dark: '#9A3412', glow: 'rgba(249,115,22,0.55)' },
  protein: { light: '#BBF7D0', base: '#22C55E', dark: '#166534', glow: 'rgba(34,197,94,0.5)' },
  steps: { light: '#BFDBFE', base: '#3B82F6', dark: '#1E40AF', glow: 'rgba(59,130,246,0.5)' },
  strength: { light: '#FEF3C7', base: '#F59E0B', dark: '#92400E', glow: 'rgba(245,158,11,0.55)' },
  firsts: { light: '#E9D5FF', base: '#A855F7', dark: '#6B21A8', glow: 'rgba(168,85,247,0.5)' },
}

/** لوحة الوسام المقفل — رمادي مُطفأ بلا توهّج. */
export const LOCKED_PALETTE: MedalPalette = {
  light: '#E5E7EB',
  base: '#9CA3AF',
  dark: '#4B5563',
  glow: 'rgba(0,0,0,0)',
}

/** يختار لوحة الوسام حسب الفئة والحالة (مفتوح = لون كامل، مقفل = رمادي). */
export function medalPalette(category: AchievementCategory, unlocked: boolean): MedalPalette {
  return unlocked ? MEDAL_COLORS[category] : LOCKED_PALETTE
}

export interface MedalCoinOptions {
  category: AchievementCategory
  unlocked: boolean
  /** لاحقة فريدة لمعرّفات التدرّجات (لتفادي تصادم gradient ids عند تعدّد الأوسمة في صفحة). */
  uid: string
  /** حجم القرص بالبكسل (العرض=الارتفاع). */
  size?: number
}

/**
 * يبني قرص الوسام كسلسلة SVG كاملة (حلقة معدنية + حزّات + وجه + لمعان + توهّج للمفتوح).
 * لا يحوي الأيقونة المركزية — تُركّب فوقه في الطبقة الأعلى.
 */
export function buildMedalCoin({ category, unlocked, uid, size = 96 }: MedalCoinOptions): string {
  const p = medalPalette(category, unlocked)
  const ring = `ring-${uid}`
  const face = `face-${uid}`
  const shine = `shine-${uid}`
  const glow = `glow-${uid}`
  const glowAttr = unlocked ? ` filter="url(#${glow})"` : ''
  const groupOpacity = unlocked ? 1 : 0.92

  return `<svg width="${size}" height="${size}" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="${ring}" x1="14" y1="10" x2="82" y2="86" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${p.light}"/>
      <stop offset="0.5" stop-color="${p.base}"/>
      <stop offset="1" stop-color="${p.dark}"/>
    </linearGradient>
    <radialGradient id="${face}" cx="0.5" cy="0.4" r="0.72">
      <stop offset="0" stop-color="${p.light}"/>
      <stop offset="0.55" stop-color="${p.base}"/>
      <stop offset="1" stop-color="${p.dark}"/>
    </radialGradient>
    <linearGradient id="${shine}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.6"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="${glow}" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="2" stdDeviation="3.2" flood-color="${p.glow}"/>
    </filter>
  </defs>
  <g opacity="${groupOpacity}"${glowAttr}>
    <circle cx="48" cy="48" r="46" fill="url(#${ring})" stroke="${p.dark}" stroke-width="1.5"/>
    <circle cx="48" cy="48" r="43" fill="none" stroke="${p.light}" stroke-opacity="0.28" stroke-width="2" stroke-dasharray="1.2 4.2" stroke-linecap="round"/>
    <circle cx="48" cy="48" r="39" fill="none" stroke="url(#${shine})" stroke-width="1.6" opacity="0.7"/>
    <circle cx="48" cy="48" r="33" fill="url(#${face})" stroke="${p.dark}" stroke-opacity="0.4" stroke-width="1"/>
    <ellipse cx="48" cy="34" rx="23" ry="12.5" fill="url(#${shine})"/>
  </g>
</svg>`
}
