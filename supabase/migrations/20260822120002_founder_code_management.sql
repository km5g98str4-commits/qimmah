-- ============================================================================
-- 20260822120002 — [ADMIN-R4] إدارة أكواد الوصول بيد المؤسس من المتصفّح
-- ============================================================================
-- اليوم إصدار كود أو تعطيله **يحتاج محرّر SQL في لوحة Supabase**: الدوال
-- `admin_create_access_code` / `admin_grant_premium` / `admin_revoke` ممنوحة
-- لـ`service_role` وحده — وهو المفتاح الذي **يجب** ألّا يصل متصفّحًا أبدًا.
-- فالنتيجة كانت: قدرة موجودة وغير قابلة للاستعمال.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ═══ الخطّ الفاصل الذي يرسمه هذا الملف ═══
--
--   **المؤسس من المتصفّح يُغلق الأبواب، ويفتح بابًا موقوتًا قابلًا للسحب.
--     ومفتاح الخادم وحده يفتح بابًا دائمًا أو يرفع حظرًا.**
--
-- ولذلك ما يهبط هنا بغلاف `founder_*`:
--   ✅ `founder_issue_access_code`   — كود **موقوت** (أيام محدودة) وقابل للتعطيل.
--   ✅ `founder_disable_access_code` — اتجاه آمن: يسحب ولا يمنح.
--   ✅ `founder_revoke_access`       — اتجاه آمن: يسحب ولا يمنح.
--   ✅ `founder_code_page`           — قراءة القائمة بحالاتها الأربع.
--
-- وما **يبقى عمدًا خارج المتصفّح** — مع سببه، لا بالسكوت:
--   ⛔ `admin_grant_premium` — يسكّ منحة **دائمة بلا انتهاء** مدفوعة القيمة،
--      وليس لها تراجع نظيف (السحب يترك أثر حظر لا استرجاعًا). وجلسة متصفّح
--      أضعف حلقة في السلسلة (امتداد · XSS · جهاز مسروق). فسكّ وصول دائم يبقى
--      فعل مفتاح خادم. **الجانب القارئ مكشوف** في اللوحة: المنح تُعدّ وتُعرض.
--   ⛔ `admin_unrevoke` — رفع الحظر هو اتجاه «افتح»، والسجلّ الدائم آخر خطّ
--      دفاع ضدّ دورة «إلغاء ← حذف حساب ← إعادة تسجيل». رفعه بمفتاح الخادم.
--
-- ═══ العشوائية — الفجوة التي سجّلها G-8 ═══
-- لم يكن في المستودع مولّد أكواد إطلاقًا: العقد يفرض **الشكل** (≥١٠ رموز من
-- أبجدية ٣٢) ويترك **العشوائية** لمن يكتب الكود بيده. و`RAMADAN2345` يمرّ
-- العقد كاملًا وهو قابل للتخمين في محاولات معدودة.
-- الآن `private.generate_access_code()`:
--   • مصدرها `gen_random_uuid()` — عشوائية قويّة من نواة Postgres، **بلا
--     امتداد**: `pgcrypto` يعيش في مخطّط مختلف بين Supabase وصندوق الإثبات،
--     فربط الأمان بموقع امتداد يجعله يتغيّر بتغيّر البيئة.
--   • تتجاوز البايتين ٦ و٨ من الـUUID — فيهما بتّات نسخة ونوع **ثابتة**، وعدّها
--     عشوائية تضخيم كاذب للإنتروبيا.
--   • `256 % 32 = 0` فلا انحياز في باقي القسمة — وهذا شرط لا تفصيل.
--   • ١٢ رمزًا = **٦٠ بتًا**، فوق حدّ العقد الأدنى (١٠ رموز = ٥٠ بتًا).
--
-- ⚠️ **الكود الخام يُعاد مرّة واحدة ولا يُخزَّن.** الجدول يحفظ بصمته المملّحة
--    فقط؛ فإن ضاع من الشاشة لا يستعيده أحد — وذلك مقصود لا عيب.
--
-- ⚠️ **حالة التطبيق: APPLY_PENDING.** لم تُطبَّق على أي قاعدة.
--    الترتيب والأوامر في `docs/execution/qimmah-sovereign-closure/MIGRATIONS-APPLY-PENDING.md`.
-- ============================================================================

-- ── ١) المولّد ─────────────────────────────────────────────────────────────
/**
 * كود وصول عشوائي بأبجدية العقد (٣٢ رمزًا بلا I/O/0/1 المُلتبِسة).
 * `private` و`service_role` وحدهما — لا يناديه عميل مباشرةً بأي حال.
 */
create or replace function private.generate_access_code(p_symbols int default 12)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  n        int := least(greatest(coalesce(p_symbols, 12), 10), 24);
  out_code text := '';
  buf      bytea;
  i        int;
  b        int;
