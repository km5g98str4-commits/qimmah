-- ============================================================================
-- [COMMISSIONING] غرفة عمليات المؤسس — من عدّاد إلى طابور قابل للفعل
-- ============================================================================
-- التكليف §4 يسأل أسئلة تشغيلية محدّدة، وثلاثة منها **بلا جواب** اليوم:
--
--   «هل فشل طلبُ سلة في التسليم؟»  ⇐ يوجد عدد `ordersFailed` ولا توجد قائمة.
--       ورقمٌ بلا أسماء غير قابل للفعل: من «فشل ٣» لا طريق إلى الثلاثة.
--   «من استهلك هذا الكود ومتى؟»     ⇐ الصفحة تعرض عدّادًا فقط، ومن أبطله لا يُعرف
--       رغم أن `updated_by`/`updated_at` **يُكتبان فعلًا** عند كل إبطال.
--   «هل شيء يفشل تشغيليًّا؟»         ⇐ طابور البريد جدولٌ حيٌّ ممتلئ، ودوالّه
--       كلّها `service_role`، فلا يراه المؤسس إطلاقًا.
--
-- وسؤالٌ رابع مُجاب فرديًّا لا إجماليًّا: «كيف حصلوا على Premium؟» — يوجد
-- `grantsManual` وحده، ولا تفصيل شراء/كود/تجربة للسكّان المفعَّلين.
--
-- ═══ مبدآن يحكمان كل ما دون ═══
-- ① **القراءة للدعم، والتغيير للمؤسس.** كل قراءةٍ هنا تُحرَس بـ`require_admin`
--    (مؤسس أو دعم)، وكل فعلٍ لا رجعة فيه يبقى على `require_founder`. وهذا هو
--    التفويض الذي طلبه §4: مساعدٌ يرى ولا يمنح.
-- ② **الغياب يبقى غيابًا.** لا تحويل «لا نقيس» إلى صفر في أي حقل أُضيف هنا.
-- ============================================================================

-- ── ١) القراءات القائمة تُفتح للدعم — بلا مسّ لأي فعل ──────────────────────
--
-- ثلاث قراءات تُعاد كتابتها هنا بالكامل، وفيها **سطرٌ واحد اختلف**:
-- `private.require_founder()` ⇐ `private.require_admin()`. وأفعال
-- `founder_issue_access_code` · `founder_set_code_enabled` · `founder_revoke_access`
-- **لا تُمسّ**: تبقى للمؤسس وحده. (و`founder_code_page` أدناه تُعاد كتابتها
-- كذلك لأن شكل إرجاعها نفسه يتغيّر.)
--
-- ⚠️ **ولماذا تُنسخ الأجسام كاملةً بدل تعديل الحارس في مكانه؟**
-- الصيغة الأولى هنا استبدلت النصّ داخل `pg_proc` عبر `do $$ … execute format`
-- — أقصر بكثير وبلا تكرار. لكنّها **تكسر عقد المستودع**: `test:migration-order`
-- يشترط أن يطابق جسمُ كل دالّة حيّة **آخر ملفٍ يعرّفها نصًّا**، وإعادة الكتابة
-- الديناميكية تجعل الحيّ لا يطابق أي ملف. وأسوأ من ذلك أنّ سلوك هذه الهجرة
-- كان سيصير رهينةَ نصِّ ملفٍ آخر: تحريرُ `20260822120003` غدًا يغيّر ما تنتجه
-- هذه الهجرة بلا أن يلمسها أحد.
--
-- فالتكرار هنا **ليس ازدواج سلطة**: تاريخُ الهجرات ملفّاتٌ لا تُعدَّل، والنسخة
-- النهائية واحدة — وهي هذه. وهو نفس ما تفعله تسع دوالّ أخرى في هذا المستودع.

-- ⇐ منقولة حرفيًّا من `20260822120003_founder_snapshot_commerce_detail.sql`، بحارسها وحده مبدَّلًا.
create or replace function public.founder_executive_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  out_json     jsonb;
  riyadh_start timestamptz;
  total_users  bigint;
