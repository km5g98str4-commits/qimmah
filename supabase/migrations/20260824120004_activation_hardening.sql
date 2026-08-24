-- ═══════════════════════════════════════════════════════════════════════════
-- [COMMISSIONING §5 · §12] إحكام التفعيل — إغلاق أربعة مسارات مسمّاة
-- ═══════════════════════════════════════════════════════════════════════════
--
-- التكليف يقول حرفيًّا: «Activation mutations must be rate-limited and
-- replay-safe» و«Trial creation must resist trivial repeated farming».
-- وهذه الهجرة تغلق أربعة مواضع تُخالف ذلك اليوم، ثلاثة منها مُسمّاة في
-- `docs/security/COMMERCE-ADMIN-THREAT-MODEL.md` والرابع **أدخلته الهجرة
-- التي سبقتها بساعات** — ويُغلق هنا بنفس الصراحة التي كُتب بها.
--
-- ┌───┬──────────────────────────────────────────────────────────────────────┐
-- │ ١ │ **تجاوز حدّ المعدّل** — `20260824120001` أضافت `redeem_access_code_v2` │
-- │   │ محدودةَ المعدّل، **وأبقت** `redeem_access_code` القديمة ممنوحة       │
-- │   │ لـ`authenticated` بلا أي حدّ. فالحارس الجديد كان يُلتفّ عليه بتغيير   │
-- │   │ **اسم الدالّة في الطلب**. مقيس: ٣٠ محاولة عبر القديمة ⇒ ٣٠ وصلت       │
-- │   │ المنطق بلا خنق، مقابل ٢٠ مخنوقة من ٣٠ عبر `_v2`.                     │
-- │   │ وقد كان التعليق في تلك الهجرة **يُعلن** التجاوز — والإعلان ليس إغلاقًا.│
-- │ ٢ │ **F-2c** — الاسترداد لا يفحص تأكيد البريد، بينما `start_trial`        │
-- │   │ و`claim_pending_grants` تفحصانه. التناظر يكتمل هنا.                  │
-- │ ٣ │ **F-4** — وسم `+` (والنقاط في Gmail) يفتح تجارب ٧٢ ساعة بلا حدّ من     │
-- │   │ صندوق بريد واحد.                                                     │
-- │ ٤ │ **F-5 (نصفه)** — لا مولّد أكواد في المستودع كلّه؛ العقد يفرض الشكل    │
-- │   │ لا العشوائية. يُضاف المولّد ويصير هو الافتراض.                        │
-- └───┴──────────────────────────────────────────────────────────────────────┘
--
-- ⚠️ **ما لا تفعله هذه الهجرة عمدًا:** لا تمنع كودًا نصّيًّا ضعيفًا يمرّره
-- المؤسس صراحةً. «هل تُسمح أكواد حملات مقروءة مثل `RAMADAN2345` أصلًا؟» قرار
-- عمل لا قرار وكيل (§0.1 من الميثاق يجيز «حملات مؤقّتة أو أكوادًا»)، فيُرفَع
-- مسمّى ولا يُحسم هنا. والمُتاح الآن: الافتراض صار عشوائيًّا ٨٠ بتًا، وضعف أي
-- كود نصّي صار **مقيسًا ومحفوظًا** في العمود `entropy_bits` بدل أن يكون
-- غير مرئي.

-- ── ١) إغلاق تجاوز حدّ المعدّل ──────────────────────────────────────────────
/**
 * `redeem_access_code` تبقى موجودة بتوقيعها وسلوكها — **ويُنزَع وصول العميل
 * إليها**. ولماذا النزع لا إضافة حدّ داخلها: الدالّة **ترفع** عند الفشل،
 * والرفع يُلغي معاملته بما فيها صفّ المحاولة، فحدٌّ داخلها يعدّ النجاحات وحدها
 * — حارسٌ لا يُطلق. المسار الوحيد الذي يستطيع تثبيت المحاولة هو `_v2`.
 *
 * ولا ينكسر العميل المشحون: هو ينادي `_v2` أولًا ولا يسقط إلى القديمة إلا حين
 * تردّ `PGRST202/42883` — أي على قاعدة **لم تُطبَّق عليها هذه الهجرة أصلًا**،
 * وهناك تكون المنحة القديمة ما تزال قائمة. فالارتداد يبقى ذا معنى حيث يلزم،
 * ويستحيل حيث لا يلزم.
 */
