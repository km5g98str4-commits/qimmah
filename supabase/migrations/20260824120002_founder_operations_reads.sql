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
-- `require_founder` ⇐ `require_admin` في القراءات الأربع وحدها. أفعال
-- `founder_issue_access_code` · `founder_set_code_enabled` · `founder_revoke_access`
-- **لا تُمسّ**: تبقى للمؤسس وحده.
do $$
declare
  fn text;
  src text;
begin
  foreach fn in array array['founder_executive_snapshot', 'founder_user_page',
                            'founder_user_detail', 'founder_code_page']
  loop
    select p.prosrc into src
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = fn
     limit 1;
    if src is null then
      raise exception 'expected function public.% to exist before widening its gate', fn;
    end if;
    -- الاستبدال نصّي على الجسم القائم: لا نعيد كتابة القراءات (وهي طويلة
    -- وتتغيّر بهجرات لاحقة)، بل نبدّل **الحارس وحده**. فأي تعديل مستقبلي على
    -- جسم الدالّة يبقى محفوظًا، ولا ينشأ تنفيذان يتباعدان.
    if position('private.require_founder()' in src) = 0 then
      raise exception 'function public.% no longer calls require_founder — refusing to guess', fn;
    end if;
  end loop;
end $$;

-- التبديل الفعلي (مفصول عن الفحص أعلاه ليُقرأ كلٌّ على حدة).
do $$
declare
  fn text;
  rec record;
  newsrc text;
begin
  foreach fn in array array['founder_executive_snapshot', 'founder_user_page',
                            'founder_user_detail', 'founder_code_page']
  loop
    for rec in
      select p.oid, p.prosrc, pg_get_function_identity_arguments(p.oid) as args,
             pg_get_function_result(p.oid) as result
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = fn
    loop
      newsrc := replace(rec.prosrc, 'private.require_founder()', 'private.require_admin()');
      execute format(
        'create or replace function public.%I(%s) returns %s language plpgsql stable security definer set search_path = %L as %L',
        fn, rec.args, rec.result, '', newsrc);
    end loop;
  end loop;
end $$;

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
