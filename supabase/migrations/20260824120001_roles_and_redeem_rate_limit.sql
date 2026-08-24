-- ============================================================================
-- [COMMISSIONING] تفويض الإدارة · وتحديد معدّل يستطيع أن يعمل فعلًا
-- ============================================================================
-- بندان من تكليف التشغيل التجاري:
--   §4 «يقدر المؤسس يفوّض شخصًا موثوقًا بلا مشاركة كلمة سرّه» — وسلطة اليوم
--      قيمةٌ واحدة (`founder`)، فالمفوَّض يرث **كل شيء**: يصدر أكوادًا، يبطلها،
--      يسحب وصول أي مستخدم. لا طبقة قراءة-فقط.
--   §5/§12 «تحديد المعدّل قرب سلطة التغيير» — ولا يوجد اليوم في أي طبقة.
--
-- ═══ ولماذا لم يكن تحديد المعدّل مجرّد جدول عدّاد ═══
-- **مقيس لا مُخمَّن:** دالّة ترفع استثناءً تُلغي معاملتها كلّها — بما فيها أي
-- صفّ كتبته عن محاولتها الفاشلة. جُرِّب على العنقود: دالّة تُدرج صفًّا ثم ترفع
-- ⇒ عدد الصفوف بعدها **صفر**.
--
-- فالعدّاد الملصوق على `redeem_access_code` الحالية (وهي ترفع عند كل فشل)
-- كان سيعدّ **النجاحات وحدها** — حارسٌ لا يمكن أن يُطلق أبدًا. وهذا بعينه
-- «المرور غير المستحقّ» الذي يمنعه §4.2: بوّابة تبدو قائمة وهي لا تُختبَر.
--
-- ═══ العلاج: الفشل التجاري **قيمة** لا استثناء ═══
--   • `private.redeem_core` — المنطق كما هو، يرفع كما كان (سلطة واحدة).
--   • `public.redeem_access_code_v2` — تستدعيه داخل كتلة استثناء (نقطة حفظ)،
--     فترتدّ الكتلة الداخلية وحدها، **وتبقى المعاملة حيّة**، فيُكتب صفّ
--     المحاولة ويُثبَّت. ثم تعيد النتيجة **قيمةً** لا رميًا.
--   • `public.redeem_access_code` — تبقى بتوقيعها وسلوكها الرافع حرفيًّا،
--     لكنها صارت **غلافًا فوق النواة نفسها**. فلا تنفيذان يتباعدان.
-- ============================================================================

-- ── ١) هرم الأدوار: `founder` يكتب · `support` يقرأ ─────────────────────────
/**
 * الدور الفعّال لصاحب الجلسة. القائمة البيضاء **اثنان لا واحد**:
 *   `founder` — كل شيء (ويبقى المالك الوحيد لأفعال لا رجعة فيها).
 *   `support` — قراءة اللوحة والحسابات فقط. لا إصدار · لا إبطال · لا سحب.
 *
 * والافتراض منعٌ في كل مسار: قيمة مجهولة ⇒ `null` ⇒ لا سلطة.
 */
create or replace function private.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare r text;
begin
  r := private.account_role(auth.uid());
  -- `coalesce` حزامٌ ضدّ ثلاثية القيم: بلا ادّعاء يصير `null = '...'` قيمتُه
  -- `null` لا `false`، فيمرّ `if not ...` — نفس الفخّ الموثّق في `is_founder`.
  return coalesce(r in ('founder', 'support'), false);
end;
$$;

/** حارس القراءة: مؤسس **أو** دعم. الرفض يُسمّى، ولا يعود صفوفًا فارغة. */
create or replace function private.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if private.is_admin() is not true then
    -- نفس رمز الخطأ ونفس النصّ الذي تعرفه الواجهة اليوم — فالمنع يبقى
    -- مقروءًا بلا تغيير في العميل، ويبقى «غير متاح» لا «صفر».
    raise exception 'founder_role_required' using errcode = '42501';
  end if;
end;
$$;

revoke all on function private.is_admin()      from public, anon, authenticated;
revoke all on function private.require_admin() from public, anon, authenticated;

comment on function private.is_admin() is
  'مؤسس أو دعم. للقراءة فقط — أفعال التغيير تبقى على private.require_founder().';