begin
  perform private.require_admin();

  -- منتصف ليل الرياض: الحسابات «اليوم» تُقاس بيوم المستخدم لا بـUTC.
  riyadh_start := date_trunc('day', now() at time zone 'Asia/Riyadh') at time zone 'Asia/Riyadh';

  select count(*) into total_users from public.profiles;

  select jsonb_build_object(
    'as_of', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),

    -- ── الحسابات: المقام كامل بحكم مُشغّل handle_new_user ──
    'users', jsonb_build_object(
      'total',    total_users,
      'newToday', (select count(*) from public.profiles p where p.created_at >= riyadh_start),
      'new7d',    (select count(*) from public.profiles p where p.created_at >= now() - interval '7 days'),
      'new30d',   (select count(*) from public.profiles p where p.created_at >= now() - interval '30 days'),
      'verified', (select count(*) from auth.users u where u.email_confirmed_at is not null),
      'growthSeries', coalesce((
        select jsonb_agg(jsonb_build_object('date', d.day, 'value', d.n) order by d.day)
          from (
            select to_char(date_trunc('day', p.created_at at time zone 'Asia/Riyadh'), 'YYYY-MM-DD') as day,
                   count(*) as n
              from public.profiles p
             where p.created_at >= now() - interval '90 days'
             group by 1
          ) d
      ), '[]'::jsonb)
    ),

    -- ── الدخول: من جدول المصادقة. «سجّلوا دخول» لا «نشطون» (الجلسة تُجدَّد) ──
    'activity', jsonb_build_object(
      'signedIn7d',  (select count(*) from auth.users u where u.last_sign_in_at >= now() - interval '7 days'),
      'signedIn30d', (select count(*) from auth.users u where u.last_sign_in_at >= now() - interval '30 days'),
      'dormant30d',  (select count(*) from auth.users u
                       where u.last_sign_in_at is null or u.last_sign_in_at < now() - interval '30 days')
    ),

    -- ── الاستحقاق: الحالة تُشتقّ بوقت القاعدة، ولا تُقرأ من عمود مخزَّن ──
    'entitlement', jsonb_build_object(
      'premiumActive', (select count(*) from public.entitlements e
                         where private.derive_state(e.entitlement_type, e.no_expiry, e.expires_at, e.revoked_at)
                               = 'premiumActive'),
      'trialActive',   (select count(*) from public.entitlements e
                         where private.derive_state(e.entitlement_type, e.no_expiry, e.expires_at, e.revoked_at)
                               = 'trialActive'),
      'trialExpired',  (select count(*) from public.entitlements e
                         where private.derive_state(e.entitlement_type, e.no_expiry, e.expires_at, e.revoked_at)
                               = 'trialExpired'),
      -- المعاينة = حساب بلا أي استحقاق فعّال. يُشتقّ من المقام الكامل.
      'previewOnly',   greatest(total_users - (
                         select count(*) from public.entitlements e
                          where private.derive_state(e.entitlement_type, e.no_expiry, e.expires_at, e.revoked_at)
                                in ('premiumActive','trialActive','specialAccessActive')), 0),
      'revokedActive', (select count(*) from public.revocation_ledger r where r.lifted_at is null)
    ),

    -- ── التجارة: أوامر سلة والأكواد ──
    'commerce', jsonb_build_object(
      'ordersSeen',   (select count(distinct s.provider_order_id) from public.salla_webhook_events s
                        where s.provider_order_id is not null),
      'ordersPaid',   (select count(*) from public.purchase_ledger l),
      'ordersFailed', (select count(*) from public.salla_webhook_events s
                        where s.classification in ('failed','rejected')),
      'codesIssued',  (select count(*) from public.access_codes c),
      'codesRedeemed',(select count(*) from public.code_redemption_ledger g),
      'codesUnused',  (select count(*) from public.access_codes c
                        where c.enabled and c.redemption_count = 0
                          and (c.expires_at is null or c.expires_at > now())),
      -- ── [ADMIN-R4] حالة الـwebhook والمنح اليدوية ──
      'webhookProcessed', (select count(*) from public.salla_webhook_events s
                            where s.classification = 'processed'),
      'webhookPending',   (select count(*) from public.salla_webhook_events s
                            where s.classification in ('received','verified')),
      'grantsManual',     (select count(*) from public.entitlements e where e.source = 'manual')
      -- ⚠️ **`webhookRetried` غير موجود هنا عمدًا**: لا عمود محاولات في الجدول.
      --    الحدث المُعاد يصل ببصمة مطابقة فيُصنَّف `duplicate` — وذلك ليس
      --    «إعادة محاولة». إخراج عدد التكرارات باسم «أُعيدت محاولتها» كذبٌ
      --    بالتسمية، والواجهة تُبقيه «غير مقيس» ولا تراه صفرًا.
    )
  ) into out_json;

  return out_json;
