-- ============================================================================
-- [ADMIN-CONV] اكتمال صفحة الحساب — سجلّ الأكواد وبلاغات الطعام
-- ============================================================================
-- صفحة الحساب تجيب «هل استحقاقه صحيح؟» بعدّادات: `codesRedeemed = 2` رقمٌ بلا
-- أسماء — أيّ كودين؟ من أيّ حملة؟ ومتى؟ فسؤال دعم واقعي («استخدمت كود رمضان
-- وما فُتح لي») لا يُجاب منها. وكذلك بلاغات الطعام: المستخدم يسأل «وش صار على
-- بلاغي؟» ولا شيء في صفحته يريه.
--
-- ═══ حدود ما يُضاف — بنفس عقد الشاشة ═══
--   • **سجلّ الأكواد**: وسم الحملة وتاريخ الاستهلاك والمدّة فقط. لا بصمة ولا
--     كود خام (لا يوجد خام أصلًا) ولا أثر إداري.
--   • **بلاغات الطعام**: المعرّف والحالة واسم المنتج والتاريخ فقط — **لا حقول
--     `evidence_*`**: أرقام المستخدم دليلٌ يعيش في طابور المراجعة لا في صفحة
--     الحساب، ونقلها هنا يجعلها تُقرأ ملفًّا غذائيًّا شخصيًّا وهي ليست كذلك.
--   • وكتل المنتج (تمارين · تغذية · قياسات) تبقى خارج الصفحة كما كانت —
--     الإضافة لا تلمس حدّ الموافقة بحرف.
--
-- ═══ لماذا الجسد منسوخ كاملًا لا مرقوعًا ═══
-- عقد `test:migration-order`: جسمُ الدالّة الحيّة يطابق **آخر ملفٍ يعرّفها
-- نصًّا**. ⇐ منقولة حرفيًّا من `20260824120002_founder_operations_reads.sql`،
-- والزيادتان الوحيدتان: `commerce.codeHistory` و`foodSubmissions`.
-- ============================================================================