-- توسيع القائمة البيضاء في مانح الأدوار. `service_role` حصرًا كما كان.
create or replace function public.admin_set_role(p_email text, p_role text, p_reason text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid;
  n   text := lower(btrim(coalesce(p_email, '')));
begin
  if n = '' then
    raise exception 'admin_set_role: empty identity' using errcode = '22023';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'admin_set_role: reason required' using errcode = '22023';
  end if;
  -- قائمة بيضاء صارمة — لا قيمة مجهولة تُكتب فتصير لغزًا بعد شهر.
  if p_role is distinct from 'founder' and p_role is distinct from 'support' then
    raise exception 'admin_set_role: unknown role %', coalesce(p_role, '<null>') using errcode = '22023';
  end if;

  select u.id into uid from auth.users u where lower(u.email) = n;
  if uid is null then
    raise exception 'admin_set_role: no such account' using errcode = 'P0002';
  end if;

  update auth.users u
     set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
           'qimmah_role',        p_role,
           'qimmah_role_set_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
           'qimmah_role_set_by', 'service_role',
           'qimmah_role_reason', btrim(p_reason)
         )
   where u.id = uid;

  return uid;
end;
$$;

-- ── ٢) دفتر محاولات الاستهلاك — الأساس الذي يجعل الحدّ ممكنًا ──────────────
create table if not exists private.redeem_attempts (
  email_hash   text        not null,
  hash_version int         not null,
  attempted_at timestamptz not null default now(),
  succeeded    boolean     not null
);
create index if not exists redeem_attempts_window
  on private.redeem_attempts (email_hash, attempted_at desc);

revoke all on private.redeem_attempts from public, anon, authenticated;

comment on table private.redeem_attempts is
  'محاولات استهلاك الأكواد لكل هوية. مجزّأة كبقية الهويّات — لا بريد صريح.';

/**
 * حدّ متدحرج: `p_max` محاولة فاشلة خلال `p_window`.
 * الفاشلة وحدها تُحسب — فمن يستهلك أكوادًا صحيحة لا يُعاقَب.
 */
create or replace function private.redeem_rate_exceeded(p_email text, p_max int default 10, p_window interval default interval '15 minutes')
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare n int;
begin
  select count(*) into n
    from private.identity_hashes(p_email) ih
    join private.redeem_attempts a on a.email_hash = ih.email_hash
   where a.attempted_at > now() - p_window
     and not a.succeeded;
  return n >= p_max;
end;
$$;

revoke all on function private.redeem_rate_exceeded(text, int, interval) from public, anon, authenticated;

-- ── ٣) النواة: المنطق كما هو، سلطةً واحدة ──────────────────────────────────
/**
 * منطق الاستهلاك **بلا تغيير سلوكي واحد** عن النسخة السابقة — نُقل كما هو
 * ليصير مصدرًا واحدًا يقرؤه الغلافان. أي تباعد بينهما مستحيل بنيويًّا.
 */
