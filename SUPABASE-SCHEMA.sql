-- ============================================================================
-- Qimmah — Supabase Schema (cloud persistence)
-- ============================================================================
-- شغّل هذا الملف يدويًا في Supabase SQL Editor عند تفعيل المزامنة السحابية.
-- التطبيق لا يشغّل أي migration تلقائيًا — هذا الملف توثيقي/إعدادي فقط.
-- الملف idempotent (create ... if not exists / or replace / drop policy if exists)،
-- فآمن لإعادة التشغيل، وآمن فوق تنصيب سابق.
--
-- المبادئ:
--   * كل جدول مربوط بـ auth.users(id) عبر user_id مع ON DELETE CASCADE.
--   * RLS مفعّل على كل الجداول؛ كل مستخدم يرى/يعدّل/يحذف صفوفه فقط.
--   * created_at / updated_at لكل صف، مع trigger يحدّث updated_at تلقائيًا.
--   * المعرّفات uuid، والبيانات المرنة تُخزّن كـ jsonb لمرونة المخطط المحلي.
--
-- ----------------------------------------------------------------------------
-- قرار v1 لحالة الجداول (Phase 1 — backend real/safe/verifiable):
-- ----------------------------------------------------------------------------
--   ACTIVE (٥) — يكتب/يقرأ منها العميل فعليًا (syncService/onboardingSync)،
--   وهي وحدها ما يُنشئه هذا الملف:
--     profiles · workout_sessions · exercise_history · measurement_logs · daily_logs
--
--   DEFERRED (٦) — مُصمّمة لكنها غير موصولة بالعميل بعد. بياناتها اليوم تعيش داخل
--   jsonb على الجداول النشطة (sets داخل workout_sessions.data؛ التغذية/الماء/المكملات/
--   الأدوية مؤجّلة لطيّها في daily_logs.data ضمن Phase 2)، أو ميزة مستقبلية
--   (progress_photos + Storage). لتفادي جداول فارغة بلا استخدام (سطح زائد + إرباك)،
--   لا يُنشئها هذا الملف. تعريفاتها الكاملة (DDL + RLS + trigger) محفوظة في الملحق
--   أسفل الملف؛ فعّلها يوم يُوصَل العميل بها.
--
--   قرار السلامة: لا DROP لأي جدول مستخدم هنا. إسقاط جدول بيانات مستخدم عملية
--   منفصلة ومقصودة بعد مراجعة البيانات — لا تُؤتمت. إن كان تنصيب سابق قد أنشأ
--   الجداول المؤجّلة فهي تبقى محميّة بـ RLS من النسخة السابقة، وحذف الحساب
--   يغطّيها تلقائيًا عبر ON DELETE CASCADE.
-- ============================================================================

-- امتداد توليد uuid (مفعّل افتراضيًا في Supabase، نتركه للأمان).
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- دالة مشتركة لتحديث updated_at عند كل UPDATE.
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- ACTIVE 1) profiles — ملف المستخدم (مرتبط 1:1 بحساب auth).
-- ============================================================================
create table if not exists public.profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  display_name text,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id)
);

-- ============================================================================
-- ACTIVE 2) workout_sessions — جلسة تمرين (تشمل exercises + sets داخل data jsonb).
-- ============================================================================
create table if not exists public.workout_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  local_id        text,
  date            date not null,
  started_at      timestamptz,
  finished_at     timestamptz,
  workout_day_id  text,
  workout_day_name text,
  data            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, local_id)
);
create index if not exists workout_sessions_user_date_idx
  on public.workout_sessions (user_id, date desc);

-- ============================================================================
-- ACTIVE 3) exercise_history — آخر/أفضل أداء لكل تمرين (سجل تجميعي).
-- ============================================================================
create table if not exists public.exercise_history (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  exercise_id  text not null,
  data         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, exercise_id)
);

-- ============================================================================
-- ACTIVE 4) measurement_logs — سجلّات القياسات الجسدية.
-- ============================================================================
create table if not exists public.measurement_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  local_id    text,
  date        date not null,
  values      jsonb not null default '{}'::jsonb,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, local_id)
);
create index if not exists measurement_logs_user_date_idx
  on public.measurement_logs (user_id, date desc);

-- ============================================================================
-- ACTIVE 5) daily_logs — لقطة يومية مجمّعة (اليوم/الالتزامات/إكمال التمرين،
--            ولاحقًا التغذية/الماء/المكملات/الأدوية عبر data jsonb — Phase 2).
-- ============================================================================
create table if not exists public.daily_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists daily_logs_user_date_idx
  on public.daily_logs (user_id, date desc);

-- ============================================================================
-- triggers: تحديث updated_at تلقائيًا للجداول النشطة.
-- ============================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','workout_sessions','exercise_history','measurement_logs','daily_logs'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t);
  end loop;
end;
$$;

