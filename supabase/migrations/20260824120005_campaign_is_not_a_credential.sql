-- ═══════════════════════════════════════════════════════════════════════════
-- [STAGING-COMMISSIONING §8] الحملة اسمٌ، والكود سرّ — ولا يجتمعان في حقل واحد
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ═══ القرار الذي تنفّذه هذه الهجرة ═══
-- حكم المؤسس، حرفيًّا: «لا تدع سلاسل ضعيفة مقروءة مثل `RAMADAN2345` تعمل
-- مباشرةً كأسرار Premium. إن احتاجت الحملات أسماءً مقروءة فالنموذج:
-- حملة = RAMADAN، وتُولَّد تحتها أكواد فردية قوية. لا تخلط **وسم الحملة**
-- بـ**بيانات الاعتماد الحاملة**.»
--
-- وهذا يغلق `F-5` — آخر عيب بقي مفتوحًا في `COMMERCE-ADMIN-THREAT-MODEL.md`،
-- وكان مرفوعًا هناك صراحةً بوصفه **قرار عمل لا قرار وكيل**. وقد صدر القرار.
--
-- ═══ الثقب مقيسٌ لا مُتوهَّم ═══
-- على PostgreSQL 16 حقيقي بالهجرات الإحدى والثلاثين من قاعدة نظيفة: أصدر
-- المؤسس الحرفَ `RAMADAN2345` (٣٠ يومًا · ٥٠٠ استهلاك)، **واستبدله مستخدمان
-- غير مترابطين** فنال كلٌّ منهما وصولًا مدفوعًا كاملًا. و`specialAccessActive`
-- في العميل تكافئ `premiumActive` في الفتح — أي أن كودًا يُخمَّن بقاموس في
-- ثوانٍ كان يفتح التطبيق المدفوع بأكمله.
--
-- ═══ ولماذا لا جدول حملات جديد ═══
-- **الحملة موجودة أصلًا**: `access_codes.label` هو حقلها، ووثيقة المعمارية
-- تقولها نصًّا («A campaign is an `access_codes` row (`label` + `duration_days`)»)،
-- وتعليق العمود نفسه يقول `campaign / influencer`، وقاموسا الواجهة يسمّيانه
-- «الحملة». فإنشاء جدول `campaigns` هنا كان سيصنع **سلطة ثانية** لمفهوم قائم —
-- وهو بالضبط ما يمنعه التكليف (§17). لا يتغيّر المخطّط؛ يتغيّر **من يملك حقّ
-- اختيار السرّ**.
--
-- ═══ وشكل التغيير: استبدالٌ لا حِمل زائد ═══
-- ⚠️ إضافة وسيط بقيمة افتراضية إلى `founder_issue_access_code` **لا تستبدلها
-- بل تُنشئ حِملًا ثانيًا**، فيصير النداء القديم `function ... is not unique`.
-- مقيسٌ على staging لا مفترَض. ولذلك: التوقيع السداسي يبقى **حرفيًّا كما هو**،
-- والإصدار الدفعيّ يأتي باسمٍ جديد فوق **نواة مشتركة** — لا نسختين تتباعدان.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── ١) النواة: موضع الإصدار الوحيد ────────────────────────────────────────
/**
 * كل ما كان داخل `founder_issue_access_code` ينتقل هنا حرفيًّا، ويضاف إليه
 * شيئان: **أرضية الإنتروبيا** و**سدّ تسريب البصمة**. والمدخلان العامّان
 * (المفرد والدفعيّ) يستدعيانها، فلا يوجد تنفيذان للإصدار يتباعدان بتحرير —
 * نفس مبدأ `private.redeem_core`.
 *
 * ولا تفحص هذه النواة الدور: الفحص يبقى في المدخل العامّ حيث كان، كي لا
 * يتغيّر اسم الخطأ الذي تعتمده الاختبارات (`founder_role_required`).
 */
