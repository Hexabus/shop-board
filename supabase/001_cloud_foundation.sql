-- Shop Board cloud foundation (Stage 1).
-- Tables, role checks and security rules for shared, multi-company data.
-- Safe to run more than once. Does not touch the existing shop_board_* backup tables.
--
-- Roles (fixed):
--   owner  everything
--   lead   all jobs, edits and deletes, assigns crew; no money, no people or company settings
--   crew   assigned jobs only; adds notes, photos and receipts; no edits, no deletes, no money
-- Nothing is ever hard-deleted by the app: deleted_at marks a record as in the trash.
-- "Latest change wins": an update carrying an older edited_at than the saved row is ignored.

begin;

-- ---------------------------------------------------------------- tables

create table if not exists public.sb_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 80),
  phone text not null default '',
  logo text not null default '',
  next_invoice_number integer not null default 1001,
  seat_limit integer not null default 2 check (seat_limit >= 0),
  created_by uuid,
  edited_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Accounts and their role in a company. Only the owner changes this table.
create table if not exists public.sb_members (
  company_id uuid not null references public.sb_companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'lead', 'crew')),
  status text not null default 'active' check (status in ('active', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, user_id)
);
create index if not exists sb_members_user on public.sb_members (user_id);

-- The crew roster: people on the board, with or without their own login (user_id).
create table if not exists public.sb_crew (
  company_id uuid not null references public.sb_companies(id) on delete cascade,
  id text not null check (id ~ '^[A-Za-z0-9_:.-]{1,200}$'),
  name text not null default '',
  phone text not null default '',
  email text not null default '',
  role text not null default 'Crew',
  user_id uuid references auth.users(id) on delete set null,
  created_by uuid,
  edited_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (company_id, id)
);

create table if not exists public.sb_clients (
  company_id uuid not null references public.sb_companies(id) on delete cascade,
  id text not null check (id ~ '^[A-Za-z0-9_:.-]{1,200}$'),
  name text not null default '',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  project_notes text not null default '',
  created_by uuid,
  edited_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (company_id, id)
);

-- A job carries no dollar amounts; those live in sb_job_money, sb_bills and sb_expenses.
create table if not exists public.sb_jobs (
  company_id uuid not null references public.sb_companies(id) on delete cascade,
  id text not null check (id ~ '^[A-Za-z0-9_:.-]{1,200}$'),
  name text not null default '',
  trade text not null default '',
  client_id text not null default '',
  address text not null default '',
  status text not null default 'Lead' check (status in ('Lead', 'Quoted', 'Scheduled', 'On site', 'Waiting', 'Done', 'Paid')),
  start_date text not null default '' check (start_date = '' or start_date ~ '^\d{4}-\d{2}-\d{2}$'),
  created_by uuid,
  edited_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (company_id, id)
);

-- Which roster people are on which job. id is "<job id>:<crew id>".
create table if not exists public.sb_job_assignments (
  company_id uuid not null,
  id text not null check (id ~ '^[A-Za-z0-9_:.-]{1,200}$'),
  job_id text not null,
  crew_id text not null,
  created_by uuid,
  edited_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (company_id, id),
  unique (company_id, job_id, crew_id),
  foreign key (company_id, job_id) references public.sb_jobs (company_id, id) on delete cascade,
  foreign key (company_id, crew_id) references public.sb_crew (company_id, id) on delete cascade
);

create table if not exists public.sb_notes (
  company_id uuid not null,
  id text not null check (id ~ '^[A-Za-z0-9_:.-]{1,200}$'),
  job_id text not null,
  body text not null default '',
  tag text not null default '',
  author_name text not null default '',
  author_id uuid,
  noted_at timestamptz,
  legacy_when text not null default '',
  created_by uuid,
  edited_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (company_id, id),
  foreign key (company_id, job_id) references public.sb_jobs (company_id, id) on delete cascade
);

-- The image itself is a file in storage (storage_path); older sample photos may only have a web address (url).
create table if not exists public.sb_photos (
  company_id uuid not null,
  id text not null check (id ~ '^[A-Za-z0-9_:.-]{1,200}$'),
  job_id text not null,
  storage_path text not null default '',
  url text not null default '',
  tag text not null default '',
  caption text not null default '',
  author_name text not null default '',
  author_id uuid,
  taken_at timestamptz,
  legacy_when text not null default '',
  created_by uuid,
  edited_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (company_id, id),
  foreign key (company_id, job_id) references public.sb_jobs (company_id, id) on delete cascade
);

