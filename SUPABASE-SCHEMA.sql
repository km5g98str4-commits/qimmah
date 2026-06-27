-- ============================================================================
-- Qimmah — Supabase Schema (cloud persistence)
-- ============================================================================
-- شغّل هذا الملف يدويًا في Supabase SQL Editor عند تفعيل المزامنة السحابية.
-- التطبيق لا يشغّل أي migration تلقائيًا — هذا الملف توثيقي/إعدادي فقط.
--
-- المبادئ:
--   * كل جدول مربوط بـ auth.users(id) عبر user_id.
--   * RLS مفعّل على كل الجداول؛ كل مستخدم يرى/يعدّل صفوفه فقط.
--   * created_at / updated_at لكل صف، مع trigger يحدّث updated_at تلقائيًا.
--   * المعرّفات uuid، والبيانات المرنة تُخزّن كـ jsonb لمرونة المخطط المحلي.
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
-- 1) profiles — ملف المستخدم (مرتبط 1:1 بحساب auth).
-- ============================================================================
create table if not exists public.profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  display_name text,
  -- نسخة التخصيص/الإعداد الكاملة (customization) كـ jsonb للمرونة.
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id)
);

-- ============================================================================
-- 2) workout_sessions — جلسة تمرين واحدة (رأس الجلسة).
-- ============================================================================
create table if not exists public.workout_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  -- المعرّف المحلي (client id) لمطابقة المزامنة محلي↔سحابي.
  local_id        text,
  date            date not null,
  started_at      timestamptz,
  finished_at     timestamptz,
  workout_day_id  text,
  workout_day_name text,
  -- نسخة كاملة من الجلسة (exercises + sets) كـ jsonb لتجنّب فقد أي حقل.
  data            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, local_id)
);
create index if not exists workout_sessions_user_date_idx
  on public.workout_sessions (user_id, date desc);

-- ============================================================================
-- 3) workout_sets — مجموعة واحدة داخل تمرين (تفصيلي، اختياري للتحليلات).
-- ============================================================================
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

-- ============================================================================
-- 4) exercise_history — آخر/أفضل أداء لكل تمرين (سجل تجميعي).
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
-- 5) daily_logs — لقطة يومية (تغذية/ماء/مكملات/أدوية/التزامات منجزة).
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
-- 6) measurement_logs — سجلّات القياسات الجسدية.
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
-- 7) progress_photos — صور التقدّم (يخزَّن مسار/رابط Storage فقط، لا الصورة).
-- ============================================================================
create table if not exists public.progress_photos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  storage_path text,
  caption     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists progress_photos_user_date_idx
  on public.progress_photos (user_id, date desc);

-- ============================================================================
-- 8) nutrition_logs — سجلّ تغذية يومي (وجبات/سعرات).
-- ============================================================================
create table if not exists public.nutrition_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists nutrition_logs_user_date_idx
  on public.nutrition_logs (user_id, date desc);

-- ============================================================================
-- 9) water_logs — سجلّ شرب الماء اليومي (مل).
-- ============================================================================
create table if not exists public.water_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  water_ml    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists water_logs_user_date_idx
  on public.water_logs (user_id, date desc);

-- ============================================================================
-- 10) supplement_logs — سجلّ المكملات اليومي.
-- ============================================================================
create table if not exists public.supplement_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists supplement_logs_user_date_idx
  on public.supplement_logs (user_id, date desc);

-- ============================================================================
-- 11) medication_logs — سجلّ الأدوية اليومي.
-- ============================================================================
create table if not exists public.medication_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists medication_logs_user_date_idx
  on public.medication_logs (user_id, date desc);

-- ============================================================================
-- triggers: تحديث updated_at تلقائيًا لكل الجداول التي تملك العمود.
-- ============================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','workout_sessions','exercise_history','daily_logs',
    'measurement_logs','progress_photos','nutrition_logs','water_logs',
    'supplement_logs','medication_logs'
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
-- Row Level Security + سياسات «الصفوف الخاصة بي فقط».
-- ============================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','workout_sessions','workout_sets','exercise_history','daily_logs',
    'measurement_logs','progress_photos','nutrition_logs','water_logs',
    'supplement_logs','medication_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);

    -- SELECT
    execute format('drop policy if exists "%1$s_select_own" on public.%1$s;', t);
    execute format(
      'create policy "%1$s_select_own" on public.%1$s
         for select using (auth.uid() = user_id);', t);

    -- INSERT
    execute format('drop policy if exists "%1$s_insert_own" on public.%1$s;', t);
    execute format(
      'create policy "%1$s_insert_own" on public.%1$s
         for insert with check (auth.uid() = user_id);', t);

    -- UPDATE
    execute format('drop policy if exists "%1$s_update_own" on public.%1$s;', t);
    execute format(
      'create policy "%1$s_update_own" on public.%1$s
         for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);

    -- DELETE
    execute format('drop policy if exists "%1$s_delete_own" on public.%1$s;', t);
    execute format(
      'create policy "%1$s_delete_own" on public.%1$s
         for delete using (auth.uid() = user_id);', t);
  end loop;
end;
$$;

-- ============================================================================
-- (اختياري) إنشاء صفّ profile تلقائيًا عند تسجيل مستخدم جديد.
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
-- (اختياري) Storage bucket لصور التقدّم — أنشئه من لوحة Storage ثم طبّق سياسات:
--   bucket: progress-photos (private)
--   policy: المستخدم يصل لملفاته فقط تحت مجلد user_id/...
-- ============================================================================
