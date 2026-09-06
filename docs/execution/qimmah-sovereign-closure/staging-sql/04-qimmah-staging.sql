-- ═══════════════════════════════════════════════════════════════════════════
-- قِمّة — حزمة تشغيل staging 4/9
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ **الترتيب مُلزَم.** الحزم تُلصَق ١ ثم ٢ ثم ٣ … ولا تُقفز واحدة: بعض
--    الهجرات تعيد تعريف دوالّ سابقة، وعكس الترتيب يجعل الأقدم يكتب فوق
--    الأحدث **بلا خطأ يظهر**.
--
-- ✅ **إعادة اللصق آمنة.** كل هجرة مسجَّلة سلفًا تُقفز.
-- ⛔ **ولا تلصق `scripts/db/lib/supabase-shim.sql`** — ذاك لبيئتنا المحلّية،
--    وتشغيله هنا يسقط بـ`permission denied to alter role`.
--
-- تحتوي (5):
--   · 20260816120004_email_outbox.sql
--   · 20260822120001_founder_user_detail.sql
--   · 20260822120002_founder_code_management.sql
--   · 20260822120003_founder_snapshot_commerce_detail.sql
--   · 20260824120001_roles_and_redeem_rate_limit.sql
-- ═══════════════════════════════════════════════════════════════════════════

create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key, name text, inserted_at timestamptz not null default now());

-- ───────────────────────────────────────────────────────────────────────────
-- 20260816120004_email_outbox.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260816120004_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260816120004') then
    raise notice 'تخطٍّ: 20260816120004_email_outbox.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260816120004$
-- ============================================================================
-- 20260816120001 — [OVERNIGHT-EMAIL] صندوق البريد الصادر
-- ============================================================================
-- **إضافة صرفة.** لا تعدّل جدولًا قائمًا ولا دالة قائمة ولا سياسة قائمة.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- لماذا يحتاج البريد جدولًا أصلًا، ولماذا هذا الجدول بالذات:
--
--   طرفية سلة تردّ ٥٠٠ عند عطل القاعدة **كي تعيد سلة المحاولة** — وسلة تعيد
--   ثلاث مرّات بفواصل ~٥ دقائق. فلو أُرسل البريد داخل مسار الطرفية مباشرةً،
--   لأنتج الطلبُ الواحدُ ثلاث رسائل تفعيل. المفتاح الفريد
--   `idempotency_key` هو ما يجعل الثلاثة واحدًا.
--
--   والأهم: **الإرسال مسار يفشل ويُعاد، والمنح مسار ذرّي لا يُعاد.** خلطهما في
--   معاملة واحدة يجعل فشلَ مزوّدِ بريدٍ يُسقط منحةً مدفوعة. الفصل هنا مقصود:
--   المنحة تُكتب أولًا وتُثبَّت، والبريد يُدرَج بعدها في طابور يجوز أن يفشل.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ثلاثة قيود بنيوية، وكلٌّ منها يمنع تسريبًا لا يمنعه انضباط الكاتب:
--
--  ① **قالبٌ حاملٌ لسرّ لا يُخزَّن معه شيء.** `carries_secret = true` ⇒ يُشترط
--     `payload is null` و`recipient_email is null`. السبب حقيقة قاعدة لا رأي:
--     كود الوصول يُحفظ **مبصومًا** في `access_codes.code_hash`، ونصّه الصريح
--     غير موجود في القاعدة إطلاقًا. فطابورٌ يخزّنه يكون قد أنشأ **النسخة
--     الصريحة الوحيدة** لسرٍّ صُمّم كي لا تكون له نسخة صريحة.
--
--  ② **الحمولة تُفحَص محتواها لا نيّتها.** `private.email_payload_is_clean`
--     ترفض أي مفتاح من قائمة الأسماء السرّية (code · password · activationUrl …)
--     مهما كان القالب. الحارس على البيانات لا على المستدعي.
--
--  ③ **ما أُرسل يُنقَّى.** عند `state='sent'` تُفرَّغ الحمولة والمستلم: انتهت
--     الحاجة، وبقاؤهما يحوّل طابورًا إلى مستودع بيانات شخصية. ويبقيان في
--     `state='dead'` عمدًا — **صندوق الرسائل الميتة يُعاد تشغيله بيد إنسان**،
--     وإعادة تشغيله بلا حمولته مستحيلة. (والحامل للسرّ لا حمولة له أصلًا،
--     فموته نهائي ويُصدَر بدله كود جديد — وهذا مكتوب صراحةً في نصّ الرسالة.)
--
-- الاحتفاظ: `mail_audit_12m` وسم وصفي، **بلا أي حذف آلي** — كسابقتيه
-- (`trial_ledger` · `salla_webhook_events`). التنفيذ يحتاج سياسة معتمدة.
--
-- idempotent بالكامل.
-- ============================================================================

