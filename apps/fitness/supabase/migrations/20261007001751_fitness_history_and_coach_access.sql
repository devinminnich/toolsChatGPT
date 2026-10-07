create table public.fitness_completed_workouts (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null check (length(session_id) between 1 and 150),
  name text not null check (length(name) between 1 and 200),
  performed_on date not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'
    and payload->>'id' = session_id and jsonb_typeof(payload->'exercises') = 'array'
    and (payload ? 'finishedAt' or payload->>'imported' = 'true')),
  uploaded_at timestamptz not null default now(),
  primary key (user_id, session_id)
);
create index fitness_workouts_user_date on public.fitness_completed_workouts (user_id, performed_on desc, session_id);
alter table public.fitness_completed_workouts enable row level security;
grant select, insert on public.fitness_completed_workouts to authenticated;
revoke all on public.fitness_completed_workouts from anon;

create table public.fitness_coach_grants (
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, client_id)
);
alter table public.fitness_coach_grants enable row level security;
grant select, insert, update, delete on public.fitness_coach_grants to authenticated;
revoke all on public.fitness_coach_grants from anon;

create policy fitness_grants_read on public.fitness_coach_grants for select to authenticated
  using ((select auth.uid()) = user_id);
create policy fitness_grants_insert on public.fitness_coach_grants for insert to authenticated
  with check ((select auth.uid()) = user_id and (select auth.jwt()->>'client_id') is null);
create policy fitness_grants_update on public.fitness_coach_grants for update to authenticated
  using ((select auth.uid()) = user_id and (select auth.jwt()->>'client_id') is null)
  with check ((select auth.uid()) = user_id and (select auth.jwt()->>'client_id') is null);
create policy fitness_grants_delete on public.fitness_coach_grants for delete to authenticated
  using ((select auth.uid()) = user_id and (select auth.jwt()->>'client_id') is null);

create policy fitness_workouts_read on public.fitness_completed_workouts for select to authenticated
  using ((select auth.uid()) = user_id and (
    (select auth.jwt()->>'client_id') is null or exists (
      select 1 from public.fitness_coach_grants g
      where g.user_id = (select auth.uid()) and g.client_id::text = (select auth.jwt()->>'client_id')
    )
  ));
create policy fitness_workouts_insert on public.fitness_completed_workouts for insert to authenticated
  with check ((select auth.uid()) = user_id and (select auth.jwt()->>'client_id') is null);

-- OAuth coach tokens may never read or modify the existing renovation workspace.
-- Direct application sign-ins retain their existing access.
create policy workspace_direct_sessions_only on public.workspace_documents as restrictive
  for all to authenticated
  using ((select auth.jwt()->>'client_id') is null)
  with check ((select auth.jwt()->>'client_id') is null);
