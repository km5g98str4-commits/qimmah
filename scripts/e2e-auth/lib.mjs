// حزمة اختبار المصادقة الحيّة (Reset Password + Delete Account) — أدوات مشتركة.
//
// ⚠️ حواجز الإنتاج: كل شيء هنا يعمل **فقط** على Supabase محلي (127.0.0.1). أي محاولة
// لتشغيله على مشروع الإنتاج تُرمى فورًا. لا نستخدم أبدًا مفتاح/رابط الإنتاج، ولا نحذف
// إلا حسابات اختبار على نطاق غير قابل للتوجيه.

import { execSync } from 'node:child_process'

// معرّف مشروع Supabase الإنتاجي — يُرفض هدفًا للاختبار تحت أي ظرف.
export const PROD_SUPABASE_REF = 'ledlypcyrtnzvjvhykwz'
// نطاق بريد اختبار غير قابل للتوجيه — كل حسابات الاختبار تحته، والتنظيف يقتصر عليه.
export const E2E_EMAIL_DOMAIN = 'qimmah-e2e.test'
// منافذ Supabase المحلية القياسية (supabase start).
export const LOCAL = {
  api: 'http://127.0.0.1:54321',
  db: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  inbucket: 'http://127.0.0.1:54324',
}

/** يفكّ حمولة JWT (بدون تحقق توقيع — للفحص فقط) لقراءة ref المشروع. */
function jwtRef(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
    return payload.ref ?? null
  } catch {
    return null
  }
}

/**
 * حاجز صارم: يتأكّد أن الهدف محلي فقط. يرمي إن كان الرابط غير محلي أو المفتاح يعود
 * لمشروع الإنتاج. يُستدعى قبل أي عملية إنشاء/حذف.
 */
export function assertLocalTarget(url, anonKey) {
  if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url)) {
    throw new Error(`GUARD: هدف غير محلي (${url}). الاختبار يعمل فقط على Supabase محلي.`)
  }
  if (url.includes('supabase.co')) {
    throw new Error('GUARD: رُفض هدف supabase.co (إنتاج).')
  }
  const ref = anonKey ? jwtRef(anonKey) : null
  if (ref && ref === PROD_SUPABASE_REF) {
    throw new Error('GUARD: المفتاح يعود لمشروع الإنتاج — رُفض.')
  }
  return true
}

/** يتأكّد أن البريد على نطاق الاختبار غير القابل للتوجيه (قبل أي حذف/إنشاء). */
export function assertTestEmail(email) {
  if (!email.endsWith('@' + E2E_EMAIL_DOMAIN)) {
    throw new Error(`GUARD: بريد ليس اختباريًا (${email}). يجب أن ينتهي بـ @${E2E_EMAIL_DOMAIN}.`)
  }
  return true
}

/** بريد اختبار عشوائي آمن (نطاق غير قابل للتوجيه). index لتمييز عدّة حسابات في نفس التشغيل. */
export function randomTestEmail(index = 0) {
  // عشوائية كافية بلا اعتماد على الوقت الخارجي.
  const rnd = Math.random().toString(36).slice(2, 10)
  return `e2e-${index}-${rnd}@${E2E_EMAIL_DOMAIN}`
}