-- ── ٠) حارس محتوى الحمولة ──────────────────────────────────────────────────
/**
 * هل حمولة الرموز خالية من كل اسم مفتاح قد يحمل سرًّا؟
 * القائمة نسخة من `NON_QUEUEABLE_TOKENS` في
 * `supabase/functions/_shared/email/outbox.mjs` — والتطابق **مُثبَت** في
 * `scripts/run-email-outbox-db-proof.mjs`، فلا تتباعد النسختان بصمت.
 */
create or replace function private.email_payload_is_clean(p_payload jsonb)
returns boolean
language sql
immutable
security definer
set search_path = ''
as $$
  select p_payload is null
      or not exists (
        select 1 from jsonb_object_keys(p_payload) k
         where lower(k) = any (array[
           'code','activationcode','password','passcode','pin',
           'activationurl','inviteurl','onetimeurl','token','secret'
         ])
      );
$$;

-- ── ١) الجدول ──────────────────────────────────────────────────────────────
create table if not exists public.email_outbox (
  id               uuid primary key default gen_random_uuid(),
  -- مفتاح منع التكرار. مثاله: `premium_purchase:salla:ORD-1029`.
  idempotency_key  text not null unique,
  template_id      text not null check (template_id in (
                     'premium_purchase','access_code','trial_started',
                     'activation_succeeded','support_fallback')),
  lang             text not null check (lang in ('ar','en')),
  carries_secret   boolean not null default false,
  recipient_email  text,
  payload          jsonb,
  state            text not null default 'queued'
                     check (state in ('queued','sending','sent','dead')),
  attempts         int not null default 0 check (attempts >= 0),
  next_attempt_at  timestamptz,
  last_reason      text,
  created_at       timestamptz not null default now(),
  sent_at          timestamptz,
  dead_at          timestamptz,
  retention_policy text not null default 'mail_audit_12m',
  retain_until     timestamptz not null default (now() + interval '12 months'),
  constraint email_outbox_retention check (retention_policy = 'mail_audit_12m'),
  -- ① الحامل للسرّ لا يُخزَّن معه شيء.
  constraint email_outbox_secret_carries_nothing
    check (not carries_secret or (payload is null and recipient_email is null)),
  -- ② الحمولة نظيفة أيًّا كان القالب.
  constraint email_outbox_payload_clean
    check (private.email_payload_is_clean(payload)),
  -- ③ المُرسَل يُنقّى. (والميت يحتفظ بحمولته كي يُعاد تشغيله بيد إنسان.)
  constraint email_outbox_sent_is_redacted
    check (state <> 'sent' or (payload is null and recipient_email is null))
);

create index if not exists email_outbox_due_idx
  on public.email_outbox (next_attempt_at) where state = 'queued';
create index if not exists email_outbox_state_idx
  on public.email_outbox (state, created_at desc);

comment on table public.email_outbox is
  'طابور بريد المعاملات — بلا أجساد مُصاغة وبلا أسرار. الجسد يُصاغ لحظة التسليم ثم يُنسى.';
comment on column public.email_outbox.carries_secret is
  'قالب يحمل سرًّا (كود وصول). لا يُطابَر: يُرسَل بالتمرير المباشر ويبقى هنا أثرٌ بلا حمولة.';

-- ── ٢) RLS + الصلاحيات — نفس حزامَي بقية جداول الوصول ─────────────────────
-- هذا الجدول **لا يراه عميل إطلاقًا**: لا سياسة SELECT ولا غيرها. البريد شأن
-- خادم بحت، والمستخدم يرى الرسالة في بريده لا في قاعدتنا.
alter table public.email_outbox enable row level security;
do $$
declare pol text;
begin
  for pol in select policyname from pg_policies
              where schemaname = 'public' and tablename = 'email_outbox'
  loop
    execute format('drop policy if exists %I on public.email_outbox;', pol);
  end loop;
end;
$$;
revoke all on public.email_outbox from public, anon, authenticated;

-- ── ٣) الدوال — service_role حصرًا ─────────────────────────────────────────

