-- ═══════════════════════════════════════════════════════════════════════════
-- قِمّة — فحص سلوكي على staging الحقيقي
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ **لا يُشغَّل إلا على staging.** يُنشئ مستخدمي اختبار ويحذفهم بعده.
--    والحارس أدناه يرفض العمل على قاعدة فيها حساب حقيقي.
--
-- ═══ لماذا هذا الملف بعد صفّ التحقّق ═══
-- صفّ التحقّق قال إن ٢٧ جدولًا عليها RLS و٦ دوالّ ممنوحة — وهذا يُثبت أن
-- **البنية موجودة**، لا أنها **تعمل**. والفرق بينهما هو الفرق بين مخطَّطٍ
-- مطبَّق ومنتجٍ يشتغل: دالّةٌ موجودة قد ترفع عند أوّل نداء حقيقي، وسياسةُ RLS
-- قد تمنع ما يجب أن تسمح به.
--
-- فهذا يمرّ على **الرحلات التجارية الأربع** كما يمرّ عليها مستخدم حقيقي:
--   ① تجربة ٧٢ ساعة — تُمنح، ومرّة واحدة
--   ② حارس الأسماء المستعارة (`+tag`) — الثقب الذي أُغلق
--   ③ كود تفعيل — يُصدَر ويُستبدَل، والحملة اسمٌ لا سرّ
--   ④ حدّ المعدّل — يُطلق فعلًا
--
-- ويُنظّف نفسه في آخره، فلا يترك أثرًا يلتبس ببيانات المؤسس.
--
-- ═══ ⚠️ النتيجة تعود **صفًّا** لا إشعارًا — والسبب واقعة ═══
-- أوّل صيغة كتبت نتائجها بـ`RAISE NOTICE` وحدها. فشُغّلت على staging الحقيقي
-- عبر **واجهة الإدارة** — وهي القناة الوحيدة التي عملت فعلًا — فعاد 201
-- وعاد صفّ التنظيف نظيفًا، **وضاعت الفحوص التسعة في الطريق**: الإشعارات لا
-- تعود في استجابة الواجهة ولا تظهر في سجلّات Postgres.
--
-- والنتيجة أن الفحص جرى ولم يُقرأ. وطُلب عندها تسجيلُ دخولٍ للوحة — أي
-- **التفافٌ حول عيبٍ في هذا الملف** بدل إصلاحه. فأُصلح: كل فحص يُسجَّل في
-- جدول مؤقّت، وآخر عبارة `select` تُعيده كاملًا. **فأي قناة تُعيد صفوفًا
-- تحمل الحكم كاملًا** — واجهة الإدارة · محرّر SQL · `psql`.
-- والإشعارات باقية معها لمن يشغّله في `psql` أو المحرّر.
--
-- ═══ وهُوجم قبل أن يُسلَّم (§4.2) ═══
-- بوابةٌ لم تُهاجَم ليست بوابة. وثلاثة التفافات سقطت **باسمها**:
--
--   ⚔️ **حارس الإنتاج:** أُدرج حسابٌ حقيقي في قاعدة نظيفة، فتوقّف قبل أن يكتب
--      حرفًا: `ERROR: refusing_on_populated_database`.
--
--   ⚔️ **حارس §8:** نُزع شرط `code_must_be_generated` من نواة الإصدار — فانقلب
--      الصفّ إلى `verdict = FAIL · passed 8 · failed 1`، وسمّى الساقط:
--      «٦ — كودٌ مقروء قُبِل — الثقب مفتوح»، ومعه الحمولة التي تفضح نفسها
--      (`"code": "RAMADAN2345"` و`"generated": true`). أي أن هذا السطر
--      **يقيس الحارس** ولا يزيّن التقرير بنجاحٍ مضمون.
--
--   ⚔️ **والحكم نفسه:** لو كان `verdict` نصًّا ثابتًا لبقي `PASS` تحت العبث.
--      انقلابه هو الدليل على أنه محسوب من الجدول لا مكتوب.
--
-- ✅ **وإعادة اللصق آمنة** — مقيسٌ لا مفترَض: تشغيلتان متتاليتان على نفس
--    القاعدة تعطيان `PASS · 9 · 0` كلتيهما، لأن التنظيف يمحو ما يمنع الثانية:
--    سجلّ التجربة (بلا `user_id` عمدًا فينجو من حذف الحساب) ودفتر المحاولات.
--
-- ⚠️ **ولا يُنشئ كلمة مرور لأحد ولا يرسلها** — يُدرج مستخدمي اختبار مباشرةً
--    في `auth.users` ثم يحذفهم. لا تسجيل دخول ولا بريد.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── سجلّ النتائج: مؤقّت، فينتهي بانتهاء الجلسة بلا أثر ────────────────────
-- `temp` لا جدولًا دائمًا: الملف يَعِد بألّا يترك أثرًا، وجدولٌ باقٍ في
-- `private` نقضٌ للوعد. والجلسة الواحدة تكفي — الحِزَم الست أثبتت أن الواجهة
-- تنفّذ العبارات المتعدّدة في جلسة واحدة (بذرة الملح ثم `select` عادتا معًا).
drop table if exists pg_temp.qimmah_smoke_results;
create temp table qimmah_smoke_results (
  ord    int  primary key,
  ok     boolean not null,
  label  text not null,
  detail text
);

