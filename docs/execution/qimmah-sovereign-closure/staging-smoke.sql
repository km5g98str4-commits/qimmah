-- ═══════════════════════════════════════════════════════════════════════════
-- قِمّة — فحص سلوكي على staging الحقيقي
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ **لا يُشغَّل إلا على staging.** يُنشئ مستخدمي اختبار ويحذفهم بعده.
--    والحارس أدناه يرفض العمل على مشروع الإنتاج.
--
-- ═══ لماذا هذا الملف بعد صفّ التحقّق ═══
-- صفّ التحقّق قال إن ٢٧ جدولًا عليها RLS و٦ دوالّ ممنوحة — وهذا يُثبت أن
-- **البنية موجودة**، لا أنها **تعمل**. والفرق بينهما هو الفرق بين مخطَّطٍ
-- مطبَّق ومنتجٍ يشتغل: دالّةٌ موجودة قد ترفع عند أول نداء حقيقي، وسياسةُ RLS
-- قد تمنع ما يجب أن تسمح به.
--
-- فهذا يمرّ على **الرحلات التجارية الأربع** كما يمرّ عليها مستخدم حقيقي:
--   ① تجربة ٧٢ ساعة — تُمنح، ومرّة واحدة
--   ② حارس الأسماء المستعارة (`+tag`) — الثقب الذي أُغلق
--   ③ كود تفعيل — يُصدَر ويُستبدَل
--   ④ حدّ المعدّل — يُطلق فعلًا
--
-- ويُنظّف نفسه في آخره، فلا يترك أثرًا يلتبس ببيانات المؤسس.
--
-- ✅ **وإعادة اللصق آمنة** — مقيسٌ لا مفترَض: تشغيلتان متتاليتان على نفس
--    القاعدة تُعطيان «٩ نجحت · ٠ فشل» كلتاهما. وذلك لأن التنظيف يمحو ما يمنع
--    الثانية: سجلّ التجربة (وهو بلا `user_id` عمدًا فينجو من حذف الحساب)
--    ودفتر محاولات الاسترداد. فمن ارتبك في المنتصف يعيد بلا خوف.
--
-- ═══ وهُوجم قبل أن يُسلَّم (§4.2) ═══
-- بوابةٌ لم تُهاجَم ليست بوابة. فجُرِّب عليها التفافان، وسقط كلاهما **باسمه**:
--
--   ⚔️ **حارس الإنتاج:** أُدرج حسابٌ حقيقي (`ziyad@qimmah.app`) في قاعدة نظيفة،
--      فتوقّف الملفّ قبل أن يكتب حرفًا واحدًا:
--      `ERROR: refusing_on_populated_database: توجد حسابات حقيقية`.
--
--   ⚔️ **حارس §8:** نُزع شرط `code_must_be_generated` من `private.issue_code_core`
--      وأُعيد تعريفها لتقبل الكود الحرفي — فانقلب الفحص فورًا إلى
--      `✗ كودٌ مقروء قُبِل — الثقب مفتوح` و«٨ نجحت · ١ فشلت».
--      أي أن هذا السطر **يقيس الحارس**، لا يزيّن التقرير بنجاحٍ مضمون.
--
-- ⚠️ **ولا يُنشئ كلمة مرور لأحد ولا يرسلها** — يُدرج مستخدمي اختبار مباشرةً
--    في `auth.users` ثم يحذفهم. لا تسجيل دخول ولا بريد.
-- ═══════════════════════════════════════════════════════════════════════════

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
  ok      int := 0;
  bad     int := 0;
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
  if r = 'trialActive' then ok := ok + 1; raise notice '  ✓ التجربة تُمنح — %', r;
  else bad := bad + 1; raise notice '  ✗ التجربة لم تُمنح — %', r; end if;

  select expires_at into exp from public.entitlements where user_id = uid_a;
  hours := round(extract(epoch from (exp - now())) / 3600.0);
  if hours = 72 then ok := ok + 1; raise notice '  ✓ ومدّتها ٧٢ ساعة بالضبط — % ساعة', hours;
  else bad := bad + 1; raise notice '  ✗ المدّة ليست ٧٢ — % ساعة', hours; end if;

  begin
    r := public.start_trial();
    bad := bad + 1; raise notice '  ✗ تجربة ثانية مُنحت — %', r;
  exception when others then
    if sqlerrm like '%trial_already_used%' then
      ok := ok + 1; raise notice '  ✓ وتجربة ثانية تُرفض — trial_already_used';
    else bad := bad + 1; raise notice '  ✗ رُفضت بسبب آخر — %', sqlerrm; end if;
  end;

  -- ═══ ② حارس الأسماء المستعارة — الثقب الذي أُغلق ═══════════════════════
  insert into auth.users (id, email, email_confirmed_at)
  values (gen_random_uuid(), 'a+farm@qimmah-smoke.test', now()) returning id into uid_b;
  perform set_config('request.jwt.claim.sub', uid_b::text, false);
  begin
    r := public.start_trial();
    bad := bad + 1; raise notice '  ✗ وسم «+» فتح تجربة ثانية — %', r;
  exception when others then
    if sqlerrm like '%trial_already_used%' then
      ok := ok + 1; raise notice '  ✓ ووسم «+» لا يفتح تجربة ثانية';
    else bad := bad + 1; raise notice '  ✗ رُفض بسبب آخر — %', sqlerrm; end if;
  end;

  -- ═══ ③ كود التفعيل — يُصدَر ويُستبدَل ═══════════════════════════════════
  insert into auth.users (id, email, email_confirmed_at)
  values (gen_random_uuid(), 'founder@qimmah-smoke.test', now()) returning id into founder;
  perform public.admin_set_role('founder@qimmah-smoke.test', 'founder', 'smoke test');
  perform set_config('request.jwt.claim.sub', founder::text, false);

  j := public.founder_issue_access_code('فحص سلوكي', 'SMOKE', 14, 1);
  code := j ->> 'code';
  if code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{16}$' then
    ok := ok + 1; raise notice '  ✓ الكود يُصدَر بستّة عشر رمزًا — ٨٠ بتًا';
  else bad := bad + 1; raise notice '  ✗ شكل الكود غير متوقّع — %', code; end if;

  begin
    j := public.founder_issue_access_code('حملة', 'RAMADAN', 14, 500, null, 'RAMADAN2345');
    bad := bad + 1; raise notice '  ✗ كودٌ مقروء قُبِل — الثقب مفتوح';
  exception when others then
    if sqlerrm like '%code_must_be_generated%' then
      ok := ok + 1; raise notice '  ✓ وكودٌ مقروء يكتبه المؤسس يُرفض — الحملة اسمٌ لا سرّ';
    else bad := bad + 1; raise notice '  ✗ رُفض بسبب آخر — %', sqlerrm; end if;
  end;

  insert into auth.users (id, email, email_confirmed_at)
  values (gen_random_uuid(), 'c@qimmah-smoke.test', now()) returning id into uid_c;
  perform set_config('request.jwt.claim.sub', uid_c::text, false);
  j := public.redeem_access_code_v2(code);
  if j ->> 'outcome' = 'specialAccessActive' then
    ok := ok + 1; raise notice '  ✓ ويُستبدَل فيُفتح الوصول — %', j ->> 'outcome';
  else bad := bad + 1; raise notice '  ✗ الاستبدال لم ينجح — %', j::text; end if;

  j := public.redeem_access_code_v2(code);
  if j ->> 'reason' like '%code_already_redeemed%' or j ->> 'reason' like '%invalid_code%' then
    ok := ok + 1; raise notice '  ✓ وإعادته تُرفض — %', j ->> 'reason';
  else bad := bad + 1; raise notice '  ✗ إعادته لم تُرفض — %', j::text; end if;

  -- ═══ ④ حدّ المعدّل — يُطلق فعلًا ═════════════════════════════════════════
  declare limited boolean := false;
  begin
    for i in 1..12 loop
      j := public.redeem_access_code_v2('BOGUSCODE' || lpad(i::text, 3, 'A'));
      if j ->> 'outcome' = 'rate_limited' then limited := true; exit; end if;
    end loop;
    if limited then ok := ok + 1; raise notice '  ✓ وحدّ المعدّل يُطلق بعد العاشرة';
    else bad := bad + 1; raise notice '  ✗ حدّ المعدّل لم يُطلق في اثنتي عشرة محاولة'; end if;
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
  if bad = 0 then
    raise notice '✅ الفحص السلوكي: % نجحت · ٠ فشل — على staging حقيقي', ok;
  else
    raise notice '❌ الفحص السلوكي: % نجحت · % فشلت', ok, bad;
  end if;
  raise notice '';
end
$qimmah_smoke$;

-- ── وبعد التنظيف: لا أثر باقٍ ─────────────────────────────────────────────
select
  (select count(*) from auth.users where email like '%@qimmah-smoke.test') as leftover_users,
  (select count(*) from public.access_codes where label in ('SMOKE','RAMADAN')) as leftover_codes,
  (select count(*) from auth.users) as total_users;
-- المتوقَّع: leftover_users = 0 · leftover_codes = 0 · total_users = 0