create or replace function public.founder_user_detail(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  out_json jsonb;
  acct     record;
  ent      record;
  redeemed bigint;
  bought   bigint;
  last_ord record;
  banned   boolean;
  code_history jsonb;
  food_reports jsonb;
begin
  perform private.require_admin();

  if p_user_id is null then
    raise exception 'founder_user_detail: user id required' using errcode = '22023';
  end if;

  select u.id,
         u.email                                  as mail,
         u.email_confirmed_at is not null          as verified,
         u.last_sign_in_at                         as seen_at,
         coalesce(p.created_at, u.created_at)      as made_at,
         p.display_name                            as name,
         (p.data #>> '{_meta,completed}')          as done_flag
    into acct
    from auth.users u
    left join public.profiles p on p.user_id = u.id
   where u.id = p_user_id;

  if not found then
    raise exception 'founder_user_detail: no such account' using errcode = 'P0002';
  end if;

  select e.entitlement_type, e.source, e.activated_at, e.expires_at,
         e.no_expiry, e.revoked_at, e.revoked_reason
    into ent
    from public.entitlements e
   where e.user_id = p_user_id;

  -- سجلّات التجارة مفتاحها بصمة الهوية لا المعرّف — لا `user_id` فيها عمدًا.
  select count(*) into redeemed
    from public.code_redemption_ledger l
   where acct.mail is not null
     and l.email_hash in (select ih.email_hash from private.identity_hashes(acct.mail) ih);

  select count(*) into bought
    from public.purchase_ledger pl
   where acct.mail is not null
     and pl.email_hash in (select ih.email_hash from private.identity_hashes(acct.mail) ih);

  select pl.provider_order_id, pl.granted_at
    into last_ord
    from public.purchase_ledger pl
   where acct.mail is not null
     and pl.email_hash in (select ih.email_hash from private.identity_hashes(acct.mail) ih)
   order by pl.granted_at desc
   limit 1;

  select exists (
    select 1 from public.revocation_ledger r
     where acct.mail is not null
       and r.lifted_at is null
       and r.email_hash in (select ih.email_hash from private.identity_hashes(acct.mail) ih)
  ) into banned;

  -- [ADMIN-CONV] العدّاد يصير أسماءً: أيّ حملة ومتى وبأيّ مدّة. المصفوفة
  -- الفارغة **جواب مقيس** («ما استبدل شيئًا») لا غياب — الخادم عدّ ولم يجد.
  select coalesce(jsonb_agg(jsonb_build_object(
           'label',         c.label,
           'redeemed_at',   l.redeemed_at,
           'duration_days', c.duration_days
         ) order by l.redeemed_at desc), '[]'::jsonb)
    into code_history
    from (
      select l0.code_id, l0.redeemed_at
        from public.code_redemption_ledger l0
       where acct.mail is not null
         and l0.email_hash in (select ih.email_hash from private.identity_hashes(acct.mail) ih)
       order by l0.redeemed_at desc
       limit 50
    ) l
    join public.access_codes c on c.id = l.code_id;

  -- [ADMIN-CONV] بلاغات الطعام: **الحقول الأربعة وحدها** — لا evidence_* هنا.
  select coalesce(jsonb_agg(jsonb_build_object(
           'id',           f.id,
           'status',       f.status,
           'product_name', f.product_name,
           'submitted_at', f.submitted_at
         ) order by f.submitted_at desc), '[]'::jsonb)
    into food_reports
    from (
      select f0.id, f0.status, f0.product_name, f0.submitted_at
        from public.food_submissions f0
       where f0.submitted_by = p_user_id
       order by f0.submitted_at desc
       limit 50
    ) f;

  out_json := jsonb_build_object(
    'as_of', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),

    'account', jsonb_build_object(
      'user_id',         acct.id,
      'display_name',    acct.name,
      -- التقنيع في SQL: القيمة الكاملة لا تدخل حمولة الشبكة أصلًا.
      'email_masked',    case
                           when acct.mail is null or position('@' in acct.mail) = 0 then null
                           else left(acct.mail, 1) || '••••@' || split_part(acct.mail, '@', 2)
                         end,
      'email_verified',  acct.verified,
      'created_at',      acct.made_at,
      'last_sign_in_at', acct.seen_at
    ),

    'entitlement', jsonb_build_object(
      -- الحالة تُشتقّ بوقت القاعدة، ولا تُقرأ من عمود مخزَّن قد يشيخ.
      'state',          coalesce(
                          private.derive_state(ent.entitlement_type, ent.no_expiry,
                                               ent.expires_at, ent.revoked_at),
                          'noAccess'),
      'source',         ent.source,
      'activated_at',   ent.activated_at,
      'expires_at',     ent.expires_at,
      'revoked_at',     ent.revoked_at,
      'revoked_reason', ent.revoked_reason
    ),

    -- الجهل ليس نفيًا: بلا علامة إكمال الجواب `unknown` لا `incomplete`.
    'onboarding', case when acct.done_flag is not null then 'complete' else 'unknown' end,

    'commerce', jsonb_build_object(
      'codesRedeemed',  redeemed,
      'purchases',      bought,
      'lastOrderId',    last_ord.provider_order_id,
      'lastPurchaseAt', last_ord.granted_at,
      'accessRevoked',  banned,
      'codeHistory',    code_history
    ),

    'foodSubmissions', food_reports
  );

  return out_json;
end;
$$;

-- الصلاحيات تُعاد **صراحةً** مع كل إعادة تعريف (عرف 20260822120003): البيان
-- المكرّر أرخص من افتراض غير مفحوص عن قاعدةٍ لم تُطبَّق عليها السوابق بترتيبها.
revoke all on function public.founder_user_detail(uuid) from public, anon;
grant execute on function public.founder_user_detail(uuid) to authenticated;
