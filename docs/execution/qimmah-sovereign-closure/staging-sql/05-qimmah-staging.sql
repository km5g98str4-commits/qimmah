-- ═══════════════════════════════════════════════════════════════════════════
-- قِمّة — حزمة تشغيل staging 5/6
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ **الترتيب مُلزَم.** الحزم تُلصَق ١ ثم ٢ ثم ٣ … ولا تُقفز واحدة: بعض
--    الهجرات تعيد تعريف دوالّ سابقة، وعكس الترتيب يجعل الأقدم يكتب فوق
--    الأحدث **بلا خطأ يظهر**.
--
-- ✅ **إعادة اللصق آمنة.** كل هجرة مسجَّلة سلفًا تُقفز.
-- ⛔ **ولا تلصق `scripts/db/lib/supabase-shim.sql`** — ذاك لبيئتنا المحلّية،
--    وتشغيله هنا يسقط بـ`permission denied to alter role`.
--
-- تحتوي (2):
--   · 20260824120002_founder_operations_reads.sql
--   · 20260824120003_food_submissions.sql
-- ═══════════════════════════════════════════════════════════════════════════

create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key, name text, inserted_at timestamptz not null default now());

-- ───────────────────────────────────────────────────────────────────────────
-- 20260824120002_founder_operations_reads.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260824120002_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260824120002') then
    raise notice 'تخطٍّ: 20260824120002_founder_operations_reads.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260824120002$
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
  -- ⚠️ **الترقيم واحد لا صفر** — كما في `20260822120002` حرفيًّا.
  -- الصيغة الأولى هنا حسبت `off = page * lim` (صفريّة)، فصارت الصفحة الأولى
  -- التي يطلبها العميل (`1`) تُزيح خمسين صفًّا وتعود فارغة. كسرٌ صامت: لا خطأ
  -- يُرفع، ولا نصّ يتغيّر — قائمةٌ تبدو «لا أكواد» وفيها أكواد.
  size int  := least(greatest(coalesce(p_page_size, 25), 1), 200);
  pg   int  := greatest(coalesce(p_page, 1), 1);
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
           --
           -- ⚠️ **المفردات هي مفردات `20260822120002` حرفًا بحرف** ولا تُجدَّد.
           -- الصيغة الأولى هنا سمّتها `active/exhausted/scheduled` — أوصاف أدقّ
           -- بالإنجليزية، وكارثة عمليًّا: `CodeStatus` في العميل و`codeStatus`
           -- في القاموسين يعرفون أربع قيم فقط (`issued`/`redeemed`/`expired`/
           -- `disabled`)، فكل صفٍّ كان سيصل الشاشة بحالةٍ **لا ترجمة لها**.
           -- توسيع مفردات عقدٍ قائم ليس تحسينًا بل كسرٌ صامت لطرفه الآخر.
           case
             when not f.enabled                                      then 'disabled'
             when f.expires_at is not null and f.expires_at <= now() then 'expired'
             when f.redemption_count >= f.max_redemptions            then 'redeemed'
             else 'issued'
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
     limit size offset (pg - 1) * size;
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

  $qimmah_mig_20260824120002$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260824120002', '20260824120002_founder_operations_reads.sql');
end
$qimmah_mig_20260824120002_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260824120003_food_submissions.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260824120003_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260824120003') then
    raise notice 'تخطٍّ: 20260824120003_food_submissions.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260824120003$
-- ============================================================================
-- [COMMISSIONING §7] الطعام الناقص — حلقة تغذية راجعة لا جدول بيانات يدوي
-- ============================================================================
-- المطلوب: «المستخدم لا يجد منتجًا ⇒ يرسله ⇒ طابور مراجعة ⇒ المؤسس يعتمد ⇒
-- يصير قابلًا للبحث». واليوم لا يوجد **أي** مسار خادمي لهذا: لوحة المراجعة
-- في التطبيق محصورة بـ`import.meta.env.DEV`، وما يُرسله المستخدم لا يغادر جهازه.
--
-- ═══ ثلاثة مبادئ تحكم التصميم ═══
--
-- ① **البلاغ دليلٌ لا حقيقة.** ما يكتبه المستخدم من سعرات لا يدخل الكتالوج
--    بالاعتماد وحده. الحقل اسمه `evidence_*` بقصد، والاعتماد يسجّل **قرارًا**
--    ويشير إلى الصنف المنشور — ولا ينسخ أرقام المستخدم إلى مصدر الحقيقة.
--    (§5: لا بيانات وهمية في مسار إنتاجي · والتكليف: «لا تختلق قيمًا غذائية».)
--
-- ② **الباركود التجاري ليس معرّفًا داخليًّا.** التكليف صريح: لا يُخترع GTIN
--    لمنتج حقيقي. فالعمود يقبل `null` بحرّية، وإن وُجد **يُتحقّق من خانته**
--    في القاعدة — لا بثقة في العميل. ومعرّفات قِمّة الداخلية لا تدخل هنا أصلًا.
--
-- ③ **البلاغ لا يُحرَّر بعد إرساله.** لا `update` للمستخدم: سجلٌّ يُعاد كتابته
--    بعد المراجعة يفقد معناه كدليل. التصحيح يكون ببلاغ جديد.
-- ============================================================================

