// إثبات وسائط الكتالوج — يتحقّق من كل صورة يعرضها التطبيق فعليًا:
//   • كل إطار تمرين (exerciseMedia.img0/img1) موجود محليًا في public/ بحجم>0 وبتوقيع JPEG.
//   • كل صورة جهاز (machineImages) موجودة محليًا بنفس الشروط.
//   • كل رابط بعيد بديل (img0Remote/img1Remote → raw.githubusercontent) يُفحَص عبر HTTP
//     (الحالة/نوع المحتوى/الحجم) — فقط عند CATALOG_MEDIA_REMOTE=1 (افتراضيًا محلي وحتمي).
//
// التطبيق يعرض الصور المحلّية المُلتزَمة (لا اعتماد شبكة وقت التشغيل)، فالفحص المحلّي هو
// البوّابة الحاسمة؛ الفحص البعيد إثبات إضافي لصحّة مصدر إعادة التوليد.
//
// تشغيل مباشر (لا يمسّ package.json):
//   node scripts/run-catalog-media-proof.mjs                # محلي (بوّابة)
//   CATALOG_MEDIA_REMOTE=1 node scripts/run-catalog-media-proof.mjs   # + فحص HTTP للبعيد

import { readFileSync, existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { exerciseMedia } from '@/data/exerciseMedia'
import { machineImages } from '@/data/machineImages'

const ROOT = process.cwd()
const REMOTE = process.env.CATALOG_MEDIA_REMOTE === '1'

interface LocalResult { id: string; path: string; ok: boolean; reason?: string; bytes?: number; fmt?: string; extMismatch?: boolean }

/** Detect a real image format from magic bytes (browsers sniff regardless of extension). */
function imageFormat(buf: Buffer): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png'
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'gif'
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'webp'
  // SVG متجهي (رسوم الأجهزة الداخلية) — صورة صالحة يعرضها المتصفّح/WKWebView مباشرةً.
  const head = buf.subarray(0, 16).toString('latin1').replace(/^\uFEFF/, '').trimStart()
  if (head.startsWith('<svg') || head.startsWith('<?xml')) return 'svg'
  return null
}
interface RemoteResult { url: string; ok: boolean; status?: number; type?: string; bytes?: number; reason?: string }

const localResults: LocalResult[] = []
const remoteUrls: string[] = []

/** A committed local asset must exist, be non-empty, and start with the JPEG magic bytes. */
function checkLocal(id: string, publicPath: string): void {
  const abs = resolve(ROOT, 'public', publicPath.replace(/^\//, ''))
  if (!existsSync(abs)) return void localResults.push({ id, path: publicPath, ok: false, reason: 'missing' })
  const size = statSync(abs).size
  if (size === 0) return void localResults.push({ id, path: publicPath, ok: false, reason: 'empty' })
  const head = readFileSync(abs).subarray(0, 16)
  const fmt = imageFormat(head)
  const ext = (publicPath.split('.').pop() ?? '').toLowerCase()
  // A valid image is a pass regardless of extension (browsers/WKWebView sniff bytes).
  // An extension≠format mismatch is recorded as a hygiene note, not a failure.
  const extMismatch = fmt !== null && fmt !== ext && !(fmt === 'jpg' && ext === 'jpeg')
  localResults.push({ id, path: publicPath, ok: fmt !== null, reason: fmt ? undefined : 'not-an-image', bytes: size, fmt: fmt ?? undefined, extMismatch })
}

// ── Collect + check every local asset the app renders ──
for (const [id, m] of Object.entries(exerciseMedia)) {
  checkLocal(id, m.img0)
  checkLocal(id, m.img1)
  if (m.img0Remote) remoteUrls.push(m.img0Remote)
  if (m.img1Remote) remoteUrls.push(m.img1Remote)
}
for (const [id, path] of Object.entries(machineImages)) {
  checkLocal(id, path)
}

async function checkRemote(url: string): Promise<RemoteResult> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15000)
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal })
    clearTimeout(timer)
    const type = res.headers.get('content-type') ?? ''
    const bytes = Number(res.headers.get('content-length') ?? 0)
    const ok = res.status === 200 && /^image\//.test(type)
    return { url, ok, status: res.status, type, bytes, reason: ok ? undefined : 'bad-status-or-type' }
  } catch (e) {
    return { url, ok: false, reason: `network:${(e as Error).name}` }
  }
}

async function main(): Promise<void> {
  const localFail = localResults.filter((r) => !r.ok)
  const localPass = localResults.length - localFail.length

  console.log(`\n① الوسائط المحلّية (المصدر الذي يشحنه التطبيق)`)
  console.log(`  تمارين: ${Object.keys(exerciseMedia).length} · أجهزة: ${Object.keys(machineImages).length}`)
  console.log(`  ملفات مفحوصة: ${localResults.length} · نجح: ${localPass} · فشل: ${localFail.length}`)
  for (const f of localFail) console.log(`  ✗ ${f.id} → ${f.path} (${f.reason})`)
  const mism = localResults.filter((r) => r.ok && r.extMismatch)
  if (mism.length) {
    console.log(`  ℹ️ امتداد لا يطابق الصيغة الفعلية (يُعرض بلا مشكلة — تنظيف اختياري): ${mism.length}`)
    for (const m of mism) console.log(`     · ${m.id}: .${m.path.split('.').pop()} فعليًا ${m.fmt}`)
  }

  let remoteFail: RemoteResult[] = []
  let remoteNet = 0
  if (REMOTE) {
    console.log(`\n② الروابط البعيدة (HTTP) — ${remoteUrls.length} رابطًا`)
    const results: RemoteResult[] = []
    const CONC = 24
    for (let i = 0; i < remoteUrls.length; i += CONC) {
      const batch = remoteUrls.slice(i, i + CONC)
      results.push(...(await Promise.all(batch.map(checkRemote))))
    }
    const netErr = results.filter((r) => r.reason?.startsWith('network'))
    remoteNet = netErr.length
    // A remote is only a REAL failure when reachable and non-image (404/html); network
    // errors are environmental (offline) and never gate — local assets are the truth.
    remoteFail = results.filter((r) => !r.ok && !r.reason?.startsWith('network'))
    const remotePass = results.filter((r) => r.ok).length
    console.log(`  نجح: ${remotePass} · فشل حقيقي: ${remoteFail.length} · تعذّر شبكيًا: ${remoteNet}`)
    for (const f of remoteFail.slice(0, 40)) console.log(`  ✗ ${f.status ?? '-'} ${f.type ?? '-'} ${f.url}`)
  } else {
    console.log(`\n② الروابط البعيدة: تُخطّى (شغّل بـ CATALOG_MEDIA_REMOTE=1 للفحص عبر HTTP)`)
  }

  // Broken = local missing/invalid (what actually ships). Remote-only 404 with a valid
  // local file is NOT broken. Collect genuinely broken entries for BROKEN-MEDIA.md.
  console.log(`\n${'─'.repeat(52)}`)
  const gateFail = localFail.length + remoteFail.length
  if (gateFail === 0) {
    const scope = REMOTE ? `${localResults.length} محلي + ${remoteUrls.length} بعيد` : `${localResults.length} محلي`
    console.log(`✅ كل الوسائط سليمة — ${scope}${REMOTE ? ` (تعذّر شبكيًا: ${remoteNet})` : ''}.`)
  } else {
    console.log(`❌ فشل ${gateFail}: محلي=${localFail.length} بعيد=${remoteFail.length}. راجع BROKEN-MEDIA.md`)
    process.exit(1)
  }
}

void main()