create or replace function private.issue_code_core(
  p_reason          text,
  p_label           text,
  p_duration_days   int,
  p_max_redemptions int,
  p_expires_at      timestamptz,
  p_code            text
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
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'founder_issue_access_code: reason required' using errcode = '22023';
  end if;
  if coalesce(p_duration_days, 0) < 1 or p_duration_days > 3650 then
    raise exception 'founder_issue_access_code: duration out of range' using errcode = '22023';
  end if;
  if coalesce(p_max_redemptions, 0) < 1 then
    raise exception 'founder_issue_access_code: max redemptions must be >= 1' using errcode = '22023';
  end if;

  -- ══ أرضية الإنتروبيا — الحكم نفسه، منفَّذًا ══
  --
  -- الوسيط `p_code` **يبقى في التوقيع** (نزعه يكسر النداءات القائمة ويُنشئ
  -- حِملًا)، ويصير رفضه **مسمّى**: من يمرّر حرفًا يُقال له أين يضع اسم حملته
  -- بدل أن يُترك يخمّن. والرسالة تحمل الجواب لا اللوم (§6).
  --
  -- ولماذا رفضٌ تامّ لا «أرضية طول»: حرفٌ من ستّة عشر رمزًا يكتبه إنسان ليس
  -- عشوائيًّا — `QIMMAHRAMADAN25` يبلغ الأرضية طولًا وإنتروبيته الفعلية قريبة
  -- من الصفر. **الطول ليس عشوائية**، والفرق بينهما هو العيب كلّه.
  if nullif(btrim(coalesce(p_code, '')), '') is not null then
    raise exception 'code_must_be_generated: a campaign is a label (p_label), not a secret; leave p_code null'
      using errcode = '22023';
  end if;

  raw_code   := private.generate_access_code(16);   -- ٨٠ بتًا
  normalized := private.normalize_access_code(raw_code);
  ver        := private.active_pepper_version();
  actor      := 'founder:' || coalesce(auth.uid()::text, 'unknown');

  -- ══ وسدّ تسريبٍ صغير كان يعيد ما يحجبه الجدول ══
  -- تصادم `code_hash` كان يخرج `unique_violation` ومعه **البصمة المملّحة** في
  -- `DETAIL` — وهي القيمة التي تحرص `founder_code_page` على ألّا تعيدها أبدًا.
  -- تُبتلع هنا وتُستبدل باسمٍ عامّ. (والتصادم في ٨٠ بتًا لا يُذكر — و«لا يُذكر»
  -- ليست «مستحيل».)
  begin
    insert into public.access_codes (code_hash, hash_version, label, duration_days,
                                     expires_at, max_redemptions, created_by, created_reason,
                                     entropy_ceiling_bits, generated_server_side)
    values (private.hash_identity(normalized, ver), ver, p_label, p_duration_days,
            p_expires_at, p_max_redemptions, actor, btrim(p_reason),
            char_length(normalized) * 5, true)
    returning access_codes.id into new_id;
  exception when unique_violation then
    raise exception 'code_already_exists' using errcode = '23505';
  end;

  -- ⚠️ الخام هنا **آخر مرّة يظهر فيها**. الجدول لا يحمله، ولا مسار لاستعادته.
  return jsonb_build_object(
    'id',              new_id,
    'code',            normalized,
    'label',           p_label,
    'duration_days',   p_duration_days,
    'max_redemptions', p_max_redemptions,
    'expires_at',      p_expires_at,
    'entropy_ceiling_bits', char_length(normalized) * 5,
    'generated',       true,
    'issued_at',       to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
end;
$$;

revoke all on function private.issue_code_core(text,text,int,int,timestamptz,text)
  from public, anon, authenticated;

comment on function private.issue_code_core(text,text,int,int,timestamptz,text) is
  'موضع الإصدار الوحيد. يرفض أي كود حرفي (code_must_be_generated) ويولّد ١٦ رمزًا = ٨٠ بتًا.';

-- ── ٢) المدخل المفرد: نفس التوقيع، نفس اسم الخطأ، نواةٌ واحدة ──────────────
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
begin
  perform private.require_founder();
  return private.issue_code_core(p_reason, p_label, p_duration_days,
                                 p_max_redemptions, p_expires_at, p_code);
end;
$$;

revoke all on function public.founder_issue_access_code(text,text,int,int,timestamptz,text)
  from public, anon;
grant execute on function public.founder_issue_access_code(text,text,int,int,timestamptz,text)
  to authenticated;

-- ── ٣) الإصدار الدفعيّ — بدونه لا يستطيع المؤسس تشغيل حملة أصلًا ──────────
/**
 * ═══ لماذا هذا **ليس** ميزة إضافية بل شرطُ صحّة للقرار أعلاه ═══
 * قبل هذه الهجرة كانت الحملة تُدار بكودٍ واحد مقروء و`max_redemptions = 500`.
 * وبعد أرضية الإنتروبيا يصير الكود الواحد عشوائيًّا — لكنه **يبقى سرًّا واحدًا
 * يتقاسمه خمسمئة إنسان**: يكفي أن ينشره واحد لينتهي. ونموذج المؤسس المُعلَن
 * «أكواد فردية قوية تحت اسم حملة» يحتاج مُصدِرًا دفعيًّا — وإلا فُرِض عليه
 * خمسمئة نداء أو العودة إلى السرّ المتقاسَم. فمنعُ الأول بلا إتاحة الثاني
 * يبدو إحكامًا وهو دفعٌ إلى الحيلة.
 *
 * **اسمٌ جديد لا وسيط جديد**: إضافة `p_count` إلى الدالّة القائمة تُنشئ حِملًا
 * زائدًا (مقيس)، فيصير النداء السداسي القائم في العميل ملتبسًا. والاسم الجديد
 * لا يمسّ عقد العميل الحالي بحرف.
 *
 * والحدّ ٥٠٠ في النداء الواحد: سقفٌ يمنع نداءً واحدًا يقفل الجدول طويلًا.
 */