-- ── ١) خانة تحقّق GTIN في الخادم ────────────────────────────────────────────
/**
 * mod-10 كما في GS1. **ولماذا نسخة ثانية بجانب `validateBarcode.ts`؟**
 * لأن هذه الطبقة لا تثق بالعميل: الإدراج يمرّ بـRLS ويمكن أن يأتي من أي
 * عميل. فالتحقّق هنا سلطةُ خادم لا تكرار سياسة.
 *
 * وحتّى لا تتباعد النسختان صامتتين، يقارنهما `test:food-submissions` على
 * متّجه اختبار **واحد مشترك**، فأي انحراف يسقط بفحص مسمّى (§4.2).
 */
create or replace function private.gtin_check_digit_valid(p_code text)
returns boolean
language plpgsql
immutable
as $$
declare
  s   text := btrim(coalesce(p_code, ''));
  n   int;
  i   int;
  d   int;
  mult int;
  total int := 0;
begin
  if s !~ '^[0-9]+$' then return false; end if;
  n := char_length(s);
  if n not in (8, 12, 13, 14) then return false; end if;
  -- من اليمين: الخانة الأخيرة هي خانة التحقّق، وما قبلها يتناوب ٣ ثم ١.
  for i in 1 .. n - 1 loop
    d := substr(s, n - i, 1)::int;
    mult := case when i % 2 = 1 then 3 else 1 end;
    total := total + d * mult;
  end loop;
  return ((10 - (total % 10)) % 10) = substr(s, n, 1)::int;
end;
$$;

comment on function private.gtin_check_digit_valid(text) is
  'تحقّق GTIN-8/12/13/14 بخانة mod-10. سلطة خادم — لا تثق بتحقّق المتصفّح.';

-- ── ٢) الطابور ─────────────────────────────────────────────────────────────
create table if not exists public.food_submissions (
  id                  uuid primary key default gen_random_uuid(),
  submitted_by        uuid not null references auth.users (id) on delete cascade,
  submitted_at        timestamptz not null default now(),

  product_name        text not null check (btrim(product_name) <> '' and char_length(product_name) <= 160),
  brand               text check (brand is null or char_length(brand) <= 120),
  -- باركود **حقيقي أو لا شيء**. لا معرّف داخلي هنا إطلاقًا.
  barcode             text check (barcode is null or private.gtin_check_digit_valid(barcode)),
  serving_desc        text check (serving_desc is null or char_length(serving_desc) <= 120),

  -- دليل المستخدم — لا حقيقة الكتالوج. الأسماء تقول ذلك صراحةً.
  evidence_kcal       numeric(8,2) check (evidence_kcal is null or (evidence_kcal >= 0 and evidence_kcal <= 10000)),
  evidence_protein_g  numeric(7,2) check (evidence_protein_g is null or (evidence_protein_g >= 0 and evidence_protein_g <= 1000)),
  evidence_carbs_g    numeric(7,2) check (evidence_carbs_g is null or (evidence_carbs_g >= 0 and evidence_carbs_g <= 1000)),
  evidence_fat_g      numeric(7,2) check (evidence_fat_g is null or (evidence_fat_g >= 0 and evidence_fat_g <= 1000)),
  evidence_note       text check (evidence_note is null or char_length(evidence_note) <= 500),
  lang                text not null default 'ar' check (lang in ('ar', 'en')),

  status              text not null default 'pending'
                        check (status in ('pending', 'approved', 'rejected', 'needs_info')),
  reviewed_by         uuid references auth.users (id) on delete set null,
  reviewed_at         timestamptz,
  review_note         text check (review_note is null or char_length(review_note) <= 500),
  -- الصنف المنشور الذي أغلق هذا البلاغ. **مرجع لا نسخ**: لا تُنقل أرقام
  -- المستخدم إلى الكتالوج، بل يُشار إلى ما نشرناه نحن بعد التحقّق.
  published_food_id   text check (published_food_id is null or char_length(published_food_id) <= 120),

  -- الاعتماد قرارٌ يستحق أثرًا: لا حالة نهائية بلا مراجِع ووقت.
  constraint food_submissions_reviewed_together
    check ((status = 'pending') = (reviewed_at is null)),
  constraint food_submissions_reviewer_present
    check (reviewed_at is null or reviewed_by is not null)
);

