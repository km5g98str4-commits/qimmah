// ============================================================================
// مقارنة ثابتة الزمن + تفويض نداء الطرفية.
// ============================================================================
// نسخة مستقلّة عن `salla-webhook/contract.mjs` عمدًا: طرفيّتان مختلفتان لا
// تتشاركان ملفًا تملكه حارة أخرى (الميثاق §1.4/٢ — بؤر التصادم محجورة).
// ============================================================================

/**
 * مقارنة لا يكشف زمنها موضع أول اختلاف.
 * فحص الطول أولًا **مقصود ومقبول**: الطول ليس سرًّا، والمقارنة بعده تمرّ على
 * كل خانة دائمًا.
 */
export function constantTimeEqual(a, b) {
  const x = String(a ?? '')
  const y = String(b ?? '')
  if (x.length !== y.length) return false
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i)
  return diff === 0
}

/**
 * الطرفية تُنادى **من خادم إلى خادم** (طرفية سلة أو مهمّة مجدولة)، لا من
 * متصفّح. فالتفويض سرّ مشترك في `Authorization: Bearer`.
 *
 * ⚠️ السرّ الفارغ **يرفض**، ولا يعني «التفويض معطّل». طرفيةُ بريدٍ مفتوحة
 * للعموم مضخّةُ رسائل باسمنا، وسمعة النطاق تُحرق مرّة واحدة.
 */
export function authorizeCall(headers, secret) {
  if (!secret || String(secret).length < 24) {
    return { ok: false, reason: 'mailer_secret_missing' }
  }
  const raw = headers?.get ? headers.get('authorization') : headers?.authorization
  const presented = String(raw || '').replace(/^Bearer\s+/i, '')
  if (!presented) return { ok: false, reason: 'authorization_missing' }
  if (!constantTimeEqual(presented, secret)) return { ok: false, reason: 'authorization_mismatch' }
  return { ok: true }
}
