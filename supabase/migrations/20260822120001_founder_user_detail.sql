-- ============================================================================
-- 20260822120001 — [ADMIN-R4] صفحة مستخدم واحد للمؤسس (قراءة فقط)
-- ============================================================================
-- تُكمل `20260816120003`: هناك **صفحة الجدول**، وهنا **الحساب الواحد**. بُنيت
-- `UserDetailPanel` منذ الموجة الأولى ولم تُرسم قطّ لأن مسار القراءة خلفها لم
-- يكن موجودًا — لا في الواجهة ولا في القاعدة.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ① **البوّابة أوّل سطر.** `private.require_founder()` قبل أي `select`.
--
-- ② **حدّ الكشف: ما تحتاجه الإدارة، ولا حرف زيادة.**
--    الشاشة تجيب سؤالين لا غير: «هل هذا الحساب عالق؟» و«هل استحقاقه صحيح؟».
--    فكل حقل هنا يخدم أحدهما، وما لا يخدمهما **غير مذكور في الدالة أصلًا** —
--    لا محجوبًا في الواجهة، بل غير مقروء من القاعدة. وأصدق حدّ هو الحدّ الذي
--    لا يحمل الشبكةُ ما وراءه.
--
--    | الحقل | لماذا هو ضروري |
--    |---|---|
--    | `user_id` | هوية الصفّ الذي تُجرى عليه الإدارة. |
--    | `display_name` | تأكيد أنك تنظر إلى الحساب الصحيح قبل أي فعل. |
--    | `email_masked` | نفس الغرض، **مُقنَّع في SQL** — الكامل لا يغادر القاعدة. |
--    | `created_at` | «عالق منذ متى» سؤال بلا معنى بلا عمر الحساب. |
--    | `last_sign_in_at` | «هل دخل أصلًا» — أوّل سؤال في كل بلاغ دعم. |
--    | `email_verified` | السبب الأوّل لبلاغات «ما أقدر أدخل». |
--    | `entitlement.*` | السؤال الثاني حرفيًا: الحالة والمصدر والانتهاء والإلغاء. |
--    | `onboarding` | «عالق في التخصيص» — والقيمة `unknown` لا `incomplete`. |
--    | `commerce.*` | مطابقة الطلب بالمنحة: كم كودًا استُرد · كم شراءً · آخر رقم طلب. |
--
-- ③ **ولا حقل صحّي واحد.** لا وزن ولا طول ولا محيط ولا إصابة ولا دواء ولا
--    حساسية ولا سطر طعام ولا تمرين مسجَّل. حتى **عدّاد** أحداث القياس غير
--    مقروء: عدٌّ لجدول صحّي يفتح مسارًا إليه، والحاجة الإدارية لا تطلبه.
--    ويحرس ذلك `test:admin-user-detail` بفحص مسمّى على مخرجات الدالة.
--
-- ④ **`onboarding` يعيد `unknown` لا `incomplete`.** علامة الإكمال لا تصل
--    الخادم إلا بمزامنة موافَق عليها؛ فالجهل ليس نفيًا.
--
-- ⑤ **رقم الطلب من `purchase_ledger` عبر بصمة الهوية** لا عبر البريد الخام:
--    الجدول لا يحمل `user_id` أصلًا (قرار احتفاظ قائم)، والربط ببصمة مملّحة.
--
-- ⚠️ **حالة التطبيق: APPLY_PENDING.** لم تُطبَّق على أي قاعدة.
--    الترتيب والأوامر في `docs/execution/qimmah-sovereign-closure/MIGRATIONS-APPLY-PENDING.md`.
--
-- تسمية `founder_*` لا `admin_*`: الثابت في `test:privileges` يمنع منح أي دالة
-- `admin\_%` لدور عميل، وهذه **يجب** أن تُمنح لـ`authenticated`.
-- ============================================================================

/**
 * صفحة حساب واحد. كائن `jsonb` واحد بأربع كتل: الحساب · الاستحقاق · التخصيص ·
 * التجارة. `as_of` من وقت القاعدة لا من ساعة المتصفّح.
 *
 * حساب غير موجود ⇒ استثناء `P0002` **لا كائن فارغ**: كائنٌ فارغ يُقرأ في
 * الواجهة «حساب بلا بيانات» بدل «لا حساب بهذا المعرّف».
 */
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
begin
  perform private.require_founder();

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
      'accessRevoked',  banned
    )
  );

  return out_json;
end;
$$;

-- ── الصلاحيات — المنع أولًا، والبوّابة داخل الدالة لا عند المنح ──────────────
revoke all on function public.founder_user_detail(uuid) from public, anon;
grant execute on function public.founder_user_detail(uuid) to authenticated;

comment on function public.founder_user_detail(uuid) is
  'صفحة حساب واحد للمؤسس. قراءة فقط · البريد مُقنَّع في SQL · ولا حقل صحّي واحد في المخرجات.';
