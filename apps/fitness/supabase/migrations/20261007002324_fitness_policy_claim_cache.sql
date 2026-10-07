alter policy fitness_grants_insert on public.fitness_coach_grants with check ((select auth.uid()) = user_id and ((select auth.jwt())->>'client_id') is null);
alter policy fitness_grants_update on public.fitness_coach_grants
  using ((select auth.uid()) = user_id and ((select auth.jwt())->>'client_id') is null)
  with check ((select auth.uid()) = user_id and ((select auth.jwt())->>'client_id') is null);
alter policy fitness_grants_delete on public.fitness_coach_grants
  using ((select auth.uid()) = user_id and ((select auth.jwt())->>'client_id') is null);
alter policy fitness_workouts_read on public.fitness_completed_workouts
  using ((select auth.uid()) = user_id and (
    ((select auth.jwt())->>'client_id') is null or exists (
      select 1 from public.fitness_coach_grants g
      where g.user_id = (select auth.uid()) and g.client_id::text = ((select auth.jwt())->>'client_id')
    )
  ));
alter policy fitness_workouts_insert on public.fitness_completed_workouts
  with check ((select auth.uid()) = user_id and ((select auth.jwt())->>'client_id') is null);
alter policy workspace_direct_sessions_only on public.workspace_documents
  using (((select auth.jwt())->>'client_id') is null)
  with check (((select auth.jwt())->>'client_id') is null);
