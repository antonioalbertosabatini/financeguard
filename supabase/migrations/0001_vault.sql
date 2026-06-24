-- FinanceGuard — schema per il sync cloud zero-knowledge.
--
-- Il cloud conserva SOLO dati cifrati: il bundle (blob) in Storage e una riga di
-- metadati per la revisione. Tutte le policy RLS vincolano l'accesso ai soli dati
-- dell'utente autenticato (auth.uid()). Eseguire nel SQL editor di Supabase.

-- 1) Tabella metadati: una riga per utente, con la revisione del bundle.
create table if not exists public.vault_meta (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  revision   bigint not null default 0,
  device_id  text,
  updated_at timestamptz not null default now()
);

alter table public.vault_meta enable row level security;

drop policy if exists "vault_meta_select_own" on public.vault_meta;
create policy "vault_meta_select_own" on public.vault_meta
  for select using (auth.uid() = user_id);

drop policy if exists "vault_meta_insert_own" on public.vault_meta;
create policy "vault_meta_insert_own" on public.vault_meta
  for insert with check (auth.uid() = user_id);

drop policy if exists "vault_meta_update_own" on public.vault_meta;
create policy "vault_meta_update_own" on public.vault_meta
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2) Bucket privato per i bundle cifrati.
insert into storage.buckets (id, name, public)
values ('vaults', 'vaults', false)
on conflict (id) do nothing;

-- 3) Policy Storage: l'utente puo' leggere/scrivere solo oggetti il cui primo
--    segmento di path coincide con il suo uid (es. "<uid>/bundle.fgv").
drop policy if exists "vaults_read_own" on storage.objects;
create policy "vaults_read_own" on storage.objects
  for select using (
    bucket_id = 'vaults'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "vaults_insert_own" on storage.objects;
create policy "vaults_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'vaults'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "vaults_update_own" on storage.objects;
create policy "vaults_update_own" on storage.objects
  for update using (
    bucket_id = 'vaults'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "vaults_delete_own" on storage.objects;
create policy "vaults_delete_own" on storage.objects
  for delete using (
    bucket_id = 'vaults'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