revoke execute on function public.redeem_access_code(text) from public, anon, authenticated;

comment on function public.redeem_access_code(text) is
  'غلاف توافق للخادم فقط. نُزع وصول العميل في 20260824120004: كان يلتفّ على حدّ المعدّل بتغيير الاسم.';

-- ── ٢) الهوية القانونية: تطبيع الأسماء المستعارة (F-4) ─────────────────────
/**
 * **لا تُعدَّل `hash_identity` نفسها.** تغيير مدلول البصمة يُبطل كل السجلّات
 * القائمة — وهي البصمة التي يقوم عليها سجلّ التجارب والأكواد والمشتريات.
 * فالطريق الصحيح دالّة تطبيع **قبل** البصمة، وعمود بصمة ثانٍ **يُضاف**.
 *
 * والتطبيع محافظ عمدًا: وسم `+` يُقصّ لكل النطاقات (سلوكٌ قياسي عند كل مزوّد
 * تقريبًا)، أمّا حذف النقاط فلـGmail وحدها — لأنه سلوك Gmail خاصةً، وتعميمه
 * على نطاقات تعتبر النقطة حرفًا معنويًّا يدمج **حسابين مختلفين لشخصين
 * مختلفين**. والخطأ في هذا الاتجاه يحرم بريئًا من تجربته.
 */
create or replace function private.canonical_identity(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_email is null or btrim(p_email) = '' then null
    when position('@' in lower(btrim(p_email))) = 0 then lower(btrim(p_email))
    when split_part(lower(btrim(p_email)), '@', 2) in ('gmail.com', 'googlemail.com')
      then replace(split_part(split_part(lower(btrim(p_email)), '@', 1), '+', 1), '.', '')
           || '@gmail.com'
    else split_part(split_part(lower(btrim(p_email)), '@', 1), '+', 1)
         || '@' || split_part(lower(btrim(p_email)), '@', 2)
  end;
$$;

revoke all on function private.canonical_identity(text) from public, anon, authenticated;

comment on function private.canonical_identity(text) is
  'يقصّ وسم + لكل النطاقات، ويحذف النقاط لـGmail وحدها. يُستعمل قبل hash_identity ولا يستبدلها.';

/**
 * العمود الثاني — **يُضاف ولا يستبدل**. الصفوف القائمة تبقى `null` ولا يمكن
 * ملؤها بأثر رجعي: السجلّ يحفظ البصمة لا البريد، ولا سبيل لاشتقاق الشكل
 * القانوني من تجزئة. وهذه حقيقة تُقال لا تُداري — **التطبيع يحرس ما بعده**،
 * ومن استهلك تجربته قبل هذه الهجرة يبقى محروسًا بالبصمة الخام كما كان.
 */
alter table public.trial_ledger add column if not exists canonical_hash text;
alter table public.trial_ledger add column if not exists canonical_hash_version int;

create index if not exists trial_ledger_canonical_hash
  on public.trial_ledger (canonical_hash) where canonical_hash is not null;

comment on column public.trial_ledger.canonical_hash is
  'بصمة الشكل القانوني للبريد (بلا وسم + وبلا نقاط في Gmail). null للصفوف السابقة لـ20260824120004 — لا backfill ممكن من تجزئة.';

-- ── ٣) `start_trial` تفحص البصمتين ────────────────────────────────────────
create or replace function public.start_trial()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid   uuid := auth.uid();
  em    text;
  conf  timestamptz;
  ver   int;
  h     text;
  canon text;
  ch    text;
  cur   record;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;

  select u.email, u.email_confirmed_at into em, conf from auth.users u where u.id = uid;
  if em is null then raise exception 'unknown user' using errcode = 'P0002'; end if;
  if conf is null then raise exception 'email_not_verified' using errcode = '28000'; end if;

  -- الإلغاء لاصق **وينجو من حذف الحساب**: الفحص يمسح السجلّ الدائم عبر كل
  -- إصدارات الملح — حذف الحساب وإعادة التسجيل لا يرفعان الحظر.
  if private.is_access_revoked(uid, em) then
    raise exception 'access_revoked' using errcode = '28000';
  end if;

  -- البصمة الخام — كما كانت حرفيًّا. حارس كل الصفوف القائمة.
  if exists (
    select 1 from private.identity_hashes(em) ih
    join public.trial_ledger t on t.email_hash = ih.email_hash
  ) then
    raise exception 'trial_already_used' using errcode = '23505';
  end if;

  -- [F-4] والبصمة القانونية — تلتقط `a+farm@x` بعد `a@x`. تُفحص عبر كل
  -- إصدارات الملح كالأولى، فتدوير الملح لا يفتح مزرعة تجارب.
  canon := private.canonical_identity(em);
  if canon is not null then
    if exists (
      select 1 from private.identity_hashes(canon) ih
      join public.trial_ledger t on t.canonical_hash = ih.email_hash
    ) then
      raise exception 'trial_already_used' using errcode = '23505';
    end if;
  end if;

  select * into cur from public.entitlements where user_id = uid;
  if found and cur.revoked_at is null and private.grant_rank(cur.entitlement_type) >= 1 then
    raise exception 'trial_not_applicable' using errcode = '22023';
  end if;

  ver := private.active_pepper_version();
  h   := private.hash_identity(em, ver);
  ch  := case when canon is null then null else private.hash_identity(canon, ver) end;

  insert into public.trial_ledger (email_hash, hash_version, canonical_hash, canonical_hash_version)
  values (h, ver, ch, case when ch is null then null else ver end);

  insert into public.entitlements (user_id, email, entitlement_type, source,
                                   activated_at, expires_at, no_expiry)
  values (uid, em, 'trial', 'trial', now(), now() + interval '72 hours', false)
  on conflict (user_id) do update
    set entitlement_type = 'trial', source = 'trial', activated_at = now(),
        expires_at = now() + interval '72 hours', no_expiry = false,
        revoked_at = null, revoked_reason = null;

  return 'trialActive';