/** إدراج. المكرَّر يُردّ `duplicate` ولا يفشل — إعادة سلة سلوك متوقَّع. */
create or replace function public.email_outbox_enqueue(
  p_idempotency_key text,
  p_template_id     text,
  p_lang            text,
  p_carries_secret  boolean default false,
  p_recipient_email text default null,
  p_payload         jsonb   default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare inserted_id uuid;
begin
  if coalesce(btrim(p_idempotency_key), '') = '' then
    raise exception 'email_idempotency_key_missing' using errcode = '22023';
  end if;
  -- الحارس الصريح قبل القيد: رسالة مسمّاة أنفع من انتهاك قيدٍ عامّ.
  if p_carries_secret and (p_payload is not null or p_recipient_email is not null) then
    raise exception 'email_secret_template_not_queueable' using errcode = '22023';
  end if;
  if not private.email_payload_is_clean(p_payload) then
    raise exception 'email_secret_in_payload' using errcode = '22023';
  end if;

  insert into public.email_outbox (idempotency_key, template_id, lang, carries_secret,
                                   recipient_email, payload, state, next_attempt_at)
  values (btrim(p_idempotency_key), p_template_id, p_lang, p_carries_secret,
          p_recipient_email, p_payload,
          case when p_carries_secret then 'sending' else 'queued' end,
          case when p_carries_secret then null else now() end)
  on conflict (idempotency_key) do nothing
  returning id into inserted_id;

  if inserted_id is null then return 'duplicate'; end if;
  return case when p_carries_secret then 'sending' else 'queued' end;
end;
$$;

/** ما حان وقته. لا يحجز — الحجز يقع بـ`email_outbox_reschedule` بعد المحاولة. */
create or replace function public.email_outbox_due(p_limit int default 50)
returns table (
  idempotency_key text, template_id text, lang text,
  recipient_email text, payload jsonb, attempts int
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.idempotency_key, e.template_id, e.lang, e.recipient_email, e.payload, e.attempts
    from public.email_outbox e
   where e.state = 'queued' and e.next_attempt_at <= now()
   order by e.next_attempt_at asc, e.created_at asc
   limit greatest(1, least(coalesce(p_limit, 50), 500));
$$;

/** نجاح ⇒ تُفرَّغ الحمولة والمستلم في نفس الحركة (القيد ③ يفرضه أصلًا). */
create or replace function public.email_outbox_mark_sent(
  p_idempotency_key text, p_attempts int
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.email_outbox
     set state = 'sent', attempts = p_attempts, sent_at = now(),
         last_reason = null, next_attempt_at = null,
         recipient_email = null, payload = null
   where idempotency_key = p_idempotency_key;
  if not found then raise exception 'email_job_not_found' using errcode = 'P0002'; end if;
  return 'sent';
end;
$$;

/** فشل غير دائم ⇒ يُعاد جدولته. التأخير يحسبه المستدعي (`delayFor`). */
create or replace function public.email_outbox_reschedule(
  p_idempotency_key text, p_attempts int, p_delay_ms bigint, p_reason text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.email_outbox
     set attempts = p_attempts, last_reason = p_reason, state = 'queued',
         next_attempt_at = now() + make_interval(secs => (p_delay_ms::numeric / 1000))
   where idempotency_key = p_idempotency_key;
  if not found then raise exception 'email_job_not_found' using errcode = 'P0002'; end if;
  return 'queued';
end;
$$;

/** فشل دائم أو استنفاد المحاولات ⇒ صندوق الرسائل الميتة. */
create or replace function public.email_outbox_mark_dead(
  p_idempotency_key text, p_attempts int, p_reason text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.email_outbox
     set state = 'dead', attempts = p_attempts, dead_at = now(),
         last_reason = p_reason, next_attempt_at = null
   where idempotency_key = p_idempotency_key;
  if not found then raise exception 'email_job_not_found' using errcode = 'P0002'; end if;
  return 'dead';
end;
$$;

-- ── ٤) الصلاحيات ───────────────────────────────────────────────────────────
revoke all on function public.email_outbox_enqueue(text,text,text,boolean,text,jsonb)
  from public, anon, authenticated;
revoke all on function public.email_outbox_due(int)                     from public, anon, authenticated;
revoke all on function public.email_outbox_mark_sent(text,int)          from public, anon, authenticated;
revoke all on function public.email_outbox_reschedule(text,int,bigint,text) from public, anon, authenticated;
revoke all on function public.email_outbox_mark_dead(text,int,text)     from public, anon, authenticated;
revoke all on function private.email_payload_is_clean(jsonb)            from public, anon, authenticated;

grant execute on function public.email_outbox_enqueue(text,text,text,boolean,text,jsonb) to service_role;
grant execute on function public.email_outbox_due(int)                     to service_role;
grant execute on function public.email_outbox_mark_sent(text,int)          to service_role;
grant execute on function public.email_outbox_reschedule(text,int,bigint,text) to service_role;
grant execute on function public.email_outbox_mark_dead(text,int,text)     to service_role;

  $qimmah_mig_20260816120004$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260816120004', '20260816120004_email_outbox.sql');
end
$qimmah_mig_20260816120004_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260822120001_founder_user_detail.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260822120001_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260822120001') then
    raise notice 'تخطٍّ: 20260822120001_founder_user_detail.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260822120001$
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

  $qimmah_mig_20260822120001$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260822120001', '20260822120001_founder_user_detail.sql');
end
$qimmah_mig_20260822120001_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260822120002_founder_code_management.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260822120002_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260822120002') then
    raise notice 'تخطٍّ: 20260822120002_founder_code_management.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260822120002$
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

  $qimmah_mig_20260822120002$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260822120002', '20260822120002_founder_code_management.sql');
end
$qimmah_mig_20260822120002_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260822120003_founder_snapshot_commerce_detail.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260822120003_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260822120003') then
    raise notice 'تخطٍّ: 20260822120003_founder_snapshot_commerce_detail.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260822120003$
-- ============================================================================
-- 20260822120003 — [ADMIN-R4] تفصيل التجارة في اللقطة التنفيذية
-- ============================================================================
-- تعيد تعريف `public.founder_executive_snapshot()` وحدها — **`create or replace`
-- بنفس التوقيع**، فلا صلاحيات تتغيّر ولا مستدعٍ يتأثّر، والهجرة قابلة لإعادة
-- التشغيل كسابقاتها.
--
-- ما يُضاف ثلاثة أعداد لها **مصدر حقيقي قائم**:
--   • `webhookProcessed` / `webhookPending` — حالة أحداث سلة، وكانت اللوحة
--     تعرض الفاشل وحده فيُقرأ الصمت عمّا سواه «كل شيء تمام».
--   • `grantsManual` — المنح اليدوية، وهي المسار الذي يُسكّ من مفتاح الخادم؛
--     عرضها **قراءةً** واجب ما دام سكّها لا يخرج من متصفّح.
--
-- وما **لا يُضاف** مُسمّى في جسم الدالة نفسها: `webhookRetried`. لا عمود
-- محاولات في `salla_webhook_events`، والحدث المُعاد يُصنَّف `duplicate` — وهو
-- ليس إعادة محاولة. البند يبقى في السجلّ «غير مقيس» بدل أن يُملأ برقم اسمه
-- خاطئ.
--
-- ⚠️ **حالة التطبيق: APPLY_PENDING.** لم تُطبَّق على أي قاعدة.
--    الترتيب والأوامر في `docs/execution/qimmah-sovereign-closure/MIGRATIONS-APPLY-PENDING.md`.
--
-- ⛔ **يجب أن تُطبَّق بعد `20260816120003`** — تلك تُنشئ الدالة، وهذه تستبدلها.
--    التطبيق بالعكس يعيد النسخة القديمة فوق الجديدة بصمت.
-- ============================================================================

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

-- الصلاحيات لا تتغيّر: `create or replace` بنفس التوقيع يحفظ ACL الدالة. تُعاد
-- هنا **صراحةً** كي تصحّ الهجرة حتى لو طُبِّقت على قاعدة لم تُطبَّق عليها سابقتها
-- بترتيب صحيح — البيان المكرّر أرخص من افتراض غير مفحوص.
revoke all on function public.founder_executive_snapshot() from public, anon;
grant execute on function public.founder_executive_snapshot() to authenticated;

comment on function public.founder_executive_snapshot() is
  'تجميعات المركز التنفيذي + حالة webhook والمنح اليدوية. قراءة فقط، والبوّابة داخل الدالة.';

  $qimmah_mig_20260822120003$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260822120003', '20260822120003_founder_snapshot_commerce_detail.sql');
end
$qimmah_mig_20260822120003_wrap$;


-- ───────────────────────────────────────────────────────────────────────────
-- 20260824120001_roles_and_redeem_rate_limit.sql
-- ───────────────────────────────────────────────────────────────────────────
do $qimmah_mig_20260824120001_wrap$
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20260824120001') then
    raise notice 'تخطٍّ: 20260824120001_roles_and_redeem_rate_limit.sql مسجَّلة سلفًا';
    return;
  end if;

  execute $qimmah_mig_20260824120001$
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

  $qimmah_mig_20260824120001$;

  insert into supabase_migrations.schema_migrations (version, name)
  values ('20260824120001', '20260824120001_roles_and_redeem_rate_limit.sql');
end
$qimmah_mig_20260824120001_wrap$;

-- ── صفّ الحزمة: ماذا فعلت هذه اللصقة بالضبط ───────────────────────────────
select
  '4/9'                                                     as bundle,
  count(*) filter (where m.version is not null)                   as registered,
  5                                                  as expected,
  case when count(*) filter (where m.version is not null) = 5
       then 'OK' else 'INCOMPLETE' end                            as status
from (values ('20260816120004'), ('20260822120001'), ('20260822120002'), ('20260822120003'), ('20260824120001')) as v(version)
left join supabase_migrations.schema_migrations m on m.version = v.version;