create or replace function public.founder_issue_code_batch(
  p_reason          text,
  p_label           text default null,
  p_duration_days   int  default 14,
  p_max_redemptions int  default 1,
  p_expires_at      timestamptz default null,
  p_count           int  default 1
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  n     int;
  i     int;
  one   jsonb;
  codes jsonb := '[]'::jsonb;
begin
  perform private.require_founder();
  n := coalesce(p_count, 1);
  if n < 1 or n > 500 then
    raise exception 'batch_count_out_of_range' using errcode = '22023';
  end if;
  for i in 1 .. n loop
    one := private.issue_code_core(p_reason, p_label, p_duration_days,
                                   p_max_redemptions, p_expires_at, null);
    codes := codes || jsonb_build_array(one -> 'code');
  end loop;
  -- ⚠️ الأكواد الخام هنا **آخر مرّة تظهر فيها** — كما في المفرد تمامًا.
  return jsonb_build_object(
    'label',           p_label,
    'count',           n,
    'duration_days',   p_duration_days,
    'max_redemptions', p_max_redemptions,
    'expires_at',      p_expires_at,
    'entropy_ceiling_bits', 80,
    'codes',           codes,
    'issued_at',       to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
end;
$$;

revoke all on function public.founder_issue_code_batch(text,text,int,int,timestamptz,int)
  from public, anon;
grant execute on function public.founder_issue_code_batch(text,text,int,int,timestamptz,int)
  to authenticated;

comment on function public.founder_issue_code_batch(text,text,int,int,timestamptz,int) is
  'حملة = وسم واحد (p_label) فوق أكواد فردية مولَّدة. الأكواد تعود مرّة واحدة ولا تُستعاد.';

-- ── ٤) صدق رقم القوّة: سقفٌ لا يكذب ───────────────────────────────────────
/**
 * `entropy_ceiling_bits = char_length × 5` بلا حدّ أعلى كان يقول عن كودٍ
 * **أضعف** إنه **أقوى**: أربعون رمزًا من حرف واحد مكرّر تُبلِّغ ٢٠٠ بتًا
 * وإنتروبيتها صفر. والرقم يظهر في وحدة تحكّم المؤسس، فيقرأ ضعفًا قوّةً.
 *
 * والمسار المولَّد صار وحده على الطريق العامّ (البند ١)، فطوله ١٦ دائمًا
 * وسقفه ٨٠ صادق. يبقى `admin_create_access_code` — مسار مفتاح الخادم — يقبل
 * حرفًا، فيتوقّف عن **ادّعاء رقم**: `null` تعني «لا نعرف»، وتعرضها الواجهة
 * «قوّته ما تُقاس» بنصّها القائم.
 *
 * ⚠️ **ولا يُفرَض عليه أرضية**: نحو عشرين تأكيدًا داخل البوّابة يزرع أكوادًا
 * حرفية قصيرة عبره، وفرضُ الأرضية هناك يعيد كتابة أطقم إثبات لا علاقة لها
 * بهذا القرار. وحدّه معلَن: **مفتاح الخادم لا يصل المتصفّح أبدًا** (يحرسه
 * `test:attack-bundle`)، فمن يملكه يملك القاعدة كلّها أصلًا — وأرضيةٌ أمام
 * من يستطيع `insert` مباشرةً ليست حدًّا بل زينة.
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
  -- نفس سدّ التسريب الذي في النواة، وللسبب نفسه: `unique_violation` الخام
  -- تحمل **البصمة المملّحة** في `DETAIL`. وأثرها هنا أخفّ (مفتاح الخادم يملك
  -- القاعدة أصلًا) — لكن **اختلاف السلوك بين مدخلين هو ما يُنسى ويُستغَلّ**،
  -- فيتطابقان.
  begin
    insert into public.access_codes (code_hash, hash_version, label, duration_days,
                                     expires_at, max_redemptions, created_by, created_reason,
                                     entropy_ceiling_bits, generated_server_side)
    values (private.hash_identity(normalized, ver), ver, p_label, p_duration_days,
            p_expires_at, p_max_redemptions, p_created_by, p_created_reason,
            -- **الغياب يُقال ولا يُخترَع رقم**: طولُ حرفٍ يكتبه إنسان لا يشهد
            -- لعشوائيته، فلا يُحوَّل إلى «بتّات» تُقرأ شهادةَ قوّة.
            null, false)
    returning access_codes.id into id;
  exception when unique_violation then
    raise exception 'code_already_exists' using errcode = '23505';
  end;
  return id;
end;
$$;

revoke all on function public.admin_create_access_code(text,text,text,int,int,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.admin_create_access_code(text,text,text,int,int,text,timestamptz)
  to service_role;

-- ── ٥) وأرضية المولّد نفسه ترتفع ٬١٢ ⇐ ٬١٦ ────────────────────────────────
/**
 * الافتراض كان ١٢ رمزًا (٦٠ بتًا) والرفع يعيش في موضع النداء وحده — أي أن أي
 * مستدعٍ قادم ينسى تمرير ١٦ يقع على ٦٠ بتًا صامتة. الافتراض الآمن يُنقل إلى
 * **الدالّة**، والحدّ الأدنى معه: ما دون ١٦ يُرفض باسمه بدل أن يُرفَع بصمت،
 * فلا يظنّ مستدعٍ أنه نال ما طلب.
 * (لا مستدعي خارجيّ اليوم: الدالّة ممنوحة للمالك وحده — مقيس.)
 */
create or replace function private.generate_access_code(p_symbols int default 16)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  n        int := coalesce(p_symbols, 16);
  out_code text := '';
  buf      bytea;
  i        int;
  b        int;
begin
  if n < 16 then
    raise exception 'code_entropy_floor: 16 symbols (80 bits) is the minimum' using errcode = '22023';
  end if;
  if n > 24 then n := 24; end if;
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

revoke all on function private.generate_access_code(int) from public, anon, authenticated;

comment on function private.generate_access_code(int) is
  'أرضية ١٦ رمزًا = ٨٠ بتًا. ما دونها يُرفض باسمه لا يُرفَع بصمت.';