end;
$$;

revoke all on function public.start_trial() from public, anon;
grant execute on function public.start_trial() to authenticated;

-- ── ٤) الاسترداد يفحص تأكيد البريد (F-2c) ─────────────────────────────────
/**
 * التناظر يكتمل: التجربة (٧٢ ساعة) والمطالبة (Premium) تفحصان `email_confirmed_at`
 * منذ `20260816120001`، والاسترداد (وصول بمدّة) لم يكن يفحصه. والفحص يوضع في
 * **النواة** لا في المدخلين، فلا ينفرد أحدهما بحارس.
 *
 * ويصل المستخدم اسمٌ صادق: `_v2` تُرجع الفشل قيمةً بسببه المسمّى، فتعرض
 * الشاشة «أكّد بريدك ثم أعد المحاولة» لا «كودك خاطئ» — والكود ليس خاطئًا.
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
  conf timestamptz;
  ver int;
  h text;
  normalized text;
  c record;
  cur record;
  new_expiry timestamptz;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select u.email, u.email_confirmed_at into em, conf from auth.users u where u.id = uid;
  if em is null then raise exception 'unknown user' using errcode = 'P0002'; end if;
  -- [F-2c] وصولٌ بمدّة يُسجَّل على عنوان بريد — فيلزمه ما يلزم التجربة والمطالبة.
  if conf is null then raise exception 'email_not_verified' using errcode = '28000'; end if;
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

-- ── ٥) طول الكود المُصدَر: ٦٠ بتًا ⇐ ٨٠ (نصف F-5) ─────────────────────────
/**
 * ═══ تصحيح لوثيقة التهديدات قبل أي كود ═══
 * `COMMERCE-ADMIN-THREAT-MODEL.md` §٢-٨ يقول «**لا مولّد أكواد في المستودع
 * كلّه**». **هذا بائت.** `20260822120002` أضافت `private.generate_access_code`
 * وتستعملها `founder_issue_access_code` فعلًا. والمولّد القائم **جيّد**: نفس
 * الأبجدية، اشتقاق من `uuid_send(gen_random_uuid())`، وتجاوزٌ صريح للبايتين ٦
 * و٨ الحاملَين بتّات النسخة والنوع، و٣٢ تقسم ٢٥٦ بلا باقٍ فلا انحياز modulo.
 *
 * فلا يُعاد بناؤه — **ولا يُلمس**. الخلل الباقي وحده هو **الطول**:
 * `founder_issue_access_code` تناديه بـ١٢ رمزًا = **٦٠ بتًا**. والتوصية في
 * §٢-٨ نفسها ≥١٦ رمزًا = ٨٠ بتًا. فالتغيير سطرٌ واحد في موضع الإصدار، لا
 * مولّد ثانٍ ولا سلطة إصدار ثانية (§0.2: سلطة واحدة لا اثنتان تتباعدان).
 *
 * ⚠️ **الأكواد المُصدَرة قبل هذه الهجرة تبقى ١٢ رمزًا وصالحة.** الطول يُقرأ من
 * الكود لا من عمود، والتجزئة لا تُعكَس. فهذه ترقية **لما بعدها**، وتُقال كما هي.
 */