create table if not exists public.sb_files (
  company_id uuid not null,
  id text not null check (id ~ '^[A-Za-z0-9_:.-]{1,200}$'),
  job_id text not null,
  name text not null default '',
  storage_path text not null default '',
  mime text not null default '',
  size_label text not null default '',
  author_name text not null default '',
  author_id uuid,
  legacy_when text not null default '',
  created_by uuid,
  edited_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (company_id, id),
  foreign key (company_id, job_id) references public.sb_jobs (company_id, id) on delete cascade
);

-- Receipts. Anyone on the job can log one; only the owner sees them all.
create table if not exists public.sb_expenses (
  company_id uuid not null,
  id text not null check (id ~ '^[A-Za-z0-9_:.-]{1,200}$'),
  job_id text not null,
  description text not null default '',
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  category text not null default 'Materials',
  day text not null default '' check (day = '' or day ~ '^\d{4}-\d{2}-\d{2}$'),
  legacy_when text not null default '',
  storage_path text not null default '',
  author_name text not null default '',
  author_id uuid,
  created_by uuid,
  edited_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (company_id, id),
  foreign key (company_id, job_id) references public.sb_jobs (company_id, id) on delete cascade
);

-- Owner only.
create table if not exists public.sb_bills (
  company_id uuid not null,
  id text not null check (id ~ '^[A-Za-z0-9_:.-]{1,200}$'),
  job_id text not null,
  description text not null default '',
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  status text not null default 'Unpaid' check (status in ('Paid', 'Unpaid')),
  number integer,
  billed_at timestamptz,
  due_date text not null default '' check (due_date = '' or due_date ~ '^\d{4}-\d{2}-\d{2}$'),
  paid_at timestamptz,
  created_by uuid,
  edited_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (company_id, id),
  foreign key (company_id, job_id) references public.sb_jobs (company_id, id) on delete cascade
);

-- Owner only. One row per job (id is the job id): the quote and any hand-typed totals.
create table if not exists public.sb_job_money (
  company_id uuid not null,
  id text not null,
  quote_items jsonb not null default '[]'::jsonb,
  quote_status text not null default 'Draft',
  money_billed numeric(12, 2),
  money_collected numeric(12, 2),
  created_by uuid,
  edited_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (company_id, id),
  foreign key (company_id, id) references public.sb_jobs (company_id, id) on delete cascade
);

-- Phones ask "what changed since my last visit", so every table is indexed by change time.
create index if not exists sb_crew_changed on public.sb_crew (company_id, updated_at);
create index if not exists sb_clients_changed on public.sb_clients (company_id, updated_at);
create index if not exists sb_jobs_changed on public.sb_jobs (company_id, updated_at);
create index if not exists sb_job_assignments_changed on public.sb_job_assignments (company_id, updated_at);
create index if not exists sb_notes_changed on public.sb_notes (company_id, updated_at);
create index if not exists sb_photos_changed on public.sb_photos (company_id, updated_at);
create index if not exists sb_files_changed on public.sb_files (company_id, updated_at);
create index if not exists sb_expenses_changed on public.sb_expenses (company_id, updated_at);
create index if not exists sb_bills_changed on public.sb_bills (company_id, updated_at);
create index if not exists sb_job_money_changed on public.sb_job_money (company_id, updated_at);
create index if not exists sb_job_assignments_crew on public.sb_job_assignments (company_id, crew_id);

-- ---------------------------------------------------------------- role checks

-- The signed-in person's role in a company, or null if they are not an active member.
create or replace function public.sb_role(p_company uuid) returns text
language sql stable security definer set search_path = '' as $$
  select m.role from public.sb_members m
  where m.company_id = p_company and m.user_id = (select auth.uid()) and m.status = 'active'
$$;

