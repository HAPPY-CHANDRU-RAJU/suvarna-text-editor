-- Suvarna: documents owned by Supabase Auth users.
-- Apply with `supabase db push` or paste into the SQL editor.

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default '',
  content jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  preview text not null default '',
  word_count integer not null default 0,
  starred boolean not null default false,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_owner_updated_idx on public.documents (owner_id, updated_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_touch_updated_at on public.documents;
create trigger documents_touch_updated_at
  before update on public.documents
  for each row execute function public.touch_updated_at();

alter table public.documents enable row level security;

-- Owners have full access to their own documents.
drop policy if exists "owners manage their documents" on public.documents;
create policy "owners manage their documents"
  on public.documents
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Anyone with the link can read a document its owner has shared.
drop policy if exists "anyone reads shared documents" on public.documents;
create policy "anyone reads shared documents"
  on public.documents
  for select
  to anon, authenticated
  using (is_public);
