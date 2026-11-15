-- CareerConnect India: initial Supabase schema
-- Review and run in a NEW Supabase project. This schema is a starting point,
-- not a substitute for a security review before collecting real candidate data.

create extension if not exists pgcrypto;

create type public.account_role as enum ('candidate', 'employer', 'moderator', 'admin');
create type public.job_status as enum ('draft', 'pending', 'approved', 'rejected', 'expired', 'suspended');
create type public.application_status as enum ('submitted', 'viewed', 'shortlisted', 'rejected', 'withdrawn');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  city text,
  state text,
  role public.account_role not null default 'candidate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.employers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  organisation_name text not null,
  website text,
  industry text,
  description text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  created_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  opportunity_type text not null check (opportunity_type in ('full_time', 'part_time', 'internship', 'contract', 'apprenticeship')),
  experience_level text,
  location_city text,
  location_state text,
  work_mode text not null default 'onsite' check (work_mode in ('onsite', 'hybrid', 'remote')),
  salary_min numeric,
  salary_max numeric,
  salary_period text,
  skills text[] not null default '{}',
  eligibility text,
  application_url text,
  application_deadline date,
  status public.job_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.candidate_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  headline text,
  education text,
  discipline text,
  graduation_year integer,
  skills text[] not null default '{}',
  resume_storage_path text,
  resume_sharing_consent boolean not null default false,
  profile_visibility text not null default 'private'
    check (profile_visibility in ('private', 'employer_visible')),
  updated_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  status public.application_status not null default 'submitted',
  cover_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_id, candidate_id)
);

create table public.job_reports (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index jobs_public_search_idx on public.jobs(status, category, opportunity_type, created_at desc);
create index jobs_location_idx on public.jobs(location_state, location_city);
create index applications_candidate_idx on public.applications(candidate_id, created_at desc);
create index applications_job_idx on public.applications(job_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.employers enable row level security;
alter table public.jobs enable row level security;
alter table public.candidate_profiles enable row level security;
alter table public.applications enable row level security;
alter table public.job_reports enable row level security;

-- Profiles: users can read/update their own profile. Public directory is not enabled.
create policy "profile owner reads own" on public.profiles
for select to authenticated using (id = auth.uid());
create policy "profile owner updates own" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Employers: owners can manage their own organisation record.
create policy "employer owner reads own" on public.employers
for select to authenticated using (owner_id = auth.uid());
create policy "employer owner creates own" on public.employers
for insert to authenticated with check (owner_id = auth.uid());
create policy "employer owner updates own" on public.employers
for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Jobs: anyone can read approved jobs. Employer can read/manage their own submissions.
create policy "public reads approved jobs" on public.jobs
for select to anon, authenticated using (status = 'approved');
create policy "employer reads own jobs" on public.jobs
for select to authenticated using (
  exists (select 1 from public.employers e where e.id = employer_id and e.owner_id = auth.uid())
);
create policy "employer submits own jobs" on public.jobs
for insert to authenticated with check (
  status = 'pending' and
  exists (select 1 from public.employers e where e.id = employer_id and e.owner_id = auth.uid())
);
create policy "employer updates own pending jobs" on public.jobs
for update to authenticated using (
  status in ('draft', 'pending') and
  exists (select 1 from public.employers e where e.id = employer_id and e.owner_id = auth.uid())
) with check (
  status in ('draft', 'pending') and
  exists (select 1 from public.employers e where e.id = employer_id and e.owner_id = auth.uid())
);

-- Candidate profile: private by default; employer visibility is a later controlled feature.
create policy "candidate reads own candidate profile" on public.candidate_profiles
for select to authenticated using (user_id = auth.uid());
create policy "candidate creates own candidate profile" on public.candidate_profiles
for insert to authenticated with check (user_id = auth.uid());
create policy "candidate updates own candidate profile" on public.candidate_profiles
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Applications: candidates can create and view their own applications.
create policy "candidate reads own applications" on public.applications
for select to authenticated using (candidate_id = auth.uid());
create policy "candidate submits own application" on public.applications
for insert to authenticated with check (
  candidate_id = auth.uid() and
  exists (select 1 from public.jobs j where j.id = job_id and j.status = 'approved')
);
create policy "candidate withdraws own application" on public.applications
for update to authenticated using (candidate_id = auth.uid() and status <> 'withdrawn')
with check (candidate_id = auth.uid() and status = 'withdrawn');

-- Reports: authenticated users can report a vacancy; reporters can view their own reports.
create policy "authenticated user reports job" on public.job_reports
for insert to authenticated with check (reporter_id = auth.uid());
create policy "reporter reads own report" on public.job_reports
for select to authenticated using (reporter_id = auth.uid());

-- IMPORTANT:
-- 1. Do not let users set their own role to moderator/admin. Role assignment must be
--    performed through a trusted server-side process / Supabase dashboard.
-- 2. Add tightly scoped moderator/admin policies before implementing moderation UI.
-- 3. Create a PRIVATE Storage bucket for CVs and enforce per-user path policies.
-- 4. Add email verification, rate limits, CAPTCHA/abuse controls and audit logging.
-- 5. Test every policy with anon, candidate, employer and admin accounts before launch.
