// تحميل مسبق لصور Supabase المحلية عبر مرآة موثوقة عند حجب سجلّ ECR.
//
// في بعض بيئات الشبكة يكون CDN طبقات صور Docker/ECR محجوبًا (403)، بينما مرآة Google
// الرسمية لـ Docker Hub (mirror.gcr.io) مفتوحة. تنشر Supabase **نفس** الصور على Docker Hub
// تحت مساحة الاسم supabase/*، فنسحبها من هناك (عبر المرآة المضبوطة في daemon) ونعيد وسمها
// بالاسم الذي يتوقّعه الـ CLI (public.ecr.aws/supabase/*). المصدر رسمي والمحتوى مطابق
// (عنونة بالـ digest). لا نستخدم صورًا مجهولة ولا forks.
//
// المتطلّب: daemon مضبوط بـ registry-mirrors=[https://mirror.gcr.io] (انظر README).
// التشغيل: node scripts/e2e-auth/preload-images.mjs   (أو npm run test:e2e:auth:preload)

import { execSync } from 'node:child_process'

// قائمة مثبّتة بالإصدارات — مطابقة لِما يطلبه supabase CLI (v2.109.x).
const IMAGES = [
  'postgres:15.8.1.085',
  'gotrue:v2.192.0',
  'kong:2.8.1',
  'postgrest:v14.14',
  'storage-api:v1.62.5',
  'postgres-meta:v0.96.6',
  'studio:2026.07.06-sha-66cf431',
  'realtime:v2.112.6',
  'edge-runtime:v1.74.2',
  'logflare:1.46.0',
  'imgproxy:v3.8.0',
  'vector:0.53.0-alpine',
  'mailpit:v1.30.2',
]

// صور ليست تحت مساحة الاسم supabase/ على Docker Hub — نجلبها من مصادرها الرسمية العلوية
// (نفس المحتوى الذي تعكسه Supabase على ECR)، ثم نعيد وسمها بالاسم الذي يتوقّعه الـ CLI.
const SOURCE = {
  'kong:2.8.1': 'kong:2.8.1',
  'postgrest:v14.14': 'postgrest/postgrest:v14.14',
  'imgproxy:v3.8.0': 'darthsim/imgproxy:v3.8.0',
  'vector:0.53.0-alpine': 'timberio/vector:0.53.0-alpine',
  'mailpit:v1.30.2': 'axllent/mailpit:v1.30.2',
}
const ECR = (nameTag) => `public.ecr.aws/supabase/${nameTag}`
const HUB = (nameTag) => `docker.io/${SOURCE[nameTag] ?? `supabase/${nameTag}`}` // يمرّ عبر mirror.gcr.io

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}
function has(image) {
  try {
    sh(`docker image inspect ${image}`)
    return true
  } catch {
    return false
  }
}

// تأكيد أن الـ daemon يستخدم المرآة (وإلا ستفشل السحوبات على نفس CDN المحجوب).
try {
  const info = sh('docker info')
  if (!/mirror\.gcr\.io/.test(info)) {
    console.warn('⚠️ لم تُضبط registry-mirrors=mirror.gcr.io في الـ daemon — قد تفشل السحوبات. انظر README.')
  }
} catch {
  console.error('✖ Docker daemon غير متاح.')
  process.exit(2)
}

let ok = 0
let fail = 0
for (const it of IMAGES) {
  const ecr = ECR(it)
  if (has(ecr)) {
    console.log(`· موجود مسبقًا: ${ecr}`)
    ok++
    continue
  }
  try {
    process.stdout.write(`· سحب ${HUB(it)} … `)
    sh(`docker pull ${HUB(it)}`)
    sh(`docker tag ${HUB(it)} ${ecr}`)
    let digest = ''
    try {
      digest = sh(`docker image inspect --format '{{index .RepoDigests 0}}' ${HUB(it)}`)
    } catch {}
    console.log(`تمّ ووُسم كـ ${ecr}  ${digest ? `[${digest.split('@')[1] || ''}]` : ''}`)
    ok++
  } catch (e) {
    console.log('فشل')
    console.error(`  ✖ ${it}: ${(e.stderr || e.message || '').toString().split('\n').slice(-2).join(' ')}`)
    fail++
  }
}

console.log(`\n== الصور: ${ok} جاهزة · ${fail} فشل ==`)
if (fail) {
  console.error('بعض الصور تعذّر سحبها — تأكّد من ضبط المرآة وإعادة المحاولة.')
  process.exit(1)
}
console.log('كل صور Supabase المحلية جاهزة تحت أسماء public.ecr.aws/supabase/* — supabase start سيجدها محليًا.')