/** كلمة مرور اختبار صالحة (تجتاز السياسة: ٨+ أحرف + حرف + رقم). */
export function randomPassword(prefix = 'Pw') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Math.floor(Math.random() * 9000 + 1000)}`
}

/** الجزء المحلي من البريد — اسم صندوق Inbucket. */
export function mailboxOf(email) {
  return email.split('@')[0]
}

/** يلتقط رابط الاستعادة من نصّ الرسالة (يُفضّل verify/recover/token/code). */
export function pickRecoveryLink(body) {
  const m = body.match(/https?:\/\/[^\s"'<>]+/g) || []
  const raw = m.find((u) => /verify|recover|token|code=/.test(u)) || m[0] || null
  if (!raw) return null
  // فكّ ترميز HTML: روابط جسم HTML تحمل «&amp;» بدل «&»، فتصل معاملات verify مشوّهة لـ GoTrue
  // (amp;type=…) ويردّ 400. نُعيدها سليمة قبل الاستخدام.
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&#0*38;/g, '&')
    .replace(/&#x0*26;/gi, '&')
}

/**
 * يستخرج رابط الاستعادة من صندوق البريد المحلي. يدعم **Mailpit** (نسخ supabase الحديثة)
 * و**Inbucket** (الأقدم) — كلاهما على المنفذ 54324. لا يطبع الرمز الكامل. يعيد الرابط أو null.
 */
export async function fetchRecoveryLink(email, { attempts = 30, delayMs = 1000 } = {}) {
  const box = mailboxOf(email)
  for (let i = 0; i < attempts; i++) {
    // 1) Mailpit API
    try {
      const res = await fetch(`${LOCAL.inbucket}/api/v1/search?query=${encodeURIComponent('to:' + email)}`)
      if (res.ok) {
        const data = await res.json()
        const msgs = data.messages || []
        if (msgs.length) {
          const full = await fetch(`${LOCAL.inbucket}/api/v1/message/${msgs[0].ID}`).then((r) => r.json())
          const link = pickRecoveryLink(`${full.HTML ?? ''}\n${full.Text ?? ''}`)
          if (link) return link
        }
      }
    } catch {
      /* ليس Mailpit أو ليس جاهزًا */
    }
    // 2) Inbucket API (احتياطي)
    try {
      const list = await fetch(`${LOCAL.inbucket}/api/v1/mailbox/${box}`).then((r) => r.json())
      if (Array.isArray(list) && list.length) {
        const msg = await fetch(`${LOCAL.inbucket}/api/v1/mailbox/${box}/${list[list.length - 1].id}`).then((r) => r.json())
        const link = pickRecoveryLink(`${msg.body?.html ?? ''}\n${msg.body?.text ?? ''}`)
        if (link) return link
      }
    } catch {
      /* ليس Inbucket أو ليس جاهزًا */
    }
    await sleep(delayMs)
  }
  return null
}

/** استعلام psql على القاعدة المحلية فقط — يعيد النص الخام (row count أو قيمة). */
export function psql(sql) {
  // -A -t: بلا محاذاة وبلا رؤوس. القاعدة محلية حصراً (LOCAL.db).
  return execSync(`psql "${LOCAL.db}" -A -t -c ${shellQuote(sql)}`, { encoding: 'utf8' }).trim()
}

/** عدد صفوف auth.users لبريد اختبار (0 = محذوف). */
export function authUserCount(email) {
  assertTestEmail(email)
  return Number(psql(`select count(*) from auth.users where email = '${email.replace(/'/g, "''")}'`))
}

/** عدد صفوف المستخدم عبر كل جداول التطبيق الخمسة. */
export function appRowsCount(userId) {
  const tables = ['profiles', 'workout_sessions', 'exercise_history', 'measurement_logs', 'daily_logs']
  const q = tables.map((t) => `(select count(*) from public.${t} where user_id = '${userId}')`).join(' + ')
  return Number(psql(`select ${q}`))
}

/** تنظيف: حذف كل حسابات نطاق الاختبار من auth.users (cascade يحذف صفوف التطبيق). */
export function cleanupTestUsers() {
  try {
    const n = psql(
      `with d as (delete from auth.users where email like '%@${E2E_EMAIL_DOMAIN}' returning 1) select count(*) from d`,
    )
    return Number(n)
  } catch {
    return -1
  }
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function shellQuote(s) {
  return `'${s.replace(/'/g, `'\\''`)}'`
}

/** يقرأ رابط/مفتاح Supabase المحلي من `supabase status -o env`. يرمي إن لم يكن محليًا. */
export function localSupabaseEnv(cwd = '.') {
  let out
  try {
    out = execSync('npx --yes supabase status -o env', { encoding: 'utf8', cwd })
  } catch (e) {
    throw new Error('supabase CLI/stack غير متاح — شغّل `supabase start` أولًا. ' + (e.message || ''))
  }
  const get = (k) => (out.match(new RegExp(`^${k}="?([^"\\n]+)"?`, 'm')) || [])[1]
  const url = get('API_URL') || LOCAL.api
  const anon = get('ANON_KEY')
  assertLocalTarget(url, anon)
  return { url, anon }
}
