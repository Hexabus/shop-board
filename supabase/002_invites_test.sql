-- Shop Board Stage 3: invite security test.
-- Paste into the Supabase SQL editor and run after 002_invites.sql. It pretends to be an owner,
-- a lead, an invited person, a stranger and another company's owner. It ALWAYS ends with an
-- "error" that starts with SBTEST: that is on purpose; it undoes every temporary row and account.
-- The result reads "check_name:t" (passed) or "check_name:f" (failed).

do $t$
declare
  A uuid := gen_random_uuid(); B uuid := gen_random_uuid();
  uo uuid := gen_random_uuid(); ul uuid := gen_random_uuid(); ui uuid := gen_random_uuid();
  ux uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  res text[] := '{}'; n int; r jsonb; inv uuid; ok boolean;
begin
  insert into auth.users (id, aud, role, email) values
    (uo,'authenticated','authenticated','sbtest-o@example.invalid'), (ul,'authenticated','authenticated','sbtest-l@example.invalid'),
    (ui,'authenticated','authenticated','sbtest-invitee@example.invalid'), (ux,'authenticated','authenticated','sbtest-x@example.invalid'),
    (ub,'authenticated','authenticated','sbtest-b@example.invalid');
  insert into public.sb_companies (id, name) values (A,'Test A'),(B,'Test B');
  insert into public.sb_members (company_id, user_id, role) values (A,uo,'owner'),(A,ul,'lead'),(B,ub,'owner');
  insert into public.sb_crew (company_id, id, name) values (A,'c1','Crew One');

  -- OWNER of A invites a crew member
  perform set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',uo,'role','authenticated','email','sbtest-o@example.invalid')::text, true);
  begin
    insert into public.sb_invites (company_id, email, role, crew_id, created_by) values (A,'sbtest-invitee@example.invalid','crew','c1',uo) returning id into inv;
    res := res || text 'owner_can_invite:t';
  exception when others then res := res || format('owner_can_invite:f [%s]', left(sqlerrm,60)); end;
  select count(*) into n from public.sb_invites where company_id = A;
  res := res || format('owner_sees_invite:%s', case when n = 1 then 't' else 'f' end);
  begin
    insert into public.sb_invites (company_id, email, role, created_by) values (A,'sbtest-invitee@example.invalid','lead',uo);
    res := res || text 'one_open_invite_per_email:f';
  exception when unique_violation then res := res || text 'one_open_invite_per_email:t'; when others then res := res || format('one_open_invite_per_email:f [%s]', left(sqlerrm,60)); end;

  -- LEAD of A cannot invite
  perform set_config('request.jwt.claims', json_build_object('sub',ul,'role','authenticated','email','sbtest-l@example.invalid')::text, true);
  begin
    insert into public.sb_invites (company_id, email, role, created_by) values (A,'sbtest-other@example.invalid','crew',ul);
    res := res || text 'lead_cannot_invite:f';
  exception when others then res := res || text 'lead_cannot_invite:t'; end;
  select count(*) into n from public.sb_invites where company_id = A;
  res := res || format('lead_sees_no_invites:%s', case when n = 0 then 't' else 'f' end);

  -- OWNER of another company sees nothing of A
  perform set_config('request.jwt.claims', json_build_object('sub',ub,'role','authenticated','email','sbtest-b@example.invalid')::text, true);
  select count(*) into n from public.sb_invites where company_id = A;
  res := res || format('other_company_sees_nothing:%s', case when n = 0 then 't' else 'f' end);

  -- A stranger with a different email cannot take the invite
  perform set_config('request.jwt.claims', json_build_object('sub',ux,'role','authenticated','email','sbtest-x@example.invalid')::text, true);
  r := public.sb_accept_invite();
  res := res || format('stranger_cannot_accept:%s', case when r is null then 't' else 'f' end);

  -- The invited person accepts: becomes crew of A and is linked to crew c1
  perform set_config('request.jwt.claims', json_build_object('sub',ui,'role','authenticated','email','SBTEST-Invitee@example.invalid')::text, true);
  r := public.sb_accept_invite();
  select exists (select 1 from public.sb_members where company_id = A and user_id = ui and role = 'crew' and status = 'active') into ok;
  res := res || format('invitee_accepts_as_crew:%s', case when r->>'company_id' = A::text and r->>'role' = 'crew' and ok then 't' else 'f' end);
  select count(*) into n from public.sb_crew where company_id = A and id = 'c1' and user_id = ui;
  res := res || format('invitee_linked_to_crew_name:%s', case when n = 1 then 't' else 'f' end);
  r := public.sb_accept_invite();
  res := res || format('second_accept_does_nothing:%s', case when r is null then 't' else 'f' end);

  -- An expired invite is not accepted
  perform set_config('role','none',true);
  insert into public.sb_invites (company_id, email, role, created_by, expires_at) values (A,'sbtest-old@example.invalid','crew',uo, now() - interval '1 day');
  perform set_config('request.jwt.claims', json_build_object('sub',ux,'role','authenticated','email','sbtest-old@example.invalid')::text, true);
  r := public.sb_accept_invite();
  res := res || format('expired_invite_refused:%s', case when r is null then 't' else 'f' end);

  raise exception 'SBTEST %', array_to_string(res, ' ');
end
$t$;
