import{r as h,j as e}from"./vendor-react-DBoTRrZA.js";import{I as c,n as p,a0 as m}from"./index-CH-vRA1Z.js";import{a as x}from"./engine-BAll8o9I.js";import{u}from"./useAchievements-CO9LnWIN.js";import"./guard-C3e9cu8D.js";import"./vendor-icons-Bx6MXh7W.js";import"./historyStore-CM-eOIkb.js";import"./streaks-Dvgnk2PO.js";import"./stepCounter-B9y1OdvV.js";import"./today-4gqoIQaQ.js";import"./demoMode-DMuI80oh.js";import"./nutritionTracking-BzzKa3pi.js";import"./firstWin-CtdA44-i.js";import"./feature-nutrition-catalog-B87k3R2e.js";const w={streak:{light:"#FED7AA",base:"#F97316",dark:"#9A3412",glow:"rgba(249,115,22,0.55)"},protein:{light:"#BBF7D0",base:"#22C55E",dark:"#166534",glow:"rgba(34,197,94,0.5)"},steps:{light:"#BFDBFE",base:"#3B82F6",dark:"#1E40AF",glow:"rgba(59,130,246,0.5)"},strength:{light:"#FEF3C7",base:"#F59E0B",dark:"#92400E",glow:"rgba(245,158,11,0.55)"},firsts:{light:"#E9D5FF",base:"#A855F7",dark:"#6B21A8",glow:"rgba(168,85,247,0.5)"}},k={light:"#E5E7EB",base:"#9CA3AF",dark:"#4B5563",glow:"rgba(0,0,0,0)"};function y(t,o){return o?w[t]:k}function b({category:t,unlocked:o,uid:s,size:i=96}){const r=y(t,o),n=`ring-${s}`,l=`face-${s}`,a=`shine-${s}`,d=`glow-${s}`,g=o?` filter="url(#${d})"`:"",f=o?1:.92;return`<svg width="${i}" height="${i}" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="${n}" x1="14" y1="10" x2="82" y2="86" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${r.light}"/>
      <stop offset="0.5" stop-color="${r.base}"/>
      <stop offset="1" stop-color="${r.dark}"/>
    </linearGradient>
    <radialGradient id="${l}" cx="0.5" cy="0.4" r="0.72">
      <stop offset="0" stop-color="${r.light}"/>
      <stop offset="0.55" stop-color="${r.base}"/>
      <stop offset="1" stop-color="${r.dark}"/>
    </radialGradient>
    <linearGradient id="${a}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.6"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="${d}" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="2" stdDeviation="3.2" flood-color="${r.glow}"/>
    </filter>
  </defs>
  <g opacity="${f}"${g}>
    <circle cx="48" cy="48" r="46" fill="url(#${n})" stroke="${r.dark}" stroke-width="1.5"/>
    <circle cx="48" cy="48" r="43" fill="none" stroke="${r.light}" stroke-opacity="0.28" stroke-width="2" stroke-dasharray="1.2 4.2" stroke-linecap="round"/>
    <circle cx="48" cy="48" r="39" fill="none" stroke="url(#${a})" stroke-width="1.6" opacity="0.7"/>
    <circle cx="48" cy="48" r="33" fill="url(#${l})" stroke="${r.dark}" stroke-opacity="0.4" stroke-width="1"/>
    <ellipse cx="48" cy="34" rx="23" ry="12.5" fill="url(#${a})"/>
  </g>
</svg>`}function $({category:t,icon:o,unlocked:s,size:i=72,className:r}){const n=h.useId().replace(/[^a-zA-Z0-9]/g,""),l=b({category:t,unlocked:s,uid:n,size:i}),a=Math.round(i*.4);return e.jsxs("span",{className:p("relative inline-grid place-items-center",r),style:{width:i,height:i},children:[e.jsx("span",{className:"absolute inset-0","aria-hidden":"true",dangerouslySetInnerHTML:{__html:l}}),e.jsx("span",{className:"relative grid place-items-center",style:{width:a,height:a},children:e.jsx(c,{name:o,className:p("h-full w-full",s?"text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]":"text-ink-500/70"),strokeWidth:2.25})}),!s&&e.jsx("span",{className:"absolute -bottom-0.5 -end-0.5 grid place-items-center rounded-full border border-line bg-surface text-ink-400 shadow-sm",style:{width:Math.round(i*.32),height:Math.round(i*.32)},"aria-hidden":"true",children:e.jsx(c,{name:"Lock",className:"h-1/2 w-1/2",strokeWidth:2.5})})]})}function O(){const{queue:t,dismiss:o}=u(),s=t[0];return s?e.jsx(j,{celebration:s,onClose:()=>o(s.key)},s.key):null}function j({celebration:t,onClose:o}){h.useEffect(()=>{const a=setTimeout(o,t.kind==="pr"?5500:6500);return()=>clearTimeout(a)},[o,t.kind]);const s=x[m()],i=t.kind==="medal",r=i?s.newMedalEyebrow:s.achievementEyebrow,n=t.title,l=i?t.description:t.body;return e.jsx("div",{className:"pointer-events-none fixed inset-x-0 top-4 z-[80] flex justify-center px-4",children:e.jsxs("div",{role:"status","aria-live":"polite",className:"card pointer-events-auto flex w-full max-w-md items-start gap-3 border-gold-500/40 bg-gradient-to-br from-surface to-gold-500/10 p-4 shadow-glow animate-pop-in",children:[i?e.jsx($,{category:t.category,icon:t.icon,unlocked:!0,size:48,className:"shrink-0"}):e.jsx("span",{className:"grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold-500/15 text-gold-500",children:e.jsx(c,{name:t.icon,className:"h-6 w-6"})}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsxs("span",{className:"flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-gold-500",children:[e.jsx(c,{name:"PartyPopper",className:"h-3.5 w-3.5"}),r]}),e.jsx("p",{className:"mt-1 text-sm font-black text-ink-900",children:n}),e.jsx("p",{className:"mt-0.5 text-xs leading-relaxed text-ink-500",children:l})]}),e.jsx("button",{type:"button",onClick:o,"aria-label":s.close,className:"grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-beige hover:text-ink-700",children:e.jsx(c,{name:"X",className:"h-4 w-4"})})]})})}export{O as AchievementToaster};
