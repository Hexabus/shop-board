-- Shop Board Stage 3: email invites for lead and crew logins.
-- Paste into the Supabase SQL editor and run once. It adds one table (sb_invites) and one
-- function (sb_accept_invite). It changes no existing table, row or setting.

create table if not exists public.sb_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.sb_companies(id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and length(email) between 3 and 254),
  role text not null check (role in ('lead', 'crew')),
  crew_id text check (crew_id is null or crew_id ~ '^[A-Za-z0-9_:.-]{1,200}$'),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  cancelled_at timestamptz
);
-- One open invite per email per company.
create unique index if not exists sb_invites_open on public.sb_invites (company_id, email)
  where accepted_at is null and cancelled_at is null;
create index if not exists sb_invites_email on public.sb_invites (email);

alter table public.sb_invites enable row level security;
revoke all on public.sb_invites from anon;
grant select, insert, update, delete on public.sb_invites to authenticated;

-- Only the company's owner sees and writes invites.
drop policy if exists sb_invites_select on public.sb_invites;
create policy sb_invites_select on public.sb_invites for select to authenticated
  using (public.sb_role(company_id) = 'owner');
drop policy if exists sb_invites_insert on public.sb_invites;
create policy sb_invites_insert on public.sb_invites for insert to authenticated
  with check (public.sb_role(company_id) = 'owner' and created_by = (select auth.uid()));
drop policy if exists sb_invites_update on public.sb_invites;
create policy sb_invites_update on public.sb_invites for update to authenticated
  using (public.sb_role(company_id) = 'owner') with check (public.sb_role(company_id) = 'owner');
drop policy if exists sb_invites_delete on public.sb_invites;
create policy sb_invites_delete on public.sb_invites for delete to authenticated
  using (public.sb_role(company_id) = 'owner');

-- Run by a signed-in person after they set their password (and at every sign-in).
-- It only ever matches an invite for the email on the caller's own sign-in, so no one can
-- claim another person's invite. Returns null when there is nothing to accept.
create or replace function public.sb_accept_invite() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_email text := lower(btrim(coalesce((select auth.jwt() ->> 'email'), '')));
  v_inv public.sb_invites%rowtype;
begin
  if v_user is null or v_email = '' then return null; end if;
  select * into v_inv from public.sb_invites
    where email = v_email and accepted_at is null and cancelled_at is null and expires_at > now()
    order by created_at desc limit 1 for update;
  if not found then return null; end if;

  -- A name already on another login is never taken over: refuse, and the whole accept is undone.
  if v_inv.crew_id is not null and exists (select 1 from public.sb_crew c
      where c.company_id = v_inv.company_id and c.id = v_inv.crew_id and c.user_id is not null and c.user_id <> v_user) then
    raise exception 'That name on the crew list is already linked to another login. Ask the owner to fix it on the crew list.';
  end if;

  -- The seat limit is checked by the members trigger, so a full company refuses here.
  insert into public.sb_members (company_id, user_id, role, status) values (v_inv.company_id, v_user, v_inv.role, 'active')
    on conflict (company_id, user_id) do update set role = excluded.role, status = 'active'
    where public.sb_members.role <> 'owner';

  -- Put this login on the crew list, and take it off any other name it was on.
  update public.sb_crew set user_id = null, role = 'Crew', edited_at = now()
    where company_id = v_inv.company_id and user_id = v_user and (v_inv.crew_id is null or id <> v_inv.crew_id);
  if v_inv.crew_id is not null then
    update public.sb_crew set user_id = v_user, role = case when v_inv.role = 'lead' then 'Lead' else 'Crew' end, edited_at = now()
      where company_id = v_inv.company_id and id = v_inv.crew_id;
  end if;

  update public.sb_invites set accepted_at = now() where id = v_inv.id;
  return jsonb_build_object('company_id', v_inv.company_id, 'role', v_inv.role);
end
$$;

revoke all on function public.sb_accept_invite() from public, anon;
grant execute on function public.sb_accept_invite() to authenticated;
