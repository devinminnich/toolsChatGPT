alter table public.fitness_coach_grants add column access_mode text not null default 'read'
  check (access_mode in ('read', 'train'));

create table public.fitness_plugin_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
create table public.fitness_coach_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null check (length(request_id) between 1 and 100),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  reviewed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, request_id)
);
create index fitness_coach_proposals_inbox on public.fitness_coach_proposals(user_id, reviewed, created_at);
alter table public.fitness_plugin_state enable row level security;
alter table public.fitness_coach_proposals enable row level security;
revoke all on public.fitness_plugin_state, public.fitness_coach_proposals from anon;
grant select, insert, update on public.fitness_plugin_state, public.fitness_coach_proposals to authenticated;

-- Existing read-only grants are not upgraded. Only explicit train consent permits these rows.
create policy plugin_training_state on public.fitness_plugin_state for all to authenticated
using ((select auth.uid()) = user_id and (
  (select auth.jwt()) ->> 'client_id' is null or exists (
    select 1 from public.fitness_coach_grants g where g.user_id = (select auth.uid())
    and g.client_id::text = (select auth.jwt()) ->> 'client_id' and g.access_mode = 'train'
  )))
with check ((select auth.uid()) = user_id and (
  (select auth.jwt()) ->> 'client_id' is null or exists (
    select 1 from public.fitness_coach_grants g where g.user_id = (select auth.uid())
    and g.client_id::text = (select auth.jwt()) ->> 'client_id' and g.access_mode = 'train'
  )));
create policy plugin_training_proposals on public.fitness_coach_proposals for all to authenticated
using ((select auth.uid()) = user_id and (
  (select auth.jwt()) ->> 'client_id' is null or exists (
    select 1 from public.fitness_coach_grants g where g.user_id = (select auth.uid())
    and g.client_id::text = (select auth.jwt()) ->> 'client_id' and g.access_mode = 'train'
  )))
with check ((select auth.uid()) = user_id and (
  (select auth.jwt()) ->> 'client_id' is null or exists (
    select 1 from public.fitness_coach_grants g where g.user_id = (select auth.uid())
    and g.client_id::text = (select auth.jwt()) ->> 'client_id' and g.access_mode = 'train'
  )));
create policy plugin_appends_finished_results on public.fitness_completed_workouts for insert to authenticated
with check ((select auth.uid()) = user_id and exists (
  select 1 from public.fitness_coach_grants g where g.user_id = (select auth.uid())
  and g.client_id::text = (select auth.jwt()) ->> 'client_id' and g.access_mode = 'train'
));

-- Compare-and-swap and completed-history append run in one transaction, as the caller.
create function public.fitness_save_plugin_state(next_payload jsonb, expected_revision bigint)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare saved_revision bigint;
begin
  if auth.uid() is null or expected_revision < 0 or jsonb_typeof(next_payload) <> 'object'
    or (next_payload ->> 'version') <> '2' or jsonb_typeof(next_payload -> 'history') <> 'array'
    or octet_length(next_payload::text) > 1500000 then
    raise exception 'Invalid workout state';
  end if;
  if expected_revision = 0 then
    insert into public.fitness_plugin_state(user_id, payload) values (auth.uid(), next_payload)
    on conflict do nothing returning revision into saved_revision;
  else
    update public.fitness_plugin_state set payload = next_payload, revision = revision + 1, updated_at = now()
    where user_id = auth.uid() and revision = expected_revision returning revision into saved_revision;
  end if;
  if saved_revision is null then raise exception 'Workout changed in another view. Reload before saving.'; end if;
  insert into public.fitness_completed_workouts(user_id, session_id, name, performed_on, payload)
  select auth.uid(), s ->> 'id', s ->> 'name',
    coalesce(nullif(s ->> 'performedOn', '')::date,
      (to_timestamp((s ->> 'startedAt')::double precision / 1000) at time zone 'America/Denver')::date), s
  from jsonb_array_elements(next_payload -> 'history') s
  where s -> 'finishedAt' is not null or s ->> 'imported' = 'true'
  on conflict (user_id, session_id) do nothing;
  return saved_revision;
end $$;
revoke execute on function public.fitness_save_plugin_state(jsonb, bigint) from public, anon;
grant execute on function public.fitness_save_plugin_state(jsonb, bigint) to authenticated;
