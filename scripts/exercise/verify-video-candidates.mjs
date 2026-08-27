#!/usr/bin/env node
// تحقّق مرشّحي الفيديو — [مهمة الصقل §3]
//
// ═══ لماذا ملفّ مرشّحين منفصل ═══
// قاعدة video-research.json الأولى تمنع إدخال youtubeVideoId غير مُتحقَّق —
// والتحقّق (oEmbed) محجوب من بيئة الوكلاء (CONNECT 403 مقيسة على
// www.youtube.com وnoembed.com)، بينما عدّاء CI شبكته مفتوحة. فالبحث يرشّح
// محليًّا في video-candidates.json، وهذا السكربت يتحقّق في CI ويكتب الدليل في
// video-candidates.verified.json — ولا يلمس السجلّ المعتمد: الدمج فيه قرار
// منسّق لاحق يقرأ الدليل بعينه (نفس نمط food-corpus: CI يُنتج، والدمج مُراجَع).
//
//   node scripts/exercise/verify-video-candidates.mjs
//
// المخرج لكل مرشّح: ok + العنوان والقناة كما أعادهما yt oEmbed حرفيًّا، أو
// سبب السقوط مسمًّى (404 = لا وجود · 401/403 = خاص/التضمين معطَّل).
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const srcPath = resolve(here, 'video-candidates.json')
const outPath = resolve(here, 'video-candidates.verified.json')

let record
try {
  record = JSON.parse(readFileSync(srcPath, 'utf8'))
} catch {
  // غياب الملف حالة صادقة: لم يُرشَّح شيء بعد — تخطٍّ معلَن لا سقوط تقني.
  console.log('⏭️  لا ملف video-candidates.json — لا مرشّحين بعد، لا شيء يُتحقَّق.')
  process.exit(0)
}
const candidates = record.candidates ?? []
if (candidates.length === 0) {
  console.log('لا مرشّحين في video-candidates.json — لا شيء يُتحقَّق.')
  process.exit(0)
}

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase()

async function oembed(videoId) {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'qimmah-video-verifier' } })
    if (res.status === 404) return { ok: false, reason: 'not-found (oEmbed 404)' }
    if (res.status === 401 || res.status === 403) return { ok: false, reason: `not embeddable/private (oEmbed ${res.status})` }
    if (!res.ok) return { ok: false, reason: `oEmbed HTTP ${res.status}` }
    const json = await res.json()
    return { ok: true, title: json.title, author: json.author_name }
  } catch (err) {
    return { ok: false, reason: `network error: ${err.message}` }
  }
}

const results = []
let pass = 0
for (const c of candidates) {
  const r = await oembed(c.candidateVideoId)
  if (r.ok) {
    pass++
    // تطابق القناة استشاري لا حاكم: oEmbed هو الحقيقة، والمُرشِّح توقّع.
    const channelMatches = norm(r.author) === norm(c.expectedChannel)
    console.log(`✓ ${c.exerciseId.padEnd(32)} ${r.title} — ${r.author}${channelMatches ? '' : '  ⚠ قناة مختلفة عن المتوقَّع'}`)
    results.push({
      exerciseId: c.exerciseId,
      candidateVideoId: c.candidateVideoId,
      ok: true,
      title: r.title,
      author: r.author,
      channelMatchesExpected: channelMatches,
      verificationEvidence: `YouTube oEmbed for watch?v=${c.candidateVideoId} returned title "${r.title}" by author_name "${r.author}"`,
    })
  } else {
    console.log(`✗ ${c.exerciseId.padEnd(32)} ${c.candidateVideoId}  ${r.reason}`)
    results.push({ exerciseId: c.exerciseId, candidateVideoId: c.candidateVideoId, ok: false, reason: r.reason })
  }
}

writeFileSync(outPath, JSON.stringify({
  _readme: 'دليل تحقّق oEmbed لمرشّحي video-candidates.json — يُنتجه CI. الدمج في video-research.json قرار منسّق يقرأ هذا الدليل، لا خطوة آلية.',
  verifiedAt: new Date().toISOString().slice(0, 10),
  results,
}, null, 2) + '\n')

console.log(`\n── الخلاصة ── نجح ${pass}/${candidates.length} → ${outPath}`)
