-- ============================================================================
-- [GATEWAY-ENFORCEMENT] الختم يصير سلطةً في القاعدة — إغلاق الالتفاف على البوّابة
-- ============================================================================
-- الثغرة المقيسة: `qimmah-gateway` **يسكّ** ختم `x-qimmah-gate`، و`contract.mjs`
-- يعلن أن السلطة وقت التشغيل هي `private.gate_stamp_valid` — لكن هذه الدالّة
-- **لم تكن موجودة**. فالدوالّ الأربع تبقى ممنوحة لـ`authenticated`، والمتصفّح
-- ينادي PostgREST مباشرةً متجاوزًا البوّابة كليًّا. هذه الهجرة تجعل المعمار
-- المعلَن صحيحًا من طرفٍ إلى طرف — **بلا سلطة هوية ثانية وبلا كشف سرّ**.
--
-- ═══ التدفّق الذي تُتمّه ═══
--   متصفّح مصادَق → qimmah-gateway → حدّ لكل عنوان → ختم HMAC قصير العمر →
--   PostgREST RPC → القاعدة تتحقّق: (١) الهوية من auth.uid() حصرًا،
--   (٢) الفعل يطابق الـRPC، (٣) uid الختم = auth.uid()، (٤) نافذة الختم حاليّة
--   أو السابقة، (٥) صحّة الـHMAC → عندها فقط تُنفَّذ الطفرة.
--
-- ═══ الهوية تبقى auth.uid() وحدها ═══
-- الختم لا يحمل هوية ولا يُصدّق على مستخدم — يقول «مررتُ بالبوّابة» لا «أنا فلان»
-- (نصّ contract.mjs حرفيًّا). كل هوية تُشتقّ من `auth.uid()` كما كانت، ولا سطر
-- في عقد القاعدة يقبل معرّفًا يقوله المستدعي.
--
-- ═══ السرّ: Supabase Vault حصرًا — لا نصّ في جدول ولا في هجرة ═══
-- `private.gate_secret()` يقرأ `vault.decrypted_secrets` (المخزن الوحيد الذي
-- تقرؤه القاعدة ولا يبلغه أي دور عميل). **لا يُكتب السرّ هنا.** يُزرَع مرّةً على
-- staging بأمر منفصل يوثّقه الرَّنبوك، وبنفس القيمة يُضبط متغيّر البيئة
-- `QIMMAH_GATE_SECRET` للطرفية. غياب السرّ ⇒ **فشلٌ مغلق**: كل نداء مبوَّب يُرفض.
--   provisioning (على staging، مرّة، بدور الخدمة/محرّر SQL):
--     select vault.create_secret('<٣٢ محرفًا+ عشوائيّة staging>',
--            'qimmah_gate_secret', 'HMAC key shared with qimmah-gateway env');
--
-- ═══ الحساب لا يعتمد pgcrypto ولا مخطّط extensions ═══
-- الـHMAC مبنيّ على `sha256()` من نواة Postgres (نفس اختيار hash_identity)،
-- فيعمل على الإنتاج وعلى صندوق PGlite بلا اختلاف — ولا يحتاج `extensions.hmac`
-- الذي لا يوجد في الصندوق. مُثبَت مطابقًا بايتًا-ببايت لِـ`hmacHex` في البوّابة.
--
-- ═══ التصنيف الصريح — ما يُبوَّب وما لا يُبوَّب ═══
--   • **يُبوَّب** (طفرات تمرّ عبر GATED_ACTIONS، ولا مستدعي داخليّ لها — مُتحقَّق
--     بالمسح): start_trial · redeem_access_code_v2 · claim_pending_grants ·
--     submit_missing_food. كلٌّ يشترط أصلًا `auth.uid()` غير فارغ، فلا مسار خدمة
--     ينكسر (دور الخدمة بلا JWT يسقط عند «not authenticated» قبل الحارس).
--   • **لا يُبوَّب — عمدًا**: `my_entitlement` (قراءة على كل تحميل صفحة) ·
--     دوالّ المؤسس/الإدارة (تُنادى من لوحة الإدارة لا من البوّابة، وتحرس نفسها
--     بـrequire_admin) · `salla_ingest_event` و`gate_admit` (دور الخدمة، خادم
--     إلى خادم، لا متصفّح). تبويبها كان سيكسر مسارات شرعية.
--
-- idempotent · forward-only · لا هجرة سابقة تُحرَّر.
-- ============================================================================