/**
 * قياس مسمّى لكود **نصّي** يمرّره المؤسس. لا يمنع — يقيس ويحفظ، فيصير ضعف
 * كود الحملة **مرئيًّا في وحدة التحكّم** بدل أن يكون غير مرئي أصلًا.
 *
 * والسقف الرياضي `len × log2(32)` **سقفٌ لا شهادة**: كودٌ معجميّ مثل
 * `RAMADAN2345` يبلغ ٥٥ بتًا سقفًا وإنتروبيته الفعلية قريبة من الصفر. والاسم
 * يقول ذلك — `entropy_ceiling_bits` لا `entropy_bits`.
 */
alter table public.access_codes add column if not exists entropy_ceiling_bits int;
alter table public.access_codes add column if not exists generated_server_side boolean not null default false;

comment on column public.access_codes.entropy_ceiling_bits is
  'سقف رياضي (len × 5) لا إنتروبيا فعلية: كود معجميّ يبلغ السقف نفسه وقيمته الحقيقية أدنى بكثير.';
comment on column public.access_codes.generated_server_side is
  'true ⇒ اشتُقّ من private.generate_access_code. false ⇒ نصّ خارجي، والسقف أعلاه لا يشهد له.';

/**
 * إعادة إعلان حرفية لـ`founder_issue_access_code` من `20260822120002`،
 * بثلاثة فروق لا رابع: `generate_access_code(16)` بدل `(12)`، وتعبئة العمودين
 * أعلاه، وإعلان `entropy_ceiling_bits` في الرد كي يرى المُصدِر ما أصدر.
 * وما عدا ذلك — الحرّاس والرسائل وشكل الرد — منقول كما هو.
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
  was_gen    boolean;
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

  was_gen  := nullif(btrim(coalesce(p_code, '')), '') is null;
  -- [F-5] ١٦ رمزًا = ٨٠ بتًا. كان ١٢ = ٦٠، وهي التوصية المكتوبة في §٢-٨ نفسها.
  raw_code := coalesce(nullif(btrim(coalesce(p_code, '')), ''), private.generate_access_code(16));
  -- العقد نفسه لا نسخة منه: كود اليد وكود المولّد يمرّان بنفس البوّابة.
  normalized := private.normalize_access_code(raw_code);
  ver := private.active_pepper_version();
  -- من أصدر: معرّف الجلسة لا سلسلة عامّة — أثرٌ يُسأل عنه.
  actor := 'founder:' || coalesce(auth.uid()::text, 'unknown');

  insert into public.access_codes (code_hash, hash_version, label, duration_days,
                                   expires_at, max_redemptions, created_by, created_reason,
                                   entropy_ceiling_bits, generated_server_side)
  values (private.hash_identity(normalized, ver), ver, p_label, p_duration_days,
          p_expires_at, p_max_redemptions, actor, btrim(p_reason),
          char_length(normalized) * 5, was_gen)
  returning access_codes.id into new_id;

  -- ⚠️ الخام هنا **آخر مرّة يظهر فيها**. الجدول لا يحمله، ولا مسار لاستعادته.
  return jsonb_build_object(
    'id',              new_id,
    'code',            normalized,
    'label',           p_label,
    'duration_days',   p_duration_days,
    'max_redemptions', p_max_redemptions,
    'expires_at',      p_expires_at,
    'entropy_ceiling_bits', char_length(normalized) * 5,
    'generated',       was_gen,
    'issued_at',       to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
end;
$$;

revoke all on function public.founder_issue_access_code(text,text,int,int,timestamptz,text)
  from public, anon;
grant execute on function public.founder_issue_access_code(text,text,int,int,timestamptz,text)
  to authenticated;

/**
 * والمسار الإداري (`service_role`) يعبّئ العمودين كذلك، فلا يصير الحقلان
 * صادقَين في مدخلٍ وفارغَين في آخر. ولا يتغيّر شيء آخر فيه.
 */