create index if not exists food_submissions_status_idx
  on public.food_submissions (status, submitted_at desc);
create index if not exists food_submissions_owner_idx
  on public.food_submissions (submitted_by, submitted_at desc);
create unique index if not exists food_submissions_open_barcode_idx
  on public.food_submissions (barcode) where barcode is not null and status = 'pending';

alter table public.food_submissions enable row level security;

-- ═══ الصلاحيات قبل السياسات — وإلا كانت السياسات زينةً لا حراسة ═══
--
-- `20260806120003` ينزع الامتيازات الافتراضية عن `public` بالكامل
-- (`alter default privileges … revoke all on tables`). فجدولٌ يُنشأ بعده لا
-- يملك عليه `authenticated` شيئًا، **وسياسة RLS على جدولٍ بلا صلاحية لا
-- تُستدعى أصلًا**. أي أن كتابة السياسة وحدها كانت ستُقرأ حراسةً وهي لا شيء.
--
-- والمنح **انتقائي بقصد**:
--   `select`  ⇒ نعم: المستخدم يرى بلاغاته (والسياسة تحصره في صفوفه).
--   `insert`  ⇒ **لا**: الإدراج يمرّ بـ`submit_missing_food` وحدها، وفيها
--               الحدّ اليومي والتحقّق من خانة الباركود. منحُ الإدراج المباشر
--               يفتح بابًا يلتفّ على الاثنين معًا.
--   `update`/`delete` ⇒ لا: الدليل لا يُحرَّر بعد إرساله.
revoke all on public.food_submissions from anon, authenticated;
grant select on public.food_submissions to authenticated;

-- صاحب البلاغ يقرأ بلاغه — والسياسة تحصر ما يراه في صفوفه.
drop policy if exists food_submissions_select_own on public.food_submissions;
create policy food_submissions_select_own on public.food_submissions
  for select to authenticated
  using (submitted_by = auth.uid());

-- ⚠️ **ولا سياسة إدراج هنا بقصد.** كانت في الصيغة الأولى، وهي **لا تُستدعى
-- أبدًا** لأن `insert` غير ممنوح — سياسةٌ ميتة تصف حراسةً لا وجود لها،
-- وتُقرأ بعد شهر على أنها المسار المدعوم. المسار الوحيد للإدراج هو الدالّة.
drop policy if exists food_submissions_insert_own on public.food_submissions;

comment on table public.food_submissions is
  'بلاغات الطعام الناقص. حقول evidence_* دليلُ مستخدم لا حقيقة كتالوج.';

-- ── ٣) الإرسال — بحدٍّ يوميّ يعمل فعلًا ─────────────────────────────────────
/**
 * الحدّ هنا **يعمل بلا حيلة**: البلاغ الناجح يُثبَّت، فعدّ النجاحات هو
 * بالضبط ما نريد تحديده. (بخلاف استهلاك الأكواد حيث الفشل هو ما يُعدّ،
 * وقد لزمته بنية أخرى — انظر `20260824120001`.)
 */