begin
  while char_length(out_code) < n loop
    buf := uuid_send(gen_random_uuid());
    for i in 0..15 loop
      -- ⚠️ البايتان ٦ و٨ يحملان بتّات نسخة/نوع ثابتة — تجاوزهما شرط صدق العدّ.
      continue when i = 6 or i = 8;
      exit when char_length(out_code) >= n;
      b := get_byte(buf, i);
      -- 256 على 32 بلا باقٍ ⇒ توزيع منتظم تمامًا، بلا انحياز modulo.
      out_code := out_code || substr(alphabet, (b % 32) + 1, 1);
    end loop;
  end loop;
  return out_code;
end;
$$;

-- ── ٢) الإصدار — غلاف مؤسس فوق العقد القائم ────────────────────────────────
/**
 * يُصدر كود وصول ويعيده **خامًا مرّة واحدة**.
 *
 * `p_code` فارغًا ⇒ يُولَّد (المسار الافتراضي وهو الصحيح). وتمريره نصًّا يبقى
 * متاحًا لأكواد الحملات المسمّاة، ويمرّ **بنفس عقد الشكل** لا بمسار متساهل.
 */
create or replace function public.founder_issue_access_code(
  p_reason          text,
  p_label           text default null,
  p_duration_days   int  default 14,
  p_max_redemptions int  default 1,
  p_expires_at      timestamptz default null,
  p_code            text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  raw_code   text;
  normalized text;
  ver        int;
  new_id     uuid;
  actor      text;
begin
  perform private.require_founder();

  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'founder_issue_access_code: reason required' using errcode = '22023';
  end if;
  if coalesce(p_duration_days, 0) < 1 or p_duration_days > 3650 then
    raise exception 'founder_issue_access_code: duration out of range' using errcode = '22023';
  end if;
  if coalesce(p_max_redemptions, 0) < 1 then
    raise exception 'founder_issue_access_code: max redemptions must be >= 1' using errcode = '22023';
  end if;

  raw_code := coalesce(nullif(btrim(coalesce(p_code, '')), ''), private.generate_access_code(12));
  -- العقد نفسه لا نسخة منه: كود اليد وكود المولّد يمرّان بنفس البوّابة.
  normalized := private.normalize_access_code(raw_code);
  ver := private.active_pepper_version();
  -- من أصدر: معرّف الجلسة لا سلسلة عامّة — أثرٌ يُسأل عنه.
  actor := 'founder:' || coalesce(auth.uid()::text, 'unknown');

  insert into public.access_codes (code_hash, hash_version, label, duration_days,
                                   expires_at, max_redemptions, created_by, created_reason)
  values (private.hash_identity(normalized, ver), ver, p_label, p_duration_days,
          p_expires_at, p_max_redemptions, actor, btrim(p_reason))
  returning access_codes.id into new_id;

  -- ⚠️ الخام هنا **آخر مرّة يظهر فيها**. الجدول لا يحمله، ولا مسار لاستعادته.
  return jsonb_build_object(
    'id',              new_id,
    'code',            normalized,
    'label',           p_label,
    'duration_days',   p_duration_days,
    'max_redemptions', p_max_redemptions,
    'expires_at',      p_expires_at,
    'issued_at',       to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
end;
$$;

-- ── ٣) التعطيل وإعادة التشغيل — اتجاه آمن في الحالتين ──────────────────────
/**
 * يعطّل كودًا (أو يعيد تشغيله). **لا حذف**: صفّ الكود أثر إداري، وحذفه يمحو
 * تاريخ من استرد ومتى.
 */
create or replace function public.founder_set_code_enabled(
  p_code_id uuid, p_enabled boolean, p_reason text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor text;
  row_after record;
begin
  perform private.require_founder();

  if p_code_id is null then
    raise exception 'founder_set_code_enabled: code id required' using errcode = '22023';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'founder_set_code_enabled: reason required' using errcode = '22023';
  end if;

  actor := 'founder:' || coalesce(auth.uid()::text, 'unknown');

  update public.access_codes c
     set enabled = coalesce(p_enabled, false),
         updated_by = actor,
         updated_at = now(),
         created_reason = c.created_reason
   where c.id = p_code_id
  returning c.id, c.enabled into row_after;

  if not found then
    raise exception 'founder_set_code_enabled: no such code' using errcode = 'P0002';
  end if;

  return jsonb_build_object('id', row_after.id, 'enabled', row_after.enabled);
end;
$$;

-- ── ٤) سحب وصول مستخدم — يسحب ولا يمنح ─────────────────────────────────────
/**
 * يسحب وصول حساب: أثر دائم في `revocation_ledger` + وسم على صفّ الاستحقاق.
 *
 * **لا يُنادي `admin_revoke`** رغم تطابق الجسم تقريبًا: تلك تكتب
 * `revoked_by = 'service_role'` ثابتًا، وهنا الفاعل جلسة مسمّاة. أثرٌ يقول
 * «مفتاح الخادم» عن فعلٍ فعله المؤسس من المتصفّح أثرٌ كاذب.
 *
 * والرفع **ليس هنا**: `admin_unrevoke` تبقى بيد `service_role` — انظر الرأس.
 */
create or replace function public.founder_revoke_access(p_user_id uuid, p_reason text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  em    text;
  ver   int;
  actor text;
begin
  perform private.require_founder();

  if p_user_id is null then
    raise exception 'founder_revoke_access: user id required' using errcode = '22023';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'founder_revoke_access: reason required' using errcode = '22023';
  end if;

  select u.email into em from auth.users u where u.id = p_user_id;
  if em is null then raise exception 'no_such_user' using errcode = 'P0002'; end if;

  ver   := private.active_pepper_version();
  actor := 'founder:' || coalesce(auth.uid()::text, 'unknown');

  insert into public.revocation_ledger (email_hash, hash_version, revoked_by, revoked_reason)
  values (private.hash_identity(em, ver), ver, actor, btrim(p_reason));

  insert into public.entitlements (user_id, email, entitlement_type, source,
                                   revoked_at, revoked_reason)
  values (p_user_id, em, 'none', 'none', now(), btrim(p_reason))
  on conflict (user_id) do update
    set revoked_at = now(), revoked_reason = btrim(p_reason);

  return 'revoked';
end;
$$;

-- ── ٥) قائمة الأكواد — بحالاتها الأربع ─────────────────────────────────────
/**
 * صفحة من جدول الأكواد.
 *
 * **لا `code_hash` في المخرجات ولا الخام.** البصمة لا تخدم أي قرار إداري،
 * وإخراجها يمنح مهاجمًا هدفًا بلا مقابل. البحث بالوسم والسبب فقط —
 * **لا بالكود**: بحثٌ بالكود كان سيجعل الحقل أوراكل يؤكّد وجود كود مُخمَّن.
 *
 * والحالة **مشتقّة بوقت القاعدة** بترتيب حاسم: معطّل ← منتهٍ ← مستنفَد ← صادر.
 */
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
  total_rows       bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  q    text := lower(btrim(coalesce(p_search, '')));
  size int  := least(greatest(coalesce(p_page_size, 25), 1), 200);
  pg   int  := greatest(coalesce(p_page, 1), 1);
begin
  perform private.require_founder();

  return query
  with base as (
    select c.id, c.label, c.duration_days, c.max_redemptions, c.redemption_count,
           c.starts_at, c.expires_at, c.created_by, c.created_reason, c.created_at,
           case
             when not c.enabled                                          then 'disabled'
             when c.expires_at is not null and c.expires_at <= now()     then 'expired'
             when c.redemption_count >= c.max_redemptions                then 'redeemed'
             else 'issued'
           end as state
      from public.access_codes c
  ), filtered as (
    select * from base b
     where q = ''
        or lower(coalesce(b.label, '')) like '%' || q || '%'
        or lower(coalesce(b.created_reason, '')) like '%' || q || '%'
        or lower(b.state) = q
  ), counted as (
    select f.*, count(*) over () as n from filtered f
  )
  select c.id, c.label, c.state, c.duration_days, c.max_redemptions, c.redemption_count,
         c.starts_at, c.expires_at, c.created_by, c.created_reason, c.created_at, c.n
    from counted c
   order by c.created_at desc, c.id
   offset (pg - 1) * size
   limit size;
end;
$$;

-- ── ٦) الصلاحيات ───────────────────────────────────────────────────────────
-- المولّد داخلي بحت — لا يناديه عميل بأي دور.
revoke all on function private.generate_access_code(int) from public, anon, authenticated;

