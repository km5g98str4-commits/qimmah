-- ============================================================================
-- 20260809120002 — P2: استرجاع منح الأكواد — code_redemption_ledger يعمل بالاتجاهين
-- ============================================================================
-- تكملة 20260809120001. تسدّ الفجوة الثانية من مراجعة التقارب:
--
--   **الاسترجاع كان للشراء وحده.** `claim_pending_grants()` تفحص
--   `purchase_ledger` فتعيد Premium بعد حذف الحساب — لكن `code_redemption_ledger`
--   كان يُستخدم **للمنع فقط** (لا استرداد ثانٍ لنفس الكود) لا للاسترجاع. فمن
--   استردّ كود ٩٠ يومًا وحذف حسابه في اليوم الخامس فقد الـ٨٥ الباقية بلا مسار
--   عودة — والسجلّ الذي يمنعه من الاسترداد مجددًا هو نفسه الذي يثبت حقّه.
--
-- سياسة الاسترجاع — أهلية المنحة، مسمّاة بندًا بندًا:
--
--   تُسترجَع منحة كود **إذا اجتمعت** الشروط الأربعة:
--     ① صفّ في `code_redemption_ledger` يطابق هوية المستخدم (عبر **كل**
--        إصدارات الملح) — إثبات استرداد شرعي سابق.
--     ② نافذة المنحة الأصلية ما زالت سارية:
--        `redeemed_at + duration_days > now()`. **منحة منتهية لا تُسترجَع.**
--     ③ الكود ما زال `enabled`. تعطيل الكود إبطال إداري — **كود مُبطَل لا
--        يُسترجَع** (مفتاح الطوارئ الوحيد للإدارة على منح كود مسرَّب).
--     ④ الهوية غير محظورة — `access_revoked` يسبق كل شيء (الهجرة السابقة).
--
--   وثلاثة قرارات صريحة لا سهوًا:
--     • **استنفاد الكود لا يُسقط الاسترجاع.** صفّ السجلّ *هو* الحصّة المستهلَكة
--       — الاسترجاع لا يستهلك حصّة جديدة ولا يلمس `redemption_count`. ولولا
--       هذا لصار كل كود فردي (`max_redemptions=1` الافتراضي) غير قابل
--       للاسترجاع أبدًا: استرداده بعينه هو ما يستنفده. أمّا **محاولة استرداد
--       جديدة** لكود مستنفَد فتبقى مرفوضة `invalid_code` كما كانت.
--     • **الاسترجاع يعيد المنحة الأصلية ولا يجدّدها**: `activated_at` يبقى
--       وقت الاسترداد الأصلي و`expires_at` نهايته الأصلية — حذف الحساب ليس
--       زرّ تمديد.
--     • **التجربة لا تُسترجَع عمدًا**: حذف الحساب يُنهي ما تبقّى منها،
--       و`trial_ledger` يُبقيها مرّة واحدة. سلوك قائم يُوثَّق لا يُغيَّر.
--
--   الأسبقية كما هي: شراء Premium أولًا، ثم أفضل منحة كود سارية (الأبعد
--   انتهاءً)، ولا تخفيض لمنحة قائمة أعلى أو أطول.
--
-- idempotent بالكامل (create or replace وحدها).
-- ============================================================================

create or replace function public.claim_pending_grants()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  em  text;
  cur record;
  rec record;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select u.email into em from auth.users u where u.id = uid;
  if em is null then raise exception 'unknown user' using errcode = 'P0002'; end if;

  -- ④ الإلغاء لاصق وينجو من حذف الحساب (20260809120001).
  if private.is_access_revoked(uid, em) then
    raise exception 'access_revoked' using errcode = '28000';
  end if;

  -- شراء مسجَّل تحت أي إصدار ملح ⇒ Premium — الأسبقية العليا، كما كان.
  if exists (select 1 from private.identity_hashes(em) ih
             join public.purchase_ledger p on p.email_hash = ih.email_hash) then
    insert into public.entitlements (user_id, email, entitlement_type, source,
                                     activated_at, expires_at, no_expiry)
    values (uid, em, 'premium', 'salla', now(), null, true)
    on conflict (user_id) do update
      set entitlement_type = 'premium', source = 'salla', activated_at = now(),
          expires_at = null, no_expiry = true, revoked_at = null, revoked_reason = null;
    return 'premiumActive';
  end if;

  -- منح الأكواد: أفضل منحة **مؤهَّلة** (الشروط ①–③ أعلاه)، الأبعد انتهاءً.
  select l.code_id,
         l.redeemed_at,
         l.redeemed_at + make_interval(days => ac.duration_days) as original_expiry
    into rec
    from public.code_redemption_ledger l
    join public.access_codes ac on ac.id = l.code_id
   where l.email_hash in (select ih.email_hash from private.identity_hashes(em) ih)
     and ac.enabled                                                       -- ③
     and l.redeemed_at + make_interval(days => ac.duration_days) > now()  -- ②
   order by original_expiry desc
   limit 1;

  select * into cur from public.entitlements where user_id = uid;

  if rec.code_id is not null then
    -- لا تخفيض: منحة قائمة أعلى رتبةً أو أطول أمدًا تبقى هي المعروضة.
    if found and cur.revoked_at is null
       and (private.grant_rank(cur.entitlement_type) > 2
            or (cur.expires_at is not null and cur.expires_at >= rec.original_expiry)
            or cur.no_expiry) then
      return private.derive_state(cur.entitlement_type, cur.no_expiry, cur.expires_at, cur.revoked_at);
    end if;

    insert into public.entitlements (user_id, email, entitlement_type, source,
                                     activation_code_id, activated_at, expires_at, no_expiry)
    values (uid, em, 'special', 'code', rec.code_id, rec.redeemed_at, rec.original_expiry, false)
    on conflict (user_id) do update
      set entitlement_type = 'special', source = 'code',
          activation_code_id = rec.code_id, activated_at = rec.redeemed_at,
          expires_at = rec.original_expiry, no_expiry = false,
          revoked_at = null, revoked_reason = null;

    -- استرجاع صفّ الاسترداد المنسوب أيضًا — كي يرى المستخدم استرداده عبر
    -- سياسة `select_own` القائمة. لا يلمس `redemption_count`: الحصّة استُهلكت
    -- عند الاسترداد الأصلي وصفّ السجلّ الدائم شاهدها.
    insert into public.access_code_redemptions (code_id, user_id)
    values (rec.code_id, uid)
    on conflict (code_id, user_id) do nothing;

    return 'specialAccessActive';
  end if;

  if found then
    return private.derive_state(cur.entitlement_type, cur.no_expiry, cur.expires_at, cur.revoked_at);
  end if;
  return 'noAccess';
end;
$$;