create or replace function public.submit_missing_food(
  p_product_name text,
  p_brand        text default null,
  p_barcode      text default null,
  p_serving_desc text default null,
  p_kcal         numeric default null,
  p_protein_g    numeric default null,
  p_carbs_g      numeric default null,
  p_fat_g        numeric default null,
  p_note         text default null,
  p_lang         text default 'ar'
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today_count int;
  bc  text := nullif(btrim(coalesce(p_barcode, '')), '');
  new_id uuid;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;

  if coalesce(btrim(p_product_name), '') = '' then
    return jsonb_build_object('outcome', 'invalid', 'reason', 'name_required');
  end if;

  -- باركود مكتوب لكنه غير صالح: يُقال صراحةً، ولا يُبتلع ولا يُخزَّن مشوَّهًا.
  if bc is not null and not private.gtin_check_digit_valid(bc) then
    return jsonb_build_object('outcome', 'invalid', 'reason', 'barcode_checksum');
  end if;

  select count(*) into today_count
    from public.food_submissions f
   where f.submitted_by = uid and f.submitted_at > now() - interval '24 hours';
  if today_count >= 20 then
    return jsonb_build_object('outcome', 'rate_limited', 'reason', 'daily_limit');
  end if;

  -- بلاغٌ مفتوح بنفس الباركود: ليس خطأ المستخدم، ولا يستحقّ صفًّا ثانيًا.
  if bc is not null and exists (
      select 1 from public.food_submissions f
       where f.barcode = bc and f.status = 'pending') then
    return jsonb_build_object('outcome', 'already_queued', 'reason', 'barcode_pending');
  end if;

  insert into public.food_submissions (
    submitted_by, product_name, brand, barcode, serving_desc,
    evidence_kcal, evidence_protein_g, evidence_carbs_g, evidence_fat_g,
    evidence_note, lang)
  values (uid, btrim(p_product_name), nullif(btrim(coalesce(p_brand, '')), ''), bc,
          nullif(btrim(coalesce(p_serving_desc, '')), ''),
          p_kcal, p_protein_g, p_carbs_g, p_fat_g,
          nullif(btrim(coalesce(p_note, '')), ''), coalesce(p_lang, 'ar'))
  returning id into new_id;

  return jsonb_build_object('outcome', 'queued', 'id', new_id);
end;
$$;

revoke all on function public.submit_missing_food(text, text, text, text, numeric, numeric, numeric, numeric, text, text) from public, anon;
grant execute on function public.submit_missing_food(text, text, text, text, numeric, numeric, numeric, numeric, text, text) to authenticated;

-- ── ٤) الطابور كما يراه المؤسس ─────────────────────────────────────────────
create or replace function public.founder_food_submissions(p_status text default 'pending', p_limit int default 50)
returns table (
  id                 uuid,
  submitted_at       timestamptz,
  submitter_ref      text,
  product_name       text,
  brand              text,
  barcode            text,
  serving_desc       text,
  evidence_kcal      numeric,
  evidence_protein_g numeric,
  evidence_carbs_g   numeric,
  evidence_fat_g     numeric,
  evidence_note      text,
  status             text,
  reviewed_at        timestamptz,
  reviewer_ref       text,
  review_note        text,
  published_food_id  text,
  total_rows         bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  lim int := greatest(1, least(coalesce(p_limit, 50), 200));
  st  text := nullif(btrim(coalesce(p_status, '')), '');
begin
  perform private.require_admin();
  return query
    with filtered as (
      select f.* from public.food_submissions f
       where st is null or st = 'all' or f.status = st
    )
    select f.id, f.submitted_at,
           -- مرجعٌ لا هوية: يكفي لربط بلاغات نفس الشخص، ولا يكشف بريده.
           left(f.submitted_by::text, 8),
           f.product_name, f.brand, f.barcode, f.serving_desc,
           f.evidence_kcal, f.evidence_protein_g, f.evidence_carbs_g, f.evidence_fat_g,
           f.evidence_note, f.status, f.reviewed_at,
           case when f.reviewed_by is null then null else left(f.reviewed_by::text, 8) end,
           f.review_note, f.published_food_id,
           (select count(*) from filtered)
      from filtered f
     order by f.submitted_at desc
     limit lim;
end;
$$;

-- ── ٥) قرار المراجعة — للمؤسس وحده ─────────────────────────────────────────
/**
 * يسجّل **قرارًا**، ولا ينسخ أرقام المستخدم إلى أي كتالوج. و`p_published_food_id`
 * يُملأ حين يكون الصنف قد نُشر فعلًا بعد تحقّق بشري — فيصير للبلاغ أثرٌ يُتتبَّع:
 * «متى صار قابلًا للبحث، وبأي معرّف».
 */
create or replace function public.founder_review_food_submission(
  p_id uuid,
  p_decision text,
  p_note text default null,
  p_published_food_id text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  perform private.require_founder();
  if p_decision not in ('approved', 'rejected', 'needs_info') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;
  if coalesce(btrim(coalesce(p_note, '')), '') = '' and p_decision <> 'approved' then
    -- الرفض بلا سبب يصير لغزًا بعد شهر — نفس قاعدة بقيّة أفعال المؤسس.
    raise exception 'review_note_required' using errcode = '22023';
  end if;

  update public.food_submissions f
     set status = p_decision,
         reviewed_by = uid,
         reviewed_at = now(),
         review_note = nullif(btrim(coalesce(p_note, '')), ''),
         published_food_id = nullif(btrim(coalesce(p_published_food_id, '')), '')
   where f.id = p_id;

  if not found then
    raise exception 'submission_not_found' using errcode = 'P0002';
  end if;
  return jsonb_build_object('outcome', 'reviewed', 'decision', p_decision);
end;
$$;

revoke all on function public.founder_food_submissions(text, int) from public, anon;
revoke all on function public.founder_review_food_submission(uuid, text, text, text) from public, anon;
grant execute on function public.founder_food_submissions(text, int) to authenticated;
grant execute on function public.founder_review_food_submission(uuid, text, text, text) to authenticated;

  $qimmah_mig_20260824120003$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260824120003', '20260824120003_food_submissions.sql');
end
$qimmah_mig_20260824120003_wrap$;