-- Owner and lead see every job; crew see jobs their roster entry is assigned to.
create or replace function public.sb_can_see_job(p_company uuid, p_job text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case public.sb_role(p_company)
    when 'owner' then true
    when 'lead' then true
    when 'crew' then exists (
      select 1
      from public.sb_job_assignments a
      join public.sb_crew c on c.company_id = a.company_id and c.id = a.crew_id
      where a.company_id = p_company and a.job_id = p_job and a.deleted_at is null
        and c.user_id = (select auth.uid()) and c.deleted_at is null)
    else false
  end
$$;

-- File access in storage. Paths are "<company id>/<job id>/<photos|receipts|files>/<file name>".
-- Receipt images follow the receipt rule: the owner, or the person who uploaded it.
create or replace function public.sb_object_access(p_name text, p_owner text, p_write boolean) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  parts text[] := string_to_array(p_name, '/');
  v_company uuid;
  v_role text;
begin
  if array_length(parts, 1) <> 4 or parts[3] not in ('photos', 'receipts', 'files') then return false; end if;
  begin
    v_company := parts[1]::uuid;
  exception when others then
    return false;
  end;
  v_role := public.sb_role(v_company);
  if v_role is null or not public.sb_can_see_job(v_company, parts[2]) then return false; end if;
  if p_write then
    return parts[3] in ('photos', 'receipts') or v_role in ('owner', 'lead');
  end if;
  return parts[3] <> 'receipts' or v_role = 'owner' or p_owner = (select auth.uid())::text;
end
$$;

-- Starts a company with the caller as its owner.
-- Until public sign-up opens (Stage 3), only the original Shop Board owner account may do this.
create or replace function public.sb_create_company(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_company uuid;
begin
  if v_user is null then raise exception 'Sign in first.'; end if;
  if not exists (select 1 from public.shop_board_owner_access o where o.user_id = v_user) then
    raise exception 'Creating a company is not open yet.';
  end if;
  insert into public.sb_companies (name, created_by) values (p_name, v_user) returning id into v_company;
  insert into public.sb_members (company_id, user_id, role) values (v_company, v_user, 'owner');
  return v_company;
end
$$;

revoke all on function public.sb_role(uuid) from public, anon;
revoke all on function public.sb_can_see_job(uuid, text) from public, anon;
revoke all on function public.sb_object_access(text, text, boolean) from public, anon;
revoke all on function public.sb_create_company(text) from public, anon;
grant execute on function public.sb_role(uuid) to authenticated;
grant execute on function public.sb_can_see_job(uuid, text) to authenticated;
grant execute on function public.sb_object_access(text, text, boolean) to authenticated;
grant execute on function public.sb_create_company(text) to authenticated;

-- ---------------------------------------------------------------- triggers

-- Stamps who and when, keeps identity columns fixed, and drops out-of-date updates.
-- Argument 'author' also records the signed-in person as the author of a new row.
create or replace function public.sb_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
    if tg_nargs > 0 and tg_argv[0] = 'author' and (select auth.uid()) is not null then
      new.author_id := (select auth.uid());
    end if;
  else
    if new.edited_at < old.edited_at then return null; end if;
    new.company_id := old.company_id;
    new.id := old.id;
    new.created_by := old.created_by;
    if tg_nargs > 0 and tg_argv[0] = 'author' then new.author_id := old.author_id; end if;
  end if;
  new.updated_at := now();
  return new;
end
$$;

create or replace function public.sb_touch_company() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.edited_at < old.edited_at then return null; end if;
  new.id := old.id;
  new.created_by := old.created_by;
  new.updated_at := now();
  return new;
end
$$;

-- Seat limit: active people other than owners may not exceed the company's seat_limit.
create or replace function public.sb_members_before() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_limit integer;
  v_used integer;
begin
  if tg_op = 'UPDATE' then
    new.company_id := old.company_id;
    new.user_id := old.user_id;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  if new.status = 'active' and new.role <> 'owner' then
    select c.seat_limit into v_limit from public.sb_companies c where c.id = new.company_id for update;
    select count(*) into v_used from public.sb_members m
      where m.company_id = new.company_id and m.status = 'active' and m.role <> 'owner' and m.user_id <> new.user_id;
    if v_used >= v_limit then
      raise exception 'This company has used all % of its crew seats.', v_limit;
    end if;
  end if;
  return new;
end
$$;

-- A company can never be left without an active owner.
create or replace function public.sb_members_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.sb_companies c where c.id = old.company_id)
     and not exists (select 1 from public.sb_members m where m.company_id = old.company_id and m.role = 'owner' and m.status = 'active') then
    raise exception 'A company must keep at least one owner.';
  end if;
  return null;
end
$$;

-- These four only ever run automatically when a row is saved; nobody may call them directly.
revoke all on function public.sb_touch() from public, anon, authenticated;
revoke all on function public.sb_touch_company() from public, anon, authenticated;
revoke all on function public.sb_members_before() from public, anon, authenticated;
revoke all on function public.sb_members_after() from public, anon, authenticated;

drop trigger if exists sb_touch on public.sb_companies;
create trigger sb_touch before update on public.sb_companies for each row execute function public.sb_touch_company();

drop trigger if exists sb_members_before on public.sb_members;
create trigger sb_members_before before insert or update on public.sb_members for each row execute function public.sb_members_before();
drop trigger if exists sb_members_after on public.sb_members;
create trigger sb_members_after after update or delete on public.sb_members for each row execute function public.sb_members_after();

drop trigger if exists sb_touch on public.sb_crew;
create trigger sb_touch before insert or update on public.sb_crew for each row execute function public.sb_touch();
drop trigger if exists sb_touch on public.sb_clients;
create trigger sb_touch before insert or update on public.sb_clients for each row execute function public.sb_touch();
drop trigger if exists sb_touch on public.sb_jobs;
create trigger sb_touch before insert or update on public.sb_jobs for each row execute function public.sb_touch();
drop trigger if exists sb_touch on public.sb_job_assignments;
create trigger sb_touch before insert or update on public.sb_job_assignments for each row execute function public.sb_touch();
drop trigger if exists sb_touch on public.sb_bills;
create trigger sb_touch before insert or update on public.sb_bills for each row execute function public.sb_touch();
drop trigger if exists sb_touch on public.sb_job_money;
create trigger sb_touch before insert or update on public.sb_job_money for each row execute function public.sb_touch();
drop trigger if exists sb_touch on public.sb_notes;
create trigger sb_touch before insert or update on public.sb_notes for each row execute function public.sb_touch('author');
drop trigger if exists sb_touch on public.sb_photos;
create trigger sb_touch before insert or update on public.sb_photos for each row execute function public.sb_touch('author');
drop trigger if exists sb_touch on public.sb_files;
create trigger sb_touch before insert or update on public.sb_files for each row execute function public.sb_touch('author');
drop trigger if exists sb_touch on public.sb_expenses;
create trigger sb_touch before insert or update on public.sb_expenses for each row execute function public.sb_touch('author');

-- ---------------------------------------------------------------- security rules

alter table public.sb_companies enable row level security;
alter table public.sb_members enable row level security;
alter table public.sb_crew enable row level security;
alter table public.sb_clients enable row level security;
alter table public.sb_jobs enable row level security;
alter table public.sb_job_assignments enable row level security;
alter table public.sb_notes enable row level security;
alter table public.sb_photos enable row level security;
alter table public.sb_files enable row level security;
alter table public.sb_expenses enable row level security;
alter table public.sb_bills enable row level security;
alter table public.sb_job_money enable row level security;

-- Signed-out visitors get nothing. Signed-in people may read, add and change, never hard-delete;
-- what each of them may actually touch is decided row by row below.
revoke all on public.sb_companies, public.sb_members, public.sb_crew, public.sb_clients, public.sb_jobs,
  public.sb_job_assignments, public.sb_notes, public.sb_photos, public.sb_files, public.sb_expenses,
  public.sb_bills, public.sb_job_money from anon, authenticated;
grant select, update on public.sb_companies to authenticated;
grant select, insert, update on public.sb_members, public.sb_crew, public.sb_clients, public.sb_jobs,
  public.sb_job_assignments, public.sb_notes, public.sb_photos, public.sb_files, public.sb_expenses,
  public.sb_bills, public.sb_job_money to authenticated;

-- Company: members see it, the owner changes it. New companies come only from sb_create_company().
drop policy if exists sb_companies_select on public.sb_companies;
create policy sb_companies_select on public.sb_companies for select to authenticated
  using (public.sb_role(id) is not null);
drop policy if exists sb_companies_update on public.sb_companies;
create policy sb_companies_update on public.sb_companies for update to authenticated
  using (public.sb_role(id) = 'owner') with check (public.sb_role(id) = 'owner');

-- People and roles: everyone in the company can see who is in it; only the owner changes it.
drop policy if exists sb_members_select on public.sb_members;
create policy sb_members_select on public.sb_members for select to authenticated
  using (public.sb_role(company_id) is not null);
drop policy if exists sb_members_insert on public.sb_members;
create policy sb_members_insert on public.sb_members for insert to authenticated
  with check (public.sb_role(company_id) = 'owner');
drop policy if exists sb_members_update on public.sb_members;
create policy sb_members_update on public.sb_members for update to authenticated
  using (public.sb_role(company_id) = 'owner') with check (public.sb_role(company_id) = 'owner');

-- Roster: visible to the company; owner only to change.
drop policy if exists sb_crew_select on public.sb_crew;
create policy sb_crew_select on public.sb_crew for select to authenticated
  using (public.sb_role(company_id) is not null);
drop policy if exists sb_crew_insert on public.sb_crew;
create policy sb_crew_insert on public.sb_crew for insert to authenticated
  with check (public.sb_role(company_id) = 'owner');
drop policy if exists sb_crew_update on public.sb_crew;
create policy sb_crew_update on public.sb_crew for update to authenticated
  using (public.sb_role(company_id) = 'owner') with check (public.sb_role(company_id) = 'owner');

-- Clients: owner and lead see all; crew see the clients of jobs they are on. Owner and lead change.
drop policy if exists sb_clients_select on public.sb_clients;
create policy sb_clients_select on public.sb_clients for select to authenticated
  using (
    public.sb_role(company_id) in ('owner', 'lead')
    or exists (
      select 1 from public.sb_jobs j
      where j.company_id = sb_clients.company_id and j.client_id = sb_clients.id
        and public.sb_can_see_job(j.company_id, j.id))
  );
drop policy if exists sb_clients_insert on public.sb_clients;
create policy sb_clients_insert on public.sb_clients for insert to authenticated
  with check (public.sb_role(company_id) in ('owner', 'lead'));
drop policy if exists sb_clients_update on public.sb_clients;
create policy sb_clients_update on public.sb_clients for update to authenticated
  using (public.sb_role(company_id) in ('owner', 'lead')) with check (public.sb_role(company_id) in ('owner', 'lead'));

-- Jobs: see what you are allowed to see; owner and lead create and change.
drop policy if exists sb_jobs_select on public.sb_jobs;
create policy sb_jobs_select on public.sb_jobs for select to authenticated
  using (public.sb_can_see_job(company_id, id));
drop policy if exists sb_jobs_insert on public.sb_jobs;
create policy sb_jobs_insert on public.sb_jobs for insert to authenticated
  with check (public.sb_role(company_id) in ('owner', 'lead'));
drop policy if exists sb_jobs_update on public.sb_jobs;
create policy sb_jobs_update on public.sb_jobs for update to authenticated
  using (public.sb_role(company_id) in ('owner', 'lead')) with check (public.sb_role(company_id) in ('owner', 'lead'));

-- Assignments: owner and lead assign; crew can see who is on their own jobs.
drop policy if exists sb_job_assignments_select on public.sb_job_assignments;
create policy sb_job_assignments_select on public.sb_job_assignments for select to authenticated
  using (public.sb_can_see_job(company_id, job_id));
drop policy if exists sb_job_assignments_insert on public.sb_job_assignments;
create policy sb_job_assignments_insert on public.sb_job_assignments for insert to authenticated
  with check (public.sb_role(company_id) in ('owner', 'lead'));
drop policy if exists sb_job_assignments_update on public.sb_job_assignments;
create policy sb_job_assignments_update on public.sb_job_assignments for update to authenticated
  using (public.sb_role(company_id) in ('owner', 'lead')) with check (public.sb_role(company_id) in ('owner', 'lead'));

-- Notes and photos: anyone on the job reads and adds; owner and lead change or trash.
drop policy if exists sb_notes_select on public.sb_notes;
create policy sb_notes_select on public.sb_notes for select to authenticated
  using (public.sb_can_see_job(company_id, job_id));
drop policy if exists sb_notes_insert on public.sb_notes;
create policy sb_notes_insert on public.sb_notes for insert to authenticated
  with check (public.sb_can_see_job(company_id, job_id));
drop policy if exists sb_notes_update on public.sb_notes;
create policy sb_notes_update on public.sb_notes for update to authenticated
  using (public.sb_role(company_id) in ('owner', 'lead')) with check (public.sb_role(company_id) in ('owner', 'lead'));

drop policy if exists sb_photos_select on public.sb_photos;
create policy sb_photos_select on public.sb_photos for select to authenticated
  using (public.sb_can_see_job(company_id, job_id));
drop policy if exists sb_photos_insert on public.sb_photos;
create policy sb_photos_insert on public.sb_photos for insert to authenticated
  with check (public.sb_can_see_job(company_id, job_id));
drop policy if exists sb_photos_update on public.sb_photos;
create policy sb_photos_update on public.sb_photos for update to authenticated
  using (public.sb_role(company_id) in ('owner', 'lead')) with check (public.sb_role(company_id) in ('owner', 'lead'));

-- Files: anyone on the job reads; owner and lead add, change or trash.
drop policy if exists sb_files_select on public.sb_files;
create policy sb_files_select on public.sb_files for select to authenticated
  using (public.sb_can_see_job(company_id, job_id));
drop policy if exists sb_files_insert on public.sb_files;
create policy sb_files_insert on public.sb_files for insert to authenticated
  with check (public.sb_role(company_id) in ('owner', 'lead'));
drop policy if exists sb_files_update on public.sb_files;
create policy sb_files_update on public.sb_files for update to authenticated
  using (public.sb_role(company_id) in ('owner', 'lead')) with check (public.sb_role(company_id) in ('owner', 'lead'));

-- Receipts: anyone on the job can log one. The owner sees all; others see only their own. Owner changes.
drop policy if exists sb_expenses_select on public.sb_expenses;
create policy sb_expenses_select on public.sb_expenses for select to authenticated
  using (
    public.sb_role(company_id) = 'owner'
    or (author_id = (select auth.uid()) and public.sb_can_see_job(company_id, job_id))
  );
drop policy if exists sb_expenses_insert on public.sb_expenses;
create policy sb_expenses_insert on public.sb_expenses for insert to authenticated
  with check (public.sb_can_see_job(company_id, job_id));
drop policy if exists sb_expenses_update on public.sb_expenses;
create policy sb_expenses_update on public.sb_expenses for update to authenticated
  using (public.sb_role(company_id) = 'owner') with check (public.sb_role(company_id) = 'owner');

-- Bills, quotes and typed totals: owner only.
drop policy if exists sb_bills_select on public.sb_bills;
create policy sb_bills_select on public.sb_bills for select to authenticated
  using (public.sb_role(company_id) = 'owner');
drop policy if exists sb_bills_insert on public.sb_bills;
create policy sb_bills_insert on public.sb_bills for insert to authenticated
  with check (public.sb_role(company_id) = 'owner');
drop policy if exists sb_bills_update on public.sb_bills;
create policy sb_bills_update on public.sb_bills for update to authenticated
  using (public.sb_role(company_id) = 'owner') with check (public.sb_role(company_id) = 'owner');

drop policy if exists sb_job_money_select on public.sb_job_money;
create policy sb_job_money_select on public.sb_job_money for select to authenticated
  using (public.sb_role(company_id) = 'owner');
drop policy if exists sb_job_money_insert on public.sb_job_money;
create policy sb_job_money_insert on public.sb_job_money for insert to authenticated
  with check (public.sb_role(company_id) = 'owner');
drop policy if exists sb_job_money_update on public.sb_job_money;
create policy sb_job_money_update on public.sb_job_money for update to authenticated
  using (public.sb_role(company_id) = 'owner') with check (public.sb_role(company_id) = 'owner');

-- ---------------------------------------------------------------- file storage

-- Private bucket for photos, receipt images and documents. 25 MB per file.
insert into storage.buckets (id, name, public, file_size_limit)
values ('shop-board', 'shop-board', false, 26214400)
on conflict (id) do nothing;

drop policy if exists sb_storage_select on storage.objects;
create policy sb_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'shop-board' and public.sb_object_access(name, owner_id, false));
drop policy if exists sb_storage_insert on storage.objects;
create policy sb_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'shop-board' and public.sb_object_access(name, owner_id, true));

commit;
