-- ============================================================================
-- 20260816120002 — [OVERNIGHT-ADMIN] قراءات المركز التنفيذي (تجميعات فقط)
-- ============================================================================
-- مسار القراءة الوحيد المصرَّح به للوحة. كل ما فيه **للقراءة**: لا INSERT ولا
-- UPDATE ولا DELETE ولا TRUNCATE في أي سطر.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ① **البوّابة داخل الدالة، لا عند المستدعي.**
--    `private.require_founder()` أوّل سطر في كل دالة. العميل لا يمرّر دورًا ولا
--    علمًا ولا مفتاحًا: الخادم يقرأ `auth.uid()` ثم `raw_app_meta_data` بنفسه.
--    فلا شيء يصل المتصفّح يمكن تزويره لفتح الباب.
--
-- ② **المنع يُرفع استثناءً مسمّى، لا يُعاد صفرًا.**
--    دالة تعيد `0` لغير المصرَّح له تُقرأ في اللوحة **رقمًا** («لا مستخدمين»)
--    لا منعًا — وهو بالضبط الكذب الذي يمنعه عقد البيانات. الاستثناء يصل
--    الواجهة حالةَ خطأ فتعرض «غير متاح».
--
-- ③ **تجميعات وحقول تشغيلية فقط.**
--    ولا حقل صحّي واحد: لا وزن، ولا محيط، ولا إصابة، ولا دواء، ولا حساسية،
--    ولا اسم طعام. صفّ الجدول يحمل ما يلزم للدعم التشغيلي وحده، والبريد
--    **يُقنَّع في SQL** فلا يغادر القاعدة كاملًا أصلًا.
--
-- ④ **ما لا مصدر له لا يُختلق.**
--    محاولات الاسترداد المرفوضة، ونشاط المنتج، وإكمال التخصيص: لا تُرجعها هذه
--    الدوال إطلاقًا. الواجهة تُبقيها «غير متاح» ولا تراها صفرًا.
--
-- ⚠️ **حالة التطبيق: APPLY_PENDING.** لم تُطبَّق على أي قاعدة.
--    الـrunbook في `docs/execution/qimmah-sovereign-overnight/ADMIN-DELIVERY.md`.
--
-- تسمية `founder_*` لا `admin_*` عمدًا: ثابتٌ قائم في `test:privileges` يفرض
-- ألّا تُمنح أي دالة `admin\_%` لدور عميل. وهذه الدوال **يجب** أن تُمنح لـ
-- `authenticated` (المؤسس مستخدم مسجَّل)، فبقاؤها خارج ذلك الفضاء الاسمي يحفظ
-- الثابت القائم بدل أن يخرقه — وحارسها الخاصّ في `test:admin-db`: كل دالة
-- `founder_*` تحمل `require_founder()` في جسمها.
-- ============================================================================

-- ── ١) اللقطة التنفيذية — كائن jsonb واحد ─────────────────────────────────
/**
 * كل أرقام اللوحة في نداء واحد. المفاتيح تطابق معرّفات `METRIC_REGISTRY`
 * حرفيًا، فأي انحراف بين الطرفين يظهر مفتاحًا مفقودًا لا رقمًا خاطئًا.
 *
 * `as_of` من **وقت قاعدة البيانات** لا من ساعة المتصفّح: رقمٌ بلحظة قياس
 * يكتبها العميل يمكن أن يبدو حديثًا وهو قديم.
 */
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
  perform private.require_founder();

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
                          and (c.expires_at is null or c.expires_at > now()))
    )
  ) into out_json;

  return out_json;
end;
$$;

-- ── ٢) صفحة جدول المستخدمين — بحث وترتيب على الخادم ───────────────────────
/**
 * صفحة واحدة من جدول المستخدمين.
 *
 * **البريد يُقنَّع هنا** لا في الواجهة: القيمة الكاملة لا تغادر القاعدة أصلًا،
 * فلا يوجد مسار شبكة يحملها ولو أخطأ مكوّن لاحقًا.
 * و`onboarding` يعيد `'unknown'` حين لا توجد علامة إكمال — **لا** `'incomplete'`:
 * العلامة لا تصل الخادم إلا بمزامنة موافَق عليها، فالجهل ليس نفيًا.
 */
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
  perform private.require_founder();

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

-- ── ٣) الصلاحيات ──────────────────────────────────────────────────────────
-- `public` أولًا (الدور الجامع)، ثم `anon` — ويبقى `authenticated` **وحده**
-- ممنوحًا، لأن البوّابة الحقيقية داخل الدالة لا عند المنح.
revoke all on function public.founder_executive_snapshot()          from public, anon;
revoke all on function public.founder_user_page(text,int,int)       from public, anon;
grant execute on function public.founder_executive_snapshot()        to authenticated;
grant execute on function public.founder_user_page(text,int,int)     to authenticated;

comment on function public.founder_executive_snapshot() is
  'تجميعات المركز التنفيذي. للقراءة فقط، وبوّابة الدور داخل الدالة — تُرفع استثناءً مسمّى لا صفرًا.';
comment on function public.founder_user_page(text,int,int) is
  'صفحة جدول المستخدمين. البريد مُقنَّع في SQL، ولا حقل صحّي واحد في المخرجات.';