create or replace function private.redeem_core(p_code text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  em text;
  ver int;
  h text;
  normalized text;
  c record;
  cur record;
  new_expiry timestamptz;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select u.email into em from auth.users u where u.id = uid;
  if em is null then raise exception 'unknown user' using errcode = 'P0002'; end if;
  if private.is_access_revoked(uid, em) then
    raise exception 'access_revoked' using errcode = '28000';
  end if;

  begin
    normalized := private.normalize_access_code(p_code);
  exception when sqlstate '22023' then
    raise exception 'invalid_code' using errcode = '22023';
  end;

  ver := private.active_pepper_version();
  h := private.hash_identity(em, ver);
  select * into c from public.access_codes ac
   where ac.code_hash in (select ih.email_hash
                          from private.identity_hashes(normalized) ih)
   for update;
  if not found
     or not c.enabled
     or c.starts_at > now()
     or (c.expires_at is not null and c.expires_at <= now())
     or c.redemption_count >= c.max_redemptions
  then
    raise exception 'invalid_code' using errcode = '22023';
  end if;
  if exists (select 1 from private.identity_hashes(em) ih
             join public.code_redemption_ledger l
               on l.code_id = c.id and l.email_hash = ih.email_hash) then
    raise exception 'code_already_redeemed' using errcode = '23505';
  end if;

  update public.access_codes
     set redemption_count = redemption_count + 1, updated_at = now()
   where id = c.id;
  insert into public.code_redemption_ledger (code_id, email_hash, hash_version)
  values (c.id, h, ver);
  insert into public.access_code_redemptions (code_id, user_id) values (c.id, uid)
  on conflict (code_id, user_id) do nothing;

  new_expiry := now() + make_interval(days => c.duration_days);
  select * into cur from public.entitlements where user_id = uid;
  if found and cur.expires_at is not null and cur.expires_at > new_expiry then
    new_expiry := cur.expires_at;
  end if;
  if found and private.grant_rank(cur.entitlement_type) > 2 then
    return 'premiumActive';
  end if;

  insert into public.entitlements (user_id, email, entitlement_type, source,
                                   activation_code_id, activated_at, expires_at, no_expiry)
  values (uid, em, 'special', 'code', c.id, now(), new_expiry, false)
  on conflict (user_id) do update
    set entitlement_type = 'special', source = 'code', activation_code_id = c.id,
        activated_at = now(), expires_at = new_expiry, no_expiry = false;
  return 'specialAccessActive';
end;
$$;

revoke all on function private.redeem_core(text) from public, anon, authenticated;

-- ── ٤) الغلاف المحدود: الفشل قيمة، فالمحاولة تُكتب وتبقى ───────────────────
/**
 * يعيد `{ "outcome": "...", "reason": "..." }`. لا يرفع لفشلٍ تجاري إطلاقًا،
 * ولذلك **تُثبَّت** المحاولة الفاشلة فيصير الحدّ ذا معنى.
 *
 * والردّ العامّ محفوظ: المستنفَد والمجهول والمُبطَل كلّها `invalid_code`،
 * فلا يصير الجواب عرّافًا (نفس الدمج المتعمّد في النواة).
 */
create or replace function public.redeem_access_code_v2(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  em  text;
  ver int;
  h   text;
  res text;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select u.email into em from auth.users u where u.id = uid;
  if em is null then raise exception 'unknown user' using errcode = 'P0002'; end if;

  if private.redeem_rate_exceeded(em) then
    -- الحدّ نفسه لا يُسجَّل محاولةً: وإلا لأطال المهاجمُ حظرَ نفسه بلا نهاية،
    -- وصار الحدّ عقوبةً دائمة بدل نافذة متدحرجة.
    return jsonb_build_object('outcome', 'rate_limited', 'reason', 'too_many_attempts');
  end if;

  ver := private.active_pepper_version();
  h   := private.hash_identity(em, ver);

  begin
    res := private.redeem_core(p_code);
  exception when others then
    -- ⚠️ الارتداد هنا **إلى نقطة الحفظ فقط**: الكتلة الداخلية تُلغى، والمعاملة
    -- تبقى حيّة. ولذلك يُثبَّت الصفّ أدناه — وهو ما يستحيل لو رفعنا للخارج.
    insert into private.redeem_attempts (email_hash, hash_version, succeeded)
    values (h, ver, false);
    return jsonb_build_object('outcome', 'failed', 'reason', sqlerrm);
  end;

  insert into private.redeem_attempts (email_hash, hash_version, succeeded)
  values (h, ver, true);
  return jsonb_build_object('outcome', res, 'reason', null);
end;
$$;

revoke all on function public.redeem_access_code_v2(text) from public, anon;
grant execute on function public.redeem_access_code_v2(text) to authenticated;

-- ── ٥) التوافق: التوقيع القديم يبقى حرفيًّا، فوق النواة نفسها ───────────────
/**
 * **لا سلوك تغيّر هنا**: نفس القيم المعادة ونفس أسماء الأخطاء المرفوعة.
 * وقد صارت غلافًا كي لا يوجد تنفيذان للاستهلاك يتباعدان بتحرير (§0.2 نفس
 * المبدأ: سلطة واحدة). ومن يستعملها لا ينال حدّ المعدّل — لأن الرفع يُلغي
 * كتابة المحاولة، وهذه حقيقةٌ تُعلَن ولا تُداري.
 */
create or replace function public.redeem_access_code(p_code text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  return private.redeem_core(p_code);
end;
$$;

comment on function public.redeem_access_code(text) is
  'غلاف توافق يرفع كما كان. المسار المحدود بالمعدّل هو redeem_access_code_v2.';
comment on function public.redeem_access_code_v2(text) is
  'المسار المُعتمَد للعميل: الفشل قيمة لا استثناء، فتُثبَّت المحاولة ويعمل الحدّ.';
