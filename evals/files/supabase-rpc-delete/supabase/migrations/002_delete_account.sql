-- Called from /api/account/delete
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_log (actor_id, action, meta)
    values (auth.uid(), 'account_deleted',
            jsonb_build_object('email', (select email from auth.users where id = auth.uid())));
  -- cascades to profiles -> enrollments; invoices keep their row (profile_id set null)
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- nightly cleanup (pg_cron)
select cron.schedule('cleanup-messages', '0 3 * * *',
  $$ delete from public.messages where created_at < now() - interval '3 years' $$);