revoke all on function public.founder_issue_access_code(text,text,int,int,timestamptz,text) from public, anon;
revoke all on function public.founder_set_code_enabled(uuid,boolean,text)                   from public, anon;
revoke all on function public.founder_revoke_access(uuid,text)                              from public, anon;
revoke all on function public.founder_code_page(text,int,int)                               from public, anon;

grant execute on function public.founder_issue_access_code(text,text,int,int,timestamptz,text) to authenticated;
grant execute on function public.founder_set_code_enabled(uuid,boolean,text)                   to authenticated;
grant execute on function public.founder_revoke_access(uuid,text)                              to authenticated;
grant execute on function public.founder_code_page(text,int,int)                               to authenticated;

comment on function private.generate_access_code(int) is
  'مولّد أكواد بأبجدية العقد. gen_random_uuid بلا امتداد · بايتا النسخة/النوع متجاوَزان · ٦٠ بتًا لـ١٢ رمزًا.';
comment on function public.founder_issue_access_code(text,text,int,int,timestamptz,text) is
  'إصدار كود موقوت بيد المؤسس. الخام يُعاد مرّة واحدة ولا يُخزَّن — الجدول يحفظ بصمته المملّحة وحدها.';
comment on function public.founder_revoke_access(uuid,text) is
  'سحب وصول حساب. يسحب ولا يمنح؛ والرفع (admin_unrevoke) يبقى بيد service_role.';