-- مسجِّلٌ مؤقّت كذلك — يرقّم ويكتب ويُشعِر في موضع واحد، فلا يتكرّر النمط
-- ثماني عشرة مرّة ولا يُنسى أحد فرعيه.
create or replace function pg_temp.rec(p_ok boolean, p_label text, p_detail text default null)
returns void language plpgsql as $rec$
declare n int;
begin
  select coalesce(max(ord), 0) + 1 into n from pg_temp.qimmah_smoke_results;
  insert into pg_temp.qimmah_smoke_results (ord, ok, label, detail)
  values (n, p_ok, p_label, p_detail);
  raise notice '  % %', case when p_ok then '✓' else '✗' end,
    p_label || coalesce(' — ' || p_detail, '');
end
$rec$;

do $qimmah_smoke$
declare
  prod_ref constant text := 'ledlypcyrtnzvjvhykwz';
  uid_a  uuid;
  uid_b  uuid;
  uid_c  uuid;
  founder uuid;
  r       text;
  j       jsonb;
  code    text;
  exp     timestamptz;
  hours   numeric;
begin
  -- ── حارس: لا يُشغَّل على الإنتاج ────────────────────────────────────────
  -- ⚠️ **الحارس لا يعرف على أي مشروع هو.** مرجعُ Supabase ليس متاحًا للجلسة،
  --    و`current_database()` هو `postgres` في كل مشروع — فلا يميّز شيئًا.
  --    فالعلامة الوحيدة الصادقة هنا **بيانات حقيقية**: الإنتاج فيه حسابات،
  --    وstaging قبل التشغيل فارغ. وجود أي مستخدم غير اختباري ⇒ توقّف.
  --
  -- وثمنه معلَن: **لا يعمل بعد أوّل تسجيل** — ولو على staging. وهذا الاتجاه
  -- هو الصحيح: أن يمتنع عن قاعدة آمنة أهون من أن يعمل على قاعدة ليست كذلك.
  if (select count(*) from auth.users where email not like '%@qimmah-smoke.test') > 0 then
    raise exception
      'refusing_on_populated_database: توجد حسابات حقيقية — هذا الفحص لـstaging نظيف وحده. (%)',
      prod_ref;
  end if;

  raise notice '';
  raise notice '══ فحص سلوكي على staging ══';

  -- ═══ ① التجربة الحقيقية — ٧٢ ساعة، مرّة واحدة ═══════════════════════════
  insert into auth.users (id, email, email_confirmed_at)
  values (gen_random_uuid(), 'a@qimmah-smoke.test', now()) returning id into uid_a;
  perform set_config('request.jwt.claim.sub', uid_a::text, false);

  r := public.start_trial();
  perform pg_temp.rec(r = 'trialActive', 'التجربة تُمنح', r);

  select expires_at into exp from public.entitlements where user_id = uid_a;
  hours := round(extract(epoch from (exp - now())) / 3600.0);
  perform pg_temp.rec(hours = 72, 'ومدّتها ٧٢ ساعة بالضبط', hours || ' ساعة');

  begin
    r := public.start_trial();
    perform pg_temp.rec(false, 'تجربة ثانية مُنحت — الثقب مفتوح', r);
  exception when others then
    perform pg_temp.rec(sqlerrm like '%trial_already_used%',
      'وتجربة ثانية تُرفض', split_part(sqlerrm, E'\n', 1));
  end;

  -- ═══ ② حارس الأسماء المستعارة — الثقب الذي أُغلق ═══════════════════════
  insert into auth.users (id, email, email_confirmed_at)
  values (gen_random_uuid(), 'a+farm@qimmah-smoke.test', now()) returning id into uid_b;
  perform set_config('request.jwt.claim.sub', uid_b::text, false);
  begin
    r := public.start_trial();
    perform pg_temp.rec(false, 'وسم «+» فتح تجربة ثانية', r);
  exception when others then
    perform pg_temp.rec(sqlerrm like '%trial_already_used%',
      'ووسم «+» لا يفتح تجربة ثانية', split_part(sqlerrm, E'\n', 1));
  end;

  -- ═══ ③ كود التفعيل — يُصدَر ويُستبدَل ═══════════════════════════════════
  insert into auth.users (id, email, email_confirmed_at)
  values (gen_random_uuid(), 'founder@qimmah-smoke.test', now()) returning id into founder;
  perform public.admin_set_role('founder@qimmah-smoke.test', 'founder', 'smoke test');
  perform set_config('request.jwt.claim.sub', founder::text, false);

  j := public.founder_issue_access_code('فحص سلوكي', 'SMOKE', 14, 1);
  code := j ->> 'code';
  perform pg_temp.rec(code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{16}$',
    'الكود يُصدَر بستّة عشر رمزًا — ٨٠ بتًا', length(code) || ' رمزًا');

  begin
    j := public.founder_issue_access_code('حملة', 'RAMADAN', 14, 500, null, 'RAMADAN2345');
    perform pg_temp.rec(false, 'كودٌ مقروء قُبِل — الثقب مفتوح', j::text);
  exception when others then
    perform pg_temp.rec(sqlerrm like '%code_must_be_generated%',
      'وكودٌ مقروء يكتبه المؤسس يُرفض — الحملة اسمٌ لا سرّ',
      split_part(sqlerrm, ':', 1));
  end;

  insert into auth.users (id, email, email_confirmed_at)
  values (gen_random_uuid(), 'c@qimmah-smoke.test', now()) returning id into uid_c;
  perform set_config('request.jwt.claim.sub', uid_c::text, false);
  j := public.redeem_access_code_v2(code);
  perform pg_temp.rec(j ->> 'outcome' = 'specialAccessActive',
    'ويُستبدَل فيُفتح الوصول', j ->> 'outcome');

  j := public.redeem_access_code_v2(code);
  perform pg_temp.rec(
    j ->> 'reason' like '%code_already_redeemed%' or j ->> 'reason' like '%invalid_code%',
    'وإعادته تُرفض', coalesce(j ->> 'reason', j::text));

  -- ═══ ④ حدّ المعدّل — يُطلق فعلًا ═════════════════════════════════════════
  declare limited boolean := false; tries int := 0;
  begin
    for i in 1..12 loop
      tries := i;
      j := public.redeem_access_code_v2('BOGUSCODE' || lpad(i::text, 3, 'A'));
      if j ->> 'outcome' = 'rate_limited' then limited := true; exit; end if;
    end loop;
    perform pg_temp.rec(limited, 'وحدّ المعدّل يُطلق',
      'بعد ' || tries || ' محاولة');
  end;

  -- ═══ التنظيف — لا أثر يلتبس ببيانات المؤسس ═════════════════════════════
  perform set_config('request.jwt.claim.sub', '', false);
  delete from public.entitlements where user_id in (uid_a, uid_b, uid_c, founder);
  delete from auth.users where email like '%@qimmah-smoke.test';
  -- ⚠️ سجلّ التجربة **لا يُحذف بالمعرّف**: هو بلا `user_id` عمدًا (ينجو من حذف
  --    الحساب). فيُحذف ببصمته كي لا يمنع المؤسس من تجربته الحقيقية بعد قليل.
  delete from public.trial_ledger t
   where exists (select 1 from private.identity_hashes('a@qimmah-smoke.test') ih
                  where ih.email_hash = t.email_hash);
  -- ⚠️ **الترتيب يتبع المفاتيح الأجنبية.** حذف `access_codes` أوّلًا يسقط بـ
  --    `code_redemption_ledger_code_id_fkey` — والقيد محقّ: سجلّ الاستهلاك
  --    أثرٌ تجاري لا يُترك يتيمًا. فتُحذف الأبناء ثم الأب.
  delete from public.code_redemption_ledger l
   using public.access_codes c
   where c.id = l.code_id and c.label in ('SMOKE', 'RAMADAN');
  delete from public.access_code_redemptions r
   using public.access_codes c
   where c.id = r.code_id and c.label in ('SMOKE', 'RAMADAN');
  delete from public.access_codes where label in ('SMOKE', 'RAMADAN');
  -- ودفتر محاولات الاسترداد كذلك — وإلا بقي حدّ المعدّل مشتعلًا على بصمة
  -- بريدٍ حذفناه، فيصطدم به المؤسس بلا سبب ظاهر.
  delete from private.redeem_attempts a
   where exists (select 1 from private.identity_hashes('c@qimmah-smoke.test') ih
                  where ih.email_hash = a.email_hash);

  raise notice '';
