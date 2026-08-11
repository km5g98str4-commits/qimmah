/**
 * محاكي دلالات خدمة Cloudflare Pages — [QIM-WEB-HOTFIX-002]
 *
 * مشترك بين `asset-integrity-proof.mjs` و`deploy-cutover-simulation.mjs` كي لا
 * ينفصل تعريف السلوك عن الحارس فيشيخ أحدهما دون الآخر.
 *
 * الدلالات مستمدّة من وثائق Pages ومن قياس الإنتاج الحيّ معًا:
 *   ١) الملف الساكن الموجود يُخدَم أولًا. (قياس: الأصول الحقيقية كانت تُخدَم
 *      سليمة والقاعدة الشاملة قائمة؛ المفقودة وحدها كانت تسقط عليها.)
 *   ٢) ثم قواعد `_redirects` بالترتيب، وأول تطابق يفوز.
 *   ٣) ثم `404.html` إن وُجد ⇒ **404**.
 *   ٤) وإلّا فسلوك SPA الضمني ⇒ «/» بحالة **200** — الفخّ الموثَّق في
 *      pages/configuration/serving-pages، ولذلك `404.html` شرط لا زينة.
 */
import { readdirSync, statSync } from 'node:fs'
import { join, relative, extname } from 'node:path'

const MIME = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
}

export const mimeFor = (p) => MIME[extname(p).toLowerCase()] || 'application/octet-stream'

/** يحلّل نصّ `_redirects` إلى قواعد مرتّبة. */
export function parseRedirects(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const [from, to, status] = l.split(/\s+/)
      return { from, to, status: Number(status || 302) }
    })
}

function matchRule(rule, pathname) {
  if (rule.from === pathname) return true
  if (rule.from.endsWith('/*')) return pathname.startsWith(rule.from.slice(0, -1))
  return false
}

/**
 * يحاكي ردّ Pages لمسار.
 * @returns {{status:number, body:string, contentType:string}}
 */
export function serve(pathname, { files, rules, has404 }) {
  if (files.has(pathname)) {
    return { status: 200, body: pathname, contentType: mimeFor(pathname) }
  }
  // فهرس المجلّد: «/» ⇒ «/index.html» و«/foo/» ⇒ «/foo/index.html».
  // مستقلّ تمامًا عن `_redirects` — ولذلك بقي جذر التطبيق يعمل بعد حذف القاعدة
  // الشاملة. (أسقط أول تشغيل للمحاكاة لأنها لم تكن تنفّذ هذه الخطوة.)
  if (pathname.endsWith('/')) {
    const index = `${pathname}index.html`
    if (files.has(index)) return { status: 200, body: index, contentType: mimeFor(index) }
  }
  for (const rule of rules) {
    if (!matchRule(rule, pathname)) continue
    if (rule.status === 200) {
      return { status: 200, body: rule.to, contentType: mimeFor(rule.to) }
    }
    return { status: rule.status, body: rule.to, contentType: 'text/html' }
  }
  if (has404) {
    return { status: 404, body: '/404.html', contentType: 'text/html; charset=utf-8' }
  }
  return { status: 200, body: '/index.html', contentType: 'text/html; charset=utf-8' }
}

/** قائمة مسارات الملفات داخل مجلّد بناء، بصيغة مسارات URL مطلقة. */
export function listFiles(dir) {
  const out = new Set()
  const walk = (d) => {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry)
      if (statSync(full).isDirectory()) walk(full)
      else out.add('/' + relative(dir, full).split('\\').join('/'))
    }
  }
  walk(dir)
  return out
}
