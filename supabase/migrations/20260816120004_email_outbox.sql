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
