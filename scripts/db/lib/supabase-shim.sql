-- ============================================================================
-- تهيئة مشروع Supabase على قاعدة Postgres حقيقية — [COMMISSIONING]
-- ============================================================================
-- نسخة مطابقة بالمعنى لِما يفعله `scripts/db/lib/supabase-sandbox.mjs` داخل
-- PGlite، لكنها تعمل على **عنقود Postgres حقيقي متعدّد الاتصالات**. والفرق
-- ليس ترفًا: PGlite اتصالٌ واحد، فيستحيل فيها إثبات ما يحتاج **تسابقًا فعليًا**
-- (قفل صفّ · استهلاك كود مرّتين في آنٍ واحد · تحديث متزامن). وهذا بالضبط ما
-- يطلبه بند «التزامن يخصّ الخادم».
--
-- ⚠️ الامتيازات الافتراضية أدناه ليست تساهلًا بل **محاكاة أمينة**: مشروع
-- Supabase الحقيقي يمنح anon/authenticated كل شيء على `public` افتراضيًا،
-- فأي صندوق لا يفعل ذلك يجعل كل فحص «ممنوع» ينجح مجّانًا (§4.2).
create extension if not exists pgcrypto;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

create schema if not exists auth;
-- الأعمدة هنا هي **ما تلمسه الهجرات فعلًا**، لا نسخة كاملة من Supabase.
-- و`raw_app_meta_data` ليست تفصيلًا: الدور يعيش فيها لأنها **بيانات تطبيق
-- يملكها الخادم**، بينما `raw_user_meta_data` يعدّلها المستخدم من متصفّحه.
-- فصندوقٌ بلا العمودين معًا لا يستطيع إثبات أن الدور لا يُزوَّر من المتصفّح.
create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique,
  email_confirmed_at timestamptz,
  created_at         timestamptz not null default now(),
  last_sign_in_at    timestamptz,
  raw_user_meta_data jsonb default '{}'::jsonb,
  raw_app_meta_data  jsonb default '{}'::jsonb
);

-- الهوية تُقرأ من مطالبة الـJWT كما في Supabase — لا من متغيّر جلسة خاصّ بنا.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to authenticated, service_role;