end
$qimmah_smoke$;

-- ═══════════════════════════════════════════════════════════════════════════
-- الحكم — **عبارةٌ أخيرة تُعيد صفًّا**، فتحمله كل قناة تُعيد صفوفًا.
-- ═══════════════════════════════════════════════════════════════════════════
-- `verdict` يقول PASS أو FAIL صراحةً: قارئٌ آليّ لا يحتاج أن يعدّ بنفسه،
-- وقارئٌ بشريّ لا يحتاج أن يستنتج. و`checks` تحمل التسعة بأسمائها فيُعرَف
-- **أيّها** سقط لا أنّ واحدًا سقط.
select
  case when (select count(*) from qimmah_smoke_results where not ok) = 0
       then 'PASS' else 'FAIL' end                                        as verdict,
  (select count(*) from qimmah_smoke_results where ok)                    as passed,
  (select count(*) from qimmah_smoke_results where not ok)                as failed,
  (select count(*) from auth.users where email like '%@qimmah-smoke.test') as leftover_users,
  (select count(*) from public.access_codes where label in ('SMOKE','RAMADAN')) as leftover_codes,
  (select count(*) from auth.users)                                       as total_users,
  (select jsonb_agg(jsonb_build_object('n', ord, 'ok', ok, 'check', label, 'detail', detail)
                    order by ord)
     from qimmah_smoke_results)                                           as checks;

-- المتوقَّع: verdict = PASS · passed = 9 · failed = 0
--            leftover_users = 0 · leftover_codes = 0 · total_users = 0
