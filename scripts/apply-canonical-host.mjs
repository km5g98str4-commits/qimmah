#!/usr/bin/env node
// يطبّق المضيف المعتمد من `site/canonical-host.json` على كل رابط مطلق يشير إلى
// قِمّة نفسها — [FOUNDER-QA-002].
//
// لماذا يوجد هذا السكربت:
//   كان المضيف مكتوبًا بيده في **١٩ موضعًا** عبر ثمانية ملفات (canonical · og:url ·
//   og:image · twitter:image · JSON-LD · sitemap · robots)، وكلّها تشير إلى
//   `qimmah.app` — ومقياس اليوم يقول إنه **لا يُحلّ أصلًا** (NXDOMAIN). أي أن
//   كل بطاقة مشاركة وكل سطر في خريطة الموقع يشير إلى مضيف غير موجود، بينما
//   النسخة الحيّة على مضيف آخر. تعديل ١٩ موضعًا بيد الإنسان عند الإطلاق يضمن
//   نسيان أحدها؛ فصار المضيف مصدرًا واحدًا يُطبَّق بأمر، ويحرسه `test:canonical-url`.
//
// التشغيل: node scripts/apply-canonical-host.mjs [--check]
//   بلا وسيط: يكتب. مع `--check`: يبلّغ ولا يكتب (يستعمله الحارس).

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** الملفات التي تحمل روابط قِمّة المطلقة. مُعلَنة صراحةً لا مُكتشَفة بالمسح: */
export const CANONICAL_FILES = [
  // ═══ السطح المخدوم فعلًا (يُبنى مع التطبيق ويُرفع مع `dist`) ═══
  // ⚠️ **هذان الملفان كانا خارج القائمة، وهما الوحيدان اللذان يقرأهما محرّك بحث
  // حقيقي اليوم.** فمرّ `robots.txt` منشورًا وهو يحيل إلى خريطة موقع على مضيف
  // **لا يُحلّ** (`qimmah.app`) — والحارس أخضر، لأن القائمة لم تكن تعرفهما.
  // الدرس: قائمة استثناء ضيّقة تجعل الحارس يحرس ما لا يُخدَم ويترك ما يُخدَم.
  'index.html',
  'public/robots.txt',
  'public/sitemap.xml',
  // ═══ حزمة `site/` — **غير منشورة** (انظر `siteBundle` في canonical-host.json) ═══
  'site/index.html',
  'site/privacy.html',
  'site/terms.html',
  'site/support.html',
  'site/press.html',
  'site/robots.txt',
  'site/sitemap.xml',
]

/**
 * كل مضيف استُعمل تاريخيًّا لقِمّة. أي واحد منها في ملف منشور = رابط يجب أن
 * يُنقل إلى المضيف المعتمد. القائمة مُعلَنة كي يكون «القديم» شيئًا يُسمّى.
 */
export const KNOWN_HOSTS = [
  'https://qimmah.app',
  'https://www.qimmah.app',
  'https://qimmah-8qp.pages.dev',
  'https://qimmah-site.pages.dev',
]

export function readCanonical() {
  const raw = JSON.parse(readFileSync(join(root, 'site/canonical-host.json'), 'utf8'))
  if (typeof raw.origin !== 'string' || !/^https:\/\/[a-z0-9.-]+$/.test(raw.origin)) {
    throw new Error(`canonical-host.json: origin غير صالح — ${raw.origin}`)
  }
  return raw
}

/** يستبدل كل مضيف معروف بالمضيف المعتمد. يُرجع النصّ الجديد وعدد التبديلات. */
export function rewrite(text, origin) {
  let out = text
  let hits = 0
  for (const host of KNOWN_HOSTS) {
    if (host === origin) continue
    const parts = out.split(host)
    hits += parts.length - 1
    out = parts.join(origin)
  }
  return { out, hits }
}

const checkOnly = process.argv.includes('--check')
const { origin } = readCanonical()
let total = 0
const offenders = []

for (const rel of CANONICAL_FILES) {
  const path = join(root, rel)
  const text = readFileSync(path, 'utf8')
  const { out, hits } = rewrite(text, origin)
  if (hits > 0) {
    total += hits
    offenders.push(`${rel} (${hits})`)
    if (!checkOnly) writeFileSync(path, out)
  }
}

if (checkOnly) {
  if (total === 0) {
    console.log(`✅ كل الروابط المطلقة على المضيف المعتمد — ${origin}`)
  } else {
    console.log(`❌ ${total} رابطًا على مضيف غير معتمد: ${offenders.join(' · ')}`)
    process.exit(1)
  }
} else {
  console.log(total === 0 ? `لا تغيير — الكل على ${origin}` : `✅ نُقل ${total} رابطًا إلى ${origin}: ${offenders.join(' · ')}`)
}
