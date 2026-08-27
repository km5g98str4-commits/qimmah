-- ============================================================================
-- [COMMISSIONING · RED-TEAM F-4-LOW] تطبيع النقطة اللاحقة في النطاق
-- ============================================================================
-- كشف الهجوم العدائي ثغرة تطبيع منخفضة: `foo@gmail.com.` (نقطة لاحقة في
-- النطاق) يُنتج بصمة قانونية **مختلفة** عن `foo@gmail.com`، فيفتح تجربة ٧٢
-- ساعة ثانية للصندوق نفسه. والأمر ليس خاصًّا بجيميل: `a@x.com.` كذلك يخالف
-- `a@x.com`. مقيس قبل الإصلاح على عنقود حقيقي:
--   canonical_identity('foo@gmail.com.') = 'foo@gmail.com.'  ≠  'foo@gmail.com'
--
-- ═══ لماذا آمن بنيويًّا ═══
-- النقطة اللاحقة لا تميّز وجهتين حقيقيّتين: DNS يساوي `x.com` و`x.com.` (الأخيرة
-- اسم مؤهَّل كاملًا ينتهي بالجذر). فقصّها **لا يدمج** بريدين مختلفين، بل يمنع
-- تشظّي الصندوق الواحد إلى بصمتين. والتعديل الوحيد: `rtrim(النطاق, '.')` في
-- موضعَي النطاق (فحص جيميل وإعادة التركيب) — وما عداه يبقى حرفيًّا كما كان.
--
-- ═══ لماذا هجرة منفصلة لا تعديلٌ للسابقة ═══
-- الهجرة السابقة (20260824120004) مسجَّلة/مُطبَّقة، فتعديلها يكسر حتمية
-- التطبيق. الصيغة المعتمدة: إعادة تعريف كاملة الجسد في هجرة جديدة، فتصير هي
-- آخر مُعرِّف (يقارنه test:migration-order بالجسد الحيّ).
-- ============================================================================

create or replace function private.canonical_identity(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  -- النطاق مُطبَّعًا: النقطة اللاحقة تُقصّ (نفس الوجهة في DNS)، فلا تفتح تجربة ثانية.
  select case
    when p_email is null or btrim(p_email) = '' then null
    when position('@' in lower(btrim(p_email))) = 0 then lower(btrim(p_email))
    when rtrim(split_part(lower(btrim(p_email)), '@', 2), '.') in ('gmail.com', 'googlemail.com')
      then replace(split_part(split_part(lower(btrim(p_email)), '@', 1), '+', 1), '.', '')
           || '@gmail.com'
    else split_part(split_part(lower(btrim(p_email)), '@', 1), '+', 1)
         || '@' || rtrim(split_part(lower(btrim(p_email)), '@', 2), '.')
  end;
$$;

comment on function private.canonical_identity(text) is
  'بصمة الهوية القانونية: تطبيع جيميل (نقاط/وسم +) والوسم + عمومًا وقصّ النقطة اللاحقة في النطاق. تجربة واحدة لكل صندوق. [F-4-LOW: النقطة اللاحقة].';