end;
$$;

-- ⇐ منقولة حرفيًّا من `20260816120003_founder_dashboard_reads.sql`، بحارسها وحده مبدَّلًا.
create or replace function public.founder_user_page(p_search text, p_page int, p_page_size int)
returns table (
  user_id         uuid,
  display_name    text,
  email_masked    text,
  created_at      timestamptz,
  last_sign_in_at timestamptz,
  entitlement     text,
  onboarding      text,
  total_rows      bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  q      text := lower(btrim(coalesce(p_search, '')));
  size   int  := least(greatest(coalesce(p_page_size, 25), 1), 200);
  pg     int  := greatest(coalesce(p_page, 1), 1);
begin
  perform private.require_admin();

  return query
  with base as (
    select u.id,
           p.display_name as name,
           u.email        as mail,
           coalesce(p.created_at, u.created_at) as made_at,
           u.last_sign_in_at as seen_at,
           coalesce(
             (select private.derive_state(e.entitlement_type, e.no_expiry, e.expires_at, e.revoked_at)
                from public.entitlements e where e.user_id = u.id),
             'noAccess') as ent_state,
           (p.data #>> '{_meta,completed}') as done_flag
      from auth.users u
      left join public.profiles p on p.user_id = u.id
  ), filtered as (
    select * from base
     where q = ''
        or lower(coalesce(name, '')) like '%' || q || '%'
        or lower(coalesce(mail, '')) like '%' || q || '%'
        or id::text like '%' || q || '%'
  ), counted as (
    select f.*, count(*) over () as n from filtered f
  )
  select c.id,
         c.name,
         case
           when c.mail is null or position('@' in c.mail) = 0 then null
           else left(c.mail, 1) || '••••@' || split_part(c.mail, '@', 2)
         end,
         c.made_at,
         c.seen_at,
         case c.ent_state
           when 'premiumActive'       then 'premium'
           when 'trialActive'         then 'trial'
           when 'specialAccessActive' then 'code'
           when 'noAccess'            then 'preview'
           when 'trialExpired'        then 'preview'
           else 'unknown'
         end,
         case when c.done_flag is not null then 'complete' else 'unknown' end,
         c.n
    from counted c
   order by c.made_at desc nulls last, c.id
   offset (pg - 1) * size
   limit size;
end;
$$;

-- ⇐ منقولة حرفيًّا من `20260822120001_founder_user_detail.sql`، بحارسها وحده مبدَّلًا.
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

-- ── ٢) طابور الطلبات الفاشلة — الرقم يصير أسماءً ───────────────────────────
/**
 * الطلبات التي لم تُسلَّم: لكل واحد رقمُه وتصنيفه وسببه ووقته وهوية **مُقنَّعة**.
 *
 * ولا بريد صريح هنا: الجدول لا يحمل إلا التجزئة أصلًا، فيُعرض جزءٌ منها
 * معرّفًا مستقرًّا يُطابَق به الطلب مع العميل دون كشف هويّته على الشاشة.
 */
create or replace function public.founder_failed_orders(p_limit int default 50)
returns table (
  provider_order_id text,
  classification    text,
  reason            text,
  received_at       timestamptz,
  amount_minor      int,
  currency          text,
  identity_ref      text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
    select s.provider_order_id,
           s.classification,
           s.reason,
           s.received_at,
           s.amount_minor,
           s.currency,
           -- مرجع هوية لا هوية: ثمانية رموز من التجزئة تكفي للمطابقة مع
           -- سجلّ الشراء، ولا تُعيد بناء بريد أحد.
           case when s.email_hash is null then null else left(s.email_hash, 8) end
      from public.salla_webhook_events s
     where s.classification in ('failed', 'rejected')
     order by s.received_at desc
     limit greatest(1, least(coalesce(p_limit, 50), 200));
end;
$$;

-- ── ٣) تفصيل استهلاك الكود — «من ومتى» لا عدّاد ────────────────────────────
/**
 * من استهلك هذا الكود ومتى. البريد **مُقنَّع في SQL** — نفس قاعدة `founder_user_detail`:
 * ما لا يخرج من القاعدة لا يمكن أن يتسرّب من المتصفّح.
 */
create or replace function public.founder_code_redemptions(p_code_id uuid)
returns table (
  redeemed_at   timestamptz,
  user_id       uuid,
  masked_email  text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  if p_code_id is null then
    raise exception 'founder_code_redemptions: code id required' using errcode = '22023';
  end if;
  return query
    select r.redeemed_at,
           r.user_id,
           case
             when u.email is null then null
             else left(split_part(u.email, '@', 1), 2) || '***@' || split_part(u.email, '@', 2)
           end
      from public.access_code_redemptions r
      left join auth.users u on u.id = r.user_id
     where r.code_id = p_code_id
     order by r.redeemed_at desc
     limit 200;
end;
$$;

-- ── ٤) صفحة الأكواد تحمل أثر الإبطال وآخر استهلاك ──────────────────────────
/**
 * تُعاد كتابتها بالكامل هنا (لا استبدال نصّي) لأن **شكل الإرجاع نفسه** يتغيّر:
 * ثلاثة أعمدة تُضاف. و`create or replace` لا يقبل تغيير `returns table`، فيُسقَط
 * التوقيع القديم أوّلًا — وهذا مقصود ومعلَن، لا أثر جانبي.
 */
drop function if exists public.founder_code_page(text, int, int);

create or replace function public.founder_code_page(p_search text, p_page int, p_page_size int)
returns table (
  code_id          uuid,
  label            text,
  status           text,
  duration_days    int,
  max_redemptions  int,
  redemption_count int,
  starts_at        timestamptz,
  expires_at       timestamptz,
  created_by       text,
  created_reason   text,
  created_at       timestamptz,
  updated_by       text,
  updated_at       timestamptz,
  last_redeemed_at timestamptz,
  total_rows       bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  lim  int := greatest(1, least(coalesce(p_page_size, 25), 100));
  off  int := greatest(0, coalesce(p_page, 0)) * lim;
  term text := nullif(btrim(coalesce(p_search, '')), '');
begin
  perform private.require_admin();
  return query
    with filtered as (
      select c.*
        from public.access_codes c
       where term is null
          or c.label ilike '%' || term || '%'
          or c.created_reason ilike '%' || term || '%'
          or c.created_by ilike '%' || term || '%'
    )
    select f.id,
           f.label,
           -- الحالة مشتقّة لا مخزَّنة: مخزَّنةً كانت ستشيخ بصمت عند الانتهاء.
           case
             when not f.enabled                                   then 'disabled'
             when f.expires_at is not null and f.expires_at <= now() then 'expired'
             when f.redemption_count >= f.max_redemptions         then 'exhausted'
             when f.starts_at > now()                             then 'scheduled'
             else 'active'
           end,
           f.duration_days,
           f.max_redemptions,
           f.redemption_count,
           f.starts_at,
           f.expires_at,
           f.created_by,
           f.created_reason,
           f.created_at,
           f.updated_by,
           f.updated_at,
           (select max(l.redeemed_at) from public.access_code_redemptions l where l.code_id = f.id),
           (select count(*) from filtered)
      from filtered f
     order by f.created_at desc
     limit lim offset off;
end;
$$;

-- ── ٥) صحّة التشغيل: طابور البريد الميت يصير مرئيًّا ────────────────────────
/**
 * ما فشل تسليمه نهائيًّا — بعدده وبأحدث صفوفه. **بلا مستلِم وبلا حمولة**:
 * السؤال التشغيلي «هل شيء يفشل؟» لا يحتاج بريد أحد.
 */
create or replace function public.founder_email_health(p_limit int default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare out_json jsonb;
begin
  perform private.require_admin();
  select jsonb_build_object(
    'as_of', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'byState', coalesce((select jsonb_object_agg(o.state, o.n)
                           from (select e.state, count(*) as n
                                   from public.email_outbox e group by e.state) o), '{}'::jsonb),
    'dead', coalesce((select jsonb_agg(d)
                        from (select e.idempotency_key, e.template_id, e.attempts,
                                     e.last_reason, e.dead_at
                                from public.email_outbox e
                               where e.state = 'dead'
                               order by e.dead_at desc nulls last
                               limit greatest(1, least(coalesce(p_limit, 20), 100))) d), '[]'::jsonb)
  ) into out_json;
  return out_json;
end;
$$;

-- ── ٦) «كيف حصلوا على Premium؟» إجماليًّا لا فرديًّا وحده ────────────────────
/**
 * تفصيل مصادر المفعَّلين. **لا صفر مخترع**: مصدرٌ بلا أحد لا يظهر أصلًا،
 * فالواجهة تقرأ غيابًا لا رقمًا كاذبًا.
 */
create or replace function public.founder_grants_by_source()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare out_json jsonb;
begin
  perform private.require_admin();
  select coalesce(jsonb_object_agg(t.source, t.n), '{}'::jsonb) into out_json
    from (
      select e.source, count(*) as n
        from public.entitlements e
       where private.derive_state(e.entitlement_type, e.no_expiry, e.expires_at, e.revoked_at)
             in ('premiumActive', 'trialActive', 'specialAccessActive')
       group by e.source
    ) t;
  return out_json;
end;
$$;

-- ── ٧) الصلاحيات: تنفيذٌ للمصادَق عليه، والحارس داخل الجسم ─────────────────
-- نفس النمط المعتمد: `anon` لا ينفّذ شيئًا، و`authenticated` ينفّذ ثم يُردّ
-- من داخل الدالّة إن لم يكن إداريًّا — طبقتان لا واحدة.
revoke all on function public.founder_failed_orders(int)      from public, anon;
revoke all on function public.founder_code_redemptions(uuid)  from public, anon;
revoke all on function public.founder_email_health(int)       from public, anon;
revoke all on function public.founder_grants_by_source()      from public, anon;
revoke all on function public.founder_code_page(text, int, int) from public, anon;

grant execute on function public.founder_failed_orders(int)      to authenticated;
grant execute on function public.founder_code_redemptions(uuid)  to authenticated;
grant execute on function public.founder_email_health(int)       to authenticated;
grant execute on function public.founder_grants_by_source()      to authenticated;
grant execute on function public.founder_code_page(text, int, int) to authenticated;

comment on function public.founder_failed_orders(int) is
  'طابور التسليم الفاشل — أسماء لا عدد. هوية مُقنَّعة بمرجع تجزئة.';
comment on function public.founder_email_health(int) is
  'صحّة طابور البريد. بلا مستلِم وبلا حمولة — السؤال تشغيلي لا شخصي.';
