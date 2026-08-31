create table if not exists workspace_documents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table workspace_documents enable row level security;

create policy "workspace documents own rows"
on workspace_documents
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