-- ── ١) HMAC-SHA256 على نواة Postgres — مطابق لِـWeb Crypto في البوّابة ──────
-- مُثبَت: encode(gate_hmac_sha256(key, msg),'hex') = contract.mjs hmacHex(key,msg).
create or replace function private.gate_hmac_sha256(p_key bytea, p_msg bytea)
returns bytea
language plpgsql
immutable
set search_path = ''
as $$
declare
  blocksize int := 64;   -- كتلة SHA-256
  k    bytea := p_key;
  ipad bytea := ''::bytea;
  opad bytea := ''::bytea;
  i    int;
  kb   int;
begin
  -- مفتاح أطول من الكتلة يُختصر بالتجزئة، ثم يُبطَّن يمينًا بالأصفار.
  if octet_length(k) > blocksize then k := sha256(k); end if;
  while octet_length(k) < blocksize loop k := k || '\x00'::bytea; end loop;
  for i in 0 .. blocksize - 1 loop
    kb := get_byte(k, i);
    ipad := ipad || set_byte('\x00'::bytea, 0, kb # 54);   -- 0x36
    opad := opad || set_byte('\x00'::bytea, 0, kb # 92);   -- 0x5c
  end loop;
  return sha256(opad || sha256(ipad || p_msg));
end;
$$;

-- ── ٢) السرّ من Vault — فشلٌ مغلق عند الغياب ────────────────────────────────
-- يُقرأ في سياق المُعرِّف (postgres) ولا يبلغ العميل أبدًا: الخارج بوليان فقط.
-- غياب مخطّط vault (بيئة غير-Supabase) أو غياب الصفّ ⇒ null ⇒ رفض.
create or replace function private.gate_secret()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare s text;
begin
  begin
    select decrypted_secret into s
      from vault.decrypted_secrets
     where name = 'qimmah_gate_secret'
     limit 1;
  exception when others then
    return null;   -- لا vault ⇒ فشل مغلق، لا استثناء يتسرّب
  end;
  s := nullif(btrim(coalesce(s, '')), '');
  -- نفس حدّ البوّابة (readGatewayConfig): سرٌّ أقصر من ٣٢ = تهيئة ناقصة = رفض.
  if s is null or length(s) < 32 then return null; end if;
  return s;
end;
$$;

-- ── ٣) السلطة وقت التشغيل — الدالّة التي يسمّيها contract.mjs ─────────────────
-- تطابق verifyStamp حرفًا بحرف: شكل `window.sig`، النافذة حاليّة أو السابقة،
-- والرسالة `action|uid|window`. مقارنة ثابتة الزمن (نيّة timingSafeEqualHex).
create or replace function private.gate_stamp_valid(p_action text, p_uid uuid, p_stamp text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  secret     text := private.gate_secret();
  dot        int;
  w_text     text;
  sig_hex    text;
  w          bigint;
  now_window bigint;
  msg        text;
  expected   bytea;
  provided   bytea;
  i          int;
  diff       int := 0;
begin
  if secret is null then return false; end if;          -- فشل مغلق: لا سرّ
  if p_uid is null then return false; end if;           -- لا هوية ⇒ لا ختم
  if p_stamp is null or p_stamp = '' then return false; end if;

  dot := strpos(p_stamp, '.');
  if dot <= 1 then return false; end if;                -- مشوَّه: لا فاصل نافذة
  w_text  := left(p_stamp, dot - 1);
  sig_hex := substr(p_stamp, dot + 1);
  if w_text !~ '^[0-9]+$' then return false; end if;    -- نافذة مشوَّهة
  if sig_hex !~ '^[0-9a-f]{64}$' then return false; end if; -- توقيع مشوَّه
  w := w_text::bigint;

  -- window = floor(epoch / STAMP_WINDOW_SECONDS)، STAMP_WINDOW_SECONDS = 120.
  now_window := floor(extract(epoch from now()) / 120)::bigint;
  if w <> now_window and w <> now_window - 1 then
    return false;                                        -- منتهٍ أو مستقبليّ
  end if;

  -- stampMessage(action, uid, window) = 'action|uid|window' — الربط بالهوية
  -- والفعل هنا: ختمُ فعلٍ آخر أو مستخدمٍ آخر يعطي HMAC مختلفًا فيُرفض.
  msg := p_action || '|' || p_uid::text || '|' || w::text;
  expected := private.gate_hmac_sha256(convert_to(secret, 'UTF8'), convert_to(msg, 'UTF8'));
  provided := decode(sig_hex, 'hex');

  -- مقارنة تمرّ على كل بايت دائمًا (لا تنهار عند أول اختلاف).
  if octet_length(provided) <> octet_length(expected) then return false; end if;
  for i in 0 .. octet_length(expected) - 1 loop
    diff := diff | (get_byte(provided, i) # get_byte(expected, i));
  end loop;
  return diff = 0;
end;
$$;

-- ── ٤) الحارس الذي تناديه كل RPC مبوَّبة ────────────────────────────────────
-- يقرأ الهوية من auth.uid() (السلطة الوحيدة)، والختم من ترويسة PostgREST
-- `request.headers` باسمه المتعاقَد عليه `x-qimmah-gate`. رفضٌ ⇒ استثناء يُجهض
-- المعاملة **قبل أي طفرة**.
create or replace function private.gate_enforce(p_action text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  hdrs  json;
  stamp text;
  uid   uuid := auth.uid();
begin
  if uid is null then
    raise exception 'gate: not authenticated' using errcode = '28000';
  end if;

  begin
    hdrs := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    hdrs := null;
  end;
  -- PostgREST يخفض أسماء الترويسات؛ STAMP_HEADER = 'x-qimmah-gate'.
  stamp := case when hdrs is null then null else hdrs ->> 'x-qimmah-gate' end;

  if not private.gate_stamp_valid(p_action, uid, stamp) then
    raise exception 'gate_stamp_invalid: %', p_action using errcode = '28000';
  end if;
end;
$$;

-- دوالّ الحارس سرّية: لا دور عميل يناديها مباشرةً (المخطّط private محجوب أصلًا).
revoke all on function private.gate_hmac_sha256(bytea, bytea) from public, anon, authenticated;
revoke all on function private.gate_secret()                  from public, anon, authenticated;
revoke all on function private.gate_stamp_valid(text, uuid, text) from public, anon, authenticated;
revoke all on function private.gate_enforce(text)             from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- ٥) إعادة تعريف الطفرات الأربع — **الجسد منقول حرفيًّا** من آخر مُعرِّف لكلٍّ،
--    والزيادة الوحيدة سطرٌ واحد: `perform private.gate_enforce('<action>');`
--    مباشرةً بعد فحص «not authenticated» وقبل أي قراءة أو كتابة. عقد
--    test:migration-order: هذا الملف يصير آخر مُعرِّف، فيطابق الجسدَ الحيّ.
-- ════════════════════════════════════════════════════════════════════════════

-- ⇐ منقولة حرفيًّا من 20260824120004_activation_hardening.sql + سطر الحارس.
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
  perform private.gate_enforce('start_trial');

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

-- ⇐ منقولة حرفيًّا من 20260824120001_roles_and_redeem_rate_limit.sql + الحارس.
--   الفعل هنا `redeem_access_code` (مفتاح GATED_ACTIONS)، لا اسم الـRPC `_v2`.
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
  perform private.gate_enforce('redeem_access_code');
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

-- ⇐ منقولة حرفيًّا من 20260816120001_commerce_integrity_fixes.sql + الحارس.
create or replace function public.claim_pending_grants()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  em text;
  conf timestamptz;
  cur record;
  rec record;
  purchase_provider text;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  perform private.gate_enforce('claim_pending_grants');
  -- التحقّق من البريد **شرط للمِنحة**، لا للتجربة وحدها.
  -- كانت `start_trial` تشترط `email_confirmed_at`، وهذه لا تشترطه — بينما هي
  -- تمنح ما هو **أثمن**: Premium دائم مسجَّل على عنوان بريد. فمن يسجّل بعنوان
  -- غيره ولم يؤكّده كان يستلم شراء صاحبه. عدم التماثل هنا هو الثغرة نفسها.
  select u.email, u.email_confirmed_at into em, conf from auth.users u where u.id = uid;
  if em is null then raise exception 'unknown user' using errcode = 'P0002'; end if;
  if conf is null then raise exception 'email_not_verified' using errcode = '28000'; end if;
  if private.is_access_revoked(uid, em) then
    raise exception 'access_revoked' using errcode = '28000';
  end if;

  select p.provider into purchase_provider from private.identity_hashes(em) ih
    join public.purchase_ledger p on p.email_hash = ih.email_hash
   order by p.granted_at desc, p.id desc
   limit 1;
  if purchase_provider is not null then
    insert into public.entitlements (user_id, email, entitlement_type, source,
                                     activated_at, expires_at, no_expiry)
    values (uid, em, 'premium', purchase_provider, now(), null, true)
    on conflict (user_id) do update
      set entitlement_type = 'premium', source = purchase_provider, activated_at = now(),
          expires_at = null, no_expiry = true, activation_code_id = null
      where public.entitlements.entitlement_type <> 'premium'
         or public.entitlements.source <> purchase_provider;
    return 'premiumActive';
  end if;

  select l.code_id, l.redeemed_at,
         l.redeemed_at + make_interval(days => ac.duration_days) as original_expiry
    into rec
    from public.code_redemption_ledger l
    join public.access_codes ac on ac.id = l.code_id
   where l.email_hash in (select ih.email_hash from private.identity_hashes(em) ih)
     and ac.enabled
     and l.redeemed_at + make_interval(days => ac.duration_days) > now()
   order by original_expiry desc
   limit 1;
  select * into cur from public.entitlements where user_id = uid;
  if rec.code_id is not null then
    if found and (private.grant_rank(cur.entitlement_type) > 2
                  or (cur.expires_at is not null and cur.expires_at >= rec.original_expiry)
                  or cur.no_expiry) then
      return private.derive_state(cur.entitlement_type, cur.no_expiry, cur.expires_at, cur.revoked_at);
    end if;
    insert into public.entitlements (user_id, email, entitlement_type, source,
                                     activation_code_id, activated_at, expires_at, no_expiry)
    values (uid, em, 'special', 'code', rec.code_id, rec.redeemed_at, rec.original_expiry, false)
    on conflict (user_id) do update
      set entitlement_type = 'special', source = 'code', activation_code_id = rec.code_id,
          activated_at = rec.redeemed_at, expires_at = rec.original_expiry, no_expiry = false;
    insert into public.access_code_redemptions (code_id, user_id)
    values (rec.code_id, uid)
    on conflict (code_id, user_id) do nothing;
    return 'specialAccessActive';
  end if;
  if found then
    return private.derive_state(cur.entitlement_type, cur.no_expiry, cur.expires_at, cur.revoked_at);
  end if;
  return 'noAccess';
end;
$$;

revoke all on function public.claim_pending_grants() from public, anon;
grant execute on function public.claim_pending_grants() to authenticated;

-- ⇐ منقولة حرفيًّا من 20260824120003_food_submissions.sql + الحارس.
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
  perform private.gate_enforce('submit_missing_food');

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

-- ════════════════════════════════════════════════════════════════════════════
-- ٦) تحقّق ذاتي (§4.2): البنية أُنشئت، والحارس موصول، والمقصود لم يُمسّ.
-- ════════════════════════════════════════════════════════════════════════════
do $$
begin
  -- (أ) دوالّ الحارس موجودة بالأسماء التي يعتمدها العقد.
  if to_regprocedure('private.gate_stamp_valid(text, uuid, text)') is null
     or to_regprocedure('private.gate_enforce(text)') is null
     or to_regprocedure('private.gate_secret()') is null then
    raise exception 'gateway-enforcement incomplete: guard functions missing';
  end if;

  -- (ب) كل RPC مبوَّبة تحمل نداء الحارس في جسدها الحيّ (الوصل فعليّ لا مُدّعى).
  if (select prosrc from pg_proc where oid = 'public.start_trial()'::regprocedure)
        not like '%gate_enforce(''start_trial'')%'
     or (select prosrc from pg_proc where oid = 'public.redeem_access_code_v2(text)'::regprocedure)
        not like '%gate_enforce(''redeem_access_code'')%'
     or (select prosrc from pg_proc where oid = 'public.claim_pending_grants()'::regprocedure)
        not like '%gate_enforce(''claim_pending_grants'')%'
     or (select prosrc from pg_proc where oid = 'public.submit_missing_food(text,text,text,text,numeric,numeric,numeric,numeric,text,text)'::regprocedure)
        not like '%gate_enforce(''submit_missing_food'')%' then
    raise exception 'gateway-enforcement incomplete: a gated RPC is missing its guard';
  end if;

  -- (جـ) **التأكيد المضادّ**: المنح المقصودة لم تُسحب — لا تبويب صامت لِما لا يُبوَّب.
  if not (has_function_privilege('authenticated', 'public.start_trial()', 'execute')
      and has_function_privilege('authenticated', 'public.redeem_access_code_v2(text)', 'execute')
      and has_function_privilege('authenticated', 'public.claim_pending_grants()', 'execute')
      and has_function_privilege('authenticated', 'public.my_entitlement()', 'execute')) then
    raise exception 'gateway-enforcement overreach: an intentional grant was lost';
  end if;

  -- (د) my_entitlement **ليست مبوَّبة** (قراءة على كل تحميل صفحة): لو حملت
  --     الحارس لانكسر كل دخول. تأكيدٌ صريح أنها بقيت خارج التبويب.
  if (select prosrc from pg_proc where oid = 'public.my_entitlement()'::regprocedure)
        like '%gate_enforce%' then
    raise exception 'gateway-enforcement overreach: my_entitlement must not be gated';
  end if;
end;
$$;
