-- Shop Board cloud foundation: security test.
-- Paste into the Supabase SQL editor and run. It pretends to be an owner, a lead, a crew member,
-- a stranger and another company's owner, and checks what each one can see and do.
-- It ALWAYS ends with an "error" that starts with SBTEST: that is on purpose. Ending that way
-- undoes every temporary row and test account it made, so nothing is left behind.
-- Each line of the result reads "check_name:t" (passed) or "check_name:f" (failed).

do $t$
declare
  A uuid := gen_random_uuid(); B uuid := gen_random_uuid();
  uo uuid := gen_random_uuid(); ul uuid := gen_random_uuid(); uc uuid := gen_random_uuid();
  ux uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); ue uuid := gen_random_uuid();
  ur uuid;
  ko text; kl text; kc text; kx text; kb text; kr text;
  res text[] := '{}'; n int; v text; bb boolean; c uuid;
begin
  select user_id into ur from public.shop_board_owner_access limit 1;
  ko := json_build_object('sub', uo, 'role', 'authenticated')::text;
  kl := json_build_object('sub', ul, 'role', 'authenticated')::text;
  kc := json_build_object('sub', uc, 'role', 'authenticated')::text;
  kx := json_build_object('sub', ux, 'role', 'authenticated')::text;
  kb := json_build_object('sub', ub, 'role', 'authenticated')::text;
  kr := json_build_object('sub', ur, 'role', 'authenticated')::text;

  insert into auth.users (id, aud, role, email) values
    (uo,'authenticated','authenticated','sbtest-o@example.invalid'),(ul,'authenticated','authenticated','sbtest-l@example.invalid'),
    (uc,'authenticated','authenticated','sbtest-c@example.invalid'),(ux,'authenticated','authenticated','sbtest-x@example.invalid'),
    (ub,'authenticated','authenticated','sbtest-b@example.invalid'),(ue,'authenticated','authenticated','sbtest-e@example.invalid');
  insert into public.sb_companies (id, name) values (A,'Test A'),(B,'Test B');
  insert into public.sb_members (company_id, user_id, role) values (A,uo,'owner'),(A,ul,'lead'),(A,uc,'crew'),(B,ub,'owner');
  insert into public.sb_crew (company_id, id, name, user_id) values (A,'c1','Crew One',uc),(A,'c2','Crew Two',null);
  insert into public.sb_clients (company_id, id, name) values (A,'cl1','Client 1'),(A,'cl2','Client 2'),(B,'clb','Client B');
  insert into public.sb_jobs (company_id, id, name, client_id) values (A,'j1','Job 1','cl1'),(A,'j2','Job 2','cl2'),(B,'jb1','Job B','clb');
  insert into public.sb_job_assignments (company_id, id, job_id, crew_id) values (A,'j1:c1','j1','c1');
  insert into public.sb_notes (company_id, id, job_id, body) values (A,'n1','j1','one'),(A,'n2','j2','two'),(B,'nb1','jb1','b');

  -- SIGNED OUT
  perform set_config('role','anon',true), set_config('request.jwt.claims','{"role":"anon"}',true);
  begin select count(*) into n from public.sb_jobs; res := res || format('anon_jobs_blocked:f(%s rows readable)', n); exception when others then res := res || format('anon_jobs_blocked:t [%s]', left(sqlerrm,40)); end;
  begin select count(*) into n from public.sb_companies; res := res || text 'anon_companies_blocked:f'; exception when others then res := res || text 'anon_companies_blocked:t'; end;
  begin select count(*) into n from public.sb_bills; res := res || text 'anon_bills_blocked:f'; exception when others then res := res || text 'anon_bills_blocked:t'; end;
  begin perform public.sb_role(A); res := res || text 'anon_fn_blocked:f'; exception when others then res := res || text 'anon_fn_blocked:t'; end;
  begin perform public.sb_create_company('x'); res := res || text 'anon_create_blocked:f'; exception when others then res := res || text 'anon_create_blocked:t'; end;

  -- OWNER
  perform set_config('role','authenticated',true), set_config('request.jwt.claims',ko,true);
  select count(*) into n from public.sb_jobs; res := res || format('owner_sees_jobs:%s', n = 2);
  insert into public.sb_bills (company_id, id, job_id, amount) values (A,'b1','j1',100);
  insert into public.sb_job_money (company_id, id, money_billed) values (A,'j1',500);
  insert into public.sb_expenses (company_id, id, job_id, amount) values (A,'e_owner','j1',50);
  insert into public.sb_files (company_id, id, job_id, name) values (A,'f1','j1','doc');
  insert into public.sb_photos (company_id, id, job_id) values (A,'p1','j2');
  res := res || text 'owner_inserts_money_files_photos:t';
  update public.sb_companies set name = 'Test A2', edited_at = now() where id = A; get diagnostics n = row_count; res := res || format('owner_updates_company:%s', n = 1);
  update public.sb_crew set name = name || '!', edited_at = now() where company_id = A; get diagnostics n = row_count; res := res || format('owner_updates_crew:%s', n = 2);
  update public.sb_bills set status = 'Paid', edited_at = now() where company_id = A; get diagnostics n = row_count; res := res || format('owner_updates_bill:%s', n = 1);
  update public.sb_notes set deleted_at = now(), edited_at = now() where company_id = A and id = 'n2'; get diagnostics n = row_count; res := res || format('owner_soft_deletes_note:%s', n = 1);
  select count(*) into n from public.sb_job_money; res := res || format('owner_sees_money:%s', n = 1);
  update public.sb_jobs set name = 'stale', edited_at = edited_at - interval '1 hour' where company_id = A and id = 'j1'; get diagnostics n = row_count;
  select name into v from public.sb_jobs where company_id = A and id = 'j1'; res := res || format('older_edit_ignored:%s', n = 0 and v = 'Job 1');
  update public.sb_jobs set name = 'fresh', edited_at = now() + interval '1 second' where company_id = A and id = 'j1'; get diagnostics n = row_count; res := res || format('newer_edit_applies:%s', n = 1);
  update public.sb_jobs set company_id = B, id = 'moved', edited_at = now() + interval '2 second' where company_id = A and id = 'j2';
  select count(*) into n from public.sb_jobs where company_id = A and id = 'j2'; res := res || format('identity_columns_fixed:%s', n = 1);
  begin delete from public.sb_jobs where company_id = A; res := res || text 'hard_delete_blocked:f'; exception when others then res := res || format('hard_delete_blocked:t [%s]', left(sqlerrm,40)); end;
  begin insert into public.sb_members (company_id, user_id, role) values (A,ue,'crew'); res := res || text 'seat_limit_blocks_third:f'; exception when others then res := res || format('seat_limit_blocks_third:t [%s]', left(sqlerrm,50)); end;
  begin update public.sb_members set role = 'lead' where company_id = A and user_id = uo; res := res || text 'last_owner_demote_blocked:f'; exception when others then res := res || format('last_owner_demote_blocked:t [%s]', left(sqlerrm,45)); end;
  begin update public.sb_members set status = 'removed' where company_id = A and user_id = uo; res := res || text 'last_owner_remove_blocked:f'; exception when others then res := res || text 'last_owner_remove_blocked:t'; end;
  begin insert into public.sb_companies (name) values ('direct'); res := res || text 'direct_company_insert_blocked:f'; exception when others then res := res || text 'direct_company_insert_blocked:t'; end;

  -- LEAD
  perform set_config('request.jwt.claims',kl,true);
  select count(*) into n from public.sb_jobs; res := res || format('lead_sees_all_jobs:%s', n = 2);
  select count(*) into n from public.sb_clients; res := res || format('lead_sees_clients:%s', n = 2);
  update public.sb_jobs set status = 'Scheduled', edited_at = now() + interval '3 second' where company_id = A and id = 'j1'; get diagnostics n = row_count; res := res || format('lead_edits_job:%s', n = 1);
  insert into public.sb_jobs (company_id, id, name) values (A,'j3','Lead job');
  update public.sb_notes set body = 'edited', edited_at = now() where company_id = A and id = 'n1'; get diagnostics n = row_count; res := res || format('lead_edits_note:%s', n = 1);
  update public.sb_notes set deleted_at = now(), edited_at = now() + interval '1 second' where company_id = A and id = 'n1'; get diagnostics n = row_count; res := res || format('lead_soft_deletes_note:%s', n = 1);
  update public.sb_notes set deleted_at = null, edited_at = now() + interval '2 second' where company_id = A and id = 'n1';
  insert into public.sb_photos (company_id, id, job_id) values (A,'p_lead','j1');
  update public.sb_photos set caption = 'x', edited_at = now() where company_id = A; get diagnostics n = row_count; res := res || format('lead_edits_photos:%s', n = 2);
  insert into public.sb_files (company_id, id, job_id) values (A,'f_lead','j2');
  update public.sb_files set name = 'x', edited_at = now() where company_id = A; get diagnostics n = row_count; res := res || format('lead_edits_files:%s', n = 2);
  insert into public.sb_job_assignments (company_id, id, job_id, crew_id) values (A,'j2:c2','j2','c2');
  update public.sb_job_assignments set deleted_at = now(), edited_at = now() where company_id = A and id = 'j2:c2'; get diagnostics n = row_count; res := res || format('lead_assigns_crew:%s', n = 1);
  select count(*) into n from public.sb_bills; res := res || format('lead_no_bills:%s', n = 0);
  select count(*) into n from public.sb_job_money; res := res || format('lead_no_job_money:%s', n = 0);
  begin insert into public.sb_bills (company_id, id, job_id, amount) values (A,'b_lead','j1',1); res := res || text 'lead_cannot_add_bill:f'; exception when others then res := res || text 'lead_cannot_add_bill:t'; end;
  begin insert into public.sb_job_money (company_id, id) values (A,'j2'); res := res || text 'lead_cannot_add_money:f'; exception when others then res := res || text 'lead_cannot_add_money:t'; end;
  update public.sb_bills set amount = 1, edited_at = now() + interval '1 hour' where company_id = A; get diagnostics n = row_count; res := res || format('lead_cannot_edit_bill:%s', n = 0);
  insert into public.sb_expenses (company_id, id, job_id, amount) values (A,'e_lead','j1',20);
  select count(*) into n from public.sb_expenses; select string_agg(id, ',') into v from public.sb_expenses; res := res || format('lead_sees_only_own_receipts:%s', n = 1 and v = 'e_lead');
  update public.sb_expenses set amount = 1, edited_at = now() + interval '1 hour' where company_id = A; get diagnostics n = row_count; res := res || format('lead_cannot_edit_receipts:%s', n = 0);
  update public.sb_members set role = 'owner' where company_id = A; get diagnostics n = row_count; res := res || format('lead_cannot_change_members:%s', n = 0);
  begin insert into public.sb_members (company_id, user_id, role) values (A,ue,'owner'); res := res || text 'lead_cannot_add_member:f'; exception when others then res := res || text 'lead_cannot_add_member:t'; end;
  update public.sb_crew set name = 'hacked', edited_at = now() + interval '1 hour' where company_id = A; get diagnostics n = row_count; res := res || format('lead_cannot_change_roster:%s', n = 0);
  begin insert into public.sb_crew (company_id, id) values (A,'c9'); res := res || text 'lead_cannot_add_roster:f'; exception when others then res := res || text 'lead_cannot_add_roster:t'; end;
  update public.sb_companies set name = 'hacked', seat_limit = 99, edited_at = now() + interval '1 hour' where id = A; get diagnostics n = row_count; res := res || format('lead_cannot_change_company:%s', n = 0);

  -- CREW (assigned to job j1 only)
  perform set_config('request.jwt.claims',kc,true);
  select count(*), string_agg(id, ',') into n, v from public.sb_jobs; res := res || format('crew_sees_only_assigned_job:%s', n = 1 and v = 'j1');
  select count(*), string_agg(id, ',') into n, v from public.sb_clients; res := res || format('crew_sees_only_that_client:%s', n = 1 and v = 'cl1');
  select count(*) into n from public.sb_notes where job_id <> 'j1'; res := res || format('crew_no_other_job_notes:%s', n = 0);
  select count(*) into n from public.sb_photos where job_id <> 'j1'; res := res || format('crew_no_other_job_photos:%s', n = 0);
  select count(*) into n from public.sb_job_assignments where job_id <> 'j1'; res := res || format('crew_no_other_assignments:%s', n = 0);
  insert into public.sb_notes (company_id, id, job_id, body) values (A,'n_crew','j1','hi');
  insert into public.sb_photos (company_id, id, job_id) values (A,'p_crew','j1');
  insert into public.sb_expenses (company_id, id, job_id, amount, author_id) values (A,'e_crew','j1',9, uo);
  res := res || text 'crew_adds_note_photo_receipt:t';
  select count(*), string_agg(id, ',') into n, v from public.sb_expenses; res := res || format('crew_sees_only_own_receipts:%s', n = 1 and v = 'e_crew');
  select author_id = uc into bb from public.sb_expenses where id = 'e_crew'; res := res || format('author_cannot_be_faked:%s', bb);
  begin insert into public.sb_notes (company_id, id, job_id) values (A,'n_crew2','j2'); res := res || text 'crew_cannot_add_to_other_job:f'; exception when others then res := res || text 'crew_cannot_add_to_other_job:t'; end;
  begin insert into public.sb_expenses (company_id, id, job_id) values (A,'e_crew2','j2'); res := res || text 'crew_cannot_add_receipt_other_job:f'; exception when others then res := res || text 'crew_cannot_add_receipt_other_job:t'; end;
  begin insert into public.sb_files (company_id, id, job_id) values (A,'f_crew','j1'); res := res || text 'crew_cannot_add_file:f'; exception when others then res := res || text 'crew_cannot_add_file:t'; end;
  begin insert into public.sb_jobs (company_id, id) values (A,'j_crew'); res := res || text 'crew_cannot_add_job:f'; exception when others then res := res || text 'crew_cannot_add_job:t'; end;
  begin insert into public.sb_job_assignments (company_id, id, job_id, crew_id) values (A,'j2:c1','j2','c1'); res := res || text 'crew_cannot_self_assign:f'; exception when others then res := res || text 'crew_cannot_self_assign:t'; end;
  update public.sb_jobs set name = 'x', edited_at = now() + interval '1 hour' where company_id = A; get diagnostics n = row_count; res := res || format('crew_cannot_edit_job:%s', n = 0);
  update public.sb_jobs set deleted_at = now(), edited_at = now() + interval '1 hour' where company_id = A; get diagnostics n = row_count; res := res || format('crew_cannot_soft_delete_job:%s', n = 0);
  update public.sb_notes set body = 'x', edited_at = now() + interval '1 hour' where company_id = A; get diagnostics n = row_count; res := res || format('crew_cannot_edit_notes:%s', n = 0);
  update public.sb_notes set deleted_at = now(), edited_at = now() + interval '1 hour' where id = 'n_crew'; get diagnostics n = row_count; res := res || format('crew_cannot_soft_delete_own_note:%s', n = 0);
  update public.sb_photos set deleted_at = now(), edited_at = now() + interval '1 hour' where company_id = A; get diagnostics n = row_count; res := res || format('crew_cannot_soft_delete_photos:%s', n = 0);
  update public.sb_expenses set amount = 1, edited_at = now() + interval '1 hour' where company_id = A; get diagnostics n = row_count; res := res || format('crew_cannot_edit_receipts:%s', n = 0);
  update public.sb_clients set name = 'x', edited_at = now() + interval '1 hour' where company_id = A; get diagnostics n = row_count; res := res || format('crew_cannot_edit_clients:%s', n = 0);
  select count(*) into n from public.sb_bills; res := res || format('crew_no_bills:%s', n = 0);
  select count(*) into n from public.sb_job_money; res := res || format('crew_no_job_money:%s', n = 0);
  begin insert into public.sb_bills (company_id, id, job_id) values (A,'b_crew','j1'); res := res || text 'crew_cannot_add_bill:f'; exception when others then res := res || text 'crew_cannot_add_bill:t'; end;
  -- file storage path rules, as crew
  res := res || format('st_crew_photo_write:%s', public.sb_object_access(A::text||'/j1/photos/x.jpg', uc::text, true));
  res := res || format('st_crew_receipt_write:%s', public.sb_object_access(A::text||'/j1/receipts/x.jpg', uc::text, true));
  res := res || format('st_crew_file_write_denied:%s', not public.sb_object_access(A::text||'/j1/files/x.pdf', uc::text, true));
  res := res || format('st_crew_file_read:%s', public.sb_object_access(A::text||'/j1/files/x.pdf', uo::text, false));
  res := res || format('st_crew_other_job_denied:%s', not public.sb_object_access(A::text||'/j2/photos/x.jpg', uc::text, false));
  res := res || format('st_crew_own_receipt_read:%s', public.sb_object_access(A::text||'/j1/receipts/x.jpg', uc::text, false));
  res := res || format('st_crew_others_receipt_denied:%s', not public.sb_object_access(A::text||'/j1/receipts/x.jpg', uo::text, false));
  res := res || format('st_bad_short_path_denied:%s', not public.sb_object_access(A::text||'/j1/x.jpg', uc::text, false));
  res := res || format('st_bad_long_path_denied:%s', not public.sb_object_access(A::text||'/j1/photos/a/b.jpg', uc::text, false));
  res := res || format('st_bad_folder_denied:%s', not public.sb_object_access(A::text||'/j1/other/x.jpg', uc::text, false));
  res := res || format('st_bad_company_denied:%s', not public.sb_object_access('not-a-uuid/j1/photos/x.jpg', uc::text, false));
  res := res || format('st_null_path_denied:%s', not coalesce(public.sb_object_access(null, uc::text, false), false));
  res := res || format('st_empty_path_denied:%s', not public.sb_object_access('', uc::text, false));
  -- the real storage table
  begin insert into storage.objects (bucket_id, name, owner_id) values ('shop-board', A::text||'/j1/receipts/r1.jpg', uc::text); res := res || text 'st_table_crew_uploads_receipt:t'; exception when others then res := res || format('st_table_crew_uploads_receipt:f [%s]', left(sqlerrm,60)); end;
  begin insert into storage.objects (bucket_id, name, owner_id) values ('shop-board', A::text||'/j1/files/d.pdf', uc::text); res := res || text 'st_table_crew_file_upload_blocked:f'; exception when others then res := res || text 'st_table_crew_file_upload_blocked:t'; end;
  begin insert into storage.objects (bucket_id, name, owner_id) values ('shop-board', A::text||'/j2/photos/p.jpg', uc::text); res := res || text 'st_table_crew_other_job_blocked:f'; exception when others then res := res || text 'st_table_crew_other_job_blocked:t'; end;
  begin select count(*) into n from storage.objects where bucket_id = 'shop-board'; res := res || format('st_table_crew_sees_own_receipt:%s', n = 1); exception when others then res := res || format('st_table_crew_sees_own_receipt:f [%s]', left(sqlerrm,60)); end;

  -- LEAD again: files and other people's receipts
  perform set_config('request.jwt.claims',kl,true);
  begin select count(*) into n from storage.objects where bucket_id = 'shop-board'; res := res || format('st_table_lead_no_crew_receipt:%s', n = 0); exception when others then res := res || format('st_table_lead_no_crew_receipt:f [%s]', left(sqlerrm,60)); end;
  res := res || format('st_lead_file_write:%s', public.sb_object_access(A::text||'/j2/files/x.pdf', ul::text, true));
  res := res || format('st_lead_others_receipt_denied:%s', not public.sb_object_access(A::text||'/j1/receipts/x.jpg', uc::text, false));
  select count(*) into n from public.sb_expenses; res := res || format('lead_still_only_own_receipts:%s', n = 1);

  -- OWNER again
  perform set_config('request.jwt.claims',ko,true);
  select count(*) into n from public.sb_expenses; res := res || format('owner_sees_all_receipts:%s', n = 3);
  begin select count(*) into n from storage.objects where bucket_id = 'shop-board'; res := res || format('st_table_owner_sees_receipt:%s', n = 1); exception when others then res := res || format('st_table_owner_sees_receipt:f [%s]', left(sqlerrm,60)); end;
  res := res || format('st_owner_any_receipt_read:%s', public.sb_object_access(A::text||'/j1/receipts/x.jpg', uc::text, false));
  begin delete from storage.objects where bucket_id = 'shop-board'; get diagnostics n = row_count; res := res || format('st_table_delete_blocked:%s', n = 0); exception when others then res := res || text 'st_table_delete_blocked:t'; end;

  -- STRANGER (signed in, not in any company)
  perform set_config('request.jwt.claims',kx,true);
  select (select count(*) from public.sb_companies) + (select count(*) from public.sb_members) + (select count(*) from public.sb_crew) + (select count(*) from public.sb_clients)
       + (select count(*) from public.sb_jobs) + (select count(*) from public.sb_job_assignments) + (select count(*) from public.sb_notes) + (select count(*) from public.sb_photos)
       + (select count(*) from public.sb_files) + (select count(*) from public.sb_expenses) + (select count(*) from public.sb_bills) + (select count(*) from public.sb_job_money) into n;
  res := res || format('outsider_sees_nothing:%s', n = 0);
  begin insert into public.sb_notes (company_id, id, job_id) values (A,'n_x','j1'); res := res || text 'outsider_cannot_add:f'; exception when others then res := res || text 'outsider_cannot_add:t'; end;
  begin insert into public.sb_members (company_id, user_id, role) values (A,ux,'owner'); res := res || text 'outsider_cannot_join:f'; exception when others then res := res || text 'outsider_cannot_join:t'; end;
  update public.sb_jobs set name = 'x', edited_at = now() + interval '1 hour'; get diagnostics n = row_count; res := res || format('outsider_cannot_edit:%s', n = 0);
  res := res || format('st_outsider_denied:%s', not public.sb_object_access(A::text||'/j1/photos/x.jpg', ux::text, false));
  begin perform public.sb_create_company('Nope'); res := res || text 'create_company_refuses_stranger:f'; exception when others then res := res || format('create_company_refuses_stranger:t [%s]', left(sqlerrm,45)); end;

  -- ANOTHER COMPANY'S OWNER
  perform set_config('request.jwt.claims',kb,true);
  select (select count(*) from public.sb_jobs where company_id = A) + (select count(*) from public.sb_notes where company_id = A) + (select count(*) from public.sb_clients where company_id = A)
       + (select count(*) from public.sb_members where company_id = A) + (select count(*) from public.sb_companies where id = A) + (select count(*) from public.sb_bills where company_id = A)
       + (select count(*) from public.sb_expenses where company_id = A) + (select count(*) from public.sb_crew where company_id = A) into n;
  res := res || format('other_company_sees_none_of_A:%s', n = 0);
  select count(*) into n from public.sb_jobs; res := res || format('other_company_sees_own:%s', n = 1);
  update public.sb_jobs set name = 'x', edited_at = now() + interval '1 hour' where company_id = A; get diagnostics n = row_count; res := res || format('other_company_cannot_edit_A:%s', n = 0);
  begin insert into public.sb_notes (company_id, id, job_id) values (A,'n_b','j1'); res := res || text 'other_company_cannot_add_to_A:f'; exception when others then res := res || text 'other_company_cannot_add_to_A:t'; end;
  begin insert into public.sb_members (company_id, user_id, role) values (A,ub,'owner'); res := res || text 'other_company_cannot_join_A:f'; exception when others then res := res || text 'other_company_cannot_join_A:t'; end;
  res := res || format('st_other_company_denied:%s', not public.sb_object_access(A::text||'/j1/photos/x.jpg', ub::text, false));

  -- THE REAL OWNER ACCOUNT may start a company (undone at the end like everything else)
  perform set_config('request.jwt.claims',kr,true);
  begin c := public.sb_create_company('Rollback Test Co'); res := res || format('create_company_allows_owner_account:%s', public.sb_role(c) = 'owner'); exception when others then res := res || format('create_company_allows_owner_account:f [%s]', left(sqlerrm,60)); end;

  -- A REMOVED PERSON loses access, and their seat frees up
  perform set_config('request.jwt.claims',ko,true);
  update public.sb_members set status = 'removed' where company_id = A and user_id = ul; get diagnostics n = row_count; res := res || format('owner_removes_member:%s', n = 1);
  begin update public.sb_members set role = 'lead' where company_id = A and user_id = uo; res := res || text 'last_owner_demote_blocked_with_free_seat:f'; exception when others then res := res || format('last_owner_demote_blocked_with_free_seat:%s [%s]', sqlerrm like '%at least one owner%', left(sqlerrm,45)); end;
  begin update public.sb_members set status = 'removed' where company_id = A and user_id = uo; res := res || text 'last_owner_remove_blocked_by_owner_rule:f'; exception when others then res := res || format('last_owner_remove_blocked_by_owner_rule:%s [%s]', sqlerrm like '%at least one owner%', left(sqlerrm,45)); end;
  begin insert into public.sb_members (company_id, user_id, role) values (A,ue,'crew'); res := res || text 'freed_seat_can_be_reused:t'; exception when others then res := res || format('freed_seat_can_be_reused:f [%s]', left(sqlerrm,60)); end;
  perform set_config('request.jwt.claims',kl,true);
  select (select count(*) from public.sb_jobs) + (select count(*) from public.sb_notes) + (select count(*) from public.sb_expenses) + (select count(*) from public.sb_companies) into n;
  res := res || format('removed_member_sees_nothing:%s', n = 0);
  begin insert into public.sb_notes (company_id, id, job_id) values (A,'n_removed','j1'); res := res || text 'removed_member_cannot_add:f'; exception when others then res := res || text 'removed_member_cannot_add:t'; end;

  perform set_config('role','postgres',true);
  raise exception E'SBTEST\n%', array_to_string(res, E'\n');
end $t$;