create or replace function public.admin_create_access_code(
  p_code text, p_created_by text, p_created_reason text,
  p_duration_days int default 14, p_max_redemptions int default 1,
  p_label text default null, p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare ver int; id uuid; normalized text;
begin
  normalized := private.normalize_access_code(p_code);
  ver := private.active_pepper_version();
  insert into public.access_codes (code_hash, hash_version, label, duration_days,
                                   expires_at, max_redemptions, created_by, created_reason,
                                   entropy_ceiling_bits, generated_server_side)
  values (private.hash_identity(normalized, ver), ver, p_label, p_duration_days,
          p_expires_at, p_max_redemptions, p_created_by, p_created_reason,
          char_length(normalized) * 5, false)
  returning access_codes.id into id;
  return id;
end;
$$;

revoke all on function public.admin_create_access_code(text,text,text,int,int,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.admin_create_access_code(text,text,text,int,int,text,timestamptz)
  to service_role;

/**
 * ⚠️ **ما يبقى مفتوحًا بعد هذه الهجرة، ويُرفَع قرارًا لا يُفترَض:**
 * كودٌ نصّيٌّ ضعيف يمرّره المؤسس (`RAMADAN2345`) ما زال **مقبولًا**. ومنعُه
 * قرار عمل لا قرار وكيل: §0.1 من الميثاق يجيز «حملات مؤقّتة أو أكوادًا»،
 * وكود الحملة المقروء قد يكون مقصودًا. المتاح الآن أن ضعفه **مقيس ومحفوظ**
 * في `entropy_ceiling_bits` ومميَّز بـ`generated_server_side = false`.
 */

-- ── ٦) قوّة الكود تصل الشاشة ──────────────────────────────────────────────
/**
 * إعادة إعلان حرفية لـ`founder_code_page` من `20260824120002`، بعمودين
 * يُضافان قبل `total_rows` لا غير. **ولا تُجدَّد مفردات الحالة** — التحذير
 * المكتوب داخل جسمها يشرح لماذا: العميل والقاموسان يعرفون أربع قيم فقط،
 * وتوسيعها كسرٌ صامت لطرف العقد الآخر.
 *
 * والعمودان `null` للأكواد السابقة — **غيابٌ يُقال لا صفرٌ يُختلق** (التكليف:
 * «Never convert we-do-not-collect-this into the number zero»).
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
  -- [COMMISSIONING §5] قوّة الكود تصل الشاشة — وإلا فالقول إنها «مرئيّة في
  -- وحدة التحكّم» ادّعاءٌ بلا مسار، وهو ما يمنعه التكليف نصًّا.
  entropy_ceiling_bits int,
  generated_server_side boolean,
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
           -- `null` للأكواد السابقة لـ20260824120004 — **غيابٌ يُقال لا صفرٌ
           -- يُختلق**: صفرٌ هنا يعني «بلا إنتروبيا إطلاقًا» وهو ادّعاء كاذب.
           f.entropy_ceiling_bits,
           f.generated_server_side,
           (select count(*) from filtered)
      from filtered f
     order by f.created_at desc
     limit size offset (pg - 1) * size;
end;
$$;

revoke all on function public.founder_code_page(text, int, int) from public, anon;
grant execute on function public.founder_code_page(text, int, int) to authenticated;