-- ============================================================================
-- Row Level Security + سياسات «الصفوف الخاصة بي فقط» للجداول النشطة.
-- ============================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','workout_sessions','exercise_history','measurement_logs','daily_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists "%1$s_select_own" on public.%1$s;', t);
    execute format(
      'create policy "%1$s_select_own" on public.%1$s
         for select using (auth.uid() = user_id);', t);

    execute format('drop policy if exists "%1$s_insert_own" on public.%1$s;', t);
    execute format(
      'create policy "%1$s_insert_own" on public.%1$s
         for insert with check (auth.uid() = user_id);', t);

    execute format('drop policy if exists "%1$s_update_own" on public.%1$s;', t);
    execute format(
      'create policy "%1$s_update_own" on public.%1$s
         for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);

    execute format('drop policy if exists "%1$s_delete_own" on public.%1$s;', t);
    execute format(
      'create policy "%1$s_delete_own" on public.%1$s
         for delete using (auth.uid() = user_id);', t);
  end loop;
end;
$$;

-- ============================================================================
-- إنشاء صفّ profile تلقائيًا عند تسجيل مستخدم جديد.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- حذف الحساب ذاتيًا (App Store 5.1.1(v)) — يستدعيه العميل عبر
--   supabase.rpc('delete_own_account')  (src/lib/authContext.tsx).
--
-- الأمان:
--   * SECURITY DEFINER: يعمل بصلاحية مالك الدالة (يحذف من auth.users). أنشئها في
--     SQL Editor حتى يكون المالك دورًا يملك هذا الحق.
--   * الهدف دائمًا auth.uid() من التوكن — بلا معاملات ولا SQL ديناميكي، فلا يمكن
--     توجيهها لمستخدم آخر.
--   * set search_path = '' يحصّن ضد حقن مسار البحث.
--   * revoke from anon/public — لا تُستدعى إلا من مستخدم مسجّل.
--   * حذف صفّ auth.users يُسقط تلقائيًا كل صفوف المستخدم في كل الجداول (النشطة
--     والمؤجّلة إن وُجدت) عبر ON DELETE CASCADE — حذف ذرّي شامل بلا تعداد جداول.
--   * لا service_role key في العميل إطلاقًا.
-- ============================================================================
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  -- كل public.* المملوكة للمستخدم ترجع إلى auth.users(id) ON DELETE CASCADE.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

-- ============================================================================
-- ============================================================================
-- ⛔ DEFERRED APPENDIX — لا يُنشَأ في v1. مصمَّم ومحفوظ فقط.
-- ============================================================================
-- الجداول أدناه غير موصولة بالعميل بعد. لا تُنفّذ هذا القسم إلا يوم يُوصَل
-- العميل بها (Phase 2+). عند التفعيل: أزل التعليق، ثم أضِف كلًّا منها إلى
-- مصفوفتي trigger و RLS أعلاه (أو كرّر نفس الأنماط لها). كلها ترجع إلى
-- auth.users(id) ON DELETE CASCADE فيغطّيها delete_own_account تلقائيًا.
--
-- سبب التأجيل لكلٍّ:
--   workout_sets     → التفاصيل موجودة أصلًا داخل workout_sessions.data (تطبيع مبكّر).
--   nutrition_logs   → تُطوى في daily_logs.data (Phase 2) بدل جدول يومي رابع.
--   water_logs       → تُطوى في daily_logs.data.
--   supplement_logs  → تُطوى في daily_logs.data.
--   medication_logs  → تُطوى في daily_logs.data.
--   progress_photos  → ميزة مستقبلية؛ تحتاج Storage bucket + سياسات (غير مبنية بعد).
-- ----------------------------------------------------------------------------
/*
create table if not exists public.workout_sets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  session_id   uuid references public.workout_sessions(id) on delete cascade,
  exercise_id  text not null,
  set_number   int,
  target_reps  text,
  actual_reps  text,
  weight_kg    text,
  completed    boolean default false,
  rpe          numeric,
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists workout_sets_user_exercise_idx
  on public.workout_sets (user_id, exercise_id);

create table if not exists public.nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists nutrition_logs_user_date_idx on public.nutrition_logs (user_id, date desc);

create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  water_ml int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists water_logs_user_date_idx on public.water_logs (user_id, date desc);

create table if not exists public.supplement_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists supplement_logs_user_date_idx on public.supplement_logs (user_id, date desc);

create table if not exists public.medication_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists medication_logs_user_date_idx on public.medication_logs (user_id, date desc);

create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  storage_path text,
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists progress_photos_user_date_idx on public.progress_photos (user_id, date desc);

-- Storage bucket لصور التقدّم (أنشئه من لوحة Storage عند بناء الميزة):
--   bucket: progress-photos (private) — سياسة: المستخدم يصل ملفاته فقط تحت user_id/...
*/
