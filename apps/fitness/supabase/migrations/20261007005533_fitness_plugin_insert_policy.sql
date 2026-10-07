drop policy plugin_appends_finished_results on public.fitness_completed_workouts;
alter policy fitness_workouts_insert on public.fitness_completed_workouts
with check ((select auth.uid()) = user_id and ((select auth.jwt()) ->> 'client_id' is null or exists (
  select 1 from public.fitness_coach_grants g where g.user_id = (select auth.uid())
  and g.client_id::text = (select auth.jwt()) ->> 'client_id' and g.access_mode = 'train'
)));
