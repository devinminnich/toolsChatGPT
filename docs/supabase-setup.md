# Supabase setup

The app runs without Supabase in local-only mode. Cloud sync becomes active when a Supabase project is configured and the user signs in.

## 1. Create a Supabase project

Create a project in Supabase and note:

- Project URL
- Publishable/anon key

Do not place the service-role key in this frontend application.

## 2. Run migrations

Run these migrations in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_workspace_documents.sql`

The second migration creates the current local-first workspace synchronization document. Row Level Security restricts each row to its authenticated owner.

## 3. Configure environment

Copy `.env.example` to `.env.local` and populate:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_ANON_KEY
```

For deployed environments, set those values in the hosting provider rather than committing `.env.local`.

## 4. Authentication

V1 uses Supabase email OTP / magic-link authentication. The app automatically shows a sign-in bar when Supabase is configured.

Configure the Supabase Auth Site URL and redirect URLs to include the application origin(s), including the local development URL and the production deployment URL.

## 5. Sync behavior

- Every edit is saved locally first.
- When no Supabase session exists, the app continues in local mode.
- When authenticated, saves are also written to `workspace_documents`.
- On startup, local and cloud workspace versions are compared by `updatedAt`; the newest valid V1 workspace is loaded locally.
- A cloud error does not erase local data.

## Security notes

- The browser only receives the publishable/anon key.
- `workspace_documents` uses Row Level Security with `auth.uid() = user_id`.
- Existing normalized tables also have owner-scoped RLS policies.
- Never commit Supabase service-role credentials.
